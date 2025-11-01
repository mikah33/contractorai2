# AI Calculator Enhancement - Phase 2 Plan

## Current Status (Phase 1 - Completed)
- ✅ Added roofing calculator function with default pricing
- ✅ Fixed price edit behavior to preserve unaffected line items
- ✅ Improved concrete calculations with proper parameter support

## Phase 2: Full Calculator Integration

### 1. Database Integration
- Fetch user's custom calculator configurations from `custom_calculator_configs`
- Load custom materials and pricing from `custom_materials` and `custom_pricing` tables
- Pass user-specific pricing to all calculation functions

### 2. Additional Calculator Functions
Add calculation functions for all 21 trade types:
- Decking (already exists)
- Concrete (already exists)
- Roofing (Phase 1 - basic)
- **TODO**: Flooring, Tile, Paint, Drywall, Framing, Plumbing, Electrical, HVAC, Siding, Gutters, Fencing, Pavers, Veneer, Foundation, Excavation, Retaining Wall, Doors & Windows, Junk Removal

### 3. Smart Price Suggestions
- When user doesn't specify prices, fetch from their calculator configs
- Fall back to industry standard pricing if not configured
- Learn from user's past estimates

### 4. Context Awareness
- Remember materials/prices used in previous estimates within the session
- Suggest relevant add-ons based on project type (permits, labor, etc.)
- Track which calculators user has configured

### 5. Enhanced Natural Language
- Better handling of measurement unit conversions
- Support for partial project specs (auto-fill reasonable defaults)
- Multi-project estimates in one conversation

## Implementation Priority
1. Database integration for pricing (HIGH - user requested)
2. Roofing calculator enhancement (HIGH - currently using generic pricing)
3. Remaining calculator functions (MEDIUM)
4. Context awareness (MEDIUM)
5. Advanced NLP features (LOW)

## Estimated Timeline
- Database integration: 2-3 hours
- Remaining calculators: 4-6 hours
- Context/NLP improvements: 3-4 hours
- Testing & refinement: 2-3 hours

**Total: ~12-16 hours of development**
