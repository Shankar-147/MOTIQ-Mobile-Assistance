# Restarts the MOTIQ backend API, admin console, and Expo dev server cleanly.
#
# Handles the two recurring problems seen during manual restarts:
#   1. Stopping a background task doesn't always kill its underlying node.exe
#      on Windows, so stale processes pile up and fight over ports 3000/3001/8081.
#   2. This machine's Wi-Fi IP changes between sessions (different networks,
#      DHCP renewal) — apps/mobile/.env and Expo's own advertised host both
#      need to match the *current* IP or a phone can't reach either service.
#
# Usage (from repo root, in PowerShell):
#   .\scripts\restart-dev.ps1

$ErrorActionPreference = "Stop"
$repoRoot = Split-Path -Parent $PSScriptRoot

Write-Host "Killing anything on ports 3000 (Admin console), 3001 (API) and 8081 (Expo)..." -ForegroundColor Cyan
foreach ($port in 3000, 3001, 8081) {
    $conns = Get-NetTCPConnection -LocalPort $port -State Listen -ErrorAction SilentlyContinue
    foreach ($conn in $conns) {
        try {
            Stop-Process -Id $conn.OwningProcess -Force -ErrorAction Stop
            Write-Host "  Killed PID $($conn.OwningProcess) on port $port"
        } catch {
            # Already gone — fine.
        }
    }
}
Start-Sleep -Seconds 2

Write-Host "Detecting current Wi-Fi IP..." -ForegroundColor Cyan
$wifiIp = (Get-NetIPAddress -AddressFamily IPv4 -InterfaceAlias "Wi-Fi" -ErrorAction SilentlyContinue |
    Where-Object { $_.PrefixOrigin -eq "Dhcp" } | Select-Object -First 1 -ExpandProperty IPAddress)

if (-not $wifiIp) {
    Write-Host "Could not auto-detect a DHCP Wi-Fi IP. Falling back to Ethernet." -ForegroundColor Yellow
    $wifiIp = (Get-NetIPAddress -AddressFamily IPv4 -InterfaceAlias "Ethernet" -ErrorAction SilentlyContinue |
        Where-Object { $_.PrefixOrigin -eq "Dhcp" } | Select-Object -First 1 -ExpandProperty IPAddress)
}
if (-not $wifiIp) {
    Write-Error "Could not detect any usable LAN IP. Check your network connection and set apps/mobile/.env manually."
}
Write-Host "  Using IP: $wifiIp" -ForegroundColor Green

$envPath = Join-Path $repoRoot "apps\mobile\.env"
$envContent = @"
EXPO_PUBLIC_API_BASE_URL="http://${wifiIp}:3001/api/v1"
EXPO_PUBLIC_WS_URL="http://${wifiIp}:3001"
"@
Set-Content -Path $envPath -Value $envContent -Encoding utf8
Write-Host "Updated apps/mobile/.env with current IP." -ForegroundColor Green

Write-Host "Starting backend API in a new window..." -ForegroundColor Cyan
Start-Process powershell -ArgumentList "-NoExit", "-Command", "cd '$repoRoot'; npm run --workspace apps/api start:dev"

Write-Host "Starting admin console in a new window..." -ForegroundColor Cyan
Start-Process powershell -ArgumentList "-NoExit", "-Command", "cd '$repoRoot'; npm run --workspace apps/web dev"

Write-Host "Starting Expo dev server in a new window..." -ForegroundColor Cyan
Start-Process powershell -ArgumentList "-NoExit", "-Command", "cd '$repoRoot\apps\mobile'; `$env:REACT_NATIVE_PACKAGER_HOSTNAME='$wifiIp'; npx expo start --clear"

Write-Host ""
Write-Host "Done. Three new terminal windows are starting up:" -ForegroundColor Green
Write-Host "  - Backend API:     http://${wifiIp}:3001/api/v1"
Write-Host "  - Admin console:   http://localhost:3000"
Write-Host "  - Expo/Metro:      http://${wifiIp}:8081"
Write-Host ""
Write-Host "On your phone: connect the dev-build app to ${wifiIp}:8081 (same Wi-Fi network required)." -ForegroundColor Yellow
