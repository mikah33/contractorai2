# Calculator to Estimate Import Feature

## Overview

This feature enables seamless import of calculator results (e.g., DeckCalculator) directly into the Estimate Generator, eliminating manual data entry and improving workflow efficiency.

## Implementation Summary

### 1. Enhanced PricingContext (`src/contexts/PricingContext.tsx`)

**New Methods:**
- `saveCalculatorResults(trade, results)` - Saves calculation results to localStorage with timestamp
- `getPendingCalculatorImport()` - Retrieves pending import (auto-expires after 1 hour)
- `clearPendingCalculatorImport()` - Clears the pending import after successful import

**Storage Format:**
```typescript
interface CalculatorImport {
  trade: string;
  results: CalculationResult[];
  timestamp: number;
}
```

### 2. Updated PricingResults Component (`src/components/pricing/PricingResults.tsx`)

**New Features:**
- Added "Import to New Estimate" button (green button with FileText icon)
- Button only appears when `calculationResults` are available
- Clicking the button:
  1. Saves results to localStorage via `saveCalculatorResults()`
  2. Navigates to `/estimates` page
  3. EstimateGenerator automatically detects and imports the data

**UI Changes:**
```tsx
<button onClick={handleImportToEstimate}>
  <FileText className="w-4 h-4 mr-2" />
  Import to New Estimate
</button>
```

### 3. Updated PricingCalculator Page (`src/pages/PricingCalculator.tsx`)

**Changes:**
- Added `calculationResults` prop to `<PricingResults>` component
- Passes calculator results from specialized calculators (DeckCalculator, etc.) to PricingResults

### 4. Enhanced EstimateGenerator Page (`src/pages/EstimateGenerator.tsx`)

**New Import Logic:**
```typescript
useEffect(() => {
  const handleCalculatorImport = () => {
    const pendingImport = getPendingCalculatorImport();

    if (pendingImport && !currentEstimate) {
      // Convert CalculationResult[] to EstimateItem[]
      const items = pendingImport.results
        .filter(result => result.cost && result.cost > 0)
        .map((result, index) => ({
          id: `calc-item-${Date.now()}-${index}`,
          description: result.label,
          quantity: result.value,
          unit: result.unit,
          unitPrice: result.cost / result.value,
          totalPrice: result.cost,
          type: 'material'
        }));

      // Create new estimate with imported items
      const calculatorEstimate = {
        id: generateUUID(),
        title: `${pendingImport.trade} Estimate`,
        items,
        // ... other estimate fields
      };

      setCurrentEstimate(calculatorEstimate);
      clearPendingCalculatorImport();
      alert(`Successfully imported ${items.length} items!`);
    }
  };

  handleCalculatorImport();
}, []);
```

## User Workflow

1. **User calculates materials** in DeckCalculator (or any other specialized calculator)
2. **Results are displayed** in PricingResults component
3. **User clicks "Import to New Estimate"** button
4. **System saves** calculation results to localStorage
5. **User is redirected** to /estimates page
6. **EstimateGenerator detects** pending import on mount
7. **Calculator results are automatically converted** to estimate line items:
   - Each result with a cost becomes an EstimateItem
   - Description = result.label
   - Quantity = result.value
   - Unit = result.unit
   - Unit Price = cost / value
   - Total Price = cost
8. **New estimate is created** with all imported items
9. **Success message** shows number of items imported
10. **User can edit, add more items, or save** the estimate

## Data Conversion

### From CalculationResult to EstimateItem

**Input (CalculationResult):**
```typescript
{
  label: "5/4" Deck Board (16ft)",
  value: 25,
  unit: "16ft boards",
  cost: 549.50
}
```

**Output (EstimateItem):**
```typescript
{
  id: "calc-item-1234567890-0",
  description: "5/4" Deck Board (16ft)",
  quantity: 25,
  unit: "16ft boards",
  unitPrice: 21.98,
  totalPrice: 549.50,
  type: "material"
}
```

## Benefits

1. **Eliminates Manual Entry** - No need to manually type calculator results
2. **Reduces Errors** - Automated conversion prevents typos and calculation mistakes
3. **Saves Time** - Instant import vs. manual data entry
4. **Maintains Context** - Estimate title includes trade name for easy identification
5. **User-Friendly** - One-click import with clear visual feedback
6. **Flexible** - Users can still edit, add, or remove items after import

## File Changes

### Modified Files:
1. `/src/contexts/PricingContext.tsx` - Added import/export methods
2. `/src/components/pricing/PricingResults.tsx` - Added import button
3. `/src/pages/PricingCalculator.tsx` - Pass calculator results to PricingResults
4. `/src/pages/EstimateGenerator.tsx` - Auto-import detection and conversion

### No Database Changes Required
All data transfer happens via localStorage, making it:
- Fast and instantaneous
- No server round-trips needed
- Auto-expires after 1 hour to prevent stale data

## Testing Checklist

- [ ] Calculate materials in DeckCalculator
- [ ] Verify "Import to New Estimate" button appears
- [ ] Click import button
- [ ] Verify navigation to /estimates
- [ ] Verify all calculator items appear in estimate
- [ ] Verify quantities and prices are correct
- [ ] Verify estimate title includes trade name
- [ ] Verify user can edit imported items
- [ ] Verify user can add more items
- [ ] Verify user can save estimate
- [ ] Test with empty calculator results (no costs)
- [ ] Test with multiple calculators (Concrete, Flooring, etc.)

## Future Enhancements

1. **Import to Existing Estimate** - Add items to an existing estimate instead of creating new
2. **Merge Calculators** - Import from multiple calculators into single estimate
3. **Smart Categorization** - Auto-categorize items (Materials, Labor, Equipment)
4. **Price Adjustments** - Allow markup/discount during import
5. **Template Saving** - Save common calculator configurations as templates
