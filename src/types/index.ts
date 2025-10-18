import { ReactNode } from 'react';

export interface Trade {
  id: string;
  name: string;
  category: string;
  icon: ReactNode;
  description: string;
  requiredFields: Field[];
  optionalFields?: Field[];
}

export interface Field {
  id: string;
  label: string;
  type: 'text' | 'number' | 'select' | 'radio' | 'checkbox';
  required?: boolean;
  placeholder?: string;
  helpText?: string;
  min?: number;
  max?: number;
  unit?: string;
  options?: { value: string; label: string }[];
  checkboxLabel?: string;
}

export interface Project {
  id: string;
  name: string;
  client: {
    id: string;
    name: string;
    email: string;
    phone: string;
  };
  address: string;
  status: 'planning' | 'active' | 'completed' | 'on-hold';
  startDate: string;
  endDate?: string;
  budget: number;
  expenses: number;
  trades: string[];
  notes?: string;
  tasks: Task[];
  estimates: Estimate[];
  invoices: Invoice[];
}

export interface Task {
  id: string;
  title: string;
  description?: string;
  status: 'todo' | 'in_progress' | 'completed';
  dueDate: string;
  assignedTo?: string;
  priority: 'low' | 'medium' | 'high';
}

export interface Estimate {
  id: string;
  projectId: string;
  clientId: string;
  status: 'draft' | 'sent' | 'approved' | 'rejected';
  createdAt: string;
  expiresAt: string;
  totalAmount: number;
  items: EstimateItem[];
}

export interface EstimateItem {
  id: string;
  description: string;
  quantity: number;
  unit: string;
  unitPrice: number;
  totalPrice: number;
  type: 'material' | 'labor' | 'other';
}

export interface Invoice {
  id: string;
  projectId: string;
  clientId: string;
  status: 'draft' | 'sent' | 'paid' | 'overdue';
  createdAt: string;
  dueDate: string;
  totalAmount: number;
  paidAmount: number;
  items: InvoiceItem[];
}

export interface InvoiceItem {
  id: string;
  description: string;
  quantity: number;
  unit: string;
  unitPrice: number;
  totalPrice: number;
  type: 'material' | 'labor' | 'other';
}

export interface SubscriptionPlan {
  id: string;
  name: string;
  price: number;
  billing: 'monthly' | 'yearly';
  features: string[];
  isMostPopular?: boolean;
}

// Calculator types
export interface CalculationResult {
  label: string;
  value: number;
  unit: string;
  cost?: number;
  isTotal?: boolean; // Flag to mark total line items to prevent double-counting
  isWarning?: boolean; // Flag to mark warning messages that need special styling
}

export interface CalculatorProps {
  onCalculate: (results: CalculationResult[]) => void;
  onSaveSuccess?: () => void;
}