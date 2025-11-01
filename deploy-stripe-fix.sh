#!/bin/bash

# Stripe Subscription Fix Deployment Script
# This script deploys the fixed webhook handler and manual sync function

set -e  # Exit on error

echo "🚀 Deploying Stripe Subscription Fix..."
echo ""

# Colors for output
GREEN='\033[0;32m'
BLUE='\033[0;34m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Check if in correct directory
if [ ! -d "supabase/functions" ]; then
    echo -e "${RED}Error: Must run from project root directory${NC}"
    echo "Expected to find: supabase/functions/"
    exit 1
fi

echo -e "${BLUE}Step 1: Deploying updated stripe-webhook function...${NC}"
supabase functions deploy stripe-webhook

if [ $? -eq 0 ]; then
    echo -e "${GREEN}✓ stripe-webhook deployed successfully${NC}"
else
    echo -e "${RED}✗ Failed to deploy stripe-webhook${NC}"
    exit 1
fi

echo ""
echo -e "${BLUE}Step 2: Deploying manual-sync-subscriptions function...${NC}"
supabase functions deploy manual-sync-subscriptions

if [ $? -eq 0 ]; then
    echo -e "${GREEN}✓ manual-sync-subscriptions deployed successfully${NC}"
else
    echo -e "${RED}✗ Failed to deploy manual-sync-subscriptions${NC}"
    exit 1
fi

echo ""
echo -e "${GREEN}✅ All functions deployed successfully!${NC}"
echo ""
echo -e "${YELLOW}Next Steps:${NC}"
echo "1. Run the manual sync to fix existing customers:"
echo ""
echo "   curl -X POST \\"
echo "     https://[your-project].supabase.co/functions/v1/manual-sync-subscriptions \\"
echo "     -H \"Authorization: Bearer [service-role-key]\""
echo ""
echo "2. Verify webhook is configured in Stripe Dashboard:"
echo "   https://dashboard.stripe.com/webhooks"
echo ""
echo "3. Monitor logs:"
echo "   supabase functions logs stripe-webhook --tail"
echo ""
echo "📖 Full documentation: docs/STRIPE_SUBSCRIPTION_FIX.md"
echo "📖 Deployment guide: docs/DEPLOY_STRIPE_FIX.md"
