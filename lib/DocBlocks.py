from enum import Enum
import uuid


class DocBlockType(Enum):
    TITLE = 1
    TEXT = 2
    LIST = 3
    TABLE = 4
    IMAGE = 5


class DocBlockBBox:
    def __init__(self, top: float, right: float, bottom: float, left: float):
        self.top = top
        self.right = right
        self.bottom = bottom
        self.left = left

    def __str__(self) -> str:
        return f"Top:{self.top}, Right:{self.right}, Bottom:{self.bottom}, Left:{self.left}"

    def __iter__(self):
        yield self.top
        yield self.right
        yield self.bottom
        yield self.left

    def __eq__(self, other):
        return self.top == other.top and self.right == other.right and self.bottom == other.bottom and self.left == other.left

    def __ne__(self, other):
        return not self.__eq__(other)

    def __lt__(self, other):
        return self.top > other.top and self.right < other.right and self.bottom < other.bottom and self.left > other.left

    def __le__(self, other):
        return self.top >= other.top and self.right <= other.right and self.bottom <= other.bottom and self.left >= other.left

    def __gt__(self, other):
        return self.top < other.top and self.right > other.right and self.bottom > other.bottom and self.left < other.left

    def __ge__(self, other):
        return self.top <= other.top and self.right >= other.right and self.bottom >= other.bottom and self.left <= other.left


class DocBlockLocation:
    def __init__(self, page: int, order: int):
        self.page = page
        self.order = order

    def __iter__(self):
        yield self.page
        yield self.order

    def __lt__(self, other):
        return self.page <= other.page and self.order < other.order

    def __gt__(self, other):
        return self.page >= other.page and self.order > other.order


class BaseDocBlock:
    def __init__(self, type: DocBlockType, location: DocBlockLocation | None, bbox: DocBlockBBox | None):
        self.id = str(uuid.uuid4())
        self.type = type
        self.location = location
        self.bbox = bbox

    def __lt__(self, other):
        if self.location is None:
            raise Exception(
                f"Can't compare DocBlock({self.id}) as location is None")
        if other.location is None:
            raise Exception(
                f"Can't compare DocBlock({other.id}) as location is None")
        return self.location < other.location

    def __gt__(self, other):
        if self.location is None:
            raise Exception(
                f"Can't compare DocBlock({self.id}) as location is None")
        if other.location is None:
            raise Exception(
                f"Can't compare DocBlock({other.id}) as location is None")
        return self.location > other.location


class TitleDocBlock(BaseDocBlock):
    def __init__(self, title: str, type: DocBlockType, location: DocBlockLocation | None, bbox: DocBlockBBox | None):
        super().__init__(type, location, bbox)
        self.title = title

    def __str__(self) -> str:
        return f"TitleDocBlock({self.id}):\n\t{self.title}"


class TextDocBlock(BaseDocBlock):
    def __init__(self, text: str, type: DocBlockType, location: DocBlockLocation | None, bbox: DocBlockBBox | None):
        super().__init__(type, location, bbox)
        self.text = text

    def __str__(self) -> str:
        return f"TextDocBlock({self.id}):\n\t{self.text}"


class TableDocBlock(BaseDocBlock):
    def __init__(self, table: list[list[str]], type: DocBlockType, location: DocBlockLocation | None, bbox: DocBlockBBox | None):
        super().__init__(type, location, bbox)
        self.table = table

    def __str__(self) -> str:
        table_print = "\n\t".join([str(row) for row in self.table])
        return f"TableDocBlock({self.id}):\n\t{table_print}"


class ListDocBlock(BaseDocBlock):
    def __init__(self, list: list[str], type: DocBlockType, location: DocBlockLocation | None, bbox: DocBlockBBox | None):
        super().__init__(type, location, bbox)
        self.list = list

    def __str__(self) -> str:
        return f"ListDocBlock({self.id}):\n\t{self.list}"


class ImageDocBlock(BaseDocBlock):
    def __init__(self, image: bytes, text: str | None, summary: str | None, type: DocBlockType, location: DocBlockLocation | None, bbox: DocBlockBBox | None):
        super().__init__(type, location, bbox)
        self.image = image
        self.text = text
        self.summary = summary

    def __str__(self) -> str:
        return f"ImageDocBlock({self.id}):\n\t{self.text}"
