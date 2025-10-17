import { LucideIcon } from 'lucide-react';
import {
  Calculator,
  Home,
  Hammer,
  PaintBucket,
  Lightbulb,
  Maximize,
  Scale,
  Construction,
  Footprints,
  Trash2,
  Layers,
  Thermometer,
  Droplet,
  Columns,
  DoorOpen,
  Building2,
  Cloud,
  Warehouse
} from 'lucide-react';

export interface CalculatorInfo {
  id: string;
  name: string;
  translationKey: string;
  icon: LucideIcon;
  description: string;
  category: 'Exterior' | 'Interior' | 'Construction' | 'Systems' | 'Site Work';
  route: string;
}

export const calculatorRegistry: CalculatorInfo[] = [
  {
    id: 'deck',
    name: 'Deck Calculator',
    translationKey: 'trades.deck',
    icon: Construction,
    description: 'Custom deck building and installation',
    category: 'Exterior',
    route: '/pricing?calculator=deck'
  },
  {
    id: 'foundation',
    name: 'Foundation Calculator',
    translationKey: 'trades.foundation',
    icon: Building2,
    description: 'Foundation construction and repair',
    category: 'Construction',
    route: '/pricing?calculator=foundation'
  },
  {
    id: 'roofing',
    name: 'Roofing Calculator',
    translationKey: 'trades.roofing',
    icon: Warehouse,
    description: 'Roof installation and replacement',
    category: 'Exterior',
    route: '/pricing?calculator=roofing'
  },
  {
    id: 'concrete',
    name: 'Concrete Calculator',
    translationKey: 'trades.concrete',
    icon: Maximize,
    description: 'Concrete slabs, driveways, and patios',
    category: 'Exterior',
    route: '/pricing?calculator=concrete'
  },
  {
    id: 'siding',
    name: 'Siding Calculator',
    translationKey: 'trades.siding',
    icon: Home,
    description: 'Siding installation and replacement',
    category: 'Exterior',
    route: '/pricing?calculator=siding'
  },
  {
    id: 'pavers',
    name: 'Pavers Calculator',
    translationKey: 'trades.pavers',
    icon: Scale,
    description: 'Paver patios, walkways, and driveways',
    category: 'Exterior',
    route: '/pricing?calculator=pavers'
  },
  {
    id: 'drywall',
    name: 'Drywall Calculator',
    translationKey: 'trades.drywall',
    icon: Layers,
    description: 'Drywall installation and repair',
    category: 'Interior',
    route: '/pricing?calculator=drywall'
  },
  {
    id: 'paint',
    name: 'Paint Calculator',
    translationKey: 'trades.paint',
    icon: PaintBucket,
    description: 'Interior and exterior painting',
    category: 'Interior',
    route: '/pricing?calculator=paint'
  },
  {
    id: 'flooring',
    name: 'Flooring Calculator',
    translationKey: 'trades.flooring',
    icon: Footprints,
    description: 'Flooring installation (hardwood, tile, carpet, vinyl)',
    category: 'Interior',
    route: '/pricing?calculator=flooring'
  },
  {
    id: 'tile',
    name: 'Tile Calculator',
    translationKey: 'trades.tile',
    icon: Scale,
    description: 'Tile installation for floors, walls, and showers',
    category: 'Interior',
    route: '/pricing?calculator=tile'
  },
  {
    id: 'framing',
    name: 'Framing Calculator',
    translationKey: 'trades.framing',
    icon: Hammer,
    description: 'Structural framing for new construction',
    category: 'Construction',
    route: '/pricing?calculator=framing'
  },
  {
    id: 'retaining_walls',
    name: 'Retaining Walls Calculator',
    translationKey: 'trades.retainingWalls',
    icon: Columns,
    description: 'Retaining wall construction',
    category: 'Exterior',
    route: '/pricing?calculator=retaining_walls'
  },
  {
    id: 'excavation',
    name: 'Excavation Calculator',
    translationKey: 'trades.excavation',
    icon: Construction,
    description: 'Site excavation and grading',
    category: 'Site Work',
    route: '/pricing?calculator=excavation'
  },
  {
    id: 'electrical',
    name: 'Electrical Calculator',
    translationKey: 'trades.electrical',
    icon: Lightbulb,
    description: 'Electrical installation and repairs',
    category: 'Systems',
    route: '/pricing?calculator=electrical'
  },
  {
    id: 'hvac',
    name: 'HVAC Calculator',
    translationKey: 'trades.hvac',
    icon: Thermometer,
    description: 'Heating, ventilation, and air conditioning',
    category: 'Systems',
    route: '/pricing?calculator=hvac'
  },
  {
    id: 'plumbing',
    name: 'Plumbing Calculator',
    translationKey: 'trades.plumbing',
    icon: Droplet,
    description: 'Plumbing installation and repairs',
    category: 'Systems',
    route: '/pricing?calculator=plumbing'
  },
  {
    id: 'doors_windows',
    name: 'Doors & Windows Calculator',
    translationKey: 'trades.doorsWindows',
    icon: DoorOpen,
    description: 'Door and window installation',
    category: 'Exterior',
    route: '/pricing?calculator=doors_windows'
  },
  {
    id: 'fence',
    name: 'Fencing Calculator',
    translationKey: 'trades.fence',
    icon: Layers,
    description: 'Fence installation and replacement',
    category: 'Exterior',
    route: '/pricing?calculator=fence'
  },
  {
    id: 'gutter',
    name: 'Gutters Calculator',
    translationKey: 'trades.gutters',
    icon: Cloud,
    description: 'Gutter installation and replacement',
    category: 'Exterior',
    route: '/pricing?calculator=gutter'
  },
  {
    id: 'junk_removal',
    name: 'Junk Removal Calculator',
    translationKey: 'trades.junkRemoval',
    icon: Trash2,
    description: 'Junk and debris removal',
    category: 'Site Work',
    route: '/pricing?calculator=junk_removal'
  }
];

// Helper function to get calculator by ID
export const getCalculatorById = (id: string): CalculatorInfo | undefined => {
  return calculatorRegistry.find(calc => calc.id === id);
};

// Helper function to get calculators by category
export const getCalculatorsByCategory = (category: string): CalculatorInfo[] => {
  return calculatorRegistry.filter(calc => calc.category === category);
};

// Get all unique categories
export const getCategories = (): string[] => {
  return Array.from(new Set(calculatorRegistry.map(calc => calc.category)));
};
