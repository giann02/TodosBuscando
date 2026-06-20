from __future__ import annotations

from pathlib import Path
from textwrap import wrap

from PIL import Image, ImageDraw, ImageFont


ROOT = Path(__file__).resolve().parents[1]
OUT = ROOT / "flow_slide_preview.png"

W, H = 1600, 900
S = W / 13.33

BG = "#0f0f1e"
CARD = "#1a1a2e"
TEAL = "#00d4aa"
WHITE = "#ffffff"
MUTED = "#b9becd"
BLUE = "#4895ef"
YELLOW = "#ffc75f"
PURPLE = "#a078ff"
NOTE = "#132030"


def font(size: int, bold: bool = False):
    candidates = [
        "/System/Library/Fonts/Supplemental/Arial Bold.ttf" if bold else "/System/Library/Fonts/Supplemental/Arial.ttf",
        "/Library/Fonts/Arial Bold.ttf" if bold else "/Library/Fonts/Arial.ttf",
        "/System/Library/Fonts/Helvetica.ttc",
    ]
    for path in candidates:
        try:
            return ImageFont.truetype(path, size)
        except Exception:
            pass
    return ImageFont.load_default()


def xywh(x, y, w, h):
    return [int(x * S), int(y * S), int((x + w) * S), int((y + h) * S)]


def text(draw, x, y, w, content, size, fill=WHITE, bold=False, center=False, line_gap=1.15):
    f = font(size, bold)
    max_chars = max(10, int(w * S / (size * 0.52)))
    lines = []
    for part in content.split("\n"):
        lines.extend(wrap(part, max_chars) or [""])
    y_px = int(y * S)
    for line in lines:
        if center:
            bbox = draw.textbbox((0, 0), line, font=f)
            x_px = int(x * S + (w * S - (bbox[2] - bbox[0])) / 2)
        else:
            x_px = int(x * S)
        draw.text((x_px, y_px), line, font=f, fill=fill)
        y_px += int(size * line_gap)


def rounded(draw, x, y, w, h, fill, outline=None, width=2, radius=18):
    box = xywh(x, y, w, h)
    draw.rounded_rectangle(box, radius=radius, fill=fill, outline=outline, width=width)


def card(draw, x, y, w, h, num, title, body, accent):
    rounded(draw, x, y, w, h, CARD, accent, 2, 18)
    cx, cy, r = int((x + 0.35) * S), int((y + 0.36) * S), int(0.19 * S)
    draw.ellipse([cx - r, cy - r, cx + r, cy + r], fill=accent)
    nfont = font(18, True)
    nb = draw.textbbox((0, 0), str(num), font=nfont)
    draw.text((cx - (nb[2] - nb[0]) / 2, cy - (nb[3] - nb[1]) / 2 - 1), str(num), font=nfont, fill=BG)
    text(draw, x + 0.64, y + 0.17, w - 0.82, title, 15, WHITE, True)
    text(draw, x + 0.18, y + 0.62, w - 0.36, body, 13, MUTED)


def arrow(draw, x1, y1, x2, y2):
    p1 = (int(x1 * S), int(y1 * S))
    p2 = (int(x2 * S), int(y2 * S))
    draw.line([p1, p2], fill=TEAL, width=4)
    draw.polygon([(p2[0], p2[1]), (p2[0] - 12, p2[1] - 7), (p2[0] - 12, p2[1] + 7)], fill=TEAL)


def store(draw, x, y, w, label, title, body, color):
    rounded(draw, x, y, w, 0.76, CARD, color, 2, 14)
    text(draw, x + 0.18, y + 0.1, w - 0.36, label, 9, color, True)
    text(draw, x + 0.18, y + 0.3, w - 0.36, title, 15, WHITE, True)
    text(draw, x + 0.18, y + 0.54, w - 0.36, body, 9, MUTED)


def main():
    img = Image.new("RGB", (W, H), BG)
    draw = ImageDraw.Draw(img)
    draw.rectangle([0, 0, int(0.18 * S), H], fill=TEAL)
    text(draw, 0.7, 0.4, 10.0, "FLUJO DE LA APLICACIÓN", 13, TEAL, True)
    text(draw, 0.7, 0.88, 11.2, "De la alerta al rastro de avistamientos", 40, WHITE, True)
    text(draw, 0.72, 1.78, 11.8, "El sistema combina entrada manual/API, consultas geoespaciales, notificación comunitaria y grafo de trayectoria.", 16, MUTED)

    cards = [
        ("Admin / API", "Se crea una alerta con datos, foto y última ubicación conocida.", TEAL),
        ("MongoDB", "Guarda la alerta y usa 2dsphere para ubicar vecinos cercanos.", BLUE),
        ("Email", "Vecinos dentro de 2 km reciben la notificación automáticamente.", YELLOW),
        ("Reporte", "Un vecino carga un avistamiento con descripción y ubicación opcional.", TEAL),
        ("Trayectoria", "MongoDB conserva el reporte y Neo4j conecta los puntos en orden.", PURPLE),
    ]
    x0, y0, cw, ch, gap = 0.55, 2.55, 2.28, 1.42, 0.27
    for i, (title, body, color) in enumerate(cards, 1):
        x = x0 + (i - 1) * (cw + gap)
        card(draw, x, y0, cw, ch, i, title, body, color)
        if i < 5:
            arrow(draw, x + cw + 0.03, y0 + ch / 2, x + cw + gap - 0.05, y0 + ch / 2)

    text(draw, 0.72, 4.48, 3.2, "CAPA DE DATOS INVOLUCRADA", 12, TEAL, True)
    store(draw, 0.72, 4.86, 3.55, "DOCUMENTAL", "MongoDB", "alertas, usuarios, reportes + geoespacial", BLUE)
    store(draw, 4.88, 4.86, 3.55, "CLAVE-VALOR", "Redis", "alertas activas con TTL e invalidación", YELLOW)
    store(draw, 9.04, 4.86, 3.55, "GRAFOS", "Neo4j", "cadena de avistamientos SIGUIENTE", PURPLE)

    rounded(draw, 0.72, 6.15, 11.87, 0.46, NOTE, TEAL, 2, 18)
    text(draw, 0.95, 6.28, 11.4, "Resultado: el administrador ve alertas activas, reportes recibidos y el recorrido probable sobre el mapa.", 14, WHITE, False, True)
    img.save(OUT)


if __name__ == "__main__":
    main()
