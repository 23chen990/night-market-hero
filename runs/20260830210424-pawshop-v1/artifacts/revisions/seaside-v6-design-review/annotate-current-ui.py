from pathlib import Path

from PIL import Image, ImageDraw, ImageFont


ROOT = Path(__file__).resolve().parent
SOURCE = ROOT / "screenshots/current-demo-390x844.png"
OUTPUT = ROOT / "screenshots/current-demo-390x844-annotated.png"
FONT_PATH = "/System/Library/Fonts/STHeiti Light.ttc"


image = Image.open(SOURCE).convert("RGBA")
canvas = Image.new("RGBA", (820, image.height), "#0b2530")
canvas.alpha_composite(image, (0, 0))
draw = ImageDraw.Draw(canvas)

title_font = ImageFont.truetype(FONT_PATH, 25)
body_font = ImageFont.truetype(FONT_PATH, 19)
small_font = ImageFont.truetype(FONT_PATH, 16)


def label(number: str, y: int, title: str, body: str, target: tuple[int, int], color: str) -> None:
    x = 420
    draw.rounded_rectangle((x, y, 794, y + 128), radius=18, fill="#163a4a", outline=color, width=3)
    draw.ellipse((x + 16, y + 16, x + 52, y + 52), fill=color)
    draw.text((x + 34, y + 34), number, font=body_font, fill="#102f3c", anchor="mm")
    draw.text((x + 64, y + 15), title, font=body_font, fill="#f8fae5")
    draw.multiline_text((x + 18, y + 62), body, font=small_font, fill="#dfeecf", spacing=5)
    start = (x, y + 64)
    draw.line((start, (395, y + 64), target), fill=color, width=4, joint="curve")
    tx, ty = target
    draw.polygon(((tx, ty), (tx + 12, ty - 6), (tx + 10, ty + 8)), fill=color)


draw.rectangle((18, 198, 190, 231), outline="#73d6a4", width=4)
draw.rounded_rectangle((253, 595, 366, 700), radius=15, outline="#f28f6b", width=4)
draw.line(((71, 247), (123, 410), (191, 514), (299, 644)), fill="#f4d58d", width=6)

draw.text((420, 32), "当前 UI 语义冲突标注", font=title_font, fill="#f8fae5")
draw.text((420, 70), "依据实际运行的 390×844 Demo", font=small_font, fill="#a8d9d2")

label("1", 112, "全局能力已经在 HUD", "顶部直接显示“携带 0/4”与\n下一档价格，语义属于玩家。", (186, 214), "#73d6a4")
label("2", 286, "同一能力又成为场景建筑", "右下浮标工坊只升级背篓容量，\n但外形与交互都像生产设施。", (300, 647), "#f28f6b")
label("3", 460, "路线把工坊接入渔网链路", "连续引导线从近岸渔网穿过店区\n指向工坊，强化“渔网附属”误读。", (188, 512), "#f4d58d")

draw.rounded_rectangle((420, 666, 794, 806), radius=18, fill="#204c59", outline="#47b5c4", width=2)
draw.text((438, 684), "诊断结论", font=body_font, fill="#f4d58d")
draw.multiline_text(
    (438, 722),
    "名称、空间位置和连接线共同把\n“玩家全局容量”误编码成“渔网站点升级”。\n应拆成独立背篓 icon 与贴站升级提示。",
    font=small_font,
    fill="#f8fae5",
    spacing=6,
)

canvas.convert("RGB").save(OUTPUT, quality=95)
print(OUTPUT)
