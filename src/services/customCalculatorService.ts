import { supabase } from '../lib/supabase';
import { CustomCalculatorConfig, CustomMaterial, CustomPricing } from '../types/custom-calculator';

export const customCalculatorService = {
  // Get or create custom config for a calculator type
  async getOrCreateConfig(calculatorType: string): Promise<{ success: boolean; data?: CustomCalculatorConfig; error?: string }> {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        return { success: false, error: 'User not authenticated' };
      }

      // Try to get existing config (use maybeSingle to avoid 406 error)
      const { data: existing, error: fetchError } = await supabase
        .from('custom_calculator_configs')
        .select('*')
        .eq('user_id', user.id)
        .eq('calculator_type', calculatorType)
        .maybeSingle();

      if (fetchError) {
        return { success: false, error: fetchError.message };
      }

      if (existing) {
        return { success: true, data: existing };
      }

      // Create new config if doesn't exist
      const { data: newConfig, error: createError } = await supabase
        .from('custom_calculator_configs')
        .insert({
          user_id: user.id,
          calculator_type: calculatorType,
          is_configured: false
        })
        .select()
        .single();

      if (createError) {
        // If we get a duplicate key error (409), try to fetch again
        if (createError.code === '23505') {
          const { data: retryData, error: retryError } = await supabase
            .from('custom_calculator_configs')
            .select('*')
            .eq('user_id', user.id)
            .eq('calculator_type', calculatorType)
            .single();

          if (retryError) {
            return { success: false, error: retryError.message };
          }

          return { success: true, data: retryData };
        }

        return { success: false, error: createError.message };
      }

      return { success: true, data: newConfig };
    } catch (error: any) {
      return { success: false, error: error.message };
    }
  },

  // Get all materials for a config
  async getMaterials(configId: string): Promise<{ success: boolean; data?: CustomMaterial[]; error?: string }> {
    try {
      const { data, error } = await supabase
        .from('custom_materials')
        .select('*')
        .eq('config_id', configId)
        .order('sort_order', { ascending: true });

      if (error) {
        return { success: false, error: error.message };
      }

      return { success: true, data: data || [] };
    } catch (error: any) {
      return { success: false, error: error.message };
    }
  },

  // Add custom material
  async addMaterial(configId: string, material: { name: string; price: number; unit: string; category: string; metadata?: any }): Promise<{ success: boolean; data?: CustomMaterial; error?: string }> {
    try {
      const { data, error } = await supabase
        .from('custom_materials')
        .insert({
          config_id: configId,
          ...material,
          is_archived: false,
          sort_order: 0
        })
        .select()
        .single();

      if (error) {
        return { success: false, error: error.message };
      }

      // Mark config as configured after adding first material
      await this.markAsConfigured(configId);

      return { success: true, data };
    } catch (error: any) {
      return { success: false, error: error.message };
    }
  },

  // Update material
  async updateMaterial(id: string, updates: Partial<CustomMaterial>): Promise<{ success: boolean; error?: string }> {
    try {
      const { error } = await supabase
        .from('custom_materials')
        .update({ ...updates, updated_at: new Date().toISOString() })
        .eq('id', id);

      if (error) {
        return { success: false, error: error.message };
      }

      return { success: true };
    } catch (error: any) {
      return { success: false, error: error.message };
    }
  },

  // Archive material
  async archiveMaterial(id: string): Promise<{ success: boolean; error?: string }> {
    return this.updateMaterial(id, { is_archived: true });
  },

  // Unarchive material
  async unarchiveMaterial(id: string): Promise<{ success: boolean; error?: string }> {
    return this.updateMaterial(id, { is_archived: false });
  },

  // Delete material
  async deleteMaterial(id: string): Promise<{ success: boolean; error?: string }> {
    try {
      const { error } = await supabase
        .from('custom_materials')
        .delete()
        .eq('id', id);

      if (error) {
        return { success: false, error: error.message };
      }

      return { success: true };
    } catch (error: any) {
      return { success: false, error: error.message };
    }
  },

  // Get all pricing overrides for a config
  async getPricingOverrides(configId: string): Promise<{ success: boolean; data?: CustomPricing[]; error?: string }> {
    try {
      const { data, error } = await supabase
        .from('custom_pricing')
        .select('*')
        .eq('config_id', configId);

      if (error) {
        return { success: false, error: error.message };
      }

      return { success: true, data: data || [] };
    } catch (error: any) {
      return { success: false, error: error.message };
    }
  },

  // Update pricing override
  async updatePricing(configId: string, componentKey: string, value: number): Promise<{ success: boolean; error?: string }> {
    try {
      const { error } = await supabase
        .from('custom_pricing')
        .upsert({
          config_id: configId,
          component_key: componentKey,
          value
        }, {
          onConflict: 'config_id,component_key'
        });

      if (error) {
        return { success: false, error: error.message };
      }

      return { success: true };
    } catch (error: any) {
      return { success: false, error: error.message };
    }
  },

  // Mark config as configured
  async markAsConfigured(configId: string): Promise<{ success: boolean; error?: string }> {
    try {
      const { error } = await supabase
        .from('custom_calculator_configs')
        .update({ is_configured: true, updated_at: new Date().toISOString() })
        .eq('id', configId);

      if (error) {
        return { success: false, error: error.message };
      }

      return { success: true };
    } catch (error: any) {
      return { success: false, error: error.message };
    }
  },

  // Update multiple pricing overrides
  async updatePricingOverrides(configId: string, updates: Array<{ component_key: string; value: number }>): Promise<{ success: boolean; error?: string }> {
    try {
      const records = updates.map(u => ({
        config_id: configId,
        component_key: u.component_key,
        value: u.value
      }));

      const { error } = await supabase
        .from('custom_pricing')
        .upsert(records, {
          onConflict: 'config_id,component_key'
        });

      if (error) {
        return { success: false, error: error.message };
      }

      return { success: true };
    } catch (error: any) {
      return { success: false, error: error.message };
    }
  },

  // Reset configuration (delete all materials and pricing)
  async resetConfiguration(configId: string): Promise<{ success: boolean; error?: string }> {
    try {
      // Delete all materials
      const { error: materialsError } = await supabase
        .from('custom_materials')
        .delete()
        .eq('config_id', configId);

      if (materialsError) {
        return { success: false, error: materialsError.message };
      }

      // Delete all pricing overrides
      const { error: pricingError } = await supabase
        .from('custom_pricing')
        .delete()
        .eq('config_id', configId);

      if (pricingError) {
        return { success: false, error: pricingError.message };
      }

      // Mark as not configured
      const { error: configError } = await supabase
        .from('custom_calculator_configs')
        .update({ is_configured: false, updated_at: new Date().toISOString() })
        .eq('id', configId);

      if (configError) {
        return { success: false, error: configError.message };
      }

      return { success: true };
    } catch (error: any) {
      return { success: false, error: error.message };
    }
  },

  // Helper: Get materials by category
  async getMaterialsByCategory(configId: string, category: string): Promise<{ success: boolean; data?: CustomMaterial[]; error?: string }> {
    try {
      const { data, error } = await supabase
        .from('custom_materials')
        .select('*')
        .eq('config_id', configId)
        .eq('category', category)
        .eq('is_archived', false)
        .order('sort_order', { ascending: true });

      if (error) {
        return { success: false, error: error.message };
      }

      return { success: true, data: data || [] };
    } catch (error: any) {
      return { success: false, error: error.message };
    }
  },

  // Helper: Find material by name (case-insensitive)
  async findMaterialByName(configId: string, name: string, category?: string): Promise<{ success: boolean; data?: CustomMaterial; error?: string }> {
    try {
      let query = supabase
        .from('custom_materials')
        .select('*')
        .eq('config_id', configId)
        .ilike('name', name)
        .eq('is_archived', false);

      if (category) {
        query = query.eq('category', category);
      }

      const { data, error } = await query.maybeSingle();

      if (error) {
        return { success: false, error: error.message };
      }

      return { success: true, data: data || undefined };
    } catch (error: any) {
      return { success: false, error: error.message };
    }
  },

  // Helper: Parse unit specification to extract numeric value
  parseUnitSpec(unitSpec?: string): number | null {
    if (!unitSpec) return null;

    // Extract first number from string (e.g., "200 sq ft" -> 200, "1000 count" -> 1000)
    const match = unitSpec.match(/(\d+(?:\.\d+)?)/);
    return match ? parseFloat(match[1]) : null;
  },

  // Helper: Get material price and unit spec
  getMaterialValue(material: CustomMaterial): { price: number; unitValue: number | null; unitSpec: string | null } {
    return {
      price: material.price,
      unitValue: this.parseUnitSpec(material.metadata?.unitSpec),
      unitSpec: material.metadata?.unitSpec || null
    };
  }
};
