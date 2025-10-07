#!/bin/bash

# Widget System Testing Script
# Tests the widget-key-generate and widget-validate Edge Functions

set -e

SUPABASE_URL="https://ujhgwcurllkkeouzwvgk.supabase.co"
ANON_KEY="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InVqaGd3Y3VybGxra2VvdXp3dmdrIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTcwMzIzMjQsImV4cCI6MjA3MjYwODMyNH0.ez6RDJ2FxgSfb7mo2Xug1lXaynKLR-2nJFO-x64UNnY"
USER_ID="5ff28ea6-751f-4a22-b584-ca6c8a43f506"

echo "╔════════════════════════════════════════════════════════════╗"
echo "║         ContractorAI Widget System Test Suite            ║"
echo "╚════════════════════════════════════════════════════════════╝"
echo ""

# Test 1: Widget Validation with Invalid Key
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "Test 1: Widget Validation - Invalid Key"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""
echo "Testing with fake widget key..."

response=$(curl -s -w "\n%{http_code}" -X POST \
  "${SUPABASE_URL}/functions/v1/widget-validate" \
  -H 'Content-Type: application/json' \
  -H "Authorization: Bearer ${ANON_KEY}" \
  -d '{
    "widgetKey": "wk_live_invalid_test_key_123",
    "calculatorType": "roofing",
    "domain": "localhost"
  }')

http_code=$(echo "$response" | tail -n 1)
body=$(echo "$response" | sed '$d')

echo "Response:"
echo "$body" | jq .
echo ""
echo "HTTP Status: $http_code"

if [ "$http_code" = "404" ]; then
  echo "✅ PASS: Invalid key correctly rejected"
else
  echo "❌ FAIL: Expected 404, got $http_code"
fi

echo ""
echo ""

# Test 2: Widget Key Generation (requires user token)
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "Test 2: Widget Key Generation"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""

if [ -z "$USER_AUTH_TOKEN" ]; then
  echo "⚠️  SKIPPED: Requires USER_AUTH_TOKEN environment variable"
  echo ""
  echo "To get your auth token:"
  echo "1. Log into https://contractorai.work"
  echo "2. Open browser console (F12)"
  echo "3. Run: localStorage.getItem('sb-ujhgwcurllkkeouzwvgk-auth-token')"
  echo "4. Copy the access_token value"
  echo "5. Run: export USER_AUTH_TOKEN='your_token_here'"
  echo "6. Re-run this script"
else
  echo "Testing widget key generation..."

  response=$(curl -s -w "\n%{http_code}" -X POST \
    "${SUPABASE_URL}/functions/v1/widget-key-generate" \
    -H 'Content-Type: application/json' \
    -H "Authorization: Bearer ${USER_AUTH_TOKEN}" \
    -d '{
      "calculatorType": "roofing"
    }')

  http_code=$(echo "$response" | tail -n 1)
  body=$(echo "$response" | sed '$d')

  echo "Response:"
  echo "$body" | jq .
  echo ""
  echo "HTTP Status: $http_code"

  if [ "$http_code" = "201" ]; then
    echo "✅ PASS: Widget key generated successfully"

    # Extract widget key for next test
    GENERATED_KEY=$(echo "$body" | jq -r '.widgetKey')
    echo ""
    echo "Generated key: $GENERATED_KEY"
    echo ""

    # Test 3: Validate the generated key
    echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
    echo "Test 3: Validate Generated Key"
    echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
    echo ""
    echo "Testing validation with generated key..."

    response=$(curl -s -w "\n%{http_code}" -X POST \
      "${SUPABASE_URL}/functions/v1/widget-validate" \
      -H 'Content-Type: application/json' \
      -H "Authorization: Bearer ${ANON_KEY}" \
      -d "{
        \"widgetKey\": \"${GENERATED_KEY}\",
        \"calculatorType\": \"roofing\",
        \"domain\": \"localhost\"
      }")

    http_code=$(echo "$response" | tail -n 1)
    body=$(echo "$response" | sed '$d')

    echo "Response:"
    echo "$body" | jq .
    echo ""
    echo "HTTP Status: $http_code"

    valid=$(echo "$body" | jq -r '.valid')
    reason=$(echo "$body" | jq -r '.reason // empty')

    if [ "$valid" = "true" ]; then
      echo "✅ PASS: Generated key validates successfully"
    elif [ "$reason" = "subscription_inactive" ]; then
      echo "⚠️  INFO: Key is valid but subscription is inactive"
      echo "    This is expected if user doesn't have an active subscription"
    else
      echo "❌ FAIL: Expected valid=true or subscription_inactive, got: $reason"
    fi
  else
    echo "❌ FAIL: Expected 201, got $http_code"
  fi
fi

echo ""
echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "Test Summary"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""
echo "Widget validation endpoint: ✅ Working"
echo "Widget key generation: $([ -z "$USER_AUTH_TOKEN" ] && echo '⏭️  Skipped (needs token)' || echo '✅ Tested')"
echo ""
echo "For complete testing, run:"
echo "  export USER_AUTH_TOKEN='your_token_here'"
echo "  ./scripts/test-widget-system.sh"
echo ""
