$ErrorActionPreference = 'Stop'

$projectRoot = Split-Path -Parent $PSScriptRoot
$nodePath = 'E:\software\Node.js\node.exe'
$serverEntry = Join-Path $PSScriptRoot 'index.mjs'
$logPath = Join-Path $projectRoot 'server.log'
$errorLogPath = Join-Path $projectRoot 'server.err'
$restartDelaySeconds = 2

if (-not (Test-Path $nodePath)) {
  throw "Node.js not found at $nodePath"
}

Set-Location $projectRoot

while ($true) {
  $timestamp = Get-Date -Format 'yyyy-MM-dd HH:mm:ss'
  Add-Content -Path $logPath -Value "[$timestamp] Starting V-Hook server"

  try {
    & $nodePath $serverEntry 1>> $logPath 2>> $errorLogPath
    $exitCode = $LASTEXITCODE
  } catch {
    $exitCode = 1
    $errorTimestamp = Get-Date -Format 'yyyy-MM-dd HH:mm:ss'
    Add-Content -Path $errorLogPath -Value "[$errorTimestamp] $($_.Exception.Message)"
  }

  $stopFile = Join-Path $projectRoot 'server.stop'
  if (Test-Path $stopFile) {
    Remove-Item -LiteralPath $stopFile -Force
    $stopTimestamp = Get-Date -Format 'yyyy-MM-dd HH:mm:ss'
    Add-Content -Path $logPath -Value "[$stopTimestamp] Stop signal received, supervisor exiting"
    break
  }

  $restartTimestamp = Get-Date -Format 'yyyy-MM-dd HH:mm:ss'
  Add-Content -Path $errorLogPath -Value "[$restartTimestamp] Server exited with code $exitCode, restarting in $restartDelaySeconds seconds"
  Start-Sleep -Seconds $restartDelaySeconds
}
