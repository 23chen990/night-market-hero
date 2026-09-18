#!/usr/bin/env python3
"""
夜市飞侠 → TapTap 小游戏 H5 包一键上传脚本

流程：
  1) upload-h5-package   → 拿到 awaiting_upload token
  2) PUT to OSS          → 直传文件
  3) complete-h5-package-upload → 返回 processing token
  4) get-h5-package-upload-status（用 processing token）→ 拿到 ready 状态 + 新 token
  5) create-h5-package-version   → 创建版本记录，返回 version_id

注意：
  - 必须用 complete 之后返回的 token 才能查状态/创建版本
  - 上传之前先 cd 到平台工程目录跑 import_game.py 生成 dist/index.html
  - 重新打 H5 zip：跑 build_miniapp_zip.py
  - 跑这个脚本需要：taptap-cli 已登录（auth status 显示 Bearer）
"""
import os, sys, json, hashlib, zipfile, shutil, subprocess, requests

# === 配置 ===
ROOT = "/Users/kker/Documents/ChatGPT/妖怪夜市/runs/mobile-chart-adaptation-20260830/workspace/prototype-a"
ZIP_PATH = os.path.join(ROOT, "platforms/taptap-android/taptap-miniapp-build/yeshi-feixia-miniapp.zip")
DEV_ID = "441435"
APP_ID = "924334"

def cli(args):
    r = subprocess.run(["taptap-cli"] + args, capture_output=True, text=True,
                       env={**os.environ, "PATH": "/Users/kker/.npm-global/bin:/Users/kker/.workbuddy/binaries/node/versions/22.12.0/bin:" + os.environ.get("PATH","")})
    if r.returncode != 0:
        print("STDERR:", r.stderr[:300]); sys.exit(1)
    return json.loads(r.stdout) if r.stdout.strip().startswith("{") else None

def main():
    if not os.path.exists(ZIP_PATH):
        sys.exit(f"找不到 zip 包：{ZIP_PATH}\n请先跑 build_miniapp_zip.py 重新打 zip")
    sz = os.path.getsize(ZIP_PATH)
    sha = hashlib.sha256(open(ZIP_PATH, "rb").read()).hexdigest()
    fn = f"yeshi-feixia-miniapp-{int.from_bytes(os.urandom(2), 'big')}.zip"

    # 1) 创建上传任务
    print(f"[1/5] upload-h5-package  size={sz}  sha256={sha[:12]}…")
    o = cli(["package-management", "upload-h5-package", "--dev-id", DEV_ID, "--app-id", APP_ID, "--yes",
             "--data", json.dumps({"file_name": fn, "file_size": sz, "screen_orientation": 1, "sha256": sha}),
             "--format", "json"])
    s = o["data"]["result"]
    orig_token = s["upload_token"]
    fields_dict = {f["name"]: f["value"] for f in s["upload"]["fields"]}
    upload_url = s["upload"]["url"]

    # 2) PUT 到 OSS
    print(f"[2/5] PUT → {upload_url[:60]}…")
    with open(ZIP_PATH, "rb") as f:
        requests.post(upload_url, data=fields_dict, files={"file": (fn, f, "application/zip")}, timeout=120).raise_for_status()

    # 3) complete
    print(f"[3/5] complete-h5-package-upload")
    o = cli(["package-management", "complete-h5-package-upload", "--dev-id", DEV_ID, "--app-id", APP_ID, "--yes",
             "--data", json.dumps({"upload_token": orig_token}), "--format", "json"])
    proc_token = o["data"]["result"]["upload_token"]
    print(f"      artifact_id={o['data']['result']['artifact_id']}")

    # 4) 查解析状态（用 processing token）
    print(f"[4/5] 查解析状态")
    o = cli(["package-management", "get-h5-package-upload-status", "--dev-id", DEV_ID, "--app-id", APP_ID,
             "--data", json.dumps({"upload_token": proc_token}), "--format", "json"])
    res = o["data"]["result"]
    print(f"      status={res['status']}  package_id={res['package_id']}")
    if res["status"] != "ready":
        sys.exit(f"解析未就绪：{res}")
    ready_token = res["upload_token"]

    # 5) 创建版本
    print(f"[5/5] create-h5-package-version")
    o = cli(["package-management", "create-h5-package-version", "--dev-id", DEV_ID, "--app-id", APP_ID, "--yes",
             "--data", json.dumps({"upload_token": ready_token}), "--format", "json"])
    out = o["data"]["result"]
    print(f"\n✅  H5 版本创建成功！")
    print(f"   package_id: {out['package_id']}")
    print(f"   version_id: {out['version_id']}")
    print(f"   status:     {out['status']}")

if __name__ == "__main__":
    main()