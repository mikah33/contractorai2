/**
 * N8N OpenAI Roofing Estimator Script
 *
 * Purpose: Generate detailed roofing estimates with property lookup and cost breakdown
 * Input: Data from RoofingCalculator component
 * Output: Structured JSON for OpenAI API
 */

const data = $input.item.json.body || {};

// Default labor rate (no longer from UI, using professional standard)
const laborRate = 85; // Professional roofing labor rate per hour

// ============================================================================
// SYSTEM PROMPT - Professional Roofing Estimator Instructions
// ============================================================================

const systemPrompt = `You are a professional roofing estimator with 20+ years of experience and access to property databases.

CRITICAL WORKFLOW:
1. If address provided but NO roof area: LOOK UP the property data (building sqft, year built, stories, roof type, pitch)
2. Calculate actual roof area using: Building Footprint × Pitch Factor × Waste Factor
3. Generate itemized cost breakdown with materials and labor
4. Return ONLY JSON format (no explanations, no totals)

ROOF AREA CALCULATION (USE EXACT FORMULA):
Step 1: Get building footprint from property records (this is the ground floor area)
Step 2: Apply pitch factor based on roof slope
Step 3: Apply waste/complexity factor based on roof type

Pitch Factors (CRITICAL - affects slope length):
- 3/12 (14°): 1.031
- 4/12 (18.4°): 1.054
- 5/12 (22.6°): 1.083
- 6/12 (26.6°): 1.118
- 7/12 (30.3°): 1.158
- 8/12 (33.7°): 1.202
- 9/12 (36.9°): 1.250
- 10/12 (39.8°): 1.302
- 11/12 (42.5°): 1.357
- 12/12 (45°): 1.414

Waste/Complexity Factors:
- Simple Gable (no valleys, basic): 1.10
- Hip Roof (moderate complexity): 1.15
- Complex (multiple planes, dormers, valleys): 1.20

FORMULA: Roof Area = Building Footprint × Pitch Factor × Waste Factor

ACCURACY TIPS:
- For 2-story homes, use FIRST FLOOR footprint only (not total living space)
- For ranch/1-story, building footprint ≈ total living space
- Account for overhangs: add 2 feet to each dimension
- Verify pitch from property data or satellite imagery angle

MATERIAL COSTS (2025 Professional Grade):
- Architectural Shingles: $130/square (100 sqft)
- Premium Shingles (30-year): $230/square
- Metal Roofing (Standing Seam): $575/square
- Synthetic Underlayment: $26/square
- Ice & Water Shield: $70/roll (covers 200 sqft)
- Ridge Cap Shingles: $3.25/linear foot
- Drip Edge (Aluminum): $2.50/linear foot
- Starter Strips: $37/bundle (covers 90 LF)
- Pipe Boots: $12 each
- Nails & Fasteners: $32/square
- Ventilation System (complete): $625
- Extended Warranty: $27/square

LABOR CALCULATIONS:
Base Installation: 3.5 hours per square

Story Multipliers:
- 1-story: 1.0×
- 2-story: 1.25×
- 3-story: 1.5×

Pitch Multipliers:
- 5/12 or less: 1.0×
- 6-7/12: 1.15×
- 8-9/12: 1.35×
- 10/12 or more: 1.6×

Complexity Multipliers:
- Simple (basic gable): 1.0×
- Moderate (hip, some valleys): 1.15×
- Complex (multiple planes, many features): 1.3×

Total Labor Hours = Squares × 3.5 × Story Multiplier × Pitch Multiplier × Complexity Multiplier
Labor Cost = Total Hours × $${laborRate}/hour

ADDITIONAL LABOR:
- Tear-Off: 1.2 hours per square per layer × multipliers × $${laborRate}/hr
- Chimney Flashing: 3 hours × $${laborRate}/hr = $${laborRate * 3} per chimney
- Skylight Flashing: 2 hours × $${laborRate}/hr = $${laborRate * 2} per skylight
- Valley Installation: Included in base labor (additional material only)

DISPOSAL:
- $32 per square for tear-off debris removal

OUTPUT FORMAT:
{
  "items": [
    {"label": "Property Roof Area (verified)", "value": 2500, "unit": "sqft", "cost": 0},
    {"label": "Architectural Shingles", "value": 25, "unit": "squares", "cost": 3250},
    {"label": "Installation Labor", "value": 87.5, "unit": "hours", "cost": 7437.50}
  ],
  "propertyData": {
    "address": "123 Main St",
    "buildingSquareFootage": 2200,
    "yearBuilt": 1995,
    "stories": 2,
    "roofType": "Hip"
  },
  "totalEstimate": 15500
}

REQUIREMENTS:
- All costs must be finite numbers (no null, no undefined)
- First item MUST show verified roof area from property lookup
- Include ALL materials as separate line items
- Include ALL labor as separate line items with hours
- Show total estimate at bottom
- Use EXACTLY $${laborRate}/hour for all labor calculations
- Be thorough - include underlayment, flashing, ventilation, disposal
`;

// ============================================================================
// USER PROMPT - Specific Project Details
// ============================================================================

// Extract data from calculator
const address = data.address || '';
const roofArea = data.roofArea ? Number(data.roofArea) : null;
const material = data.material || 'asphalt';
const pitch = data.pitch || '6:12';
const stories = data.stories || '1';
const roofType = data.roofType || 'gable';
const layers = Number(data.layers) || 1;
const skylights = Number(data.skylights) || 0;
const chimneys = Number(data.chimneys) || 0;
const valleys = Number(data.valleys) || 0;
const includeVentilation = data.includeVentilation !== false;
const includeIceShield = data.includeIceShield !== false;
const includeWarranty = data.includeWarranty === true;

// Determine material name
const materialNames = {
  'asphalt': 'Architectural Shingles',
  'metal': 'Metal Roofing (Standing Seam)',
  'tile': 'Clay/Concrete Tile',
  'slate': 'Natural Slate',
  'tpo': 'TPO Membrane',
  'epdm': 'EPDM Rubber',
  'wood': 'Cedar Wood Shakes'
};

const materialName = materialNames[material] || 'Architectural Shingles';

// Determine complexity
let complexity = 'moderate';
if (roofType === 'flat') complexity = 'simple';
if (roofType === 'gable' && valleys === 0) complexity = 'simple';
if (roofType === 'mansard' || roofType === 'gambrel' || valleys > 4) complexity = 'complex';

// Build user prompt
const userPrompt = `Generate a detailed roofing estimate for the following project:

PROPERTY INFORMATION:
Address: ${address}
${roofArea ? `Roof Area: ${roofArea} sqft (USE THIS EXACT VALUE - user provided)` : 'Roof Area: NOT PROVIDED - LOOKUP REQUIRED'}

SPECIFICATIONS:
Material: ${materialName}
Roof Type: ${roofType}
Roof Pitch: ${pitch}
Number of Stories: ${stories}
Complexity: ${complexity}
Layers to Remove: ${layers}

FEATURES:
Skylights: ${skylights}
Chimneys: ${chimneys}
Valleys: ${valleys > 0 ? valleys : 'estimate based on roof type'}

OPTIONS:
Ventilation System: ${includeVentilation ? 'Yes - Include complete ridge & soffit ventilation' : 'No'}
Ice & Water Shield: ${includeIceShield ? 'Yes - Install at eaves, valleys, and penetrations' : 'No'}
Extended Warranty: ${includeWarranty ? 'Yes - Include manufacturer extended warranty' : 'No'}

LABOR RATE: $${laborRate}/hour (USE EXACTLY)

INSTRUCTIONS:
${!roofArea ?
  `1. FIRST: Look up the property at "${address}" to find:
   - TOTAL living square footage (e.g., 2400 sqft)
   - Number of stories (e.g., 2-story)
   - Calculate building FOOTPRINT = Total sqft ÷ Stories
   - Year built
   - Actual roof type from satellite/records
   - Estimate roof pitch from aerial view angle

2. Calculate ROOF AREA step by step:
   Example for 2400 sqft 2-story home:
   - Footprint = 2400 ÷ 2 = 1200 sqft
   - Add overhangs: 1200 + (2ft × 4 sides × avg width) ≈ 1200 × 1.05 = 1260 sqft
   - Apply pitch (6/12): 1260 × 1.118 = 1409 sqft
   - Apply waste (hip roof): 1409 × 1.15 = 1620 sqft

3. Show verified roof area as FIRST line item with cost: 0
4. Include calculation breakdown in propertyData`
  :
  `1. Use the provided roof area: ${roofArea} sqft EXACTLY
2. Show this as first line item: "Roof Area (user provided)"
3. Skip property lookup - user has measured`
}

4. Calculate ALL materials needed (shingles, underlayment, ridge cap, drip edge, etc.)
5. Calculate ALL labor hours and costs using $${laborRate}/hr
6. Include tear-off labor for ${layers} layer(s)
7. Include chimney flashing labor for ${chimneys} chimney(s) if applicable
8. Include skylight flashing labor for ${skylights} skylight(s) if applicable
9. Include disposal costs
10. Return ONLY valid JSON - no explanations

CRITICAL: Every line item must have finite numbers. Calculate total estimate and include at bottom.

Format: {"items": [...], "propertyData": {...}, "totalEstimate": number}`;

// ============================================================================
// RETURN OPENAI API PAYLOAD
// ============================================================================

return {
  json: {
    model: 'gpt-4o',
    response_format: { type: 'json_object' },
    temperature: 0.1,
    max_tokens: 4000,
    messages: [
      {
        role: 'system',
        content: systemPrompt
      },
      {
        role: 'user',
        content: userPrompt
      }
    ]
  }
};
