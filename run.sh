#!/usr/bin/env bash
set -e
set -m

ROOT_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"

(
  cd "$ROOT_DIR/backend"
  rm -rf node_modules
  npm install
  node index.js
) &  BACK_PID=$!


(
  cd "$ROOT_DIR/frontend"
  rm -rf node_modules
  npm install
  npm run dev
) &  FRONT_PID=$!

cleanup () {
  echo -e "\nStopping dev servers…"
  kill $BACK_PID $FRONT_PID 2>/dev/null || true
  wait $BACK_PID $FRONT_PID 2>/dev/null || true
}
trap cleanup SIGINT SIGTERM

wait $BACK_PID
wait $FRONT_PID 
