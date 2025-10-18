export interface EstimateTemplate {
  id: string;
  name: string;
  description: string;
  previewImage?: string;
  defaultLogo?: string;
  defaultPrimaryColor?: string;
  defaultSecondaryColor?: string;
  defaultFontFamily?: string;
  defaultTaxRate?: number;
  defaultTerms?: string;
  defaultNotes?: string;
  sections: string[];
  isPremium?: boolean;
}

export interface EstimateItem {
  id: string;
  description: string;
  quantity: number;
  unit: string;
  unitPrice: number;
  totalPrice: number;
  type: 'material' | 'labor' | 'equipment' | 'other' | 'section';
  notes?: string;
}

export interface EstimateBranding {
  logo?: string;
  primaryColor?: string;
  fontFamily?: string;
}

export interface Estimate {
  id: string;
  title: string;
  clientName?: string;  // Using clientName, NOT clientId
  projectName?: string; // Using projectName, NOT projectId
  projectId?: string;   // Add projectId to link with project for team members
  status?: 'draft' | 'sent' | 'approved' | 'rejected' | 'expired';
  createdAt?: string;
  expiresAt?: string;
  items?: EstimateItem[]; // Optional for simple schema
  subtotal?: number;
  taxRate?: number;
  taxAmount?: number;
  total?: number;
  notes?: string;
  terms?: string;
  branding?: EstimateBranding;
  convertedToInvoice?: boolean;  // Track if converted to invoice
  invoiceId?: string;            // Reference to the created invoice
  calculatorType?: string;       // Type of calculator used (e.g., 'concrete', 'roofing')
  calculatorData?: any;          // Original calculator input data for recalculation

  // Response tracking
  responseStatus?: 'pending' | 'accepted' | 'declined' | 'not_sent';
  sentAt?: string;              // When estimate was sent to client
  respondedAt?: string;         // When client responded
  pdfUrl?: string;              // URL to the estimate PDF
}