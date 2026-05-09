# Dot-source from deploy_worldscribe.ps1 / deploy_live.ps1 after $localRoot is set:
#   . (Join-Path $localRoot "deploy_git_snapshot.ps1")
#
# Stages all changes under town-directory/ (respects .gitignore), optionally root .gitignore,
# then commits so Discord deploy notify can show real git history. Skip with -SkipGitCommit or EW_SKIP_DEPLOY_COMMIT=1.

function Invoke-DeployGitSnapshotCommit {
    param(
        [Parameter(Mandatory = $true)][string]$TownDirectoryPath,
        [Parameter(Mandatory = $true)][string]$DeployLabel,
        [bool]$Skip = $false
    )
    if ($Skip) {
        Write-Host "  -SkipGitCommit: skipping git snapshot" -ForegroundColor Gray
        return
    }
    if ($env:EW_SKIP_DEPLOY_COMMIT -eq 'true' -or $env:EW_SKIP_DEPLOY_COMMIT -eq '1') {
        Write-Host "  EW_SKIP_DEPLOY_COMMIT is set; skipping git snapshot commit" -ForegroundColor Gray
        return
    }
    if (-not (Get-Command git -ErrorAction SilentlyContinue)) {
        Write-Host "  git not on PATH; skipping git snapshot commit" -ForegroundColor Yellow
        return
    }
    $repoRoot = (& git -C $TownDirectoryPath rev-parse --show-toplevel 2>$null)
    if (-not $repoRoot) {
        Write-Host "  Not inside a git repository; skipping git snapshot commit" -ForegroundColor Yellow
        return
    }
    $repoRoot = $repoRoot.Trim()
    Push-Location $repoRoot
    try {
        & git add --all -- town-directory
        $gitignorePath = Join-Path $repoRoot ".gitignore"
        if (Test-Path $gitignorePath) {
            $giStatus = (& git status --porcelain -- .gitignore 2>$null)
            if ($giStatus) { & git add -- .gitignore 2>$null | Out-Null }
        }
        $staged = (& git diff --cached --name-only 2>$null)
        if (-not $staged) {
            Write-Host "  Git: nothing new to commit under town-directory (tree clean)" -ForegroundColor Gray
            return
        }
        $msg = "chore(deploy): $DeployLabel $(Get-Date -Format 'yyyy-MM-dd HH:mm') UTC"
        & git commit -m $msg
        if ($LASTEXITCODE -ne 0) {
            Write-Host "  Git commit failed (exit $LASTEXITCODE); Discord will use existing history only" -ForegroundColor Yellow
            return
        }
        Write-Host "  Git: snapshot committed - $msg" -ForegroundColor Green
    }
    finally {
        Pop-Location
    }
}
