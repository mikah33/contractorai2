# Recalculate Feature - Code Reference

## Key Code Snippets

### 1. EstimateGenerator.tsx - Recalculate Handler

```typescript
const handleRecalculate = (estimate: any) => {
  if (!estimate.calculatorType) {
    alert('This estimate was not created with a calculator');
    return;
  }
  // Navigate to pricing calculator with calculator type and estimate ID
  navigate(`/pricing?calculator=${estimate.calculatorType}&estimateId=${estimate.id}`);
};
```

### 2. EstimateGenerator.tsx - Table Row with Calculator Badge

```tsx
<tr key={estimate.id} className="hover:bg-gray-50">
  <td className="px-6 py-4">
    <div className="flex items-center gap-2">
      <div>
        <div className="text-sm font-medium text-gray-900">{estimate.client}</div>
        <div className="text-sm text-gray-500">{estimate.project}</div>
      </div>
      {estimate.calculatorType && (
        <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-blue-100 text-blue-800"
              title={`Created with ${estimate.calculatorType} calculator`}>
          <Calculator className="w-3 h-3 mr-1" />
          {estimate.calculatorType}
        </span>
      )}
    </div>
  </td>
  {/* ... other columns ... */}
  <td className="px-6 py-4 text-right text-sm font-medium">
    <div className="flex items-center justify-end space-x-3">
      {estimate.calculatorType && (
        <button
          onClick={() => handleRecalculate(estimate)}
          className="text-blue-600 hover:text-blue-900"
          title="Recalculate in Calculator"
        >
          <Calculator className="w-4 h-4" />
        </button>
      )}
      {/* ... other action buttons ... */}
    </div>
  </td>
</tr>
```

### 3. PricingCalculator.tsx - Load Estimate from URL

```typescript
useEffect(() => {
  const loadEstimateFromParams = async () => {
    const calculatorType = searchParams.get('calculator');
    const estimateId = searchParams.get('estimateId');

    if (calculatorType && estimateId) {
      setLoadingEstimate(true);
      try {
        // Find the trade by calculator type
        const trade = availableTrades.find(t => t.id === calculatorType);
        if (!trade) {
          alert(`Calculator type "${calculatorType}" not found or not enabled`);
          return;
        }

        // Load the estimate
        const result = await estimateService.getEstimate(estimateId);
        if (result.success && result.data) {
          // Set the trade
          setSelectedTrade(trade);
          setShowSpecializedCalculator([...].includes(trade.id));

          // Set editing mode
          setEditingEstimateId(estimateId);

          // Load calculator data if available
          if (result.data.calculatorData) {
            setSpecifications(result.data.calculatorData);

            // Convert items to calculation results
            const calcResults = result.data.items.map((item: any) => ({
              label: item.description,
              value: item.quantity,
              unit: item.unit,
              cost: item.totalPrice
            }));
            setCalculatorResults(calcResults);
            setCalculationComplete(true);
          }
        }
      } catch (error) {
        console.error('Error loading estimate:', error);
      } finally {
        setLoadingEstimate(false);
      }
    }
  };

  if (!loadingPreferences && availableTrades.length > 0) {
    loadEstimateFromParams();
  }
}, [searchParams, loadingPreferences, availableTrades]);
```

### 4. PricingCalculator.tsx - Save/Update Estimate

```typescript
const handleSaveToEstimate = async () => {
  if (!selectedTrade || calculatorResults.length === 0) {
    alert('Please complete the calculation first');
    return;
  }

  const estimateData = {
    id: editingEstimateId || undefined,
    title: `${selectedTrade.name} Estimate`,
    items: calculatorResults.map((result, index) => ({
      id: `item-${index}`,
      description: result.label,
      quantity: result.value,
      unit: result.unit,
      unitPrice: result.cost ? result.cost / result.value : 0,
      totalPrice: result.cost || 0,
      type: 'material' as const
    })),
    subtotal: calculatorResults.reduce((sum, r) => sum + (r.cost || 0), 0),
    calculatorType: selectedTrade.id,
    calculatorData: specifications
  };

  // Navigate to estimate generator with the data
  navigate('/estimates', {
    state: {
      fromCalculator: true,
      calculatorData: estimateData
    }
  });
};
```

### 5. PricingCalculator.tsx - Edit Mode Indicator

```tsx
{editingEstimateId && (
  <div className="mb-4 p-3 bg-blue-50 border border-blue-200 rounded-md">
    <p className="text-sm text-blue-800 font-medium">Editing Estimate</p>
    <p className="text-xs text-blue-600 mt-1">Make changes and click "Update Estimate" to save</p>
  </div>
)}
```

### 6. PricingCalculator.tsx - Dynamic Button Text

```tsx
<button
  onClick={handleSaveToEstimate}
  className="inline-flex items-center justify-center px-3 py-2 text-sm font-medium text-white bg-blue-600 border border-transparent rounded-md shadow-sm hover:bg-blue-700"
>
  <Save className="w-4 h-4 mr-2" />
  {editingEstimateId ? 'Update Estimate' : t('calculator.copyToEstimate')}
</button>
```

### 7. Database Migration

```sql
-- Add calculator_type and calculator_data to estimates table
ALTER TABLE public.estimates
ADD COLUMN IF NOT EXISTS calculator_type TEXT,
ADD COLUMN IF NOT EXISTS calculator_data JSONB;

-- Add index for calculator_type
CREATE INDEX IF NOT EXISTS idx_estimates_calculator_type
ON public.estimates(calculator_type);
```

### 8. Type Definition

```typescript
export interface Estimate {
  id: string;
  title: string;
  // ... other fields ...
  calculatorType?: string;       // Type of calculator used
  calculatorData?: any;          // Original calculator input data
}
```

### 9. Service Layer - Save

```typescript
const estimateData = {
  // ... other fields ...
  calculator_type: estimate.calculatorType || null,
  calculator_data: estimate.calculatorData || null,
};
```

### 10. Service Layer - Transform

```typescript
const transformedEstimate: Estimate = {
  // ... other fields ...
  calculatorType: estimate.calculator_type || undefined,
  calculatorData: estimate.calculator_data || undefined
};
```

## Import Statements Required

### EstimateGenerator.tsx
```typescript
import { Calculator } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
```

### PricingCalculator.tsx
```typescript
import { Save } from 'lucide-react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { estimateService } from '../services/estimateService';
```

## State Variables Added

### PricingCalculator.tsx
```typescript
const navigate = useNavigate();
const [searchParams] = useSearchParams();
const [editingEstimateId, setEditingEstimateId] = useState<string | null>(null);
const [loadingEstimate, setLoadingEstimate] = useState(false);
```

## Files Modified Summary

1. **supabase/migrations/20250117000001_add_calculator_fields_to_estimates.sql** - NEW
2. **src/types/estimates.ts** - Updated interface
3. **src/services/estimateService.ts** - 3 functions updated
4. **src/stores/estimateStore.ts** - 3 functions updated
5. **src/pages/EstimateGenerator.tsx** - Added recalculate button and badge
6. **src/pages/PricingCalculator.tsx** - Major updates for edit mode

## Testing URLs

```
# Create new estimate
/pricing

# Edit existing estimate (concrete calculator)
/pricing?calculator=concrete&estimateId=123e4567-e89b-12d3-a456-426614174000

# Edit existing estimate (roofing calculator)
/pricing?calculator=roofing&estimateId=123e4567-e89b-12d3-a456-426614174000
```
