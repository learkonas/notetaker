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
  [string]$OpenAiApiKey = $env:OPENAI_API_KEY,
  [string]$OpenAiModel = $env:OPENAI_MODEL
)

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
if (-not $OpenAiApiKey) { $OpenAiApiKey = $env:OPENAI_API_KEY }
if (-not $OpenAiModel) { $OpenAiModel = $env:OPENAI_MODEL }

if (-not $ProjectId) { throw "GCP_PROJECT_ID is required." }
if (-not $Bucket) { throw "GCS_BUCKET is required." }
if (-not $CfAccessClientId) { throw "CF_ACCESS_CLIENT_ID is required." }
if (-not $CfAccessClientSecret) { throw "CF_ACCESS_CLIENT_SECRET is required." }
if (-not $InboxApiUrl) { $InboxApiUrl = "https://inbox.leonasskau.com" }
if (-not $InboxMailbox) { $InboxMailbox = "notetaker@leonasskau.com" }
if (-not $InboxProcessedFolder) { $InboxProcessedFolder = "ai-processed" }
if (-not $PipelineVersion) { $PipelineVersion = "0.1.0" }
if (-not $MaxEmailsPerRun) { $MaxEmailsPerRun = "25" }
if (-not $LlmProvider) { $LlmProvider = "mock" }
if (-not $OpenAiModel) { $OpenAiModel = "gpt-4.1-mini" }

$Image = "gcr.io/$ProjectId/${JobName}:latest"
$BuildContext = Resolve-Path (Join-Path $PSScriptRoot "..")

Write-Host "Type-checking cloud_job"
Push-Location $BuildContext
npm run typecheck --workspace=@apps/cloud_job
$TypecheckExit = $LASTEXITCODE
Pop-Location
if ($TypecheckExit -ne 0) {
  throw "Type check failed. Fix TypeScript errors before deploying."
}

Write-Host "Validating project access for $ProjectId"
gcloud projects describe $ProjectId --project $ProjectId --format="value(projectId)" | Out-Null
if ($LASTEXITCODE -ne 0) {
  throw "Cannot access project '$ProjectId' with current gcloud account."
}
Write-Host "Building image $Image"
gcloud builds submit $BuildContext --project $ProjectId --tag $Image
if ($LASTEXITCODE -ne 0) {
  throw "Cloud Build failed. Check Dockerfile/build context and retry."
}

Write-Host "Deploying Cloud Run Job $JobName"
$EnvVars = @(
  "GCS_BUCKET=$Bucket",
  "INBOX_API_URL=$InboxApiUrl",
  "INBOX_MAILBOX=$InboxMailbox",
  "INBOX_PROCESSED_FOLDER=$InboxProcessedFolder",
  "CF_ACCESS_CLIENT_ID=$CfAccessClientId",
  "CF_ACCESS_CLIENT_SECRET=$CfAccessClientSecret",
  "PIPELINE_VERSION=$PipelineVersion",
  "MAX_EMAILS_PER_RUN=$MaxEmailsPerRun",
  "LLM_PROVIDER=$LlmProvider",
  "OPENAI_MODEL=$OpenAiModel"
)
if ($OpenAiApiKey) {
  $EnvVars += "OPENAI_API_KEY=$OpenAiApiKey"
}

gcloud run jobs deploy $JobName `
  --project $ProjectId `
  --image $Image `
  --region $Region `
  --set-env-vars ($EnvVars -join ",")
if ($LASTEXITCODE -ne 0) {
  throw "Cloud Run Job deploy failed. Re-authenticate gcloud and retry."
}
