$root = Split-Path -Parent $PSScriptRoot
$backendPath = Join-Path $root 'backend'
$frontendPath = Join-Path $root 'frontend'

$backendCommand = "Set-Location '$backendPath'; npm run dev:local"
$frontendCommand = "Set-Location '$frontendPath'; npm run dev:local"

Start-Process powershell -ArgumentList '-NoExit', '-ExecutionPolicy', 'Bypass', '-Command', $backendCommand | Out-Null
Start-Process powershell -ArgumentList '-NoExit', '-ExecutionPolicy', 'Bypass', '-Command', $frontendCommand | Out-Null

Write-Host 'Backend local iniciado em uma janela dedicada na porta 3100.'
Write-Host 'Frontend local iniciado em uma janela dedicada na porta 4176.'
Write-Host 'Feche as janelas abertas para encerrar os dois processos.'
