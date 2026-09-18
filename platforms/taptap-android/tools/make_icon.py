#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
生成夜市飞侠的 Android 应用图标。

- 传统图标：mipmap-*/ic_launcher.png（方形满幅）
- 圆形图标：mipmap-*/ic_launcher_round.png
- 自适应前景：drawable-nodpi/ic_launcher_foreground.png（Android 8+ 安全区内）
- 商店用图：store/icon_512.png（提交 TapTap 时上传）

用法：python3 tools/make_icon.py
"""

import sys
from pathlib import Path

from PIL import Image, ImageDraw, ImageFilter

PROJECT_ROOT = Path(__file__).resolve().parent.parent
RES = PROJECT_ROOT / "app" / "src" / "main" / "res"
GAME_DIR = PROJECT_ROOT.parent.parent
ART = GAME_DIR / "src" / "assets" / "approved-runtime" / "identity" / "protagonist-swing-base-v1.png"

BG_COLOR = (16, 11, 32, 255)        # #100B20 夜市夜色
GLOW_COLOR = (255, 176, 74, 95)     # 灯笼暖光
SIZE = 1024

DENSITIES = {
    "mipmap-mdpi": 48,
    "mipmap-hdpi": 72,
    "mipmap-xhdpi": 96,
    "mipmap-xxhdpi": 144,
    "mipmap-xxxhdpi": 192,
}


def build_base() -> Image.Image:
    """暗色底 + 居中暖光晕。"""
    base = Image.new("RGBA", (SIZE, SIZE), BG_COLOR)

    glow = Image.new("RGBA", (SIZE, SIZE), (0, 0, 0, 0))
    d = ImageDraw.Draw(glow)
    r = int(SIZE * 0.34)
    cx = cy = SIZE // 2
    d.ellipse([cx - r, cy - r, cx + r, cy + r], fill=GLOW_COLOR)
    glow = glow.filter(ImageFilter.GaussianBlur(radius=int(SIZE * 0.11)))

    return Image.alpha_composite(base, glow)


def paste_art(canvas: Image.Image, scale: float) -> Image.Image:
    """把主角美术等比居中贴到画布上。"""
    art = Image.open(ART).convert("RGBA")
    target_w = int(SIZE * scale)
    target_h = max(1, int(target_w * art.height / art.width))
    art = art.resize((target_w, target_h), Image.LANCZOS)
    pos = ((SIZE - target_w) // 2, (SIZE - target_h) // 2)

    out = canvas.copy()
    out.paste(art, pos, art)
    return out


def circle_crop(img: Image.Image) -> Image.Image:
    mask = Image.new("L", (SIZE, SIZE), 0)
    ImageDraw.Draw(mask).ellipse([0, 0, SIZE - 1, SIZE - 1], fill=255)
    out = Image.new("RGBA", (SIZE, SIZE), (0, 0, 0, 0))
    out.paste(img, (0, 0), mask)
    return out


def main() -> int:
    if not ART.is_file():
        print(f"[错误] 找不到主角美术：{ART}", file=sys.stderr)
        return 1

    base = build_base()
    square = paste_art(base, scale=0.72)          # 传统方形图标：主角占 72%
    round_icon = circle_crop(square)               # 圆形图标
    # 自适应图标：系统可能裁切成圆形，内容需收在中心约 61% 安全区内
    foreground = paste_art(Image.new("RGBA", (SIZE, SIZE), (0, 0, 0, 0)), scale=0.58)

    for folder, px in DENSITIES.items():
        d = RES / folder
        d.mkdir(parents=True, exist_ok=True)
        square.resize((px, px), Image.LANCZOS).save(d / "ic_launcher.png")
        round_icon.resize((px, px), Image.LANCZOS).save(d / "ic_launcher_round.png")
        print(f"[生成] {folder}/ic_launcher.png (+round)  {px}x{px}")

    nodpi = RES / "drawable-nodpi"
    nodpi.mkdir(parents=True, exist_ok=True)
    foreground.save(nodpi / "ic_launcher_foreground.png")
    print(f"[生成] drawable-nodpi/ic_launcher_foreground.png  {SIZE}x{SIZE}")

    store = PROJECT_ROOT / "store"
    store.mkdir(parents=True, exist_ok=True)
    square.resize((512, 512), Image.LANCZOS).save(store / "icon_512.png")
    print(f"[生成] store/icon_512.png  512x512（提交 TapTap 用）")

    return 0


if __name__ == "__main__":
    raise SystemExit(main())
