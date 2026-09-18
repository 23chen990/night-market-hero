# 一键构建 APK（调试签名版）。
#
# 用法：双击运行，或在终端执行 ./构建APK.command
# 首次运行会下载 Gradle 8.2 与 Android SDK 组件（约 200MB，取决于网络）。
# 完成后 APK 位于：app/build/outputs/apk/debug/app-debug.apk
#
# 前置条件（满足其中之一即可）：
#   1) 已安装 Android Studio（首次打开本目录会自动配置 SDK）
#   2) 已设置 ANDROID_HOME 或 ~/Library/Android/sdk，且含 platforms;android-34、build-tools;34.0.0

set -e

PROJ_DIR="$(cd "$(dirname "$0")" && pwd)"
cd "$PROJ_DIR"

echo "==> 夜市飞侠 · TapTap APK 构建脚本"
echo "    工程目录：$PROJ_DIR"

# 1) 把最新的游戏 HTML 重新装入 assets/
if [ -f "tools/import_game.py" ]; then
  echo "==> 重新导入游戏构建..."
  python3 tools/import_game.py
else
  echo "[警告] 未找到 tools/import_game.py，跳过游戏导入。"
fi

# 2) 检查 Android SDK
if [ -z "${ANDROID_HOME:-}" ] && [ ! -d "$HOME/Library/Android/sdk" ]; then
  echo
  echo "[错误] 没检测到 Android SDK。请先安装 Android Studio："
  echo "       https://developer.android.com/studio"
  echo "       或在系统环境变量中设置 ANDROID_HOME 指向你的 SDK 目录。"
  echo
  echo "如果你想走零安装路线，把工程推到 GitHub，用 GitHub Actions 自动构建："
  echo "       https://github.com/<你的用户名>/<仓库>/actions"
  exit 1
fi

if [ -z "${ANDROID_HOME:-}" ] && [ -d "$HOME/Library/Android/sdk" ]; then
  export ANDROID_HOME="$HOME/Library/Android/sdk"
fi
echo "    ANDROID_HOME=$ANDROID_HOME"

# 3) 跑 gradlew 出包
echo "==> 构建 debug APK（首次会下载 Gradle 8.2 与 Android SDK 组件，请耐心等待）..."
./gradlew assembleDebug --no-daemon

APK="app/build/outputs/apk/debug/app-debug.apk"
if [ -f "$APK" ]; then
  SIZE=$(du -h "$APK" | cut -f1)
  echo
  echo "==> 构建成功 ✅"
  echo "    APK：$PROJ_DIR/$APK ($SIZE)"
  echo "    这是 debug 签名版，可直接 adb install 或上传 TapTap 做前置审核。"
  echo
  echo "    想直接装到连着 USB 的手机？"
  echo "      adb install -r '$APK'"
else
  echo
  echo "[错误] 构建失败，请看上方的 gradle 日志。"
  exit 1
fi