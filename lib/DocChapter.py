from lib.DocBlocks import BaseDocBlock, DocBlockLocation


class DocChapter:
    def __init__(self, title: str, topics: list[str], raw_markdown: str, blocks: list[BaseDocBlock], start_pos: DocBlockLocation, end_pos: DocBlockLocation):
        self.title = title
        self.topics = topics
        self.raw_markdown = raw_markdown
        self.blocks = blocks
        self.start_pos = start_pos
        self.end_pos = end_pos
