import { supabase } from '../lib/supabase';
import { Estimate } from '../types/estimates';

// Helper function to generate UUID v4
const generateUUID = () => {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
    const r = Math.random() * 16 | 0;
    const v = c === 'x' ? r : (r & 0x3 | 0x8);
    return v.toString(16);
  });
};

// Validate UUID format
const isValidUUID = (uuid: string): boolean => {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(uuid);
};

export const estimateService = {
  // Save or update an estimate
  async saveEstimate(estimate: Estimate) {
    try {
      // Validate and fix UUID if needed
      if (!isValidUUID(estimate.id)) {
        console.warn('Invalid estimate UUID detected, regenerating:', estimate.id);
        estimate.id = generateUUID();
      }
      
      // Get user ID
      const { data: { user } } = await supabase.auth.getUser();
      if (!user?.id) {
        throw new Error('User not authenticated');
      }
      
      // Prepare estimate data for database - using EXACT column names
      const estimateData = {
        id: estimate.id,
        title: estimate.title,
        client_name: estimate.clientName || (typeof estimate.clientId === 'string' && !estimate.clientId.includes('-') ? estimate.clientId : null) || null,  // Support both old and new field names, but ignore UUIDs
        project_name: estimate.projectName || (typeof estimate.projectId === 'string' && !estimate.projectId.includes('-') ? estimate.projectId : null) || null,  // Support both old and new field names, but ignore UUIDs
        status: estimate.status || 'draft',
        subtotal: estimate.subtotal || 0,
        tax_rate: estimate.taxRate || 0,
        tax_amount: estimate.taxAmount || 0,
        total: estimate.total || 0,
        notes: estimate.notes || null,
        terms: estimate.terms || null,
        expires_at: estimate.expiresAt || null,
        user_id: user.id,
        updated_at: new Date().toISOString()
      };
      
      console.log('Saving estimate with data:', estimateData);

      // Check if estimate exists
      const { data: existingEstimate, error: checkError } = await supabase
        .from('estimates')
        .select('id')
        .eq('id', estimate.id)
        .single();
      
      if (checkError && checkError.code !== 'PGRST116') {
        console.error('Error checking for existing estimate:', checkError);
      }

      let savedEstimate;
      
      if (existingEstimate) {
        // Update existing estimate
        console.log('Updating existing estimate...');
        const { data, error } = await supabase
          .from('estimates')
          .update(estimateData)
          .eq('id', estimate.id)
          .select()
          .single();
          
        if (error) {
          console.error('Update error:', error);
          throw error;
        }
        savedEstimate = data;
        console.log('Estimate updated successfully:', savedEstimate);
      } else {
        // Insert new estimate (remove updated_at for insert, let DB set created_at)
        const insertData = { ...estimateData };
        delete insertData.updated_at;
        
        console.log('Inserting new estimate...');
        const { data, error } = await supabase
          .from('estimates')
          .insert(insertData)
          .select()
          .single();
          
        if (error) {
          console.error('Insert error:', error);
          throw error;
        }
        savedEstimate = data;
        console.log('Estimate inserted successfully:', savedEstimate);
      }

      return { success: true, data: savedEstimate };
    } catch (error) {
      console.error('Error saving estimate:', error);
      return { success: false, error };
    }
  },

  // Get estimate by ID
  async getEstimate(id: string) {
    try {
      const { data: estimate, error } = await supabase
        .from('estimates')
        .select('*')
        .eq('id', id)
        .single();

      if (error) throw error;
      if (!estimate) {
        return { success: false, error: new Error('Estimate not found') };
      }

      // Transform to frontend format using EXACT column names
      const transformedEstimate: Estimate = {
        id: estimate.id,
        title: estimate.title,
        clientName: estimate.client_name,
        projectName: estimate.project_name,
        status: estimate.status,
        createdAt: estimate.created_at,
        expiresAt: estimate.expires_at,
        subtotal: estimate.subtotal,
        taxRate: estimate.tax_rate,
        taxAmount: estimate.tax_amount,
        total: estimate.total,
        notes: estimate.notes,
        terms: estimate.terms,
        items: []  // No separate items table in simple schema
      };

      return { success: true, data: transformedEstimate };
    } catch (error) {
      console.error('Error fetching estimate:', error);
      return { success: false, error };
    }
  },

  // Get all estimates for current user
  async getEstimates() {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user?.id) {
        throw new Error('User not authenticated');
      }

      const { data: estimates, error } = await supabase
        .from('estimates')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });

      if (error) throw error;

      // Transform all estimates to frontend format
      const transformedEstimates = (estimates || []).map(estimate => ({
        id: estimate.id,
        title: estimate.title,
        clientName: estimate.client_name,
        projectName: estimate.project_name,
        status: estimate.status,
        createdAt: estimate.created_at,
        expiresAt: estimate.expires_at,
        subtotal: estimate.subtotal,
        taxRate: estimate.tax_rate,
        taxAmount: estimate.tax_amount,
        total: estimate.total,
        notes: estimate.notes,
        terms: estimate.terms,
        items: []
      }));

      return { success: true, data: transformedEstimates };
    } catch (error) {
      console.error('Error fetching estimates:', error);
      return { success: false, error };
    }
  },

  // Delete estimate
  async deleteEstimate(id: string) {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user?.id) {
        throw new Error('User not authenticated');
      }

      const { error } = await supabase
        .from('estimates')
        .delete()
        .eq('id', id)
        .eq('user_id', user.id);  // Ensure user can only delete their own estimates

      if (error) throw error;

      return { success: true };
    } catch (error) {
      console.error('Error deleting estimate:', error);
      return { success: false, error };
    }
  }
};