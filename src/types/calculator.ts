/**
 * Calculator Types and Interfaces
 */

export type CalculatorType =
  | 'concrete'
  | 'deck'
  | 'doors_windows'
  | 'drywall'
  | 'electrical'
  | 'excavation'
  | 'fence'
  | 'flooring'
  | 'foundation'
  | 'framing'
  | 'gutter'
  | 'hvac'
  | 'junk_removal'
  | 'paint'
  | 'pavers'
  | 'plumbing'
  | 'retaining_walls'
  | 'roofing'
  | 'siding'
  | 'tile';

export interface CalculatorEstimate {
  id: string;
  user_id: string;
  calculator_type: CalculatorType;
  estimate_name: string;
  client_id?: string | null;
  estimate_data: Record<string, unknown>;
  results_data: Record<string, unknown>;
  created_at: string;
  updated_at: string;
}

export interface SaveEstimateData {
  calculator_type: CalculatorType;
  estimate_name: string;
  client_id?: string | null;
  estimate_data: Record<string, unknown>;
  results_data: Record<string, unknown>;
}

export interface UpdateEstimateData {
  estimate_name?: string;
  client_id?: string | null;
  estimate_data?: Record<string, unknown>;
  results_data?: Record<string, unknown>;
}

export interface CalculatorEstimateFilters {
  calculator_type?: CalculatorType;
  client_id?: string;
  search?: string;
  limit?: number;
  offset?: number;
}

// Common calculator input interfaces
export interface MaterialItem {
  id: string;
  name: string;
  quantity: number;
  unit: string;
  unitCost: number;
  totalCost: number;
  description?: string;
}

export interface LaborItem {
  id: string;
  description: string;
  hours: number;
  rate: number;
  totalCost: number;
}

export interface CalculatorResults {
  materialsCost: number;
  laborCost: number;
  subtotal: number;
  taxRate?: number;
  taxAmount?: number;
  profitMargin?: number;
  profitAmount?: number;
  total: number;
  markup?: number;
}

// HVAC specific types
export interface HVACEstimateData {
  systemType: string;
  squareFootage: number;
  materials: MaterialItem[];
  labor: LaborItem[];
  additionalCosts?: Array<{
    id: string;
    description: string;
    cost: number;
  }>;
}

// Plumbing specific types
export interface PlumbingEstimateData {
  jobType: string;
  materials: MaterialItem[];
  labor: LaborItem[];
  fixtures?: MaterialItem[];
  permits?: number;
}

// Electrical specific types
export interface ElectricalEstimateData {
  jobType: string;
  serviceSize?: string;
  materials: MaterialItem[];
  labor: LaborItem[];
  panels?: MaterialItem[];
  permits?: number;
}

// Roofing specific types
export interface RoofingEstimateData {
  roofArea: number;
  roofType: string;
  materials: MaterialItem[];
  labor: LaborItem[];
  tearOff?: boolean;
  layers?: number;
}

// Painting specific types
export interface PaintingEstimateData {
  totalArea: number;
  surfaceType: string;
  coats: number;
  materials: MaterialItem[];
  labor: LaborItem[];
  preparation?: LaborItem[];
}

// General contractor types
export interface GeneralEstimateData {
  projectType: string;
  materials: MaterialItem[];
  labor: LaborItem[];
  subcontractors?: Array<{
    id: string;
    name: string;
    description: string;
    cost: number;
  }>;
}
