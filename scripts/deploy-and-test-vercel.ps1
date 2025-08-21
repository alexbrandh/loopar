param([switch]$Prebuilt)
$ErrorActionPreference = 'Stop'
if (-not (Test-Path -LiteralPath 'logs')) { New-Item -ItemType Directory -Path 'logs' | Out-Null }
$deployJson = 'logs/vercel_deploy_preview.json'
$deployErr  = 'logs/vercel_deploy_preview.err'
if (Test-Path $deployJson) { Remove-Item $deployJson -Force }
if (Test-Path $deployErr) { Remove-Item $deployErr -Force }

$args = @('deploy','--yes','--json')
if ($Prebuilt) { $args = @('deploy','--prebuilt','--yes','--json') }

Write-Host "Running: npx vercel $($args -join ' ')"
$psi = New-Object System.Diagnostics.ProcessStartInfo
$psi.FileName = 'npx'
$psi.Arguments = 'vercel ' + ($args -join ' ')
$psi.WorkingDirectory = (Get-Location).Path
$psi.RedirectStandardOutput = $true
$psi.RedirectStandardError = $true
$psi.UseShellExecute = $false
$proc = [System.Diagnostics.Process]::Start($psi)
$stdout = $proc.StandardOutput.ReadToEnd()
$stderr = $proc.StandardError.ReadToEnd()
$proc.WaitForExit()
$stdout | Out-File -FilePath $deployJson -Encoding UTF8
$stderr | Out-File -FilePath $deployErr -Encoding UTF8

if ($proc.ExitCode -ne 0) {
  Write-Host "Deploy failed. See $deployErr"
  exit 1
}

# Attempt to parse JSON or find URL fallback
$url = $null
try {
  $json = Get-Content $deployJson -Raw | ConvertFrom-Json
  if ($json.url) { $url = $json.url }
  elseif ($json.previewUrl) { $url = $json.previewUrl }
  elseif ($json.deployments -and $json.deployments[0].url) { $url = $json.deployments[0].url }
} catch {}
if ($url -and ($url -notmatch '^https?://')) { $url = 'https://' + $url }
if (-not $url) {
  Write-Host 'DEPLOY_URL_NOT_FOUND. Check logs.'
  exit 2
}
Write-Host ("DEPLOY_URL " + $url)

$testLog = 'logs/vercel_icons_preview_test.log'
& powershell -NoProfile -ExecutionPolicy Bypass -File 'scripts/test-icons-remote.ps1' -BaseUrl $url -OutLog $testLog | Out-Null
Write-Host ("ICONS_TEST_LOG " + $testLog)
