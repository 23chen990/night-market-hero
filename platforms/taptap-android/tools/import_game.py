#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
把「夜市飞侠-护印突围」的 HTML5 构建导入 Android WebView 工程。

用法（游戏更新后重新导入）：
    python3 tools/import_game.py

做了两件关键的事：
1. 把单文件 HTML 复制成 app/src/main/assets/index.html（重命名，避免中文文件名在打包/加载时的编码问题）。
2. 剥掉原 HTML 里的 file:// 强制跳转脚本。
   那段脚本原本是给桌面预览用的：当以 file:// 打开且文件名不是中文原名时，
   会 location.replace 跳到「夜市飞侠-护印突围-试玩版.html」。
   在 APK 里我们以 file:///android_asset/index.html 加载，目标文件不存在会导致白屏/跳丢，
   所以必须移除。
"""

import re
import shutil
import sys
from pathlib import Path

PROJECT_ROOT = Path(__file__).resolve().parent.parent
GAME_DIR = PROJECT_ROOT.parent.parent  # .../prototype-a
SOURCE_HTML = GAME_DIR / "夜市飞侠-护印突围-试玩版.html"
TARGET_HTML = PROJECT_ROOT / "app" / "src" / "main" / "assets" / "index.html"

# 同时保留一份原始文件名作为后备（某些场景便于人工核对）
SCRIPT_RE = re.compile(r"<script\b[^>]*>.*?</script>", re.S | re.I)


def strip_file_redirect(html: str) -> tuple[str, int]:
    """移除包含 file:// 协议跳转的 <script> 块，返回 (新 html, 移除数量)。"""
    removed = 0

    def _repl(match: re.Match) -> str:
        nonlocal removed
        block = match.group(0)
        if "location.protocol" in block and "location.replace" in block:
            removed += 1
            return ""
        return block

    return SCRIPT_RE.sub(_repl, html), removed


def main() -> int:
    if not SOURCE_HTML.is_file():
        print(f"[错误] 找不到游戏源文件：{SOURCE_HTML}", file=sys.stderr)
        print("       请确认夜市飞侠的单文件 HTML 构建仍然存在。", file=sys.stderr)
        return 1

    html = SOURCE_HTML.read_text(encoding="utf-8")
    html, removed = strip_file_redirect(html)

    TARGET_HTML.parent.mkdir(parents=True, exist_ok=True)
    TARGET_HTML.write_text(html, encoding="utf-8")

    size_mb = TARGET_HTML.stat().st_size / 1024 / 1024
    print(f"[完成] 已导入：{TARGET_HTML}")
    print(f"       源文件：{SOURCE_HTML.name}")
    print(f"       体积  ：{size_mb:.2f} MB")
    print(f"       移除 file:// 跳转脚本：{removed} 处")

    # 自检：确认没有残留跳转，也没有外部 http(s) 资源引用（保证离线可玩）
    if "location.replace" in html and "夜市飞侠-护印突围-试玩版.html" in html:
        print("[警告] 仍可能残留 file:// 跳转逻辑，请人工检查。", file=sys.stderr)
    external = re.findall(r'(?:src|href)="(https?://[^"]+)"', html)
    if external:
        print(f"[警告] 检测到 {len(external)} 处外部网络资源引用，离线时可能加载失败：", file=sys.stderr)
        for url in external[:10]:
            print(f"       {url}", file=sys.stderr)
    else:
        print("       自检：无外部网络资源引用，可离线运行。")

    return 0


if __name__ == "__main__":
    raise SystemExit(main())
