// Contractor AI Calculator System
// 20 Professional Construction Calculators

// Category key mapping for translations
const CATEGORY_KEYS = {
    'Foundation & Structure': 'foundation_structure',
    'Exterior': 'exterior',
    'Interior Systems': 'interior_systems',
    'Interior Finishes': 'interior_finishes',
    'Site Work': 'site_work'
};

const TRADES = [
    { id: 'concrete', name: 'Concrete', icon: '🏗️', category: 'Foundation & Structure' },
    { id: 'roofing', name: 'Roofing', icon: '🏠', category: 'Exterior' },
    { id: 'deck', name: 'Deck', icon: '🪵', category: 'Exterior' },
    { id: 'siding', name: 'Siding', icon: '🏘️', category: 'Exterior' },
    { id: 'fencing', name: 'Fencing', icon: '🚧', category: 'Exterior' },
    { id: 'gutter', name: 'Gutters', icon: '💧', category: 'Exterior' },
    { id: 'electrical', name: 'Electrical', icon: '⚡', category: 'Interior Systems' },
    { id: 'plumbing', name: 'Plumbing', icon: '🚰', category: 'Interior Systems' },
    { id: 'hvac', name: 'HVAC', icon: '❄️', category: 'Interior Systems' },
    { id: 'drywall', name: 'Drywall', icon: '🧱', category: 'Interior Finishes' },
    { id: 'paint', name: 'Painting', icon: '🎨', category: 'Interior Finishes' },
    { id: 'flooring', name: 'Flooring', icon: '📐', category: 'Interior Finishes' },
    { id: 'tile', name: 'Tile', icon: '🔲', category: 'Interior Finishes' },
    { id: 'doors_windows', name: 'Doors & Windows', icon: '🚪', category: 'Interior Finishes' },
    { id: 'foundation', name: 'Foundation', icon: '⚙️', category: 'Foundation & Structure' },
    { id: 'framing', name: 'Framing', icon: '🔨', category: 'Foundation & Structure' },
    { id: 'excavation', name: 'Excavation', icon: '🚜', category: 'Site Work' },
    { id: 'pavers', name: 'Pavers', icon: '🧱', category: 'Site Work' },
    { id: 'retaining_walls', name: 'Retaining Walls', icon: '🧱', category: 'Site Work' },
    { id: 'junk_removal', name: 'Junk Removal', icon: '🗑️', category: 'Site Work' }
];

let currentResults = [];

// Initialize on page load
document.addEventListener('DOMContentLoaded', () => {
    initializeTrades();
});

function initializeTrades() {
    const selector = document.getElementById('trade-selector');
    if (!selector) return;

    // Group trades by category
    const categories = {};
    TRADES.forEach(trade => {
        if (!categories[trade.category]) {
            categories[trade.category] = [];
        }
        categories[trade.category].push(trade);
    });

    // Render categories and trades
    Object.entries(categories).forEach(([category, trades]) => {
        const categoryDiv = document.createElement('div');
        categoryDiv.style.marginBottom = '1.5rem';

        const categoryTitle = document.createElement('h3');
        const categoryKey = CATEGORY_KEYS[category];
        categoryTitle.textContent = t(`calc.category.${categoryKey}`);
        categoryTitle.setAttribute('data-calc-category', categoryKey);
        categoryTitle.style.cssText = 'font-size: 0.875rem; font-weight: 600; color: var(--muted); margin-bottom: 0.5rem; text-transform: uppercase; letter-spacing: 0.05em;';
        categoryDiv.appendChild(categoryTitle);

        trades.forEach(trade => {
            const btn = document.createElement('button');
            btn.textContent = `${trade.icon} ${t(`calc.trade.${trade.id}`)}`;
            btn.className = 'trade-btn';
            btn.setAttribute('data-calc-trade', trade.id);
            btn.onclick = () => loadCalculator(trade.id, trade.name);
            categoryDiv.appendChild(btn);
        });

        selector.appendChild(categoryDiv);
    });
}

// Function to re-translate calculator UI when language changes
function retranslateCalculator() {
    // Update category titles
    document.querySelectorAll('[data-calc-category]').forEach(el => {
        const categoryKey = el.getAttribute('data-calc-category');
        el.textContent = t(`calc.category.${categoryKey}`);
    });

    // Update trade buttons
    document.querySelectorAll('[data-calc-trade]').forEach(el => {
        const tradeId = el.getAttribute('data-calc-trade');
        const trade = TRADES.find(t => t.id === tradeId);
        if (trade) {
            el.textContent = `${trade.icon} ${t(`calc.trade.${tradeId}`)}`;
        }
    });

    // Update all calculator form elements with data-i18n
    document.querySelectorAll('#calculator-container [data-i18n]').forEach(el => {
        const key = el.getAttribute('data-i18n');
        const translation = t(key);

        if (el.tagName === 'INPUT' || el.tagName === 'TEXTAREA') {
            el.placeholder = translation;
        } else {
            el.textContent = translation;
        }
    });
}

function loadCalculator(tradeId, tradeName) {
    // Hide welcome message
    const welcome = document.getElementById('welcome-message');
    if (welcome) welcome.style.display = 'none';

    // Clear previous results
    const resultsContainer = document.getElementById('results-container');
    if (resultsContainer) {
        resultsContainer.style.display = 'none';
        resultsContainer.innerHTML = '';
    }

    const container = document.getElementById('calculator-container');
    if (!container) return;

    // Highlight selected trade
    document.querySelectorAll('.trade-btn').forEach(btn => btn.classList.remove('active'));
    event.target.classList.add('active');

    // Display SEO content if available
    if (typeof displaySEOContent === 'function') {
        displaySEOContent(tradeId);
    }

    // Load calculator based on trade
    switch(tradeId) {
        case 'concrete': renderConcreteCalculator(container, tradeName); break;
        case 'roofing': renderRoofingCalculator(container, tradeName); break;
        case 'deck': renderDeckCalculator(container, tradeName); break;
        case 'siding': renderSidingCalculator(container, tradeName); break;
        case 'fencing': renderFencingCalculator(container, tradeName); break;
        case 'gutter': renderGutterCalculator(container, tradeName); break;
        case 'electrical': renderElectricalCalculator(container, tradeName); break;
        case 'plumbing': renderPlumbingCalculator(container, tradeName); break;
        case 'hvac': renderHVACCalculator(container, tradeName); break;
        case 'drywall': renderDrywallCalculator(container, tradeName); break;
        case 'paint': renderPaintCalculator(container, tradeName); break;
        case 'flooring': renderFlooringCalculator(container, tradeName); break;
        case 'tile': renderTileCalculator(container, tradeName); break;
        case 'doors_windows': renderDoorsWindowsCalculator(container, tradeName); break;
        case 'foundation': renderFoundationCalculator(container, tradeName); break;
        case 'framing': renderFramingCalculator(container, tradeName); break;
        case 'excavation': renderExcavationCalculator(container, tradeName); break;
        case 'pavers': renderPaversCalculator(container, tradeName); break;
        case 'retaining_walls': renderRetainingWallsCalculator(container, tradeName); break;
        case 'junk_removal': renderJunkRemovalCalculator(container, tradeName); break;
        default: container.innerHTML = '<p>Calculator coming soon!</p>';
    }
}

// ============================================================================
// CONCRETE CALCULATOR
// ============================================================================
function renderConcreteCalculator(container, title) {
    const tradeName = t('calc.trade.concrete');
    container.innerHTML = `
        <h2 style="font-size: 1.5rem; font-weight: 700; margin-bottom: 2rem; color: var(--text);" data-calc-title="concrete">${t('calc.title.calculator').replace('{{trade}}', tradeName)}</h2>

        <div style="display: grid; gap: 1.5rem;">
            <div style="display: grid; grid-template-columns: repeat(3, 1fr); gap: 1rem;">
                <div>
                    <label class="calc-label" data-i18n="calc.field.type">${t('calc.field.type')}</label>
                    <select id="concrete-type" class="calc-input">
                        <option value="flatwork" data-i18n="calc.concrete.type.flatwork">${t('calc.concrete.type.flatwork')}</option>
                        <option value="wall" data-i18n="calc.concrete.type.wall">${t('calc.concrete.type.wall')}</option>
                    </select>
                </div>
                <div>
                    <label class="calc-label" data-i18n="calc.field.unit_system">${t('calc.field.unit_system')}</label>
                    <select id="concrete-unit" class="calc-input">
                        <option value="imperial" data-i18n="calc.concrete.unit.imperial">${t('calc.concrete.unit.imperial')}</option>
                        <option value="metric" data-i18n="calc.concrete.unit.metric">${t('calc.concrete.unit.metric')}</option>
                    </select>
                </div>
                <div>
                    <label class="calc-label" data-i18n="calc.field.delivery_method">${t('calc.field.delivery_method')}</label>
                    <select id="concrete-delivery" class="calc-input">
                        <option value="bags" data-i18n="calc.concrete.delivery.bags">${t('calc.concrete.delivery.bags')}</option>
                        <option value="truck" data-i18n="calc.concrete.delivery.truck">${t('calc.concrete.delivery.truck')}</option>
                    </select>
                </div>
            </div>

            <div style="display: grid; grid-template-columns: repeat(3, 1fr); gap: 1rem;">
                <div>
                    <label class="calc-label"><span data-i18n="calc.field.length">${t('calc.field.length')}</span> <span id="length-unit" data-i18n="calc.unit.feet">(${t('calc.unit.feet')})</span></label>
                    <input type="number" id="concrete-length" class="calc-input" min="0" step="0.1" placeholder="${t('calc.placeholder.zero')}">
                </div>
                <div>
                    <label class="calc-label"><span data-i18n="calc.field.width">${t('calc.field.width')}</span> <span id="width-unit" data-i18n="calc.unit.feet">(${t('calc.unit.feet')})</span></label>
                    <input type="number" id="concrete-width" class="calc-input" min="0" step="0.1" placeholder="${t('calc.placeholder.zero')}">
                </div>
                <div>
                    <label class="calc-label"><span id="height-label" data-i18n="calc.field.thickness">${t('calc.field.thickness')}</span> <span id="height-unit" data-i18n="calc.unit.inches">(${t('calc.unit.inches')})</span></label>
                    <input type="number" id="concrete-height" class="calc-input" min="0" step="0.5" placeholder="${t('calc.placeholder.zero')}">
                </div>
            </div>

            <div style="display: grid; grid-template-columns: repeat(2, 1fr); gap: 1rem;">
                <div>
                    <label class="calc-label" data-i18n="calc.concrete.reinforcement">${t('calc.concrete.reinforcement')}</label>
                    <select id="concrete-reinforcement" class="calc-input">
                        <option value="none" data-i18n="calc.concrete.reinforcement.none">${t('calc.concrete.reinforcement.none')}</option>
                        <option value="rebar" data-i18n="calc.concrete.reinforcement.rebar">${t('calc.concrete.reinforcement.rebar')}</option>
                        <option value="mesh" data-i18n="calc.concrete.reinforcement.mesh">${t('calc.concrete.reinforcement.mesh')}</option>
                    </select>
                </div>
                <div id="rebar-spacing-container" style="display: none;">
                    <label class="calc-label"><span data-i18n="calc.concrete.rebar_spacing">${t('calc.concrete.rebar_spacing')}</span> <span id="spacing-unit" data-i18n="calc.unit.inches">(${t('calc.unit.inches')})</span></label>
                    <select id="rebar-spacing" class="calc-input">
                        <option value="12">12 ${t('calc.unit.inches')}</option>
                        <option value="16">16 ${t('calc.unit.inches')}</option>
                        <option value="18">18 ${t('calc.unit.inches')}</option>
                        <option value="24">24 ${t('calc.unit.inches')}</option>
                    </select>
                </div>
                <div id="mesh-type-container" style="display: none;">
                    <label class="calc-label" data-i18n="calc.concrete.mesh_type">${t('calc.concrete.mesh_type')}</label>
                    <select id="mesh-type" class="calc-input">
                        <option value="6x6">6x6 - W2.9 x W2.9</option>
                        <option value="4x4">4x4 - W4.0 x W4.0</option>
                    </select>
                </div>
            </div>

            <button onclick="calculateConcrete()" class="calc-button" data-i18n="calc.button.calculate">${t('calc.button.calculate')}</button>
        </div>
    `;

    // Add event listeners
    document.getElementById('concrete-type').addEventListener('change', updateConcreteLabels);
    document.getElementById('concrete-unit').addEventListener('change', updateConcreteLabels);
    document.getElementById('concrete-reinforcement').addEventListener('change', updateReinforcementOptions);
}

function updateConcreteLabels() {
    const type = document.getElementById('concrete-type').value;
    const unit = document.getElementById('concrete-unit').value;

    document.getElementById('height-label').textContent = type === 'wall' ? t('calc.field.height') : t('calc.field.thickness');
    document.getElementById('length-unit').textContent = unit === 'imperial' ? `(${t('calc.unit.feet')})` : `(${t('calc.unit.meters')})`;
    document.getElementById('width-unit').textContent = unit === 'imperial' ? `(${t('calc.unit.feet')})` : `(${t('calc.unit.meters')})`;
    document.getElementById('height-unit').textContent = unit === 'imperial'
        ? (type === 'wall' ? `(${t('calc.unit.feet')})` : `(${t('calc.unit.inches')})`)
        : (type === 'wall' ? `(${t('calc.unit.meters')})` : `(${t('calc.unit.centimeters')})`);
}

function updateReinforcementOptions() {
    const reinforcement = document.getElementById('concrete-reinforcement').value;
    document.getElementById('rebar-spacing-container').style.display = reinforcement === 'rebar' ? 'block' : 'none';
    document.getElementById('mesh-type-container').style.display = reinforcement === 'mesh' ? 'block' : 'none';
}

function calculateConcrete() {
    // Track calculator usage with Meta Pixel
    if (typeof fbq !== 'undefined') {
        fbq('track', 'InitiateCheckout', {
            content_name: 'Concrete Calculator',
            content_category: 'Calculator',
            value: 39.99,
            currency: 'USD'
        });
    }

    // Show signup modal before calculation
    showSignupModal(() => {
        performConcreteCalculation();
    });
}

function performConcreteCalculation() {
    const type = document.getElementById('concrete-type').value;
    const unit = document.getElementById('concrete-unit').value;
    const delivery = document.getElementById('concrete-delivery').value;
    const length = parseFloat(document.getElementById('concrete-length').value) || 0;
    const width = parseFloat(document.getElementById('concrete-width').value) || 0;
    const height = parseFloat(document.getElementById('concrete-height').value) || 0;
    const reinforcement = document.getElementById('concrete-reinforcement').value;

    if (!length || !width || !height) {
        alert(t('calc.alert.fill_dimensions'));
        return;
    }

    const results = [];
    let volume, volumeUnit, bagsNeeded;

    if (unit === 'imperial') {
        volume = type === 'wall'
            ? (length * width * height) / 27
            : (length * width * (height / 12)) / 27;
        volumeUnit = 'cubic yards';
        bagsNeeded = Math.ceil(volume * 40);
    } else {
        volume = type === 'wall'
            ? length * width * height
            : length * width * (height / 100);
        volumeUnit = 'cubic meters';
        bagsNeeded = Math.ceil(volume * 90);
    }

    results.push({ label: 'Concrete Volume', value: volume.toFixed(2), unit: volumeUnit });

    if (delivery === 'bags') {
        const bagPrice = unit === 'imperial' ? 6.98 : 7.50;
        const bagCost = bagsNeeded * bagPrice;
        results.push({
            label: 'Bags of Concrete',
            value: bagsNeeded,
            unit: unit === 'imperial' ? '60lb bags' : '25kg bags',
            cost: bagCost
        });
    } else {
        const truckPrice = 185;
        const minLoad = 1;
        const deliveryFee = volume < minLoad ? 150 : 0;
        const truckCost = (Math.max(volume, minLoad) * truckPrice) + deliveryFee;
        results.push({
            label: 'Ready-Mix Truck',
            value: Math.max(volume, minLoad).toFixed(2),
            unit: volumeUnit,
            cost: truckCost
        });
    }

    // Reinforcement calculations
    if (reinforcement === 'rebar') {
        const spacing = unit === 'imperial'
            ? parseInt(document.getElementById('rebar-spacing').value) / 12
            : parseInt(document.getElementById('rebar-spacing').value) / 100;
        const area = length * width;
        const lengthBars = Math.ceil(width / spacing) + 1;
        const widthBars = Math.ceil(length / spacing) + 1;
        const totalLength = (length * lengthBars) + (width * widthBars);
        const rebarPrice = unit === 'imperial' ? 8.98 : 9.50;
        const rebarCost = Math.ceil(totalLength / 20) * rebarPrice;

        results.push({
            label: 'Rebar Length',
            value: totalLength.toFixed(2),
            unit: unit === 'imperial' ? 'feet' : 'meters',
            cost: rebarCost
        });
    } else if (reinforcement === 'mesh') {
        const area = length * width;
        const sheetSize = unit === 'imperial' ? 100 : 9.29;
        const sheetsNeeded = Math.ceil(area / sheetSize);
        const meshType = document.getElementById('mesh-type').value;
        const meshPrice = meshType === '6x6' ? 12.98 : 16.98;
        const meshCost = sheetsNeeded * meshPrice;

        results.push({
            label: `${meshType} Mesh Sheets`,
            value: sheetsNeeded,
            unit: 'sheets',
            cost: meshCost
        });
    }

    displayResults(results, 'Concrete');
}

// ============================================================================
// ROOFING CALCULATOR
// ============================================================================
function renderRoofingCalculator(container, title) {
    const tradeName = t('calc.trade.roofing');
    container.innerHTML = `
        <h2 style="font-size: 1.5rem; font-weight: 700; margin-bottom: 2rem; color: var(--text);" data-calc-title="roofing">${t('calc.title.calculator').replace('{{trade}}', tradeName)}</h2>

        <div style="display: grid; gap: 1.5rem;">
            <!-- Address Auto-Detection -->
            <div style="background: linear-gradient(135deg, rgba(255, 107, 53, 0.1), rgba(139, 89, 255, 0.1)); border: 1px solid rgba(255, 107, 53, 0.3); border-radius: 12px; padding: 1.5rem;">
                <div style="display: flex; align-items: center; gap: 0.75rem; margin-bottom: 1rem;">
                    <span style="font-size: 1.5rem;">🛰️</span>
                    <div>
                        <div style="font-weight: 700; font-size: 1.1rem; color: var(--text);">Auto-Detect Roof Size</div>
                        <div style="font-size: 0.875rem; color: var(--muted);">Enter your address to automatically detect roof area</div>
                    </div>
                </div>
                <div style="display: flex; gap: 0.75rem;">
                    <input
                        type="text"
                        id="roof-address"
                        class="calc-input"
                        placeholder="Enter address (e.g., 1717 Faulds Rd, Clearwater, FL)"
                        style="flex: 1;">
                    <button
                        onclick="detectRoofArea()"
                        id="detect-btn"
                        style="padding: 0.75rem 1.5rem; background: linear-gradient(135deg, #ff6b35, #8b59ff); border: none; border-radius: 8px; color: white; font-weight: 700; cursor: pointer; white-space: nowrap; transition: all 0.2s;"
                        onmouseover="this.style.transform='translateY(-2px)'; this.style.boxShadow='0 8px 20px rgba(255,107,53,0.4)'"
                        onmouseout="this.style.transform='translateY(0)'; this.style.boxShadow='none'">
                        Detect Size
                    </button>
                </div>
                <div id="roof-detection-result" style="margin-top: 1rem; display: none;"></div>
            </div>

            <div style="display: grid; grid-template-columns: repeat(3, 1fr); gap: 1rem;">
                <div>
                    <label class="calc-label" data-i18n="calc.roofing.area">${t('calc.roofing.area')} *</label>
                    <input type="number" id="roof-area" class="calc-input" min="0" placeholder="${t('calc.placeholder.enter_sqft')}">
                </div>
                <div>
                    <label class="calc-label" data-i18n="calc.roofing.type">${t('calc.roofing.type')}</label>
                    <select id="roof-type" class="calc-input">
                        <option value="gable" data-i18n="calc.roofing.type.gable">${t('calc.roofing.type.gable')}</option>
                        <option value="hip" data-i18n="calc.roofing.type.hip">${t('calc.roofing.type.hip')}</option>
                        <option value="flat" data-i18n="calc.roofing.type.flat">${t('calc.roofing.type.flat')}</option>
                        <option value="mansard" data-i18n="calc.roofing.type.mansard">${t('calc.roofing.type.mansard')}</option>
                        <option value="gambrel" data-i18n="calc.roofing.type.gambrel">${t('calc.roofing.type.gambrel')}</option>
                        <option value="shed" data-i18n="calc.roofing.type.shed">${t('calc.roofing.type.shed')}</option>
                    </select>
                </div>
                <div>
                    <label class="calc-label" data-i18n="calc.roofing.material">${t('calc.roofing.material')}</label>
                    <select id="roof-material" class="calc-input">
                        <option value="130" data-i18n="calc.roofing.material.asphalt">${t('calc.roofing.material.asphalt')}</option>
                        <option value="575" data-i18n="calc.roofing.material.metal">${t('calc.roofing.material.metal')}</option>
                        <option value="450" data-i18n="calc.roofing.material.tile">${t('calc.roofing.material.tile')}</option>
                        <option value="800" data-i18n="calc.roofing.material.slate">${t('calc.roofing.material.slate')}</option>
                        <option value="280" data-i18n="calc.roofing.material.tpo">${t('calc.roofing.material.tpo')}</option>
                        <option value="220" data-i18n="calc.roofing.material.epdm">${t('calc.roofing.material.epdm')}</option>
                        <option value="400" data-i18n="calc.roofing.material.wood">${t('calc.roofing.material.wood')}</option>
                    </select>
                </div>
            </div>

            <div style="display: grid; grid-template-columns: repeat(4, 1fr); gap: 1rem;">
                <div>
                    <label class="calc-label" data-i18n="calc.roofing.pitch">${t('calc.roofing.pitch')}</label>
                    <select id="roof-pitch" class="calc-input">
                        <option value="1.0" data-i18n="calc.roofing.pitch.low">${t('calc.roofing.pitch.low')}</option>
                        <option value="1.15" selected data-i18n="calc.roofing.pitch.standard">${t('calc.roofing.pitch.standard')}</option>
                        <option value="1.35" data-i18n="calc.roofing.pitch.steep">${t('calc.roofing.pitch.steep')}</option>
                        <option value="1.6" data-i18n="calc.roofing.pitch.very_steep">${t('calc.roofing.pitch.very_steep')}</option>
                    </select>
                </div>
                <div>
                    <label class="calc-label" data-i18n="calc.roofing.stories">${t('calc.roofing.stories')}</label>
                    <select id="roof-stories" class="calc-input">
                        <option value="1.0" data-i18n="calc.roofing.stories.one">${t('calc.roofing.stories.one')}</option>
                        <option value="1.25" data-i18n="calc.roofing.stories.two">${t('calc.roofing.stories.two')}</option>
                        <option value="1.5" data-i18n="calc.roofing.stories.three_plus">${t('calc.roofing.stories.three_plus')}</option>
                    </select>
                </div>
                <div>
                    <label class="calc-label" data-i18n="calc.roofing.layers">${t('calc.roofing.layers')}</label>
                    <input type="number" id="roof-layers" class="calc-input" min="0" value="0" placeholder="0">
                </div>
                <div>
                    <label class="calc-label" data-i18n="calc.roofing.skylights">${t('calc.roofing.skylights')}</label>
                    <input type="number" id="roof-skylights" class="calc-input" min="0" value="0" placeholder="0">
                </div>
            </div>

            <div style="display: flex; gap: 1rem; flex-wrap: wrap;">
                <label style="display: flex; align-items: center; gap: 0.5rem; color: var(--text); cursor: pointer;">
                    <input type="checkbox" id="roof-ventilation" class="calc-checkbox">
                    <span data-i18n="calc.roofing.ventilation">${t('calc.roofing.ventilation')}</span>
                </label>
                <label style="display: flex; align-items: center; gap: 0.5rem; color: var(--text); cursor: pointer;">
                    <input type="checkbox" id="roof-ice-shield" class="calc-checkbox" checked>
                    <span data-i18n="calc.roofing.ice_shield">${t('calc.roofing.ice_shield')}</span>
                </label>
                <label style="display: flex; align-items: center; gap: 0.5rem; color: var(--text); cursor: pointer;">
                    <input type="checkbox" id="roof-warranty" class="calc-checkbox">
                    <span data-i18n="calc.roofing.warranty">${t('calc.roofing.warranty')}</span>
                </label>
            </div>

            <button onclick="calculateRoofing()" class="calc-button" data-i18n="calc.button.calculate_roofing">${t('calc.button.calculate_roofing')}</button>
        </div>
    `;
}

function calculateRoofing() {
    if (typeof fbq !== 'undefined') {
        fbq('track', 'InitiateCheckout', {
            content_name: 'Roofing Calculator',
            content_category: 'Calculator',
            value: 39.99,
            currency: 'USD'
        });
    }
    showSignupModal(() => { performRoofingCalculation(); });
}

function performRoofingCalculation() {
    const area = parseFloat(document.getElementById('roof-area').value) || 0;
    const materialPrice = parseFloat(document.getElementById('roof-material').value);
    const pitchMult = parseFloat(document.getElementById('roof-pitch').value);
    const storyMult = parseFloat(document.getElementById('roof-stories').value);
    const layers = parseInt(document.getElementById('roof-layers').value) || 0;
    const skylights = parseInt(document.getElementById('roof-skylights').value) || 0;
    const includeVent = document.getElementById('roof-ventilation').checked;
    const includeIce = document.getElementById('roof-ice-shield').checked;
    const includeWarranty = document.getElementById('roof-warranty').checked;

    if (!area) {
        alert(t('calc.alert.enter_roof_area'));
        return;
    }

    const results = [];
    const squares = area / 100;

    results.push({ label: 'Roof Area', value: area, unit: 'sq ft' });

    // Material
    const materialCost = squares * materialPrice;
    results.push({ label: 'Roofing Material', value: squares.toFixed(2), unit: 'squares', cost: materialCost });

    // Underlayment
    results.push({ label: 'Underlayment', value: squares.toFixed(2), unit: 'squares', cost: squares * 26 });

    // Ice shield
    if (includeIce) {
        const rolls = Math.ceil(area / 200);
        results.push({ label: 'Ice & Water Shield', value: rolls, unit: 'rolls', cost: rolls * 70 });
    }

    // Ridge cap
    const ridgeFeet = area * 0.1;
    results.push({ label: 'Ridge Cap', value: ridgeFeet.toFixed(0), unit: 'linear feet', cost: ridgeFeet * 3.25 });

    // Drip edge
    const dripEdge = Math.sqrt(area) * 4;
    results.push({ label: 'Drip Edge', value: dripEdge.toFixed(0), unit: 'linear feet', cost: dripEdge * 2.5 });

    // Nails
    results.push({ label: 'Nails & Fasteners', value: squares.toFixed(2), unit: 'squares', cost: squares * 32 });

    // Debris disposal (if tear-off needed)
    if (layers > 0) {
        results.push({ label: 'Debris Disposal', value: squares.toFixed(2), unit: 'squares', cost: squares * 32 });
    }

    // Skylights (materials only)
    if (skylights > 0) {
        results.push({ label: 'Skylight Flashing', value: skylights, unit: skylights > 1 ? 'skylights' : 'skylight', cost: skylights * 85 });
    }

    // Options
    if (includeVent) {
        results.push({ label: 'Ventilation System', value: 1, unit: 'system', cost: 625 });
    }

    if (includeWarranty) {
        results.push({ label: 'Extended Warranty', value: squares.toFixed(2), unit: 'squares', cost: squares * 27 });
    }

    displayResults(results, 'Roofing');
}

// Roof Area Auto-Detection with Google Solar API
async function detectRoofArea() {
    const addressInput = document.getElementById('roof-address');
    const detectBtn = document.getElementById('detect-btn');
    const resultDiv = document.getElementById('roof-detection-result');
    const roofAreaInput = document.getElementById('roof-area');

    const address = addressInput.value.trim();

    if (!address) {
        resultDiv.style.display = 'block';
        resultDiv.innerHTML = `
            <div style="padding: 1rem; background: rgba(255, 107, 53, 0.1); border: 1px solid rgba(255, 107, 53, 0.3); border-radius: 8px; color: #ff6b35;">
                ⚠️ Please enter an address
            </div>
        `;
        return;
    }

    // Show loading state
    detectBtn.disabled = true;
    detectBtn.innerHTML = 'Detecting...';
    resultDiv.style.display = 'block';
    resultDiv.innerHTML = `
        <div style="padding: 1rem; background: rgba(139, 89, 255, 0.1); border: 1px solid rgba(139, 89, 255, 0.3); border-radius: 8px; color: var(--text); display: flex; align-items: center; gap: 0.75rem;">
            <div style="width: 20px; height: 20px; border: 3px solid rgba(139, 89, 255, 0.3); border-top-color: #8b59ff; border-radius: 50%; animation: spin 1s linear infinite;"></div>
            <span>Analyzing satellite imagery...</span>
        </div>
    `;

    try {
        const response = await fetch('https://ujhgwcurllkkeouzwvgk.supabase.co/functions/v1/get-roof-area', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': 'Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InVqaGd3Y3VybGxra2VvdXp3dmdrIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTcwMzIzMjQsImV4cCI6MjA3MjYwODMyNH0.ez6RDJ2FxgSfb7mo2Xug1lXaynKLR-2nJFO-x64UNnY'
            },
            body: JSON.stringify({ address })
        });

        const data = await response.json();

        if (data.success) {
            // SUCCESS - Auto-fill roof area
            roofAreaInput.value = data.roofAreaSqFeet;
            roofAreaInput.style.background = 'rgba(76, 175, 80, 0.1)';
            roofAreaInput.style.borderColor = '#4caf50';

            resultDiv.innerHTML = `
                <div style="padding: 1rem; background: rgba(76, 175, 80, 0.1); border: 1px solid rgba(76, 175, 80, 0.3); border-radius: 8px;">
                    <div style="display: flex; align-items: start; gap: 0.75rem;">
                        <span style="font-size: 1.5rem;">✅</span>
                        <div style="flex: 1;">
                            <div style="font-weight: 700; color: #4caf50; margin-bottom: 0.5rem;">Roof Area Detected!</div>
                            <div style="color: var(--text); margin-bottom: 0.5rem;">
                                <strong>${data.roofAreaSqFeet.toLocaleString()} sq ft</strong> (${data.roofAreaSqMeters} m²)
                            </div>
                            <div style="font-size: 0.875rem; color: var(--muted);">
                                📍 ${data.address}<br>
                                📅 Imagery from ${data.imageryDate}
                            </div>
                        </div>
                    </div>
                </div>
            `;
        } else {
            // FAILURE - Show size chart fallback
            resultDiv.innerHTML = `
                <div style="padding: 1.5rem; background: rgba(255, 152, 0, 0.1); border: 1px solid rgba(255, 152, 0, 0.3); border-radius: 8px;">
                    <div style="display: flex; align-items: start; gap: 0.75rem; margin-bottom: 1rem;">
                        <span style="font-size: 1.5rem;">ℹ️</span>
                        <div>
                            <div style="font-weight: 700; color: #ff9800; margin-bottom: 0.25rem;">Could Not Auto-Detect Roof Size</div>
                            <div style="font-size: 0.875rem; color: var(--muted);">${data.error}</div>
                        </div>
                    </div>

                    <div style="background: rgba(18,18,23,0.4); padding: 1rem; border-radius: 8px; margin-top: 1rem;">
                        <div style="font-weight: 700; margin-bottom: 0.75rem; color: var(--text);">📏 Common Roof Sizes:</div>
                        <div style="display: grid; gap: 0.5rem;">
                            <button onclick="setRoofSize(1200)" style="padding: 0.75rem; background: rgba(255,255,255,0.05); border: 1px solid rgba(255,255,255,0.1); border-radius: 6px; color: var(--text); cursor: pointer; text-align: left; transition: all 0.2s;" onmouseover="this.style.background='rgba(255,107,53,0.2)'; this.style.borderColor='#ff6b35'" onmouseout="this.style.background='rgba(255,255,255,0.05)'; this.style.borderColor='rgba(255,255,255,0.1)'">
                                🏠 <strong>Small Home:</strong> 1,000-1,500 sq ft (Average: 1,200 sq ft)
                            </button>
                            <button onclick="setRoofSize(2000)" style="padding: 0.75rem; background: rgba(255,255,255,0.05); border: 1px solid rgba(255,255,255,0.1); border-radius: 6px; color: var(--text); cursor: pointer; text-align: left; transition: all 0.2s;" onmouseover="this.style.background='rgba(255,107,53,0.2)'; this.style.borderColor='#ff6b35'" onmouseout="this.style.background='rgba(255,255,255,0.05)'; this.style.borderColor='rgba(255,255,255,0.1)'">
                                🏡 <strong>Medium Home:</strong> 1,500-2,500 sq ft (Average: 2,000 sq ft) ← Most Common
                            </button>
                            <button onclick="setRoofSize(3200)" style="padding: 0.75rem; background: rgba(255,255,255,0.05); border: 1px solid rgba(255,255,255,0.1); border-radius: 6px; color: var(--text); cursor: pointer; text-align: left; transition: all 0.2s;" onmouseover="this.style.background='rgba(255,107,53,0.2)'; this.style.borderColor='#ff6b35'" onmouseout="this.style.background='rgba(255,255,255,0.05)'; this.style.borderColor='rgba(255,255,255,0.1)'">
                                🏘️ <strong>Large Home:</strong> 2,500-4,000 sq ft (Average: 3,200 sq ft)
                            </button>
                            <button onclick="setRoofSize(4500)" style="padding: 0.75rem; background: rgba(255,255,255,0.05); border: 1px solid rgba(255,255,255,0.1); border-radius: 6px; color: var(--text); cursor: pointer; text-align: left; transition: all 0.2s;" onmouseover="this.style.background='rgba(255,107,53,0.2)'; this.style.borderColor='#ff6b35'" onmouseout="this.style.background='rgba(255,255,255,0.05)'; this.style.borderColor='rgba(255,255,255,0.1)'">
                                🏰 <strong>Extra Large:</strong> 4,000+ sq ft (Average: 4,500 sq ft)
                            </button>
                        </div>
                        <div style="margin-top: 1rem; padding: 0.75rem; background: rgba(139, 89, 255, 0.1); border-radius: 6px; font-size: 0.875rem; color: var(--muted);">
                            💡 <strong>Tip:</strong> You can manually enter the exact square footage in the field above
                        </div>
                    </div>
                </div>
            `;
        }
    } catch (error) {
        console.error('Error detecting roof area:', error);
        resultDiv.innerHTML = `
            <div style="padding: 1rem; background: rgba(244, 67, 54, 0.1); border: 1px solid rgba(244, 67, 54, 0.3); border-radius: 8px; color: #f44336;">
                ❌ Error connecting to detection service. Please enter roof size manually.
            </div>
        `;
    } finally {
        detectBtn.disabled = false;
        detectBtn.innerHTML = 'Detect Size';
    }
}

// Helper function to set roof size from fallback chart
function setRoofSize(sqft) {
    const roofAreaInput = document.getElementById('roof-area');
    roofAreaInput.value = sqft;
    roofAreaInput.style.background = 'rgba(139, 89, 255, 0.1)';
    roofAreaInput.style.borderColor = '#8b59ff';
    roofAreaInput.focus();

    // Scroll to input
    roofAreaInput.scrollIntoView({ behavior: 'smooth', block: 'center' });
}

// ============================================================================
// SIMPLIFIED CALCULATORS (18 more)
// ============================================================================

function renderDeckCalculator(container, title) {
    const tradeName = t('calc.trade.deck');
    container.innerHTML = `
        <h2 style="font-size: 1.5rem; font-weight: 700; margin-bottom: 2rem; color: var(--text);" data-calc-title="deck">${t('calc.title.calculator').replace('{{trade}}', tradeName)}</h2>
        <div style="display: grid; gap: 1.5rem;">
            <div style="display: grid; grid-template-columns: repeat(3, 1fr); gap: 1rem;">
                <div>
                    <label class="calc-label" data-i18n="calc.deck.length">${t('calc.deck.length')}</label>
                    <input type="number" id="deck-length" class="calc-input" min="0" placeholder="0">
                </div>
                <div>
                    <label class="calc-label" data-i18n="calc.deck.width">${t('calc.deck.width')}</label>
                    <input type="number" id="deck-width" class="calc-input" min="0" placeholder="0">
                </div>
                <div>
                    <label class="calc-label" data-i18n="calc.deck.height">${t('calc.deck.height')}</label>
                    <input type="number" id="deck-height" class="calc-input" min="0" value="3" placeholder="3">
                </div>
            </div>
            <div style="display: grid; grid-template-columns: repeat(2, 1fr); gap: 1rem;">
                <div>
                    <label class="calc-label" data-i18n="calc.deck.material">${t('calc.deck.material')}</label>
                    <select id="deck-material" class="calc-input">
                        <option value="3.50" data-i18n="calc.deck.material.treated">${t('calc.deck.material.treated')}</option>
                        <option value="8.00" data-i18n="calc.deck.material.composite">${t('calc.deck.material.composite')}</option>
                        <option value="12.00" data-i18n="calc.deck.material.pvc">${t('calc.deck.material.pvc')}</option>
                        <option value="6.50" data-i18n="calc.deck.material.cedar">${t('calc.deck.material.cedar')}</option>
                    </select>
                </div>
                <div>
                    <label class="calc-label" data-i18n="calc.deck.railing">${t('calc.deck.railing')}</label>
                    <select id="deck-railing" class="calc-input">
                        <option value="25" data-i18n="calc.deck.railing.wood">${t('calc.deck.railing.wood')}</option>
                        <option value="45" data-i18n="calc.deck.railing.composite">${t('calc.deck.railing.composite')}</option>
                        <option value="65" data-i18n="calc.deck.railing.cable">${t('calc.deck.railing.cable')}</option>
                        <option value="55" data-i18n="calc.deck.railing.glass">${t('calc.deck.railing.glass')}</option>
                    </select>
                </div>
            </div>
            <button onclick="calculateDeck()" class="calc-button" data-i18n="calc.button.calculate_deck">${t('calc.button.calculate_deck')}</button>
        </div>
    `;
}

function calculateDeck() {
    if (typeof fbq !== 'undefined') {
        fbq('track', 'InitiateCheckout', {
            content_name: 'Deck Calculator',
            content_category: 'Calculator',
            value: 39.99,
            currency: 'USD'
        });
    }
    showSignupModal(() => { performDeckCalculation(); });
}

function performDeckCalculation() {
    const length = parseFloat(document.getElementById('deck-length').value) || 0;
    const width = parseFloat(document.getElementById('deck-width').value) || 0;
    const height = parseFloat(document.getElementById('deck-height').value) || 3;
    const materialPrice = parseFloat(document.getElementById('deck-material').value);
    const railingPrice = parseFloat(document.getElementById('deck-railing').value);

    if (!length || !width) {
        alert(t('calc.alert.enter_deck_dimensions'));
        return;
    }

    const area = length * width;
    const perimeter = 2 * (length + width);

    const results = [
        { label: 'Deck Area', value: area.toFixed(0), unit: 'sq ft' },
        { label: 'Decking Boards', value: area.toFixed(0), unit: 'sq ft', cost: area * materialPrice },
        { label: 'Joists & Frame', value: area.toFixed(0), unit: 'sq ft', cost: area * 2.75 },
        { label: 'Posts & Footings', value: Math.ceil(area / 64), unit: 'posts', cost: Math.ceil(area / 64) * 85 },
        { label: 'Railing', value: perimeter.toFixed(0), unit: 'linear feet', cost: perimeter * railingPrice },
        { label: 'Fasteners & Hardware', value: 1, unit: 'lot', cost: area * 0.85 },
        { label: 'Installation Labor', value: (area * 0.75).toFixed(1), unit: 'hours', cost: area * 0.75 * 75 }
    ];

    displayResults(results, 'Deck');
}

function renderSidingCalculator(container, title) {
    const tradeName = t('calc.trade.siding');
    container.innerHTML = `
        <h2 style="font-size: 1.5rem; font-weight: 700; margin-bottom: 2rem; color: var(--text);" data-calc-title="siding">${t('calc.title.calculator').replace('{{trade}}', tradeName)}</h2>
        <div style="display: grid; gap: 1.5rem;">
            <div style="display: grid; grid-template-columns: repeat(2, 1fr); gap: 1rem;">
                <div>
                    <label class="calc-label" data-i18n="calc.siding.area">${t('calc.siding.area')}</label>
                    <input type="number" id="siding-area" class="calc-input" min="0" placeholder="${t('calc.placeholder.total_area')}">
                </div>
                <div>
                    <label class="calc-label" data-i18n="calc.siding.type">${t('calc.siding.type')}</label>
                    <select id="siding-type" class="calc-input">
                        <option value="4.50" data-i18n="calc.siding.type.vinyl">${t('calc.siding.type.vinyl')}</option>
                        <option value="8.00" data-i18n="calc.siding.type.fiber">${t('calc.siding.type.fiber')}</option>
                        <option value="6.50" data-i18n="calc.siding.type.wood">${t('calc.siding.type.wood')}</option>
                        <option value="12.00" data-i18n="calc.siding.type.engineered">${t('calc.siding.type.engineered')}</option>
                        <option value="15.00" data-i18n="calc.siding.type.metal">${t('calc.siding.type.metal')}</option>
                    </select>
                </div>
            </div>
            <button onclick="calculateSiding()" class="calc-button" data-i18n="calc.button.calculate_siding">${t('calc.button.calculate_siding')}</button>
        </div>
    `;
}

function calculateSiding() {
    if (typeof fbq !== 'undefined') {
        fbq('track', 'InitiateCheckout', {
            content_name: 'Siding Calculator',
            content_category: 'Calculator',
            value: 39.99,
            currency: 'USD'
        });
    }
    showSignupModal(() => { performSidingCalculation(); });
}

function performSidingCalculation() {
    const area = parseFloat(document.getElementById('siding-area').value) || 0;
    const price = parseFloat(document.getElementById('siding-type').value);

    if (!area) {
        alert(t('calc.alert.enter_wall_area'));
        return;
    }

    const wasteArea = area * 1.1;

    const results = [
        { label: 'Wall Area', value: area.toFixed(0), unit: 'sq ft' },
        { label: 'Siding Material (with waste)', value: wasteArea.toFixed(0), unit: 'sq ft', cost: wasteArea * price },
        { label: 'House Wrap', value: area.toFixed(0), unit: 'sq ft', cost: area * 0.35 },
        { label: 'Trim & Corners', value: 1, unit: 'lot', cost: area * 1.25 },
        { label: 'Fasteners', value: 1, unit: 'lot', cost: area * 0.45 },
        { label: 'Installation Labor', value: (area * 0.5).toFixed(1), unit: 'hours', cost: area * 0.5 * 65 }
    ];

    displayResults(results, 'Siding');
}

function renderFencingCalculator(container, title) {
    const tradeName = t('calc.trade.fencing');
    container.innerHTML = `
        <h2 style="font-size: 1.5rem; font-weight: 700; margin-bottom: 2rem; color: var(--text);" data-calc-title="fencing">${t('calc.title.calculator').replace('{{trade}}', tradeName)}</h2>
        <div style="display: grid; gap: 1.5rem;">
            <div style="display: grid; grid-template-columns: repeat(3, 1fr); gap: 1rem;">
                <div>
                    <label class="calc-label" data-i18n="calc.fencing.length">${t('calc.fencing.length')}</label>
                    <input type="number" id="fence-length" class="calc-input" min="0" placeholder="${t('calc.placeholder.total_length')}">
                </div>
                <div>
                    <label class="calc-label" data-i18n="calc.fencing.height">${t('calc.fencing.height')}</label>
                    <input type="number" id="fence-height" class="calc-input" min="0" value="6" placeholder="6">
                </div>
                <div>
                    <label class="calc-label" data-i18n="calc.fencing.type">${t('calc.fencing.type')}</label>
                    <select id="fence-type" class="calc-input">
                        <option value="15" data-i18n="calc.fencing.type.wood">${t('calc.fencing.type.wood')}</option>
                        <option value="25" data-i18n="calc.fencing.type.vinyl">${t('calc.fencing.type.vinyl')}</option>
                        <option value="35" data-i18n="calc.fencing.type.composite">${t('calc.fencing.type.composite')}</option>
                        <option value="30" data-i18n="calc.fencing.type.chain">${t('calc.fencing.type.chain')}</option>
                        <option value="45" data-i18n="calc.fencing.type.aluminum">${t('calc.fencing.type.aluminum')}</option>
                    </select>
                </div>
            </div>
            <button onclick="calculateFencing()" class="calc-button" data-i18n="calc.button.calculate_fencing">${t('calc.button.calculate_fencing')}</button>
        </div>
    `;
}

function calculateFencing() {
    if (typeof fbq !== 'undefined') {
        fbq('track', 'InitiateCheckout', {
            content_name: 'Fencing Calculator',
            content_category: 'Calculator',
            value: 39.99,
            currency: 'USD'
        });
    }
    showSignupModal(() => { performFencingCalculation(); });
}

function performFencingCalculation() {
    const length = parseFloat(document.getElementById('fence-length').value) || 0;
    const height = parseFloat(document.getElementById('fence-height').value) || 6;
    const price = parseFloat(document.getElementById('fence-type').value);

    if (!length) {
        alert(t('calc.alert.enter_fence_length'));
        return;
    }

    const posts = Math.ceil(length / 8) + 1;

    const results = [
        { label: 'Fence Length', value: length.toFixed(0), unit: 'linear feet' },
        { label: 'Fence Panels', value: length.toFixed(0), unit: 'linear feet', cost: length * price },
        { label: 'Posts', value: posts, unit: 'posts', cost: posts * 45 },
        { label: 'Post Concrete', value: posts, unit: 'bags', cost: posts * 8 },
        { label: 'Hardware & Gates', value: 1, unit: 'lot', cost: 275 },
        { label: 'Installation Labor', value: (length * 0.5).toFixed(1), unit: 'hours', cost: length * 0.5 * 55 }
    ];

    displayResults(results, 'Fencing');
}

function renderGutterCalculator(container, title) {
    const tradeName = t('calc.trade.gutter');
    container.innerHTML = `
        <h2 style="font-size: 1.5rem; font-weight: 700; margin-bottom: 2rem; color: var(--text);" data-calc-title="gutter">${t('calc.title.calculator').replace('{{trade}}', tradeName)}</h2>
        <div style="display: grid; gap: 1.5rem;">
            <div style="display: grid; grid-template-columns: repeat(3, 1fr); gap: 1rem;">
                <div>
                    <label class="calc-label" data-i18n="calc.gutter.length">${t('calc.gutter.length')}</label>
                    <input type="number" id="gutter-length" class="calc-input" min="0" placeholder="${t('calc.placeholder.total_length')}">
                </div>
                <div>
                    <label class="calc-label" data-i18n="calc.gutter.downspouts">${t('calc.gutter.downspouts')}</label>
                    <input type="number" id="gutter-downspouts" class="calc-input" min="0" value="4" placeholder="4">
                </div>
                <div>
                    <label class="calc-label" data-i18n="calc.gutter.material">${t('calc.gutter.material')}</label>
                    <select id="gutter-material" class="calc-input">
                        <option value="8" data-i18n="calc.gutter.material.aluminum">${t('calc.gutter.material.aluminum')}</option>
                        <option value="12" data-i18n="calc.gutter.material.copper">${t('calc.gutter.material.copper')}</option>
                        <option value="6" data-i18n="calc.gutter.material.vinyl">${t('calc.gutter.material.vinyl')}</option>
                        <option value="10" data-i18n="calc.gutter.material.steel">${t('calc.gutter.material.steel')}</option>
                    </select>
                </div>
            </div>
            <button onclick="calculateGutter()" class="calc-button" data-i18n="calc.button.calculate_gutter">${t('calc.button.calculate_gutter')}</button>
        </div>
    `;
}

function calculateGutter() {
    if (typeof fbq !== 'undefined') {
        fbq('track', 'InitiateCheckout', {
            content_name: 'Gutter Calculator',
            content_category: 'Calculator',
            value: 39.99,
            currency: 'USD'
        });
    }
    showSignupModal(() => { performGutterCalculation(); });
}

function performGutterCalculation() {
    const length = parseFloat(document.getElementById('gutter-length').value) || 0;
    const downspouts = parseInt(document.getElementById('gutter-downspouts').value) || 4;
    const price = parseFloat(document.getElementById('gutter-material').value);

    if (!length) {
        alert(t('calc.alert.enter_gutter_length'));
        return;
    }

    const results = [
        { label: 'Gutter Length', value: length.toFixed(0), unit: 'linear feet' },
        { label: 'Gutter Material', value: length.toFixed(0), unit: 'linear feet', cost: length * price },
        { label: 'Downspouts', value: downspouts, unit: 'downspouts', cost: downspouts * 85 },
        { label: 'Hangers & Brackets', value: Math.ceil(length / 2), unit: 'hangers', cost: Math.ceil(length / 2) * 3.5 },
        { label: 'Installation Labor', value: (length * 0.3).toFixed(1), unit: 'hours', cost: length * 0.3 * 65 }
    ];

    displayResults(results, 'Gutters');
}

// Continue with remaining calculators...
function renderElectricalCalculator(container, title) {
    const tradeName = t('calc.trade.electrical');
    container.innerHTML = `
        <h2 style="font-size: 1.5rem; font-weight: 700; margin-bottom: 2rem; color: var(--text);" data-calc-title="electrical">${t('calc.title.calculator').replace('{{trade}}', tradeName)}</h2>
        <div style="display: grid; gap: 1.5rem;">
            <div style="display: grid; grid-template-columns: repeat(3, 1fr); gap: 1rem;">
                <div>
                    <label class="calc-label" data-i18n="calc.electrical.outlets">${t('calc.electrical.outlets')}</label>
                    <input type="number" id="elec-outlets" class="calc-input" min="0" value="0" placeholder="0">
                </div>
                <div>
                    <label class="calc-label" data-i18n="calc.electrical.lights">${t('calc.electrical.lights')}</label>
                    <input type="number" id="elec-lights" class="calc-input" min="0" value="0" placeholder="0">
                </div>
                <div>
                    <label class="calc-label" data-i18n="calc.electrical.switches">${t('calc.electrical.switches')}</label>
                    <input type="number" id="elec-switches" class="calc-input" min="0" value="0" placeholder="0">
                </div>
            </div>
            <button onclick="calculateElectrical()" class="calc-button" data-i18n="calc.button.calculate_electrical">${t('calc.button.calculate_electrical')}</button>
        </div>
    `;
}

function calculateElectrical() {
    if (typeof fbq !== 'undefined') {
        fbq('track', 'InitiateCheckout', {
            content_name: 'Electrical Calculator',
            content_category: 'Calculator',
            value: 39.99,
            currency: 'USD'
        });
    }
    showSignupModal(() => { performElectricalCalculation(); });
}

function performElectricalCalculation() {
    const outlets = parseInt(document.getElementById('elec-outlets').value) || 0;
    const lights = parseInt(document.getElementById('elec-lights').value) || 0;
    const switches = parseInt(document.getElementById('elec-switches').value) || 0;

    const results = [
        { label: 'Outlets', value: outlets, unit: 'outlets', cost: outlets * 45 },
        { label: 'Light Fixtures', value: lights, unit: 'fixtures', cost: lights * 85 },
        { label: 'Switches', value: switches, unit: 'switches', cost: switches * 35 },
        { label: 'Wire & Conduit', value: 1, unit: 'lot', cost: (outlets + lights + switches) * 15 },
        { label: 'Labor', value: ((outlets + lights + switches) * 1.5).toFixed(1), unit: 'hours', cost: (outlets + lights + switches) * 1.5 * 85 }
    ];

    displayResults(results, 'Electrical');
}

function renderPlumbingCalculator(container, title) {
    const tradeName = t('calc.trade.plumbing');
    container.innerHTML = `
        <h2 style="font-size: 1.5rem; font-weight: 700; margin-bottom: 2rem; color: var(--text);" data-calc-title="plumbing">${t('calc.title.calculator').replace('{{trade}}', tradeName)}</h2>
        <div style="display: grid; gap: 1.5rem;">
            <div style="display: grid; grid-template-columns: repeat(3, 1fr); gap: 1rem;">
                <div>
                    <label class="calc-label" data-i18n="calc.plumbing.fixtures">${t('calc.plumbing.fixtures')}</label>
                    <input type="number" id="plumb-fixtures" class="calc-input" min="0" value="0" placeholder="0">
                </div>
                <div>
                    <label class="calc-label" data-i18n="calc.plumbing.pipe">${t('calc.plumbing.pipe')}</label>
                    <input type="number" id="plumb-pipe" class="calc-input" min="0" value="0" placeholder="0">
                </div>
                <div>
                    <label class="calc-label" data-i18n="calc.plumbing.type">${t('calc.plumbing.type')}</label>
                    <select id="plumb-type" class="calc-input">
                        <option value="2.5" data-i18n="calc.plumbing.type.pex">${t('calc.plumbing.type.pex')}</option>
                        <option value="4" data-i18n="calc.plumbing.type.copper">${t('calc.plumbing.type.copper')}</option>
                        <option value="1.5" data-i18n="calc.plumbing.type.pvc">${t('calc.plumbing.type.pvc')}</option>
                    </select>
                </div>
            </div>
            <button onclick="calculatePlumbing()" class="calc-button" data-i18n="calc.button.calculate_plumbing">${t('calc.button.calculate_plumbing')}</button>
        </div>
    `;
}

function calculatePlumbing() {
    if (typeof fbq !== 'undefined') {
        fbq('track', 'InitiateCheckout', {
            content_name: 'Plumbing Calculator',
            content_category: 'Calculator',
            value: 39.99,
            currency: 'USD'
        });
    }
    showSignupModal(() => { performPlumbingCalculation(); });
}

function performPlumbingCalculation() {
    const fixtures = parseInt(document.getElementById('plumb-fixtures').value) || 0;
    const pipe = parseFloat(document.getElementById('plumb-pipe').value) || 0;
    const price = parseFloat(document.getElementById('plumb-type').value);

    const results = [
        { label: 'Fixtures', value: fixtures, unit: 'fixtures', cost: fixtures * 125 },
        { label: 'Pipe', value: pipe.toFixed(0), unit: 'linear feet', cost: pipe * price },
        { label: 'Fittings & Valves', value: 1, unit: 'lot', cost: (fixtures + pipe * 0.1) * 12 },
        { label: 'Labor', value: ((fixtures * 2) + (pipe * 0.2)).toFixed(1), unit: 'hours', cost: ((fixtures * 2) + (pipe * 0.2)) * 95 }
    ];

    displayResults(results, 'Plumbing');
}

// HVAC Calculator
function renderHVACCalculator(container, title) {
    const tradeName = t('calc.trade.hvac');
    container.innerHTML = `
        <h2 style="font-size: 1.5rem; font-weight: 700; margin-bottom: 2rem; color: var(--text);" data-calc-title="hvac">${t('calc.title.calculator').replace('{{trade}}', tradeName)}</h2>
        <div style="display: grid; gap: 1.5rem;">
            <div style="display: grid; grid-template-columns: repeat(3, 1fr); gap: 1rem;">
                <div>
                    <label class="calc-label" data-i18n="calc.hvac.sqft">${t('calc.hvac.sqft')}</label>
                    <input type="number" id="hvac-sqft" class="calc-input" min="0" placeholder="${t('calc.placeholder.total_area')}">
                </div>
                <div>
                    <label class="calc-label" data-i18n="calc.hvac.type">${t('calc.hvac.type')}</label>
                    <select id="hvac-type" class="calc-input">
                        <option value="3500" data-i18n="calc.hvac.type.central_ac">${t('calc.hvac.type.central_ac')}</option>
                        <option value="4000" data-i18n="calc.hvac.type.heat_pump">${t('calc.hvac.type.heat_pump')}</option>
                        <option value="3000" data-i18n="calc.hvac.type.furnace">${t('calc.hvac.type.furnace')}</option>
                        <option value="5000" data-i18n="calc.hvac.type.mini_split">${t('calc.hvac.type.mini_split')}</option>
                    </select>
                </div>
                <div>
                    <label class="calc-label" data-i18n="calc.hvac.ductwork">${t('calc.hvac.ductwork')}</label>
                    <input type="number" id="hvac-duct" class="calc-input" min="0" value="0" placeholder="0">
                </div>
            </div>
            <button onclick="calculateHVAC()" class="calc-button" data-i18n="calc.button.calculate_hvac">${t('calc.button.calculate_hvac')}</button>
        </div>
    `;
}

function calculateHVAC() {
    if (typeof fbq !== 'undefined') {
        fbq('track', 'InitiateCheckout', {
            content_name: 'HVAC Calculator',
            content_category: 'Calculator',
            value: 39.99,
            currency: 'USD'
        });
    }
    showSignupModal(() => { performHVACCalculation(); });
}

function performHVACCalculation() {
    const sqft = parseFloat(document.getElementById('hvac-sqft').value) || 0;
    const systemPrice = parseFloat(document.getElementById('hvac-type').value);
    const ductwork = parseFloat(document.getElementById('hvac-duct').value) || 0;

    if (!sqft) {
        alert(t('calc.alert.enter_sqft'));
        return;
    }

    const tons = Math.ceil(sqft / 600);
    const results = [
        { label: 'Area', value: sqft.toFixed(0), unit: 'sq ft' },
        { label: 'System Size', value: tons, unit: 'tons' },
        { label: 'HVAC System', value: 1, unit: 'unit', cost: systemPrice * tons },
        { label: 'Ductwork', value: ductwork.toFixed(0), unit: 'linear feet', cost: ductwork * 25 },
        { label: 'Installation Labor', value: (tons * 8).toFixed(1), unit: 'hours', cost: tons * 8 * 95 }
    ];

    displayResults(results, 'HVAC');
}

// Drywall Calculator
function renderDrywallCalculator(container, title) {
    const tradeName = t('calc.trade.drywall');
    container.innerHTML = `
        <h2 style="font-size: 1.5rem; font-weight: 700; margin-bottom: 2rem; color: var(--text);" data-calc-title="drywall">${t('calc.title.calculator').replace('{{trade}}', tradeName)}</h2>
        <div style="display: grid; gap: 1.5rem;">
            <div style="display: grid; grid-template-columns: repeat(3, 1fr); gap: 1rem;">
                <div>
                    <label class="calc-label" data-i18n="calc.drywall.area">${t('calc.drywall.area')}</label>
                    <input type="number" id="drywall-area" class="calc-input" min="0" placeholder="${t('calc.placeholder.total_area')}">
                </div>
                <div>
                    <label class="calc-label" data-i18n="calc.drywall.size">${t('calc.drywall.size')}</label>
                    <select id="drywall-size" class="calc-input">
                        <option value="32" data-i18n="calc.drywall.size.4x8">${t('calc.drywall.size.4x8')}</option>
                        <option value="48" data-i18n="calc.drywall.size.4x12">${t('calc.drywall.size.4x12')}</option>
                    </select>
                </div>
                <div>
                    <label class="calc-label" data-i18n="calc.drywall.finish">${t('calc.drywall.finish')}</label>
                    <select id="drywall-finish" class="calc-input">
                        <option value="0.5" data-i18n="calc.drywall.finish.level3">${t('calc.drywall.finish.level3')}</option>
                        <option value="0.75" data-i18n="calc.drywall.finish.level4">${t('calc.drywall.finish.level4')}</option>
                        <option value="1.00" data-i18n="calc.drywall.finish.level5">${t('calc.drywall.finish.level5')}</option>
                    </select>
                </div>
            </div>
            <button onclick="calculateDrywall()" class="calc-button" data-i18n="calc.button.calculate_drywall">${t('calc.button.calculate_drywall')}</button>
        </div>
    `;
}

function calculateDrywall() {
    if (typeof fbq !== 'undefined') {
        fbq('track', 'InitiateCheckout', {
            content_name: 'Drywall Calculator',
            content_category: 'Calculator',
            value: 39.99,
            currency: 'USD'
        });
    }
    showSignupModal(() => { performDrywallCalculation(); });
}

function performDrywallCalculation() {
    const area = parseFloat(document.getElementById('drywall-area').value) || 0;
    const sheetSize = parseFloat(document.getElementById('drywall-size').value);
    const finishPrice = parseFloat(document.getElementById('drywall-finish').value);

    if (!area) {
        alert(t('calc.alert.enter_wall_area'));
        return;
    }

    const sheets = Math.ceil(area / sheetSize * 1.1);
    const results = [
        { label: 'Wall Area', value: area.toFixed(0), unit: 'sq ft' },
        { label: 'Drywall Sheets', value: sheets, unit: 'sheets', cost: sheets * 12 },
        { label: 'Joint Compound', value: Math.ceil(area / 100), unit: 'buckets', cost: Math.ceil(area / 100) * 15 },
        { label: 'Tape', value: Math.ceil(area / 100), unit: 'rolls', cost: Math.ceil(area / 100) * 8 },
        { label: 'Screws', value: Math.ceil(sheets / 10), unit: 'boxes', cost: Math.ceil(sheets / 10) * 12 },
        { label: 'Finishing Labor', value: area.toFixed(0), unit: 'sq ft', cost: area * finishPrice },
        { label: 'Installation Labor', value: (area * 0.02).toFixed(1), unit: 'hours', cost: area * 0.02 * 55 }
    ];

    displayResults(results, 'Drywall');
}

// Paint Calculator
function renderPaintCalculator(container, title) {
    const tradeName = t('calc.trade.paint');
    container.innerHTML = `
        <h2 style="font-size: 1.5rem; font-weight: 700; margin-bottom: 2rem; color: var(--text);" data-calc-title="paint">${t('calc.title.calculator').replace('{{trade}}', tradeName)}</h2>
        <div style="display: grid; gap: 1.5rem;">
            <div style="display: grid; grid-template-columns: repeat(3, 1fr); gap: 1rem;">
                <div>
                    <label class="calc-label" data-i18n="calc.paint.area">${t('calc.paint.area')}</label>
                    <input type="number" id="paint-area" class="calc-input" min="0" placeholder="${t('calc.placeholder.total_area')}">
                </div>
                <div>
                    <label class="calc-label" data-i18n="calc.paint.coats">${t('calc.paint.coats')}</label>
                    <select id="paint-coats" class="calc-input">
                        <option value="1" data-i18n="calc.paint.coats.one">${t('calc.paint.coats.one')}</option>
                        <option value="2" selected data-i18n="calc.paint.coats.two">${t('calc.paint.coats.two')}</option>
                        <option value="3" data-i18n="calc.paint.coats.three">${t('calc.paint.coats.three')}</option>
                    </select>
                </div>
                <div>
                    <label class="calc-label" data-i18n="calc.paint.quality">${t('calc.paint.quality')}</label>
                    <select id="paint-quality" class="calc-input">
                        <option value="25" data-i18n="calc.paint.quality.basic">${t('calc.paint.quality.basic')}</option>
                        <option value="40" selected data-i18n="calc.paint.quality.mid">${t('calc.paint.quality.mid')}</option>
                        <option value="65" data-i18n="calc.paint.quality.premium">${t('calc.paint.quality.premium')}</option>
                    </select>
                </div>
            </div>
            <button onclick="calculatePaint()" class="calc-button" data-i18n="calc.button.calculate_paint">${t('calc.button.calculate_paint')}</button>
        </div>
    `;
}

function calculatePaint() {
    if (typeof fbq !== 'undefined') {
        fbq('track', 'InitiateCheckout', {
            content_name: 'Paint Calculator',
            content_category: 'Calculator',
            value: 39.99,
            currency: 'USD'
        });
    }
    showSignupModal(() => { performPaintCalculation(); });
}

function performPaintCalculation() {
    const area = parseFloat(document.getElementById('paint-area').value) || 0;
    const coats = parseInt(document.getElementById('paint-coats').value);
    const paintPrice = parseFloat(document.getElementById('paint-quality').value);

    if (!area) {
        alert(t('calc.alert.enter_wall_area'));
        return;
    }

    const gallons = Math.ceil((area * coats) / 350);
    const results = [
        { label: 'Wall Area', value: area.toFixed(0), unit: 'sq ft' },
        { label: 'Paint Needed', value: gallons, unit: 'gallons', cost: gallons * paintPrice },
        { label: 'Primer', value: Math.ceil(area / 400), unit: 'gallons', cost: Math.ceil(area / 400) * 20 },
        { label: 'Supplies', value: 1, unit: 'lot', cost: 75 },
        { label: 'Painting Labor', value: (area * 0.015 * coats).toFixed(1), unit: 'hours', cost: area * 0.015 * coats * 45 }
    ];

    displayResults(results, 'Paint');
}

// Flooring Calculator
function renderFlooringCalculator(container, title) {
    const tradeName = t('calc.trade.flooring');
    container.innerHTML = `
        <h2 style="font-size: 1.5rem; font-weight: 700; margin-bottom: 2rem; color: var(--text);" data-calc-title="flooring">${t('calc.title.calculator').replace('{{trade}}', tradeName)}</h2>
        <div style="display: grid; gap: 1.5rem;">
            <div style="display: grid; grid-template-columns: repeat(2, 1fr); gap: 1rem;">
                <div>
                    <label class="calc-label" data-i18n="calc.flooring.area">${t('calc.flooring.area')}</label>
                    <input type="number" id="floor-area" class="calc-input" min="0" placeholder="${t('calc.placeholder.total_area')}">
                </div>
                <div>
                    <label class="calc-label" data-i18n="calc.flooring.type">${t('calc.flooring.type')}</label>
                    <select id="floor-type" class="calc-input">
                        <option value="3.50" data-i18n="calc.flooring.type.laminate">${t('calc.flooring.type.laminate')}</option>
                        <option value="5.00" data-i18n="calc.flooring.type.engineered">${t('calc.flooring.type.engineered')}</option>
                        <option value="8.00" data-i18n="calc.flooring.type.solid">${t('calc.flooring.type.solid')}</option>
                        <option value="4.00" data-i18n="calc.flooring.type.vinyl">${t('calc.flooring.type.vinyl')}</option>
                        <option value="2.50" data-i18n="calc.flooring.type.carpet">${t('calc.flooring.type.carpet')}</option>
                    </select>
                </div>
            </div>
            <button onclick="calculateFlooring()" class="calc-button" data-i18n="calc.button.calculate_flooring">${t('calc.button.calculate_flooring')}</button>
        </div>
    `;
}

function calculateFlooring() {
    if (typeof fbq !== 'undefined') {
        fbq('track', 'InitiateCheckout', {
            content_name: 'Flooring Calculator',
            content_category: 'Calculator',
            value: 39.99,
            currency: 'USD'
        });
    }
    showSignupModal(() => { performFlooringCalculation(); });
}

function performFlooringCalculation() {
    const area = parseFloat(document.getElementById('floor-area').value) || 0;
    const price = parseFloat(document.getElementById('floor-type').value);

    if (!area) {
        alert(t('calc.alert.enter_area'));
        return;
    }

    const wasteArea = area * 1.1;
    const results = [
        { label: 'Floor Area', value: area.toFixed(0), unit: 'sq ft' },
        { label: 'Flooring Material (with waste)', value: wasteArea.toFixed(0), unit: 'sq ft', cost: wasteArea * price },
        { label: 'Underlayment', value: area.toFixed(0), unit: 'sq ft', cost: area * 0.75 },
        { label: 'Transition Strips', value: 1, unit: 'lot', cost: 125 },
        { label: 'Installation Labor', value: (area * 0.04).toFixed(1), unit: 'hours', cost: area * 0.04 * 55 }
    ];

    displayResults(results, 'Flooring');
}

// Tile Calculator
function renderTileCalculator(container, title) {
    const tradeName = t('calc.trade.tile');
    container.innerHTML = `
        <h2 style="font-size: 1.5rem; font-weight: 700; margin-bottom: 2rem; color: var(--text);" data-calc-title="tile">${t('calc.title.calculator').replace('{{trade}}', tradeName)}</h2>
        <div style="display: grid; gap: 1.5rem;">
            <div style="display: grid; grid-template-columns: repeat(2, 1fr); gap: 1rem;">
                <div>
                    <label class="calc-label" data-i18n="calc.tile.area">${t('calc.tile.area')}</label>
                    <input type="number" id="tile-area" class="calc-input" min="0" placeholder="${t('calc.placeholder.total_area')}">
                </div>
                <div>
                    <label class="calc-label" data-i18n="calc.tile.type">${t('calc.tile.type')}</label>
                    <select id="tile-type" class="calc-input">
                        <option value="3" data-i18n="calc.tile.type.ceramic">${t('calc.tile.type.ceramic')}</option>
                        <option value="6" data-i18n="calc.tile.type.porcelain">${t('calc.tile.type.porcelain')}</option>
                        <option value="12" data-i18n="calc.tile.type.stone">${t('calc.tile.type.stone')}</option>
                        <option value="8" data-i18n="calc.tile.type.glass">${t('calc.tile.type.glass')}</option>
                    </select>
                </div>
            </div>
            <button onclick="calculateTile()" class="calc-button" data-i18n="calc.button.calculate_tile">${t('calc.button.calculate_tile')}</button>
        </div>
    `;
}

function calculateTile() {
    if (typeof fbq !== 'undefined') {
        fbq('track', 'InitiateCheckout', {
            content_name: 'Tile Calculator',
            content_category: 'Calculator',
            value: 39.99,
            currency: 'USD'
        });
    }
    showSignupModal(() => { performTileCalculation(); });
}

function performTileCalculation() {
    const area = parseFloat(document.getElementById('tile-area').value) || 0;
    const price = parseFloat(document.getElementById('tile-type').value);

    if (!area) {
        alert(t('calc.alert.enter_area'));
        return;
    }

    const wasteArea = area * 1.15;
    const results = [
        { label: 'Tile Area', value: area.toFixed(0), unit: 'sq ft' },
        { label: 'Tile (with waste)', value: wasteArea.toFixed(0), unit: 'sq ft', cost: wasteArea * price },
        { label: 'Thinset Mortar', value: Math.ceil(area / 50), unit: 'bags', cost: Math.ceil(area / 50) * 25 },
        { label: 'Grout', value: Math.ceil(area / 100), unit: 'bags', cost: Math.ceil(area / 100) * 18 },
        { label: 'Installation Labor', value: (area * 0.08).toFixed(1), unit: 'hours', cost: area * 0.08 * 65 }
    ];

    displayResults(results, 'Tile');
}

// Doors & Windows Calculator
function renderDoorsWindowsCalculator(container, title) {
    const tradeName = t('calc.trade.doors_windows');
    container.innerHTML = `
        <h2 style="font-size: 1.5rem; font-weight: 700; margin-bottom: 2rem; color: var(--text);" data-calc-title="doors_windows">${t('calc.title.calculator').replace('{{trade}}', tradeName)}</h2>
        <div style="display: grid; gap: 1.5rem;">
            <div style="display: grid; grid-template-columns: repeat(2, 1fr); gap: 1rem;">
                <div>
                    <label class="calc-label" data-i18n="calc.doors_windows.doors">${t('calc.doors_windows.doors')}</label>
                    <input type="number" id="door-count" class="calc-input" min="0" value="0">
                </div>
                <div>
                    <label class="calc-label" data-i18n="calc.doors_windows.windows">${t('calc.doors_windows.windows')}</label>
                    <input type="number" id="window-count" class="calc-input" min="0" value="0">
                </div>
            </div>
            <button onclick="calculateDoorsWindows()" class="calc-button" data-i18n="calc.button.calculate_doors_windows">${t('calc.button.calculate_doors_windows')}</button>
        </div>
    `;
}

function calculateDoorsWindows() {
    if (typeof fbq !== 'undefined') {
        fbq('track', 'InitiateCheckout', {
            content_name: 'Doors & Windows Calculator',
            content_category: 'Calculator',
            value: 39.99,
            currency: 'USD'
        });
    }
    showSignupModal(() => { performDoorsWindowsCalculation(); });
}

function performDoorsWindowsCalculation() {
    const doors = parseInt(document.getElementById('door-count').value) || 0;
    const windows = parseInt(document.getElementById('window-count').value) || 0;

    if (!doors && !windows) {
        alert(t('calc.alert.enter_doors_windows'));
        return;
    }

    const results = [
        { label: 'Interior Doors', value: doors, unit: 'doors', cost: doors * 350 },
        { label: 'Windows', value: windows, unit: 'windows', cost: windows * 450 },
        { label: 'Trim & Casing', value: doors + windows, unit: 'units', cost: (doors + windows) * 85 },
        { label: 'Installation Labor', value: ((doors * 2) + (windows * 3)).toFixed(1), unit: 'hours', cost: ((doors * 2) + (windows * 3)) * 65 }
    ];

    displayResults(results, 'Doors & Windows');
}

// Foundation Calculator
function renderFoundationCalculator(container, title) {
    const tradeName = t('calc.trade.foundation');
    container.innerHTML = `
        <h2 style="font-size: 1.5rem; font-weight: 700; margin-bottom: 2rem; color: var(--text);" data-calc-title="foundation">${t('calc.title.calculator').replace('{{trade}}', tradeName)}</h2>
        <div style="display: grid; gap: 1.5rem;">
            <div style="display: grid; grid-template-columns: repeat(3, 1fr); gap: 1rem;">
                <div>
                    <label class="calc-label" data-i18n="calc.foundation.length">${t('calc.foundation.length')}</label>
                    <input type="number" id="found-length" class="calc-input" min="0" placeholder="0">
                </div>
                <div>
                    <label class="calc-label" data-i18n="calc.foundation.width">${t('calc.foundation.width')}</label>
                    <input type="number" id="found-width" class="calc-input" min="0" placeholder="0">
                </div>
                <div>
                    <label class="calc-label" data-i18n="calc.foundation.type">${t('calc.foundation.type')}</label>
                    <select id="found-type" class="calc-input">
                        <option value="8" data-i18n="calc.foundation.type.slab">${t('calc.foundation.type.slab')}</option>
                        <option value="15" data-i18n="calc.foundation.type.crawlspace">${t('calc.foundation.type.crawlspace')}</option>
                        <option value="25" data-i18n="calc.foundation.type.basement">${t('calc.foundation.type.basement')}</option>
                    </select>
                </div>
            </div>
            <button onclick="calculateFoundation()" class="calc-button" data-i18n="calc.button.calculate_foundation">${t('calc.button.calculate_foundation')}</button>
        </div>
    `;
}

function calculateFoundation() {
    if (typeof fbq !== 'undefined') {
        fbq('track', 'InitiateCheckout', {
            content_name: 'Foundation Calculator',
            content_category: 'Calculator',
            value: 39.99,
            currency: 'USD'
        });
    }
    showSignupModal(() => { performFoundationCalculation(); });
}

function performFoundationCalculation() {
    const length = parseFloat(document.getElementById('found-length').value) || 0;
    const width = parseFloat(document.getElementById('found-width').value) || 0;
    const price = parseFloat(document.getElementById('found-type').value);

    if (!length || !width) {
        alert(t('calc.alert.enter_dimensions'));
        return;
    }

    const area = length * width;
    const results = [
        { label: 'Foundation Area', value: area.toFixed(0), unit: 'sq ft' },
        { label: 'Foundation Work', value: area.toFixed(0), unit: 'sq ft', cost: area * price },
        { label: 'Excavation', value: area.toFixed(0), unit: 'sq ft', cost: area * 2 },
        { label: 'Rebar & Mesh', value: area.toFixed(0), unit: 'sq ft', cost: area * 1.5 },
        { label: 'Labor', value: (area * 0.1).toFixed(1), unit: 'hours', cost: area * 0.1 * 75 }
    ];

    displayResults(results, 'Foundation');
}

// Framing Calculator
function renderFramingCalculator(container, title) {
    const tradeName = t('calc.trade.framing');
    container.innerHTML = `
        <h2 style="font-size: 1.5rem; font-weight: 700; margin-bottom: 2rem; color: var(--text);" data-calc-title="framing">${t('calc.title.calculator').replace('{{trade}}', tradeName)}</h2>
        <div style="display: grid; gap: 1.5rem;">
            <div style="display: grid; grid-template-columns: repeat(2, 1fr); gap: 1rem;">
                <div>
                    <label class="calc-label" data-i18n="calc.framing.sqft">${t('calc.framing.sqft')}</label>
                    <input type="number" id="frame-area" class="calc-input" min="0" placeholder="${t('calc.placeholder.total_area')}">
                </div>
                <div>
                    <label class="calc-label" data-i18n="calc.framing.stories">${t('calc.framing.stories')}</label>
                    <select id="frame-stories" class="calc-input">
                        <option value="1" data-i18n="calc.framing.stories.one">${t('calc.framing.stories.one')}</option>
                        <option value="2" data-i18n="calc.framing.stories.two">${t('calc.framing.stories.two')}</option>
                        <option value="3" data-i18n="calc.framing.stories.three">${t('calc.framing.stories.three')}</option>
                    </select>
                </div>
            </div>
            <button onclick="calculateFraming()" class="calc-button" data-i18n="calc.button.calculate_framing">${t('calc.button.calculate_framing')}</button>
        </div>
    `;
}

function calculateFraming() {
    if (typeof fbq !== 'undefined') {
        fbq('track', 'InitiateCheckout', {
            content_name: 'Framing Calculator',
            content_category: 'Calculator',
            value: 39.99,
            currency: 'USD'
        });
    }
    showSignupModal(() => { performFramingCalculation(); });
}

function performFramingCalculation() {
    const area = parseFloat(document.getElementById('frame-area').value) || 0;
    const stories = parseInt(document.getElementById('frame-stories').value);

    if (!area) {
        alert(t('calc.alert.enter_sqft'));
        return;
    }

    const totalArea = area * stories;
    const results = [
        { label: 'Total Area', value: totalArea.toFixed(0), unit: 'sq ft' },
        { label: 'Lumber', value: totalArea.toFixed(0), unit: 'sq ft', cost: totalArea * 4.5 },
        { label: 'Studs', value: Math.ceil(totalArea / 8), unit: 'studs', cost: Math.ceil(totalArea / 8) * 4.5 },
        { label: 'Plates & Headers', value: 1, unit: 'lot', cost: totalArea * 1.2 },
        { label: 'Fasteners', value: 1, unit: 'lot', cost: totalArea * 0.3 },
        { label: 'Labor', value: (totalArea * 0.04).toFixed(1), unit: 'hours', cost: totalArea * 0.04 * 65 }
    ];

    displayResults(results, 'Framing');
}

// Excavation Calculator
function renderExcavationCalculator(container, title) {
    const tradeName = t('calc.trade.excavation');
    container.innerHTML = `
        <h2 style="font-size: 1.5rem; font-weight: 700; margin-bottom: 2rem; color: var(--text);" data-calc-title="excavation">${t('calc.title.calculator').replace('{{trade}}', tradeName)}</h2>
        <div style="display: grid; gap: 1.5rem;">
            <div style="display: grid; grid-template-columns: repeat(3, 1fr); gap: 1rem;">
                <div>
                    <label class="calc-label" data-i18n="calc.excavation.length">${t('calc.excavation.length')}</label>
                    <input type="number" id="exc-length" class="calc-input" min="0" placeholder="0">
                </div>
                <div>
                    <label class="calc-label" data-i18n="calc.excavation.width">${t('calc.excavation.width')}</label>
                    <input type="number" id="exc-width" class="calc-input" min="0" placeholder="0">
                </div>
                <div>
                    <label class="calc-label" data-i18n="calc.excavation.depth">${t('calc.excavation.depth')}</label>
                    <input type="number" id="exc-depth" class="calc-input" min="0" placeholder="0">
                </div>
            </div>
            <button onclick="calculateExcavation()" class="calc-button" data-i18n="calc.button.calculate_excavation">${t('calc.button.calculate_excavation')}</button>
        </div>
    `;
}

function calculateExcavation() {
    if (typeof fbq !== 'undefined') {
        fbq('track', 'InitiateCheckout', {
            content_name: 'Excavation Calculator',
            content_category: 'Calculator',
            value: 39.99,
            currency: 'USD'
        });
    }
    showSignupModal(() => { performExcavationCalculation(); });
}

function performExcavationCalculation() {
    const length = parseFloat(document.getElementById('exc-length').value) || 0;
    const width = parseFloat(document.getElementById('exc-width').value) || 0;
    const depth = parseFloat(document.getElementById('exc-depth').value) || 0;

    if (!length || !width || !depth) {
        alert(t('calc.alert.fill_dimensions'));
        return;
    }

    const cubicYards = (length * width * depth) / 27;
    const results = [
        { label: 'Volume', value: cubicYards.toFixed(2), unit: 'cubic yards' },
        { label: 'Excavation', value: cubicYards.toFixed(2), unit: 'cubic yards', cost: cubicYards * 15 },
        { label: 'Hauling', value: Math.ceil(cubicYards / 10), unit: 'truckloads', cost: Math.ceil(cubicYards / 10) * 125 },
        { label: 'Equipment', value: (cubicYards * 0.5).toFixed(1), unit: 'hours', cost: cubicYards * 0.5 * 150 }
    ];

    displayResults(results, 'Excavation');
}

// Pavers Calculator
function renderPaversCalculator(container, title) {
    const tradeName = t('calc.trade.pavers');
    container.innerHTML = `
        <h2 style="font-size: 1.5rem; font-weight: 700; margin-bottom: 2rem; color: var(--text);" data-calc-title="pavers">${t('calc.title.calculator').replace('{{trade}}', tradeName)}</h2>
        <div style="display: grid; gap: 1.5rem;">
            <div style="display: grid; grid-template-columns: repeat(2, 1fr); gap: 1rem;">
                <div>
                    <label class="calc-label" data-i18n="calc.pavers.area">${t('calc.pavers.area')}</label>
                    <input type="number" id="paver-area" class="calc-input" min="0" placeholder="${t('calc.placeholder.total_area')}">
                </div>
                <div>
                    <label class="calc-label" data-i18n="calc.pavers.type">${t('calc.pavers.type')}</label>
                    <select id="paver-type" class="calc-input">
                        <option value="8" data-i18n="calc.pavers.type.concrete">${t('calc.pavers.type.concrete')}</option>
                        <option value="15" data-i18n="calc.pavers.type.brick">${t('calc.pavers.type.brick')}</option>
                        <option value="20" data-i18n="calc.pavers.type.stone">${t('calc.pavers.type.stone')}</option>
                    </select>
                </div>
            </div>
            <button onclick="calculatePavers()" class="calc-button" data-i18n="calc.button.calculate_pavers">${t('calc.button.calculate_pavers')}</button>
        </div>
    `;
}

function calculatePavers() {
    if (typeof fbq !== 'undefined') {
        fbq('track', 'InitiateCheckout', {
            content_name: 'Pavers Calculator',
            content_category: 'Calculator',
            value: 39.99,
            currency: 'USD'
        });
    }
    showSignupModal(() => { performPaversCalculation(); });
}

function performPaversCalculation() {
    const area = parseFloat(document.getElementById('paver-area').value) || 0;
    const price = parseFloat(document.getElementById('paver-type').value);

    if (!area) {
        alert(t('calc.alert.enter_area'));
        return;
    }

    const results = [
        { label: 'Paver Area', value: area.toFixed(0), unit: 'sq ft' },
        { label: 'Pavers', value: area.toFixed(0), unit: 'sq ft', cost: area * price },
        { label: 'Base Material', value: (area * 4 / 27).toFixed(2), unit: 'cubic yards', cost: (area * 4 / 27) * 45 },
        { label: 'Sand', value: (area * 1 / 27).toFixed(2), unit: 'cubic yards', cost: (area * 1 / 27) * 35 },
        { label: 'Installation Labor', value: (area * 0.1).toFixed(1), unit: 'hours', cost: area * 0.1 * 55 }
    ];

    displayResults(results, 'Pavers');
}

// Retaining Walls Calculator
function renderRetainingWallsCalculator(container, title) {
    const tradeName = t('calc.trade.retaining_walls');
    container.innerHTML = `
        <h2 style="font-size: 1.5rem; font-weight: 700; margin-bottom: 2rem; color: var(--text);" data-calc-title="retaining_walls">${t('calc.title.calculator').replace('{{trade}}', tradeName)}</h2>
        <div style="display: grid; gap: 1.5rem;">
            <div style="display: grid; grid-template-columns: repeat(3, 1fr); gap: 1rem;">
                <div>
                    <label class="calc-label" data-i18n="calc.retaining_walls.length">${t('calc.retaining_walls.length')}</label>
                    <input type="number" id="wall-length" class="calc-input" min="0" placeholder="0">
                </div>
                <div>
                    <label class="calc-label" data-i18n="calc.retaining_walls.height">${t('calc.retaining_walls.height')}</label>
                    <input type="number" id="wall-height" class="calc-input" min="0" placeholder="0">
                </div>
                <div>
                    <label class="calc-label" data-i18n="calc.retaining_walls.type">${t('calc.retaining_walls.type')}</label>
                    <select id="wall-type" class="calc-input">
                        <option value="25" data-i18n="calc.retaining_walls.type.block">${t('calc.retaining_walls.type.block')}</option>
                        <option value="35" data-i18n="calc.retaining_walls.type.stone">${t('calc.retaining_walls.type.stone')}</option>
                        <option value="45" data-i18n="calc.retaining_walls.type.boulder">${t('calc.retaining_walls.type.boulder')}</option>
                    </select>
                </div>
            </div>
            <button onclick="calculateRetainingWalls()" class="calc-button" data-i18n="calc.button.calculate_retaining_walls">${t('calc.button.calculate_retaining_walls')}</button>
        </div>
    `;
}

function calculateRetainingWalls() {
    if (typeof fbq !== 'undefined') {
        fbq('track', 'InitiateCheckout', {
            content_name: 'Retaining Walls Calculator',
            content_category: 'Calculator',
            value: 39.99,
            currency: 'USD'
        });
    }
    showSignupModal(() => { performRetainingWallsCalculation(); });
}

function performRetainingWallsCalculation() {
    const length = parseFloat(document.getElementById('wall-length').value) || 0;
    const height = parseFloat(document.getElementById('wall-height').value) || 0;
    const price = parseFloat(document.getElementById('wall-type').value);

    if (!length || !height) {
        alert(t('calc.alert.enter_dimensions'));
        return;
    }

    const area = length * height;
    const results = [
        { label: 'Wall Area', value: area.toFixed(0), unit: 'sq ft' },
        { label: 'Wall Material', value: area.toFixed(0), unit: 'sq ft', cost: area * price },
        { label: 'Base & Backfill', value: (length * 2).toFixed(0), unit: 'cubic yards', cost: length * 2 * 35 },
        { label: 'Drainage', value: length.toFixed(0), unit: 'linear feet', cost: length * 8 },
        { label: 'Labor', value: (area * 0.5).toFixed(1), unit: 'hours', cost: area * 0.5 * 65 }
    ];

    displayResults(results, 'Retaining Walls');
}

// Junk Removal Calculator
function renderJunkRemovalCalculator(container, title) {
    const tradeName = t('calc.trade.junk_removal');
    container.innerHTML = `
        <h2 style="font-size: 1.5rem; font-weight: 700; margin-bottom: 2rem; color: var(--text);" data-calc-title="junk_removal">${t('calc.title.calculator').replace('{{trade}}', tradeName)}</h2>
        <div style="display: grid; gap: 1.5rem;">
            <div style="display: grid; grid-template-columns: repeat(2, 1fr); gap: 1rem;">
                <div>
                    <label class="calc-label" data-i18n="calc.junk_removal.size">${t('calc.junk_removal.size')}</label>
                    <select id="junk-size" class="calc-input">
                        <option value="150" data-i18n="calc.junk_removal.size.quarter">${t('calc.junk_removal.size.quarter')}</option>
                        <option value="250" data-i18n="calc.junk_removal.size.half">${t('calc.junk_removal.size.half')}</option>
                        <option value="400" data-i18n="calc.junk_removal.size.three_quarter">${t('calc.junk_removal.size.three_quarter')}</option>
                        <option value="550" data-i18n="calc.junk_removal.size.full">${t('calc.junk_removal.size.full')}</option>
                    </select>
                </div>
                <div>
                    <label class="calc-label" data-i18n="calc.junk_removal.loads">${t('calc.junk_removal.loads')}</label>
                    <input type="number" id="junk-loads" class="calc-input" min="1" value="1">
                </div>
            </div>
            <button onclick="calculateJunkRemoval()" class="calc-button" data-i18n="calc.button.calculate_junk_removal">${t('calc.button.calculate_junk_removal')}</button>
        </div>
    `;
}

function calculateJunkRemoval() {
    if (typeof fbq !== 'undefined') {
        fbq('track', 'InitiateCheckout', {
            content_name: 'Junk Removal Calculator',
            content_category: 'Calculator',
            value: 39.99,
            currency: 'USD'
        });
    }
    showSignupModal(() => { performJunkRemovalCalculation(); });
}

function performJunkRemovalCalculation() {
    const price = parseFloat(document.getElementById('junk-size').value);
    const loads = parseInt(document.getElementById('junk-loads').value) || 1;

    const results = [
        { label: 'Number of Loads', value: loads, unit: 'loads' },
        { label: 'Removal Service', value: loads, unit: 'loads', cost: price * loads },
        { label: 'Disposal Fees', value: loads, unit: 'loads', cost: loads * 50 },
        { label: 'Labor', value: loads * 2, unit: 'hours', cost: loads * 2 * 45 }
    ];

    displayResults(results, 'Junk Removal');
}

// ============================================================================
// RESULTS DISPLAY WITH SIGNUP GATE
// ============================================================================
function displayResults(results, title) {
    // Check if showSignupModal function exists (only on calculator page)
    if (typeof showSignupModal === 'function') {
        // Show signup modal and pass the display function as callback
        showSignupModal(() => {
            actuallyDisplayResults(results, title);
        });
    } else {
        // If no modal available, just display directly
        actuallyDisplayResults(results, title);
    }
}

function actuallyDisplayResults(results, title) {
    const container = document.getElementById('results-container');
    if (!container) return;

    const totalCost = results.reduce((sum, r) => sum + (r.cost || 0), 0);

    let html = `<h3 style="font-size: 1.25rem; font-weight: 700; margin-bottom: 1.5rem; color: var(--text);">${title} Results</h3>`;
    html += '<div style="display: grid; gap: 1rem;">';

    results.forEach(result => {
        html += `
            <div style="display: flex; justify-content: space-between; align-items: center; padding: 1rem; background: rgba(255,255,255,0.05); border-radius: 8px;">
                <div>
                    <div style="font-weight: 600; color: var(--text);">${result.label}</div>
                    <div style="font-size: 0.875rem; color: var(--muted);">${result.value} ${result.unit}</div>
                </div>
                ${result.cost ? `<div style="font-weight: 700; font-size: 1.125rem; color: var(--brand);">$${result.cost.toFixed(2)}</div>` : ''}
            </div>
        `;
    });

    if (totalCost > 0) {
        html += `
            <div style="margin-top: 1rem; padding: 1.5rem; background: linear-gradient(135deg, rgba(187,166,255,0.2) 0%, rgba(121,195,255,0.2) 100%); border-radius: 12px; border: 1px solid rgba(187,166,255,0.3);">
                <div style="display: flex; justify-content: space-between; align-items: center;">
                    <div style="font-size: 1.25rem; font-weight: 700; color: var(--text);">Total Estimated Cost</div>
                    <div style="font-size: 1.75rem; font-weight: 900; color: var(--brand);">$${totalCost.toFixed(2)}</div>
                </div>
            </div>
        `;
    }

    html += '</div>';
    container.innerHTML = html;
    container.style.display = 'block';

    // Scroll to results
    container.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
}
