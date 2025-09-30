-- Complete Materials Database for ALL Calculators
-- This SQL populates the materials_database table with items for all 20 calculators

-- Clear existing materials to avoid duplicates
DELETE FROM materials_database;

-- CONCRETE MATERIALS
INSERT INTO materials_database (trade, category, name, unit, unit_price, supplier) VALUES
('concrete', 'concrete', '60lb Concrete Bag', 'each', 6.98, 'Home Depot'),
('concrete', 'concrete', '80lb Concrete Bag', 'each', 8.98, 'Home Depot'),
('concrete', 'concrete', 'Ready-Mix Concrete', 'cubic yard', 185.00, 'Local Supplier'),
('concrete', 'concrete', 'High-Strength Concrete', 'cubic yard', 210.00, 'Local Supplier'),
('concrete', 'reinforcement', '#3 Rebar 20ft', 'each', 6.98, 'Home Depot'),
('concrete', 'reinforcement', '#4 Rebar 20ft', 'each', 8.98, 'Home Depot'),
('concrete', 'reinforcement', '#5 Rebar 20ft', 'each', 12.98, 'Home Depot'),
('concrete', 'reinforcement', '6x6 Wire Mesh', 'sqft', 0.35, 'Home Depot'),
('concrete', 'reinforcement', '4x4 Wire Mesh', 'sqft', 0.45, 'Home Depot'),
('concrete', 'forms', 'Form Boards 2x12', 'lf', 3.50, 'Home Depot'),
('concrete', 'additives', 'Concrete Sealer', 'gallon', 25.98, 'Home Depot');

-- DECK MATERIALS
INSERT INTO materials_database (trade, category, name, unit, unit_price, supplier) VALUES
('deck', 'decking', 'Pressure Treated 5/4x6x12', 'each', 12.98, 'Lowes'),
('deck', 'decking', 'Composite Decking 1x6x12', 'each', 45.98, 'Lowes'),
('deck', 'decking', 'Cedar Decking 5/4x6x12', 'each', 28.98, 'Lowes'),
('deck', 'structure', '6x6 Post PT', 'each', 45.98, 'Lowes'),
('deck', 'structure', '2x8x12 Joist PT', 'each', 18.98, 'Lowes'),
('deck', 'structure', '2x10x12 Joist PT', 'each', 24.98, 'Lowes'),
('deck', 'hardware', 'Joist Hangers', 'each', 1.98, 'Lowes'),
('deck', 'hardware', 'Post Base', 'each', 8.98, 'Lowes'),
('deck', 'hardware', 'Deck Screws 5lb', 'box', 35.98, 'Lowes'),
('deck', 'railing', 'Wood Railing Kit 8ft', 'each', 89.98, 'Lowes'),
('deck', 'railing', 'Aluminum Railing 8ft', 'each', 149.98, 'Lowes'),
('deck', 'stairs', 'Stair Stringers', 'each', 18.98, 'Lowes');

-- DOORS & WINDOWS MATERIALS
INSERT INTO materials_database (trade, category, name, unit, unit_price, supplier) VALUES
('doors_windows', 'doors', 'Interior Door Slab', 'each', 89.98, 'Home Depot'),
('doors_windows', 'doors', 'Prehung Interior Door', 'each', 189.98, 'Home Depot'),
('doors_windows', 'doors', 'Exterior Door Fiberglass', 'each', 389.98, 'Home Depot'),
('doors_windows', 'doors', 'French Doors', 'pair', 1289.98, 'Home Depot'),
('doors_windows', 'doors', 'Sliding Glass Door', 'each', 889.98, 'Home Depot'),
('doors_windows', 'windows', 'Single Hung Window', 'each', 189.98, 'Home Depot'),
('doors_windows', 'windows', 'Double Hung Window', 'each', 289.98, 'Home Depot'),
('doors_windows', 'windows', 'Casement Window', 'each', 389.98, 'Home Depot'),
('doors_windows', 'windows', 'Bay Window', 'each', 1489.98, 'Home Depot'),
('doors_windows', 'hardware', 'Door Knob Set', 'each', 45.98, 'Home Depot'),
('doors_windows', 'hardware', 'Deadbolt', 'each', 65.98, 'Home Depot'),
('doors_windows', 'trim', 'Door Trim Kit', 'each', 35.98, 'Home Depot'),
('doors_windows', 'trim', 'Window Trim Kit', 'each', 28.98, 'Home Depot');

-- DRYWALL MATERIALS
INSERT INTO materials_database (trade, category, name, unit, unit_price, supplier) VALUES
('drywall', 'drywall', '1/2" Drywall 4x8', 'sheet', 12.98, 'Home Depot'),
('drywall', 'drywall', '5/8" Drywall 4x8', 'sheet', 14.98, 'Home Depot'),
('drywall', 'drywall', '1/2" Moisture Resistant 4x8', 'sheet', 18.98, 'Home Depot'),
('drywall', 'drywall', '1/2" Fire Rated 4x8', 'sheet', 16.98, 'Home Depot'),
('drywall', 'finishing', 'Joint Compound 5gal', 'bucket', 15.98, 'Home Depot'),
('drywall', 'finishing', 'Drywall Tape 500ft', 'roll', 6.98, 'Home Depot'),
('drywall', 'finishing', 'Corner Bead 10ft', 'each', 4.98, 'Home Depot'),
('drywall', 'fasteners', 'Drywall Screws 5lb', 'box', 24.98, 'Home Depot'),
('drywall', 'tools', 'Taping Knife Set', 'set', 35.98, 'Home Depot'),
('drywall', 'texture', 'Texture Spray', 'can', 12.98, 'Home Depot');

-- ELECTRICAL MATERIALS
INSERT INTO materials_database (trade, category, name, unit, unit_price, supplier) VALUES
('electrical', 'wire', '12-2 Romex 250ft', 'roll', 89.98, 'Home Depot'),
('electrical', 'wire', '14-2 Romex 250ft', 'roll', 65.98, 'Home Depot'),
('electrical', 'wire', '10-3 Romex 100ft', 'roll', 125.98, 'Home Depot'),
('electrical', 'wire', '6-3 Romex 50ft', 'roll', 189.98, 'Home Depot'),
('electrical', 'outlets', 'Standard Outlet', 'each', 2.98, 'Home Depot'),
('electrical', 'outlets', 'GFCI Outlet', 'each', 18.98, 'Home Depot'),
('electrical', 'outlets', 'USB Outlet', 'each', 24.98, 'Home Depot'),
('electrical', 'switches', 'Single Pole Switch', 'each', 3.98, 'Home Depot'),
('electrical', 'switches', 'Dimmer Switch', 'each', 18.98, 'Home Depot'),
('electrical', 'switches', '3-Way Switch', 'each', 6.98, 'Home Depot'),
('electrical', 'breakers', '20 Amp Breaker', 'each', 12.98, 'Home Depot'),
('electrical', 'breakers', '30 Amp Breaker', 'each', 14.98, 'Home Depot'),
('electrical', 'conduit', '1/2" EMT Conduit 10ft', 'each', 6.98, 'Home Depot'),
('electrical', 'boxes', 'Single Gang Box', 'each', 1.98, 'Home Depot'),
('electrical', 'boxes', 'Double Gang Box', 'each', 2.98, 'Home Depot');

-- EXCAVATION MATERIALS
INSERT INTO materials_database (trade, category, name, unit, unit_price, supplier) VALUES
('excavation', 'fill', 'Topsoil', 'cubic yard', 35.00, 'Landscape Supply'),
('excavation', 'fill', 'Fill Dirt', 'cubic yard', 15.00, 'Landscape Supply'),
('excavation', 'fill', 'Sand', 'cubic yard', 40.00, 'Landscape Supply'),
('excavation', 'gravel', 'Pea Gravel', 'cubic yard', 45.00, 'Landscape Supply'),
('excavation', 'gravel', 'Crushed Stone', 'cubic yard', 38.00, 'Landscape Supply'),
('excavation', 'gravel', 'River Rock', 'cubic yard', 65.00, 'Landscape Supply'),
('excavation', 'drainage', 'French Drain Pipe 100ft', 'roll', 89.98, 'Home Depot'),
('excavation', 'drainage', 'Drainage Fabric 100sqft', 'roll', 45.98, 'Home Depot'),
('excavation', 'erosion', 'Silt Fence 100ft', 'roll', 35.98, 'Home Depot'),
('excavation', 'equipment', 'Equipment Rental Daily', 'day', 350.00, 'Rental Company');

-- FENCING MATERIALS
INSERT INTO materials_database (trade, category, name, unit, unit_price, supplier) VALUES
('fence', 'posts', '4x4x8 PT Post', 'each', 12.98, 'Home Depot'),
('fence', 'posts', 'Metal T-Post 6ft', 'each', 8.98, 'Tractor Supply'),
('fence', 'posts', 'Vinyl Post 5x5x8', 'each', 45.98, 'Home Depot'),
('fence', 'panels', 'Wood Fence Panel 6x8', 'each', 65.98, 'Home Depot'),
('fence', 'panels', 'Vinyl Fence Panel 6x8', 'each', 125.98, 'Home Depot'),
('fence', 'panels', 'Chain Link Panel 6x10', 'each', 89.98, 'Home Depot'),
('fence', 'pickets', 'Wood Picket 1x6x6', 'each', 2.98, 'Home Depot'),
('fence', 'rails', '2x4x8 Rail PT', 'each', 8.98, 'Home Depot'),
('fence', 'hardware', 'Gate Hardware Kit', 'set', 45.98, 'Home Depot'),
('fence', 'hardware', 'Post Cap', 'each', 4.98, 'Home Depot'),
('fence', 'concrete', 'Post Concrete 50lb', 'bag', 6.98, 'Home Depot'),
('fence', 'gates', 'Wood Gate 4ft', 'each', 149.98, 'Home Depot'),
('fence', 'gates', 'Chain Link Gate 4ft', 'each', 89.98, 'Home Depot');

-- FLOORING MATERIALS
INSERT INTO materials_database (trade, category, name, unit, unit_price, supplier) VALUES
('flooring', 'hardwood', 'Oak Hardwood 3/4"', 'sqft', 4.98, 'Floor & Decor'),
('flooring', 'hardwood', 'Maple Hardwood 3/4"', 'sqft', 5.98, 'Floor & Decor'),
('flooring', 'hardwood', 'Bamboo Flooring', 'sqft', 3.98, 'Floor & Decor'),
('flooring', 'engineered', 'Engineered Oak', 'sqft', 3.49, 'Floor & Decor'),
('flooring', 'laminate', 'Laminate Flooring 8mm', 'sqft', 1.98, 'Floor & Decor'),
('flooring', 'laminate', 'Laminate Flooring 12mm', 'sqft', 2.98, 'Floor & Decor'),
('flooring', 'vinyl', 'Luxury Vinyl Plank', 'sqft', 2.49, 'Floor & Decor'),
('flooring', 'vinyl', 'Sheet Vinyl', 'sqft', 1.49, 'Floor & Decor'),
('flooring', 'tile', 'Ceramic Tile 12x12', 'sqft', 2.98, 'Floor & Decor'),
('flooring', 'tile', 'Porcelain Tile 24x24', 'sqft', 4.98, 'Floor & Decor'),
('flooring', 'carpet', 'Carpet', 'sqft', 2.98, 'Floor & Decor'),
('flooring', 'carpet', 'Carpet Pad', 'sqft', 0.49, 'Floor & Decor'),
('flooring', 'underlayment', 'Underlayment', 'sqft', 0.35, 'Floor & Decor'),
('flooring', 'transition', 'Transition Strip', 'lf', 4.98, 'Floor & Decor'),
('flooring', 'baseboard', 'Baseboard', 'lf', 2.98, 'Floor & Decor');

-- FOUNDATION MATERIALS
INSERT INTO materials_database (trade, category, name, unit, unit_price, supplier) VALUES
('foundation', 'concrete', 'Foundation Mix', 'cubic yard', 195.00, 'Concrete Supplier'),
('foundation', 'blocks', 'Concrete Block 8x8x16', 'each', 2.98, 'Home Depot'),
('foundation', 'blocks', 'Concrete Block 12x8x16', 'each', 3.98, 'Home Depot'),
('foundation', 'waterproofing', 'Foundation Sealer 5gal', 'bucket', 89.98, 'Home Depot'),
('foundation', 'waterproofing', 'Waterproof Membrane', 'sqft', 1.25, 'Home Depot'),
('foundation', 'drainage', 'Foundation Drain Tile 100ft', 'roll', 125.98, 'Home Depot'),
('foundation', 'insulation', 'Rigid Foam 2" 4x8', 'sheet', 28.98, 'Home Depot'),
('foundation', 'reinforcement', 'Foundation Rebar #5', 'each', 12.98, 'Home Depot'),
('foundation', 'forms', 'Foundation Forms', 'sqft', 3.50, 'Form Rental'),
('foundation', 'anchor', 'Anchor Bolts 1/2"', 'each', 2.98, 'Home Depot'),
('foundation', 'vapor', 'Vapor Barrier 1000sqft', 'roll', 89.98, 'Home Depot');

-- FRAMING MATERIALS
INSERT INTO materials_database (trade, category, name, unit, unit_price, supplier) VALUES
('framing', 'lumber', '2x4x8 Stud', 'each', 5.98, 'Home Depot'),
('framing', 'lumber', '2x4x10 Stud', 'each', 7.98, 'Home Depot'),
('framing', 'lumber', '2x6x8 Stud', 'each', 8.98, 'Home Depot'),
('framing', 'lumber', '2x6x10 Stud', 'each', 11.98, 'Home Depot'),
('framing', 'lumber', '2x8x10 Joist', 'each', 14.98, 'Home Depot'),
('framing', 'lumber', '2x8x12 Joist', 'each', 17.98, 'Home Depot'),
('framing', 'lumber', '2x10x12 Joist', 'each', 22.98, 'Home Depot'),
('framing', 'lumber', '2x12x12 Joist', 'each', 32.98, 'Home Depot'),
('framing', 'engineered', 'LVL Beam 2x10x20', 'each', 89.98, 'Home Depot'),
('framing', 'engineered', 'I-Joist 12" x 20ft', 'each', 65.98, 'Home Depot'),
('framing', 'sheathing', '7/16 OSB 4x8', 'sheet', 24.98, 'Home Depot'),
('framing', 'sheathing', '1/2 Plywood 4x8', 'sheet', 32.98, 'Home Depot'),
('framing', 'sheathing', '5/8 Plywood 4x8', 'sheet', 38.98, 'Home Depot'),
('framing', 'hardware', 'Hurricane Ties', 'each', 1.98, 'Home Depot'),
('framing', 'hardware', 'Joist Hangers 2x8', 'each', 2.98, 'Home Depot'),
('framing', 'fasteners', 'Framing Nails 50lb', 'box', 65.98, 'Home Depot');

-- GUTTER MATERIALS
INSERT INTO materials_database (trade, category, name, unit, unit_price, supplier) VALUES
('gutter', 'gutters', 'K-Style Gutter 5" 10ft', 'each', 12.98, 'Home Depot'),
('gutter', 'gutters', 'K-Style Gutter 6" 10ft', 'each', 14.98, 'Home Depot'),
('gutter', 'gutters', 'Half Round Gutter 10ft', 'each', 18.98, 'Home Depot'),
('gutter', 'downspouts', 'Downspout 2x3 10ft', 'each', 9.98, 'Home Depot'),
('gutter', 'downspouts', 'Downspout 3x4 10ft', 'each', 11.98, 'Home Depot'),
('gutter', 'accessories', 'End Cap', 'each', 3.98, 'Home Depot'),
('gutter', 'accessories', 'Corner Piece', 'each', 8.98, 'Home Depot'),
('gutter', 'accessories', 'Gutter Outlet', 'each', 6.98, 'Home Depot'),
('gutter', 'accessories', 'Downspout Elbow', 'each', 4.98, 'Home Depot'),
('gutter', 'hangers', 'Gutter Hangers', 'each', 2.98, 'Home Depot'),
('gutter', 'guards', 'Gutter Guard 20ft', 'each', 45.98, 'Home Depot'),
('gutter', 'sealant', 'Gutter Sealant', 'tube', 6.98, 'Home Depot');

-- HVAC MATERIALS
INSERT INTO materials_database (trade, category, name, unit, unit_price, supplier) VALUES
('hvac', 'equipment', 'AC Unit 2 Ton', 'each', 2489.00, 'HVAC Supply'),
('hvac', 'equipment', 'AC Unit 3 Ton', 'each', 2989.00, 'HVAC Supply'),
('hvac', 'equipment', 'Furnace 80k BTU', 'each', 1589.00, 'HVAC Supply'),
('hvac', 'equipment', 'Heat Pump 2 Ton', 'each', 3289.00, 'HVAC Supply'),
('hvac', 'ductwork', 'Flex Duct 6" 25ft', 'each', 45.98, 'HVAC Supply'),
('hvac', 'ductwork', 'Flex Duct 8" 25ft', 'each', 55.98, 'HVAC Supply'),
('hvac', 'ductwork', 'Sheet Metal Duct 8x8', 'lf', 12.98, 'HVAC Supply'),
('hvac', 'vents', 'Supply Vent 4x10', 'each', 8.98, 'Home Depot'),
('hvac', 'vents', 'Return Vent 20x20', 'each', 24.98, 'Home Depot'),
('hvac', 'thermostat', 'Programmable Thermostat', 'each', 149.98, 'Home Depot'),
('hvac', 'thermostat', 'Smart Thermostat', 'each', 249.98, 'Home Depot'),
('hvac', 'refrigerant', 'R410A Refrigerant', 'lb', 45.00, 'HVAC Supply'),
('hvac', 'insulation', 'Duct Insulation', 'sqft', 1.25, 'Home Depot');

-- JUNK REMOVAL MATERIALS/SERVICES
INSERT INTO materials_database (trade, category, name, unit, unit_price, supplier) VALUES
('junk_removal', 'dumpster', '10 Yard Dumpster', 'week', 350.00, 'Waste Management'),
('junk_removal', 'dumpster', '20 Yard Dumpster', 'week', 450.00, 'Waste Management'),
('junk_removal', 'dumpster', '30 Yard Dumpster', 'week', 550.00, 'Waste Management'),
('junk_removal', 'dumpster', '40 Yard Dumpster', 'week', 650.00, 'Waste Management'),
('junk_removal', 'bags', 'Contractor Bags 50pk', 'box', 35.98, 'Home Depot'),
('junk_removal', 'service', 'Hauling Service', 'load', 150.00, 'Junk Service'),
('junk_removal', 'disposal', 'Landfill Fee', 'ton', 65.00, 'Landfill'),
('junk_removal', 'disposal', 'Recycling Fee', 'ton', 35.00, 'Recycling Center'),
('junk_removal', 'special', 'Hazardous Waste', 'gallon', 12.00, 'Waste Service'),
('junk_removal', 'special', 'E-Waste Disposal', 'item', 25.00, 'Recycling Center');

-- PAINT MATERIALS
INSERT INTO materials_database (trade, category, name, unit, unit_price, supplier) VALUES
('paint', 'paint', 'Interior Paint Flat', 'gallon', 28.98, 'Sherwin Williams'),
('paint', 'paint', 'Interior Paint Eggshell', 'gallon', 32.98, 'Sherwin Williams'),
('paint', 'paint', 'Interior Paint Semi-Gloss', 'gallon', 35.98, 'Sherwin Williams'),
('paint', 'paint', 'Exterior Paint Flat', 'gallon', 38.98, 'Sherwin Williams'),
('paint', 'paint', 'Exterior Paint Satin', 'gallon', 42.98, 'Sherwin Williams'),
('paint', 'paint', 'Exterior Paint Gloss', 'gallon', 45.98, 'Sherwin Williams'),
('paint', 'primer', 'Interior Primer', 'gallon', 24.98, 'Sherwin Williams'),
('paint', 'primer', 'Exterior Primer', 'gallon', 28.98, 'Sherwin Williams'),
('paint', 'primer', 'Stain Blocking Primer', 'gallon', 32.98, 'Sherwin Williams'),
('paint', 'stain', 'Wood Stain', 'gallon', 35.98, 'Sherwin Williams'),
('paint', 'stain', 'Concrete Stain', 'gallon', 45.98, 'Sherwin Williams'),
('paint', 'supplies', 'Roller Kit', 'set', 18.98, 'Home Depot'),
('paint', 'supplies', 'Brush Set', 'set', 24.98, 'Home Depot'),
('paint', 'supplies', 'Drop Cloth 9x12', 'each', 12.98, 'Home Depot'),
('paint', 'supplies', 'Painters Tape 2"', 'roll', 8.98, 'Home Depot'),
('paint', 'texture', 'Texture Compound', 'bag', 14.98, 'Home Depot');

-- PAVERS MATERIALS
INSERT INTO materials_database (trade, category, name, unit, unit_price, supplier) VALUES
('pavers', 'pavers', 'Concrete Paver 12x12', 'sqft', 2.98, 'Landscape Supply'),
('pavers', 'pavers', 'Brick Paver 4x8', 'sqft', 3.98, 'Landscape Supply'),
('pavers', 'pavers', 'Natural Stone Paver', 'sqft', 8.98, 'Landscape Supply'),
('pavers', 'pavers', 'Permeable Paver', 'sqft', 4.98, 'Landscape Supply'),
('pavers', 'base', 'Paver Base', 'cubic yard', 32.00, 'Landscape Supply'),
('pavers', 'base', 'Paver Sand', 'cubic yard', 38.00, 'Landscape Supply'),
('pavers', 'sand', 'Polymeric Sand 50lb', 'bag', 24.98, 'Home Depot'),
('pavers', 'edging', 'Paver Edging 8ft', 'each', 12.98, 'Home Depot'),
('pavers', 'edging', 'Edging Spikes', 'each', 0.98, 'Home Depot'),
('pavers', 'fabric', 'Landscape Fabric', 'sqft', 0.25, 'Home Depot'),
('pavers', 'sealer', 'Paver Sealer', 'gallon', 45.98, 'Home Depot');

-- PLUMBING MATERIALS
INSERT INTO materials_database (trade, category, name, unit, unit_price, supplier) VALUES
('plumbing', 'pipe', '1/2" Copper Pipe 10ft', 'each', 18.98, 'Home Depot'),
('plumbing', 'pipe', '3/4" Copper Pipe 10ft', 'each', 24.98, 'Home Depot'),
('plumbing', 'pipe', '1/2" PEX Pipe 100ft', 'roll', 45.98, 'Home Depot'),
('plumbing', 'pipe', '3/4" PEX Pipe 100ft', 'roll', 65.98, 'Home Depot'),
('plumbing', 'pipe', '1.5" PVC Pipe 10ft', 'each', 8.98, 'Home Depot'),
('plumbing', 'pipe', '2" PVC Pipe 10ft', 'each', 12.98, 'Home Depot'),
('plumbing', 'pipe', '3" PVC Pipe 10ft', 'each', 18.98, 'Home Depot'),
('plumbing', 'pipe', '4" PVC Pipe 10ft', 'each', 24.98, 'Home Depot'),
('plumbing', 'fittings', 'Copper Elbow 1/2"', 'each', 2.98, 'Home Depot'),
('plumbing', 'fittings', 'PEX Fitting Kit', 'set', 45.98, 'Home Depot'),
('plumbing', 'fittings', 'PVC Fitting Kit', 'set', 35.98, 'Home Depot'),
('plumbing', 'valves', 'Ball Valve 1/2"', 'each', 12.98, 'Home Depot'),
('plumbing', 'valves', 'Shutoff Valve', 'each', 8.98, 'Home Depot'),
('plumbing', 'fixtures', 'Kitchen Faucet', 'each', 149.98, 'Home Depot'),
('plumbing', 'fixtures', 'Bathroom Faucet', 'each', 89.98, 'Home Depot'),
('plumbing', 'fixtures', 'Toilet Standard', 'each', 189.98, 'Home Depot'),
('plumbing', 'fixtures', 'Toilet High Efficiency', 'each', 289.98, 'Home Depot'),
('plumbing', 'water heater', 'Water Heater 40gal', 'each', 589.98, 'Home Depot'),
('plumbing', 'water heater', 'Tankless Water Heater', 'each', 1189.98, 'Home Depot');

-- RETAINING WALL MATERIALS
INSERT INTO materials_database (trade, category, name, unit, unit_price, supplier) VALUES
('retaining_walls', 'blocks', 'Retaining Wall Block', 'sqft', 4.98, 'Landscape Supply'),
('retaining_walls', 'blocks', 'Corner Block', 'each', 8.98, 'Landscape Supply'),
('retaining_walls', 'blocks', 'Cap Block', 'lf', 6.98, 'Landscape Supply'),
('retaining_walls', 'timber', 'Landscape Timber 8ft', 'each', 12.98, 'Home Depot'),
('retaining_walls', 'stone', 'Natural Stone', 'ton', 185.00, 'Stone Yard'),
('retaining_walls', 'drainage', 'Drainage Gravel', 'cubic yard', 42.00, 'Landscape Supply'),
('retaining_walls', 'drainage', 'Drain Pipe 4" 100ft', 'roll', 89.98, 'Home Depot'),
('retaining_walls', 'fabric', 'Geotextile Fabric', 'sqft', 0.35, 'Home Depot'),
('retaining_walls', 'reinforcement', 'Geogrid', 'sqft', 1.98, 'Specialty Supply'),
('retaining_walls', 'adhesive', 'Construction Adhesive', 'tube', 8.98, 'Home Depot'),
('retaining_walls', 'backfill', 'Backfill Material', 'cubic yard', 28.00, 'Landscape Supply');

-- SIDING MATERIALS
INSERT INTO materials_database (trade, category, name, unit, unit_price, supplier) VALUES
('siding', 'vinyl', 'Vinyl Siding', 'square', 189.98, 'Home Depot'),
('siding', 'vinyl', 'Vinyl Corner Post', 'each', 24.98, 'Home Depot'),
('siding', 'vinyl', 'J-Channel', 'each', 8.98, 'Home Depot'),
('siding', 'wood', 'Cedar Siding', 'sqft', 4.98, 'Lumber Yard'),
('siding', 'wood', 'Pine Siding', 'sqft', 2.98, 'Lumber Yard'),
('siding', 'fiber', 'Fiber Cement Siding', 'sqft', 3.98, 'Home Depot'),
('siding', 'fiber', 'Fiber Cement Trim', 'lf', 4.98, 'Home Depot'),
('siding', 'metal', 'Metal Siding', 'sqft', 5.98, 'Metal Supply'),
('siding', 'housewrap', 'House Wrap 9x150', 'roll', 149.98, 'Home Depot'),
('siding', 'insulation', 'Foam Board 1" 4x8', 'sheet', 22.98, 'Home Depot'),
('siding', 'trim', 'Soffit', 'sqft', 2.98, 'Home Depot'),
('siding', 'trim', 'Fascia Board', 'lf', 3.98, 'Home Depot'),
('siding', 'fasteners', 'Siding Nails 5lb', 'box', 35.98, 'Home Depot');

-- TILE MATERIALS
INSERT INTO materials_database (trade, category, name, unit, unit_price, supplier) VALUES
('tile', 'tile', 'Ceramic Tile 12x12', 'sqft', 2.98, 'Tile Shop'),
('tile', 'tile', 'Porcelain Tile 12x24', 'sqft', 4.98, 'Tile Shop'),
('tile', 'tile', 'Natural Stone Tile', 'sqft', 8.98, 'Tile Shop'),
('tile', 'tile', 'Glass Tile', 'sqft', 12.98, 'Tile Shop'),
('tile', 'tile', 'Mosaic Tile', 'sqft', 15.98, 'Tile Shop'),
('tile', 'tile', 'Subway Tile 3x6', 'sqft', 5.98, 'Tile Shop'),
('tile', 'setting', 'Thinset 50lb', 'bag', 14.98, 'Home Depot'),
('tile', 'setting', 'Mastic Adhesive', 'gallon', 28.98, 'Home Depot'),
('tile', 'grout', 'Sanded Grout 25lb', 'bag', 18.98, 'Home Depot'),
('tile', 'grout', 'Unsanded Grout 10lb', 'bag', 14.98, 'Home Depot'),
('tile', 'grout', 'Epoxy Grout', 'kit', 45.98, 'Home Depot'),
('tile', 'sealer', 'Grout Sealer', 'quart', 18.98, 'Home Depot'),
('tile', 'sealer', 'Stone Sealer', 'gallon', 35.98, 'Home Depot'),
('tile', 'trim', 'Bullnose Tile', 'lf', 6.98, 'Tile Shop'),
('tile', 'trim', 'Metal Edge Trim', 'lf', 8.98, 'Tile Shop'),
('tile', 'underlayment', 'Cement Board 3x5', 'sheet', 12.98, 'Home Depot'),
('tile', 'underlayment', 'Uncoupling Membrane', 'sqft', 1.98, 'Tile Shop'),
('tile', 'tools', 'Tile Spacers 1/4"', 'bag', 4.98, 'Home Depot');

-- Add more labor rates for all trades
INSERT INTO labor_rates (trade, skill_level, hourly_rate, overtime_rate) VALUES
-- Deck
('deck', 'apprentice', 25.00, 37.50),
('deck', 'journeyman', 35.00, 52.50),
('deck', 'master', 45.00, 67.50),
-- Doors & Windows
('doors_windows', 'apprentice', 28.00, 42.00),
('doors_windows', 'journeyman', 38.00, 57.00),
('doors_windows', 'master', 48.00, 72.00),
-- Excavation
('excavation', 'operator', 45.00, 67.50),
('excavation', 'laborer', 25.00, 37.50),
-- Fencing
('fence', 'apprentice', 22.00, 33.00),
('fence', 'journeyman', 32.00, 48.00),
('fence', 'master', 42.00, 63.00),
-- Flooring
('flooring', 'apprentice', 25.00, 37.50),
('flooring', 'journeyman', 35.00, 52.50),
('flooring', 'master', 45.00, 67.50),
-- Foundation
('foundation', 'apprentice', 30.00, 45.00),
('foundation', 'journeyman', 40.00, 60.00),
('foundation', 'master', 55.00, 82.50),
-- Gutters
('gutter', 'apprentice', 22.00, 33.00),
('gutter', 'journeyman', 32.00, 48.00),
('gutter', 'master', 42.00, 63.00),
-- HVAC
('hvac', 'apprentice', 35.00, 52.50),
('hvac', 'journeyman', 50.00, 75.00),
('hvac', 'master', 70.00, 105.00),
-- Junk Removal
('junk_removal', 'laborer', 20.00, 30.00),
('junk_removal', 'driver', 25.00, 37.50),
-- Pavers
('pavers', 'apprentice', 24.00, 36.00),
('pavers', 'journeyman', 34.00, 51.00),
('pavers', 'master', 44.00, 66.00),
-- Retaining Walls
('retaining_walls', 'apprentice', 26.00, 39.00),
('retaining_walls', 'journeyman', 36.00, 54.00),
('retaining_walls', 'master', 46.00, 69.00),
-- Siding
('siding', 'apprentice', 24.00, 36.00),
('siding', 'journeyman', 34.00, 51.00),
('siding', 'master', 44.00, 66.00),
-- Tile
('tile', 'apprentice', 28.00, 42.00),
('tile', 'journeyman', 38.00, 57.00),
('tile', 'master', 50.00, 75.00);