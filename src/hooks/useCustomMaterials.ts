import { useState, useEffect } from 'react';
import { customCalculatorService } from '../services/customCalculatorService';
import { CustomMaterial } from '../types/custom-calculator';

/**
 * Custom hook to fetch and manage custom materials for a calculator type
 * Provides helper functions to get custom prices and unit values
 */
export const useCustomMaterials = (calculatorType: string) => {
  const [customMaterials, setCustomMaterials] = useState<CustomMaterial[]>([]);
  const [configId, setConfigId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const loadCustomMaterials = async () => {
      try {
        setLoading(true);
        setError(null);

        const configResult = await customCalculatorService.getOrCreateConfig(calculatorType);

        if (!configResult.success || !configResult.data) {
          setError(configResult.error || 'Failed to load configuration');
          return;
        }

        setConfigId(configResult.data.id);

        const materialsResult = await customCalculatorService.getMaterials(configResult.data.id);

        if (!materialsResult.success) {
          setError(materialsResult.error || 'Failed to load materials');
          return;
        }

        setCustomMaterials(materialsResult.data || []);
      } catch (err: any) {
        setError(err.message || 'An unexpected error occurred');
      } finally {
        setLoading(false);
      }
    };

    loadCustomMaterials();
  }, [calculatorType]);

  /**
   * Get custom price for a material, or return default if not found
   * @param materialName - Name of the material to search for
   * @param defaultPrice - Default price to use if custom material not found
   * @param category - Optional category to filter by
   * @returns The custom price if found, otherwise the default price
   */
  const getCustomPrice = (
    materialName: string,
    defaultPrice: number,
    category?: string
  ): number => {
    const custom = customMaterials.find(m =>
      m.name.toLowerCase() === materialName.toLowerCase() &&
      (!category || m.category === category) &&
      !m.is_archived
    );
    return custom ? custom.price : defaultPrice;
  };

  /**
   * Get custom unit value from unit specification, or return default
   * Parses the unitSpec metadata to extract numeric values
   * @param materialName - Name of the material to search for
   * @param defaultValue - Default value to use if custom material not found or no unitSpec
   * @param category - Optional category to filter by
   * @returns The parsed unit value if found, otherwise the default value
   */
  const getCustomUnitValue = (
    materialName: string,
    defaultValue: number,
    category?: string
  ): number => {
    const custom = customMaterials.find(m =>
      m.name.toLowerCase() === materialName.toLowerCase() &&
      (!category || m.category === category) &&
      !m.is_archived
    );

    if (custom?.metadata?.unitSpec) {
      const parsed = customCalculatorService.parseUnitSpec(custom.metadata.unitSpec);
      return parsed !== null ? parsed : defaultValue;
    }

    return defaultValue;
  };

  /**
   * Get both price and unit value for a material
   * @param materialName - Name of the material to search for
   * @param defaultPrice - Default price
   * @param defaultUnitValue - Default unit value
   * @param category - Optional category to filter by
   * @returns Object with price and unitValue
   */
  const getCustomMaterialValues = (
    materialName: string,
    defaultPrice: number,
    defaultUnitValue?: number,
    category?: string
  ): { price: number; unitValue?: number } => {
    return {
      price: getCustomPrice(materialName, defaultPrice, category),
      unitValue: defaultUnitValue !== undefined
        ? getCustomUnitValue(materialName, defaultUnitValue, category)
        : undefined
    };
  };

  /**
   * Find a custom material by name and category
   * @param materialName - Name of the material
   * @param category - Optional category to filter by
   * @returns The custom material if found, otherwise undefined
   */
  const findMaterial = (
    materialName: string,
    category?: string
  ): CustomMaterial | undefined => {
    return customMaterials.find(m =>
      m.name.toLowerCase() === materialName.toLowerCase() &&
      (!category || m.category === category) &&
      !m.is_archived
    );
  };

  /**
   * Refresh materials from the database
   */
  const refresh = async () => {
    if (!configId) return;

    const materialsResult = await customCalculatorService.getMaterials(configId);
    if (materialsResult.success && materialsResult.data) {
      setCustomMaterials(materialsResult.data);
    }
  };

  return {
    customMaterials,
    configId,
    loading,
    error,
    getCustomPrice,
    getCustomUnitValue,
    getCustomMaterialValues,
    findMaterial,
    refresh
  };
};
