$ErrorActionPreference = 'Stop'

$repoRoot = (Resolve-Path (Join-Path $PSScriptRoot '..')).Path
$frontendDir = Join-Path $repoRoot 'frontend'

Set-Location -LiteralPath $frontendDir

npm run dev -- --host 127.0.0.1 --port 4173 --strictPort
