// Custom Calculator Configuration Types

export interface CustomCalculatorConfig {
  id: string;
  user_id: string;
  calculator_type: string;
  is_configured: boolean;
  created_at: string;
  updated_at: string;
}

export interface CustomMaterial {
  id: string;
  config_id: string;
  category: string;
  name: string;
  price: number;
  unit: string;
  is_archived: boolean;
  sort_order: number;
  metadata?: Record<string, any>;
  created_at: string;
  updated_at: string;
}

export interface CustomPricing {
  id: string;
  config_id: string;
  component_key: string;
  value: number;
  created_at: string;
  updated_at: string;
}

export type CalculatorTab = 'default' | 'custom';

export interface DeckingMaterialDefaults {
  // Deck Boards
  deckBoards: {
    name: string;
    price_12ft: number;
    price_16ft: number;
    price_20ft: number;
    width: number;
    spacing: number;
  }[];

  // Framing
  joistSpacing: { value: string; multiplier: number }[];
  joistSizes: {
    size: string;
    price: number;
    height: number;
  }[];
  beamPrice: number; // per linear foot

  // Stairs
  stairTread: number; // per tread
  stairRiser: number; // per riser
  stairStringer: number; // per stringer

  // Railings
  railingTypes: {
    name: string;
    price: number; // per linear foot
  }[];

  // Fascia
  fasciaTypes: {
    name: string;
    price: number; // per linear foot
  }[];

  // Posts
  postSizes: {
    size: string;
    pricePerFoot: number;
  }[];

  // Ledger
  ledgerPrices: {
    size: string; // '2x8', '2x10', '2x12'
    pricePerFoot: number;
  }[];

  // Triple Beam (Cantilever Support)
  tripleBeamPrice: number; // per linear foot

  // Hardware & Fasteners
  screwsPerSqft: number;
  screwsPricePerPound: number;
  joistsHangerPrice: number; // per hanger
  postBracketPrice: number; // per bracket
}
