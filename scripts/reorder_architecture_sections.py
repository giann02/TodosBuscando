from __future__ import annotations

from pathlib import Path
from zipfile import ZIP_DEFLATED, ZipFile

from lxml import etree


ROOT = Path(__file__).resolve().parents[1]
DOCX_PATH = ROOT / "TodosBuscando_ArquitecturaBD.docx"
TMP_PATH = ROOT / "TodosBuscando_ArquitecturaBD.reorder.tmp.docx"

W_NS = "http://schemas.openxmlformats.org/wordprocessingml/2006/main"
NS = {"w": W_NS}


def paragraph_text(element) -> str:
    if element.tag != f"{{{W_NS}}}p":
        return ""
    return "".join(element.xpath(".//w:t/text()", namespaces=NS)).strip()


def has_page_break(element) -> bool:
    if element.tag != f"{{{W_NS}}}p":
        return False
    return bool(element.xpath('.//w:br[@w:type="page"]', namespaces=NS))


def set_paragraph_text(element, text: str) -> None:
    text_nodes = element.xpath(".//w:t", namespaces=NS)
    if not text_nodes:
        return
    text_nodes[0].text = text
    for node in text_nodes[1:]:
        node.text = ""


def move_conclusions_after_model(xml_bytes: bytes) -> bytes:
    root = etree.fromstring(xml_bytes)
    body = root.find("w:body", NS)
    children = list(body)

    conclusions_start = next(
        i for i, child in enumerate(children)
        if paragraph_text(child).startswith("7. Conclusiones")
    )
    model_start = next(
        i for i, child in enumerate(children)
        if paragraph_text(child).startswith("8. Modelo de Datos Detallado")
    )
    sect_pr_index = next(
        i for i, child in enumerate(children)
        if child.tag == f"{{{W_NS}}}sectPr"
    )

    # Keep the page break before section 8 where it is. Move the page break
    # immediately before section 8 so it becomes the break before conclusions.
    moved_nodes = children[conclusions_start:model_start]
    if moved_nodes and has_page_break(moved_nodes[-1]):
        moved_nodes = [moved_nodes[-1], *moved_nodes[:-1]]

    set_paragraph_text(moved_nodes[1] if has_page_break(moved_nodes[0]) else moved_nodes[0], "9. Conclusiones")

    for node in moved_nodes:
        body.remove(node)

    # Recompute section properties after removal, then insert conclusions before it.
    sect_pr = body.find("w:sectPr", NS)
    insert_at = list(body).index(sect_pr)
    for offset, node in enumerate(moved_nodes):
        body.insert(insert_at + offset, node)

    return etree.tostring(root, xml_declaration=True, encoding="UTF-8", standalone=True)


def main() -> None:
    with ZipFile(DOCX_PATH, "r") as source, ZipFile(TMP_PATH, "w", ZIP_DEFLATED) as target:
        for item in source.infolist():
            data = source.read(item.filename)
            if item.filename == "word/document.xml":
                data = move_conclusions_after_model(data)
            target.writestr(item, data)

    TMP_PATH.replace(DOCX_PATH)


if __name__ == "__main__":
    main()
