# Custom Materials Implementation Summary

## Overview
This document summarizes the implementation status and requirements for custom materials support across all 19 calculator components. The goal is to allow users to switch between default materials/pricing and custom materials from the database.

## Reference Pattern (from DeckCalculator.tsx)
```typescript
import { useCalculatorTab } from '../../contexts/CalculatorTabContext';
import { useCustomCalculator } from '../../hooks/useCustomCalculator';

// Inside component:
const { activeTab } = useCalculatorTab();
const { materials: customMaterials, pricing: customPricing, loading: loadingCustom, isConfigured } =
  useCustomCalculator('calculator-type', activeTab === 'custom');

const activeMaterialTypes = useMemo(() => {
  if (activeTab === 'custom' && isConfigured && customMaterials.length > 0) {
    const customItems = customMaterials
      .filter(m => m.category === 'material-category')
      .map(m => ({
        value: m.id,
        label: m.name,
        price: m.metadata?.price_per_unit || 0
      }));
    return customItems.length > 0 ? customItems : defaultMaterialTypes;
  }
  return defaultMaterialTypes;
}, [activeTab, isConfigured, customMaterials]);

useEffect(() => {
  if (activeTab === 'custom' && isConfigured && activeMaterialTypes.length > 0) {
    setMaterialType(activeMaterialTypes[0].value);
  } else if (activeTab === 'default' && defaultMaterialTypes.length > 0) {
    setMaterialType(defaultMaterialTypes[0].value);
  }
}, [activeTab, isConfigured, activeMaterialTypes]);
```

## Calculator Status by Implementation Type

### Type 1: Already Implemented (1 calculator)
**RoofingCalculator.tsx** - ✅ COMPLETE
- Has custom pricing implemented (useCustomPricing state)
- Custom material name and price per square inputs
- No additional changes needed

### Type 2: Need Full Custom Materials Pattern (8 calculators)

#### 1. **ConcreteCalculator.tsx** - 🔄 PARTIAL
**Current State**: Has addon pricing (color, fiber) but no custom materials from database
**Calculator Type**: `'concrete'`
**Material Categories Needed**:
- `concrete-mix` - for concrete type selection
**Implementation**:
- Import hooks and context
- Add activeConcreteMixes useMemo
- Add useEffect for auto-selection
- Replace deliveryMethod dropdown with custom materials support
- Add loading/not-configured states

#### 2. **SidingCalculator.tsx** - ❌ NOT STARTED
**Calculator Type**: `'siding'`
**Material Categories Needed**:
- `siding-material` - for siding type
- `siding-trim` - for trim type
**Implementation**:
- Full pattern implementation needed
- Replace sidingType dropdown
- Replace trimType dropdown
- Add null checks in calculations

#### 3. **FramingCalculator.tsx** - ❌ NOT STARTED
**Calculator Type**: `'framing'`
**Material Categories Needed**:
- `framing-lumber` - for lumber types
- `framing-fasteners` - for fasteners
**Implementation**: Full pattern needed

#### 4. **PaintCalculator.tsx** - ❌ NOT STARTED
**Calculator Type**: `'paint'`
**Material Categories Needed**:
- `paint-type` - for paint selection
- `paint-primer` - for primer selection
**Implementation**: Full pattern needed

#### 5. **FlooringCalculator.tsx** - ❌ NOT STARTED
**Calculator Type**: `'flooring'`
**Material Categories Needed**:
- `flooring-material` - for flooring type
- `flooring-underlayment` - for underlayment
**Implementation**: Full pattern needed

#### 6. **TileCalculator.tsx** - ❌ NOT STARTED
**Calculator Type**: `'tile'`
**Material Categories Needed**:
- `tile-material` - for tile selection
- `tile-grout` - for grout type
**Implementation**: Full pattern needed

#### 7. **DrywallCalculator.tsx** - ❌ NOT STARTED
**Calculator Type**: `'drywall'`
**Material Categories Needed**:
- `drywall-sheets` - for drywall type
- `drywall-compound` - for joint compound
**Implementation**: Full pattern needed

#### 8. **FencingCalculator.tsx** - ❌ NOT STARTED
**Calculator Type**: `'fencing'`
**Material Categories Needed**:
- `fencing-material` - for fence material
- `fencing-posts` - for post type
**Implementation**: Full pattern needed

### Type 3: Simple Pricing Override (2 calculators)

#### 9. **PaversCalculator.tsx** - ❌ NOT STARTED
**Current State**: Has cost per sq ft input
**Calculator Type**: `'pavers'`
**Implementation**: Add pricing override from customPricing, simpler than full pattern

#### 10. **VeneerCalculator.tsx** - ❌ NOT STARTED
**Current State**: Has cost per sq ft input
**Calculator Type**: `'veneer'`
**Implementation**: Add pricing override from customPricing, simpler than full pattern

### Type 4: Complex Calculators with Object-Based Materials (6 calculators)

#### 11. **HVACCalculator.tsx** - ❌ NOT STARTED
**Calculator Type**: `'hvac'`
**Material Categories Needed**:
- `hvac-units` - for AC/furnace units
- `hvac-ducts` - for ductwork
**Complexity**: Has rooms array and duct calculations
**Implementation**: Custom approach needed, integrate with unit objects

#### 12. **ElectricalCalculator.tsx** - ❌ NOT STARTED
**Calculator Type**: `'electrical'`
**Material Categories Needed**:
- `electrical-panels` - for panel types
- `electrical-wire` - for wire types
**Complexity**: Has circuits array
**Implementation**: Custom approach for wire and panel pricing

#### 13. **GutterCalculator.tsx** - ❌ NOT STARTED
**Calculator Type**: `'gutter'`
**Material Categories Needed**:
- `gutter-material` - for gutter types
- `gutter-guards` - for guard types
**Complexity**: Has gutterMaterials object with nested properties
**Implementation**: Replace gutterMaterials object with custom materials

#### 14. **FoundationCalculator.tsx** - ❌ NOT STARTED
**Calculator Type**: `'foundation'`
**Material Categories Needed**:
- `foundation-concrete` - for concrete strength types
- `foundation-rebar` - for reinforcement
**Complexity**: Multiple foundation types, complex calculations
**Implementation**: Pricing override for concrete and rebar

#### 15. **RetainingWallCalculator.tsx** - ❌ NOT STARTED
**Calculator Type**: `'retaining-wall'`
**Material Categories Needed**:
- `wall-blocks` - for block types
- `wall-drainage` - for drainage materials
**Complexity**: Has blockSpecs object, boulder wall mode
**Implementation**: Replace blockSpecs with custom materials

#### 16. **PlumbingCalculator.tsx** - ❌ NOT STARTED
**Calculator Type**: `'plumbing'`
**Material Categories Needed**:
- `plumbing-fixtures` - for fixtures
- `plumbing-pipe` - for pipe materials
**Complexity**: Has fixtures array and piping runs
**Implementation**: Complex, needs pricing override for multiple material types

### Type 5: Item-Based Calculators (2 calculators)

#### 17. **JunkRemovalCalculator.tsx** - ❌ NOT STARTED
**Calculator Type**: `'junk-removal'`
**Material Categories Needed**:
- `junk-pricing` - for pricing overrides
**Complexity**: Has commonItems object with categories
**Implementation**: Simpler, mainly pricing override for base rates

#### 18. **DoorsWindowsCalculator.tsx** - ❌ NOT STARTED
**Calculator Type**: `'doors-windows'`
**Material Categories Needed**:
- `door-types` - for door pricing
- `window-types` - for window pricing
**Complexity**: Has openings array with doorStyles and windowStyles objects
**Implementation**: Complex, needs custom materials for both doors and windows

## Implementation Priority

### High Priority (Simple Patterns)
1. PaversCalculator - Simple pricing override
2. VeneerCalculator - Simple pricing override
3. SidingCalculator - Standard material dropdown pattern
4. FramingCalculator - Standard material dropdown pattern

### Medium Priority (Standard Patterns)
5. PaintCalculator
6. FlooringCalculator
7. TileCalculator
8. DrywallCalculator
9. FencingCalculator
10. ConcreteCalculator (complete the partial implementation)

### Lower Priority (Complex Patterns)
11. HVACCalculator
12. ElectricalCalculator
13. GutterCalculator
14. FoundationCalculator
15. RetainingWallCalculator
16. PlumbingCalculator
17. JunkRemovalCalculator
18. DoorsWindowsCalculator

## Key Implementation Steps (For Each Calculator)

### Step 1: Import Required Hooks
```typescript
import { useCalculatorTab } from '../../contexts/CalculatorTabContext';
import { useCustomCalculator } from '../../hooks/useCustomCalculator';
```

### Step 2: Add Hooks at Component Top
```typescript
const { activeTab } = useCalculatorTab();
const { materials: customMaterials, pricing: customPricing, loading: loadingCustom, isConfigured } =
  useCustomCalculator('calculator-type', activeTab === 'custom');
```

### Step 3: Create useMemo for Active Materials
```typescript
const activeMaterialTypes = useMemo(() => {
  if (activeTab === 'custom' && isConfigured && customMaterials.length > 0) {
    const customItems = customMaterials
      .filter(m => m.category === 'appropriate-category')
      .map(m => ({
        value: m.id,
        label: m.name,
        price: m.metadata?.price_per_unit || 0
      }));
    return customItems.length > 0 ? customItems : defaultMaterialTypes;
  }
  return defaultMaterialTypes;
}, [activeTab, isConfigured, customMaterials]);
```

### Step 4: Create useMemo for Active Pricing
```typescript
const activePricing = useMemo(() => {
  if (activeTab === 'custom' && customPricing) {
    return customPricing;
  }
  return null;
}, [activeTab, customPricing]);
```

### Step 5: Add useEffect for Auto-Selection
```typescript
useEffect(() => {
  if (activeTab === 'custom' && isConfigured && activeMaterialTypes.length > 0) {
    setMaterialType(activeMaterialTypes[0].value);
  } else if (activeTab === 'default' && defaultMaterialTypes.length > 0) {
    setMaterialType(defaultMaterialTypes[0].value);
  }
}, [activeTab, isConfigured, activeMaterialTypes]);
```

### Step 6: Add Loading State
```typescript
if (loadingCustom) {
  return (
    <div className="bg-white p-6 rounded-lg shadow-md animate-fade-in flex items-center justify-center min-h-[400px]">
      <div className="text-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-orange-500 mx-auto mb-4"></div>
        <p className="text-slate-600">Loading calculator configuration...</p>
      </div>
    </div>
  );
}
```

### Step 7: Add Not-Configured State
```typescript
if (activeTab === 'custom' && !isConfigured) {
  return (
    <div className="bg-white p-6 rounded-lg shadow-md animate-fade-in">
      <div className="text-center py-12">
        <h3 className="text-lg font-semibold text-slate-800 mb-2">
          Custom Materials Not Configured
        </h3>
        <p className="text-slate-600 mb-4">
          Please add custom materials in the Business Settings page.
        </p>
      </div>
    </div>
  );
}
```

### Step 8: Update Material/Pricing References
Replace all references to default materials/pricing with activeMaterialTypes/activePricing

### Step 9: Add Null Checks
Add null checks in calculations to prevent "Cannot read properties of undefined" errors:
```typescript
const selectedMaterial = activeMaterialTypes.find(m => m.value === materialType);
const price = selectedMaterial?.price || 0;
```

## Material Category Naming Convention

Follow this pattern for material categories in the database:
- Format: `{calculator-type}-{material-purpose}`
- Examples:
  - `deck-boards`
  - `roofing-shingles`
  - `concrete-mix`
  - `siding-material`
  - `flooring-material`

## Testing Checklist

For each updated calculator, verify:
- [ ] Default tab works with default materials
- [ ] Custom tab loads custom materials from database
- [ ] Loading state displays correctly
- [ ] Not-configured state displays correctly
- [ ] Material dropdown updates when switching tabs
- [ ] Selected material auto-resets when switching tabs
- [ ] Calculations use correct pricing based on tab
- [ ] No "Cannot read properties of undefined" errors
- [ ] Save/load functionality works with both default and custom materials

## Next Steps

1. Complete implementation for high-priority calculators (simple patterns)
2. Test thoroughly with database custom materials
3. Move to medium-priority calculators (standard patterns)
4. Handle complex calculators with custom approaches
5. Update all calculator tests to cover custom materials functionality

## Notes

- RoofingCalculator already has a different custom pricing approach (inline custom price inputs) which works well and doesn't need to be changed
- Some calculators may need hybrid approaches (e.g., ConcreteCalculator with both custom materials and addon pricing)
- Material categories in the database must match the categories used in each calculator's filter logic
- Always maintain backward compatibility with default materials for users who haven't configured custom materials

## Estimated Implementation Time

- Simple patterns (2-4 calculators): 2-4 hours
- Standard patterns (8 calculators): 8-12 hours
- Complex patterns (8 calculators): 12-16 hours
- **Total**: 22-32 hours of development time

---

*Document created: 2025-01-21*
*Last updated: 2025-01-21*
