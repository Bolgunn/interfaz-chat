# Equivalente de scripts/up.sh para PowerShell.
$ErrorActionPreference = "Stop"
$root = Split-Path -Parent $PSScriptRoot
Set-Location $root

New-Item -ItemType Directory -Force services | Out-Null
foreach ($line in Get-Content integration/services.txt) {
  if ($line -match '^\s*#' -or $line -match '^\s*$') { continue }
  $name, $repo, $commit = $line -split '\s+'
  if (-not (Test-Path "services/$name/.git")) {
    Write-Host "==> Clonando $name"
    git clone -q $repo "services/$name"
  }
  if ($env:NO_PIN -ne "1") {
    git -C "services/$name" fetch -q origin
    git -C "services/$name" -c advice.detachedHead=false checkout -q $commit
  }
}

function Up($label, [string[]]$composeArgs) {
  Write-Host "==> $label"
  docker compose @composeArgs up --build -d
  if ($LASTEXITCODE -ne 0) { throw "Falló docker compose para $label" }
}

Up "chat base" @("-f", "base/docker-compose.yaml")
Up "integrals" @("-p", "modulo-integrales", "-f", "services/integrals/docker-compose.yaml")
Up "threads" @("-p", "thread-service", "-f", "services/threads/docker-compose.yaml", "-f", "integration/overrides/threads.yaml")
Up "polls" @("-p", "polls", "-f", "services/polls/compose.yaml", "-f", "integration/overrides/polls.yaml")
Up "gateway + interfaz" @("-f", "docker-compose.yaml")

Write-Host ""
Write-Host "Listo:"
Write-Host "  Interfaz      http://localhost:3000"
Write-Host "  API Gateway   http://localhost:5000/graphql"
