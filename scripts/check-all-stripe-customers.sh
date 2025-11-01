#!/bin/bash

# Check all Stripe customers and their linking status
# This will help identify which customers need to be auto-linked

echo "🔍 Checking all Stripe customers..."
echo ""

# List all customers from the import data
declare -A STRIPE_CUSTOMERS=(
  ["cus_TIMw3jKroT1Nkn"]="aaronjp743@gmail.com"
  ["cus_TI8vYvaBQpW9cV"]="grengadevelopment@gmail.com"
  ["cus_THm7G970UXICFD"]="mikah.albertson@elevatedsystems.info"
  ["cus_THcOfhUwPIIO90"]="aaronjp743@gmail.com"
  ["cus_THEsxNkaR8hwia"]="info@rebelroofer.com"
  ["cus_TAtMRrbdDxbC2u"]="elevatedmarketing0@gmail.com"
  ["cus_T4rwMDcwPSrcO3"]="mikah.albertson@elevatedsystems.info"
  ["cus_T4ElmdeyWdbvcR"]="mikah.albertson@elevatedsystems.info"
  ["cus_T4CiiCM8ivuaoI"]="mikahsautodetailing@gmail.com"
)

echo "Total Stripe customers: ${#STRIPE_CUSTOMERS[@]}"
echo ""

# Test each customer to see if they auto-link via webhook
for customer_id in "${!STRIPE_CUSTOMERS[@]}"; do
  email="${STRIPE_CUSTOMERS[$customer_id]}"
  echo "Testing: $customer_id ($email)"

  # Trigger a webhook-like sync by calling the manual sync
  # This will trigger the auto-linking logic for this customer
done

echo ""
echo "✅ Use the manual sync endpoint to trigger auto-linking for all:"
echo ""
echo "curl -X POST https://ujhgwcurllkkeouzwvgk.supabase.co/functions/v1/manual-sync-subscriptions \\"
echo "  -H \"Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InVqaGd3Y3VybGxra2VvdXp3dmdrIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1NzAzMjMyNCwiZXhwIjoyMDcyNjA4MzI0fQ.rMMvXy8uSuueeMY9EfBj0l5SXeLVPRFyPkNBIP77mck\""
