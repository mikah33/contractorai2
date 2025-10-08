# Claude-Flow Swarm: Customer-Friendly Calculator Widget Generation

## Mission
Create 19 customer-friendly HTML calculator widgets (concrete, deck, drywall, etc.) based on the existing roofing.html template. Each widget must use simple language, hide pricing breakdowns, include ContractorAI branding, and integrate with the widget validation system.

## Context
- **Template**: `/widget/roofing.html` (already working with validation)
- **React Calculators**: `/src/components/pricing/*Calculator.tsx` (20 calculators exist)
- **Widget Key System**: One universal key validates all calculators
- **Validation Function**: `widget-validate` Edge Function (already deployed)
- **Target Audience**: Homeowners/customers (NOT contractors)

## Swarm Initialization
```bash
/claude-flow-swarm init --topology hierarchical --agents 6 --strategy adaptive
```

## Agent Roles

### 1. **Coordinator Agent** (Queen/Orchestrator)
**Capabilities**: [`task-coordination`, `progress-tracking`, `quality-assurance`]
**Responsibilities**:
- Assign each calculator to specialist agents
- Track completion of all 19 widgets
- Ensure consistency across all widgets
- Final review and approval

### 2. **Template Architect** (x1)
**Capabilities**: [`html-structure`, `validation-integration`, `design-systems`]
**Responsibilities**:
- Extract reusable template structure from roofing.html
- Create base template with placeholders for calculator-specific logic
- Ensure validation system integration
- Define customer-friendly language guidelines

### 3. **React-to-HTML Converter Agents** (x3)
**Capabilities**: [`react-analysis`, `vanilla-js`, `form-generation`]
**Responsibilities**:
- Analyze React calculator components in `/src/components/pricing/`
- Convert React logic to vanilla JavaScript
- Simplify input fields with customer-friendly labels
- Each agent handles 6-7 calculators

**Agent A - Construction Calculators**:
- Concrete, Foundation, Framing, Excavation, Retaining Walls, Deck

**Agent B - Exterior Calculators**:
- Siding, Paint, Gutter, Fencing, Pavers, Tile

**Agent C - Interior & Systems Calculators**:
- Drywall, Flooring, Doors/Windows, Electrical, Plumbing, HVAC, Junk Removal

### 4. **Customer Language Specialist** (x1)
**Capabilities**: [`copywriting`, `simplification`, `customer-psychology`]
**Responsibilities**:
- Review all calculator labels and descriptions
- Replace contractor jargon with simple terms
- Create helpful tooltips and explanations
- Ensure consistent friendly tone

### 5. **Quality Assurance Tester** (x1)
**Capabilities**: [`testing`, `validation`, `debugging`]
**Responsibilities**:
- Test each widget with the universal widget key
- Verify validation system works
- Check calculations are accurate
- Ensure mobile responsiveness

## Customer-Friendly Transformation Rules

### Language Simplification
**BEFORE (Contractor Language)**:
- "Square footage coverage"
- "Linear feet of materials"
- "Cubic yards required"
- "R-value insulation rating"
- "Gauge specifications"

**AFTER (Customer Language)**:
- "How big is your space?"
- "Length needed"
- "Amount of material"
- "Insulation quality"
- "Material thickness"

### Pricing Display
- **REMOVE**: Itemized pricing breakdowns, cost-per-unit, markup percentages
- **KEEP**: Total estimated cost only
- **ADD**: "Get a detailed quote" call-to-action

### Form Fields
- Use dropdowns instead of text input where possible
- Add helper text under each field
- Use imperial units by default (feet, inches) with metric option
- Include visual examples/diagrams where helpful

### Branding
- Add "Powered by ContractorAI" footer
- Use ContractorAI color scheme (purple gradient)
- Include small logo if available
- Add trust signals ("Trusted by 10,000+ contractors")

## Technical Requirements

### Widget Structure (Base Template)
```html
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>[Calculator Type] Cost Calculator | ContractorAI</title>
    <style>
        /* ContractorAI Branding Colors */
        :root {
            --primary: #667eea;
            --secondary: #764ba2;
            --success: #10b981;
            --error: #ef4444;
        }
        /* Customer-friendly design... */
    </style>
</head>
<body>
    <div class="container">
        <h1>[Calculator Type] Cost Calculator</h1>
        <p class="subtitle">Get an instant estimate for your [project type]</p>

        <!-- Calculator Form -->
        <div id="calculator-section" class="calc-section">
            <!-- Calculator-specific inputs here -->
        </div>

        <!-- Results Section -->
        <div id="results-section" class="calc-section results">
            <h2>Your Estimated Cost</h2>
            <div class="total-cost">$<span id="total-amount">0</span></div>
            <p class="disclaimer">This is an estimate. Final costs may vary.</p>
            <button class="cta-button">Get a Detailed Quote</button>
        </div>

        <!-- Branding Footer -->
        <div class="branding-footer">
            <p>Powered by <strong>ContractorAI</strong></p>
            <p class="trust-signal">Trusted by 10,000+ contractors nationwide</p>
        </div>
    </div>

    <script>
        // Validation system (from roofing.html)
        let subscriptionValid = false;

        async function validateWidget() {
            const urlParams = new URLSearchParams(window.location.search);
            const widgetKey = urlParams.get('key');

            if (!widgetKey) {
                showError('Missing widget key');
                return false;
            }

            const cleanKey = widgetKey.trim();

            try {
                const response = await fetch('https://ujhgwcurllkkeouzwvgk.supabase.co/functions/v1/widget-validate', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'apikey': 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InVqaGd3Y3VybGxra2VvdXp3dmdrIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTcwMzIzMjQsImV4cCI6MjA3MjYwODMyNH0.ez6RDJ2FxgSfb7mo2Xug1lXaynKLR-2nJFO-x64UNnY',
                        'Authorization': 'Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InVqaGd3Y3VybGxra2VvdXp3dmdrIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTcwMzIzMjQsImV4cCI6MjA3MjYwODMyNH0.ez6RDJ2FxgSfb7mo2Xug1lXaynKLR-2nJFO-x64UNnY'
                    },
                    body: JSON.stringify({
                        widgetKey: cleanKey,
                        calculatorType: '[CALCULATOR_TYPE]',
                        domain: window.location.hostname,
                        referer: document.referrer || null
                    })
                });

                const data = await response.json();

                if (data.valid) {
                    subscriptionValid = true;
                    return true;
                } else {
                    showError('Invalid Widget: This calculator is not properly configured.');
                    return false;
                }
            } catch (error) {
                console.error('Validation error:', error);
                showError('Calculator temporarily unavailable.');
                return false;
            }
        }

        // Run validation on page load
        window.addEventListener('DOMContentLoaded', async () => {
            const isValid = await validateWidget();
            if (!isValid) {
                const inputs = document.querySelectorAll('input, select, button');
                inputs.forEach(input => input.disabled = true);
            }
        });

        // Calculator-specific logic here
        function calculateEstimate() {
            if (!subscriptionValid) return;

            // Get input values
            // Perform calculations
            // Display results
        }
    </script>
</body>
</html>
```

### Validation Integration
- Each widget MUST call `validateWidget()` on load
- Use calculator type in validation: `calculatorType: 'concrete'`, `calculatorType: 'deck'`, etc.
- Disable all inputs if validation fails

### File Naming Convention
- `widget/concrete.html`
- `widget/deck.html`
- `widget/drywall.html`
- etc. (match CALCULATORS array in CalculatorWidgets.tsx)

## Deliverables

For each of the 19 calculators, create:
1. ✅ Customer-friendly HTML widget file
2. ✅ Simplified input form with helper text
3. ✅ Calculation logic (vanilla JavaScript)
4. ✅ Results display (total cost only, no breakdowns)
5. ✅ Validation integration
6. ✅ ContractorAI branding
7. ✅ Mobile-responsive design

## Success Criteria
- [ ] All 19 widget HTML files created in `/widget/` directory
- [ ] Each widget validates with universal widget key
- [ ] Language is simple and customer-friendly (no jargon)
- [ ] Calculations match React calculator logic
- [ ] All widgets are mobile-responsive
- [ ] ContractorAI branding consistently applied
- [ ] No pricing breakdowns shown (total only)
- [ ] Each widget tested and working

## Execution Order
1. **Coordinator** initializes swarm and assigns calculators
2. **Template Architect** creates base template
3. **React-to-HTML Converters** (parallel) convert their assigned calculators
4. **Customer Language Specialist** reviews and refines all text
5. **QA Tester** validates all 19 widgets
6. **Coordinator** performs final review and reports completion

## Swarm Workflow
```bash
# Initialize swarm
/claude-flow-swarm init --topology hierarchical --agents 6

# Spawn agents
/claude-flow-swarm spawn coordinator --capabilities task-coordination,progress-tracking
/claude-flow-swarm spawn template-architect --capabilities html-structure,validation
/claude-flow-swarm spawn converter-a --capabilities react-analysis,vanilla-js
/claude-flow-swarm spawn converter-b --capabilities react-analysis,vanilla-js
/claude-flow-swarm spawn converter-c --capabilities react-analysis,vanilla-js
/claude-flow-swarm spawn language-specialist --capabilities copywriting,simplification
/claude-flow-swarm spawn qa-tester --capabilities testing,validation

# Execute task
/claude-flow-swarm orchestrate "Create 19 customer-friendly calculator widgets" --strategy adaptive --priority critical
```

## Notes
- Use roofing.html as the gold standard template
- Keep all widgets under 1000 lines of code
- Use inline CSS for portability
- No external dependencies (vanilla JS only)
- Test with actual widget key: `wk_live_wncmt12ubnzqi577gy6cg7cd`

---

**Ready to execute?** Run this prompt through claude-flow to spawn the swarm and generate all 19 customer-friendly calculator widgets!
