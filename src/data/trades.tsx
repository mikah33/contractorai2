import { Home, Hammer, Wrench, PaintBucket, Lightbulb, Maximize, Scale, Construction, Square as SquareFoot, Footprints, Trash2, Router, Layers, BellOff as WallOff, Thermometer, Droplet, Columns, DoorOpen as Door, Radiation as Foundation, Cloud } from 'lucide-react';
import { Trade } from '../types';

export const trades: Trade[] = [
  {
    id: 'deck',
    name: 'Deck',
    category: 'Exterior',
    icon: <Construction />,
    description: 'Custom deck building and installation',
    requiredFields: [
      {
        id: 'size',
        label: 'Deck Size',
        type: 'number',
        required: true,
        placeholder: 'Enter square footage',
        helpText: 'Total square footage of the deck area',
        unit: 'sq ft'
      },
      {
        id: 'material',
        label: 'Decking Material',
        type: 'select',
        required: true,
        options: [
          { value: 'pressure_treated', label: 'Pressure Treated Wood' },
          { value: 'cedar', label: 'Cedar' },
          { value: 'composite', label: 'Composite' },
          { value: 'pvc', label: 'PVC' },
          { value: 'tropical_hardwood', label: 'Tropical Hardwood' }
        ],
        helpText: 'Main material used for the deck surface'
      },
      {
        id: 'height',
        label: 'Height from Ground',
        type: 'select',
        required: true,
        options: [
          { value: 'ground_level', label: 'Ground Level (0-2 ft)' },
          { value: 'low', label: 'Low Elevation (2-4 ft)' },
          { value: 'medium', label: 'Medium Elevation (4-8 ft)' },
          { value: 'high', label: 'High Elevation (8+ ft)' }
        ]
      },
      {
        id: 'railing',
        label: 'Railing Type',
        type: 'select',
        required: true,
        options: [
          { value: 'none', label: 'No Railing' },
          { value: 'wood', label: 'Wood Railing' },
          { value: 'metal', label: 'Metal Railing' },
          { value: 'composite', label: 'Composite Railing' },
          { value: 'glass', label: 'Glass Railing' }
        ]
      }
    ],
    optionalFields: [
      {
        id: 'stairs',
        label: 'Stairs',
        type: 'checkbox',
        checkboxLabel: 'Include stairs in estimate'
      },
      {
        id: 'removal',
        label: 'Existing Deck Removal',
        type: 'checkbox',
        checkboxLabel: 'Include removal of existing deck'
      },
      {
        id: 'quality',
        label: 'Quality Level',
        type: 'radio',
        options: [
          { value: 'standard', label: 'Standard' },
          { value: 'premium', label: 'Premium' },
          { value: 'luxury', label: 'Luxury' }
        ]
      }
    ]
  },
  {
    id: 'siding',
    name: 'Siding',
    category: 'Exterior',
    icon: <Home />,
    description: 'Siding installation and replacement',
    requiredFields: [
      {
        id: 'area',
        label: 'Wall Area',
        type: 'number',
        required: true,
        placeholder: 'Enter square footage',
        helpText: 'Total square footage of walls to be sided',
        unit: 'sq ft'
      },
      {
        id: 'material',
        label: 'Siding Material',
        type: 'select',
        required: true,
        options: [
          { value: 'vinyl', label: 'Vinyl Siding' },
          { value: 'fiber_cement', label: 'Fiber Cement' },
          { value: 'wood', label: 'Wood Siding' },
          { value: 'metal', label: 'Metal Siding' },
          { value: 'stucco', label: 'Stucco' }
        ]
      }
    ],
    optionalFields: [
      {
        id: 'insulation',
        label: 'Insulation',
        type: 'checkbox',
        checkboxLabel: 'Include insulation'
      },
      {
        id: 'removal',
        label: 'Existing Siding Removal',
        type: 'checkbox',
        checkboxLabel: 'Include removal of existing siding'
      }
    ]
  },
  {
    id: 'concrete',
    name: 'Concrete',
    category: 'Exterior',
    icon: <Maximize />,
    description: 'Concrete slabs, driveways, and patios',
    requiredFields: [
      {
        id: 'area',
        label: 'Area',
        type: 'number',
        required: true,
        placeholder: 'Enter square footage',
        unit: 'sq ft'
      },
      {
        id: 'thickness',
        label: 'Thickness',
        type: 'select',
        required: true,
        options: [
          { value: '4_inch', label: '4 inches' },
          { value: '5_inch', label: '5 inches' },
          { value: '6_inch', label: '6 inches' }
        ]
      },
      {
        id: 'type',
        label: 'Application Type',
        type: 'select',
        required: true,
        options: [
          { value: 'driveway', label: 'Driveway' },
          { value: 'patio', label: 'Patio' },
          { value: 'walkway', label: 'Walkway' },
          { value: 'foundation', label: 'Foundation' }
        ]
      }
    ]
  },
  {
    id: 'pavers',
    name: 'Pavers',
    category: 'Exterior',
    icon: <SquareFoot />,
    description: 'Paver patios, walkways, and driveways',
    requiredFields: [
      {
        id: 'area',
        label: 'Area',
        type: 'number',
        required: true,
        placeholder: 'Enter square footage',
        unit: 'sq ft'
      }
    ]
  },
  {
    id: 'drywall',
    name: 'Drywall',
    category: 'Interior',
    icon: <WallOff />,
    description: 'Drywall installation and repair',
    requiredFields: [
      {
        id: 'area',
        label: 'Wall Area',
        type: 'number',
        required: true,
        placeholder: 'Enter square footage',
        unit: 'sq ft'
      }
    ]
  },
  {
    id: 'paint',
    name: 'Paint',
    category: 'Interior',
    icon: <PaintBucket />,
    description: 'Interior and exterior painting',
    requiredFields: [
      {
        id: 'area',
        label: 'Wall Area',
        type: 'number',
        required: true,
        placeholder: 'Enter square footage',
        unit: 'sq ft'
      },
      {
        id: 'location',
        label: 'Location',
        type: 'select',
        required: true,
        options: [
          { value: 'interior', label: 'Interior' },
          { value: 'exterior', label: 'Exterior' }
        ]
      }
    ]
  },
  {
    id: 'framing',
    name: 'Framing',
    category: 'Construction',
    icon: <Hammer />,
    description: 'Structural framing for new construction or remodels',
    requiredFields: [
      {
        id: 'area',
        label: 'Floor Area',
        type: 'number',
        required: true,
        placeholder: 'Enter square footage',
        unit: 'sq ft'
      }
    ]
  },
  {
    id: 'retaining_walls',
    name: 'Retaining Walls',
    category: 'Exterior',
    icon: <Columns />,
    description: 'Retaining wall construction',
    requiredFields: [
      {
        id: 'length',
        label: 'Wall Length',
        type: 'number',
        required: true,
        placeholder: 'Enter length',
        unit: 'ft'
      },
      {
        id: 'height',
        label: 'Wall Height',
        type: 'number',
        required: true,
        placeholder: 'Enter height',
        unit: 'ft'
      }
    ]
  },
  {
    id: 'excavation',
    name: 'Excavation',
    category: 'Site Work',
    icon: <Construction />,
    description: 'Site excavation and grading',
    requiredFields: [
      {
        id: 'area',
        label: 'Area',
        type: 'number',
        required: true,
        placeholder: 'Enter square footage',
        unit: 'sq ft'
      }
    ]
  },
  {
    id: 'flooring',
    name: 'Flooring',
    category: 'Interior',
    icon: <Footprints />,
    description: 'Flooring installation including hardwood, tile, carpet, and vinyl',
    requiredFields: [
      {
        id: 'area',
        label: 'Floor Area',
        type: 'number',
        required: true,
        placeholder: 'Enter square footage',
        unit: 'sq ft'
      },
      {
        id: 'material',
        label: 'Flooring Material',
        type: 'select',
        required: true,
        options: [
          { value: 'hardwood', label: 'Hardwood' },
          { value: 'laminate', label: 'Laminate' },
          { value: 'tile', label: 'Tile' },
          { value: 'vinyl', label: 'Vinyl/LVP' },
          { value: 'carpet', label: 'Carpet' }
        ]
      }
    ]
  },
  {
    id: 'tile',
    name: 'Tile',
    category: 'Interior',
    icon: <SquareFoot />,
    description: 'Tile installation for floors, walls, showers, and backsplashes',
    requiredFields: [
      {
        id: 'area',
        label: 'Tile Area',
        type: 'number',
        required: true,
        placeholder: 'Enter square footage',
        unit: 'sq ft'
      },
      {
        id: 'location',
        label: 'Location',
        type: 'select',
        required: true,
        options: [
          { value: 'floor', label: 'Floor' },
          { value: 'wall', label: 'Wall' },
          { value: 'shower', label: 'Shower' },
          { value: 'backsplash', label: 'Backsplash' }
        ]
      }
    ]
  },
  {
    id: 'electrical',
    name: 'Electrical',
    category: 'Systems',
    icon: <Lightbulb />,
    description: 'Electrical installation and repairs',
    requiredFields: [
      {
        id: 'service_type',
        label: 'Service Type',
        type: 'select',
        required: true,
        options: [
          { value: 'panel_upgrade', label: 'Panel Upgrade' },
          { value: 'new_outlets', label: 'New Outlets/Switches' },
          { value: 'lighting', label: 'Lighting Installation' },
          { value: 'rewiring', label: 'Rewiring' }
        ]
      },
      {
        id: 'quantity',
        label: 'Quantity',
        type: 'number',
        required: true,
        placeholder: 'Number of outlets/fixtures',
        unit: 'units'
      }
    ]
  },
  {
    id: 'hvac',
    name: 'HVAC',
    category: 'Systems',
    icon: <Thermometer />,
    description: 'Heating, ventilation, and air conditioning',
    requiredFields: [
      {
        id: 'service_type',
        label: 'Service Type',
        type: 'select',
        required: true,
        options: [
          { value: 'new_installation', label: 'New System Installation' },
          { value: 'replacement', label: 'System Replacement' },
          { value: 'ductwork', label: 'Ductwork' },
          { value: 'maintenance', label: 'Maintenance/Repair' }
        ]
      },
      {
        id: 'home_size',
        label: 'Home Size',
        type: 'number',
        required: true,
        placeholder: 'Enter square footage',
        unit: 'sq ft'
      }
    ]
  },
  {
    id: 'plumbing',
    name: 'Plumbing',
    category: 'Systems',
    icon: <Droplet />,
    description: 'Plumbing installation and repairs',
    requiredFields: [
      {
        id: 'service_type',
        label: 'Service Type',
        type: 'select',
        required: true,
        options: [
          { value: 'new_installation', label: 'New Plumbing Installation' },
          { value: 'repiping', label: 'Whole House Repiping' },
          { value: 'fixture', label: 'Fixture Installation' },
          { value: 'repair', label: 'Repair' }
        ]
      }
    ]
  },
  {
    id: 'doors_windows',
    name: 'Doors & Windows',
    category: 'Exterior',
    icon: <Door />,
    description: 'Door and window installation and replacement',
    requiredFields: [
      {
        id: 'type',
        label: 'Type',
        type: 'select',
        required: true,
        options: [
          { value: 'entry_door', label: 'Entry Door' },
          { value: 'interior_door', label: 'Interior Door' },
          { value: 'window', label: 'Window' },
          { value: 'patio_door', label: 'Patio/Sliding Door' }
        ]
      },
      {
        id: 'quantity',
        label: 'Quantity',
        type: 'number',
        required: true,
        placeholder: 'Number of doors/windows',
        unit: 'units'
      }
    ]
  },
  {
    id: 'fence',
    name: 'Fence',
    category: 'Exterior',
    icon: <Layers />,
    description: 'Fence installation and replacement',
    requiredFields: [
      {
        id: 'length',
        label: 'Fence Length',
        type: 'number',
        required: true,
        placeholder: 'Enter length',
        unit: 'ft'
      },
      {
        id: 'height',
        label: 'Fence Height',
        type: 'select',
        required: true,
        options: [
          { value: '4ft', label: '4 feet' },
          { value: '6ft', label: '6 feet' },
          { value: '8ft', label: '8 feet' }
        ]
      },
      {
        id: 'material',
        label: 'Fence Material',
        type: 'select',
        required: true,
        options: [
          { value: 'wood', label: 'Wood' },
          { value: 'vinyl', label: 'Vinyl' },
          { value: 'chain_link', label: 'Chain Link' },
          { value: 'metal', label: 'Metal/Aluminum' },
          { value: 'composite', label: 'Composite' }
        ]
      }
    ]
  },
  {
    id: 'foundation',
    name: 'Foundation',
    category: 'Construction',
    icon: <Foundation />,
    description: 'Foundation construction and repair',
    requiredFields: [
      {
        id: 'type',
        label: 'Foundation Type',
        type: 'select',
        required: true,
        options: [
          { value: 'strip_footing', label: 'Strip Footing' },
          { value: 'spread_footings', label: 'Spread Footings' },
          { value: 'slab', label: 'Slab on Grade' },
          { value: 'basement', label: 'Full Basement' },
          { value: 'crawlspace', label: 'Crawlspace' }
        ]
      },
      {
        id: 'area',
        label: 'Foundation Area',
        type: 'number',
        required: true,
        placeholder: 'Enter square footage',
        unit: 'sq ft'
      }
    ],
    optionalFields: [
      {
        id: 'depth',
        label: 'Foundation Depth',
        type: 'number',
        placeholder: 'Enter depth',
        unit: 'inches'
      },
      {
        id: 'waterproofing',
        label: 'Waterproofing',
        type: 'checkbox',
        checkboxLabel: 'Include waterproofing'
      },
      {
        id: 'insulation',
        label: 'Insulation',
        type: 'checkbox',
        checkboxLabel: 'Include insulation'
      }
    ]
  },
  {
    id: 'gutter',
    name: 'Gutters',
    category: 'Exterior',
    icon: <Cloud />,
    description: 'Gutter installation and replacement',
    requiredFields: [
      {
        id: 'length',
        label: 'Gutter Length',
        type: 'number',
        required: true,
        placeholder: 'Enter total length',
        unit: 'ft'
      },
      {
        id: 'material',
        label: 'Gutter Material',
        type: 'select',
        required: true,
        options: [
          { value: 'aluminum', label: 'Aluminum' },
          { value: 'vinyl', label: 'Vinyl' },
          { value: 'steel', label: 'Steel' },
          { value: 'copper', label: 'Copper' },
          { value: 'zinc', label: 'Zinc' }
        ]
      }
    ],
    optionalFields: [
      {
        id: 'downspouts',
        label: 'Downspouts',
        type: 'number',
        placeholder: 'Number of downspouts',
        unit: 'units'
      },
      {
        id: 'guards',
        label: 'Leaf Guards',
        type: 'checkbox',
        checkboxLabel: 'Include leaf guards'
      },
      {
        id: 'removal',
        label: 'Existing Gutter Removal',
        type: 'checkbox',
        checkboxLabel: 'Include removal of existing gutters'
      }
    ]
  },
  {
    id: 'junk_removal',
    name: 'Junk Removal',
    category: 'Site Work',
    icon: <Trash2 />,
    description: 'Removal and disposal of junk and debris',
    requiredFields: [
      {
        id: 'volume',
        label: 'Volume',
        type: 'number',
        required: true,
        placeholder: 'Enter volume',
        unit: 'cubic yards'
      },
      {
        id: 'type',
        label: 'Junk Type',
        type: 'select',
        required: true,
        options: [
          { value: 'household', label: 'Household Junk' },
          { value: 'construction', label: 'Construction Debris' },
          { value: 'yard', label: 'Yard Waste' },
          { value: 'furniture', label: 'Furniture' },
          { value: 'appliances', label: 'Appliances' },
          { value: 'electronics', label: 'Electronics' },
          { value: 'mixed', label: 'Mixed Materials' }
        ]
      }
    ],
    optionalFields: [
      {
        id: 'heavy_items',
        label: 'Heavy Items',
        type: 'number',
        placeholder: 'Number of items over 100 lbs',
        unit: 'items'
      },
      {
        id: 'stairs',
        label: 'Stair Carry',
        type: 'checkbox',
        checkboxLabel: 'Items need to be carried up/down stairs'
      },
      {
        id: 'sorting',
        label: 'Sorting',
        type: 'checkbox',
        checkboxLabel: 'Include sorting and recycling'
      }
    ]
  }
];