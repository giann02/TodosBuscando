from __future__ import annotations

from pathlib import Path
from zipfile import ZIP_DEFLATED, ZipFile

from lxml import etree


ROOT = Path(__file__).resolve().parents[1]
DOCX_PATH = ROOT / "TodosBuscando_ArquitecturaBD.docx"
TMP_PATH = ROOT / "TodosBuscando_ArquitecturaBD.tmp.docx"

W_NS = "http://schemas.openxmlformats.org/wordprocessingml/2006/main"
NSMAP = {"w": W_NS}


RPR_XML = f"""
<w:rPr xmlns:w="{W_NS}">
  <w:rFonts w:ascii="Arial" w:cs="Arial" w:eastAsia="Arial" w:hAnsi="Arial"/>
  <w:color w:val="666666"/>
  <w:sz w:val="18"/>
  <w:szCs w:val="18"/>
</w:rPr>
"""


def w_tag(name: str) -> str:
    return f"{{{W_NS}}}{name}"


def clone_rpr():
    return etree.fromstring(RPR_XML.encode("utf-8"))


def text_run(text: str):
    run = etree.Element(w_tag("r"))
    run.append(clone_rpr())
    text_element = etree.SubElement(run, w_tag("t"))
    text_element.set("{http://www.w3.org/XML/1998/namespace}space", "preserve")
    text_element.text = text
    return run


def field_run(kind: str, visible_value: str):
    runs = []

    begin = etree.Element(w_tag("r"))
    begin.append(clone_rpr())
    etree.SubElement(begin, w_tag("fldChar")).set(w_tag("fldCharType"), "begin")
    runs.append(begin)

    instr = etree.Element(w_tag("r"))
    instr.append(clone_rpr())
    instr_text = etree.SubElement(instr, w_tag("instrText"))
    instr_text.set("{http://www.w3.org/XML/1998/namespace}space", "preserve")
    instr_text.text = f" {kind} "
    runs.append(instr)

    separate = etree.Element(w_tag("r"))
    separate.append(clone_rpr())
    etree.SubElement(separate, w_tag("fldChar")).set(w_tag("fldCharType"), "separate")
    runs.append(separate)

    runs.append(text_run(visible_value))

    end = etree.Element(w_tag("r"))
    end.append(clone_rpr())
    etree.SubElement(end, w_tag("fldChar")).set(w_tag("fldCharType"), "end")
    runs.append(end)

    return runs


def fix_footer(xml_bytes: bytes) -> bytes:
    root = etree.fromstring(xml_bytes)
    paragraph = root.find("w:p", NSMAP)
    if paragraph is None:
        paragraph = etree.SubElement(root, w_tag("p"))

    for child in list(paragraph):
        if child.tag == w_tag("r"):
            paragraph.remove(child)

    paragraph.append(text_run("Página "))
    for run in field_run("PAGE", "1"):
        paragraph.append(run)
    paragraph.append(text_run(" de "))
    for run in field_run("NUMPAGES", "1"):
        paragraph.append(run)

    return etree.tostring(root, xml_declaration=True, encoding="UTF-8", standalone=True)


def fix_settings(xml_bytes: bytes) -> bytes:
    root = etree.fromstring(xml_bytes)
    update_fields = root.find("w:updateFields", NSMAP)
    if update_fields is None:
        update_fields = etree.Element(w_tag("updateFields"))
        root.insert(0, update_fields)
    update_fields.set(w_tag("val"), "true")
    return etree.tostring(root, xml_declaration=True, encoding="UTF-8", standalone=True)


def main() -> None:
    with ZipFile(DOCX_PATH, "r") as source, ZipFile(TMP_PATH, "w", ZIP_DEFLATED) as target:
        for item in source.infolist():
            data = source.read(item.filename)
            if item.filename == "word/footer1.xml":
                data = fix_footer(data)
            elif item.filename == "word/settings.xml":
                data = fix_settings(data)
            target.writestr(item, data)

    TMP_PATH.replace(DOCX_PATH)


if __name__ == "__main__":
    main()
