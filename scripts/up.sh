#!/usr/bin/env bash
# Levanta todo el sistema en orden: chat base -> integrals -> threads -> polls -> gateway + interfaz.
# Los servicios de otros equipos se clonan en services/ en el commit fijado en integration/services.txt.
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"

mkdir -p services
grep -v '^#' integration/services.txt | while read -r name repo commit; do
  [ -z "${name:-}" ] && continue
  if [ ! -d "services/$name/.git" ]; then
    echo "==> Clonando $name"
    git clone -q "$repo" "services/$name"
  fi
  if [ "${NO_PIN:-0}" != "1" ]; then
    git -C "services/$name" fetch -q origin
    git -C "services/$name" -c advice.detachedHead=false checkout -q "$commit"
  fi
done

up() { echo "==> $1"; shift; docker compose "$@" up --build -d; }

up "chat base"  -f base/docker-compose.yaml
up "integrals"  -p modulo-integrales -f services/integrals/docker-compose.yaml
up "threads"    -p thread-service -f services/threads/docker-compose.yaml -f integration/overrides/threads.yaml
up "polls"      -p polls -f services/polls/compose.yaml -f integration/overrides/polls.yaml
up "gateway + interfaz" -f docker-compose.yaml

cat <<'MSG'

Listo:
  Interfaz      http://localhost:3000
  API Gateway   http://localhost:5000/graphql
  users 8001 · channels 8002 · messages 8003 · integrals 8004 · threads 8005 · polls 8006
MSG
