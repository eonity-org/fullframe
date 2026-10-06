#!/usr/bin/env bash
# FullFrame — Docker-only dev wrapper (the host has no Node).
# Runs npm/node inside a disposable node:22 container with the repo mounted.
#
#   ./dev.sh install       npm install
#   ./dev.sh db            migrate + seed
#   ./dev.sh dev           dev server on http://localhost:3020
#   ./dev.sh build         production build
#   ./dev.sh start         production server on http://localhost:3020
#   ./dev.sh sh            shell inside the container
#   ./dev.sh npm|npx …     arbitrary npm/npx command
set -euo pipefail
cd "$(dirname "${BASH_SOURCE[0]}")"

IMAGE="${FULLFRAME_NODE_IMAGE:-node:22}"
PORT="${FULLFRAME_PORT:-3020}"

TTY_FLAGS=""
if [ -t 0 ]; then TTY_FLAGS="-it"; fi

# Only the servers publish the port, so one-off commands (typecheck, test…)
# still run while another FullFrame (e.g. docker compose) holds it.
PORT_FLAGS=""
case "${1:-dev}" in dev|start) PORT_FLAGS="-p $PORT:3020" ;; esac

run() {
  # host.docker.internal resolves on Docker Desktop; --add-host covers Linux.
  docker run --rm $TTY_FLAGS \
    -v "$PWD":/app -w /app \
    $PORT_FLAGS \
    --add-host host.docker.internal:host-gateway \
    $(test -f .env && echo "--env-file .env") \
    "$IMAGE" "$@"
}

case "${1:-dev}" in
  install) run npm install ;;
  db)      run sh -c 'npm run db:seed' ;;
  dev)     run npm run dev ;;
  build)   run npm run build ;;
  start)   run npm run start ;;
  sh)      run bash ;;
  npm|npx) run "$@" ;;
  *)       echo "Unknown command: $1" >&2; exit 1 ;;
esac
