# WorldScribe.online LIVE Deploy Script
# Builds production and uploads to root of worldscribe.online
# Requires deploy.env next to this script — copy from deploy.env.example
param(
    [string[]]$Changes = @()
)

$localRoot = Split-Path -Parent $MyInvocation.MyCommand.Path

function Load-DeployEnv {
    $envFile = Join-Path $localRoot "deploy.env"
    if (-not (Test-Path $envFile)) {
        Write-Host "Missing deploy.env — copy deploy.env.example to deploy.env and set EW_FTP_* values." -ForegroundColor Red
        exit 1
    }
    Get-Content $envFile | ForEach-Object {
        $line = $_.Trim()
        if (-not $line -or $line.StartsWith("#")) { return }
        $ix = $line.IndexOf("=")
        if ($ix -lt 1) { return }
        $k = $line.Substring(0, $ix).Trim()
        $v = $line.Substring($ix + 1).Trim()
        if (($v.StartsWith('"') -and $v.EndsWith('"')) -or ($v.StartsWith("'") -and $v.EndsWith("'"))) {
            $v = $v.Substring(1, $v.Length - 2)
        }
        if (-not [string]::IsNullOrEmpty($k)) {
            Set-Item -Path "env:$k" -Value $v
        }
    }
}

Load-DeployEnv

$ftpHost = $env:EW_FTP_HOST
$ftpUser = $env:EW_FTP_USER
$ftpPass = $env:EW_FTP_PASS
if (-not $ftpHost -or -not $ftpUser -or -not $ftpPass) {
    Write-Host "deploy.env must define EW_FTP_HOST, EW_FTP_USER, and EW_FTP_PASS." -ForegroundColor Red
    exit 1
}
$ftpUri = "ftp://$ftpHost"

function FtpUpload($localFile, $remotePath) {
    $uri = "$ftpUri/$remotePath"
    $webclient = New-Object System.Net.WebClient
    $webclient.Credentials = New-Object System.Net.NetworkCredential($ftpUser, $ftpPass)
    try {
        $webclient.UploadFile($uri, $localFile)
        Write-Host "  OK: $remotePath" -ForegroundColor Green
    }
    catch {
        Write-Host "  FAIL: $remotePath - $($_.Exception.Message)" -ForegroundColor Red
    }
    $webclient.Dispose()
}

function FtpMkdir($remotePath) {
    try {
        $ftp = [System.Net.FtpWebRequest]::Create("$ftpUri/$remotePath/")
        $ftp.Credentials = New-Object System.Net.NetworkCredential($ftpUser, $ftpPass)
        $ftp.Method = [System.Net.FtpWebRequestMethods+Ftp]::MakeDirectory
        $ftp.Timeout = 10000
        $response = $ftp.GetResponse()
        $response.Close()
        Write-Host "  MKDIR: $remotePath" -ForegroundColor Cyan
    }
    catch {
        # Directory likely already exists
    }
}

Write-Host "`n=== WorldScribe.online LIVE Deploy ===" -ForegroundColor Magenta
Write-Host "Target: $ftpUri" -ForegroundColor Gray

# 1. Upload PHP backend files
Write-Host "`n[1/4] Uploading PHP backend files..." -ForegroundColor Yellow
$phpFiles = @("api.php", "db.php", "user_db.php", "setup_mysql.php", "config.php", "simulate.php", "sim_apply.php", "sim_run.php", "sim_plan.php", "sim_single_town.php", "sim_world.php", "sim_level_up.php", "intake_actions.php", "roster_generator.php", "auth.php", "upload_portrait.php", "upload_content.php", "helpers.php", "llm_local.php", "import_srd.php", "import_5e_srd.php", "setup_srd_dbs.php", "migrate_srd.php", "reset_app_data.php", "discord.php")
foreach ($f in $phpFiles) {
    $path = Join-Path $localRoot $f
    if (Test-Path $path) {
        FtpUpload $path $f
    }
}

# 2. Upload live/index.html to root
Write-Host "`n[2/4] Uploading index.html (LIVE)..." -ForegroundColor Yellow
FtpUpload (Join-Path $localRoot "live\index.html") "index.html"

# 3. Upload live/assets/ to root assets/
Write-Host "`n[3/4] Uploading assets/ (JS/CSS bundles)..." -ForegroundColor Yellow
FtpMkdir "assets"
$assetFiles = Get-ChildItem (Join-Path $localRoot "live\assets") -File
foreach ($f in $assetFiles) {
    FtpUpload $f.FullName "assets/$($f.Name)"
}

# 4. Upload .htaccess for SPA routing
Write-Host "`n[4/4] Uploading .htaccess..." -ForegroundColor Yellow
$htaccess = Join-Path $localRoot "live\.htaccess"
if (Test-Path $htaccess) {
    FtpUpload $htaccess ".htaccess"
}

Write-Host "`n=== WorldScribe.online Deploy Complete! ===" -ForegroundColor Green
Write-Host "Site: https://worldscribe.online/" -ForegroundColor Cyan
Write-Host "Run setup: https://worldscribe.online/setup_mysql.php?key=setup2024" -ForegroundColor Cyan

# 5. Send Discord update notification
Write-Host "`n[5/5] Sending Discord update notification..." -ForegroundColor Yellow
try {
    $notify = @{ environment = "Production (worldscribe.online)"; description = "A new version has been deployed to worldscribe.online!" }
    if ($Changes.Count -gt 0) { $notify.changes = $Changes }
    $notifyBody = $notify | ConvertTo-Json -Compress
    Invoke-RestMethod -Uri "https://worldscribe.online/api.php?action=send_deploy_notification&key=ew_deploy_2026" -Method Post -ContentType "application/json" -Body $notifyBody -TimeoutSec 15 | Out-Null
    Write-Host "  Discord notification sent!" -ForegroundColor Green
}
catch {
    Write-Host "  Discord notification failed (non-critical): $($_.Exception.Message)" -ForegroundColor Yellow
}
