# N8N Roofing Estimator Setup Guide

## Overview
This script generates professional roofing estimates using OpenAI GPT-4o with property lookup and detailed cost breakdowns.

## Features
✅ Automatic property lookup by address
✅ Roof area calculation from building data
✅ Professional-grade material pricing (2025)
✅ Detailed labor calculations with multipliers
✅ Story, pitch, and complexity adjustments
✅ Complete itemized breakdown
✅ JSON structured output

## N8N Workflow Setup

### 1. Webhook Node (Trigger)
- **Method**: POST
- **Path**: `/webhook/roofing-estimate`
- **Response**: Immediately with 200 OK

### 2. Code Node (Prepare OpenAI Request)
- **Name**: "Prepare Roofing Estimate Request"
- **Language**: JavaScript
- **Code**: Copy contents from `/scripts/n8n-roofing-estimator.js`

### 3. OpenAI Node (Generate Estimate)
- **Model**: gpt-4o
- **Response Format**: JSON Object
- **Temperature**: 0.1
- **Max Tokens**: 4000

### 4. Code Node (Parse Response)
```javascript
const aiResponse = $input.item.json;
const result = JSON.parse(aiResponse.choices[0].message.content);

return {
  json: {
    items: result.items || [],
    propertyData: result.propertyData || {},
    totalEstimate: result.totalEstimate || 0,
    metadata: {
      generatedAt: new Date().toISOString(),
      model: 'gpt-4o',
      laborRate: 85
    }
  }
};
```

### 5. Respond to Webhook Node
- **Response Code**: 200
- **Response Body**: `{{ $json }}`

## Expected Input from Calculator

```json
{
  "address": "123 Main Street, City, State 12345",
  "roofArea": 2500,
  "roofType": "gable",
  "material": "asphalt",
  "pitch": "6:12",
  "stories": "2",
  "layers": 1,
  "skylights": 2,
  "chimneys": 1,
  "valleys": 3,
  "includeVentilation": true,
  "includeIceShield": true,
  "includeWarranty": false
}
```

## Expected Output Format

```json
{
  "items": [
    {
      "label": "Property Roof Area (verified from records)",
      "value": 2500,
      "unit": "sqft",
      "cost": 0
    },
    {
      "label": "Architectural Shingles",
      "value": 25,
      "unit": "squares",
      "cost": 3250
    },
    {
      "label": "Synthetic Underlayment",
      "value": 25,
      "unit": "squares",
      "cost": 650
    },
    {
      "label": "Ice & Water Shield",
      "value": 13,
      "unit": "rolls",
      "cost": 910
    },
    {
      "label": "Ridge Cap Shingles",
      "value": 80,
      "unit": "linear feet",
      "cost": 260
    },
    {
      "label": "Installation Labor",
      "value": 100.6,
      "unit": "hours",
      "cost": 8551
    },
    {
      "label": "Tear-Off Labor (1 layer)",
      "value": 34.5,
      "unit": "hours",
      "cost": 2932.50
    },
    {
      "label": "Disposal",
      "value": 25,
      "unit": "squares",
      "cost": 800
    }
  ],
  "propertyData": {
    "address": "123 Main Street",
    "buildingSquareFootage": 2200,
    "yearBuilt": 1995,
    "stories": 2,
    "roofType": "Gable"
  },
  "totalEstimate": 18500,
  "metadata": {
    "generatedAt": "2025-10-03T23:30:00.000Z",
    "model": "gpt-4o",
    "laborRate": 85
  }
}
```

## Labor Rate Changes

The script now uses a **fixed professional rate of $85/hour**. This was removed from the calculator UI as requested.

To change the labor rate:
1. Edit line 9 in `/scripts/n8n-roofing-estimator.js`
2. Update `const laborRate = 85;` to your desired rate
3. Save and re-deploy to N8N

## Material Costs (2025)

| Material | Cost |
|----------|------|
| Architectural Shingles | $130/square |
| Premium Shingles | $230/square |
| Metal Roofing | $575/square |
| Synthetic Underlayment | $26/square |
| Ice & Water Shield | $70/roll |
| Ridge Cap | $3.25/LF |
| Drip Edge | $2.50/LF |

## Labor Calculations

**Base**: 3.5 hours per square

**Multipliers**:
- Stories: 1-story (1.0×), 2-story (1.25×), 3-story (1.5×)
- Pitch: ≤5/12 (1.0×), 6-7/12 (1.15×), 8-9/12 (1.35×), ≥10/12 (1.6×)
- Complexity: Simple (1.0×), Moderate (1.15×), Complex (1.3×)

**Formula**: Hours = Squares × 3.5 × Story × Pitch × Complexity

## Troubleshooting

### Property Lookup Not Working
- Ensure OpenAI has access to current property data
- Verify address format is complete (street, city, state, zip)
- Check that GPT-4o model is being used (not GPT-3.5)

### Invalid JSON Response
- Increase max_tokens to 4000+
- Verify response_format is set to `json_object`
- Check temperature is set to 0.1 (low randomness)

### Missing Line Items
- Review system prompt completeness
- Ensure all material/labor sections are included
- Verify user prompt specifies all features

## Testing

Test with this sample payload:
```bash
curl -X POST https://your-n8n-instance.com/webhook/roofing-estimate \
  -H "Content-Type: application/json" \
  -d '{
    "address": "1600 Pennsylvania Avenue NW, Washington, DC 20500",
    "roofType": "hip",
    "material": "asphalt",
    "pitch": "6:12",
    "stories": "2",
    "layers": 1,
    "includeVentilation": true,
    "includeIceShield": true
  }'
```

## Support

For issues or questions:
- Check N8N execution logs
- Review OpenAI API responses
- Verify input data format matches expected schema
