#!/bin/bash

# Test script for estimate-response Edge Function
# This script tests various scenarios to ensure proper error handling and logging

set -e

FUNCTION_URL="https://ujhgwcurllkkeouzwvgk.supabase.co/functions/v1/estimate-response"
SUPABASE_URL="https://ujhgwcurllkkeouzwvgk.supabase.co"
SUPABASE_ANON_KEY="${SUPABASE_ANON_KEY}"

echo "================================================"
echo "Testing estimate-response Edge Function"
echo "================================================"
echo ""

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Test 1: Missing estimate_id parameter
echo -e "${YELLOW}Test 1: Missing estimate_id parameter${NC}"
response=$(curl -s -w "\n%{http_code}" "$FUNCTION_URL?action=accept")
http_code=$(echo "$response" | tail -n 1)
if [ "$http_code" == "400" ]; then
  echo -e "${GREEN}✓ PASS: Returns 400 for missing estimate_id${NC}"
else
  echo -e "${RED}✗ FAIL: Expected 400, got $http_code${NC}"
fi
echo ""

# Test 2: Missing action parameter
echo -e "${YELLOW}Test 2: Missing action parameter${NC}"
response=$(curl -s -w "\n%{http_code}" "$FUNCTION_URL?id=test-id")
http_code=$(echo "$response" | tail -n 1)
if [ "$http_code" == "400" ]; then
  echo -e "${GREEN}✓ PASS: Returns 400 for missing action${NC}"
else
  echo -e "${RED}✗ FAIL: Expected 400, got $http_code${NC}"
fi
echo ""

# Test 3: Invalid action parameter
echo -e "${YELLOW}Test 3: Invalid action parameter${NC}"
response=$(curl -s -w "\n%{http_code}" "$FUNCTION_URL?id=test-id&action=invalid")
http_code=$(echo "$response" | tail -n 1)
if [ "$http_code" == "400" ]; then
  echo -e "${GREEN}✓ PASS: Returns 400 for invalid action${NC}"
else
  echo -e "${RED}✗ FAIL: Expected 400, got $http_code${NC}"
fi
echo ""

# Test 4: Non-existent estimate_id
echo -e "${YELLOW}Test 4: Non-existent estimate_id${NC}"
fake_uuid="00000000-0000-0000-0000-000000000000"
response=$(curl -s -w "\n%{http_code}" "$FUNCTION_URL?id=$fake_uuid&action=accept")
http_code=$(echo "$response" | tail -n 1)
if [ "$http_code" == "404" ]; then
  echo -e "${GREEN}✓ PASS: Returns 404 for non-existent estimate${NC}"
else
  echo -e "${RED}✗ FAIL: Expected 404, got $http_code${NC}"
fi
echo ""

# Test 5: Check for proper HTML error responses
echo -e "${YELLOW}Test 5: Verify HTML error responses contain proper structure${NC}"
response=$(curl -s "$FUNCTION_URL?action=accept")
if echo "$response" | grep -q "<!DOCTYPE html>" && echo "$response" | grep -q "Missing estimate ID"; then
  echo -e "${GREEN}✓ PASS: Error response contains proper HTML structure${NC}"
else
  echo -e "${RED}✗ FAIL: Error response missing HTML structure${NC}"
fi
echo ""

# Test 6: CORS preflight request
echo -e "${YELLOW}Test 6: CORS preflight request${NC}"
response=$(curl -s -X OPTIONS -w "\n%{http_code}" "$FUNCTION_URL")
http_code=$(echo "$response" | tail -n 1)
if [ "$http_code" == "200" ]; then
  echo -e "${GREEN}✓ PASS: OPTIONS request returns 200${NC}"
else
  echo -e "${RED}✗ FAIL: Expected 200, got $http_code${NC}"
fi
echo ""

echo "================================================"
echo "Manual Testing Required:"
echo "================================================"
echo ""
echo "To test with a real estimate:"
echo "1. Create an estimate and send it via email"
echo "2. Use the link from the email to test accept/decline"
echo "3. Check Supabase logs for detailed error logging"
echo "4. Verify duplicate response prevention"
echo "5. Confirm contractor notification webhook is called"
echo ""
echo "Example with real estimate_id:"
echo "curl '$FUNCTION_URL?id=YOUR_ESTIMATE_ID&action=accept'"
echo ""
echo "Check logs at:"
echo "https://supabase.com/dashboard/project/ujhgwcurllkkeouzwvgk/functions/estimate-response/logs"
echo ""

# Query to check database for test estimates
echo "================================================"
echo "Database Query Helper"
echo "================================================"
echo ""
echo "To find a test estimate in the database:"
echo ""
echo "SELECT"
echo "  id,"
echo "  estimate_id,"
echo "  customer_email,"
echo "  accepted,"
echo "  declined,"
echo "  responded_at"
echo "FROM estimate_email_responses"
echo "ORDER BY created_at DESC"
echo "LIMIT 5;"
echo ""
