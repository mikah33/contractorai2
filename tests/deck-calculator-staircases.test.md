# Deck Calculator - Multiple Staircases Feature Test

## Feature Overview
The Deck Calculator now supports multiple staircases (1-4) with individual configuration for each staircase.

## Changes Made

### 1. State Management
- **Removed**: Single staircase state variables (`heightAboveGrade`, `stairWidth`, `stairRun`)
- **Added**:
  - `numberOfStaircases`: Number (1-4)
  - `staircases`: Array of staircase objects with properties:
    - `width`: number
    - `heightAboveGrade`: number
    - `stairRun`: 10 | 12

### 2. UI Updates
- Added dropdown to select number of staircases (1-4)
- Each staircase now has its own configuration section with:
  - Height above grade input
  - Stair width input
  - Stair run selector (10" or 12")
- Staircases are displayed in bordered sections with clear labels
- Multiple staircases show "Staircase 1", "Staircase 2", etc.

### 3. Calculation Logic
- Updated `handleCalculate()` to loop through all staircases
- Each staircase calculates materials independently
- Results are labeled with staircase number when multiple exist
- All costs are aggregated into the total

### 4. Form Validation
- Updated validation to check all staircases have valid data
- Uses `staircases.every(s => s.heightAboveGrade > 0 && s.width > 0)`

## Test Cases

### Test 1: Single Staircase
1. Check "Include Stairs"
2. Leave number of staircases at 1
3. Enter:
   - Height above grade: 48 inches
   - Stair width: 48 inches
   - Stair run: 10 inches
4. Calculate
5. **Expected**: Should show stair calculations without staircase number labels

### Test 2: Multiple Staircases (2)
1. Check "Include Stairs"
2. Select "2 Staircases"
3. Configure Staircase 1:
   - Height: 48 inches
   - Width: 48 inches
   - Run: 10 inches
4. Configure Staircase 2:
   - Height: 36 inches
   - Width: 36 inches
   - Run: 12 inches
5. Calculate
6. **Expected**:
   - Should show results labeled "(Staircase 1)" and "(Staircase 2)"
   - Each staircase should have independent calculations
   - Total cost should include materials for both staircases

### Test 3: Validation
1. Check "Include Stairs"
2. Select "3 Staircases"
3. Fill only Staircase 1 and 2, leave Staircase 3 empty
4. **Expected**: Calculate button should be disabled
5. Fill all 3 staircases
6. **Expected**: Calculate button should be enabled

### Test 4: Dynamic Staircase Count Change
1. Check "Include Stairs"
2. Select "3 Staircases"
3. Fill all 3 staircases with data
4. Change to "2 Staircases"
5. **Expected**: Third staircase inputs should disappear
6. Change back to "3 Staircases"
7. **Expected**: Third staircase should reappear with default values (width: 36, height: 0, run: 10)

## Implementation Notes

### File Modified
- `/Users/mikahalbertson/Claude-Main-Mind/projects/ContractorAI-Main-App/src/components/pricing/DeckCalculator.tsx`

### Key Code Sections

#### State (Lines 187-196)
```typescript
const [includeStairs, setIncludeStairs] = useState(false);
const [numberOfStaircases, setNumberOfStaircases] = useState<number>(1);
const [staircases, setStaircases] = useState<Array<{
  width: number;
  heightAboveGrade: number;
  stairRun: 10 | 12;
}>>([{ width: 36, heightAboveGrade: 0, stairRun: 10 }]);
```

#### Calculation Loop (Lines 383-440)
```typescript
if (includeStairs) {
  staircases.forEach((staircase, index) => {
    const { width: stairWidth, heightAboveGrade, stairRun } = staircase;
    // ... calculations for each staircase
  });
}
```

#### UI Controls (Lines 779-878)
- Dropdown for number of staircases
- Map over staircases array to render individual configuration sections
- Dynamic labels based on number of staircases

## Build Status
✅ Build successful - no TypeScript errors
✅ No compilation warnings related to this feature
✅ All dependencies resolved correctly

## Next Steps for Manual Testing
1. Start the development server: `npm run dev`
2. Navigate to the Deck Calculator
3. Test all scenarios listed above
4. Verify calculations are accurate
5. Check UI responsiveness and usability

## Known Limitations
- Maximum 4 staircases supported
- Minimum stair width is 36 inches (code validates this)
- Each staircase must have both height and width > 0 to be valid
