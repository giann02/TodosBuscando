from __future__ import annotations

from pathlib import Path

from docx import Document


ROOT = Path(__file__).resolve().parents[1]
DOCX_PATH = ROOT / "TodosBuscando_ArquitecturaBD.docx"

REPLACEMENTS = {
    "8. Modelo de Datos Detallado": "7. Modelo de Datos Detallado",
    "8.1. Colección alertas": "7.1. Colección alertas",
    "8.2. Colección usuarios": "7.2. Colección usuarios",
    "8.3. Colección reportes": "7.3. Colección reportes",
    "8.4. Nodos y relaciones en Neo4j": "7.4. Nodos y relaciones en Neo4j",
    "8.5. Claves utilizadas en Redis": "7.5. Claves utilizadas en Redis",
    "8.6. Relaciones lógicas entre entidades": "7.6. Relaciones lógicas entre entidades",
    "8.7. Reglas de integridad y validaciones": "7.7. Reglas de integridad y validaciones",
    "8.8. Justificación del modelo elegido": "7.8. Justificación del modelo elegido",
    "9. Conclusiones": "8. Conclusiones",
}


def replace_paragraph_text(paragraph, old: str, new: str) -> bool:
    if paragraph.text.strip() != old:
        return False

    remaining = new
    for run in paragraph.runs:
        if remaining:
            run.text = remaining
            remaining = ""
        else:
            run.text = ""
    return True


def main() -> None:
    doc = Document(DOCX_PATH)
    for paragraph in doc.paragraphs:
        for old, new in REPLACEMENTS.items():
            if replace_paragraph_text(paragraph, old, new):
                break
    doc.save(DOCX_PATH)


if __name__ == "__main__":
    main()
