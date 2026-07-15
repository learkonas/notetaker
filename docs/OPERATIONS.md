# Operations Runbook

## Cloud deployment (Cloud Run Job + Scheduler)

Set these variables in PowerShell:

```powershell
$PROJECT_ID="your-project"
$REGION="us-central1"
$JOB_NAME="inbox-obsidian-daily"
$IMAGE="gcr.io/$PROJECT_ID/$JOB_NAME:latest"
$SCHEDULER_NAME="inbox-obsidian-daily-scheduler"
```

Build + push image:

```powershell
gcloud builds submit --tag $IMAGE
```

Deploy Cloud Run Job:

```powershell
gcloud run jobs deploy $JOB_NAME `
  --image $IMAGE `
  --region $REGION `
  --set-env-vars GCS_BUCKET=your-bucket,INBOX_API_URL=https://inbox.leonasskau.com,INBOX_MAILBOX=notetaker@leonasskau.com,INBOX_PROCESSED_FOLDER=ai-processed,CF_ACCESS_CLIENT_ID=your-client-id.access,CF_ACCESS_CLIENT_SECRET=your-client-secret,PIPELINE_VERSION=0.1.0,LLM_PROVIDER=mock
```

Run once manually:

```powershell
gcloud run jobs execute $JOB_NAME --region $REGION
```

Create daily scheduler trigger (09:00 UTC):

```powershell
gcloud scheduler jobs create http $SCHEDULER_NAME `
  --location $REGION `
  --schedule "0 9 * * *" `
  --uri "https://$REGION-run.googleapis.com/apis/run.googleapis.com/v1/namespaces/$PROJECT_ID/jobs/$JOB_NAME:run" `
  --http-method POST `
  --oauth-service-account-email "$PROJECT_ID@appspot.gserviceaccount.com"
```

## Local automation (Windows Task Scheduler)

Run local finalize once daily after cloud run.

PowerShell action:

```powershell
cd "C:\dev\obsidian_notetaker"
npm run local:run
```

Recommended:
- Trigger: daily at a fixed time (for example 10:00 local).
- Retry: 1 retry after 15 minutes.
- Run whether user is logged in or not.

## Troubleshooting

- If cloud job fails:
  - Check Cloud Run Job logs.
  - Verify the Cloudflare Access service token (`CF_ACCESS_CLIENT_ID`/`CF_ACCESS_CLIENT_SECRET`) is valid and its Access policy uses action "Service Auth".
  - Verify the `notetaker@leonasskau.com` mailbox exists in the inbox app.
  - Verify GCS bucket IAM permissions.
- If local run writes nothing:
  - Verify `GCS_BUCKET` and ADC credentials (`gcloud auth application-default login`).
  - Verify `OBSIDIAN_VAULT_PATH` points to the right vault.
