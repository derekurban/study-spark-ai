from pprint import pprint
from io import BytesIO
import os
import time
import fitz
import boto3
import uuid
from flask import Request, jsonify
from werkzeug.utils import secure_filename
from supabase.client import Client
from lib.ChapterSkeletonCall import create_skeleton
from lib.RevisedMarkdownCall import revise_markdown
from lib.PdfBlockParser import parse_pdf_blocks
from lib.DocChapterGenerator import generate_doc_chapters


def _build_boto3_client(service_name: str):
    client_kwargs = {"region_name": os.getenv("AWS_REGION", "us-east-1")}

    aws_access_key_id = os.getenv("AWS_ACCESS_KEY_ID")
    aws_secret_access_key = os.getenv("AWS_SECRET_ACCESS_KEY")
    aws_session_token = os.getenv("AWS_SESSION_TOKEN")
    if aws_access_key_id and aws_secret_access_key:
        client_kwargs["aws_access_key_id"] = aws_access_key_id
        client_kwargs["aws_secret_access_key"] = aws_secret_access_key
        if aws_session_token:
            client_kwargs["aws_session_token"] = aws_session_token

    return boto3.client(service_name, **client_kwargs)


textract = _build_boto3_client('textract')
s3 = _build_boto3_client('s3')

BUCKET_NAME = "temp-upload-studyspark"


def get_all_document_analysis(job_id, next_token=None, all_blocks=[]):
    if next_token:
        response = textract.get_document_analysis(
            JobId=job_id, NextToken=next_token)
    else:
        response = textract.get_document_analysis(JobId=job_id)

    all_blocks.extend(response.get('Blocks', []))

    if 'NextToken' in response:
        return get_all_document_analysis(job_id, response['NextToken'], all_blocks)
    else:
        return all_blocks


def sync_revise_markdown(markdown):
    try:
        revised_markdown, p_tokens, c_tokens = revise_markdown(markdown)
        return revised_markdown, p_tokens, c_tokens
    except Exception as ex:
        print(f"❌ Error: {ex}!")
        time.sleep(10)  # asynchronous sleep
        revised_markdown, p_tokens, c_tokens = revise_markdown(markdown)
        return revised_markdown, p_tokens, c_tokens


def POST(request: Request, supabase_client: Client):
    start_time = time.time()

    if 'file' not in request.files:
        return jsonify({'error': 'No file part'}), 400
    file = request.files['file']

    # If the user does not select a file, the browser submits an
    # empty file without a filename.
    if file.filename == '' or not file:
        return jsonify({'error': 'No File'}), 400

    file_stream = BytesIO(file.read())
    file_stream.seek(0)
    pdf_document = fitz.open(filetype="pdf", stream=file_stream)

    s3_object_name = str(uuid.uuid4()) + '.pdf'
    file_stream.seek(0)
    s3.upload_fileobj(file_stream, BUCKET_NAME, s3_object_name)

    time.sleep(5)

    response = textract.start_document_analysis(DocumentLocation={
        'S3Object': {
            'Bucket': BUCKET_NAME,
            'Name': s3_object_name
        },
    }, FeatureTypes=['LAYOUT'])

    job_id = response['JobId']

    LOADING_CHARS = ['⠟', '⠯', '⠷', '⠾', '⠽', '⠻']

    def is_job_complete(job_id, iteration):
        response = textract.get_document_analysis(JobId=job_id)
        status = response['JobStatus']

        if iteration > 0:
            print("\r\033[K", end="", flush=True)  # Clear the line

        if status in ['SUCCEEDED', 'FAILED']:
            print("✅ Finished!", flush=True)
            return True

        print(
            f"{LOADING_CHARS[iteration % len(LOADING_CHARS)]} Waiting: {status}", end="", flush=True)
        return False

    # Polling loop
    iteration = 0
    while not is_job_complete(job_id, iteration):
        time.sleep(1)  # sleep for a few seconds before checking again
        iteration = iteration + 1

    all_blocks = get_all_document_analysis(job_id)

    print("✅ Extracted Raw Blocks!")

    doc_blocks = parse_pdf_blocks(all_blocks, pdf_document)

    print("✅ Parsed Document Blocks!")

    skeleton, prompt_tokens, completion_tokens = create_skeleton(doc_blocks)

    pprint(skeleton)

    print("✅ Generated Document Skeleton!")

    chapters = generate_doc_chapters(skeleton, doc_blocks)

    print("✅ Generated Document Chapters!")

    all_markdowns, prompt_tokens, completion_tokens = [], 0, 0
    for chapter in chapters:
        revised_markdown, p_tokens, c_tokens = sync_revise_markdown(
            chapter.raw_markdown)
        print(f"✅ Revised Chapter {chapter.title}!")
        prompt_tokens += p_tokens
        completion_tokens += c_tokens
        all_markdowns.append(revised_markdown)

    print("\nDELETING\n")
    s3.delete_object(Bucket=BUCKET_NAME, Key=s3_object_name)

    run_time = time.time() - start_time

    total_pages = len(pdf_document)
    total_pages_cost = total_pages * 0.004

    prompt_tokens_cost = prompt_tokens * 0.00001
    completion_tokens_cost = completion_tokens * 0.00003

    print(f"\nFINISHED IN: {run_time:.2f}s")
    print(f"Pages -> {total_pages} = ${total_pages_cost}")
    print(
        f"Tokens -> Prompt:{prompt_tokens} = ${format(prompt_tokens_cost, '.4f')}, Completion:{completion_tokens} = ${format(completion_tokens_cost, '.4f')}")
    print(
        f"Total Cost -> ${format(total_pages_cost + prompt_tokens_cost + completion_tokens_cost, '.4f')}")

    pdf_document.close()

    return jsonify({'markdown': ('\n\n'.join(all_markdowns))}), 200
