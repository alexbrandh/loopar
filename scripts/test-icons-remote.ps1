param(
  [Parameter(Mandatory=$true)][string]$BaseUrl,
  [string]$OutLog = ''
)
$ErrorActionPreference = 'Stop'
if (-not (Test-Path -LiteralPath 'logs')) { New-Item -ItemType Directory -Path 'logs' | Out-Null }
if (-not $OutLog) { $ts = Get-Date -Format 'yyyyMMdd_HHmmss'; $OutLog = "logs/vercel-icons-test_$ts.log" }
$urls = @(
  "$BaseUrl/icon-512.png",
  "$BaseUrl/icons/icon-512.png",
  "$BaseUrl/icons/test512.png",
  "$BaseUrl/icons/nonexistent/icon-512.png"
)
if (Test-Path $OutLog) { Remove-Item $OutLog -Force }
Add-Content -Path $OutLog -Value ("Base URL: $BaseUrl")
foreach ($u in $urls) {
  Add-Content -Path $OutLog -Value ("`n== $u ==")
  try { $h = Invoke-WebRequest -Method Head -Uri $u -TimeoutSec 20 -ErrorAction Stop; Add-Content $OutLog ("[HEAD] {0} CT={1} CC={2} CL={3}" -f $h.StatusCode,$h.Headers['Content-Type'],$h.Headers['Cache-Control'],$h.Headers['Content-Length']) } catch { Add-Content $OutLog ("[HEAD] ERROR $($_.Exception.Message)") }
  try { $r = Invoke-WebRequest -Method Get -Uri $u -TimeoutSec 30 -ErrorAction Stop; $len = if ($r.RawContentStream) { $r.RawContentStream.Length } else { ($r.Content | Out-String).Length }; Add-Content $OutLog ("[GET ] {0} bytes={1}" -f $r.StatusCode,$len) } catch { Add-Content $OutLog ("[GET ] ERROR $($_.Exception.Message)") }
}
Write-Host "DONE $OutLog"
