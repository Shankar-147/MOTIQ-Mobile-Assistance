# Wipes all data from the local motiq_dev database and rebuilds it from
# scratch: schema, PostGIS extension, migrations, and seed config
# (ServiceArea, CommissionRate, MaintenanceIntervalRule, Admin user).
#
# Why not `prisma migrate reset`: that command DROPs and recreates the whole
# database, which also destroys the PostGIS extension — and it was enabled
# manually on this machine (native Postgres install, no Docker; see
# docs/development.md), not via a migration. Recreating the database leaves
# migrations unable to apply ("type geography does not exist") until a
# superuser re-runs CREATE EXTENSION. This script instead drops and recreates
# just the public schema, so the extension survives, then reapplies
# migrations and the seed.
#
# Requires the Postgres superuser password (the `motiq` app user is not a
# superuser and cannot create extensions). Pass it with -PostgresPassword or
# set $env:POSTGRES_SUPERUSER_PASSWORD before running; you'll be prompted
# otherwise.
#
# Usage (from repo root, in PowerShell):
#   .\scripts\reset-db.ps1
#   .\scripts\reset-db.ps1 -PostgresPassword "..." -Force

param(
    [string]$PostgresPassword = $env:POSTGRES_SUPERUSER_PASSWORD,
    [switch]$Force
)

$ErrorActionPreference = "Stop"
$repoRoot = Split-Path -Parent $PSScriptRoot
$apiDir = Join-Path $repoRoot "apps\api"
$envPath = Join-Path $apiDir ".env"

if (-not (Test-Path $envPath)) {
    Write-Error "Could not find $envPath. Copy .env.example first (see CLAUDE.md Commands)."
}

$databaseUrl = (Get-Content $envPath | Where-Object { $_ -match '^DATABASE_URL=' }) -replace '^DATABASE_URL="?', '' -replace '"?$', ''
if (-not $databaseUrl) {
    Write-Error "DATABASE_URL not found in $envPath"
}

$uri = [System.Uri]$databaseUrl
$dbUser = $uri.UserInfo.Split(':')[0]
$dbHost = $uri.Host
$dbPort = $uri.Port
$dbName = $uri.AbsolutePath.TrimStart('/').Split('?')[0]

Write-Host "Target database: $dbName (owner role: $dbUser) on ${dbHost}:${dbPort}" -ForegroundColor Cyan

if (-not $Force) {
    $confirm = Read-Host "This deletes ALL data in '$dbName'. Type 'yes' to continue"
    if ($confirm -ne "yes") {
        Write-Host "Aborted." -ForegroundColor Yellow
        exit 0
    }
}

if (-not $PostgresPassword) {
    $securePwd = Read-Host "Postgres superuser password" -AsSecureString
    $PostgresPassword = [System.Runtime.InteropServices.Marshal]::PtrToStringAuto(
        [System.Runtime.InteropServices.Marshal]::SecureStringToBSTR($securePwd)
    )
}

$env:PGPASSWORD = $PostgresPassword
$superuserConnStr = "postgresql://postgres@${dbHost}:${dbPort}/${dbName}"

Write-Host "Dropping and recreating public schema..." -ForegroundColor Cyan
$sql = @"
DROP SCHEMA public CASCADE;
CREATE SCHEMA public;
GRANT ALL ON SCHEMA public TO $dbUser;
GRANT ALL ON SCHEMA public TO public;
CREATE EXTENSION IF NOT EXISTS postgis;
"@
$sql | psql $superuserConnStr
if ($LASTEXITCODE -ne 0) {
    Remove-Item Env:\PGPASSWORD -ErrorAction SilentlyContinue
    Write-Error "Failed to reset schema. Check the Postgres superuser password and that psql is on PATH."
}
Remove-Item Env:\PGPASSWORD -ErrorAction SilentlyContinue

Write-Host "Applying Prisma migrations..." -ForegroundColor Cyan
Push-Location $apiDir
try {
    npx prisma migrate deploy
    if ($LASTEXITCODE -ne 0) { throw "prisma migrate deploy failed" }

    Write-Host "Running seed script..." -ForegroundColor Cyan
    npx ts-node prisma/seed.ts
    if ($LASTEXITCODE -ne 0) { throw "seed script failed" }
} finally {
    Pop-Location
}

Write-Host ""
Write-Host "Database reset complete. '$dbName' now has schema + seed config only (no user data)." -ForegroundColor Green
