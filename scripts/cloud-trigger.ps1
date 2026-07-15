param(
  [string]$JobName = "inbox-obsidian-daily",
  [string]$Region = "us-central1"
)

Write-Host "Triggering Cloud Run Job $JobName in $Region"
gcloud run jobs execute $JobName --region $Region
