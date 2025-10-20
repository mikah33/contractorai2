import { useState, useRef, useEffect } from 'react';
import { FileDown, Copy, RotateCw, Calculator, Settings, Save } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { useNavigate, useSearchParams } from 'react-router-dom';
import TradeSelector from '../components/pricing/TradeSelector';
import { estimateService } from '../services/estimateService';
import ProjectSpecifications from '../components/pricing/ProjectSpecifications';
import PricingResults from '../components/pricing/PricingResults';
import CalculatorManagementModal from '../components/calculators/CalculatorManagementModal';
import { useCalculatorPreferences } from '../hooks/useCalculatorPreferences';
import { calculatorRegistry } from '../data/calculatorRegistry';
import ConcreteCalculator from '../components/pricing/ConcreteCalculator';
import DeckCalculator from '../components/pricing/DeckCalculator';
import DoorsWindowsCalculator from '../components/pricing/DoorsWindowsCalculator';
import DrywallCalculator from '../components/pricing/DrywallCalculator';
import ElectricalCalculator from '../components/pricing/ElectricalCalculator';
import ExcavationCalculator from '../components/pricing/ExcavationCalculator';
import FencingCalculator from '../components/pricing/FencingCalculator';
import FlooringCalculator from '../components/pricing/FlooringCalculator';
import FoundationCalculator from '../components/pricing/FoundationCalculator';
import FramingCalculator from '../components/pricing/FramingCalculator';
import GutterCalculator from '../components/pricing/GutterCalculator';
import HVACCalculator from '../components/pricing/HVACCalculator';
import JunkRemovalCalculator from '../components/pricing/JunkRemovalCalculator';
import PaintCalculator from '../components/pricing/PaintCalculator';
import PaversCalculator from '../components/pricing/PaversCalculator';
import PlumbingCalculator from '../components/pricing/PlumbingCalculator';
import RetainingWallCalculator from '../components/pricing/RetainingWallCalculator';
import SidingCalculator from '../components/pricing/SidingCalculator';
import TileCalculator from '../components/pricing/TileCalculator';
import RoofingCalculator from '../components/pricing/RoofingCalculator';
import VeneerCalculator from '../components/pricing/VeneerCalculator';
import CalculatorResults from '../components/pricing/CalculatorResults';
import { Trade, CalculationResult } from '../types';
import { trades } from '../data/trades';

const PricingCalculator = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [selectedTrade, setSelectedTrade] = useState<Trade | null>(null);
  const [specifications, setSpecifications] = useState<Record<string, any>>({});
  const [calculationComplete, setCalculationComplete] = useState(false);
  const [calculating, setCalculating] = useState(false);
  const [calculatorResults, setCalculatorResults] = useState<CalculationResult[]>([]);
  const [showSpecializedCalculator, setShowSpecializedCalculator] = useState(false);
  const calculatorRef = useRef<HTMLDivElement>(null);
  const [showManageModal, setShowManageModal] = useState(false);
  const [editingEstimateId, setEditingEstimateId] = useState<string | null>(null);
  const [loadingEstimate, setLoadingEstimate] = useState(false);

  const { selectedCalculators, loading: loadingPreferences, refreshCalculators } = useCalculatorPreferences();

  // Filter trades to only show selected calculators
  const availableTrades = trades.filter(trade =>
    selectedCalculators.some(calc => calc.id === trade.id)
  );

  const handleTradeSelect = (trade: Trade) => {
    setSelectedTrade(trade);
    setCalculationComplete(false);
    setSpecifications({});
    setCalculatorResults([]);
    // Show specialized calculator for concrete, deck, doors_windows, drywall, electrical, excavation, fence, flooring, framing, hvac, paint, and roofing
    setShowSpecializedCalculator(['concrete', 'deck', 'doors_windows', 'drywall', 'electrical', 'excavation', 'fence', 'flooring', 'foundation', 'framing', 'gutter', 'hvac', 'junk_removal', 'paint', 'pavers', 'plumbing', 'retaining_walls', 'roofing', 'siding', 'tile', 'veneer'].includes(trade.id));
  };

  // Load estimate from URL parameters if present
  useEffect(() => {
    const loadEstimateFromParams = async () => {
      const calculatorType = searchParams.get('calculator');
      const estimateId = searchParams.get('estimateId');

      if (calculatorType && estimateId) {
        setLoadingEstimate(true);
        try {
          // Find the trade by calculator type
          const trade = availableTrades.find(t => t.id === calculatorType);
          if (!trade) {
            console.error('Calculator type not found:', calculatorType);
            alert(`Calculator type "${calculatorType}" not found or not enabled`);
            setLoadingEstimate(false);
            return;
          }

          // Load the estimate
          const result = await estimateService.getEstimate(estimateId);
          if (result.success && result.data) {
            // Set the trade
            setSelectedTrade(trade);
            setShowSpecializedCalculator(['concrete', 'deck', 'doors_windows', 'drywall', 'electrical', 'excavation', 'fence', 'flooring', 'foundation', 'framing', 'gutter', 'hvac', 'junk_removal', 'paint', 'pavers', 'plumbing', 'retaining_walls', 'roofing', 'siding', 'tile', 'veneer'].includes(trade.id));

            // Set editing mode
            setEditingEstimateId(estimateId);

            // Load calculator data if available
            if (result.data.calculatorData) {
              setSpecifications(result.data.calculatorData);
              // If there are results, show them
              if (result.data.items && result.data.items.length > 0) {
                // Convert items to calculation results format
                const calcResults: CalculationResult[] = result.data.items.map((item: any) => ({
                  label: item.description,
                  value: item.quantity,
                  unit: item.unit,
                  cost: item.totalPrice
                }));
                setCalculatorResults(calcResults);
                setCalculationComplete(true);
              }
            }
          } else {
            alert('Failed to load estimate');
          }
        } catch (error) {
          console.error('Error loading estimate:', error);
          alert('Error loading estimate');
        } finally {
          setLoadingEstimate(false);
        }
      }
    };

    if (!loadingPreferences && availableTrades.length > 0) {
      loadEstimateFromParams();
    }
  }, [searchParams, loadingPreferences, availableTrades]);

  // Scroll to calculator when trade is selected
  useEffect(() => {
    if (selectedTrade && calculatorRef.current) {
      setTimeout(() => {
        calculatorRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }, 100);
    }
  }, [selectedTrade]);
  
  const handleSpecificationChange = (key: string, value: any) => {
    setSpecifications(prev => ({
      ...prev,
      [key]: value
    }));
  };
  
  const calculatePricing = () => {
    if (!selectedTrade) return;
    
    setCalculating(true);
    
    // Simulate API call delay
    setTimeout(() => {
      setCalculating(false);
      setCalculationComplete(true);
    }, 1500);
  };

  const handleSpecializedCalculation = (results: CalculationResult[]) => {
    setCalculatorResults(results);
  };

  const handleSaveToEstimate = async () => {
    if (!selectedTrade || calculatorResults.length === 0) {
      alert('Please complete the calculation first');
      return;
    }

    const estimateData = {
      id: editingEstimateId || undefined,
      title: `${selectedTrade.name} Estimate`,
      items: calculatorResults.map((result, index) => ({
        id: `item-${index}`,
        description: result.label,
        quantity: result.value,
        unit: result.unit,
        unitPrice: result.cost ? result.cost / result.value : 0,
        totalPrice: result.cost || 0,
        type: 'material' as const
      })),
      subtotal: calculatorResults.reduce((sum, r) => sum + (r.cost || 0), 0),
      calculatorType: selectedTrade.id,
      calculatorData: specifications
    };

    // Navigate to estimate generator with the data
    navigate('/estimates', {
      state: {
        fromCalculator: true,
        calculatorData: estimateData
      }
    });
  };

  const handleLoadCalculation = (calculatorData: any, estimateId: string) => {
    if (calculatorData) {
      setSpecifications(calculatorData);
      setEditingEstimateId(estimateId);
      // Trigger recalculation if there's a specialized calculator
      if (showSpecializedCalculator) {
        // The specialized calculator will pick up the new specifications
        // and user can click calculate again
        alert('Calculation loaded! Click Calculate to see results.');
      }
    }
  };
  
  const hasRequiredSpecifications = () => {
    if (!selectedTrade) return false;
    
    // Check if all required fields have values
    return selectedTrade.requiredFields.every(field => 
      specifications[field.id] !== undefined && specifications[field.id] !== ''
    );
  };

  const renderSpecializedCalculator = () => {
    if (!selectedTrade || !showSpecializedCalculator) return null;

    switch (selectedTrade.id) {
      case 'concrete':
        return <ConcreteCalculator onCalculate={handleSpecializedCalculation} />;
      case 'deck':
        return <DeckCalculator onCalculate={handleSpecializedCalculation} />;
      case 'doors_windows':
        return <DoorsWindowsCalculator onCalculate={handleSpecializedCalculation} />;
      case 'drywall':
        return <DrywallCalculator onCalculate={handleSpecializedCalculation} />;
      case 'electrical':
        return <ElectricalCalculator onCalculate={handleSpecializedCalculation} />;
      case 'excavation':
        return <ExcavationCalculator onCalculate={handleSpecializedCalculation} />;
      case 'fence':
        return <FencingCalculator onCalculate={handleSpecializedCalculation} />;
      case 'flooring':
        return <FlooringCalculator onCalculate={handleSpecializedCalculation} />;
      case 'foundation':
        return <FoundationCalculator onCalculate={handleSpecializedCalculation} />;
      case 'framing':
        return <FramingCalculator onCalculate={handleSpecializedCalculation} />;
      case 'gutter':
        return <GutterCalculator onCalculate={handleSpecializedCalculation} />;
      case 'hvac':
        return <HVACCalculator onCalculate={handleSpecializedCalculation} />;
      case 'junk_removal':
        return <JunkRemovalCalculator onCalculate={handleSpecializedCalculation} />;
      case 'paint':
        return <PaintCalculator onCalculate={handleSpecializedCalculation} />;
      case 'pavers':
        return <PaversCalculator onCalculate={handleSpecializedCalculation} />;
      case 'plumbing':
        return <PlumbingCalculator onCalculate={handleSpecializedCalculation} />;
      case 'retaining_walls':
        return <RetainingWallCalculator onCalculate={handleSpecializedCalculation} />;
      case 'siding':
        return <SidingCalculator onCalculate={handleSpecializedCalculation} />;
      case 'tile':
        return <TileCalculator onCalculate={handleSpecializedCalculation} />;
      case 'roofing':
        return <RoofingCalculator onCalculate={handleSpecializedCalculation} />;
      case 'veneer':
        return <VeneerCalculator onCalculate={handleSpecializedCalculation} />;
      default:
        return null;
    }
  };

  return (
    <div className="space-y-6 px-4 sm:px-6 lg:px-0">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-gray-900">{t('calculator.title')}</h1>
          <p className="mt-1 text-sm text-gray-600">
            {t('calculator.subtitle')}
          </p>
        </div>

        <div className="flex flex-col sm:flex-row gap-2">
          {(calculationComplete || calculatorResults.length > 0) && (
            <button className="inline-flex items-center justify-center px-3 py-2 text-sm font-medium text-white bg-teal-600 border border-transparent rounded-md shadow-sm hover:bg-teal-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-teal-500 w-full sm:w-auto">
              <FileDown className="w-4 h-4 mr-2" />
              {t('calculator.exportPDF')}
            </button>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <div className="lg:col-span-1">
          <div className="p-4 sm:p-6 bg-white rounded-lg shadow">
            <div className="flex items-center justify-between mb-4">
              <h2 className="flex items-center text-lg font-medium text-gray-900">
                <Calculator className="w-5 h-5 mr-2 text-blue-600" />
                {t('calculator.selectTrade')}
              </h2>
              {availableTrades.length > 0 && (
                <button
                  onClick={() => setShowManageModal(true)}
                  className="inline-flex items-center px-3 py-1.5 text-sm font-medium text-blue-600 hover:text-blue-700 hover:bg-blue-50 rounded-md transition-colors"
                  title="Choose Calculators"
                >
                  <Settings className="w-4 h-4 mr-1.5" />
                  Choose Calculators
                </button>
              )}
            </div>

            {editingEstimateId && (
              <div className="mb-4 p-3 bg-blue-50 border border-blue-200 rounded-md">
                <p className="text-sm text-blue-800 font-medium">Editing Estimate</p>
                <p className="text-xs text-blue-600 mt-1">Make changes and click "Update Estimate" to save</p>
              </div>
            )}

            {loadingPreferences || loadingEstimate ? (
              <div className="text-center py-8 text-gray-500">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
                <p className="mt-2 text-sm">{loadingEstimate ? 'Loading estimate...' : 'Loading...'}</p>
              </div>
            ) : availableTrades.length === 0 ? (
              <div className="text-center py-8">
                <Calculator className="w-16 h-16 text-gray-300 mx-auto mb-4" />
                <h3 className="text-lg font-medium text-gray-900 mb-2">No Calculators Selected</h3>
                <p className="text-sm text-gray-600 mb-4">
                  Choose which calculators you'd like to use
                </p>
                <button
                  onClick={() => setShowManageModal(true)}
                  className="inline-flex items-center px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
                >
                  <Settings className="w-4 h-4 mr-2" />
                  Select Calculators
                </button>
              </div>
            ) : (
              <TradeSelector
                trades={availableTrades}
                selectedTrade={selectedTrade}
                onSelectTrade={handleTradeSelect}
              />
            )}
            
            {selectedTrade && !showSpecializedCalculator && (
              <div className="mt-6">
                <h3 className="text-md font-medium text-gray-900 mb-3">
                  {t('calculator.projectSpecifications')}
                </h3>
                
                <ProjectSpecifications 
                  trade={selectedTrade}
                  specifications={specifications}
                  onChange={handleSpecificationChange}
                />
                
                <button
                  onClick={calculatePricing}
                  disabled={!hasRequiredSpecifications() || calculating}
                  className={`mt-4 w-full flex justify-center items-center px-4 py-2 text-sm font-medium rounded-md shadow-sm ${
                    hasRequiredSpecifications() && !calculating 
                      ? 'bg-blue-600 text-white hover:bg-blue-700 focus:ring-blue-500' 
                      : 'bg-gray-300 text-gray-500 cursor-not-allowed'
                  } focus:outline-none focus:ring-2 focus:ring-offset-2`}
                >
                  {calculating ? (
                    <>
                      <RotateCw className="w-4 h-4 mr-2 animate-spin" />
                      {t('calculator.calculating')}
                    </>
                  ) : (
                    t('calculator.calculatePricing')
                  )}
                </button>
              </div>
            )}

          </div>
        </div>

        <div className="lg:col-span-2" ref={calculatorRef}>
          <div className="p-4 sm:p-6 bg-white rounded-lg shadow h-full overflow-x-auto">
            {!selectedTrade ? (
              <div className="flex flex-col items-center justify-center h-full text-center p-8">
                <Calculator className="w-16 h-16 text-gray-400 mb-4" />
                <h3 className="text-lg font-medium text-gray-900 mb-2">{t('calculator.selectTradeToBegin')}</h3>
                <p className="text-gray-600 max-w-md">
                  {t('calculator.selectTradeDescription')}
                </p>
              </div>
            ) : showSpecializedCalculator ? (
              <div className="space-y-6">
                {renderSpecializedCalculator()}
                {calculatorResults.length > 0 && (
                  <CalculatorResults 
                    results={calculatorResults} 
                    title={selectedTrade.name}
                  />
                )}
              </div>
            ) : !calculationComplete ? (
              <div className="flex flex-col items-center justify-center h-full text-center p-8">
                <div className="bg-blue-100 p-6 rounded-full mb-4">
                  <Calculator className="w-12 h-12 text-blue-600" />
                </div>
                <h3 className="text-lg font-medium text-gray-900 mb-2">
                  {calculating ? t('calculator.calculatingPricing') : t('calculator.readyToCalculate')}
                </h3>
                <p className="text-gray-600 max-w-md">
                  {calculating
                    ? t('calculator.aiAnalyzing')
                    : t('calculator.fillSpecifications')}
                </p>
                {calculating && (
                  <div className="mt-4 w-full max-w-xs h-2 bg-gray-200 rounded-full overflow-hidden">
                    <div className="h-full bg-blue-600 rounded-full animate-progress"></div>
                  </div>
                )}
              </div>
            ) : (
              <PricingResults
                trade={selectedTrade}
                specifications={specifications}
                calculationResults={calculatorResults}
              />
            )}
          </div>
        </div>
      </div>

      {/* Calculator Management Modal */}
      <CalculatorManagementModal
        isOpen={showManageModal}
        onClose={() => {
          setShowManageModal(false);
          refreshCalculators();
        }}
      />
    </div>
  );
};

export default PricingCalculator;