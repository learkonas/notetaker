param(
  [string]$ProjectId = $env:GCP_PROJECT_ID,
  [string]$Region = "us-central1",
  [string]$JobName = "gmail-obsidian-daily",
  [string]$Bucket = $env:GCS_BUCKET,
  [string]$GmailClientId = $env:GMAIL_CLIENT_ID,
  [string]$GmailClientSecret = $env:GMAIL_CLIENT_SECRET,
  [string]$GmailRefreshToken = $env:GMAIL_REFRESH_TOKEN,
  [string]$LlmProvider = $env:LLM_PROVIDER,
  [string]$OpenAiApiKey = $env:OPENAI_API_KEY,
  [string]$OpenAiModel = $env:OPENAI_MODEL
)

if (-not $ProjectId) { throw "GCP_PROJECT_ID is required." }
if (-not $Bucket) { throw "GCS_BUCKET is required." }
if (-not $GmailClientId) { throw "GMAIL_CLIENT_ID is required." }
if (-not $GmailClientSecret) { throw "GMAIL_CLIENT_SECRET is required." }
if (-not $GmailRefreshToken) { throw "GMAIL_REFRESH_TOKEN is required." }
if (-not $LlmProvider) { $LlmProvider = "mock" }
if (-not $OpenAiModel) { $OpenAiModel = "gpt-4.1-mini" }

$Image = "gcr.io/$ProjectId/$JobName:latest"
Write-Host "Building image $Image"
gcloud builds submit --tag $Image

Write-Host "Deploying Cloud Run Job $JobName"
$EnvVars = @(
  "GCS_BUCKET=$Bucket",
  "GMAIL_USER=me",
  "GMAIL_QUERY=in:inbox -label:ai-processed",
  "GMAIL_PROCESSED_LABEL=ai-processed",
  "GMAIL_CLIENT_ID=$GmailClientId",
  "GMAIL_CLIENT_SECRET=$GmailClientSecret",
  "GMAIL_REFRESH_TOKEN=$GmailRefreshToken",
  "PIPELINE_VERSION=0.1.0",
  "LLM_PROVIDER=$LlmProvider",
  "OPENAI_MODEL=$OpenAiModel"
)
if ($OpenAiApiKey) {
  $EnvVars += "OPENAI_API_KEY=$OpenAiApiKey"
}

gcloud run jobs deploy $JobName `
  --image $Image `
  --region $Region `
  --set-env-vars ($EnvVars -join ",")
