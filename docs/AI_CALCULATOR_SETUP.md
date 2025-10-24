# AI Calculator Setup Guide

## Quick Start

The AI Calculator chatbot has been implemented! Follow these steps to get it running:

## 1. Database Migration

Run the SQL migration to add AI chatbot fields:

```bash
# The migration file is at:
supabase/migrations/20250123000000_add_ai_chatbot_fields.sql

# Or run directly in Supabase SQL Editor (already copied to your clipboard)
```

This adds:
- `custom_line_items` column to `calculator_estimates`
- `price_overrides` column for custom pricing
- `ai_conversation_history` for chat memory
- `user_calculator_preferences` table for AI memory

## 2. Get Anthropic API Key

1. Go to https://console.anthropic.com/
2. Create an account or sign in
3. Navigate to API Keys
4. Create a new API key
5. Copy the key (starts with `sk-ant-...`)

## 3. Add Environment Variables

### Local Development (.env.local)
```bash
ANTHROPIC_API_KEY=sk-ant-your-key-here
NEXT_PUBLIC_SUPABASE_URL=your-supabase-url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-supabase-anon-key
```

### Supabase Edge Function Secrets
```bash
# Set the secret for the edge function
supabase secrets set ANTHROPIC_API_KEY=sk-ant-your-key-here
```

## 4. Deploy Supabase Edge Function

```bash
cd git/contractorai/contractorai2

# Deploy the edge function
supabase functions deploy ai-calculator-chat

# Test it
supabase functions serve ai-calculator-chat
```

## 5. Add Route to App

Add the AI Calculator page to your routing:

### Update `src/App.tsx` or router config:
```typescript
import AICalculator from './pages/AICalculator';

// Add route:
<Route path="/ai-calculator" element={<AICalculator />} />
```

### Add to Sidebar Navigation:
```typescript
{
  name: 'AI Calculator',
  path: '/ai-calculator',
  icon: Bot,
}
```

## 6. Test the Chatbot

1. Start your dev server:
```bash
npm run dev
```

2. Navigate to `/ai-calculator`

3. Try example conversations:
   - "I need an estimate for a 25x25 deck"
   - "Add 40 hours of labor at $85/hour"
   - "Include a $250 building permit"

## File Structure

```
src/
├── components/ai-calculator/
│   └── AIChatbot.tsx              # Main chat component
├── pages/
│   └── AICalculator.tsx           # Page wrapper
├── lib/ai/
│   ├── chatbot-config.ts          # AI system prompt
│   └── function-definitions.ts    # Available AI functions

supabase/
├── functions/
│   └── ai-calculator-chat/
│       └── index.ts               # Edge function handler
└── migrations/
    └── 20250123000000_add_ai_chatbot_fields.sql
```

## Features Implemented

### ✅ Conversational Interface
- Natural language input
- Context-aware responses
- Multi-turn conversations

### ✅ Standard Calculator Integration
- Uses existing calculator logic
- Read-only pricing (protected)
- Accurate material calculations

### ✅ Custom Line Items
- Permits and fees
- Custom labor rates
- Special materials
- One-off expenses

### ✅ Real-time Estimate Preview
- Live updating estimate panel
- Clear cost breakdown
- Standard vs custom items marked

### ✅ Memory System (Ready)
- Database schema created
- User preference functions defined
- Ready to save/load preferences

## Next Steps

### Phase 2 Enhancements:
1. **Connect all 21 calculators** - Currently only deck is wired up
2. **Implement preference memory** - Save user's common materials/rates
3. **Add estimate saving** - Wire up to existing estimate system
4. **PDF export** - Generate PDFs from chat conversations

### Phase 3 Features:
1. **Voice input** - Speech-to-text for mobile
2. **Image upload** - AI vision for measurements
3. **Multi-language** - Spanish support
4. **Advanced memory** - Learn contractor patterns

## Cost Estimates

### Anthropic Claude API Pricing:
- **Model**: Claude 3.5 Sonnet
- **Input**: $3 per million tokens
- **Output**: $15 per million tokens

### Typical Conversation:
- ~1,000 input tokens
- ~500 output tokens
- **Cost per estimate**: $0.01 - $0.05

### Monthly Costs:
- 100 estimates/month: $1-5
- 1,000 estimates/month: $10-50
- 10,000 estimates/month: $100-500

## Troubleshooting

### API Errors
```
Error: ANTHROPIC_API_KEY not found
```
**Solution**: Set the environment variable in `.env.local` and Supabase secrets

### Function Not Found
```
Error: Function ai-calculator-chat not found
```
**Solution**: Deploy the edge function with `supabase functions deploy`

### CORS Errors
```
Access-Control-Allow-Origin error
```
**Solution**: Edge function includes CORS headers - check Supabase function logs

## Support

For issues or questions:
1. Check `docs/AI_CHATBOT_SPEC.md` for detailed specs
2. Review edge function logs in Supabase Dashboard
3. Test with Supabase Functions CLI: `supabase functions serve`

## Security Notes

### What AI Can Do ✅
- Read calculator pricing (can't modify)
- Add custom line items with user prices
- Save/load estimates
- Remember preferences

### What AI Cannot Do ❌
- Modify base pricing
- Access other users' data
- Execute arbitrary code
- Change system configuration

All data access is protected by Supabase Row Level Security (RLS).
