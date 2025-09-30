-- This SQL safely adds only the missing materials data
-- It checks if tables exist and only inserts new materials

-- Only insert materials if they don't already exist
INSERT INTO materials_database (trade, category, name, unit, unit_price, supplier) 
SELECT * FROM (VALUES
-- Concrete materials
('concrete', 'concrete', '60lb Concrete Bag', 'each', 6.98, 'Home Depot'),
('concrete', 'concrete', '80lb Concrete Bag', 'each', 8.98, 'Home Depot'),
('concrete', 'concrete', 'Ready-Mix Concrete', 'cubic yard', 185.00, 'Local Supplier'),
('concrete', 'reinforcement', '#4 Rebar 20ft', 'each', 8.98, 'Home Depot'),
('concrete', 'reinforcement', '#5 Rebar 20ft', 'each', 12.98, 'Home Depot'),
('concrete', 'reinforcement', '6x6 Wire Mesh', 'sqft', 0.35, 'Home Depot'),
('concrete', 'reinforcement', '4x4 Wire Mesh', 'sqft', 0.45, 'Home Depot'),
('concrete', 'forms', '2x4 Form Board', 'lf', 0.75, 'Home Depot'),
('concrete', 'finishing', 'Concrete Sealer', 'gallon', 35.98, 'Home Depot'),

-- Deck materials
('deck', 'lumber', '5/4x6 Deck Board', 'lf', 2.49, 'Home Depot'),
('deck', 'lumber', '2x8 Treated Joist', 'each', 12.98, 'Home Depot'),
('deck', 'lumber', '4x4 Post', 'each', 18.98, 'Home Depot'),
('deck', 'lumber', '2x10 Beam', 'each', 22.98, 'Home Depot'),
('deck', 'composite', 'Composite Decking', 'lf', 4.98, 'Home Depot'),
('deck', 'hardware', 'Joist Hanger', 'each', 1.98, 'Home Depot'),
('deck', 'hardware', 'Post Base', 'each', 8.98, 'Home Depot'),
('deck', 'hardware', 'Deck Screws (5lb)', 'box', 35.98, 'Home Depot'),
('deck', 'railing', 'Wood Railing', 'lf', 18.98, 'Home Depot'),
('deck', 'railing', 'Aluminum Railing', 'lf', 45.98, 'Home Depot'),

-- Doors and Windows materials
('doors_windows', 'doors', 'Interior Door Slab', 'each', 125.00, 'Home Depot'),
('doors_windows', 'doors', 'Exterior Door', 'each', 450.00, 'Home Depot'),
('doors_windows', 'doors', 'French Door', 'each', 850.00, 'Home Depot'),
('doors_windows', 'doors', 'Sliding Door', 'each', 1200.00, 'Home Depot'),
('doors_windows', 'windows', 'Single Hung Window', 'each', 250.00, 'Home Depot'),
('doors_windows', 'windows', 'Double Hung Window', 'each', 350.00, 'Home Depot'),
('doors_windows', 'windows', 'Casement Window', 'each', 450.00, 'Home Depot'),
('doors_windows', 'windows', 'Bay Window', 'each', 1500.00, 'Home Depot'),
('doors_windows', 'hardware', 'Door Handle Set', 'each', 45.98, 'Home Depot'),
('doors_windows', 'hardware', 'Deadbolt', 'each', 35.98, 'Home Depot'),
('doors_windows', 'trim', 'Door Casing', 'lf', 2.98, 'Home Depot'),
('doors_windows', 'trim', 'Window Trim', 'lf', 3.98, 'Home Depot'),

-- Drywall materials
('drywall', 'drywall', '1/2" Drywall 4x8', 'sheet', 12.98, 'Home Depot'),
('drywall', 'drywall', '5/8" Drywall 4x8', 'sheet', 14.98, 'Home Depot'),
('drywall', 'drywall', 'Moisture Resistant Drywall', 'sheet', 18.98, 'Home Depot'),
('drywall', 'finishing', 'Joint Compound 5gal', 'bucket', 15.98, 'Home Depot'),
('drywall', 'finishing', 'Drywall Tape 500ft', 'roll', 6.98, 'Home Depot'),
('drywall', 'finishing', 'Corner Bead', 'each', 3.98, 'Home Depot'),
('drywall', 'accessories', 'Drywall Screws (5lb)', 'box', 25.98, 'Home Depot'),
('drywall', 'tools', 'Taping Knife Set', 'set', 35.98, 'Home Depot'),

-- Electrical materials
('electrical', 'wire', '12 AWG Romex 250ft', 'roll', 125.00, 'Home Depot'),
('electrical', 'wire', '14 AWG Romex 250ft', 'roll', 95.00, 'Home Depot'),
('electrical', 'wire', '10 AWG Romex 250ft', 'roll', 185.00, 'Home Depot'),
('electrical', 'panels', '200 Amp Panel', 'each', 250.00, 'Home Depot'),
('electrical', 'panels', '100 Amp Sub Panel', 'each', 150.00, 'Home Depot'),
('electrical', 'breakers', '20 Amp Breaker', 'each', 12.98, 'Home Depot'),
('electrical', 'breakers', '30 Amp Breaker', 'each', 15.98, 'Home Depot'),
('electrical', 'breakers', '50 Amp Breaker', 'each', 35.98, 'Home Depot'),
('electrical', 'outlets', 'Standard Outlet', 'each', 2.98, 'Home Depot'),
('electrical', 'outlets', 'GFCI Outlet', 'each', 22.98, 'Home Depot'),
('electrical', 'switches', 'Single Pole Switch', 'each', 2.98, 'Home Depot'),
('electrical', 'switches', 'Dimmer Switch', 'each', 18.98, 'Home Depot'),
('electrical', 'conduit', '1/2" EMT Conduit', 'each', 8.98, 'Home Depot'),
('electrical', 'boxes', 'Outlet Box', 'each', 1.98, 'Home Depot'),
('electrical', 'boxes', 'Junction Box', 'each', 3.98, 'Home Depot'),

-- Excavation materials
('excavation', 'backfill', 'Fill Dirt', 'cubic yard', 25.00, 'Local Supplier'),
('excavation', 'backfill', 'Gravel', 'cubic yard', 45.00, 'Local Supplier'),
('excavation', 'backfill', 'Sand', 'cubic yard', 35.00, 'Local Supplier'),
('excavation', 'backfill', 'Topsoil', 'cubic yard', 40.00, 'Local Supplier'),
('excavation', 'drainage', 'French Drain Pipe', 'lf', 2.98, 'Home Depot'),
('excavation', 'drainage', 'Drainage Rock', 'cubic yard', 55.00, 'Local Supplier'),
('excavation', 'erosion', 'Silt Fence', 'lf', 1.50, 'Home Depot'),
('excavation', 'erosion', 'Erosion Blanket', 'sqft', 0.35, 'Home Depot'),

-- Fencing materials
('fence', 'wood', '6ft Cedar Picket', 'each', 3.98, 'Home Depot'),
('fence', 'wood', '4x4x8 Post', 'each', 18.98, 'Home Depot'),
('fence', 'wood', '2x4x8 Rail', 'each', 5.98, 'Home Depot'),
('fence', 'vinyl', '6ft Vinyl Panel', 'each', 85.00, 'Home Depot'),
('fence', 'vinyl', 'Vinyl Post', 'each', 45.00, 'Home Depot'),
('fence', 'chain', 'Chain Link Fabric', 'lf', 8.98, 'Home Depot'),
('fence', 'chain', 'Chain Link Post', 'each', 25.98, 'Home Depot'),
('fence', 'chain', 'Top Rail', 'each', 18.98, 'Home Depot'),
('fence', 'hardware', 'Gate Hinge', 'pair', 18.98, 'Home Depot'),
('fence', 'hardware', 'Gate Latch', 'each', 15.98, 'Home Depot'),
('fence', 'concrete', 'Post Concrete', 'bag', 6.98, 'Home Depot'),

-- Flooring materials
('flooring', 'hardwood', 'Oak Hardwood', 'sqft', 4.98, 'Floor & Decor'),
('flooring', 'hardwood', 'Maple Hardwood', 'sqft', 5.98, 'Floor & Decor'),
('flooring', 'hardwood', 'Bamboo Flooring', 'sqft', 3.98, 'Floor & Decor'),
('flooring', 'laminate', 'Laminate Flooring', 'sqft', 2.49, 'Floor & Decor'),
('flooring', 'laminate', 'Waterproof Laminate', 'sqft', 3.49, 'Floor & Decor'),
('flooring', 'vinyl', 'Luxury Vinyl Plank', 'sqft', 2.98, 'Floor & Decor'),
('flooring', 'vinyl', 'Sheet Vinyl', 'sqft', 1.98, 'Floor & Decor'),
('flooring', 'tile', 'Ceramic Tile', 'sqft', 3.98, 'Floor & Decor'),
('flooring', 'tile', 'Porcelain Tile', 'sqft', 4.98, 'Floor & Decor'),
('flooring', 'carpet', 'Carpet', 'sqft', 2.98, 'Floor & Decor'),
('flooring', 'carpet', 'Carpet Pad', 'sqft', 0.65, 'Floor & Decor'),
('flooring', 'underlayment', 'Foam Underlayment', 'sqft', 0.35, 'Floor & Decor'),
('flooring', 'underlayment', 'Cork Underlayment', 'sqft', 0.75, 'Floor & Decor'),
('flooring', 'trim', 'Baseboard', 'lf', 2.98, 'Home Depot'),
('flooring', 'trim', 'Quarter Round', 'lf', 1.49, 'Home Depot'),

-- Foundation materials
('foundation', 'concrete', 'Foundation Concrete', 'cubic yard', 185.00, 'Local Supplier'),
('foundation', 'blocks', '8" Concrete Block', 'each', 2.98, 'Home Depot'),
('foundation', 'blocks', '12" Concrete Block', 'each', 3.98, 'Home Depot'),
('foundation', 'waterproofing', 'Foundation Sealer', 'gallon', 45.98, 'Home Depot'),
('foundation', 'waterproofing', 'Waterproof Membrane', 'sqft', 1.25, 'Home Depot'),
('foundation', 'drainage', 'Drain Tile', 'lf', 3.98, 'Home Depot'),
('foundation', 'drainage', 'Sump Pump', 'each', 185.00, 'Home Depot'),
('foundation', 'insulation', 'Rigid Foam Board', 'sheet', 35.98, 'Home Depot'),
('foundation', 'reinforcement', 'Foundation Rebar', 'ton', 850.00, 'Local Supplier'),
('foundation', 'reinforcement', 'Anchor Bolts', 'each', 2.98, 'Home Depot'),

-- Framing materials
('framing', 'lumber', '2x4x8 Stud', 'each', 5.98, 'Home Depot'),
('framing', 'lumber', '2x4x10 Stud', 'each', 7.98, 'Home Depot'),
('framing', 'lumber', '2x6x8 Stud', 'each', 8.98, 'Home Depot'),
('framing', 'lumber', '2x6x10 Stud', 'each', 11.98, 'Home Depot'),
('framing', 'lumber', '2x8x10 Joist', 'each', 12.98, 'Home Depot'),
('framing', 'lumber', '2x8x12 Joist', 'each', 15.98, 'Home Depot'),
('framing', 'lumber', '2x10x12 Joist', 'each', 18.98, 'Home Depot'),
('framing', 'lumber', '2x12x12 Joist', 'each', 25.98, 'Home Depot'),
('framing', 'engineered', 'LVL Beam', 'lf', 8.98, 'Home Depot'),
('framing', 'engineered', 'I-Joist', 'lf', 6.98, 'Home Depot'),
('framing', 'sheathing', '7/16 OSB 4x8', 'sheet', 24.98, 'Home Depot'),
('framing', 'sheathing', '1/2 Plywood 4x8', 'sheet', 32.98, 'Home Depot'),
('framing', 'sheathing', '5/8 Plywood 4x8', 'sheet', 38.98, 'Home Depot'),
('framing', 'hardware', 'Joist Hanger', 'each', 1.98, 'Home Depot'),
('framing', 'hardware', 'Hurricane Tie', 'each', 1.49, 'Home Depot'),
('framing', 'hardware', 'Framing Nails (50lb)', 'box', 65.00, 'Home Depot'),

-- Gutter materials
('gutter', 'gutters', '5" K-Style Gutter', 'lf', 8.98, 'Home Depot'),
('gutter', 'gutters', '6" K-Style Gutter', 'lf', 10.98, 'Home Depot'),
('gutter', 'gutters', 'Half Round Gutter', 'lf', 12.98, 'Home Depot'),
('gutter', 'downspouts', '2x3 Downspout', 'lf', 6.98, 'Home Depot'),
('gutter', 'downspouts', '3x4 Downspout', 'lf', 8.98, 'Home Depot'),
('gutter', 'accessories', 'End Cap', 'each', 4.98, 'Home Depot'),
('gutter', 'accessories', 'Inside Corner', 'each', 12.98, 'Home Depot'),
('gutter', 'accessories', 'Outside Corner', 'each', 12.98, 'Home Depot'),
('gutter', 'accessories', 'Gutter Guard', 'lf', 8.98, 'Home Depot'),
('gutter', 'hardware', 'Gutter Hanger', 'each', 2.98, 'Home Depot'),
('gutter', 'hardware', 'Downspout Bracket', 'each', 3.98, 'Home Depot'),

-- HVAC materials
('hvac', 'equipment', 'Central AC Unit', 'each', 3500.00, 'HVAC Supplier'),
('hvac', 'equipment', 'Furnace', 'each', 2500.00, 'HVAC Supplier'),
('hvac', 'equipment', 'Heat Pump', 'each', 4500.00, 'HVAC Supplier'),
('hvac', 'equipment', 'Mini Split Unit', 'each', 1800.00, 'HVAC Supplier'),
('hvac', 'ductwork', 'Flexible Duct 25ft', 'roll', 125.00, 'Home Depot'),
('hvac', 'ductwork', 'Sheet Metal Duct', 'lf', 15.98, 'HVAC Supplier'),
('hvac', 'ductwork', 'Duct Insulation', 'sqft', 1.25, 'Home Depot'),
('hvac', 'vents', 'Supply Vent', 'each', 18.98, 'Home Depot'),
('hvac', 'vents', 'Return Vent', 'each', 25.98, 'Home Depot'),
('hvac', 'controls', 'Thermostat', 'each', 150.00, 'Home Depot'),
('hvac', 'controls', 'Smart Thermostat', 'each', 250.00, 'Home Depot'),
('hvac', 'refrigerant', 'R410A Refrigerant', 'lb', 12.00, 'HVAC Supplier'),

-- Junk Removal materials/services
('junk_removal', 'containers', '10 Yard Dumpster', 'rental', 350.00, 'Waste Management'),
('junk_removal', 'containers', '20 Yard Dumpster', 'rental', 450.00, 'Waste Management'),
('junk_removal', 'containers', '30 Yard Dumpster', 'rental', 550.00, 'Waste Management'),
('junk_removal', 'containers', '40 Yard Dumpster', 'rental', 650.00, 'Waste Management'),
('junk_removal', 'bags', 'Contractor Bags (20 pack)', 'pack', 25.98, 'Home Depot'),
('junk_removal', 'disposal', 'Dump Fee', 'ton', 65.00, 'Local Dump'),
('junk_removal', 'disposal', 'Hazardous Waste Fee', 'item', 25.00, 'Local Dump'),

-- Paint materials
('paint', 'paint', 'Interior Paint (gallon)', 'gallon', 35.98, 'Sherwin Williams'),
('paint', 'paint', 'Exterior Paint (gallon)', 'gallon', 45.98, 'Sherwin Williams'),
('paint', 'paint', 'Ceiling Paint (gallon)', 'gallon', 28.98, 'Sherwin Williams'),
('paint', 'primer', 'Primer (gallon)', 'gallon', 28.98, 'Sherwin Williams'),
('paint', 'primer', 'Stain Blocking Primer', 'gallon', 38.98, 'Sherwin Williams'),
('paint', 'stain', 'Wood Stain (gallon)', 'gallon', 42.98, 'Sherwin Williams'),
('paint', 'stain', 'Concrete Stain (gallon)', 'gallon', 48.98, 'Sherwin Williams'),
('paint', 'supplies', 'Roller Kit', 'kit', 18.98, 'Home Depot'),
('paint', 'supplies', 'Brush Set', 'set', 25.98, 'Home Depot'),
('paint', 'supplies', 'Drop Cloth', 'each', 12.98, 'Home Depot'),
('paint', 'supplies', 'Painters Tape', 'roll', 8.98, 'Home Depot'),
('paint', 'supplies', 'Paint Tray', 'each', 4.98, 'Home Depot'),

-- Pavers materials
('pavers', 'pavers', 'Concrete Paver', 'sqft', 3.98, 'Home Depot'),
('pavers', 'pavers', 'Brick Paver', 'sqft', 4.98, 'Home Depot'),
('pavers', 'pavers', 'Natural Stone Paver', 'sqft', 8.98, 'Home Depot'),
('pavers', 'pavers', 'Permeable Paver', 'sqft', 5.98, 'Home Depot'),
('pavers', 'base', 'Gravel Base', 'cubic yard', 45.00, 'Local Supplier'),
('pavers', 'base', 'Sand Bedding', 'cubic yard', 35.00, 'Local Supplier'),
('pavers', 'base', 'Geotextile Fabric', 'sqft', 0.25, 'Home Depot'),
('pavers', 'edging', 'Paver Edging', 'lf', 3.98, 'Home Depot'),
('pavers', 'edging', 'Edging Spikes', 'pack', 8.98, 'Home Depot'),
('pavers', 'joint', 'Polymeric Sand', 'bag', 22.98, 'Home Depot'),
('pavers', 'sealer', 'Paver Sealer', 'gallon', 35.98, 'Home Depot'),

-- Plumbing materials
('plumbing', 'pipe', '1/2" Copper Pipe', 'lf', 3.98, 'Home Depot'),
('plumbing', 'pipe', '3/4" Copper Pipe', 'lf', 4.98, 'Home Depot'),
('plumbing', 'pipe', '1/2" PEX Pipe', 'lf', 0.98, 'Home Depot'),
('plumbing', 'pipe', '3/4" PEX Pipe', 'lf', 1.49, 'Home Depot'),
('plumbing', 'pipe', '1.5" PVC Drain', 'lf', 2.98, 'Home Depot'),
('plumbing', 'pipe', '2" PVC Drain', 'lf', 3.98, 'Home Depot'),
('plumbing', 'pipe', '3" PVC Drain', 'lf', 5.98, 'Home Depot'),
('plumbing', 'pipe', '4" PVC Drain', 'lf', 7.98, 'Home Depot'),
('plumbing', 'fittings', 'Copper Elbow', 'each', 2.98, 'Home Depot'),
('plumbing', 'fittings', 'Copper Tee', 'each', 3.98, 'Home Depot'),
('plumbing', 'fittings', 'PEX Fitting', 'each', 2.49, 'Home Depot'),
('plumbing', 'fittings', 'PVC Fitting', 'each', 1.98, 'Home Depot'),
('plumbing', 'fixtures', 'Kitchen Faucet', 'each', 185.00, 'Home Depot'),
('plumbing', 'fixtures', 'Bathroom Faucet', 'each', 125.00, 'Home Depot'),
('plumbing', 'fixtures', 'Toilet', 'each', 250.00, 'Home Depot'),
('plumbing', 'fixtures', 'Sink', 'each', 185.00, 'Home Depot'),
('plumbing', 'valves', 'Shut Off Valve', 'each', 12.98, 'Home Depot'),
('plumbing', 'valves', 'Ball Valve', 'each', 18.98, 'Home Depot'),
('plumbing', 'water_heater', 'Tank Water Heater', 'each', 850.00, 'Home Depot'),
('plumbing', 'water_heater', 'Tankless Water Heater', 'each', 1500.00, 'Home Depot'),

-- Retaining Wall materials
('retaining_walls', 'blocks', 'Retaining Wall Block', 'each', 3.98, 'Home Depot'),
('retaining_walls', 'blocks', 'Cap Block', 'each', 4.98, 'Home Depot'),
('retaining_walls', 'blocks', 'Corner Block', 'each', 5.98, 'Home Depot'),
('retaining_walls', 'base', 'Crushed Stone Base', 'cubic yard', 45.00, 'Local Supplier'),
('retaining_walls', 'base', 'Sand Leveling', 'cubic yard', 35.00, 'Local Supplier'),
('retaining_walls', 'drainage', 'Drain Pipe', 'lf', 2.98, 'Home Depot'),
('retaining_walls', 'drainage', 'Drainage Stone', 'cubic yard', 55.00, 'Local Supplier'),
('retaining_walls', 'reinforcement', 'Geogrid', 'sqft', 1.25, 'Home Depot'),
('retaining_walls', 'reinforcement', 'Landscape Fabric', 'sqft', 0.25, 'Home Depot'),
('retaining_walls', 'adhesive', 'Construction Adhesive', 'tube', 8.98, 'Home Depot'),

-- Roofing materials
('roofing', 'shingles', 'Asphalt Shingles', 'bundle', 35.98, 'Home Depot'),
('roofing', 'shingles', 'Architectural Shingles', 'bundle', 45.98, 'Home Depot'),
('roofing', 'shingles', 'Metal Roofing', 'sqft', 3.50, 'Home Depot'),
('roofing', 'shingles', 'Clay Tile', 'sqft', 4.98, 'Home Depot'),
('roofing', 'underlayment', 'Felt Paper', 'roll', 25.98, 'Home Depot'),
('roofing', 'underlayment', 'Synthetic Underlayment', 'roll', 125.00, 'Home Depot'),
('roofing', 'underlayment', 'Ice & Water Shield', 'roll', 85.00, 'Home Depot'),
('roofing', 'flashing', 'Step Flashing', 'each', 1.98, 'Home Depot'),
('roofing', 'flashing', 'Valley Flashing', 'lf', 8.98, 'Home Depot'),
('roofing', 'flashing', 'Drip Edge', 'lf', 3.98, 'Home Depot'),
('roofing', 'ventilation', 'Ridge Vent', 'lf', 8.98, 'Home Depot'),
('roofing', 'ventilation', 'Roof Vent', 'each', 35.98, 'Home Depot'),
('roofing', 'accessories', 'Roofing Nails (50lb)', 'box', 65.00, 'Home Depot'),
('roofing', 'accessories', 'Roofing Cement', 'gallon', 25.98, 'Home Depot'),

-- Siding materials
('siding', 'vinyl', 'Vinyl Siding', 'sqft', 2.98, 'Home Depot'),
('siding', 'vinyl', 'Vinyl Shake', 'sqft', 3.98, 'Home Depot'),
('siding', 'fiber', 'Fiber Cement Siding', 'sqft', 3.50, 'Home Depot'),
('siding', 'fiber', 'Fiber Cement Shake', 'sqft', 4.50, 'Home Depot'),
('siding', 'wood', 'Cedar Siding', 'sqft', 5.98, 'Home Depot'),
('siding', 'wood', 'Pine Siding', 'sqft', 3.98, 'Home Depot'),
('siding', 'metal', 'Metal Siding', 'sqft', 4.98, 'Home Depot'),
('siding', 'accessories', 'J-Channel', 'lf', 2.98, 'Home Depot'),
('siding', 'accessories', 'Corner Post', 'each', 18.98, 'Home Depot'),
('siding', 'accessories', 'Starter Strip', 'lf', 3.98, 'Home Depot'),
('siding', 'wrap', 'House Wrap', 'roll', 165.00, 'Home Depot'),
('siding', 'insulation', 'Foam Board', 'sheet', 35.98, 'Home Depot'),

-- Tile materials
('tile', 'tile', 'Ceramic Wall Tile', 'sqft', 3.98, 'Floor & Decor'),
('tile', 'tile', 'Ceramic Floor Tile', 'sqft', 2.98, 'Floor & Decor'),
('tile', 'tile', 'Porcelain Tile', 'sqft', 4.98, 'Floor & Decor'),
('tile', 'tile', 'Natural Stone Tile', 'sqft', 8.98, 'Floor & Decor'),
('tile', 'tile', 'Glass Tile', 'sqft', 12.98, 'Floor & Decor'),
('tile', 'tile', 'Mosaic Tile', 'sqft', 15.98, 'Floor & Decor'),
('tile', 'substrate', 'Cement Board', 'sheet', 12.98, 'Home Depot'),
('tile', 'substrate', 'Uncoupling Membrane', 'sqft', 1.85, 'Home Depot'),
('tile', 'setting', 'Thinset Mortar', 'bag', 15.98, 'Home Depot'),
('tile', 'setting', 'Mastic Adhesive', 'gallon', 25.98, 'Home Depot'),
('tile', 'grout', 'Sanded Grout', 'bag', 18.98, 'Home Depot'),
('tile', 'grout', 'Unsanded Grout', 'bag', 19.98, 'Home Depot'),
('tile', 'grout', 'Epoxy Grout', 'kit', 45.98, 'Home Depot'),
('tile', 'accessories', 'Tile Spacers', 'bag', 5.98, 'Home Depot'),
('tile', 'accessories', 'Grout Sealer', 'quart', 18.98, 'Home Depot'),
('tile', 'trim', 'Bullnose Tile', 'lf', 8.98, 'Floor & Decor'),
('tile', 'trim', 'Schluter Strip', 'lf', 12.98, 'Home Depot')
) AS v(trade, category, name, unit, unit_price, supplier)
WHERE NOT EXISTS (
    SELECT 1 FROM materials_database m 
    WHERE m.trade = v.trade 
    AND m.name = v.name
);

-- Only insert labor rates if they don't already exist
INSERT INTO labor_rates (trade, skill_level, hourly_rate, overtime_rate)
SELECT * FROM (VALUES
('concrete', 'apprentice', 25.00, 37.50),
('concrete', 'journeyman', 35.00, 52.50),
('concrete', 'master', 45.00, 67.50),
('deck', 'apprentice', 26.00, 39.00),
('deck', 'journeyman', 36.00, 54.00),
('deck', 'master', 48.00, 72.00),
('doors_windows', 'apprentice', 28.00, 42.00),
('doors_windows', 'journeyman', 38.00, 57.00),
('doors_windows', 'master', 50.00, 75.00),
('drywall', 'apprentice', 22.00, 33.00),
('drywall', 'journeyman', 32.00, 48.00),
('drywall', 'master', 42.00, 63.00),
('electrical', 'apprentice', 30.00, 45.00),
('electrical', 'journeyman', 45.00, 67.50),
('electrical', 'master', 65.00, 97.50),
('excavation', 'apprentice', 28.00, 42.00),
('excavation', 'journeyman', 38.00, 57.00),
('excavation', 'master', 50.00, 75.00),
('fence', 'apprentice', 24.00, 36.00),
('fence', 'journeyman', 34.00, 51.00),
('fence', 'master', 44.00, 66.00),
('flooring', 'apprentice', 26.00, 39.00),
('flooring', 'journeyman', 36.00, 54.00),
('flooring', 'master', 48.00, 72.00),
('foundation', 'apprentice', 30.00, 45.00),
('foundation', 'journeyman', 40.00, 60.00),
('foundation', 'master', 55.00, 82.50),
('framing', 'apprentice', 28.00, 42.00),
('framing', 'journeyman', 38.00, 57.00),
('framing', 'master', 50.00, 75.00),
('gutter', 'apprentice', 24.00, 36.00),
('gutter', 'journeyman', 34.00, 51.00),
('gutter', 'master', 44.00, 66.00),
('hvac', 'apprentice', 32.00, 48.00),
('hvac', 'journeyman', 48.00, 72.00),
('hvac', 'master', 68.00, 102.00),
('junk_removal', 'apprentice', 20.00, 30.00),
('junk_removal', 'journeyman', 28.00, 42.00),
('junk_removal', 'master', 35.00, 52.50),
('paint', 'apprentice', 20.00, 30.00),
('paint', 'journeyman', 30.00, 45.00),
('paint', 'master', 40.00, 60.00),
('pavers', 'apprentice', 26.00, 39.00),
('pavers', 'journeyman', 36.00, 54.00),
('pavers', 'master', 46.00, 69.00),
('plumbing', 'apprentice', 30.00, 45.00),
('plumbing', 'journeyman', 45.00, 67.50),
('plumbing', 'master', 65.00, 97.50),
('retaining_walls', 'apprentice', 28.00, 42.00),
('retaining_walls', 'journeyman', 38.00, 57.00),
('retaining_walls', 'master', 50.00, 75.00),
('roofing', 'apprentice', 26.00, 39.00),
('roofing', 'journeyman', 36.00, 54.00),
('roofing', 'master', 48.00, 72.00),
('siding', 'apprentice', 26.00, 39.00),
('siding', 'journeyman', 36.00, 54.00),
('siding', 'master', 46.00, 69.00),
('tile', 'apprentice', 28.00, 42.00),
('tile', 'journeyman', 38.00, 57.00),
('tile', 'master', 50.00, 75.00)
) AS v(trade, skill_level, hourly_rate, overtime_rate)
WHERE NOT EXISTS (
    SELECT 1 FROM labor_rates l 
    WHERE l.trade = v.trade 
    AND l.skill_level = v.skill_level
);

-- Verify the data was inserted
SELECT 'Materials count by trade:' as info;
SELECT trade, COUNT(*) as count 
FROM materials_database 
GROUP BY trade 
ORDER BY trade;

SELECT 'Labor rates count by trade:' as info;
SELECT trade, COUNT(*) as count 
FROM labor_rates 
GROUP BY trade 
ORDER BY trade;