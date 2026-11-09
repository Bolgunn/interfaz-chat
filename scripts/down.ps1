# Equivalente de scripts/down.sh. Uso: .\scripts\down.ps1 [-v]
$root = Split-Path -Parent $PSScriptRoot
Set-Location $root
docker compose -f docker-compose.yaml down @args
docker compose -p polls -f services/polls/compose.yaml -f integration/overrides/polls.yaml down @args
docker compose -p thread-service -f services/threads/docker-compose.yaml -f integration/overrides/threads.yaml down @args
docker compose -p modulo-integrales -f services/integrals/docker-compose.yaml down @args
docker compose -f base/docker-compose.yaml down @args
