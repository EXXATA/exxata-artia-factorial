$ErrorActionPreference = 'Stop'

$repoRoot = (Resolve-Path (Join-Path $PSScriptRoot '..')).Path
$backendDir = Join-Path $repoRoot 'backend'

Set-Location -LiteralPath $backendDir
$env:PORT = '3100'

npm run dev
