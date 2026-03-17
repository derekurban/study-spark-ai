from lib.DocBlocks import BaseDocBlock, TitleDocBlock, TextDocBlock, TableDocBlock, ListDocBlock, ImageDocBlock, DocBlockLocation
from typing import Dict
import json
import os
import openai

SYSTEM_PROMPT = """ 
# PERSONALITY
You are StudySkeletonGPT, the latest and greatest in determining what chapters and topics are being covered from unstructured, random content stripped from documents

# MISSION
Your goal is to process the incoming information, analyzing the page numbers, content, etc, and determine what chapters & topics exist in the document and at what page they begin.
The content being stripped is from a document, the content has been classified as a "header, title or section header" therefore you must use this information to reconstruct the structure of the document.
Know that sometimes the content being stripped is incorrect and should be discarded, therefore you must judge what is a header/title/section header and what isn't.

# METHODOLOGY
The incoming content will be stripped from a document, sometimes the content being stripped is inacurate and doesn't accurately reflect the document structure.
Therefore you must make smart decisions as to what content from the document is relevant to creating chapter boundaries.
Out of the content that would logically be considered a "Chapter" you must determine a chapter title and the starting page of the chapter.
Each Chapter should cover a distinct topic based on the context, the first chapter might be introductory but most likely shouldn't cover everything.

# JSON
You will respond with the following json structure based off your processing.
{
    skeleton: [
        {
            "title": <Title of the chapter>
            "topics": [<Array of topics covered in this chapter>]
            "start_page": <Starting page of this chapter, page 1 indicates the first page>
        },
        ... the other chapters
    ]
}
"""


def _get_openai_api_key() -> str:
    api_key = os.getenv("PRIVATE_OPENAI_API_KEY") or os.getenv("OPENAI_API_KEY")
    if not api_key:
        raise RuntimeError("Set PRIVATE_OPENAI_API_KEY or OPENAI_API_KEY before calling create_skeleton().")
    return api_key


def create_skeleton(doc_blocks: list[BaseDocBlock]):
    USER_PROMPT = """Here is the following content stripped from a document:
    {content}
    """

    title_blocks: list[TitleDocBlock] = [
        doc_block for doc_block in doc_blocks if isinstance(doc_block, TitleDocBlock)
    ]

    content = "\n".join(
        [f"Text:{block.title}, Found on page #{block.location.page}" for block in title_blocks])

    with open('latest_gpt_prompt_1.txt', 'w') as file:
        file.write(USER_PROMPT.format(content=content))

    openai.api_key = _get_openai_api_key()
    response = openai.chat.completions.create(model="gpt-4-1106-preview", messages=[
        {
            "role": "system",
            "content": SYSTEM_PROMPT
        },
        {
            "role": "user",
            "content": USER_PROMPT.format(content=content)
        },
    ], response_format={"type": "json_object"}, temperature=0)

    prompt_tokens = response.usage.prompt_tokens
    completion_tokens = response.usage.completion_tokens

    return (json.loads(response.choices[0].message.content)["skeleton"], prompt_tokens, completion_tokens)
