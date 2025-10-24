# AI Calculator - Complete Implementation Plan

## Current Status
- ✅ Concrete Calculator (full)
- ✅ Roofing Calculator (full)
- ✅ Decking Calculator (basic)
- ❌ 18 remaining calculators

## Implementation Strategy

Due to the complexity of all 21 calculators, we'll implement them in **simplified versions** that use reasonable industry-standard pricing. Users can later customize pricing through their calculator configurations.

### Simplified Calculator Approach
Each calculator will have:
1. **Basic parameters** (dimensions, quantities)
2. **Material type options** (common types)
3. **Industry-standard pricing** (reasonable defaults)
4. **Key add-ons** (essential optional items)

## Calculator Implementation List

### Phase 1: High-Demand Calculators (Priority)
1. **Flooring** - Area, material type (hardwood/laminate/vinyl/carpet), wastage
2. **Tile** - Area, tile size, pattern, mortar/grout
3. **Paint** - Walls/area, coats, primer, paint quality
4. **Drywall** - Area, sheet size, mud/tape/screws

### Phase 2: Construction Essentials
5. **Framing** - Linear feet, stud spacing, lumber type
6. **Siding** - Area, material type (vinyl/fiber cement/wood)
7. **Foundation** - Linear feet, depth, rebar, concrete
8. **Excavation** - Cubic yards, depth, soil type

### Phase 3: Specialty Trades
9. **Electrical** - Outlets, switches, fixtures, wire
10. **Plumbing** - Fixtures, pipes, fittings
11. **HVAC** - Sq footage, system type, ductwork
12. **Doors & Windows** - Count, size, type

### Phase 4: Exterior & Finishing
13. **Gutters** - Linear feet, material, downspouts
14. **Fencing** - Linear feet, height, material
15. **Pavers** - Area, paver size, sand/gravel base
16. **Veneer** - Area, material type, mortar
17. **Retaining Wall** - Linear feet, height, block type
18. **Junk Removal** - Volume (cubic yards), weight

## Pricing Sources

All pricing based on 2024/2025 industry averages:
- Home Depot / Lowe's retail pricing
- RS Means Construction Data
- National averages for materials and labor
- Regional variations NOT included (users customize)

## Next Steps

1. Create simplified calculation functions for all 18 remaining calculators
2. Add function definitions to Edge Function tools array
3. Update system prompt with examples for each calculator type
4. Deploy and test
5. Phase 2: Add database integration for user custom pricing

## Estimated Completion
- Implementation: 4-6 hours
- Testing: 1-2 hours
- Deployment & verification: 1 hour

**Total: 6-9 hours for complete basic implementation**
