# Recalculate Functionality - Implementation Summary

## Overview
Added recalculate functionality to the Estimates page, allowing users to reload calculator estimates back into the pricing calculator for editing and recalculation.

## Changes Made

### 1. Database Migration
**File:** `/supabase/migrations/20250117000001_add_calculator_fields_to_estimates.sql`
- Added `calculator_type` column (TEXT) to store the calculator ID (e.g., 'concrete', 'roofing')
- Added `calculator_data` column (JSONB) to store original calculator input parameters
- Added index on `calculator_type` for faster queries

### 2. Type Definitions
**File:** `/src/types/estimates.ts`
- Added `calculatorType?: string` field
- Added `calculatorData?: any` field

### 3. Estimate Service Updates
**File:** `/src/services/estimateService.ts`
- Updated `saveEstimate()` to include calculator_type and calculator_data
- Updated `getEstimate()` to return calculator_type and calculator_data
- Updated `getEstimates()` to include calculator fields in transformed data

### 4. Estimate Store Updates
**File:** `/src/stores/estimateStore.ts`
- Added calculator_type and calculator_data to Estimate interface
- Updated `addEstimate()` to save calculator fields
- Updated `createFromCalculator()` to save calculator fields

### 5. EstimateGenerator Page (Estimates List)
**File:** `/src/pages/EstimateGenerator.tsx`

**Features Added:**
- Calculator badge display on estimates created from calculators
- Recalculate button (Calculator icon) in action menu
- `handleRecalculate()` function to navigate to calculator with estimate ID

**UI Changes:**
- Added Calculator icon import from lucide-react
- Added calculator badge in estimate row showing calculator type
- Added recalculate button before Edit button
- Badge shows calculator type (e.g., "concrete", "roofing")

### 6. PricingCalculator Page Updates
**File:** `/src/pages/PricingCalculator.tsx`

**Features Added:**
1. **URL Parameter Handling:**
   - Checks for `calculator` and `estimateId` query parameters
   - Automatically loads estimate and selects correct calculator
   - Pre-populates calculator with saved data

2. **Edit Mode:**
   - Shows "Editing Estimate" banner when loading from estimate
   - Changes "Copy to Estimate" button to "Update Estimate"
   - Tracks `editingEstimateId` state

3. **Save to Estimate:**
   - New `handleSaveToEstimate()` function
   - Saves calculator type and input data
   - Navigates to estimate generator with calculator data
   - Supports both create new and update existing

**UI Changes:**
- Added Save icon import
- Added loading state for estimate loading
- Added editing mode indicator banner
- Updated button text based on edit mode

## User Flow

### Creating an Estimate from Calculator
1. User goes to Pricing Calculator
2. Selects a calculator type (e.g., Concrete)
3. Fills in specifications
4. Clicks Calculate
5. Clicks "Copy to Estimate"
6. System saves estimate with calculator_type and calculator_data
7. Navigates to Estimate Generator with data populated

### Recalculating an Existing Estimate
1. User views Estimates list
2. Sees calculator badge on estimates created from calculators
3. Clicks Recalculate button (Calculator icon)
4. System navigates to `/pricing?calculator=concrete&estimateId=123`
5. PricingCalculator automatically:
   - Loads the estimate
   - Selects the correct calculator
   - Pre-fills all calculator inputs
   - Shows "Editing Estimate" banner
6. User can modify inputs and recalculate
7. Clicks "Update Estimate" to save changes
8. Returns to Estimate Generator with updated data

## Technical Implementation Details

### URL Structure
```
/pricing?calculator={calculator_type}&estimateId={estimate_id}
```

Example:
```
/pricing?calculator=concrete&estimateId=a1b2c3d4-e5f6-7890-abcd-ef1234567890
```

### Data Flow
1. **Estimate Creation:**
   ```typescript
   {
     calculatorType: "concrete",
     calculatorData: {
       projectType: "foundation",
       length: 50,
       width: 30,
       thickness: 4,
       // ... other inputs
     }
   }
   ```

2. **Estimate Retrieval:**
   ```typescript
   const estimate = await estimateService.getEstimate(id);
   // estimate.calculatorType = "concrete"
   // estimate.calculatorData = { ... }
   ```

3. **Calculator Pre-population:**
   ```typescript
   setSpecifications(estimate.calculatorData);
   setSelectedTrade(trade);
   setEditingEstimateId(estimateId);
   ```

### Calculator Type Mapping
The calculator type corresponds to trade IDs:
- `concrete` → Concrete Calculator
- `roofing` → Roofing Calculator
- `deck` → Deck Calculator
- `drywall` → Drywall Calculator
- etc.

## Testing Checklist

- [ ] Create new estimate from calculator
- [ ] Verify calculator_type is saved
- [ ] Verify calculator_data is saved
- [ ] View estimates list
- [ ] See calculator badge on calculator estimates
- [ ] Click recalculate button
- [ ] Verify correct calculator loads
- [ ] Verify inputs are pre-filled
- [ ] Modify inputs and recalculate
- [ ] Click "Update Estimate"
- [ ] Verify estimate is updated
- [ ] Verify original estimate ID is maintained
- [ ] Test with multiple calculator types
- [ ] Test with estimates NOT from calculators (no badge/button shown)

## Benefits

1. **User Experience:**
   - Easy to modify calculator-based estimates
   - No need to re-enter all data
   - Visual indicator of calculator-created estimates

2. **Data Integrity:**
   - Preserves original calculation inputs
   - Maintains audit trail of calculations
   - Supports estimate versioning

3. **Workflow Efficiency:**
   - Quick adjustments to estimates
   - Seamless calculator-to-estimate flow
   - Bidirectional editing capability

## Future Enhancements

1. Version history tracking
2. Comparison between original and recalculated
3. Bulk recalculation for multiple estimates
4. Calculator-specific notes/metadata
5. Auto-recalculate on data updates
