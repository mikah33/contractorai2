#!/bin/bash
# Test the n8n webhook directly

echo "Testing n8n webhook..."
curl -X POST https://contractorai.app.n8n.cloud/webhook/2ee2784c-a873-476f-aa5f-90caca848ab8 \
  -H "Content-Type: application/json" \
  -d '{
    "customerName": "Test Customer",
    "customerEmail": "test@example.com",
    "subject": "Test Estimate",
    "body": "This is a test",
    "pdfUrl": "https://example.com/test.pdf",
    "estimateId": "test-123",
    "clientId": null
  }' \
  -v
