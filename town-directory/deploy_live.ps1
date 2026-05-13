# Eon Weaver LIVE Deploy Script — production (eonweaver.com)
# Credentials: deploy.env.eonweaver (recommended) or legacy deploy.env with EW_ALLOW_EONWEAVER_DEPLOY=true
#
# Prefer instead:  npm run build  &&  node deploy.cjs eonweaver
# Auto-commit before Discord: see deploy_git_snapshot.ps1. Skip with -SkipGitCommit or EW_SKIP_DEPLOY_COMMIT=1.
param(
    [string[]]$Changes = @(),
    [switch]$SkipGitCommit
)

$localRoot = Split-Path -Parent $MyInvocation.MyCommand.Path
. (Join-Path $localRoot "deploy_git_snapshot.ps1")

function Load-DeployEnv {
    param([string]$EnvFile)
    if (-not (Test-Path $EnvFile)) { return $false }
    Get-Content $EnvFile | ForEach-Object {
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
    return $true
}

$eonFile = Join-Path $localRoot "deploy.env.eonweaver"
$loaded = $null
if (Test-Path $eonFile) {
    if (Load-DeployEnv $eonFile) { $loaded = "deploy.env.eonweaver" }
}
if (-not $loaded) {
    Write-Host "Missing deploy.env.eonweaver. Copy deploy.env.example to deploy.env.eonweaver and set eonweaver FTP user (u*.eonweaver.com)." -ForegroundColor Red
    exit 1
}
Write-Host "Loaded credentials from: $loaded" -ForegroundColor Gray

$ftpHost = $env:EW_FTP_HOST
$ftpUser = $env:EW_FTP_USER
$ftpPass = $env:EW_FTP_PASS
if (-not $ftpHost -or -not $ftpUser -or -not $ftpPass) {
    Write-Host "Env file must define EW_FTP_HOST, EW_FTP_USER, and EW_FTP_PASS." -ForegroundColor Red
    exit 1
}
if ($ftpUser -notmatch '\.eonweaver\.com$' -and $env:EW_ALLOW_EONWEAVER_DEPLOY -ne 'true') {
    Write-Host "REFUSING: production deploy expects EW_FTP_USER like uNNNNNNNN.eonweaver.com, or set EW_ALLOW_EONWEAVER_DEPLOY=true in the env file." -ForegroundColor Red
    exit 1
}
$ftpUri = "ftp://$ftpHost"
# Hostinger u*.eonweaver.com FTP is usually chrooted to the web root already.
# EW_FTP_REMOTE_PATH=public_html often yields 550 (double public_html). Use only when you truly need a subfolder:
$ewFtpRemotePrefix = ($env:EW_FTP_EONWEAVER_REMOTE_PATH -as [string]).Trim().Trim('/','\')
if (-not $ewFtpRemotePrefix -and $env:EW_USE_LEGACY_FTP_REMOTE_PATH -eq 'true') {
    $ewFtpRemotePrefix = ($env:EW_FTP_REMOTE_PATH -as [string]).Trim().Trim('/','\')
}
if ($ewFtpRemotePrefix) {
    Write-Host "Remote path prefix: $ewFtpRemotePrefix (EW_FTP_EONWEAVER_REMOTE_PATH or legacy)" -ForegroundColor Gray
} else {
    Write-Host "Remote path prefix: (none - uploads go to FTP login root)" -ForegroundColor Gray
}

function FtpUpload($localFile, $RemoteRelative) {
    $rel = if ($ewFtpRemotePrefix) { "$ewFtpRemotePrefix/$RemoteRelative" } else { $RemoteRelative }
    $rel = $rel -replace '/+', '/'
    $uri = "$ftpUri/$rel"
    $webclient = New-Object System.Net.WebClient
    $webclient.Credentials = New-Object System.Net.NetworkCredential($ftpUser, $ftpPass)
    try {
        $webclient.UploadFile($uri, $localFile)
        Write-Host "  OK: $rel" -ForegroundColor Green
    }
    catch {
        Write-Host "  FAIL: $rel - $($_.Exception.Message)" -ForegroundColor Red
    }
    $webclient.Dispose()
}

function FtpMkdir($RemoteRelative) {
    try {
        $rel = if ($ewFtpRemotePrefix) { "$ewFtpRemotePrefix/$RemoteRelative" } else { $RemoteRelative }
        $rel = $rel -replace '/+', '/'
        $ftp = [System.Net.FtpWebRequest]::Create("$ftpUri/$rel/")
        $ftp.Credentials = New-Object System.Net.NetworkCredential($ftpUser, $ftpPass)
        $ftp.Method = [System.Net.FtpWebRequestMethods+Ftp]::MakeDirectory
        $ftp.Timeout = 10000
        $response = $ftp.GetResponse()
        $response.Close()
        Write-Host "  MKDIR: $rel" -ForegroundColor Cyan
    }
    catch {
    }
}

Write-Host "`n=== Eon Weaver LIVE Deploy ===" -ForegroundColor Red
Write-Host "Target: $ftpUri (PRODUCTION, user $ftpUser)" -ForegroundColor Gray

# 1. Upload PHP backend files
Write-Host "`n[1/6] Uploading PHP backend files..." -ForegroundColor Yellow
$phpFiles = @("api.php", "db.php", "setup_mysql.php", "config.php", "simulate.php", "sim_apply.php", "sim_run.php", "sim_plan.php", "sim_prompt_lib.php", "sim_arrival_name_pool.php", "toon_lib.php", "weather_daily_lib.php", "sim_single_town.php", "sim_world.php", "sim_level_up.php", "intake_actions.php", "scribe_actions.php", "auth.php", "upload_portrait.php", "upload_world_map.php", "upload_content.php", "helpers.php", "llm_training_dataset.php", "npc_flavor_pool.php", "character_sheet_library.php", "pricing.php", "llm_local.php", "import_srd.php", "import_5e_srd.php", "setup_srd_dbs.php", "migrate_srd.php", "reset_app_data.php", "discord.php", "discord_member_sync_lib.php", "macro_framework_lib.php", "tier_policy.php", "tier_limits.php", "tier_economics.php", "signup_policy.php", "smtp_mail.php", "verify_email.php", "calendar_advance_lib.php", "calendar_display_lib.php", "metrics_lib.php", "sitemap.php", "user_db.php")
foreach ($f in $phpFiles) {
    $path = Join-Path $localRoot $f
    if (Test-Path $path) {
        FtpUpload $path $f
    }
}

# 2. Upload live/index.html + SEO root files
Write-Host "`n[2/6] Uploading index.html (LIVE)..." -ForegroundColor Yellow
FtpUpload (Join-Path $localRoot "live\index.html") "index.html"
if (Test-Path (Join-Path $localRoot "404.html")) {
    FtpUpload (Join-Path $localRoot "404.html") "404.html"
}
foreach ($rootFile in @("robots.txt", "sitemap.xml", "favicon.svg")) {
    $rf = Join-Path $localRoot $rootFile
    if (Test-Path $rf) {
        FtpUpload $rf $rootFile
    }
}

# 3. Upload live/assets/
Write-Host "`n[3/6] Uploading assets/ (JS/CSS bundles)..." -ForegroundColor Yellow
FtpMkdir "assets"
$assetFiles = Get-ChildItem (Join-Path $localRoot "live\assets") -File
foreach ($f in $assetFiles) {
    FtpUpload $f.FullName "assets/$($f.Name)"
}

# 4. .htaccess
Write-Host "`n[4/6] Uploading .htaccess..." -ForegroundColor Yellow
$htaccess = Join-Path $localRoot "live\.htaccess"
if (Test-Path $htaccess) {
    FtpUpload $htaccess ".htaccess"
}

Write-Host "`n=== LIVE Deploy Complete! ===" -ForegroundColor Green
Write-Host "Site: https://eonweaver.com/" -ForegroundColor Cyan
Write-Host "Run setup: https://eonweaver.com/setup_mysql.php?key=setup2024" -ForegroundColor Cyan

# 5. Git snapshot commit (so Discord can list real commits; optional)
Write-Host "`n[5/6] Git snapshot commit (before Discord)..." -ForegroundColor Yellow
Invoke-DeployGitSnapshotCommit -TownDirectoryPath $localRoot -DeployLabel "eonweaver production" -Skip $SkipGitCommit.IsPresent

# 6. Discord - local bot post (.env.discord + node; no call to production PHP)
Write-Host "`n[6/6] Sending Discord deploy notification (local)..." -ForegroundColor Yellow
$tmpNotify = $null
try {
    $notify = @{
        deploy_notify = "live"
        site_url      = "https://eonweaver.com/"
        site_name     = "eonweaver.com"
    }
    if ($Changes.Count -gt 0) { $notify.changes = $Changes }
    $tmpNotify = Join-Path $env:TEMP ("ew-deploy-notify-" + [Guid]::NewGuid().ToString() + ".json")
    $json = $notify | ConvertTo-Json -Depth 8
    $utf8NoBom = New-Object System.Text.UTF8Encoding $false
    [System.IO.File]::WriteAllText($tmpNotify, $json, $utf8NoBom)
    Push-Location $localRoot
    try {
        & node .\discord_deploy_notify.mjs $tmpNotify
        if ($LASTEXITCODE -ne 0) { throw "node exited $LASTEXITCODE" }
    } finally {
        Pop-Location
    }
    Write-Host "  Discord notification sent!" -ForegroundColor Green
}
catch {
    Write-Host "  Discord notification failed: $($_.Exception.Message)" -ForegroundColor Yellow
    Write-Host "  Set DISCORD_TOKEN + DISCORD_DEPLOY_CHANNEL_LIVE in town-directory/.env.discord (.env.discord.example)." -ForegroundColor Gray
}
finally {
    if ($tmpNotify -and (Test-Path $tmpNotify)) { Remove-Item $tmpNotify -ErrorAction SilentlyContinue }
}
