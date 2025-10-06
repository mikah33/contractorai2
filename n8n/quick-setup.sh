#!/bin/bash

# Quick Setup Script for n8n Receipt OCR
# This script will help you configure the workflow

echo "🚀 ContractorAI Receipt OCR Setup"
echo "=================================="
echo ""

# Step 1: n8n Workflow Setup
echo "📋 Step 1: Create n8n Workflow"
echo ""
echo "Go to: https://contractorai.app.n8n.cloud/"
echo ""
echo "1. Click 'Add workflow' → 'Blank'"
echo "2. Name: 'Receipt OCR'"
echo ""
read -p "Press Enter when done..."

# Step 2: Webhook Node
echo ""
echo "📡 Step 2: Add Webhook Node"
echo ""
echo "1. Click '+' → Search 'Webhook'"
echo "2. Set Path: receipt-ocr"
echo "3. Click 'Listen for Test Event'"
echo "4. Copy the PRODUCTION URL"
echo ""
read -p "Paste your webhook URL here: " WEBHOOK_URL

# Step 3: HTTP Request Node
echo ""
echo "🤖 Step 3: Add HTTP Request Node"
echo ""
echo "1. Click '+' → Search 'HTTP Request'"
echo "2. Authentication: 'Predefined Credential Type' → 'OpenAi Api'"
echo "3. Click '+' to add credential"
echo "4. Paste your OpenAI API key: sk-proj-l7bbY3wW..."
echo "5. Save credential"
echo "6. Method: POST"
echo "7. URL: https://api.openai.com/v1/chat/completions"
echo "8. Send Body: ✓"
echo "9. Body Content Type: JSON"
echo ""
read -p "Press Enter when done..."

# Save webhook URL to Supabase
echo ""
echo "💾 Setting webhook URL in Supabase..."
supabase secrets set N8N_WEBHOOK_URL="$WEBHOOK_URL" --project-ref ujhgwcurllkkeouzwvgk

# Deploy Edge Function
echo ""
echo "🚀 Deploying Edge Function..."
supabase functions deploy process-receipt --project-ref ujhgwcurllkkeouzwvgk

echo ""
echo "✅ Setup Complete!"
echo ""
echo "Next: Complete the n8n workflow by following the MANUAL-SETUP.md guide"
echo "Then test by uploading a receipt in ContractorAI!"
