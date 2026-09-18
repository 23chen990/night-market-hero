from __future__ import annotations

import hashlib
import json
from pathlib import Path

from PIL import Image, ImageDraw


ROOT = Path(__file__).resolve().parents[1]
OUT = ROOT / "qa-evidence" / "ui-assetization-20260903"
OUT.mkdir(parents=True, exist_ok=True)

ACCEPTED = [
    {
        "id": "back-button",
        "path": ROOT / "src/assets/approved-ui/back-button-v1.png",
        "source": Path("/var/folders/f2/s76hhpss3llc2_zw9g63x7380000gn/T/codex-clipboard-2fb4cbb3-b44c-4e14-af77-c8850e6013fa.png"),
        "expectedSha256": "1c3d9e1741fc53e436508f64d43d630b53fdf0eeecc391c88ce99703c28170f9",
    },
    {
        "id": "gate-steps-banner",
        "path": ROOT / "src/assets/approved-ui/destination-gate-steps-user-v1.png",
        "source": Path("/var/folders/f2/s76hhpss3llc2_zw9g63x7380000gn/T/codex-clipboard-f82502c5-53a5-42c0-ad3f-c36f9dcd2e5d.png"),
        "expectedSha256": "59fff8c4ac8d793070e75bc6e88e0a21801f7949a7a04f9401db805225f21c28",
    },
    {
        "id": "token-banner",
        "path": ROOT / "src/assets/approved-ui/user-generated-token-banner-v1.png",
        "source": Path("/var/folders/f2/s76hhpss3llc2_zw9g63x7380000gn/T/codex-clipboard-4bb3c1b0-195c-44d0-be90-6e62e8a08b28.png"),
        "expectedSha256": "7315a123dd638ec54581983aaf78637c5a3b0717a51c12f07cfb6817351bd3e1",
    },
]

BLOCKED = [
    {
        "id": "authoritative-talisman-crop",
        "path": Path("/var/folders/f2/s76hhpss3llc2_zw9g63x7380000gn/T/codex-clipboard-1dff7846-e383-42ec-b9fc-0801efa547c2.png"),
        "reason": "RGB 478x494 screenshot crop; no alpha or layer source, so strict pixel-preserving transparent extraction is impossible.",
    },
    {
        "id": "item-ring",
        "path": ROOT / "src/assets/approved-ui/night-market-item-ring-v1.png",
        "reason": "Transparent runtime asset exists, but no user-confirmed authoritative source mapping for this layer.",
    },
    {
        "id": "talisman",
        "path": ROOT / "src/assets/approved-ui/night-market-talisman-v2.png",
        "reason": "Transparent runtime asset exists, but it is not the user-confirmed source and must not substitute for extraction.",
    },
    {
        "id": "ad-play-icon",
        "path": ROOT / "src/assets/approved-ui/night-market-ad-play-v1.png",
        "reason": "Transparent runtime asset exists, but no user-confirmed authoritative source mapping for this layer.",
    },
]


def sha(path: Path) -> str:
    return hashlib.sha256(path.read_bytes()).hexdigest()


def alpha_report(image: Image.Image) -> dict[str, int | bool | None]:
    if "A" not in image.getbands():
        return {"hasAlpha": False, "alphaMin": None, "alphaMax": None, "transparentPixels": 0, "translucentPixels": 0}
    alpha = image.getchannel("A")
    values = list(alpha.getdata())
    return {
        "hasAlpha": True,
        "alphaMin": min(values),
        "alphaMax": max(values),
        "transparentPixels": sum(value == 0 for value in values),
        "translucentPixels": sum(value < 255 for value in values),
    }


def composite(image: Image.Image, color: tuple[int, int, int]) -> Image.Image:
    background = Image.new("RGBA", image.size, (*color, 255))
    return Image.alpha_composite(background, image.convert("RGBA"))


report: dict[str, object] = {
    "schemaVersion": 1,
    "targetGame": "夜市飞侠",
    "runId": "mobile-chart-adaptation-20260830",
    "workspace": str(ROOT),
    "accepted": [],
    "blocked": [],
}

backgrounds = {"light": (245, 245, 238), "dark": (8, 18, 30), "saturated": (20, 110, 155)}

for item in ACCEPTED:
    image = Image.open(item["path"])
    source = item["source"]
    runtime_sha = sha(item["path"])
    source_sha = sha(source) if source.exists() else None
    alpha = alpha_report(image)
    composites = {}
    for name, color in backgrounds.items():
        out_path = OUT / f"{item['id']}-{name}.png"
        composite(image, color).save(out_path)
        composites[name] = str(out_path)
    report["accepted"].append({
        "id": item["id"],
        "path": str(item["path"]),
        "source": str(source),
        "runtimeSha256": runtime_sha,
        "sourceSha256": source_sha,
        "byteIdenticalToSource": runtime_sha == source_sha == item["expectedSha256"],
        "dimensions": list(image.size),
        "alpha": alpha,
        "composites": composites,
    })

for item in BLOCKED:
    path = item["path"]
    if not path.exists():
        report["blocked"].append({"id": item["id"], "path": str(path), "reason": item["reason"], "exists": False})
        continue
    image = Image.open(path)
    report["blocked"].append({
        "id": item["id"],
        "path": str(path),
        "reason": item["reason"],
        "exists": True,
        "dimensions": list(image.size),
        "mode": image.mode,
        "alpha": alpha_report(image),
    })

(OUT / "report.json").write_text(json.dumps(report, ensure_ascii=False, indent=2) + "\n")

# One visual review sheet makes the three required background checks auditable.
tiles = []
for item in report["accepted"]:
    for name in backgrounds:
        image = Image.open(item["composites"][name]).convert("RGB")
        image.thumbnail((320, 180))
        tile = Image.new("RGB", (340, 220), "#202633")
        tile.paste(image, ((340 - image.width) // 2, 28))
        ImageDraw.Draw(tile).text((10, 8), f"{item['id']} · {name}", fill="white")
        tiles.append(tile)
sheet = Image.new("RGB", (1020, 660), "#0d111b")
for index, tile in enumerate(tiles):
    sheet.paste(tile, ((index % 3) * 340, (index // 3) * 220))
sheet.save(OUT / "composite-review-sheet.png")
print(json.dumps(report, ensure_ascii=False, indent=2))
