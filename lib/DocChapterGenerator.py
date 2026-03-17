import fitz  # PuMyPDF
from nltk.tokenize import sent_tokenize
from pprint import pprint
from typing import Dict

from lib.DocChapter import DocChapter
from lib.DocBlocks import BaseDocBlock, TitleDocBlock, TextDocBlock, TableDocBlock, ListDocBlock, ImageDocBlock, DocBlockLocation
import re


def generate_doc_chapters(doc_skeleton: list[Dict], doc_blocks: list[BaseDocBlock]):
    blocks_by_page = {}
    for doc_block in doc_blocks:
        page_num, page_order = doc_block.location
        if page_num not in blocks_by_page:
            blocks_by_page[page_num] = []
        blocks_by_page[page_num].append(doc_block)

    chapters: list[DocChapter] = []
    if len(doc_skeleton) == 0 or doc_skeleton[0].get("start_page", 1) != 1:
        doc_skeleton.insert(
            0, {"start_page": 1, "title": "Introduction", "topics": []}
        )

    for index, chapter in enumerate(doc_skeleton):
        chapter_title = chapter.get("title", f"Chapter {index+1}")
        chapter_topics = chapter.get("topics", [])
        start_page = chapter.get("start_page", 1)
        if index + 1 < len(doc_skeleton):
            end_page = doc_skeleton[index + 1].get("start_page") - 1
        else:
            end_page = len(blocks_by_page)

        chapter_blocks = []
        for page_num in range(start_page, end_page + 1):
            blocks = blocks_by_page[page_num]
            chapter_blocks.extend(blocks)

        raw_markdown = _generate_markdown(chapter_blocks)

        chapters.append(DocChapter(
            title=chapter_title,
            topics=chapter_topics,
            raw_markdown=raw_markdown,
            blocks=chapter_blocks,
            start_pos=DocBlockLocation(page=start_page, order=0),
            end_pos=DocBlockLocation(page=end_page, order=0),
        ))

    return chapters


def _generate_markdown(doc_blocks: list[BaseDocBlock]):
    markdown_output = ""

    for doc_block in doc_blocks:
        if isinstance(doc_block, TitleDocBlock):
            title_block: TitleDocBlock = doc_block
            markdown_output += f"# {title_block.title}\n"
        elif isinstance(doc_block, TableDocBlock):
            table_block: TableDocBlock = doc_block
            rows = table_block.table
            markdown_lines = []
            for r_index, row in enumerate(rows):
                formatted_row = " | ".join(
                    (c_text.replace('\n', '') if c_text is not None else "") for c_text in row
                )
                markdown_lines.append(f"| {formatted_row} |")

                if r_index == 0:
                    header_separator = "| " + \
                        " | ".join("-" for _ in row) + " |"
                    markdown_lines.append(header_separator)

            markdown_output += "\n".join(markdown_lines) + "\n"
        elif isinstance(doc_block, ListDocBlock):
            list_block: ListDocBlock = doc_block
            for list_item in list_block.list:
                markdown_output += f"- {list_item}\n"
        elif isinstance(doc_block, TextDocBlock):
            text_block: TextDocBlock = doc_block
            markdown_output += text_block.text
        elif isinstance(doc_block, ImageDocBlock):
            image_block: ImageDocBlock = doc_block
            markdown_output += image_block.text
        else:
            raise Exception(
                f"Unknown document block instance: {doc_block.type}")

        markdown_output += '\n\n'

    return _replace_non_ascii(markdown_output)


def _replace_non_ascii(text: str):
    # Map of non-ASCII characters to their ASCII replacements
    replacements = {
        '–': '-',
        '‘': "'",
        '’': "'",
        '…': '...',
        '−': '-',
        '“': '"',
        '”': '"'
    }

    # Create a regex pattern that matches all the non-ASCII characters
    regex = re.compile('|'.join(re.escape(key) for key in replacements.keys()))

    # Function to lookup the replacement
    def replace_match(match):
        return replacements[match.group(0)]

    # Perform the replacement
    return regex.sub(replace_match, text)
