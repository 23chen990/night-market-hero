from __future__ import annotations

"""Build an offline visual candidate for the single-scene hybrid long-map idea.

This file intentionally lives under run artifacts, not the generated game
workspace.  It only flattens already-approved raster material and draws a
small code-layer flight route for review.  Nothing here is imported by the
runtime.
"""

import hashlib
import json
from pathlib import Path

from PIL import Image, ImageDraw, ImageEnhance, ImageFilter


RUN_ROOT = Path("/Users/kker/Documents/ChatGPT/妖怪夜市/runs/mobile-chart-adaptation-20260830")
WORKSPACE = RUN_ROOT / "workspace/night-market-hero"
OUT = RUN_ROOT / "artifacts/hybrid-longmap-preview-20260928"
ASSET_ROOT = WORKSPACE / "src/assets"
ENV_ROOT = ASSET_ROOT / "approved-runtime/environment"

W, H = 1672, 941
MOBILE_W, MOBILE_H = 844, 390


def sha256(path: Path) -> str:
    digest = hashlib.sha256()
    with path.open("rb") as stream:
        for chunk in iter(lambda: stream.read(1024 * 1024), b""):
            digest.update(chunk)
    return digest.hexdigest()


def alpha_layer(path: Path, opacity: float, *, blur: float = 0.0) -> Image.Image:
    """Load a transparent source without baking a matte into its RGB pixels."""
    source = Image.open(path).convert("RGBA")
    alpha = source.getchannel("A").point(lambda value: round(value * opacity))
    if blur > 0:
        alpha = alpha.filter(ImageFilter.GaussianBlur(blur))
    source.putalpha(alpha)
    return source


def resize_layer(source: Image.Image, size: tuple[int, int], opacity: float, *, blur: float = 0.0) -> Image.Image:
    result = source.resize(size, Image.Resampling.LANCZOS)
    alpha = result.getchannel("A").point(lambda value: round(value * opacity))
    if blur > 0:
        alpha = alpha.filter(ImageFilter.GaussianBlur(blur))
    result.putalpha(alpha)
    return result


def draw_glow_line(draw: ImageDraw.ImageDraw, points: list[tuple[int, int]], *, width: int, fill: tuple[int, int, int, int]) -> None:
    """Draw a code-owned route with a soft under-stroke and a crisp core."""
    glow = tuple(max(0, channel - 35) for channel in fill[:3]) + (max(0, fill[3] // 3),)
    draw.line(points, fill=glow, width=width + 10, joint="curve")
    draw.line(points, fill=fill, width=width, joint="curve")


def draw_anchor(draw: ImageDraw.ImageDraw, x: int, y: int, radius: int = 23) -> None:
    """Small code-drawn grapple anchor; deliberately leaves the corridor open."""
    draw.ellipse((x - radius - 7, y - radius - 7, x + radius + 7, y + radius + 7), outline=(255, 214, 135, 48), width=8)
    draw.ellipse((x - radius, y - radius, x + radius, y + radius), fill=(7, 18, 25, 205), outline=(251, 221, 159, 225), width=4)
    draw.ellipse((x - 8, y - 8, x + 8, y + 8), fill=(255, 225, 171, 245))


def crop_for_mobile(image: Image.Image) -> Image.Image:
    # The runtime stage is 16:9 authored art shown in a shorter phone viewport.
    # Keep the authored center corridor and crop a little sky/floor rather than
    # stretching the scene or introducing a second plate.
    target_ratio = MOBILE_W / MOBILE_H
    current_ratio = image.width / image.height
    if current_ratio > target_ratio:
        crop_width = round(image.height * target_ratio)
        left = (image.width - crop_width) // 2
        image = image.crop((left, 0, left + crop_width, image.height))
    else:
        crop_height = round(image.width / target_ratio)
        top = max(0, (image.height - crop_height) // 2)
        image = image.crop((0, top, image.width, top + crop_height))
    return image.resize((MOBILE_W, MOBILE_H), Image.Resampling.LANCZOS)


def build_candidate() -> dict[str, object]:
    base_path = ASSET_ROOT / "night-city/market-panorama-v1.png"
    foreground_path = ASSET_ROOT / "night-city/foreground-eaves-v1.png"
    lantern_path = ENV_ROOT / "market-lantern-sprite-v1.png"

    base = Image.open(base_path).convert("RGBA")
    if base.size != (W, H):
        raise ValueError(f"expected {W}x{H} base, got {base.size}")

    # One opaque panorama owns the entire scene. The foreground image is a
    # transparent depth accent from the same night-city family, kept gentle so
    # the open center does not turn into a pasted second map.
    foreground = alpha_layer(foreground_path, 0.28, blur=0.35)
    base.alpha_composite(foreground)

    # A single lantern sprite is reused as a small authored prop. It is cropped
    # by alpha bounds, so its transparent pixels remain transparent.
    lantern_source = Image.open(lantern_path).convert("RGBA")
    bbox = lantern_source.getchannel("A").getbbox()
    if bbox is None:
        raise ValueError("lantern source has no alpha content")
    lantern_source = lantern_source.crop(bbox)
    lantern = resize_layer(lantern_source, (45, 82), 0.80, blur=0.15)

    # The code layer owns only the flight route and interaction markers. It does
    # not draw terrain, roofs, scaffolds, rectangles or a replacement map.
    code = Image.new("RGBA", (W, H), (0, 0, 0, 0))
    code_draw = ImageDraw.Draw(code)
    route = [(240, 610), (445, 475), (690, 390), (940, 450), (1200, 355), (1470, 470)]
    draw_glow_line(code_draw, route, width=3, fill=(246, 210, 143, 155))
    for x, y in [(445, 475), (690, 390), (940, 450), (1200, 355)]:
        draw_anchor(code_draw, x, y, radius=19)
    # A second, shorter line suggests the player-to-anchor swing without
    # blocking the route or adding any scenery geometry.
    draw_glow_line(code_draw, [(240, 610), (445, 475)], width=5, fill=(255, 231, 178, 210))
    base.alpha_composite(code)

    # Place the lanterns after the route so the new warm pixels sit naturally on
    # top of the dark material and remain sparse.
    for x, y in [(530, 272), (790, 330), (1100, 247), (1355, 350)]:
        base.alpha_composite(lantern, (x, y))

    # A restrained grade pulls the added raster layer into the existing teal
    # night palette while retaining the base panorama's warm windows.
    rgb = base.convert("RGB")
    rgb = ImageEnhance.Color(rgb).enhance(0.97)
    rgb = ImageEnhance.Contrast(rgb).enhance(1.015)

    desktop_path = OUT / "hybrid-longmap-candidate-1672x941.png"
    mobile_path = OUT / "hybrid-longmap-candidate-844x390.png"
    rgb.save(desktop_path, optimize=True)
    crop_for_mobile(rgb).save(mobile_path, optimize=True)

    return {
        "desktop": desktop_path,
        "mobile": mobile_path,
        "sources": [base_path, foreground_path, lantern_path],
        "layout": {
            "sceneOwner": "market-panorama-v1",
            "foregroundDepthAccent": "foreground-eaves-v1 @ 0.28 opacity",
            "codeLayer": "one route, four anchors, one player-to-anchor segment",
            "centralFlightCorridor": {"x": [320, 1340], "y": [245, 640]},
            "secondOpaquePanorama": False,
            "mapStitchOrTransitionStrip": False,
            "runtimeTerrainDrawing": False,
        },
    }


def write_manifest(result: dict[str, object]) -> None:
    sources = result["sources"]
    assert isinstance(sources, list)
    desktop = result["desktop"]
    mobile = result["mobile"]
    assert isinstance(desktop, Path) and isinstance(mobile, Path)
    manifest = {
        "schemaVersion": 1,
        "artifactType": "hybrid-longmap-offline-preview",
        "targetGame": "夜市飞侠：护印突围",
        "runId": "mobile-chart-adaptation-20260830",
        "workspace": str(WORKSPACE),
        "status": "ART_CANDIDATE_PENDING_USER_REVIEW",
        "previewOnly": True,
        "runtimeIntegration": {
            "status": "NOT_INTEGRATED",
            "runtimeFilesChanged": [],
            "catalogChanged": False,
            "defaultJourneyChanged": False,
        },
        "sceneModel": {
            "sceneOwner": "single-flattened-rgb-composite",
            "canvas": {"width": W, "height": H, "mode": "RGB"},
            "mobilePreview": {"width": MOBILE_W, "height": MOBILE_H, "crop": "center-crop-from-authored-canvas"},
            "forbiddenInCandidate": [
                "second opaque panorama",
                "map stitching",
                "transition or bridge strip",
                "runtime-generated terrain",
            ],
        },
        "sources": [
            {"path": str(path), "sha256": sha256(path), "role": "existing-material"}
            for path in sources
        ],
        "composition": result["layout"],
        "outputs": [
            {"path": str(desktop), "sha256": sha256(desktop)},
            {"path": str(mobile), "sha256": sha256(mobile)},
        ],
        "buildScript": {"path": str(OUT / "build_preview.py"), "sha256": sha256(OUT / "build_preview.py")},
        "reviewNote": "This is a visual candidate only. No runtime or generated-game file was changed.",
    }
    (OUT / "preview-manifest.json").write_text(json.dumps(manifest, ensure_ascii=False, indent=2) + "\n")


if __name__ == "__main__":
    OUT.mkdir(parents=True, exist_ok=True)
    result = build_candidate()
    write_manifest(result)
    print(json.dumps({"desktop": str(result["desktop"]), "mobile": str(result["mobile"])}, ensure_ascii=False))
