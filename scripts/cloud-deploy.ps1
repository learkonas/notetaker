param(
  [string]$ProjectId = $env:GCP_PROJECT_ID,
  [string]$Region = "us-central1",
  [string]$JobName = "inbox-obsidian-daily",
  [string]$Bucket = $env:GCS_BUCKET,
  [string]$InboxApiUrl = $env:INBOX_API_URL,
  [string]$InboxMailbox = $env:INBOX_MAILBOX,
  [string]$InboxProcessedFolder = $env:INBOX_PROCESSED_FOLDER,
  [string]$CfAccessClientId = $env:CF_ACCESS_CLIENT_ID,
  [string]$CfAccessClientSecret = $env:CF_ACCESS_CLIENT_SECRET,
  [string]$PipelineVersion = $env:PIPELINE_VERSION,
  [string]$MaxEmailsPerRun = $env:MAX_EMAILS_PER_RUN,
  [string]$LlmProvider = $env:LLM_PROVIDER,
  [string]$ClaudeApiKey = $env:CLAUDE_API_KEY,
  [string]$ClaudeModel = $env:CLAUDE_MODEL,
  [string]$NotifyEmail = $env:NOTIFY_EMAIL,
  [string]$VaultPath = "C:\dev\obsidian_vault"
)

$ErrorActionPreference = "Stop"

# Load app env file if values are missing in shell environment.
$EnvFilePath = Join-Path $PSScriptRoot "..\apps\cloud_job\.env"
if (Test-Path $EnvFilePath) {
  Get-Content $EnvFilePath | ForEach-Object {
    if ($_ -match '^\s*#' -or $_ -match '^\s*$') { return }
    $parts = $_ -split "=", 2
    if ($parts.Count -ne 2) { return }
    $key = $parts[0].Trim()
    $value = $parts[1].Trim()
    if (-not (Get-Item "Env:$key" -ErrorAction SilentlyContinue)) {
      Set-Item -Path "Env:$key" -Value $value
    }
  }
}

# Rebind from env if not provided explicitly.
if (-not $ProjectId) { $ProjectId = $env:GCP_PROJECT_ID }
if (-not $Bucket) { $Bucket = $env:GCS_BUCKET }
if (-not $InboxApiUrl) { $InboxApiUrl = $env:INBOX_API_URL }
if (-not $InboxMailbox) { $InboxMailbox = $env:INBOX_MAILBOX }
if (-not $InboxProcessedFolder) { $InboxProcessedFolder = $env:INBOX_PROCESSED_FOLDER }
if (-not $CfAccessClientId) { $CfAccessClientId = $env:CF_ACCESS_CLIENT_ID }
if (-not $CfAccessClientSecret) { $CfAccessClientSecret = $env:CF_ACCESS_CLIENT_SECRET }
if (-not $PipelineVersion) { $PipelineVersion = $env:PIPELINE_VERSION }
if (-not $MaxEmailsPerRun) { $MaxEmailsPerRun = $env:MAX_EMAILS_PER_RUN }
if (-not $LlmProvider) { $LlmProvider = $env:LLM_PROVIDER }
if (-not $ClaudeApiKey) { $ClaudeApiKey = $env:CLAUDE_API_KEY }
if (-not $ClaudeModel) { $ClaudeModel = $env:CLAUDE_MODEL }
if (-not $NotifyEmail) { $NotifyEmail = $env:NOTIFY_EMAIL }

if (-not $ProjectId) { throw "GCP_PROJECT_ID is required." }
if (-not $Bucket) { throw "GCS_BUCKET is required." }
if (-not $CfAccessClientId) { throw "CF_ACCESS_CLIENT_ID is required." }
if (-not $CfAccessClientSecret) { throw "CF_ACCESS_CLIENT_SECRET is required." }
if (-not $InboxApiUrl) { $InboxApiUrl = "https://inbox.leonasskau.com" }
if (-not $InboxMailbox) { $InboxMailbox = "notetaker@leonasskau.com" }
if (-not $InboxProcessedFolder) { $InboxProcessedFolder = "ai-processed" }
if (-not $PipelineVersion) { $PipelineVersion = "0.1.0" }
if (-not $MaxEmailsPerRun) { $MaxEmailsPerRun = "25" }
if (-not $LlmProvider) { $LlmProvider = "anthropic" }
if (-not $ClaudeModel) { $ClaudeModel = "claude-opus-4-8" }
if (-not $NotifyEmail) { $NotifyEmail = "leo.nasskau@gmail.com" }
if ($LlmProvider -eq "anthropic" -and -not $ClaudeApiKey) { throw "CLAUDE_API_KEY is required when LLM_PROVIDER=anthropic." }

$Image = "gcr.io/$ProjectId/${JobName}:latest"
$BuildContext = Resolve-Path (Join-Path $PSScriptRoot "..")

# Refresh the tag taxonomy prompt from the vault so the deployed job always
# carries the latest tagging guidelines.
$TaxonomySource = Join-Path $VaultPath "Tag Taxonomy.md"
if (Test-Path $TaxonomySource) {
  Copy-Item $TaxonomySource (Join-Path $BuildContext "shared\prompts\tag_taxonomy.md") -Force
  Write-Host "Refreshed shared/prompts/tag_taxonomy.md from vault"
} else {
  Write-Host "Vault taxonomy not found at $TaxonomySource; using committed snapshot"
}

Write-Host "Type-checking cloud_job"
Push-Location $BuildContext
npm run typecheck --workspace=@apps/cloud_job
$TypecheckExit = $LASTEXITCODE
Pop-Location
if ($TypecheckExit -ne 0) {
  throw "Type check failed. Fix TypeScript errors before deploying."
}

Write-Host "Validating project access for $ProjectId"
gcloud.cmd projects describe $ProjectId --project $ProjectId --format="value(projectId)" | Out-Null
if ($LASTEXITCODE -ne 0) {
  throw "Cannot access project '$ProjectId' with current gcloud account."
}
Write-Host "Building image $Image"
gcloud.cmd builds submit $BuildContext --project $ProjectId --tag $Image
if ($LASTEXITCODE -ne 0) {
  throw "Cloud Build failed. Check Dockerfile/build context and retry."
}

Write-Host "Deploying Cloud Run Job $JobName"
$EnvEntries = @{
  GCS_BUCKET              = $Bucket
  INBOX_API_URL           = $InboxApiUrl
  INBOX_MAILBOX           = $InboxMailbox
  INBOX_PROCESSED_FOLDER  = $InboxProcessedFolder
  CF_ACCESS_CLIENT_ID     = $CfAccessClientId
  CF_ACCESS_CLIENT_SECRET = $CfAccessClientSecret
  PIPELINE_VERSION        = $PipelineVersion
  MAX_EMAILS_PER_RUN      = $MaxEmailsPerRun
  LLM_PROVIDER            = $LlmProvider
  CLAUDE_MODEL            = $ClaudeModel
  NOTIFY_EMAIL            = $NotifyEmail
}
if ($ClaudeApiKey) {
  $EnvEntries["CLAUDE_API_KEY"] = $ClaudeApiKey
}

function Test-GcloudRunJobsSupport {
  $help = & gcloud run jobs --help 2>&1 | Out-String
  return $LASTEXITCODE -eq 0 -and $help -notmatch "Invalid choice"
}

function Deploy-CloudRunJobViaRest {
  param(
    [string]$ProjectId,
    [string]$Region,
    [string]$JobName,
    [string]$Image,
    [hashtable]$EnvEntries
  )

  $token = (& gcloud.cmd auth print-access-token --project $ProjectId).Trim()
  if (-not $token) { throw "Failed to get gcloud access token." }

  $headers = @{
    Authorization  = "Bearer $token"
    "Content-Type" = "application/json"
  }
  $jobUrl = "https://run.googleapis.com/v2/projects/$ProjectId/locations/$Region/jobs/$JobName"
  $envArray = @(
    foreach ($key in ($EnvEntries.Keys | Sort-Object)) {
      @{ name = [string]$key; value = [string]$EnvEntries[$key] }
    }
  )

  $existing = $null
  try {
    $existing = Invoke-RestMethod -Method Get -Uri $jobUrl -Headers $headers
  } catch {
    $status = $_.Exception.Response.StatusCode.value__
    if ($status -ne 404) { throw }
  }

  $executionTemplate = @{
    maxRetries = 0
    timeout    = "600s"
    containers = @(
      @{
        image     = $Image
        env       = $envArray
        resources = @{
          limits = @{
            cpu    = "1000m"
            memory = "512Mi"
          }
        }
      }
    )
  }
  if ($existing -and $existing.template.template.serviceAccount) {
    $executionTemplate.serviceAccount = $existing.template.template.serviceAccount
  }
  if ($existing -and $existing.template.template.executionEnvironment) {
    $executionTemplate.executionEnvironment = $existing.template.template.executionEnvironment
  }

  try {
    if ($existing) {
      Write-Host "Updating existing job via Cloud Run Admin API (gcloud run jobs unsupported on this SDK)"
      # Patch the Job resource directly (no updateMask query — Run rejects it on this endpoint).
      $bodyObj = @{
        template = @{
          taskCount = 1
          template  = $executionTemplate
        }
      }
      $body = $bodyObj | ConvertTo-Json -Depth 20 -Compress
      $op = Invoke-RestMethod -Method Patch -Uri $jobUrl -Headers $headers -Body $body
    } else {
      Write-Host "Creating job via Cloud Run Admin API (gcloud run jobs unsupported on this SDK)"
      $bodyObj = @{
        launchStage = "GA"
        template    = @{
          taskCount = 1
          template  = $executionTemplate
        }
      }
      $body = $bodyObj | ConvertTo-Json -Depth 20 -Compress
      # Build query with -f so PowerShell 7 ternary '?' cannot swallow the param.
      $createUrl = "https://run.googleapis.com/v2/projects/{0}/locations/{1}/jobs?jobId={2}" -f $ProjectId, $Region, $JobName
      $op = Invoke-RestMethod -Method Post -Uri $createUrl -Headers $headers -Body $body
    }
  } catch {
    $detail = $_.ErrorDetails.Message
    if (-not $detail) { $detail = $_.Exception.Message }
    throw "Cloud Run Admin API request failed: $detail"
  }

  # Wait briefly for the long-running operation when present.
  if ($op.name -and ($null -eq $op.done -or -not $op.done)) {
    $deadline = (Get-Date).AddMinutes(3)
    do {
      Start-Sleep -Seconds 2
      $op = Invoke-RestMethod -Method Get -Uri ("https://run.googleapis.com/v2/{0}" -f $op.name) -Headers $headers
    } while (-not $op.done -and (Get-Date) -lt $deadline)
    if (-not $op.done) { throw "Timed out waiting for Cloud Run job operation $($op.name)" }
    if ($op.error) { throw "Cloud Run job operation failed: $($op.error | ConvertTo-Json -Compress)" }
  }
}

if (Test-GcloudRunJobsSupport) {
  $EnvVars = @($EnvEntries.GetEnumerator() | ForEach-Object { "$($_.Key)=$($_.Value)" })
  gcloud.cmd run jobs deploy $JobName `
    --project $ProjectId `
    --image $Image `
    --region $Region `
    --set-env-vars ($EnvVars -join ",")
  if ($LASTEXITCODE -ne 0) {
    throw "Cloud Run Job deploy failed. Re-authenticate gcloud and retry."
  }
} else {
  Write-Host "Current gcloud SDK lacks 'run jobs'; using REST API fallback"
  Deploy-CloudRunJobViaRest -ProjectId $ProjectId -Region $Region -JobName $JobName -Image $Image -EnvEntries $EnvEntries
}

Write-Host "Deploy complete: $JobName -> $Image"
