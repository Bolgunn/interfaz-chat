#!/usr/bin/env bash
# Detiene todo en orden inverso (el chat base es dueño de la red microsvcs, va al final).
# Pasa -v para borrar también los volúmenes: ./scripts/down.sh -v
set -uo pipefail
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"
docker compose -f docker-compose.yaml down "$@"
docker compose -p polls -f services/polls/compose.yaml -f integration/overrides/polls.yaml down "$@"
docker compose -p thread-service -f services/threads/docker-compose.yaml -f integration/overrides/threads.yaml down "$@"
docker compose -p modulo-integrales -f services/integrals/docker-compose.yaml down "$@"
docker compose -f base/docker-compose.yaml down "$@"
