param(
  [ValidateSet('Dev','Prod')]
  [string]$Mode = 'Prod',
  [int]$Port = 3005
)

$ErrorActionPreference = 'Stop'
$root = Split-Path -Parent $MyInvocation.MyCommand.Path | Split-Path -Parent
Set-Location $root

if (-not (Test-Path -LiteralPath 'logs')) { New-Item -ItemType Directory -Path 'logs' | Out-Null }

function Start-Next {
  param([string]$mode, [int]$port, [string]$logPath)
  $args = if ($mode -eq 'Dev') { @('dev','-p',"$port") } else { @('start','-p',"$port") }
  $exe = 'node'
  $script = 'node_modules/next/dist/bin/next'
  if (-not (Test-Path $script)) { throw "Next.js binary not found at $script" }
  if (Test-Path $logPath) { Remove-Item $logPath -Force }
  Write-Host "Starting next $mode on :$port"
  $p = Start-Process -FilePath $exe -ArgumentList @($script) + $args -RedirectStandardOutput $logPath -RedirectStandardError $logPath -PassThru -WindowStyle Hidden
  return $p
}

function Wait-Ready {
  param([string]$url, [int]$timeoutSec = 20)
  $deadline = (Get-Date).AddSeconds($timeoutSec)
  while ((Get-Date) -lt $deadline) {
    try { $r = Invoke-WebRequest -Method Head -Uri $url -TimeoutSec 2 -ErrorAction Stop; return $true } catch { Start-Sleep -Milliseconds 250 }
  }
  return $false
}

function Test-Icons {
  param([string]$baseUrl, [string]$logFile)
  $urls = @(
    "$baseUrl/icon-512.png",
    "$baseUrl/icons/icon-512.png",
    "$baseUrl/icons/test512.png",
    "$baseUrl/icons/nonexistent/icon-512.png"
  )
  if (Test-Path $logFile) { Remove-Item $logFile -Force }
  Add-Content -Path $logFile -Value ("Base URL: $baseUrl")
  foreach ($u in $urls) {
    Add-Content -Path $logFile -Value ("`n== $u ==")
    try { $h = Invoke-WebRequest -Method Head -Uri $u -TimeoutSec 10 -ErrorAction Stop; Add-Content $logFile ("[HEAD] {0} CT={1} CC={2} CL={3}" -f $h.StatusCode,$h.Headers['Content-Type'],$h.Headers['Cache-Control'],$h.Headers['Content-Length']) } catch { Add-Content $logFile ("[HEAD] ERROR $($_.Exception.Message)") }
    try { $r = Invoke-WebRequest -Method Get -Uri $u -TimeoutSec 15 -ErrorAction Stop; $len = $r.RawContentStream.Length; Add-Content $logFile ("[GET ] {0} bytes={1}" -f $r.StatusCode,$len) } catch { Add-Content $logFile ("[GET ] ERROR $($_.Exception.Message)") }
  }
}

# Build for Prod mode
if ($Mode -eq 'Prod') {
  Write-Host 'Building...'
  npm.cmd run build | Tee-Object -FilePath 'logs/build_icons_current.log' -Encoding UTF8 | Out-Null
}

$baseUrl = "http://localhost:$Port"
$logPrefix = if ($Mode -eq 'Dev') { 'dev' } else { 'prod' }
$serverLog = "logs/${logPrefix}-icons-server-$Port.log"
$testLog = "logs/${logPrefix}-icons-test-$Port.log"

$proc = Start-Next -mode $Mode -port $Port -logPath $serverLog
try {
  $ready = Wait-Ready -url $baseUrl -timeoutSec 25
  if (-not $ready) { Write-Warning "Server not ready at $baseUrl" }
  Test-Icons -baseUrl $baseUrl -logFile $testLog
} finally {
  try { Stop-Process -Id $proc.Id -Force -ErrorAction Stop } catch {}
}

Write-Host "DONE. See $serverLog and $testLog"
