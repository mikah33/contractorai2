# n8n Receipt OCR Setup Guide

## Step 1: Import Workflow into n8n

1. **Open your n8n instance** at: https://contractorai.app.n8n.cloud/
2. Click **"Workflows"** in left sidebar
3. Click **"Add workflow"** → **"Import from File"**
4. Select: `/Users/mikahalbertson/git/ContractorAI/contractorai2/n8n/receipt-ocr-workflow.json`
5. Click **"Import"**

## Step 2: Add OpenAI Credentials

1. In the workflow, click on the **"OpenAI Vision"** node
2. Click **"Create New Credential"**
3. Enter your **OpenAI API Key**: `sk-proj-...` (from https://platform.openai.com/api-keys)
4. Click **"Save"**

## Step 3: Activate Webhook

1. Click on the **"Webhook"** node
2. Copy the **Production URL** (looks like: `https://contractorai.app.n8n.cloud/webhook/receipt-ocr`)
3. Click **"Activate"** button (top right) to turn on the workflow

## Step 4: Update Supabase Edge Function

The Edge Function has been updated to call your n8n webhook instead of Mindee.

**Deploy it:**
```bash
supabase functions deploy process-receipt --project-ref ujhgwcurllkkeouzwvgk
```

## Step 5: Set n8n Webhook URL

```bash
supabase secrets set N8N_WEBHOOK_URL=YOUR_N8N_WEBHOOK_URL --project-ref ujhgwcurllkkeouzwvgk
```

Replace `YOUR_N8N_WEBHOOK_URL` with the URL from Step 3.

## Step 6: Test!

Upload a receipt in ContractorAI and watch it auto-fill!

---

## Workflow Details

**What it does:**
1. Receives image URL from your app
2. Sends image to OpenAI Vision (GPT-4o-mini)
3. Extracts: vendor, amount, date, receipt#, tax, line items
4. Returns JSON in same format as Mindee

**Cost per receipt:** ~$0.0002 (2 cents per 100 receipts)

**Speed:** ~2-3 seconds per receipt

---

## Troubleshooting

**"Unauthorized" error:**
- Check OpenAI API key is valid
- Verify you have credits in OpenAI account

**"Webhook not found":**
- Make sure workflow is **Activated** (toggle in top right)
- Check webhook URL is correct in Supabase secrets

**Empty results:**
- Check n8n execution logs for errors
- Verify image URL is publicly accessible

---

## Advanced: Improve Accuracy

To improve extraction accuracy, edit the OpenAI Vision prompt:

1. Click **"OpenAI Vision"** node
2. Modify the prompt to include:
   - Specific vendor names you use often
   - Regional date formats
   - Common contractor material terms

Example:
```
For Home Depot receipts, the total is usually at the bottom after "TOTAL"
For Lowe's, look for "BALANCE DUE"
Date format is MM/DD/YYYY
```
