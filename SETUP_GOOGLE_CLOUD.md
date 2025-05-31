# Google Cloud Setup for Shopify Webhooks

## Quick Setup Guide

### 1. Install Google Cloud CLI (if not already installed)

**macOS:**
```bash
brew install google-cloud-sdk
```

**Other platforms:** https://cloud.google.com/sdk/docs/install

### 2. Authenticate with Google Cloud
```bash
gcloud auth login
gcloud config set project growtharena
```

### 3. Create Service Account and Download Key

Run this one-liner to set everything up:

```bash
# Create service account
gcloud iam service-accounts create shopify-webhooks \
  --description="Service account for Shopify webhook integration" \
  --display-name="Shopify Webhooks"

# Grant Pub/Sub permissions
gcloud projects add-iam-policy-binding growtharena \
  --member="serviceAccount:shopify-webhooks@growtharena.iam.gserviceaccount.com" \
  --role="roles/pubsub.admin"

# Download credentials to your project directory
gcloud iam service-accounts keys create ./growtharena-service-account.json \
  --iam-account=shopify-webhooks@growtharena.iam.gserviceaccount.com

echo "✅ Service account created and key downloaded!"
```

### 4. Configure Environment Variables

Create/update your `.env.local` file:

```bash
# Add to .env.local
echo "GOOGLE_CLOUD_PROJECT_ID=growtharena" >> .env.local
echo "GOOGLE_APPLICATION_CREDENTIALS=$(pwd)/growtharena-service-account.json" >> .env.local
echo "✅ Environment variables configured!"
```

### 5. Verify Setup

Test that everything works:

```bash
# Start your development server
npm run dev

# In another terminal, test the webhook system
curl -X GET http://localhost:3000/api/webhooks/init
```

You should see:
```json
{
  "environment": {
    "GOOGLE_CLOUD_PROJECT_ID": true,
    "GOOGLE_APPLICATION_CREDENTIALS": true,
    "SHOPIFY_APP_API_KEY": true,
    "SHOPIFY_APP_SECRET": true
  },
  "credentialsFileExists": true
}
```

## File Structure After Setup

```
frontend/
├── .env.local                           # ✅ Environment variables
├── growtharena-service-account.json     # ✅ Google Cloud credentials  
├── .gitignore                           # ✅ Excludes both files above
└── ...
```

## Security Notes

- ✅ **Service account JSON** is excluded from git via `.gitignore`
- ✅ **Environment file** is excluded from git via `.gitignore`  
- ✅ **Minimal permissions** - only Pub/Sub admin access
- ✅ **Local file path** - no credentials in environment variables

## Troubleshooting

**"credentials not found" error:**
```bash
# Check file exists
ls -la growtharena-service-account.json

# Check environment variable
echo $GOOGLE_APPLICATION_CREDENTIALS
```

**"permission denied" error:**
```bash
# Re-run the permission grant
gcloud projects add-iam-policy-binding growtharena \
  --member="serviceAccount:shopify-webhooks@growtharena.iam.gserviceaccount.com" \
  --role="roles/pubsub.admin"
```

**Project doesn't exist:**
```bash
# Create the project first
gcloud projects create growtharena
gcloud config set project growtharena
``` 