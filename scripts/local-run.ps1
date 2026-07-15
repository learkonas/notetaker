$RepoRoot = "C:\dev\obsidian_notetaker"
$LogDir = Join-Path $RepoRoot ".local\logs"
$LogFile = Join-Path $LogDir "local-sync.log"

New-Item -ItemType Directory -Path $LogDir -Force | Out-Null
Set-Location $RepoRoot

$startTs = Get-Date -Format "yyyy-MM-dd HH:mm:ss"
Add-Content -Path $LogFile -Value "`n==== local:run started $startTs ====" -Encoding utf8

$output = & npm run local:run 2>&1
$output | ForEach-Object { $_ }
$output | Out-File -FilePath $LogFile -Append -Encoding utf8
$exitCode = $LASTEXITCODE

$endTs = Get-Date -Format "yyyy-MM-dd HH:mm:ss"
Add-Content -Path $LogFile -Value "==== local:run finished $endTs (exit=$exitCode) ====" -Encoding utf8

exit $exitCode
