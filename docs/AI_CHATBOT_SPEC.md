# AI Calculator Chatbot - Technical Specification

## Overview
Replace rigid form-based calculators with a conversational AI interface that:
- Uses natural language to gather estimate requirements
- Leverages existing calculator logic (read-only pricing)
- Allows custom line items (permits, labor, fees, materials)
- Remembers user preferences (brands, rates, common materials)
- Generates estimates using proven calculation functions

## Key Principles

### 🔒 Base Pricing = Read-Only
- AI **cannot modify** your standard material pricing
- Uses existing calculator logic for known materials
- Ensures consistency and profitability

### ⚡ Custom Items = Flexible
- Contractors can add **any** line item
- Custom pricing for special cases
- One-off fees (permits, disposal, etc.)
- Premium labor rates

### 🧠 Memory System
- Remembers user preferences across estimates
- Learns common materials/brands used
- Saves labor rates and markup preferences
- No need to re-enter common data

## Database Schema

### Extended `calculator_estimates` Table
```sql
-- New columns added:
custom_line_items JSONB      -- AI-added custom items
price_overrides JSONB         -- User price overrides
ai_conversation_history JSONB -- Chat history
```

### New `user_calculator_preferences` Table
```sql
id UUID
user_id UUID
preference_key TEXT          -- e.g., 'preferred_decking_brand'
preference_value JSONB       -- flexible storage
category TEXT                -- 'materials', 'labor', 'general'
last_used_at TIMESTAMPTZ
```

## Data Structures

### Custom Line Item Format
```typescript
interface CustomLineItem {
  id: string;
  name: string;              // "Building Permit", "Premium Labor"
  quantity: number;          // 1, 40 hours, etc.
  unit: string;              // "permit", "hour", "linear foot"
  unitPrice: number;         // Price per unit
  totalPrice: number;        // quantity × unitPrice
  type: 'material' | 'labor' | 'permit' | 'fee' | 'other';
  notes?: string;
}
```

### Price Override Format
```typescript
interface PriceOverride {
  itemKey: string;           // e.g., 'trex-transcend-20ft'
  standardPrice: number;     // Your locked price: $136
  customPrice: number;       // User's negotiated price: $120
  reason?: string;           // "Bulk discount from supplier"
}
```

### User Preference Format
```typescript
interface UserPreference {
  preferenceKey: string;     // 'preferred_decking_brand'
  preferenceValue: {
    brand: string;           // "Trex Transcend"
    pricePerUnit: number;    // 136.00
    unit: string;            // "20ft board"
    lastUsed: string;        // "2025-01-15"
  };
  category: 'materials' | 'labor' | 'general';
}
```

## AI Function Calling

### Available Functions for AI

#### 1. Calculator Functions (Read-Only Pricing)
```typescript
calculateDeckMaterials(inputs: {
  length: number;
  width: number;
  deckingType: string;      // Uses YOUR pricing
  joistSize: string;
  // ... other standard inputs
}) => MaterialList

calculateConcreteMaterials(inputs: {...})
calculateRoofingMaterials(inputs: {...})
// ... 21 calculator functions total
```

#### 2. Custom Item Functions
```typescript
addCustomLineItem(item: {
  name: string;
  quantity: number;
  unit: string;
  unitPrice: number;
  type: string;
})

addLaborCost(hours: number, rate: number, description?: string)
addPermitFee(amount: number, description?: string)
addCustomMaterial(name: string, quantity: number, unitPrice: number, unit: string)
```

#### 3. Preference Functions
```typescript
getUserPreference(key: string) => PreferenceValue | null
saveUserPreference(key: string, value: any, category: string)
getRecentMaterials(limit: number) => Material[]
```

#### 4. Estimate Functions
```typescript
saveEstimate(name: string, clientId?: string)
loadEstimate(id: string)
getEstimateSummary() => EstimateSummary
```

## Conversation Flow Examples

### Example 1: Standard Deck with Custom Labor

```
User: "I need an estimate for a deck"

AI: "I'd be happy to help! What are the dimensions of the deck?"

User: "25 feet by 25 feet"

AI: "Great! What type of decking material would you like to use?
     I see you've used Trex Transcend in the past - would you like
     to use that again at $136 per 20ft board?"

User: "Yes, and add 50 hours of labor at $95/hour"

AI: "Perfect! Let me calculate that for you:

     📊 ESTIMATE BREAKDOWN

     Materials (Standard Pricing):
     - Trex Transcend (20ft): 45 boards × $136 = $6,120
     - 2x10 Joists (16ft): 15 pcs × $32.98 = $494.70
     - Joist Hangers: 15 pcs × $1.98 = $29.70
     - Deck Screws: 3 boxes × $39.98 = $119.94

     Custom Labor:
     - Premium Installation: 50 hrs × $95 = $4,750

     TOTAL: $11,514.34

     Would you like to add anything else? (permit, railing, stairs, etc.)"

User: "Add a $250 building permit"

AI: "Added! New total: $11,764.34. What would you like to name this estimate?"

User: "Johnson Deck - 123 Main St"

AI: "✅ Saved as 'Johnson Deck - 123 Main St'. I've also saved your
     preference for $95/hour labor rate for future estimates."
```

### Example 2: Custom Materials

```
User: "I need an estimate for a deck with special composite decking
      I sourced myself - it's $145 per 16ft board"

AI: "Got it! I'll use your custom decking at $145 per 16ft board.
     What are the deck dimensions?"

User: "20 by 30 feet"

AI: "Calculating with custom decking...

     Custom Materials:
     - Custom Composite Decking (16ft): 52 boards × $145 = $7,540

     Standard Materials:
     - 2x10 Joists: 18 pcs × $32.98 = $593.64
     - Hardware: $165.50

     Would you like standard labor or custom rate?"

User: "Standard labor is fine"

AI: [Adds standard labor based on calculator logic]
```

## Technical Implementation

### Tech Stack
- **AI Provider**: Anthropic Claude 3.5 Sonnet (via API)
- **Framework**: Vercel AI SDK
- **Backend**: Supabase Edge Functions
- **Frontend**: React Chat Component
- **State**: Zustand + React Query

### File Structure
```
/src/components/ai-calculator/
  ├── AIChatbot.tsx              # Main chat interface
  ├── ChatMessage.tsx            # Message bubble component
  ├── EstimateSummary.tsx        # Live estimate preview
  └── ChatInput.tsx              # User input field

/src/lib/ai/
  ├── chatbot-config.ts          # AI system prompt & config
  ├── function-definitions.ts    # Available functions for AI
  └── calculator-wrapper.ts      # Wraps calculators for AI use

/src/hooks/
  ├── useAIChat.ts               # Chat state management
  └── useUserPreferences.ts      # Preference CRUD

/supabase/functions/
  └── ai-calculator-chat/
      └── index.ts               # Edge function for AI calls
```

### Cost Analysis
- **API Costs**: ~$0.02-0.05 per estimate conversation
- **Expected Volume**: 1,000 estimates/month = $20-50/month
- **Compared to**: Form maintenance time savings >> API costs

## Security & Safety

### What AI Can Do ✅
- Read calculator pricing (can't modify)
- Add custom line items with user-provided prices
- Save/load estimates
- Remember user preferences
- Ask clarifying questions

### What AI Cannot Do ❌
- Modify base calculator pricing
- Access other users' data (RLS enforced)
- Execute arbitrary code
- Modify database schema
- Change system configuration

## Rollout Plan

### Phase 1: Prototype (Week 1)
- [ ] Basic chat UI
- [ ] Integration with 1 calculator (Deck)
- [ ] Custom line items
- [ ] Save/load estimates

### Phase 2: Full Integration (Week 2)
- [ ] All 21 calculators integrated
- [ ] User preference system
- [ ] Conversation memory
- [ ] Mobile responsive UI

### Phase 3: Enhancement (Week 3)
- [ ] Multi-estimate comparison
- [ ] PDF export from chat
- [ ] Voice input support
- [ ] Spanish language support

## Success Metrics
- Time to create estimate: < 2 minutes (vs 5-10 minutes with forms)
- User satisfaction: > 90% prefer chat vs forms
- Error rate: < 5% (AI misunderstanding requirements)
- Adoption rate: 80%+ of users switch to chat interface

## Future Enhancements
- Image upload for measurements (AI vision)
- Integration with Google Maps for site analysis
- Automatic material price updates from suppliers
- Predictive material suggestions based on project type
