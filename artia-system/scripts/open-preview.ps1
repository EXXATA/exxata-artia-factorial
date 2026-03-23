$ErrorActionPreference = 'Stop'

$repoRoot = (Resolve-Path (Join-Path $PSScriptRoot '..')).Path
$logsDir = Join-Path $repoRoot '.codex-logs'
$backendDir = Join-Path $repoRoot 'backend'
$frontendDir = Join-Path $repoRoot 'frontend'

$backendPort = 3100
$frontendPort = 4173
$backendHealthUrl = "http://127.0.0.1:$backendPort/health"
$frontendUrl = "http://127.0.0.1:$frontendPort/"

if (-not (Test-Path $logsDir)) {
  New-Item -ItemType Directory -Path $logsDir | Out-Null
}

function Test-UrlReady {
  param(
    [Parameter(Mandatory = $true)]
    [string]$Url,
    [int]$TimeoutSeconds = 2
  )

  try {
    $response = Invoke-WebRequest -Uri $Url -UseBasicParsing -TimeoutSec $TimeoutSeconds
    return $response.StatusCode -ge 200 -and $response.StatusCode -lt 500
  } catch {
    return $false
  }
}

function Wait-ForUrl {
  param(
    [Parameter(Mandatory = $true)]
    [string]$Url,
    [int]$TimeoutSeconds = 30
  )

  $deadline = (Get-Date).AddSeconds($TimeoutSeconds)

  while ((Get-Date) -lt $deadline) {
    if (Test-UrlReady -Url $Url -TimeoutSeconds 2) {
      return $true
    }

    Start-Sleep -Milliseconds 500
  }

  return $false
}

function Start-BackgroundScript {
  param(
    [Parameter(Mandatory = $true)]
    [string]$ScriptPath,
    [Parameter(Mandatory = $true)]
    [string]$StdOutPath,
    [Parameter(Mandatory = $true)]
    [string]$StdErrPath
  )

  foreach ($logPath in @($StdOutPath, $StdErrPath)) {
    if (Test-Path $logPath) {
      Remove-Item $logPath -Force -ErrorAction SilentlyContinue
    }
  }

  Start-Process `
    -FilePath 'powershell' `
    -WindowStyle Hidden `
    -ArgumentList "-NoProfile -ExecutionPolicy Bypass -File `"$ScriptPath`"" `
    -RedirectStandardOutput $StdOutPath `
    -RedirectStandardError $StdErrPath | Out-Null
}

if (-not (Test-UrlReady -Url $backendHealthUrl)) {
  Start-BackgroundScript `
    -ScriptPath (Join-Path $repoRoot 'scripts\run-backend-preview.ps1') `
    -StdOutPath (Join-Path $logsDir 'backend-preview-3100.out.log') `
    -StdErrPath (Join-Path $logsDir 'backend-preview-3100.err.log')

  if (-not (Wait-ForUrl -Url $backendHealthUrl -TimeoutSeconds 45)) {
    throw "Backend nao ficou pronto em $backendHealthUrl"
  }
}

if (-not (Test-UrlReady -Url $frontendUrl)) {
  Start-BackgroundScript `
    -ScriptPath (Join-Path $repoRoot 'scripts\run-frontend-preview.ps1') `
    -StdOutPath (Join-Path $logsDir 'frontend-preview-4173.out.log') `
    -StdErrPath (Join-Path $logsDir 'frontend-preview-4173.err.log')

  if (-not (Wait-ForUrl -Url $frontendUrl -TimeoutSeconds 45)) {
    throw "Frontend nao ficou pronto em $frontendUrl"
  }
}

Start-Process $frontendUrl | Out-Null
Write-Host "Preview aberto em $frontendUrl"
