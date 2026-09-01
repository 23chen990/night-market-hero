#!/bin/zsh
set -e

PROTOTYPE_DIR=${0:a:h}
VITE_BIN="$PROTOTYPE_DIR/../../node_modules/.bin/vite"

if [[ ! -x "$VITE_BIN" ]]; then
  echo "未找到 Vite。请先在项目根目录运行 pnpm install。"
  read -k 1 "?按任意键关闭…"
  exit 1
fi

cd "$PROTOTYPE_DIR"
exec "$VITE_BIN" --host 127.0.0.1 --open
