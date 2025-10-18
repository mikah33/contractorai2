/**
 * Types for Estimate Email Response System
 */

export interface EstimateEmailResponse {
  id: string;
  estimate_id: string;
  client_id: string | null;
  user_id: string;
  customer_name: string;
  customer_email: string;
  email_subject: string;
  email_body: string;
  pdf_url: string;
  accepted: boolean | null;
  declined: boolean | null;
  responded_at: string | null;
  sent_at: string;
  created_at: string;
  updated_at: string;
}

export interface CreateEstimateResponseInput {
  estimate_id: string;
  customer_name: string;
  customer_email: string;
  email_subject?: string;
  email_body?: string;
  pdf_url?: string;
  client_id?: string | null;
}

export interface UpdateEstimateResponseInput {
  response_status: 'accepted' | 'declined';
  responded_at?: string;
}

export interface WebhookPayload {
  customerName: string;
  customerEmail: string;
  clientData: Record<string, any>;
  estimateId: string;
  response: 'accepted' | 'declined';
  respondedAt: string;
}

export interface SupabaseStorageResponse {
  success: boolean;
  publicUrl?: string;
  error?: Error;
}
