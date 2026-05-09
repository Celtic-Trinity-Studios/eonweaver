# WorldScribe.online LIVE Deploy Script
# Builds production and uploads to root of worldscribe.online
#
# Credential files (pick one - keep BOTH on disk; do not swap a single deploy.env):
#   deploy.env.worldscribe  - staging (worldscribe.online) FTP user u*.worldscribe.online
#   deploy.env.eonweaver    - production (eonweaver.com) - use node deploy.cjs eonweaver instead
#
# Usage:
#   .\deploy_worldscribe.ps1
#   .\deploy_worldscribe.ps1 worldscribe
#   .\deploy_worldscribe.ps1 -EnvFile .\deploy.env.worldscribe
# Auto-commit before Discord: stages town-directory (gitignored secrets excluded). Skip with -SkipGitCommit or EW_SKIP_DEPLOY_COMMIT=1.
param(
    [Parameter(Position = 0)]
    [ValidateSet('worldscribe')]
    [string]$Target = 'worldscribe',
    [string]$EnvFile = '',
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

$loadedFile = $null
if ($EnvFile) {
    $fullPath = if ([System.IO.Path]::IsPathRooted($EnvFile)) { $EnvFile } else { Join-Path $localRoot $EnvFile }
    if (-not (Test-Path $fullPath)) {
        Write-Host "Env file not found: $fullPath" -ForegroundColor Red
        exit 1
    }
    if (Load-DeployEnv $fullPath) {
        $loadedFile = Split-Path $fullPath -Leaf
    }
} elseif ($Target -eq 'worldscribe') {
    $wsEnvFile = Join-Path $localRoot "deploy.env.worldscribe"
    if (Test-Path $wsEnvFile) {
        if (Load-DeployEnv $wsEnvFile) { $loadedFile = "deploy.env.worldscribe" }
    }
}
if (-not $loadedFile) {
    Write-Host "Missing credentials. Create deploy.env.worldscribe (required for this script) - see deploy.env.example." -ForegroundColor Red
    exit 1
}
Write-Host "Loaded credentials from: $loadedFile" -ForegroundColor Gray

$ftpHost = $env:EW_FTP_HOST
$ftpUser = $env:EW_FTP_USER
$ftpPass = $env:EW_FTP_PASS
if (-not $ftpHost -or -not $ftpUser -or -not $ftpPass) {
    Write-Host "Env file ($loadedFile) must define EW_FTP_HOST, EW_FTP_USER, and EW_FTP_PASS." -ForegroundColor Red
    exit 1
}

# Safety guard: refuse to run if credentials look like the eonweaver.com production user.
# Hostinger domain-scoped FTP users have the form uNNNNNNNN.<domain>. If we see eonweaver here we'd
# silently upload the worldscribe build to the eonweaver chroot and leave worldscribe stale.
if ($ftpUser -match '\.eonweaver\.com$' -or $ftpUser -match '\.eonscribe\.com$') {
    Write-Host "REFUSING TO DEPLOY: EW_FTP_USER='$ftpUser' looks like an eonweaver/eonscribe FTP user." -ForegroundColor Red
    Write-Host "deploy_worldscribe.ps1 must use the worldscribe.online FTP login (e.g. uNNNNNNNN.worldscribe.online)." -ForegroundColor Red
    Write-Host "Fix: put worldscribe creds in deploy.env.worldscribe, OR replace deploy.env with worldscribe creds." -ForegroundColor Yellow
    exit 1
}
if (-not ($ftpUser -match '\.worldscribe\.online$') -and -not $env:EW_ALLOW_NON_WORLDSCRIBE_DEPLOY) {
    Write-Host "WARNING: EW_FTP_USER='$ftpUser' does not look like a worldscribe.online FTP user." -ForegroundColor Yellow
    Write-Host "If this is intentional, set EW_ALLOW_NON_WORLDSCRIBE_DEPLOY=true and re-run." -ForegroundColor Yellow
    exit 1
}
$ftpUri = "ftp://$ftpHost"
# Hostinger domain FTP (e.g. uNNN.worldscribe.online) is usually chrooted to the site root.
# Using EW_FTP_REMOTE_PATH here often breaks with 550 (double public_html). WorldScribe uses its own key:
$remotePrefix = ""
if ($null -ne $env:EW_FTP_WORLDSCRIBE_REMOTE_PATH) {
    $remotePrefix = ($env:EW_FTP_WORLDSCRIBE_REMOTE_PATH -as [string]).Trim().Trim('/','\')
}
if ($remotePrefix) {
    Write-Host "Remote prefix: $remotePrefix (from EW_FTP_WORLDSCRIBE_REMOTE_PATH)" -ForegroundColor Gray
} else {
    Write-Host "Remote prefix: (none - uploads go to FTP login root)" -ForegroundColor Gray
}
function RemotePath($relativePath) {
    if (-not $remotePrefix) { return $relativePath }
    return ($remotePrefix + "/" + $relativePath).Replace("//", "/")
}

function FtpUpload($localFile, $remotePath) {
    $remotePath = RemotePath $remotePath
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
        $remotePath = RemotePath $remotePath
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
Write-Host "`n[1/6] Uploading PHP backend files..." -ForegroundColor Yellow
$phpFiles = @("api.php", "db.php", "user_db.php", "setup_mysql.php", "config.php", "simulate.php", "sim_apply.php", "sim_run.php", "sim_plan.php", "sim_prompt_lib.php", "toon_lib.php", "weather_daily_lib.php", "sim_single_town.php", "sim_world.php", "sim_level_up.php", "intake_actions.php", "scribe_actions.php", "roster_generator.php", "auth.php", "upload_portrait.php", "upload_world_map.php", "upload_content.php", "helpers.php", "llm_local.php", "import_srd.php", "import_5e_srd.php", "setup_srd_dbs.php", "migrate_srd.php", "reset_app_data.php", "discord.php", "discord_member_sync_lib.php", "macro_framework_lib.php", "tier_policy.php", "tier_limits.php", "tier_economics.php", "signup_policy.php", "smtp_mail.php", "verify_email.php", "calendar_advance_lib.php", "calendar_display_lib.php", "metrics_lib.php", "sitemap.php")
foreach ($f in $phpFiles) {
    $path = Join-Path $localRoot $f
    if (Test-Path $path) {
        FtpUpload $path $f
    }
}

# 2. Upload live/index.html to root
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

# 3. Upload live/assets/ to root assets/
Write-Host "`n[3/6] Uploading assets/ (JS/CSS bundles)..." -ForegroundColor Yellow
FtpMkdir "assets"
$assetFiles = Get-ChildItem (Join-Path $localRoot "live\assets") -File
foreach ($f in $assetFiles) {
    FtpUpload $f.FullName "assets/$($f.Name)"
}

# 4. Upload .htaccess for SPA routing
Write-Host "`n[4/6] Uploading .htaccess..." -ForegroundColor Yellow
$htaccess = Join-Path $localRoot "live\.htaccess"
if (Test-Path $htaccess) {
    FtpUpload $htaccess ".htaccess"
}

Write-Host "`n=== WorldScribe.online Deploy Complete! ===" -ForegroundColor Green
Write-Host "Site: https://worldscribe.online/" -ForegroundColor Cyan
Write-Host "Run setup: https://worldscribe.online/setup_mysql.php?key=setup2024" -ForegroundColor Cyan

# 5. Git snapshot commit (so Discord can list real commits; optional)
Write-Host "`n[5/6] Git snapshot commit (before Discord)..." -ForegroundColor Yellow
Invoke-DeployGitSnapshotCommit -TownDirectoryPath $localRoot -DeployLabel "worldscribe staging" -Skip $SkipGitCommit.IsPresent

# 6. Discord — local bot post (.env.discord + node; no PHP on any server)
Write-Host "`n[6/6] Sending Discord deploy notification (local)..." -ForegroundColor Yellow
$tmpNotify = $null
try {
    $notify = @{
        deploy_notify   = "dev"
        deploy_edition  = "both"
        environment     = "Dev / QA (worldscribe.online)"
        description     = "New build deployed to dev (worldscribe.online) - not live production."
        deploy_target   = "Dev | https://worldscribe.online/ | staging FTP | same SPA bundle as prod"
        app_editions    = "3.5e / 5e / 5e2024 - bundled; edition picked in-app."
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
    Write-Host "  Set DISCORD_TOKEN + DISCORD_DEPLOY_CHANNEL_DEV_* in town-directory/.env.discord (.env.discord.example)." -ForegroundColor Gray
}
finally {
    if ($tmpNotify -and (Test-Path $tmpNotify)) { Remove-Item $tmpNotify -ErrorAction SilentlyContinue }
}
