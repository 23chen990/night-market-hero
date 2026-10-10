#!/bin/bash
# 妖怪夜市「小游戏工厂」看板启动脚本
# 用法：
#   手动启动：  bash tools/start-board.sh
#   常驻后台：  nohup bash tools/start-board.sh > tools/board.log 2>&1 &
#   （正式常驻请用 launchd：见 ~/Library/LaunchAgents/com.ygys.board.plist）

export BOARD_PORT=4173
export FACTORY_ROOT="/Users/kker/Documents/ChatGPT/妖怪夜市"

cd "/Users/kker/Documents/ChatGPT/妖怪夜市" || exit 1

exec "/Users/kker/.workbuddy/binaries/node/versions/22.22.2/bin/node" \
  "/Users/kker/Documents/ChatGPT/妖怪夜市/tools/board.mjs"
