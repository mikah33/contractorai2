import { useState, useEffect } from 'react';
import { customCalculatorService } from '../services/customCalculatorService';
import { CustomCalculatorConfig, CustomMaterial, CustomPricing } from '../types/custom-calculator';

export const useCustomCalculator = (calculatorType: string, isActive: boolean) => {
  const [config, setConfig] = useState<CustomCalculatorConfig | null>(null);
  const [materials, setMaterials] = useState<CustomMaterial[]>([]);
  const [pricing, setPricing] = useState<Record<string, number>>({});
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!isActive) {
      // Reset when switching to default tab
      setConfig(null);
      setMaterials([]);
      setPricing({});
      return;
    }

    const loadCustomConfig = async () => {
      setLoading(true);
      setError(null);

      try {
        // Get or create config
        const configResult = await customCalculatorService.getOrCreateConfig(calculatorType);
        if (!configResult.success || !configResult.data) {
          setError(configResult.error || 'Failed to load config');
          return;
        }

        setConfig(configResult.data);

        // Only load materials and pricing if configured
        if (configResult.data.is_configured) {
          // Load materials
          const materialsResult = await customCalculatorService.getMaterials(configResult.data.id);
          if (materialsResult.success && materialsResult.data) {
            setMaterials(materialsResult.data.filter(m => !m.is_archived));
          }

          // Load pricing overrides
          const pricingResult = await customCalculatorService.getPricingOverrides(configResult.data.id);
          if (pricingResult.success && pricingResult.data) {
            const pricingMap = pricingResult.data.reduce((acc, p) => {
              acc[p.component_key] = p.value;
              return acc;
            }, {} as Record<string, number>);
            setPricing(pricingMap);
          }
        }
      } catch (err: any) {
        setError(err.message || 'Failed to load custom calculator');
      } finally {
        setLoading(false);
      }
    };

    loadCustomConfig();
  }, [calculatorType, isActive]);

  return {
    config,
    materials,
    pricing,
    loading,
    error,
    isConfigured: config?.is_configured || false
  };
};
