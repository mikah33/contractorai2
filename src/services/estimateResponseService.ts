/**
 * Estimate Response Service
 * Handles all database operations for estimate email responses
 */

import { supabase } from '../lib/supabase';
import {
  EstimateEmailResponse,
  CreateEstimateResponseInput,
  UpdateEstimateResponseInput
} from '../types/estimateResponse';

const TABLE_NAME = 'estimate_email_responses';

/**
 * Create a new estimate email response record
 * @param input - Data for creating the response
 * @returns Promise with created response or error
 */
export async function createEstimateResponse(
  input: CreateEstimateResponseInput
): Promise<{ success: boolean; data?: EstimateEmailResponse; error?: Error }> {
  try {
    // Validate required fields
    if (!input.estimate_id) {
      throw new Error('estimate_id is required');
    }
    if (!input.customer_name) {
      throw new Error('customer_name is required');
    }
    if (!input.customer_email) {
      throw new Error('customer_email is required');
    }

    // Get authenticated user
    const { data: { user } } = await supabase.auth.getUser();
    if (!user?.id) {
      throw new Error('User not authenticated');
    }

    // Prepare data for insertion
    const responseData = {
      estimate_id: input.estimate_id,
      customer_name: input.customer_name,
      customer_email: input.customer_email,
      email_subject: input.email_subject || '',
      email_body: input.email_body || '',
      pdf_url: input.pdf_url || '',
      client_id: input.client_id || null,
      sent_at: new Date().toISOString(),
      user_id: user.id,
      accepted: null,
      declined: null
    };

    console.log('Creating estimate response:', responseData);

    // Insert into database
    const { data, error } = await supabase
      .from(TABLE_NAME)
      .insert(responseData)
      .select()
      .single();

    if (error) {
      console.error('Database insert error:', error);
      throw error;
    }

    console.log('Estimate response created successfully:', data);

    return {
      success: true,
      data: data as EstimateEmailResponse
    };
  } catch (error) {
    console.error('Error creating estimate response:', error);
    return {
      success: false,
      error: error instanceof Error ? error : new Error('Unknown error')
    };
  }
}

/**
 * Update an existing estimate response (accept/decline)
 * @param responseId - ID of the response to update
 * @param input - Update data
 * @returns Promise with updated response or error
 */
export async function updateEstimateResponse(
  responseId: string,
  input: UpdateEstimateResponseInput
): Promise<{ success: boolean; data?: EstimateEmailResponse; error?: Error }> {
  try {
    if (!responseId) {
      throw new Error('responseId is required');
    }

    if (!input.response_status || !['accepted', 'declined'].includes(input.response_status)) {
      throw new Error('response_status must be "accepted" or "declined"');
    }

    // Prepare update data based on response_status
    const updateData: any = {
      responded_at: input.responded_at || new Date().toISOString(),
      updated_at: new Date().toISOString()
    };

    // Set accepted or declined to true
    if (input.response_status === 'accepted') {
      updateData.accepted = true;
      updateData.declined = null;
    } else {
      updateData.declined = true;
      updateData.accepted = null;
    }

    console.log('Updating estimate response:', { responseId, updateData });

    // Update in database
    const { data, error } = await supabase
      .from(TABLE_NAME)
      .update(updateData)
      .eq('id', responseId)
      .select()
      .single();

    if (error) {
      console.error('Database update error:', error);
      throw error;
    }

    console.log('Estimate response updated successfully:', data);

    return {
      success: true,
      data: data as EstimateEmailResponse
    };
  } catch (error) {
    console.error('Error updating estimate response:', error);
    return {
      success: false,
      error: error instanceof Error ? error : new Error('Unknown error')
    };
  }
}

/**
 * Get estimate response by estimate ID
 * @param estimateId - The estimate ID to search for
 * @returns Promise with response data or error
 */
export async function getEstimateResponseByEstimateId(
  estimateId: string
): Promise<{ success: boolean; data?: EstimateEmailResponse; error?: Error }> {
  try {
    if (!estimateId) {
      throw new Error('estimateId is required');
    }

    console.log('Fetching estimate response for estimate:', estimateId);

    const { data, error } = await supabase
      .from(TABLE_NAME)
      .select('*')
      .eq('estimate_id', estimateId)
      .single();

    if (error) {
      if (error.code === 'PGRST116') {
        // No rows returned
        return {
          success: false,
          error: new Error('Estimate response not found')
        };
      }
      console.error('Database query error:', error);
      throw error;
    }

    console.log('Estimate response found:', data);

    return {
      success: true,
      data: data as EstimateEmailResponse
    };
  } catch (error) {
    console.error('Error fetching estimate response:', error);
    return {
      success: false,
      error: error instanceof Error ? error : new Error('Unknown error')
    };
  }
}

/**
 * Get all estimate responses for the authenticated user
 * @returns Promise with array of responses or error
 */
export async function getAllResponsesForUser(): Promise<EstimateEmailResponse[]> {
  try {
    // Get authenticated user
    const { data: { user } } = await supabase.auth.getUser();
    if (!user?.id) {
      console.warn('User not authenticated, returning empty array');
      return [];
    }

    console.log('Fetching all estimate responses for user:', user.id);

    const { data, error } = await supabase
      .from(TABLE_NAME)
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Database query error:', error);
      return [];
    }

    console.log(`Found ${data?.length || 0} estimate responses`);
    return (data || []) as EstimateEmailResponse[];
  } catch (error) {
    console.error('Error fetching user estimate responses:', error);
    return [];
  }
}

/**
 * Get estimate response by ID
 * @param responseId - The response ID to fetch
 * @returns Promise with response data or error
 */
export async function getEstimateResponseById(
  responseId: string
): Promise<{ success: boolean; data?: EstimateEmailResponse; error?: Error }> {
  try {
    if (!responseId) {
      throw new Error('responseId is required');
    }

    console.log('Fetching estimate response by ID:', responseId);

    const { data, error } = await supabase
      .from(TABLE_NAME)
      .select('*')
      .eq('id', responseId)
      .single();

    if (error) {
      if (error.code === 'PGRST116') {
        return {
          success: false,
          error: new Error('Estimate response not found')
        };
      }
      console.error('Database query error:', error);
      throw error;
    }

    console.log('Estimate response found:', data);

    return {
      success: true,
      data: data as EstimateEmailResponse
    };
  } catch (error) {
    console.error('Error fetching estimate response by ID:', error);
    return {
      success: false,
      error: error instanceof Error ? error : new Error('Unknown error')
    };
  }
}

/**
 * Delete an estimate response
 * @param responseId - ID of the response to delete
 * @returns Promise indicating success or failure
 */
export async function deleteEstimateResponse(
  responseId: string
): Promise<{ success: boolean; error?: Error }> {
  try {
    if (!responseId) {
      throw new Error('responseId is required');
    }

    // Get authenticated user to ensure they own this response
    const { data: { user } } = await supabase.auth.getUser();
    if (!user?.id) {
      throw new Error('User not authenticated');
    }

    console.log('Deleting estimate response:', responseId);

    const { error } = await supabase
      .from(TABLE_NAME)
      .delete()
      .eq('id', responseId)
      .eq('user_id', user.id); // Ensure user can only delete their own responses

    if (error) {
      console.error('Database delete error:', error);
      throw error;
    }

    console.log('Estimate response deleted successfully');

    return { success: true };
  } catch (error) {
    console.error('Error deleting estimate response:', error);
    return {
      success: false,
      error: error instanceof Error ? error : new Error('Unknown error')
    };
  }
}

// Export as object for convenience
export const estimateResponseService = {
  createEstimateResponse,
  updateEstimateResponse,
  getEstimateResponseByEstimateId,
  getAllResponsesForUser,
  getEstimateResponseById,
  deleteEstimateResponse
};
