import React, { useState, useMemo, useEffect } from 'react';
import { CalculatorProps, CalculationResult } from '../../types';
import { Fence } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { CalculatorEstimateHeader } from '../calculators/CalculatorEstimateHeader';
import { useCalculatorTab } from '../../contexts/CalculatorTabContext';
import { useCustomCalculator } from '../../hooks/useCustomCalculator';
import { useCustomMaterials } from '../../hooks/useCustomMaterials';

interface Gate {
  id: string;
  width: number;
  height: number;
  type: 'single' | 'double' | 'rolling';
  material: string;
  includeHardware: boolean;
}

interface Corner {
  id: string;
  angle: number;
}

const FencingCalculator: React.FC<CalculatorProps> = ({ onCalculate }) => {
  const { t } = useTranslation();
  const { activeTab } = useCalculatorTab();
  const { materials: customMaterials, pricing: customPricing, loading: loadingCustom, isConfigured } =
    useCustomCalculator('fence', activeTab === 'custom');
  const { getCustomPrice, getCustomUnitValue } = useCustomMaterials('fence');

  const [fenceType, setFenceType] = useState<'privacy' | 'picket' | 'chain-link' | 'ranch' | 'panel' | 'custom'>('privacy');
  const [material, setMaterial] = useState<'wood' | 'vinyl' | 'metal' | 'composite'>('wood');
  const [postMaterial, setPostMaterial] = useState<'wood' | 'vinyl-5x5' | 'vinyl-4x4' | 'metal'>('wood');
  const [length, setLength] = useState<number | ''>('');
  const [height, setHeight] = useState<number | ''>('');
  const [postSpacing, setPostSpacing] = useState<6 | 8>(8);
  const [gates, setGates] = useState<Gate[]>([]);
  const [corners, setCorners] = useState<Corner[]>([]);
  const [slopeType, setSlopeType] = useState<'level' | 'stepping' | 'racking'>('level');
  const [slopePercentage, setSlopePercentage] = useState<number | ''>('');
  const [includePostCaps, setIncludePostCaps] = useState(true);
  const [includeKickboard, setIncludeKickboard] = useState(false);
  const [postMountType, setPostMountType] = useState<'concrete' | 'spike' | 'bracket'>('concrete');
  const [concreteDepth, setConcreteDepth] = useState<number | ''>('');
  const [wasteFactor, setWasteFactor] = useState<10 | 15 | 20>(15);

  // Custom fencing options
  const [customLinearFeet, setCustomLinearFeet] = useState<number | ''>('');
  const [customPricePerFoot, setCustomPricePerFoot] = useState<number | ''>('');

  // Default pricing constants - must be defined before useMemo hooks that reference them
  const postMaterialPrices = {
    'wood': 24.98,
    'vinyl-5x5': 42.00,
    'vinyl-4x4': 27.00,
    'metal': 42.00
  };

  const materialPrices = {
    'privacy': {
      'wood': {
        'panel': 45.98,
        'rail': 12.98,
        'cap': 4.98
      },
      'vinyl': {
        'panel': 89.98,
        'rail': 19.98,
        'cap': 6.98
      },
      'metal': {
        'panel': 79.98,
        'rail': 16.98,
        'cap': 5.98
      },
      'composite': {
        'panel': 129.98,
        'rail': 24.98,
        'cap': 8.98
      }
    },
    'picket': {
      'wood': {
        'picket': 2.98,
        'rail': 9.98,
        'cap': 3.98
      },
      'vinyl': {
        'picket': 4.98,
        'rail': 14.98,
        'cap': 5.98
      },
      'metal': {
        'picket': 3.98,
        'rail': 12.98,
        'cap': 4.98
      },
      'composite': {
        'picket': 6.98,
        'rail': 19.98,
        'cap': 7.98
      }
    },
    'chain-link': {
      'metal': {
        'fabric': 5.98,
        'rail': 8.98,
        'cap': 2.98
      }
    },
    'ranch': {
      'wood': {
        'rail': 14.98,
        'cap': 4.98
      },
      'vinyl': {
        'rail': 24.98,
        'cap': 6.98
      }
    },
    'panel': {
      'wood': {
        'panel': 69.98,
        'cap': 4.98
      },
      'vinyl': {
        'panel': 129.98,
        'cap': 6.98
      },
      'composite': {
        'panel': 189.98,
        'cap': 8.98
      }
    }
  };

  const gatePrices = {
    'single': {
      'wood': 129.98,
      'vinyl': 199.98,
      'metal': 169.98,
      'composite': 249.98
    },
    'double': {
      'wood': 249.98,
      'vinyl': 399.98,
      'metal': 329.98,
      'composite': 499.98
    },
    'rolling': {
      'wood': 399.98,
      'vinyl': 599.98,
      'metal': 499.98,
      'composite': 799.98
    }
  };

  const gateHardwarePrices = {
    'single': 49.98,
    'double': 89.98,
    'rolling': 149.98
  };

  // Active pricing based on tab using useCustomMaterials hook
  const activePostMaterialPrices = useMemo(() => {
    if (activeTab === 'custom') {
      return {
        'wood': getCustomPrice('Wood Post', 24.98, 'posts'),
        'vinyl-5x5': getCustomPrice('Vinyl 5x5 Post', 42.00, 'posts'),
        'vinyl-4x4': getCustomPrice('Vinyl 4x4 Post', 27.00, 'posts'),
        'metal': getCustomPrice('Metal Post', 42.00, 'posts')
      };
    }
    return postMaterialPrices;
  }, [activeTab, getCustomPrice]);

  const activeMaterialPrices = useMemo(() => {
    if (activeTab === 'custom') {
      return {
        'privacy': {
          'wood': {
            'panel': getCustomPrice('Privacy Fence - Wood Panel', 45.98, 'panels'),
            'rail': 12.98, // Rails not configurable separately in current setup
            'cap': 4.98    // Caps not configurable separately in current setup
          },
          'vinyl': {
            'panel': getCustomPrice('Privacy Fence - Vinyl Panel', 89.98, 'panels'),
            'rail': 19.98,
            'cap': 6.98
          },
          'metal': {
            'panel': getCustomPrice('Privacy Fence - Metal Panel', 79.98, 'panels'),
            'rail': 16.98,
            'cap': 5.98
          },
          'composite': {
            'panel': getCustomPrice('Privacy Fence - Composite Panel', 129.98, 'panels'),
            'rail': 24.98,
            'cap': 8.98
          }
        },
        'picket': {
          'wood': {
            'picket': getCustomPrice('Picket Fence - Wood Picket', 2.98, 'panels'),
            'rail': 9.98,
            'cap': 3.98
          },
          'vinyl': {
            'picket': getCustomPrice('Picket Fence - Vinyl Picket', 4.98, 'panels'),
            'rail': 14.98,
            'cap': 5.98
          },
          'metal': {
            'picket': getCustomPrice('Picket Fence - Metal Picket', 3.98, 'panels'),
            'rail': 12.98,
            'cap': 4.98
          },
          'composite': {
            'picket': getCustomPrice('Picket Fence - Composite Picket', 6.98, 'panels'),
            'rail': 19.98,
            'cap': 7.98
          }
        },
        'chain-link': {
          'metal': {
            'fabric': getCustomPrice('Chain-Link Fabric', 5.98, 'panels'),
            'rail': 8.98,
            'cap': 2.98
          }
        },
        'ranch': {
          'wood': {
            'rail': getCustomPrice('Ranch Rail - Wood', 14.98, 'panels'),
            'cap': 4.98
          },
          'vinyl': {
            'rail': getCustomPrice('Ranch Rail - Vinyl', 24.98, 'panels'),
            'cap': 6.98
          }
        },
        'panel': {
          'wood': {
            'panel': getCustomPrice('Wood Panel (8ft)', 69.98, 'panels'),
            'cap': 4.98
          },
          'vinyl': {
            'panel': getCustomPrice('Vinyl Panel (8ft)', 129.98, 'panels'),
            'cap': 6.98
          },
          'composite': {
            'panel': getCustomPrice('Composite Panel (8ft)', 189.98, 'panels'),
            'cap': 8.98
          }
        }
      };
    }
    return materialPrices;
  }, [activeTab, getCustomPrice]);

  const activeGatePrices = useMemo(() => {
    if (activeTab === 'custom') {
      return {
        single: {
          wood: getCustomPrice('Single Gate - Wood', 129.98, 'gates'),
          vinyl: getCustomPrice('Single Gate - Vinyl', 199.98, 'gates'),
          metal: getCustomPrice('Single Gate - Metal', 169.98, 'gates'),
          composite: getCustomPrice('Single Gate - Composite', 249.98, 'gates')
        },
        double: {
          wood: getCustomPrice('Double Gate - Wood', 249.98, 'gates'),
          vinyl: getCustomPrice('Double Gate - Vinyl', 399.98, 'gates'),
          metal: getCustomPrice('Double Gate - Metal', 329.98, 'gates'),
          composite: getCustomPrice('Double Gate - Composite', 499.98, 'gates')
        },
        rolling: {
          wood: getCustomPrice('Rolling Gate - Wood', 399.98, 'gates'),
          vinyl: getCustomPrice('Rolling Gate - Vinyl', 599.98, 'gates'),
          metal: getCustomPrice('Rolling Gate - Metal', 499.98, 'gates'),
          composite: getCustomPrice('Rolling Gate - Composite', 799.98, 'gates')
        }
      };
    }
    return gatePrices;
  }, [activeTab, getCustomPrice]);

  const activeGateHardwarePrices = useMemo(() => {
    if (activeTab === 'custom') {
      return {
        single: getCustomPrice('Gate Hardware - Single', 49.98, 'components'),
        double: getCustomPrice('Gate Hardware - Double', 89.98, 'components'),
        rolling: getCustomPrice('Gate Hardware - Rolling', 149.98, 'components')
      };
    }
    return gateHardwarePrices;
  }, [activeTab, getCustomPrice]);

  const addGate = (type: Gate['type']) => {
    const defaultHeight = typeof height === 'number' ? height : 72;
    const defaultWidth = type === 'single' ? 36 : type === 'double' ? 72 : 120;

    const newGate: Gate = {
      id: Date.now().toString(),
      width: defaultWidth,
      height: defaultHeight,
      type,
      material,
      includeHardware: true
    };
    setGates([...gates, newGate]);
  };

  const updateGate = (id: string, updates: Partial<Gate>) => {
    setGates(gates.map(gate =>
      gate.id === id ? { ...gate, ...updates } : gate
    ));
  };

  const removeGate = (id: string) => {
    setGates(gates.filter(gate => gate.id !== id));
  };

  const addCorner = () => {
    const newCorner: Corner = {
      id: Date.now().toString(),
      angle: 90
    };
    setCorners([...corners, newCorner]);
  };

  const updateCorner = (id: string, updates: Partial<Corner>) => {
    setCorners(corners.map(corner =>
      corner.id === id ? { ...corner, ...updates } : corner
    ));
  };

  const removeCorner = (id: string) => {
    setCorners(corners.filter(corner => corner.id !== id));
  };

  const getCurrentInputs = () => {
    return {
      fenceType,
      material,
      postMaterial,
      length,
      height,
      postSpacing,
      gates,
      corners,
      slopeType,
      slopePercentage,
      includePostCaps,
      includeKickboard,
      postMountType,
      concreteDepth,
      wasteFactor,
      customLinearFeet,
      customPricePerFoot
    };
  };

  const handleLoadEstimate = (inputs: any) => {
    if (inputs.fenceType) setFenceType(inputs.fenceType);
    if (inputs.material) setMaterial(inputs.material);
    if (inputs.postMaterial) setPostMaterial(inputs.postMaterial);
    if (inputs.length !== undefined) setLength(inputs.length);
    if (inputs.height !== undefined) setHeight(inputs.height);
    if (inputs.postSpacing) setPostSpacing(inputs.postSpacing);
    if (inputs.gates) setGates(inputs.gates);
    if (inputs.corners) setCorners(inputs.corners);
    if (inputs.slopeType) setSlopeType(inputs.slopeType);
    if (inputs.slopePercentage !== undefined) setSlopePercentage(inputs.slopePercentage);
    if (inputs.includePostCaps !== undefined) setIncludePostCaps(inputs.includePostCaps);
    if (inputs.includeKickboard !== undefined) setIncludeKickboard(inputs.includeKickboard);
    if (inputs.postMountType) setPostMountType(inputs.postMountType);
    if (inputs.concreteDepth !== undefined) setConcreteDepth(inputs.concreteDepth);
    if (inputs.wasteFactor) setWasteFactor(inputs.wasteFactor);
    if (inputs.customLinearFeet !== undefined) setCustomLinearFeet(inputs.customLinearFeet);
    if (inputs.customPricePerFoot !== undefined) setCustomPricePerFoot(inputs.customPricePerFoot);
  };

  const handleNewEstimate = () => {
    setFenceType('privacy');
    setMaterial('wood');
    setPostMaterial('wood');
    setLength('');
    setHeight('');
    setPostSpacing(8);
    setGates([]);
    setCorners([]);
    setSlopeType('level');
    setSlopePercentage('');
    setIncludePostCaps(true);
    setIncludeKickboard(false);
    setPostMountType('concrete');
    setConcreteDepth('');
    setWasteFactor(15);
    setCustomLinearFeet('');
    setCustomPricePerFoot('');
  };

  const handleCalculate = () => {
    // For custom fencing, use different validation
    if (fenceType === 'custom') {
      if (typeof customLinearFeet === 'number' && typeof customPricePerFoot === 'number') {
        const results: CalculationResult[] = [];
        const totalCost = customLinearFeet * customPricePerFoot;

        results.push({
          label: 'Custom Fencing',
          value: customLinearFeet,
          unit: 'Linear Feet',
          cost: totalCost
        });

        results.push({
          label: t('calculators.fencing.totalEstimatedCost'),
          value: Number(totalCost.toFixed(2)),
          unit: t('calculators.fencing.currencyUnit'),
          isTotal: true
        });

        onCalculate(results);
      }
      return;
    }

    if (typeof length === 'number' && typeof height === 'number') {
      const results: CalculationResult[] = [];
      let totalCost = 0;

      // Calculate posts needed
      const postCount = Math.ceil(length / postSpacing) + 1 + corners.length;
      const postHeight = height + (postMountType === 'concrete' ? 24 : 0); // Add 2ft for concrete depth
      const postPrice = activePostMaterialPrices[postMaterial];
      const postCost = postCount * postPrice;
      totalCost += postCost;

      const postMaterialLabel = postMaterial === 'vinyl-5x5' ? 'Vinyl 5x5' :
                               postMaterial === 'vinyl-4x4' ? 'Vinyl 4x4' :
                               postMaterial.charAt(0).toUpperCase() + postMaterial.slice(1);

      results.push({
        label: `${postMaterialLabel} ${t('calculators.fencing.posts')}`,
        value: postCount,
        unit: t('calculators.fencing.postsUnit'),
        cost: postCost
      });

      // Calculate post caps if included
      if (includePostCaps) {
        const capPrice = activeMaterialPrices[fenceType]?.[material]?.cap || 0;
        const capCost = postCount * capPrice;
        totalCost += capCost;

        results.push({
          label: t('calculators.fencing.postCaps'),
          value: postCount,
          unit: t('calculators.fencing.capsUnit'),
          cost: capCost
        });
      }

      // Calculate concrete if needed
      if (postMountType === 'concrete' && typeof concreteDepth === 'number') {
        const concretePerPost = (concreteDepth * 0.33); // cubic feet per post (12" diameter hole)
        const totalConcrete = (concretePerPost * postCount) / 27; // convert to cubic yards
        const concreteCost = Math.ceil(totalConcrete * 4) * 6.98; // 60lb bags at $6.98 each
        totalCost += concreteCost;

        results.push({
          label: t('calculators.fencing.concreteMix'),
          value: Math.ceil(totalConcrete * 4),
          unit: t('calculators.fencing.concreteBagsUnit'),
          cost: concreteCost
        });
      } else if (postMountType === 'spike') {
        const spikeCost = postCount * 12.98;
        totalCost += spikeCost;

        results.push({
          label: t('calculators.fencing.postSpikes'),
          value: postCount,
          unit: t('calculators.fencing.piecesUnit'),
          cost: spikeCost
        });
      } else if (postMountType === 'bracket') {
        const bracketCost = postCount * 14.98;
        totalCost += bracketCost;

        results.push({
          label: t('calculators.fencing.postMountingBrackets'),
          value: postCount,
          unit: t('calculators.fencing.piecesUnit'),
          cost: bracketCost
        });
      }

      // Calculate fencing materials based on type
      if (fenceType === 'privacy' || fenceType === 'panel') {
        const panelPrice = activeMaterialPrices[fenceType]?.[material]?.panel || 0;
        const fencePanelLength = getCustomUnitValue('Fence Panel', 8, 'panels'); // ft per panel
        const panelsNeeded = Math.ceil(length / fencePanelLength);
        const panelCost = panelsNeeded * panelPrice;
        totalCost += panelCost;

        results.push({
          label: `${material.charAt(0).toUpperCase() + material.slice(1)} ${t('calculators.fencing.panels')}`,
          value: panelsNeeded,
          unit: t('calculators.fencing.panelsUnit'),
          cost: panelCost
        });
      } else if (fenceType === 'picket') {
        const picketPrice = activeMaterialPrices.picket?.[material]?.picket || 0;
        const picketsPerFoot = getCustomUnitValue('Pickets', 2, 'pickets'); // pickets per linear foot
        const picketsNeeded = Math.ceil(length * picketsPerFoot);
        const picketCost = picketsNeeded * picketPrice;
        totalCost += picketCost;

        results.push({
          label: `${material.charAt(0).toUpperCase() + material.slice(1)} ${t('calculators.fencing.pickets')}`,
          value: picketsNeeded,
          unit: t('calculators.fencing.picketsUnit'),
          cost: picketCost
        });
      } else if (fenceType === 'chain-link') {
        const fabricPrice = activeMaterialPrices['chain-link']?.metal?.fabric || 5.98;
        const fabricCoverage = getCustomUnitValue('Chain-Link Fabric', 9, 'fabric'); // sq ft per yard
        const fabricNeeded = length * height / fabricCoverage; // Convert to square yards
        const fabricCost = fabricNeeded * fabricPrice;
        totalCost += fabricCost;

        results.push({
          label: t('calculators.fencing.chainLinkFabric'),
          value: Number(fabricNeeded.toFixed(2)),
          unit: t('calculators.fencing.squareYardsUnit'),
          cost: fabricCost
        });
      }

      // Calculate rails if needed
      if (fenceType !== 'panel') {
        const railsPerSection = fenceType === 'ranch' ? 3 : 2;
        const railPrice = activeMaterialPrices[fenceType]?.[material]?.rail || 0;
        const railSectionLength = getCustomUnitValue('Rail Section', 8, 'rails'); // ft per section
        const railsNeeded = Math.ceil(length / railSectionLength) * railsPerSection;
        const railCost = railsNeeded * railPrice;
        totalCost += railCost;

        results.push({
          label: `${material.charAt(0).toUpperCase() + material.slice(1)} ${t('calculators.fencing.rails')}`,
          value: railsNeeded,
          unit: t('calculators.fencing.railsUnit'),
          cost: railCost
        });
      }

      // Calculate kickboard if included
      if (includeKickboard) {
        const kickboardPrice = 8.98;
        const kickboardPieces = Math.ceil(length / 8);
        const kickboardCost = kickboardPieces * kickboardPrice;
        totalCost += kickboardCost;

        results.push({
          label: t('calculators.fencing.kickboard'),
          value: kickboardPieces,
          unit: t('calculators.fencing.kickboardUnit'),
          cost: kickboardCost
        });
      }

      // Calculate gates
      gates.forEach(gate => {
        const gatePrice = activeGatePrices[gate.type]?.[gate.material as keyof typeof activeGatePrices.single] || 0;
        const gateCost = gatePrice;
        totalCost += gateCost;

        results.push({
          label: `${gate.type.charAt(0).toUpperCase() + gate.type.slice(1)} ${t('calculators.fencing.gate')}`,
          value: 1,
          unit: t('calculators.fencing.gateUnit'),
          cost: gateCost
        });

        if (gate.includeHardware) {
          const hardwareCost = activeGateHardwarePrices[gate.type];
          totalCost += hardwareCost;

          results.push({
            label: `${gate.type.charAt(0).toUpperCase() + gate.type.slice(1)} ${t('calculators.fencing.gateHardware')}`,
            value: 1,
            unit: t('calculators.fencing.gateHardwareUnit'),
            cost: hardwareCost
          });
        }
      });

      // Add total cost
      results.push({
        label: t('calculators.fencing.totalEstimatedCost'),
        value: Number(totalCost.toFixed(2)),
        unit: t('calculators.fencing.currencyUnit'),
        isTotal: true
      });

      onCalculate(results);
    }
  };

  const isFormValid = fenceType === 'custom'
    ? typeof customLinearFeet === 'number' && typeof customPricePerFoot === 'number'
    : typeof length === 'number' &&
      typeof height === 'number' &&
      (!includeKickboard || typeof height === 'number') &&
      (postMountType !== 'concrete' || typeof concreteDepth === 'number');

  // Loading state
  if (activeTab === 'custom' && loadingCustom) {
    return (
      <div className="bg-white p-6 rounded-lg shadow-md animate-fade-in">
        <div className="flex items-center mb-6">
          <Fence className="h-6 w-6 text-blue-500 mr-2" />
          <h2 className="text-xl font-bold text-slate-800">{t('calculators.fencing.title')}</h2>
        </div>
        <div className="text-center py-12">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading custom configuration...</p>
        </div>
      </div>
    );
  }

  // Not configured state
  if (activeTab === 'custom' && !isConfigured) {
    return (
      <div className="bg-white p-6 rounded-lg shadow-md animate-fade-in">
        <div className="flex items-center mb-6">
          <Fence className="h-6 w-6 text-blue-500 mr-2" />
          <h2 className="text-xl font-bold text-slate-800">{t('calculators.fencing.title')}</h2>
        </div>
        <div className="text-center py-12">
          <Fence className="h-16 w-16 text-gray-300 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">Configuration Required</h3>
          <p className="text-gray-600 mb-4">
            This calculator hasn't been configured yet. Click the gear icon to set up your custom materials and pricing.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white p-6 rounded-lg shadow-md animate-fade-in">
      <div className="flex items-center mb-6">
        <Fence className="h-6 w-6 text-blue-500 mr-2" />
        <h2 className="text-xl font-bold text-slate-800">{t('calculators.fencing.title')}</h2>
      </div>

      <CalculatorEstimateHeader
        calculatorType="fence"
        getCurrentInputs={getCurrentInputs}
        onLoadEstimate={handleLoadEstimate}
        onNewEstimate={handleNewEstimate}
      />

      <div className="mb-4">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
          <div>
            <label htmlFor="fenceType" className="block text-sm font-medium text-slate-700 mb-1">
              {t('calculators.fencing.fenceType')}
            </label>
            <select
              id="fenceType"
              value={fenceType}
              onChange={(e) => setFenceType(e.target.value as typeof fenceType)}
              className="w-full p-2 border border-slate-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              <option value="privacy">{t('calculators.fencing.privacyFence')}</option>
              <option value="picket">{t('calculators.fencing.picketFence')}</option>
              <option value="chain-link">{t('calculators.fencing.chainLinkFence')}</option>
              <option value="ranch">{t('calculators.fencing.ranchRailFence')}</option>
              <option value="panel">{t('calculators.fencing.panelFence')}</option>
              <option value="custom">Custom Fencing (Linear Footage)</option>
            </select>
          </div>

          {fenceType !== 'custom' && (
            <div>
              <label htmlFor="material" className="block text-sm font-medium text-slate-700 mb-1">
                {t('calculators.fencing.material')}
              </label>
              <select
                id="material"
                value={material}
                onChange={(e) => setMaterial(e.target.value as typeof material)}
                className="w-full p-2 border border-slate-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                {fenceType !== 'chain-link' && (
                  <>
                    <option value="wood">{t('calculators.fencing.wood')}</option>
                    <option value="vinyl">{t('calculators.fencing.vinyl')}</option>
                    {fenceType !== 'ranch' && <option value="composite">{t('calculators.fencing.composite')}</option>}
                  </>
                )}
                {(fenceType === 'chain-link' || fenceType === 'picket') && (
                  <option value="metal">{t('calculators.fencing.metal')}</option>
                )}
              </select>
            </div>
          )}

          {fenceType !== 'custom' && (
            <div>
              <label htmlFor="postMaterial" className="block text-sm font-medium text-slate-700 mb-1">
                Post Material
              </label>
              <select
                id="postMaterial"
                value={postMaterial}
                onChange={(e) => setPostMaterial(e.target.value as typeof postMaterial)}
                className="w-full p-2 border border-slate-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                <option value="wood">Wood ($24.98)</option>
                <option value="vinyl-5x5">Vinyl 5x5 ($42.00)</option>
                <option value="vinyl-4x4">Vinyl 4x4 ($27.00)</option>
                <option value="metal">Metal ($42.00)</option>
              </select>
            </div>
          )}
        </div>

        {fenceType === 'custom' && (
          <div className="mb-6 p-6 bg-blue-50 rounded-lg border border-blue-200">
            <h3 className="text-lg font-medium text-slate-800 mb-4">Custom Fencing Calculator</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label htmlFor="customLinearFeet" className="block text-sm font-medium text-slate-700 mb-1">
                  Total Linear Feet
                </label>
                <input
                  type="number"
                  id="customLinearFeet"
                  min="0"
                  step="0.1"
                  value={customLinearFeet}
                  onChange={(e) => setCustomLinearFeet(e.target.value ? Number(e.target.value) : '')}
                  className="w-full p-2 border border-slate-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="Enter total linear feet"
                />
              </div>

              <div>
                <label htmlFor="customPricePerFoot" className="block text-sm font-medium text-slate-700 mb-1">
                  Price Per Linear Foot ($)
                </label>
                <input
                  type="number"
                  id="customPricePerFoot"
                  min="0"
                  step="0.01"
                  value={customPricePerFoot}
                  onChange={(e) => setCustomPricePerFoot(e.target.value ? Number(e.target.value) : '')}
                  className="w-full p-2 border border-slate-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="e.g., 25.00"
                />
              </div>
            </div>
            <p className="mt-4 text-sm text-slate-600">
              <strong>Note:</strong> Custom fencing allows you to quickly calculate total cost based on your known linear footage and price per foot.
            </p>
          </div>
        )}

        {fenceType !== 'custom' && (
          <>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
            <div>
            <label htmlFor="length" className="block text-sm font-medium text-slate-700 mb-1">
              {t('calculators.fencing.totalLength')}
            </label>
            <input
              type="number"
              id="length"
              min="0"
              step="0.1"
              value={length}
              onChange={(e) => setLength(e.target.value ? Number(e.target.value) : '')}
              className="w-full p-2 border border-slate-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              placeholder={t('calculators.fencing.enterFenceLength')}
            />
          </div>

          <div>
            <label htmlFor="height" className="block text-sm font-medium text-slate-700 mb-1">
              {t('calculators.fencing.height')}
            </label>
            <input
              type="number"
              id="height"
              min="0"
              step="1"
              value={height}
              onChange={(e) => setHeight(e.target.value ? Number(e.target.value) : '')}
              className="w-full p-2 border border-slate-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              placeholder={t('calculators.fencing.enterFenceHeight')}
            />
          </div>

          <div>
            <label htmlFor="postSpacing" className="block text-sm font-medium text-slate-700 mb-1">
              {t('calculators.fencing.postSpacing')}
            </label>
            <select
              id="postSpacing"
              value={postSpacing}
              onChange={(e) => setPostSpacing(Number(e.target.value) as 6 | 8)}
              className="w-full p-2 border border-slate-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              <option value={6}>{t('calculators.fencing.sixFeet')}</option>
              <option value={8}>{t('calculators.fencing.eightFeet')}</option>
            </select>
            </div>
          </div>

          <div className="border-t border-slate-200 pt-6 mb-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-medium text-slate-800">{t('calculators.fencing.gates')}</h3>
            <div className="flex space-x-2">
              <button
                onClick={() => addGate('single')}
                className="px-3 py-2 bg-slate-100 hover:bg-slate-200 rounded-md transition-colors"
              >
                {t('calculators.fencing.addSingleGate')}
              </button>
              <button
                onClick={() => addGate('double')}
                className="px-3 py-2 bg-slate-100 hover:bg-slate-200 rounded-md transition-colors"
              >
                {t('calculators.fencing.addDoubleGate')}
              </button>
              <button
                onClick={() => addGate('rolling')}
                className="px-3 py-2 bg-slate-100 hover:bg-slate-200 rounded-md transition-colors"
              >
                {t('calculators.fencing.addRollingGate')}
              </button>
            </div>
          </div>

          {gates.map(gate => (
            <div key={gate.id} className="mb-4 p-4 bg-slate-50 rounded-lg">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">
                    {t('calculators.fencing.gateWidth')}
                  </label>
                  <input
                    type="number"
                    min="0"
                    step="1"
                    value={gate.width}
                    onChange={(e) => updateGate(gate.id, { width: Number(e.target.value) })}
                    className="w-full p-2 border border-slate-300 rounded-md"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">
                    {t('calculators.fencing.gateHeight')}
                  </label>
                  <input
                    type="number"
                    min="0"
                    step="1"
                    value={gate.height}
                    onChange={(e) => updateGate(gate.id, { height: Number(e.target.value) })}
                    className="w-full p-2 border border-slate-300 rounded-md"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">
                    {t('calculators.fencing.material')}
                  </label>
                  <select
                    value={gate.material}
                    onChange={(e) => updateGate(gate.id, { material: e.target.value })}
                    className="w-full p-2 border border-slate-300 rounded-md"
                  >
                    <option value="wood">{t('calculators.fencing.wood')}</option>
                    <option value="vinyl">{t('calculators.fencing.vinyl')}</option>
                    <option value="metal">{t('calculators.fencing.metal')}</option>
                    <option value="composite">{t('calculators.fencing.composite')}</option>
                  </select>
                </div>

                <div className="flex items-center">
                  <input
                    type="checkbox"
                    checked={gate.includeHardware}
                    onChange={(e) => updateGate(gate.id, { includeHardware: e.target.checked })}
                    className="h-4 w-4 text-blue-500 focus:ring-blue-500 border-slate-300 rounded"
                  />
                  <label className="ml-2 block text-sm font-medium text-slate-700">
                    {t('calculators.fencing.includeHardware')}
                  </label>
                </div>
              </div>

              <button
                onClick={() => removeGate(gate.id)}
                className="mt-4 text-red-500 hover:text-red-600"
              >
                {t('calculators.fencing.removeGate')}
              </button>
            </div>
          ))}
        </div>

        <div className="border-t border-slate-200 pt-6 mb-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-medium text-slate-800">{t('calculators.fencing.corners')}</h3>
            <button
              onClick={addCorner}
              className="px-3 py-2 bg-slate-100 hover:bg-slate-200 rounded-md transition-colors"
            >
              {t('calculators.fencing.addCorner')}
            </button>
          </div>

          {corners.map(corner => (
            <div key={corner.id} className="mb-4 p-4 bg-slate-50 rounded-lg">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">
                  {t('calculators.fencing.cornerAngle')}
                </label>
                <input
                  type="number"
                  min="0"
                  max="180"
                  step="1"
                  value={corner.angle}
                  onChange={(e) => updateCorner(corner.id, { angle: Number(e.target.value) })}
                  className="w-full p-2 border border-slate-300 rounded-md"
                />
              </div>

              <button
                onClick={() => removeCorner(corner.id)}
                className="mt-4 text-red-500 hover:text-red-600"
              >
                {t('calculators.fencing.removeCorner')}
              </button>
            </div>
          ))}
        </div>

        <div className="border-t border-slate-200 pt-6 mb-6">
          <h3 className="text-lg font-medium text-slate-800 mb-4">{t('calculators.fencing.terrainInstallation')}</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label htmlFor="slopeType" className="block text-sm font-medium text-slate-700 mb-1">
                {t('calculators.fencing.slopeType')}
              </label>
              <select
                id="slopeType"
                value={slopeType}
                onChange={(e) => setSlopeType(e.target.value as typeof slopeType)}
                className="w-full p-2 border border-slate-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                <option value="level">{t('calculators.fencing.levelGround')}</option>
                <option value="stepping">{t('calculators.fencing.stepping')}</option>
                <option value="racking">{t('calculators.fencing.racking')}</option>
              </select>
            </div>

            {slopeType !== 'level' && (
              <div>
                <label htmlFor="slopePercentage" className="block text-sm font-medium text-slate-700 mb-1">
                  {t('calculators.fencing.slopePercentage')}
                </label>
                <input
                  type="number"
                  id="slopePercentage"
                  min="0"
                  max="100"
                  step="1"
                  value={slopePercentage}
                  onChange={(e) => setSlopePercentage(e.target.value ? Number(e.target.value) : '')}
                  className="w-full p-2 border border-slate-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder={t('calculators.fencing.enterSlopePercentage')}
                />
              </div>
            )}

            <div>
              <label htmlFor="postMountType" className="block text-sm font-medium text-slate-700 mb-1">
                {t('calculators.fencing.postMountingMethod')}
              </label>
              <select
                id="postMountType"
                value={postMountType}
                onChange={(e) => setPostMountType(e.target.value as typeof postMountType)}
                className="w-full p-2 border border-slate-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                <option value="concrete">{t('calculators.fencing.concrete')}</option>
                <option value="spike">{t('calculators.fencing.groundSpike')}</option>
                <option value="bracket">{t('calculators.fencing.surfaceMountBracket')}</option>
              </select>
            </div>

            {postMountType === 'concrete' && (
              <div>
                <label htmlFor="concreteDepth" className="block text-sm font-medium text-slate-700 mb-1">
                  {t('calculators.fencing.postHoleDepth')}
                </label>
                <input
                  type="number"
                  id="concreteDepth"
                  min="0"
                  step="1"
                  value={concreteDepth}
                  onChange={(e) => setConcreteDepth(e.target.value ? Number(e.target.value) : '')}
                  className="w-full p-2 border border-slate-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder={t('calculators.fencing.enterPostHoleDepth')}
                />
              </div>
            )}
          </div>
        </div>

        <div className="border-t border-slate-200 pt-6">
          <h3 className="text-lg font-medium text-slate-800 mb-4">{t('calculators.fencing.additionalOptions')}</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="flex items-center">
              <input
                type="checkbox"
                id="includePostCaps"
                checked={includePostCaps}
                onChange={(e) => setIncludePostCaps(e.target.checked)}
                className="h-4 w-4 text-blue-500 focus:ring-blue-500 border-slate-300 rounded"
              />
              <label htmlFor="includePostCaps" className="ml-2 block text-sm font-medium text-slate-700">
                {t('calculators.fencing.includePostCaps')}
              </label>
            </div>

            <div className="flex items-center">
              <input
                type="checkbox"
                id="includeKickboard"
                checked={includeKickboard}
                onChange={(e) => setIncludeKickboard(e.target.checked)}
                className="h-4 w-4 text-blue-500 focus:ring-blue-500 border-slate-300 rounded"
              />
              <label htmlFor="includeKickboard" className="ml-2 block text-sm font-medium text-slate-700">
                {t('calculators.fencing.includeKickboard')}
              </label>
            </div>

            <div>
              <label htmlFor="wasteFactor" className="block text-sm font-medium text-slate-700 mb-1">
                {t('calculators.fencing.wasteFactor')}
              </label>
              <select
                id="wasteFactor"
                value={wasteFactor}
                onChange={(e) => setWasteFactor(Number(e.target.value) as 10 | 15 | 20)}
                className="w-full p-2 border border-slate-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                <option value={10}>{t('calculators.fencing.wasteFactorSimple')}</option>
                <option value={15}>{t('calculators.fencing.wasteFactorAverage')}</option>
                <option value={20}>{t('calculators.fencing.wasteFactorComplex')}</option>
              </select>
            </div>
          </div>
        </div>
          </>
        )}
      </div>

      <button
        onClick={handleCalculate}
        disabled={!isFormValid}
        className={`w-full py-3 px-4 rounded-md font-medium text-white ${
          isFormValid
            ? 'bg-blue-500 hover:bg-blue-600 transition-colors'
            : 'bg-slate-300 cursor-not-allowed'
        }`}
      >
        {t('calculators.calculateMaterials')}
      </button>
    </div>
  );
};

export default FencingCalculator;
