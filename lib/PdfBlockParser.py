from typing import cast, Optional, Dict
import fitz  # PuMyPDF

from lib.DocBlocks import BaseDocBlock, TextDocBlock, TitleDocBlock, ImageDocBlock, TableDocBlock, ListDocBlock, DocBlockType, DocBlockLocation, DocBlockBBox

LAYOUT_TYPES = {"LAYOUT_TITLE", "LAYOUT_HEADER", "LAYOUT_FOOTER", "LAYOUT_SECTION_HEADER",
                "LAYOUT_PAGE_NUMBER", "LAYOUT_LIST", "LAYOUT_FIGURE", "LAYOUT_TABLE", "LAYOUT_KEY_VALUE", "LAYOUT_TEXT"}

TOP_TITLE_MARGIN = 0.15

TABLE_MARGIN = 5


def parse_pdf_blocks(raw_blocks: list[Dict], document: fitz.Document):
    visited_raw_block_ids: set[str] = set()

    raw_blocks_by_id = {
        str(raw_block["Id"]): raw_block for raw_block in raw_blocks}

    doc_blocks: list[BaseDocBlock] = []

    page_order: int = 0
    for raw_block in raw_blocks:
        raw_type = cast(Optional[str], raw_block.get("BlockType"))
        raw_id = str(raw_block["Id"])
        if raw_type is None or raw_type not in LAYOUT_TYPES or raw_id in visited_raw_block_ids:
            continue

        page_num = int(raw_block["Page"])
        page_order = page_order + 1

        block_bounding_box = raw_block.get("Geometry", {}).get("BoundingBox")
        top, left, height, width = tuple(block_bounding_box.get(k) for k in (
            "Top", "Left", "Height", "Width"))

        raw_content: list[str] = []
        if "Text" in raw_block:
            raw_content = [str(raw_block["Text"])]
        elif "Relationships" in raw_block:
            children = _get_children(raw_block, raw_blocks_by_id)
            visited_raw_block_ids.update(child["Id"] for child in children)

            raw_content = [content for child in children if (
                content := _get_content(child, raw_blocks_by_id))]

        location = DocBlockLocation(page_num, page_order)
        bbox = DocBlockBBox(top, left+width, top+height, left)
        if ("TITLE" in raw_type or "HEADER" in raw_type) or (len(raw_content) == 1 and top < TOP_TITLE_MARGIN):
            doc_blocks.append(
                TitleDocBlock(
                    title=" ".join(raw_content), type=DocBlockType.TITLE, location=location, bbox=bbox
                )
            )
        elif raw_type == "LAYOUT_TABLE":
            doc_blocks.append(
                TableDocBlock(
                    table=_match_table(location, bbox, document), type=DocBlockType.TABLE, location=location, bbox=bbox
                )
            )
        elif raw_type == "LAYOUT_FIGURE":
            doc_blocks.append(
                ImageDocBlock(
                    image=None, summary=None, text=" ".join(raw_content), type=DocBlockType.IMAGE, location=location, bbox=bbox
                )
            )
        elif raw_type == "LAYOUT_LIST":
            doc_blocks.append(
                ListDocBlock(
                    list=raw_content, type=DocBlockType.LIST, location=location, bbox=bbox
                )
            )
        else:
            doc_blocks.append(
                TextDocBlock(
                    text=" ".join(raw_content), type=DocBlockType.TEXT, location=location, bbox=bbox
                )
            )

    return doc_blocks


tables_by_page = {}


def _match_table(location: DocBlockLocation, bbox: DocBlockBBox, document: fitz.Document):
    page_num, page_order = location
    page = document[page_num-1]

    if page_num not in tables_by_page:
        tables_by_page[page_num] = page.find_tables().tables

    tables = tables_by_page[page_num]

    page_width, page_height = page.rect.width, page.rect.height
    for table in tables:
        x0, y0, x1, y1 = table.bbox
        table_bbox = DocBlockBBox(
            top=(y0-TABLE_MARGIN)/page_height,
            right=(x1+TABLE_MARGIN)/page_width,
            bottom=(y1+TABLE_MARGIN)/page_height,
            left=(x0-TABLE_MARGIN)/page_width,
        )
        if bbox < table_bbox:
            return table.extract()
    raise Exception("Failed to find table")


def _get_content(block: Dict, blocks_dict: Dict) -> str | None:
    if "Text" in block:
        confidence = block.get('Confidence', 0.0)
        block_type = cast(Optional[str], block.get("BlockType"))
        if block_type is not None and (block_type == "LINE" or block_type == "WORD") and confidence < 75.0:
            return None
        return cast(Optional[str], block.get("Text"))
    if "Relationships" in block:
        children = _get_children(block, blocks_dict)
        return "\n".join(content for child in children if (content := _get_content(child, blocks_dict)))
    return None


def _get_children(block: Dict, blocks_dict: Dict) -> list[Dict]:
    if "Relationships" not in block:
        return []

    children_index = next((i for i, d in enumerate(
        block["Relationships"]) if d["Type"] == "CHILD"), None)

    if children_index is None:
        return []

    ids = block["Relationships"][children_index].get("Ids", [])
    return [blocks_dict[id] for id in ids if id in blocks_dict]
