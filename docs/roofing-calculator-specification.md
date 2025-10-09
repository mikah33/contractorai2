# Roofing Estimate Calculator - Comprehensive Specification

## Executive Summary

This specification outlines the requirements for implementing a professional roofing estimate calculator within the ContractorAI platform. The calculator will integrate AI-powered features via OpenAI API to automatically analyze property addresses, detect roof characteristics from satellite imagery, and generate accurate material and labor estimates.

---

## 1. Codebase Architecture Analysis

### Current Calculator Architecture
The existing calculator system follows a consistent pattern across 20+ trades:

**File Structure:**
- **Location**: `/src/components/pricing/[Trade]Calculator.tsx`
- **Parent Component**: `/src/pages/PricingCalculator.tsx`
- **Type Definitions**: `/src/types/index.ts`
- **Trade Registry**: `/src/data/trades.tsx`

**Key Components:**
1. **TradeSelector** - Grid-based trade selection interface
2. **Specialized Calculators** - Individual calculator components per trade
3. **CalculatorResults** - Standardized results display component
4. **ProjectSpecifications** - Generic form builder for trade fields

**Common Calculator Pattern:**
```typescript
interface CalculatorProps {
  onCalculate: (results: CalculationResult[]) => void;
}

interface CalculationResult {
  label: string;
  value: number;
  unit: string;
  cost?: number;
  isTotal?: boolean;
}
```

**State Management:**
- React hooks (useState) for local calculator state
- Zustand stores for global state (estimates, projects, clients)
- Supabase for data persistence

---

## 2. Roofing Industry Requirements Research

### Professional Roofing Metrics

#### A. Basic Measurements
1. **Roof Area/Square Footage**
   - Primary metric for material calculation
   - Measured in "squares" (100 sq ft = 1 square)
   - Needs waste factor calculation (typically 10-15%)

2. **Roof Pitch/Slope**
   - Critical for labor calculation and material requirements
   - Expressed as ratio (e.g., 4/12, 6/12, 12/12)
   - Affects accessibility and installation difficulty
   - Common pitches:
     - Flat/Low: 0/12 to 3/12
     - Medium: 4/12 to 6/12
     - Steep: 7/12 to 12/12
     - Very Steep: >12/12

3. **Roof Type/Geometry**
   - **Gable**: Two-sided roof with triangular ends
   - **Hip**: Four-sided roof sloping on all sides
   - **Flat**: Nearly horizontal (slight slope for drainage)
   - **Mansard**: Four-sided gambrel-style roof
   - **Gambrel**: Two-sided barn-style with double slope
   - **Shed**: Single-sloped roof
   - **Complex**: Multiple roof types combined

4. **Number of Stories**
   - Affects labor cost (scaffolding, safety)
   - Single story: Standard labor rates
   - Two story: +20-30% labor
   - Three+ story: +40-60% labor

#### B. Property Characteristics
1. **Address** (for AI analysis)
   - Street address for satellite imagery
   - Location affects material costs (regional pricing)
   - Climate zone impacts material selection

2. **Building Dimensions**
   - Can be calculated from address via AI
   - Manual override option
   - Length and width of building footprint

3. **Roof Complexity Factors**
   - Number of valleys
   - Number of chimneys
   - Number of skylights
   - Number of dormers
   - Number of vents/penetrations
   - Number of layers to remove (tear-off)

#### C. Material Specifications
1. **Roofing Material Types**
   - **Asphalt Shingles** (most common)
     - 3-tab: Economy option
     - Architectural/Dimensional: Standard
     - Premium/Designer: High-end
   - **Metal Roofing**
     - Standing seam
     - Metal shingles
     - Corrugated panels
   - **Tile**
     - Clay tile
     - Concrete tile
   - **Slate**: Premium natural stone
   - **Wood Shakes/Shingles**: Cedar/redwood
   - **TPO/EPDM**: Flat roof membranes
   - **Built-up/Modified Bitumen**: Commercial flat roofs

2. **Underlayment**
   - Felt paper (15lb or 30lb)
   - Synthetic underlayment
   - Ice and water shield (for valleys, eaves)

3. **Flashing**
   - Drip edge
   - Valley flashing
   - Step flashing
   - Chimney flashing
   - Vent pipe boots

4. **Ventilation**
   - Ridge vents
   - Soffit vents
   - Gable vents
   - Roof vents/turbines
   - Attic fans

5. **Accessories**
   - Starter shingles
   - Hip and ridge cap shingles
   - Roofing nails/fasteners
   - Roof cement/caulk

#### D. Labor Components
1. **Tear-off/Removal**
   - Number of layers to remove
   - Disposal costs (dumpster rental)
   - Labor hours based on area and complexity

2. **Installation**
   - Material-specific labor rates
   - Pitch multiplier
   - Complexity multiplier
   - Story multiplier

3. **Specialty Work**
   - Flashing installation
   - Valley work
   - Chimney work
   - Skylight integration
   - Dormer work

#### E. Additional Considerations
1. **Existing Roof Condition**
   - Good: Minor repairs
   - Fair: Moderate repairs
   - Poor: Extensive repairs/replacement
   - Affects substrate work needed

2. **Decking/Sheathing**
   - Percentage needing replacement
   - OSB vs. plywood
   - Thickness (1/2", 5/8", 3/4")

3. **Permits and Inspections**
   - Permit fees (vary by location)
   - Inspection costs

4. **Warranty**
   - Material warranty (manufacturer)
   - Workmanship warranty (contractor)
   - Extended warranty options

---

## 3. AI Integration Strategy

### OpenAI API Features

#### A. GPT-4 Vision API Integration
**Purpose**: Analyze satellite/aerial imagery to extract roof characteristics

**Implementation Approach:**
```typescript
// API Endpoint: POST https://api.openai.com/v1/chat/completions
// Model: gpt-4-vision-preview or gpt-4o

interface RoofAnalysisRequest {
  address: string;
  imageUrl?: string; // Optional: pre-fetched satellite image
}

interface RoofAnalysisResponse {
  roofType: string;
  estimatedArea: number;
  estimatedPitch: string;
  complexity: 'simple' | 'moderate' | 'complex';
  features: {
    valleys: number;
    chimneys: number;
    skylights: number;
    dormers: number;
  };
  confidence: number; // 0-1 score
}
```

**Vision Analysis Prompt Template:**
```
Analyze this aerial/satellite image of a residential property and provide:
1. Roof type (gable, hip, flat, mansard, gambrel, shed, complex)
2. Estimated roof area in square feet
3. Estimated roof pitch (low/flat: 0-3/12, medium: 4-6/12, steep: 7-12/12, very steep: >12/12)
4. Count of visible features:
   - Valleys (where two roof planes meet)
   - Chimneys
   - Skylights
   - Dormers
   - Other penetrations (vents, etc.)
5. Overall complexity rating (simple, moderate, complex)
6. Confidence level in the analysis (0-100%)

Return results in JSON format.
```

#### B. Address-to-Satellite Imagery
**Options:**
1. **Google Maps Static API** (requires API key)
   - High quality satellite imagery
   - URL: `https://maps.googleapis.com/maps/api/staticmap`
   - Parameters: `center=[address]&zoom=20&size=640x640&maptype=satellite`

2. **Mapbox Static Images API** (alternative)
   - URL: `https://api.mapbox.com/styles/v1/mapbox/satellite-v9/static/`

3. **User Upload Option**
   - Allow manual image upload if automated fetch fails
   - Fallback for areas with poor satellite coverage

#### C. GPT-4 for Calculations and Recommendations
**Purpose**: Intelligent pricing, material recommendations, and explanations

**Use Cases:**
1. **Material Recommendation**
   - Input: Climate zone, budget, building type
   - Output: Recommended material with justification

2. **Cost Estimation**
   - Input: Location, material, area, complexity
   - Output: Estimated labor and material costs with regional adjustments

3. **Specification Generation**
   - Input: Project details
   - Output: Detailed line-item breakdown with explanations

**Example Prompt:**
```
Given the following roofing project details:
- Location: [City, State]
- Roof Area: [X] square feet
- Roof Type: [type]
- Pitch: [pitch]
- Material: [material]
- Complexity: [complexity]

Provide:
1. Recommended material quantities with waste factor
2. Estimated labor hours by task
3. Regional pricing adjustments for [location]
4. Special considerations for this project
```

#### D. Data Flow
```
User Input (Address)
  → Geocoding/Address Validation
  → Fetch Satellite Imagery
  → GPT-4 Vision Analysis
  → Extract Roof Characteristics
  → Display to User (editable)
  → User Confirms/Adjusts Values
  → Calculate Materials & Labor
  → Generate Estimate
```

---

## 4. Input Field Specifications

### Field Categories

#### A. Required User Inputs

##### 1. Property Address
```typescript
{
  id: 'address',
  label: 'Property Address',
  type: 'text',
  required: true,
  placeholder: '123 Main St, City, State ZIP',
  helpText: 'Enter the full property address for AI roof analysis',
  aiPowered: true
}
```
**Behavior:**
- Text input with address autocomplete
- Trigger AI analysis button after entry
- Loading state during AI processing
- Display analyzed results for confirmation

##### 2. Manual Override - Roof Area
```typescript
{
  id: 'roofArea',
  label: 'Roof Area',
  type: 'number',
  required: true,
  placeholder: 'Enter square footage',
  unit: 'sq ft',
  helpText: 'Total roof area (AI detected or manual entry)',
  min: 100,
  max: 50000,
  aiGenerated: true // Indicates this can be AI-populated
}
```

##### 3. Roof Type
```typescript
{
  id: 'roofType',
  label: 'Roof Type',
  type: 'select',
  required: true,
  options: [
    { value: 'gable', label: 'Gable - Two-sided triangular' },
    { value: 'hip', label: 'Hip - Four-sided sloped' },
    { value: 'flat', label: 'Flat - Nearly horizontal' },
    { value: 'mansard', label: 'Mansard - Four-sided gambrel' },
    { value: 'gambrel', label: 'Gambrel - Barn-style double slope' },
    { value: 'shed', label: 'Shed - Single slope' },
    { value: 'complex', label: 'Complex - Multiple types' }
  ],
  helpText: 'Primary roof configuration',
  aiGenerated: true
}
```

##### 4. Roof Pitch/Slope
```typescript
{
  id: 'roofPitch',
  label: 'Roof Pitch',
  type: 'select',
  required: true,
  options: [
    { value: '0-12', label: 'Flat (0/12 to 1/12)' },
    { value: '2-12', label: 'Low (2/12 to 3/12)' },
    { value: '4-12', label: 'Medium-Low (4/12)' },
    { value: '5-12', label: 'Medium (5/12)' },
    { value: '6-12', label: 'Medium-High (6/12)' },
    { value: '7-12', label: 'Steep (7/12)' },
    { value: '8-12', label: 'Steep (8/12)' },
    { value: '9-12', label: 'Very Steep (9/12)' },
    { value: '10-12', label: 'Very Steep (10/12)' },
    { value: '12-12', label: 'Extreme (12/12)' },
    { value: '12+-12', label: 'Extreme (>12/12)' }
  ],
  helpText: 'Roof slope affects material and labor costs',
  aiGenerated: true
}
```

##### 5. Number of Stories
```typescript
{
  id: 'stories',
  label: 'Number of Stories',
  type: 'select',
  required: true,
  options: [
    { value: '1', label: 'Single Story' },
    { value: '2', label: 'Two Story' },
    { value: '3', label: 'Three Story' },
    { value: '3+', label: 'Three+ Story' }
  ],
  helpText: 'Building height affects labor costs and safety requirements'
}
```

##### 6. Roofing Material
```typescript
{
  id: 'material',
  label: 'Roofing Material',
  type: 'select',
  required: true,
  options: [
    {
      value: 'asphalt_3tab',
      label: 'Asphalt Shingles - 3-Tab (Economy)',
      pricePerSquare: 95
    },
    {
      value: 'asphalt_architectural',
      label: 'Asphalt Shingles - Architectural (Standard)',
      pricePerSquare: 125
    },
    {
      value: 'asphalt_premium',
      label: 'Asphalt Shingles - Premium/Designer',
      pricePerSquare: 185
    },
    {
      value: 'metal_standing_seam',
      label: 'Metal - Standing Seam',
      pricePerSquare: 450
    },
    {
      value: 'metal_shingles',
      label: 'Metal - Shingles/Tiles',
      pricePerSquare: 375
    },
    {
      value: 'tile_clay',
      label: 'Tile - Clay',
      pricePerSquare: 650
    },
    {
      value: 'tile_concrete',
      label: 'Tile - Concrete',
      pricePerSquare: 450
    },
    {
      value: 'slate',
      label: 'Slate - Natural Stone',
      pricePerSquare: 1200
    },
    {
      value: 'wood_shakes',
      label: 'Wood Shakes - Cedar',
      pricePerSquare: 425
    },
    {
      value: 'tpo',
      label: 'TPO Membrane (Flat Roofs)',
      pricePerSquare: 275
    },
    {
      value: 'epdm',
      label: 'EPDM Rubber (Flat Roofs)',
      pricePerSquare: 225
    }
  ],
  helpText: 'Select primary roofing material'
}
```

#### B. Complexity Factors (Optional but Recommended)

##### 7. Number of Layers to Remove
```typescript
{
  id: 'layersToRemove',
  label: 'Existing Roof Layers',
  type: 'select',
  required: false,
  options: [
    { value: '0', label: 'New Construction (No Tear-off)' },
    { value: '1', label: 'One Layer' },
    { value: '2', label: 'Two Layers' },
    { value: '3', label: 'Three Layers (Maximum)' }
  ],
  helpText: 'Number of existing shingle layers to remove',
  defaultValue: '1'
}
```

##### 8. Roof Features (AI-Detected)
```typescript
{
  id: 'valleys',
  label: 'Number of Valleys',
  type: 'number',
  required: false,
  min: 0,
  max: 50,
  placeholder: '0',
  helpText: 'Valleys where two roof planes meet',
  aiGenerated: true
}

{
  id: 'chimneys',
  label: 'Number of Chimneys',
  type: 'number',
  required: false,
  min: 0,
  max: 10,
  placeholder: '0',
  aiGenerated: true
}

{
  id: 'skylights',
  label: 'Number of Skylights',
  type: 'number',
  required: false,
  min: 0,
  max: 20,
  placeholder: '0',
  aiGenerated: true
}

{
  id: 'dormers',
  label: 'Number of Dormers',
  type: 'number',
  required: false,
  min: 0,
  max: 20,
  placeholder: '0',
  aiGenerated: true
}

{
  id: 'vents',
  label: 'Number of Roof Vents',
  type: 'number',
  required: false,
  min: 0,
  max: 50,
  placeholder: '0',
  helpText: 'Plumbing vents, exhaust vents, etc.'
}
```

##### 9. Existing Roof Condition
```typescript
{
  id: 'existingCondition',
  label: 'Existing Roof Condition',
  type: 'select',
  required: false,
  options: [
    { value: 'new', label: 'New Construction' },
    { value: 'good', label: 'Good - Minor wear' },
    { value: 'fair', label: 'Fair - Moderate wear' },
    { value: 'poor', label: 'Poor - Significant damage' }
  ],
  helpText: 'Condition of existing roof structure',
  defaultValue: 'fair'
}
```

##### 10. Decking Replacement
```typescript
{
  id: 'deckingReplacement',
  label: 'Decking Replacement',
  type: 'select',
  required: false,
  options: [
    { value: '0', label: 'None - Decking is good' },
    { value: '10', label: '10% - Minimal replacement' },
    { value: '25', label: '25% - Some replacement' },
    { value: '50', label: '50% - Half replacement' },
    { value: '75', label: '75% - Major replacement' },
    { value: '100', label: '100% - Complete replacement' }
  ],
  helpText: 'Percentage of roof decking needing replacement',
  defaultValue: '10'
}
```

#### C. Additional Options (Checkboxes)

##### 11. Ventilation Options
```typescript
{
  id: 'includeRidgeVent',
  label: 'Ridge Vent',
  type: 'checkbox',
  checkboxLabel: 'Include ridge vent installation'
}

{
  id: 'includeSoffitVents',
  label: 'Soffit Vents',
  type: 'checkbox',
  checkboxLabel: 'Include soffit vent installation'
}

{
  id: 'includeAtticFan',
  label: 'Attic Fan',
  type: 'checkbox',
  checkboxLabel: 'Include powered attic fan'
}
```

##### 12. Underlayment Upgrade
```typescript
{
  id: 'syntheticUnderlayment',
  label: 'Synthetic Underlayment',
  type: 'checkbox',
  checkboxLabel: 'Upgrade to synthetic underlayment (from felt)',
  defaultValue: false
}

{
  id: 'iceWaterShield',
  label: 'Ice & Water Shield',
  type: 'checkbox',
  checkboxLabel: 'Add ice & water shield to eaves and valleys',
  defaultValue: true
}
```

##### 13. Warranty
```typescript
{
  id: 'extendedWarranty',
  label: 'Extended Warranty',
  type: 'checkbox',
  checkboxLabel: 'Include extended manufacturer warranty (lifetime)',
  defaultValue: false
}
```

---

## 5. Pricing Calculation Logic

### Material Calculations

#### A. Primary Roofing Material
```typescript
// Convert square feet to roofing squares (1 square = 100 sq ft)
const baseSquares = roofArea / 100;

// Apply waste factor based on roof complexity
const wasteFactor = {
  simple: 1.10,      // 10% waste
  moderate: 1.15,    // 15% waste
  complex: 1.20      // 20% waste
}[complexity];

// Apply pitch multiplier for actual coverage area
const pitchMultipliers = {
  '0-12': 1.00,
  '2-12': 1.01,
  '4-12': 1.05,
  '5-12': 1.08,
  '6-12': 1.12,
  '7-12': 1.16,
  '8-12': 1.20,
  '9-12': 1.25,
  '10-12': 1.30,
  '12-12': 1.41,
  '12+-12': 1.50
};

const totalSquares = Math.ceil(
  baseSquares * wasteFactor * pitchMultipliers[pitch]
);

const materialCost = totalSquares * pricePerSquare;
```

#### B. Underlayment
```typescript
// Standard felt: $15-25 per roll (400 sq ft coverage)
// Synthetic: $50-75 per roll (1000 sq ft coverage)
const underlaymentCoverage = syntheticUnderlayment ? 1000 : 400;
const underlaymentPrice = syntheticUnderlayment ? 65 : 20;
const underlaymentRolls = Math.ceil((roofArea * 1.1) / underlaymentCoverage);
const underlaymentCost = underlaymentRolls * underlaymentPrice;

// Ice & Water Shield (for valleys, eaves)
if (iceWaterShield) {
  const iceWaterArea = (roofArea * 0.15); // Typically 15% of roof
  const iceWaterRolls = Math.ceil(iceWaterArea / 225); // 225 sq ft per roll
  const iceWaterCost = iceWaterRolls * 75; // $75 per roll
}
```

#### C. Starter Shingles
```typescript
// Perimeter calculation based on roof type
const perimeterEstimates = {
  gable: Math.sqrt(roofArea) * 4 * 1.2,
  hip: Math.sqrt(roofArea) * 4 * 1.3,
  flat: Math.sqrt(roofArea) * 4,
  complex: Math.sqrt(roofArea) * 4 * 1.5
};

const perimeter = perimeterEstimates[roofType];
const starterBundles = Math.ceil(perimeter / 100); // 100 LF per bundle
const starterCost = starterBundles * 45; // $45 per bundle
```

#### D. Hip & Ridge Cap Shingles
```typescript
const ridgeLength = roofType === 'hip'
  ? perimeter * 0.5  // Hip roofs have more ridge
  : Math.sqrt(roofArea / 2); // Gable roofs

const ridgeBundles = Math.ceil(ridgeLength / 33); // 33 LF per bundle
const ridgeCost = ridgeBundles * 55; // $55 per bundle
```

#### E. Flashing
```typescript
// Drip edge
const dripEdgeLength = perimeter;
const dripEdgePieces = Math.ceil(dripEdgeLength / 10); // 10 ft pieces
const dripEdgeCost = dripEdgePieces * 8; // $8 per piece

// Valley flashing
const valleyLength = valleys * 20; // Estimate 20 ft per valley
const valleyFlashingCost = Math.ceil(valleyLength / 10) * 12; // $12 per 10ft

// Chimney flashing
const chimneyFlashingCost = chimneys * 125; // $125 per chimney

// Skylight flashing
const skylightFlashingCost = skylights * 85; // $85 per skylight

// Vent pipe boots
const ventBootsCost = vents * 12; // $12 per vent boot
```

#### F. Ventilation
```typescript
// Ridge vent
if (includeRidgeVent) {
  const ridgeVentLength = ridgeLength;
  const ridgeVentPieces = Math.ceil(ridgeVentLength / 4); // 4 ft pieces
  const ridgeVentCost = ridgeVentPieces * 18; // $18 per piece
}

// Soffit vents
if (includeSoffitVents) {
  const soffitVentCount = Math.ceil(roofArea / 300); // 1 per 300 sq ft
  const soffitVentCost = soffitVentCount * 8; // $8 per vent
}

// Attic fan
if (includeAtticFan) {
  const atticFanCost = 225; // $225 for powered fan
}
```

#### G. Fasteners & Supplies
```typescript
const nailsPerSquare = 350; // Approximate nails per square
const totalNails = totalSquares * nailsPerSquare;
const nailBoxes = Math.ceil(totalNails / 7200); // 7200 nails per box
const nailsCost = nailBoxes * 65; // $65 per box

const roofCementTubes = Math.ceil(totalSquares / 10); // 1 tube per 10 squares
const roofCementCost = roofCementTubes * 8; // $8 per tube
```

#### H. Decking Replacement
```typescript
if (deckingReplacementPercent > 0) {
  const deckingArea = roofArea * (deckingReplacementPercent / 100);
  const deckingSheets = Math.ceil(deckingArea / 32); // 4x8 sheets = 32 sq ft
  const deckingCost = deckingSheets * 28; // $28 per OSB sheet (7/16")
}
```

### Labor Calculations

#### A. Base Labor Rates
```typescript
const baseLaborRates = {
  'asphalt_3tab': 65,           // per square
  'asphalt_architectural': 75,
  'asphalt_premium': 85,
  'metal_standing_seam': 150,
  'metal_shingles': 125,
  'tile_clay': 200,
  'tile_concrete': 175,
  'slate': 250,
  'wood_shakes': 125,
  'tpo': 100,
  'epdm': 90
};

const baseLaborCost = totalSquares * baseLaborRates[material];
```

#### B. Labor Multipliers
```typescript
// Pitch multiplier
const laborPitchMultipliers = {
  '0-12': 1.0,
  '2-12': 1.0,
  '4-12': 1.1,
  '5-12': 1.15,
  '6-12': 1.20,
  '7-12': 1.30,
  '8-12': 1.40,
  '9-12': 1.50,
  '10-12': 1.65,
  '12-12': 1.80,
  '12+-12': 2.00
};

// Story multiplier
const storyMultipliers = {
  '1': 1.0,
  '2': 1.25,
  '3': 1.45,
  '3+': 1.60
};

// Complexity multiplier
const complexityMultipliers = {
  simple: 1.0,
  moderate: 1.15,
  complex: 1.35
};

const adjustedLaborCost = baseLaborCost
  * laborPitchMultipliers[pitch]
  * storyMultipliers[stories]
  * complexityMultipliers[complexity];
```

#### C. Tear-off Labor
```typescript
if (layersToRemove > 0) {
  const tearoffRatePerSquare = {
    '1': 45,  // per square
    '2': 65,
    '3': 85
  }[layersToRemove];

  const tearoffLaborCost = totalSquares * tearoffRatePerSquare;
}
```

#### D. Specialty Labor
```typescript
// Chimney flashing labor
const chimneyLaborCost = chimneys * 175; // $175 per chimney

// Skylight flashing labor
const skylightLaborCost = skylights * 125; // $125 per skylight

// Dormer labor
const dormerLaborCost = dormers * 200; // $200 per dormer

// Valley labor (included in base for most, add extra for complex)
const valleyLaborExtra = valleys > 4 ? (valleys - 4) * 50 : 0;
```

#### E. Decking Replacement Labor
```typescript
if (deckingReplacementPercent > 0) {
  const deckingLaborCost = deckingSheets * 35; // $35 per sheet labor
}
```

### Additional Costs

#### A. Disposal
```typescript
// Dumpster rental
const dumpsterSize = totalSquares > 30 ? '30-yard' : '20-yard';
const dumpsterCost = dumpsterSize === '30-yard' ? 550 : 425;

// Additional haul-away fees for extra layers
const haulawayCost = layersToRemove > 1
  ? (layersToRemove - 1) * totalSquares * 5
  : 0;
```

#### B. Permits & Inspections
```typescript
// Permit fees (vary by location, use average)
const permitBaseFee = 150;
const permitPerSquareFee = totalSquares * 0.75;
const permitCost = permitBaseFee + permitPerSquareFee;

// Inspection fee
const inspectionCost = 75;
```

#### C. Warranty
```typescript
if (extendedWarranty) {
  const warrantyCost = totalSquares * 15; // $15 per square
}
```

### Total Calculation Summary
```typescript
interface RoofingEstimate {
  materials: {
    roofingMaterial: number;
    underlayment: number;
    iceWaterShield: number;
    starterShingles: number;
    ridgeCap: number;
    dripEdge: number;
    valleyFlashing: number;
    chimneyFlashing: number;
    skylightFlashing: number;
    ventBoots: number;
    ridgeVent: number;
    soffitVents: number;
    atticFan: number;
    nails: number;
    roofCement: number;
    decking: number;
    subtotal: number;
  };

  labor: {
    installation: number;
    tearoff: number;
    chimneyWork: number;
    skylightWork: number;
    dormerWork: number;
    valleyWork: number;
    deckingReplacement: number;
    subtotal: number;
  };

  other: {
    dumpster: number;
    disposal: number;
    permit: number;
    inspection: number;
    warranty: number;
    subtotal: number;
  };

  grandTotal: number;
  pricePerSquare: number; // Total divided by area in squares
}
```

---

## 6. OpenAI Integration Implementation

### API Configuration

#### Environment Variables
```bash
# Add to .env file
VITE_OPENAI_API_KEY=sk-...
VITE_GOOGLE_MAPS_API_KEY=AIza... # Optional for satellite imagery
VITE_MAPBOX_API_KEY=pk.... # Alternative to Google Maps
```

#### API Service Module
**File**: `/src/services/openai-service.ts`

```typescript
interface OpenAIConfig {
  apiKey: string;
  model: 'gpt-4o' | 'gpt-4-vision-preview' | 'gpt-4-turbo';
  maxTokens?: number;
}

class OpenAIService {
  private apiKey: string;
  private baseURL = 'https://api.openai.com/v1';

  constructor(config: OpenAIConfig) {
    this.apiKey = config.apiKey;
  }

  async analyzeRoofFromImage(
    imageUrl: string,
    address: string
  ): Promise<RoofAnalysisResponse> {
    const response = await fetch(`${this.baseURL}/chat/completions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${this.apiKey}`
      },
      body: JSON.stringify({
        model: 'gpt-4o',
        messages: [
          {
            role: 'system',
            content: 'You are a professional roofing estimator analyzing aerial imagery.'
          },
          {
            role: 'user',
            content: [
              {
                type: 'text',
                text: `Analyze this satellite/aerial image of the property at ${address}. Provide detailed roof analysis including:
                1. Roof type (gable, hip, flat, mansard, gambrel, shed, or complex)
                2. Estimated total roof area in square feet
                3. Estimated roof pitch (return one of: 0-12, 2-12, 4-12, 5-12, 6-12, 7-12, 8-12, 9-12, 10-12, 12-12, 12+-12)
                4. Number of visible valleys
                5. Number of chimneys
                6. Number of skylights
                7. Number of dormers
                8. Overall complexity (simple, moderate, or complex)
                9. Confidence level (0-100)

                Return results in this exact JSON format:
                {
                  "roofType": "string",
                  "estimatedArea": number,
                  "estimatedPitch": "string",
                  "complexity": "string",
                  "features": {
                    "valleys": number,
                    "chimneys": number,
                    "skylights": number,
                    "dormers": number
                  },
                  "confidence": number
                }`
              },
              {
                type: 'image_url',
                image_url: {
                  url: imageUrl,
                  detail: 'high'
                }
              }
            ]
          }
        ],
        max_tokens: 1000,
        response_format: { type: 'json_object' }
      })
    });

    const data = await response.json();
    return JSON.parse(data.choices[0].message.content);
  }

  async getSatelliteImage(address: string): Promise<string> {
    // Implementation depends on chosen service (Google Maps or Mapbox)
    const encodedAddress = encodeURIComponent(address);

    // Google Maps Static API example
    const googleMapsUrl = `https://maps.googleapis.com/maps/api/staticmap?` +
      `center=${encodedAddress}&` +
      `zoom=20&` +
      `size=640x640&` +
      `maptype=satellite&` +
      `key=${import.meta.env.VITE_GOOGLE_MAPS_API_KEY}`;

    return googleMapsUrl;
  }

  async generatePricingRecommendations(
    projectDetails: RoofingProjectDetails
  ): Promise<PricingRecommendations> {
    // Use GPT-4 for intelligent pricing recommendations
    // Implementation similar to analyzeRoofFromImage
  }
}

export default OpenAIService;
```

### Integration Flow

#### Step 1: Address Input & Validation
```typescript
const handleAddressSubmit = async (address: string) => {
  setIsAnalyzing(true);
  setAnalysisError(null);

  try {
    // Validate address format
    if (!isValidAddress(address)) {
      throw new Error('Please enter a valid address');
    }

    // Proceed to image fetch
    await fetchAndAnalyzeRoof(address);
  } catch (error) {
    setAnalysisError(error.message);
  } finally {
    setIsAnalyzing(false);
  }
};
```

#### Step 2: Fetch Satellite Imagery
```typescript
const fetchAndAnalyzeRoof = async (address: string) => {
  try {
    // Get satellite image URL
    const imageUrl = await openAIService.getSatelliteImage(address);

    // Display loading state
    setLoadingMessage('Analyzing roof from satellite imagery...');

    // Analyze with GPT-4 Vision
    const analysis = await openAIService.analyzeRoofFromImage(
      imageUrl,
      address
    );

    // Populate form fields with AI results
    populateFormWithAnalysis(analysis);

    // Show confidence score
    setConfidenceScore(analysis.confidence);

  } catch (error) {
    // Fallback to manual entry if AI fails
    setAnalysisError('Could not analyze automatically. Please enter details manually.');
  }
};
```

#### Step 3: Display AI Results for User Confirmation
```typescript
const AIResultsCard = ({ analysis, onConfirm, onEdit }) => {
  return (
    <div className="bg-blue-50 border-2 border-blue-200 rounded-lg p-6 my-4">
      <div className="flex items-center mb-4">
        <Sparkles className="w-6 h-6 text-blue-600 mr-2" />
        <h3 className="text-lg font-semibold text-blue-900">
          AI Analysis Results
        </h3>
        <div className="ml-auto">
          <span className="text-sm text-blue-700">
            Confidence: {analysis.confidence}%
          </span>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4 mb-4">
        <div>
          <p className="text-sm text-gray-600">Roof Type</p>
          <p className="font-medium">{analysis.roofType}</p>
        </div>
        <div>
          <p className="text-sm text-gray-600">Estimated Area</p>
          <p className="font-medium">{analysis.estimatedArea} sq ft</p>
        </div>
        <div>
          <p className="text-sm text-gray-600">Roof Pitch</p>
          <p className="font-medium">{analysis.estimatedPitch}</p>
        </div>
        <div>
          <p className="text-sm text-gray-600">Complexity</p>
          <p className="font-medium">{analysis.complexity}</p>
        </div>
      </div>

      <div className="border-t border-blue-200 pt-4 mb-4">
        <p className="text-sm font-medium text-gray-700 mb-2">Detected Features:</p>
        <div className="grid grid-cols-2 gap-2 text-sm">
          <div>Valleys: {analysis.features.valleys}</div>
          <div>Chimneys: {analysis.features.chimneys}</div>
          <div>Skylights: {analysis.features.skylights}</div>
          <div>Dormers: {analysis.features.dormers}</div>
        </div>
      </div>

      <div className="flex space-x-3">
        <button
          onClick={onConfirm}
          className="flex-1 bg-blue-600 text-white py-2 rounded-md hover:bg-blue-700"
        >
          <Check className="w-4 h-4 inline mr-2" />
          Confirm & Calculate
        </button>
        <button
          onClick={onEdit}
          className="flex-1 bg-white text-blue-600 border-2 border-blue-600 py-2 rounded-md hover:bg-blue-50"
        >
          <Edit className="w-4 h-4 inline mr-2" />
          Edit Values
        </button>
      </div>

      <p className="text-xs text-blue-600 mt-3 text-center">
        AI-generated values are estimates. Please review and adjust as needed.
      </p>
    </div>
  );
};
```

#### Step 4: Error Handling & Fallbacks
```typescript
const handleAIAnalysisError = (error: Error) => {
  // Log error for debugging
  console.error('AI Analysis Error:', error);

  // Provide helpful fallback message
  if (error.message.includes('API key')) {
    setError('AI analysis is temporarily unavailable. Please enter details manually.');
  } else if (error.message.includes('satellite')) {
    setError('Could not load satellite imagery for this address. Please enter details manually.');
  } else if (error.message.includes('rate limit')) {
    setError('Too many requests. Please wait a moment and try again.');
  } else {
    setError('Analysis failed. Please enter roof details manually.');
  }

  // Enable manual entry mode
  setManualEntryMode(true);
};
```

---

## 7. UI/UX Design Specifications

### Component Structure

```
RoofingCalculator
├── AddressInput (AI-powered)
│   ├── AutocompleteField
│   └── AnalyzeButton
├── AIAnalysisCard (conditional)
│   ├── ConfidenceScore
│   ├── DetectedValues
│   └── ConfirmationButtons
├── RoofSpecifications (form)
│   ├── BasicInputs (area, type, pitch, stories)
│   ├── MaterialSelector
│   ├── ComplexityFactors (optional)
│   └── AdditionalOptions (checkboxes)
└── CalculatorResults
    ├── MaterialBreakdown
    ├── LaborBreakdown
    ├── OtherCosts
    └── TotalSummary
```

### Visual Design

#### Color Scheme
- **Primary**: Orange/Terra Cotta (#F97316 - roof theme)
- **Secondary**: Blue (#3B82F6 - AI features)
- **Success**: Green (#10B981)
- **Warning**: Yellow (#F59E0B)
- **Error**: Red (#EF4444)

#### AI-Powered Indicators
```tsx
// Badge for AI-generated fields
<div className="flex items-center">
  <label>Roof Area</label>
  <span className="ml-2 px-2 py-1 bg-blue-100 text-blue-700 text-xs rounded-full">
    <Sparkles className="w-3 h-3 inline mr-1" />
    AI Detected
  </span>
</div>
```

#### Loading States
```tsx
// During AI analysis
<div className="flex flex-col items-center justify-center p-8">
  <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mb-4"></div>
  <p className="text-gray-700 font-medium">Analyzing roof from satellite imagery...</p>
  <p className="text-gray-500 text-sm mt-2">This may take 10-15 seconds</p>
</div>
```

### Responsive Layout
- **Mobile**: Single column, stacked inputs
- **Tablet**: Two-column grid for inputs
- **Desktop**: Three-column layout (input | preview | results)

---

## 8. Integration with Existing System

### A. Add to Trade Registry
**File**: `/src/data/trades.tsx`

```typescript
import { Home, Warehouse } from 'lucide-react'; // Add roof icon

export const trades: Trade[] = [
  // ... existing trades
  {
    id: 'roofing',
    name: 'Roofing',
    category: 'Exterior',
    icon: <Warehouse />, // or custom roof icon
    description: 'Professional roofing installation and replacement with AI-powered estimation',
    requiredFields: [
      {
        id: 'address',
        label: 'Property Address',
        type: 'text',
        required: true,
        placeholder: '123 Main St, City, State ZIP',
        helpText: 'Enter address for AI roof analysis'
      },
      {
        id: 'roofArea',
        label: 'Roof Area',
        type: 'number',
        required: true,
        placeholder: 'Square footage',
        unit: 'sq ft',
        min: 100,
        max: 50000
      },
      {
        id: 'roofType',
        label: 'Roof Type',
        type: 'select',
        required: true,
        options: [
          { value: 'gable', label: 'Gable' },
          { value: 'hip', label: 'Hip' },
          { value: 'flat', label: 'Flat' },
          { value: 'mansard', label: 'Mansard' },
          { value: 'gambrel', label: 'Gambrel' },
          { value: 'shed', label: 'Shed' },
          { value: 'complex', label: 'Complex' }
        ]
      },
      {
        id: 'roofPitch',
        label: 'Roof Pitch',
        type: 'select',
        required: true,
        options: [
          { value: '0-12', label: 'Flat (0/12-1/12)' },
          { value: '2-12', label: 'Low (2/12-3/12)' },
          { value: '4-12', label: 'Medium-Low (4/12)' },
          { value: '5-12', label: 'Medium (5/12)' },
          { value: '6-12', label: 'Medium-High (6/12)' },
          { value: '7-12', label: 'Steep (7/12)' },
          { value: '8-12', label: 'Steep (8/12)' },
          { value: '9-12', label: 'Very Steep (9/12)' },
          { value: '10-12', label: 'Very Steep (10/12)' },
          { value: '12-12', label: 'Extreme (12/12)' },
          { value: '12+-12', label: 'Extreme (>12/12)' }
        ]
      },
      {
        id: 'stories',
        label: 'Number of Stories',
        type: 'select',
        required: true,
        options: [
          { value: '1', label: 'Single Story' },
          { value: '2', label: 'Two Story' },
          { value: '3', label: 'Three Story' },
          { value: '3+', label: 'Three+ Story' }
        ]
      },
      {
        id: 'material',
        label: 'Roofing Material',
        type: 'select',
        required: true,
        options: [
          { value: 'asphalt_3tab', label: 'Asphalt - 3-Tab' },
          { value: 'asphalt_architectural', label: 'Asphalt - Architectural' },
          { value: 'asphalt_premium', label: 'Asphalt - Premium' },
          { value: 'metal_standing_seam', label: 'Metal - Standing Seam' },
          { value: 'metal_shingles', label: 'Metal - Shingles' },
          { value: 'tile_clay', label: 'Clay Tile' },
          { value: 'tile_concrete', label: 'Concrete Tile' },
          { value: 'slate', label: 'Slate' },
          { value: 'wood_shakes', label: 'Wood Shakes' },
          { value: 'tpo', label: 'TPO (Flat)' },
          { value: 'epdm', label: 'EPDM (Flat)' }
        ]
      }
    ],
    optionalFields: [
      {
        id: 'layersToRemove',
        label: 'Layers to Remove',
        type: 'select',
        options: [
          { value: '0', label: 'New Construction' },
          { value: '1', label: 'One Layer' },
          { value: '2', label: 'Two Layers' },
          { value: '3', label: 'Three Layers' }
        ]
      },
      {
        id: 'valleys',
        label: 'Number of Valleys',
        type: 'number',
        min: 0,
        max: 50
      },
      {
        id: 'chimneys',
        label: 'Number of Chimneys',
        type: 'number',
        min: 0,
        max: 10
      },
      {
        id: 'skylights',
        label: 'Number of Skylights',
        type: 'number',
        min: 0,
        max: 20
      },
      {
        id: 'includeRidgeVent',
        label: 'Ridge Vent',
        type: 'checkbox',
        checkboxLabel: 'Include ridge vent installation'
      },
      {
        id: 'syntheticUnderlayment',
        label: 'Synthetic Underlayment',
        type: 'checkbox',
        checkboxLabel: 'Upgrade to synthetic underlayment'
      }
    ]
  }
];
```

### B. Update PricingCalculator.tsx
**File**: `/src/pages/PricingCalculator.tsx`

```typescript
// Add import
import RoofingCalculator from '../components/pricing/RoofingCalculator';

// Add to switch statement
const renderSpecializedCalculator = () => {
  // ... existing cases
  case 'roofing':
    return <RoofingCalculator onCalculate={handleSpecializedCalculation} />;
  // ...
};

// Update specialized calculator array
setShowSpecializedCalculator([
  'concrete', 'deck', 'doors_windows', 'drywall', 'electrical',
  'excavation', 'fence', 'flooring', 'foundation', 'framing',
  'gutter', 'hvac', 'junk_removal', 'paint', 'pavers',
  'plumbing', 'retaining_walls', 'roofing', 'siding', 'tile'
].includes(trade.id));
```

### C. Create RoofingCalculator Component
**File**: `/src/components/pricing/RoofingCalculator.tsx`

```typescript
import React, { useState } from 'react';
import { CalculatorProps, CalculationResult } from '../../types';
import { Warehouse, Sparkles, MapPin, AlertCircle } from 'lucide-react';
import OpenAIService from '../../services/openai-service';

const RoofingCalculator: React.FC<CalculatorProps> = ({ onCalculate }) => {
  // State management
  const [address, setAddress] = useState('');
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [aiAnalysis, setAiAnalysis] = useState(null);
  const [manualMode, setManualMode] = useState(false);

  // Form state (all the roofing fields)
  const [roofArea, setRoofArea] = useState<number | ''>('');
  const [roofType, setRoofType] = useState('gable');
  const [roofPitch, setRoofPitch] = useState('6-12');
  const [stories, setStories] = useState('1');
  const [material, setMaterial] = useState('asphalt_architectural');
  // ... more state fields

  // AI analysis handler
  const handleAnalyzeRoof = async () => {
    // Implementation
  };

  // Manual calculation
  const handleCalculate = () => {
    // Implement full pricing logic from section 5
    const results: CalculationResult[] = [];

    // Calculate materials
    // Calculate labor
    // Calculate other costs
    // Generate results array

    onCalculate(results);
  };

  return (
    <div className="bg-white p-6 rounded-lg shadow-md">
      {/* Component JSX */}
    </div>
  );
};

export default RoofingCalculator;
```

---

## 9. Testing Requirements

### Unit Tests
1. **Calculation Logic**
   - Test material calculations with various inputs
   - Test labor multipliers
   - Test waste factor calculations
   - Test pitch multipliers

2. **AI Integration**
   - Mock OpenAI API responses
   - Test error handling
   - Test fallback to manual mode

3. **Form Validation**
   - Test required field validation
   - Test numeric range validation
   - Test address format validation

### Integration Tests
1. **End-to-End Flow**
   - Address input → AI analysis → Form population → Calculate → Results
   - Manual entry → Calculate → Results
   - Generate estimate from results

2. **Error Scenarios**
   - Invalid address
   - API failure
   - Network timeout
   - Invalid calculations

### User Acceptance Testing
1. **Accuracy Validation**
   - Compare results with known roofing projects
   - Verify material quantities
   - Verify labor estimates

2. **Usability Testing**
   - AI analysis workflow
   - Manual entry workflow
   - Mobile responsiveness

---

## 10. Performance Considerations

### Optimization Strategies

1. **API Rate Limiting**
   - Implement debouncing on address input
   - Cache satellite images for same address
   - Queue multiple AI requests

2. **Image Loading**
   - Lazy load satellite images
   - Use optimized image formats (WebP)
   - Progressive image loading

3. **Calculation Performance**
   - Memoize expensive calculations
   - Use web workers for complex calculations
   - Cache pricing data

4. **State Management**
   - Use React.memo for expensive components
   - Optimize re-renders with useMemo/useCallback
   - Batch state updates

---

## 11. Security & Privacy

### Data Protection
1. **API Key Security**
   - Store keys in environment variables
   - Never expose keys in client-side code
   - Implement proxy server for API calls if needed

2. **Address Privacy**
   - Don't store addresses without user consent
   - Clear analysis cache after session
   - Comply with data privacy regulations

3. **Input Sanitization**
   - Validate and sanitize all user inputs
   - Prevent XSS attacks
   - Validate API responses

---

## 12. Future Enhancements

### Phase 2 Features
1. **Advanced AI Features**
   - 3D roof model generation
   - Material degradation analysis
   - Weather impact predictions
   - Historical pricing trends

2. **Enhanced Integrations**
   - Direct supplier pricing API
   - Local permit cost database
   - Regional labor rate adjustments
   - Material supplier inventory check

3. **Collaboration Features**
   - Share estimates with team
   - Client approval workflow
   - Before/after photo gallery
   - Progress tracking

4. **Reporting**
   - Detailed PDF reports
   - Material cut sheets
   - Safety plans
   - Project timelines

---

## 13. Documentation Requirements

### Developer Documentation
1. **API Documentation**
   - OpenAI integration guide
   - Calculation formulas
   - Component API reference

2. **Setup Guide**
   - Environment configuration
   - API key setup
   - Local development setup

### User Documentation
1. **User Guide**
   - How to use AI analysis
   - Manual entry guide
   - Understanding results
   - Generating estimates

2. **FAQ**
   - Common questions
   - Troubleshooting
   - Accuracy disclaimers

---

## 14. Implementation Timeline

### Phase 1: Core Calculator (Week 1-2)
- [ ] Create RoofingCalculator component
- [ ] Implement basic form inputs
- [ ] Implement calculation logic
- [ ] Add to trade registry
- [ ] Basic UI/UX
- [ ] Unit tests for calculations

### Phase 2: AI Integration (Week 3-4)
- [ ] Setup OpenAI service
- [ ] Implement address to satellite image
- [ ] Implement GPT-4 Vision analysis
- [ ] Create AI results display
- [ ] Error handling and fallbacks
- [ ] Integration tests

### Phase 3: Polish & Testing (Week 5)
- [ ] Responsive design
- [ ] Loading states and animations
- [ ] User documentation
- [ ] End-to-end testing
- [ ] Performance optimization

### Phase 4: Deployment (Week 6)
- [ ] Code review
- [ ] Security audit
- [ ] Beta testing
- [ ] Production deployment
- [ ] Monitoring setup

---

## 15. Success Metrics

### Key Performance Indicators
1. **Accuracy**: 90%+ accuracy on material estimates
2. **AI Success Rate**: 85%+ successful AI analyses
3. **User Adoption**: 70%+ of users try AI analysis
4. **Completion Rate**: 80%+ of started estimates completed
5. **Performance**: <3s for calculations, <15s for AI analysis

### User Feedback Metrics
1. Ease of use rating (1-5 stars)
2. AI analysis satisfaction
3. Accuracy perception
4. Feature requests
5. Bug reports

---

## 16. Conclusion

This comprehensive specification provides a complete blueprint for implementing a professional-grade roofing calculator with AI-powered features. The calculator will:

1. **Leverage AI** to automatically analyze properties and extract roof characteristics
2. **Provide accurate estimates** based on industry-standard calculations
3. **Integrate seamlessly** with the existing ContractorAI platform
4. **Offer flexibility** with both AI-assisted and manual entry modes
5. **Generate professional estimates** ready for client presentation

### Key Differentiators
- **AI-Powered Analysis**: First-of-its-kind satellite imagery analysis for roofing
- **Comprehensive Calculations**: Professional-grade estimates covering all materials and labor
- **User-Friendly**: Intuitive interface suitable for both experts and beginners
- **Integrated Workflow**: Seamless transition from calculator to full estimate

### Next Steps
1. Review and approve specification
2. Setup OpenAI API access
3. Begin Phase 1 implementation
4. Iterate based on testing feedback
5. Launch to users

---

## Appendix A: Pricing Data Sources

### Material Pricing (2024 Averages)
- Home Depot/Lowe's retail pricing
- Regional wholesale supplier data
- Industry reports (NRCA, Roofing Contractor Magazine)

### Labor Rates
- Bureau of Labor Statistics
- Regional contractor associations
- Industry surveys

### Regional Adjustments
- Cost of living indexes
- Regional market data
- Local permit fee schedules

---

## Appendix B: API Reference

### OpenAI API Endpoints
- **Chat Completions**: `POST /v1/chat/completions`
- **Models**: gpt-4o, gpt-4-vision-preview

### Google Maps API Endpoints
- **Static Maps**: `GET /maps/api/staticmap`
- **Geocoding**: `GET /maps/api/geocode/json`

### Rate Limits
- OpenAI: Varies by plan (typically 10,000 RPM)
- Google Maps: 25,000 requests/day (free tier)

---

**Document Version**: 1.0
**Last Updated**: 2025-10-03
**Author**: Research Agent
**Status**: Ready for Implementation
