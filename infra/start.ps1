$ErrorActionPreference = 'Stop'
Write-Host "== 启动依赖服务 =="
function Test-Command($cmd){ $null = Get-Command $cmd -ErrorAction SilentlyContinue; return $LASTEXITCODE -eq 0 -or $null -ne $null }
if (-not (Test-Command 'docker')) {
  Write-Warning "未检测到 Docker，请先安装并启动 Docker Desktop 然后重试：`ndocker compose -f infra/docker-compose.yml up -d"
  exit 1
}
Write-Host "启动 Compose 服务：Postgres、PgAdmin、Mongo、py_analytics"
docker compose -f "$PSScriptRoot\docker-compose.yml" up -d
Write-Host "完成。PgAdmin: http://localhost:8080/  Django: http://localhost:8000/ Mongo: 27017 Postgres: 5432"