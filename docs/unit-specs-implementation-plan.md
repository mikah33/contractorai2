# Unit Specifications Implementation Plan

## Overview

This document outlines the comprehensive plan for adding unit specifications support to all calculator components. Unit specifications allow users to customize variable coverage values (e.g., sq ft per roll, linear feet per piece) through the database rather than having hardcoded values.

The implementation involves replacing hardcoded values with `getCustomUnitValue()` calls that retrieve unit specifications from the database via the `custom_materials.metadata.unitSpec` field.

---

## Executive Summary

### Materials Requiring Unit Specifications by Calculator

| Calculator | Materials Needing Unit Specs | Priority | Complexity |
|------------|------------------------------|----------|------------|
| Roofing | Ice & Water Shield (rolls) | **HIGH** | Low |
| Flooring | Underlayment, Transition Strips | **HIGH** | Low |
| Drywall | N/A - uses sheets directly | Low | N/A |
| HVAC | N/A - equipment-based pricing | Low | N/A |
| Electrical | Wire rolls, Conduit lengths | **MEDIUM** | Medium |
| Plumbing | N/A - uses linear pricing | Low | N/A |
| Paint | Coverage per gallon | **HIGH** | Low |
| Tile | Mortar coverage, Grout coverage, Backer board, Membrane rolls | **MEDIUM** | Medium |
| Concrete | N/A - volume-based | Low | N/A |
| Siding | House Wrap, Tape, Insulation, Starter, J-Channel, Corner Posts, Fasteners | **HIGH** | High |

---

## Detailed Calculator Analysis

### 1. ✅ ROOFING CALCULATOR
**File:** `src/components/pricing/RoofingCalculator.tsx`

#### Current Implementation
**Already implements unit specifications!** This calculator serves as the reference implementation.

**Line 210-219:**
```typescript
if (includeIceShield) {
  const sqFtPerRoll = getCustomUnitValue('Ice & Water Shield', 200, 'underlayment');
  const pricePerRoll = getCustomPrice('Ice & Water Shield', 70, 'underlayment');
  const rolls = Math.ceil(sqft / sqFtPerRoll);
  results.push({
    label: 'Ice & Water Shield',
    value: rolls,
    unit: 'rolls',
    cost: rolls * pricePerRoll
  });
}
```

**Materials Using Unit Specs:**
- ✅ Ice & Water Shield: **200 sq ft/roll** (variable via `getCustomUnitValue`)

**Benefits Already Realized:**
- Users can configure rolls with 150, 200, or 225 sq ft coverage
- Database-driven via `custom_materials.metadata.unitSpec`

---

### 2. 🟡 FLOORING CALCULATOR
**File:** `src/components/pricing/FlooringCalculator.tsx`

#### Materials Needing Unit Specifications

##### **Underlayment (Line 407)**
**Current Code:**
```typescript
const underlaymentRolls = Math.ceil(areaWithWaste / 100); // Typical 100 sq ft rolls
```

**Required Change:**
```typescript
const rollCoverage = getCustomUnitValue('Underlayment', 100, 'underlayment');
const underlaymentRolls = Math.ceil(areaWithWaste / rollCoverage);
```

**Hardcoded Value:** 100 sq ft/roll
**Variable Values:** 100, 150, 200 sq ft/roll
**Impact:** High - very common material

---

##### **Transition Strips (Line 427)**
**Current Code:**
```typescript
const stripsNeeded = Math.ceil(transitionStripLength / 4); // 4ft strips
```

**Required Change:**
```typescript
const stripLength = getCustomUnitValue('Transition Strips', 4, 'trim');
const stripsNeeded = Math.ceil(transitionStripLength / stripLength);
```

**Hardcoded Value:** 4 ft/piece
**Variable Values:** 3, 4, 6, 8 ft/piece
**Impact:** Medium - used when floors transition

---

**Implementation Priority:** **HIGH**
**Estimated Complexity:** **Low** (2 straightforward replacements)

---

### 3. 🟢 DRYWALL CALCULATOR
**File:** `src/components/pricing/DrywallCalculator.tsx`

#### Analysis
**NO UNIT SPECIFICATIONS NEEDED**

The drywall calculator uses sheets directly with no variable coverage:
- Sheets: Calculated per area (line 136)
- Screws: Per sheet calculation (line 141)
- Mud: Coverage is fixed at 100 sq ft/gallon (line 143)
- Tape: Coverage is estimation-based (line 144)

**Reasoning:** Drywall sheet sizes are standard (4x8, 4x12) and don't vary in coverage per box.

---

### 4. 🟢 HVAC CALCULATOR
**File:** `src/components/pricing/HVACCalculator.tsx`

#### Analysis
**NO UNIT SPECIFICATIONS NEEDED**

HVAC uses equipment pricing, not material quantities:
- Equipment: Per-ton pricing (lines 208-220)
- Ductwork: Linear pricing per foot (lines 274-299)
- Components: Single-unit pricing

**Reasoning:** HVAC is service/equipment-based, not material coverage-based.

---

### 5. 🟡 ELECTRICAL CALCULATOR
**File:** `src/components/pricing/ElectricalCalculator.tsx`

#### Materials Needing Unit Specifications

##### **Wire Rolls (Line 228-238)**
**Current Code:**
```typescript
const wireRollLength = circuit.wireType === 'ser' ? 125 : 250;
const wiringRuns = circuit.voltage === 240 ? 3 : 2;
const totalWireLength = circuit.length * wiringRuns * 1.2; // 20% extra for bends and connections
const wireRollsNeeded = Math.ceil(totalWireLength / wireRollLength);
```

**Required Change:**
```typescript
const baseWireRollLength = circuit.wireType === 'ser' ? 125 : 250;
const wireRollLength = getCustomUnitValue(
  `${circuit.wireGauge} AWG ${circuit.wireType.toUpperCase()}`,
  baseWireRollLength,
  'wire'
);
const wiringRuns = circuit.voltage === 240 ? 3 : 2;
const totalWireLength = circuit.length * wiringRuns * 1.2;
const wireRollsNeeded = Math.ceil(totalWireLength / wireRollLength);
```

**Hardcoded Values:**
- NM-B/THHN/UF-B: 250 ft/roll
- SER: 125 ft/roll

**Variable Values:** 100, 125, 250, 500 ft/roll
**Impact:** Medium - wire comes in various roll lengths

---

##### **Conduit Lengths (Line 244)**
**Current Code:**
```typescript
const conduitPieces = Math.ceil(conduitLength / 10);
```

**Required Change:**
```typescript
const conduitPieceLength = getCustomUnitValue(
  `${circuit.conduitType} Conduit`,
  10,
  'conduit'
);
const conduitPieces = Math.ceil(conduitLength / conduitPieceLength);
```

**Hardcoded Value:** 10 ft/piece
**Variable Values:** 10, 20 ft/piece
**Impact:** Low - most conduit is 10ft standard

---

**Implementation Priority:** **MEDIUM**
**Estimated Complexity:** **Medium** (dynamic wire type/gauge combinations)

---

### 6. 🟢 PLUMBING CALCULATOR
**File:** `src/components/pricing/PlumbingCalculator.tsx`

#### Analysis
**NO UNIT SPECIFICATIONS NEEDED**

Plumbing uses linear/per-piece pricing:
- Pipes: Price per foot (lines 248-288)
- Fittings: Price per piece (lines 290-346)
- Fixtures: Unit pricing (lines 56-105)

**Reasoning:** Plumbing materials are priced per linear foot or per piece, not in coverage-based packages.

---

### 7. 🟡 PAINT CALCULATOR
**File:** `src/components/pricing/PaintCalculator.tsx`

#### Materials Needing Unit Specifications

##### **Paint Coverage (Line 216-217)**
**Current Code:**
```typescript
const coveragePerGallon = paintInfo.coverage; // From activePaintPrices
```

**Current Implementation (Lines 142-150):**
```typescript
interior: {
  economy: {
    gallon: getCustomPrice('Interior Paint - Economy', 25.98, 'paint'),
    coverage: getCustomUnitValue('Interior Paint - Economy', 400, 'paint')
  },
  standard: {
    gallon: getCustomPrice('Interior Paint - Standard', 35.98, 'paint'),
    coverage: getCustomUnitValue('Interior Paint - Standard', 400, 'paint')
  },
  premium: {
    gallon: getCustomPrice('Interior Paint - Premium', 45.98, 'paint'),
    coverage: getCustomUnitValue('Interior Paint - Premium', 400, 'paint')
  }
}
```

**✅ ALREADY IMPLEMENTED!** Paint calculator already uses `getCustomUnitValue` for coverage.

---

##### **Primer Coverage (Line 243)**
**Current Code:**
```typescript
const primerGallons = Math.ceil(areaWithWaste / 400); // Primer typically covers 400 sq ft
```

**Required Change:**
```typescript
const primerCoverage = getCustomUnitValue(
  `${paintLocation === 'interior' ? 'Interior' : 'Exterior'} Primer`,
  400,
  'primer'
);
const primerGallons = Math.ceil(areaWithWaste / primerCoverage);
```

**Hardcoded Value:** 400 sq ft/gallon
**Variable Values:** 350, 400, 450 sq ft/gallon
**Impact:** Medium - primer coverage varies by type

---

**Implementation Priority:** **HIGH**
**Estimated Complexity:** **Low** (1 simple replacement, paint already done)

---

### 8. 🟡 TILE CALCULATOR
**File:** `src/components/pricing/TileCalculator.tsx`

#### Materials Needing Unit Specifications

##### **Mortar Coverage (Line 253)**
**Current Code:**
```typescript
const mortarCoverage = 90; // sq ft per 50lb bag
const mortarBags = Math.ceil(areaWithWaste / mortarCoverage);
```

**Required Change:**
```typescript
const mortarCoverage = getCustomUnitValue(
  `${mortarType} Thinset Mortar`,
  90,
  'mortar'
);
const mortarBags = Math.ceil(areaWithWaste / mortarCoverage);
```

**Hardcoded Value:** 90 sq ft/bag
**Variable Values:** 80, 90, 100 sq ft/bag (depends on trowel size)
**Impact:** Medium - coverage varies by application

---

##### **Grout Coverage (Line 267-271)**
**Current Code:**
```typescript
const groutCoverage = {
  0.125: 200,
  0.25: 150,
  0.375: 100
}[groutWidth];
```

**Required Change:**
```typescript
const baseGroutCoverage = {
  0.125: 200,
  0.25: 150,
  0.375: 100
}[groutWidth];

const groutCoverage = getCustomUnitValue(
  `${groutType} Grout ${groutWidth}"`,
  baseGroutCoverage,
  'grout'
);
```

**Hardcoded Values:**
- 1/8" joints: 200 sq ft/bag
- 1/4" joints: 150 sq ft/bag
- 3/8" joints: 100 sq ft/bag

**Variable Values:** Depends on joint width and tile size
**Impact:** Medium - grout coverage is complex

---

##### **Backer Board (Line 289)**
**Current Code:**
```typescript
const backerBoardSheets = Math.ceil(totalArea / 32); // 32 sq ft per sheet
```

**Required Change:**
```typescript
const sheetCoverage = getCustomUnitValue('Backer Board', 32, 'supplies');
const backerBoardSheets = Math.ceil(totalArea / sheetCoverage);
```

**Hardcoded Value:** 32 sq ft/sheet (3x5 ft sheets)
**Variable Values:** 16, 32 sq ft (different sheet sizes)
**Impact:** Low - usually standard 3x5 sheets

---

##### **Waterproof Membrane (Line 319)**
**Current Code:**
```typescript
const membraneRolls = Math.ceil(totalArea / 100); // 100 sq ft per roll
```

**Required Change:**
```typescript
const rollCoverage = getCustomUnitValue('Waterproof Membrane', 100, 'supplies');
const membraneRolls = Math.ceil(totalArea / rollCoverage);
```

**Hardcoded Value:** 100 sq ft/roll
**Variable Values:** 75, 100, 150 sq ft/roll
**Impact:** Medium - membrane rolls vary

---

##### **Edge Trim (Line 334)**
**Current Code:**
```typescript
const edgePieces = Math.ceil(edgeLength / 8); // 8ft pieces
```

**Required Change:**
```typescript
const pieceLength = getCustomUnitValue(
  `${edgingType === 'metal' ? 'Metal' : 'Stone'} Edge Trim`,
  8,
  'supplies'
);
const edgePieces = Math.ceil(edgeLength / pieceLength);
```

**Hardcoded Value:** 8 ft/piece
**Variable Values:** 6, 8, 10 ft/piece
**Impact:** Low - edge trim is fairly standard

---

**Implementation Priority:** **MEDIUM**
**Estimated Complexity:** **Medium** (5 materials, some with conditional logic)

---

### 9. 🟢 CONCRETE CALCULATOR
**File:** `src/components/pricing/ConcreteCalculator.tsx`

#### Analysis
**NO UNIT SPECIFICATIONS NEEDED**

Concrete is volume-based:
- Concrete: Cubic yards/meters (lines 123-136)
- Bags: Calculated per volume (line 127)
- Rebar: Linear pricing (line 223)
- Wire Mesh: Sheet-based (line 237)

**Reasoning:** Concrete quantities are calculated from volume, not coverage packages.

---

### 10. 🔴 SIDING CALCULATOR
**File:** `src/components/pricing/SidingCalculator.tsx`

#### Materials Needing Unit Specifications

##### **House Wrap (Line 285-286)**
**Current Code:**
```typescript
const wrapCoverage = getCustomUnitValue('House Wrap', 1000, 'accessories');
const wrapRolls = Math.ceil(totalWallArea / wrapCoverage);
```

**✅ ALREADY IMPLEMENTED!**

---

##### **House Wrap Tape (Line 299-300)**
**Current Code:**
```typescript
const tapeCoverage = getCustomUnitValue('House Wrap Tape', 165, 'accessories');
const tapeRolls = Math.ceil(totalPerimeter / tapeCoverage);
```

**✅ ALREADY IMPLEMENTED!**

---

##### **Foam Insulation (Line 315-316)**
**Current Code:**
```typescript
const insulationCoverage = getCustomUnitValue('Foam Insulation', 100, 'accessories');
const insulationBundles = Math.ceil(totalWallArea / insulationCoverage);
```

**✅ ALREADY IMPLEMENTED!**

---

##### **Starter Strip (Line 331-332)**
**Current Code:**
```typescript
const starterLength = getCustomUnitValue('Starter Strip', 12, 'accessories');
const starterPieces = Math.ceil(totalPerimeter / starterLength);
```

**✅ ALREADY IMPLEMENTED!**

---

##### **J-Channel (Line 347-348)**
**Current Code:**
```typescript
const jChannelLength = getCustomUnitValue('J-Channel', 12.5, 'accessories');
const jChannelPieces = Math.ceil((totalOpeningsPerimeter + totalPerimeter) / jChannelLength);
```

**✅ ALREADY IMPLEMENTED!**

---

##### **Corner Posts (Line 364-365)**
**Current Code:**
```typescript
const cornerPostLength = getCustomUnitValue('Corner Posts', 10, 'accessories');
const cornerPosts = Math.ceil((cornerHeight * 4) / cornerPostLength);
```

**✅ ALREADY IMPLEMENTED!**

---

##### **Fasteners (Line 399-400)**
**Current Code:**
```typescript
const fastenerBoxCount = getCustomUnitValue('Siding Fasteners', 1000, 'accessories');
const fastenerBoxes = Math.ceil((squaresNeeded * fastenersPerSquare) / fastenerBoxCount);
```

**✅ ALREADY IMPLEMENTED!**

---

**Implementation Priority:** **COMPLETE**
**Estimated Complexity:** **N/A** (Already done)

---

## Implementation Priority Order

### Phase 1: HIGH Priority (Immediate)
1. **Flooring Calculator** - 2 materials (Low complexity)
2. **Paint Calculator** - 1 material (Low complexity)

### Phase 2: MEDIUM Priority (Next sprint)
3. **Tile Calculator** - 5 materials (Medium complexity)
4. **Electrical Calculator** - 2 materials (Medium complexity)

### Phase 3: LOW Priority (Future consideration)
5. **Drywall, HVAC, Plumbing, Concrete** - Not needed

---

## Code Pattern Reference

### Standard Implementation Pattern

```typescript
// BEFORE (Hardcoded)
const rolls = Math.ceil(area / 100); // 100 sq ft per roll

// AFTER (Unit Spec)
const rollCoverage = getCustomUnitValue('Material Name', 100, 'category');
const rolls = Math.ceil(area / rollCoverage);
```

### Database Schema
**Table:** `custom_materials`
**Field:** `metadata.unitSpec`
**Format:** `"200 sqft/roll"` or `"12 ft/piece"`

**Parsing Function:** `customCalculatorService.parseUnitSpec(unitSpec)`

---

## Testing Checklist

For each material updated:
- [ ] Default value calculation works without custom materials
- [ ] Custom unit spec overrides hardcoded value correctly
- [ ] Results display correct unit labels
- [ ] Edge cases handled (zero, very large, very small values)
- [ ] Database integration tested (create, update, delete custom materials)

---

## Database Migration Requirements

**None required** - The `custom_materials.metadata` field is already a JSONB column that supports `unitSpec`.

Example data:
```json
{
  "name": "Ice & Water Shield",
  "category": "underlayment",
  "price": 70.00,
  "metadata": {
    "unitSpec": "200 sqft/roll"
  }
}
```

---

## Rollout Strategy

1. **Phase 1** (Week 1): Implement Flooring + Paint (3 materials total)
2. **Phase 2** (Week 2): Implement Tile + Electrical (7 materials total)
3. **Testing** (Week 3): Full regression testing across all calculators
4. **Documentation** (Week 3): Update user docs with unit spec capabilities

---

## Summary Statistics

| Status | Calculators | Materials | Complexity |
|--------|-------------|-----------|------------|
| ✅ Already Done | 2 (Roofing, Siding) | 8 | N/A |
| 🟡 Needs Implementation | 4 (Flooring, Paint, Tile, Electrical) | 10 | Low-Medium |
| 🟢 Not Needed | 4 (Drywall, HVAC, Plumbing, Concrete) | 0 | N/A |
| **TOTAL** | **10** | **18** | **Mixed** |

---

## Conclusion

The unit specifications feature is **partially implemented** with 2 calculators (Roofing, Siding) already supporting it. The remaining work involves 4 calculators with 10 materials requiring straightforward replacements following the established pattern.

**Estimated Total Development Time:** 8-12 hours
**Estimated Testing Time:** 4-6 hours
**Total Project Timeline:** 2-3 weeks with proper testing

The implementation is low-risk as it follows existing patterns and doesn't require schema changes.
