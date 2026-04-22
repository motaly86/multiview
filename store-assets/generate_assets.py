#!/usr/bin/env python3
"""
Generate Chrome Web Store listing assets for MultiView extension.
Produces: icon-128.png, promo-small.png, promo-large.png, screenshot-1.png, screenshot-2.png
"""

import os
from PIL import Image, ImageDraw, ImageFont

OUT = os.path.dirname(os.path.abspath(__file__))

# ── Colours ──────────────────────────────────────────────────────────────────
INDIGO = "#6366f1"
PINK   = "#ec4899"
GREEN  = "#22c55e"
AMBER  = "#fbbf24"
DARK   = "#1a1a2e"
BG     = "#0a0a0a"
WHITE  = "#ffffff"
GRAY   = "#9ca3af"
DARK_CARD = "#1e1e2e"
BORDER = "#2a2a3e"

QUADRANT_COLORS = [INDIGO, PINK, GREEN, AMBER]


def get_font(size, bold=False):
    """Try to load a system font; fall back to default."""
    candidates = [
        "/System/Library/Fonts/Helvetica.ttc",
        "/System/Library/Fonts/SFNSText.ttf",
        "/System/Library/Fonts/SFPro.ttf",
        "/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf",
        "/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf",
    ]
    if bold:
        candidates = [
            "/System/Library/Fonts/Helvetica.ttc",
            "/System/Library/Fonts/SFNSTextBold.ttf",
        ] + candidates
    for path in candidates:
        if os.path.exists(path):
            try:
                return ImageFont.truetype(path, size)
            except Exception:
                continue
    return ImageFont.load_default()


def rounded_rect(draw, xy, fill, radius):
    """Draw a filled rounded rectangle."""
    draw.rounded_rectangle(xy, radius=radius, fill=fill)


def draw_logo(draw, x, y, size, gap=4):
    """Draw the 4-colour quadrant logo at (x, y) with given total size."""
    q = (size - gap) // 2
    r = q // 4
    # top-left  indigo
    rounded_rect(draw, [x, y, x + q, y + q], INDIGO, r)
    # top-right  pink
    rounded_rect(draw, [x + q + gap, y, x + size, y + q], PINK, r)
    # bottom-left  green
    rounded_rect(draw, [x, y + q + gap, x + q, y + size], GREEN, r)
    # bottom-right  amber
    rounded_rect(draw, [x + q + gap, y + q + gap, x + size, y + size], AMBER, r)


def draw_play_triangle(draw, cx, cy, size, fill="#ffffff"):
    """Draw a play-button triangle centred at (cx, cy)."""
    h = size
    w = int(h * 0.866)
    points = [
        (cx - w // 3, cy - h // 2),
        (cx + 2 * w // 3, cy),
        (cx - w // 3, cy + h // 2),
    ]
    draw.polygon(points, fill=fill)


# ─────────────────────────────────────────────────────────────────────────────
# 1. icon-128.png
# ─────────────────────────────────────────────────────────────────────────────
def make_icon():
    size = 128
    img = Image.new("RGBA", (size, size), (0, 0, 0, 0))
    draw = ImageDraw.Draw(img)
    # Dark rounded background
    rounded_rect(draw, [0, 0, size - 1, size - 1], DARK, 24)
    # Logo centred
    logo_size = 80
    offset = (size - logo_size) // 2
    draw_logo(draw, offset, offset, logo_size, gap=6)
    img.save(os.path.join(OUT, "icon-128.png"))
    print("  icon-128.png")


# ─────────────────────────────────────────────────────────────────────────────
# 2. promo-small.png  (440×280)
# ─────────────────────────────────────────────────────────────────────────────
def make_promo_small():
    w, h = 440, 280
    img = Image.new("RGB", (w, h), BG)
    draw = ImageDraw.Draw(img)

    logo_size = 72
    logo_x = 40
    logo_y = (h - logo_size) // 2 - 10
    draw_logo(draw, logo_x, logo_y, logo_size, gap=5)

    text_x = logo_x + logo_size + 30
    title_font = get_font(36, bold=True)
    sub_font = get_font(16)

    draw.text((text_x, logo_y + 8), "MultiView", fill=WHITE, font=title_font)
    draw.text((text_x, logo_y + 52), "Watch up to 32 videos at once", fill=GRAY, font=sub_font)

    img.save(os.path.join(OUT, "promo-small.png"))
    print("  promo-small.png")


# ─────────────────────────────────────────────────────────────────────────────
# 3. promo-large.png  (1400×560)
# ─────────────────────────────────────────────────────────────────────────────
def make_promo_large():
    w, h = 1400, 560
    img = Image.new("RGB", (w, h), BG)
    draw = ImageDraw.Draw(img)

    # Left side: logo + text
    logo_size = 120
    logo_x = 80
    logo_y = (h - logo_size) // 2 - 30
    draw_logo(draw, logo_x, logo_y, logo_size, gap=8)

    text_x = logo_x + logo_size + 50
    title_font = get_font(64, bold=True)
    sub_font = get_font(24)

    draw.text((text_x, logo_y + 10), "MultiView", fill=WHITE, font=title_font)
    draw.text((text_x, logo_y + 85), "Watch up to 32 videos simultaneously", fill=GRAY, font=sub_font)

    # Right side: 3×2 grid of video windows
    grid_x = 820
    grid_y = 100
    cell_w = 160
    cell_h = 100
    gap = 12
    vid_colors = ["#3b82f6", "#ef4444", "#8b5cf6", "#f97316", "#14b8a6", "#e11d48"]
    for row in range(2):
        for col in range(3):
            idx = row * 3 + col
            cx = grid_x + col * (cell_w + gap)
            cy = grid_y + row * (cell_h + gap) + 60
            rounded_rect(draw, [cx, cy, cx + cell_w, cy + cell_h], vid_colors[idx], 8)
            # play triangle
            draw_play_triangle(draw, cx + cell_w // 2, cy + cell_h // 2, 24, "#ffffffcc")

    img.save(os.path.join(OUT, "promo-large.png"))
    print("  promo-large.png")


# ─────────────────────────────────────────────────────────────────────────────
# 4. screenshot-1.png  (1280×800) — Queue manager mockup
# ─────────────────────────────────────────────────────────────────────────────
def make_screenshot_1():
    w, h = 1280, 800
    img = Image.new("RGB", (w, h), "#111111")
    draw = ImageDraw.Draw(img)

    # Toolbar
    rounded_rect(draw, [0, 0, w, 56], "#1c1c2e", 0)
    small_font = get_font(14)
    title_font = get_font(18, bold=True)
    draw_logo(draw, 16, 10, 36, gap=3)
    draw.text((62, 17), "MultiView", fill=WHITE, font=title_font)

    # "Tile Windows" button
    btn_x, btn_y = 180, 12
    rounded_rect(draw, [btn_x, btn_y, btn_x + 130, btn_y + 32], INDIGO, 6)
    draw.text((btn_x + 14, btn_y + 7), "Tile Windows", fill=WHITE, font=small_font)

    # "Add Video" button
    btn2_x = btn_x + 145
    rounded_rect(draw, [btn2_x, btn_y, btn2_x + 110, btn_y + 32], "#22c55e", 6)
    draw.text((btn2_x + 14, btn_y + 7), "Add Video", fill=WHITE, font=small_font)

    # Queue count
    draw.text((w - 160, 19), "6 videos queued", fill=GRAY, font=small_font)

    # 6 video cards in 3×2 grid
    card_w = 370
    card_h = 300
    margin_x = 30
    margin_y = 80
    gap_x = 25
    gap_y = 25
    thumb_colors = ["#dc2626", "#2563eb", "#7c3aed", "#059669", "#d97706", "#db2777"]
    titles = [
        "How to Build a Chrome Extension",
        "React Tutorial for Beginners",
        "Advanced TypeScript Tips",
        "Node.js Crash Course 2024",
        "CSS Grid Layout Masterclass",
        "Web Performance Optimization",
    ]
    label_font = get_font(13)
    card_title_font = get_font(15, bold=True)

    for row in range(2):
        for col in range(3):
            idx = row * 3 + col
            cx = margin_x + col * (card_w + gap_x)
            cy = margin_y + row * (card_h + gap_y)

            # Card background
            rounded_rect(draw, [cx, cy, cx + card_w, cy + card_h], DARK_CARD, 12)

            # Thumbnail area
            thumb_h = 200
            rounded_rect(draw, [cx + 10, cy + 10, cx + card_w - 10, cy + thumb_h], thumb_colors[idx], 8)
            # Play button on thumbnail
            draw_play_triangle(draw, cx + card_w // 2, cy + thumb_h // 2 + 5, 32, "#ffffffbb")

            # Duration badge
            dur_x = cx + card_w - 70
            dur_y = cy + thumb_h - 30
            rounded_rect(draw, [dur_x, dur_y, dur_x + 50, dur_y + 22], "#000000cc", 4)
            draw.text((dur_x + 8, dur_y + 4), f"{12 + idx}:34", fill=WHITE, font=label_font)

            # Title
            draw.text((cx + 14, cy + thumb_h + 14), titles[idx], fill=WHITE, font=card_title_font)

            # Channel name
            draw.text((cx + 14, cy + thumb_h + 38), "YouTube Channel", fill=GRAY, font=label_font)

            # Remove button
            rx = cx + card_w - 40
            ry = cy + card_h - 35
            draw.text((rx, ry), "✕", fill="#ef4444", font=get_font(18))

    img.save(os.path.join(OUT, "screenshot-1.png"))
    print("  screenshot-1.png")


# ─────────────────────────────────────────────────────────────────────────────
# 5. screenshot-2.png  (1280×800) — Tiled windows mockup
# ─────────────────────────────────────────────────────────────────────────────
def make_screenshot_2():
    w, h = 1280, 800
    img = Image.new("RGB", (w, h), "#0d0d0d")
    draw = ImageDraw.Draw(img)

    gap = 6
    tile_w = (w - gap * 3) // 2
    tile_h = (h - gap * 3) // 2
    colors = ["#3b82f6", "#ef4444", "#8b5cf6", "#f97316"]
    small_font = get_font(11)
    tiny_font = get_font(10)

    for row in range(2):
        for col in range(2):
            idx = row * 2 + col
            tx = gap + col * (tile_w + gap)
            ty = gap + row * (tile_h + gap)

            # Window chrome bar
            bar_h = 28
            rounded_rect(draw, [tx, ty, tx + tile_w, ty + bar_h], "#222233", 0)
            # Traffic-light dots
            for di, dc in enumerate(["#ff5f57", "#ffbd2e", "#28c840"]):
                draw.ellipse([tx + 10 + di * 18, ty + 8, tx + 22 + di * 18, ty + 20], fill=dc)
            draw.text((tx + 80, ty + 7), "youtube.com/watch?v=...", fill="#888888", font=tiny_font)

            # Video area
            vx = tx
            vy = ty + bar_h
            rounded_rect(draw, [vx, vy, tx + tile_w, ty + tile_h], colors[idx], 0)

            # Big play triangle
            draw_play_triangle(
                draw,
                vx + tile_w // 2,
                vy + (tile_h - bar_h) // 2,
                48,
                "#ffffffaa",
            )

            # Progress bar at bottom of video
            bar_y = ty + tile_h - 8
            draw.rectangle([vx, bar_y, tx + tile_w, ty + tile_h], fill="#00000088")
            progress = [0.6, 0.3, 0.8, 0.45][idx]
            draw.rectangle([vx, bar_y, vx + int(tile_w * progress), ty + tile_h], fill="#ff0000")

            # Floating MultiView badge top-left
            badge_w, badge_h = 90, 24
            bx, by = tx + 10, ty + bar_h + 10
            rounded_rect(draw, [bx, by, bx + badge_w, by + badge_h], "#1a1a2ecc", 6)
            draw_logo(draw, bx + 4, by + 4, 16, gap=2)
            draw.text((bx + 24, by + 5), "MultiView", fill=WHITE, font=small_font)

    img.save(os.path.join(OUT, "screenshot-2.png"))
    print("  screenshot-2.png")


# ─────────────────────────────────────────────────────────────────────────────
if __name__ == "__main__":
    print("Generating MultiView Chrome Web Store assets...")
    make_icon()
    make_promo_small()
    make_promo_large()
    make_screenshot_1()
    make_screenshot_2()
    print(f"Done! Assets saved to {OUT}/")
