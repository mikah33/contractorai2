import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import { Settings2 } from 'lucide-react';
import { Trade } from '../../types';
import { CalculatorTab } from '../../types/custom-calculator';

interface TradeSelectorProps {
  trades: Trade[];
  selectedTrade: Trade | null;
  onSelectTrade: (trade: Trade) => void;
  activeTab: CalculatorTab;
}

const TradeSelector = ({ trades, selectedTrade, onSelectTrade, activeTab }: TradeSelectorProps) => {
  const { t } = useTranslation();
  const navigate = useNavigate();

  // List of calculator types that have configuration pages
  const configurableCalculators = [
    'deck',
    'roofing',
    'concrete',
    'siding',
    'paint',
    'flooring',
    'tile',
    'drywall',
    'fencing',
    'fence',
    'pavers',
    'veneer',
    'hvac',
    'electrical',
    'gutter',
    'foundation',
    'retaining-wall',
    'retaining_walls',
    'doors-windows',
    'doors_windows',
    'plumbing',
    'framing',
    'junk-removal',
    'junk_removal',
    'excavation'
  ];

  // Group trades by category
  const categories = trades.reduce((acc, trade) => {
    if (!acc[trade.category]) {
      acc[trade.category] = [];
    }
    acc[trade.category].push(trade);
    return acc;
  }, {} as Record<string, Trade[]>);

  const handleConfigureClick = (e: React.MouseEvent, tradeId: string) => {
    e.stopPropagation();
    // Map trade IDs with underscores to URL format with hyphens
    const urlMap: Record<string, string> = {
      'retaining_walls': 'retaining-wall',
      'doors_windows': 'doors-windows',
      'junk_removal': 'junk-removal',
      'fence': 'fencing'
    };
    const urlId = urlMap[tradeId] || tradeId;
    navigate(`/pricing/configure/${urlId}`);
  };

  const isConfigurable = (tradeId: string) => {
    return configurableCalculators.includes(tradeId);
  };

  return (
    <div className="space-y-4">
      {Object.entries(categories).map(([category, categoryTrades]) => (
        <div key={category}>
          <h3 className="text-sm font-medium text-gray-700 mb-2">{category}</h3>
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-2">
            {categoryTrades.map((trade) => (
              <div key={trade.id} className="relative">
                <button
                  onClick={() => onSelectTrade(trade)}
                  className={`w-full flex flex-col items-center justify-center p-3 border rounded-md transition-colors ${
                    selectedTrade?.id === trade.id
                      ? 'bg-blue-50 border-blue-500 text-blue-700'
                      : 'border-gray-300 hover:bg-gray-50 text-gray-700'
                  }`}
                >
                  <div className="w-8 h-8 flex items-center justify-center mb-1">
                    {trade.icon}
                  </div>
                  <span className="text-xs font-medium text-center">{t(trade.name)}</span>
                </button>

                {/* Configure button - only show in custom tab and for configurable calculators */}
                {activeTab === 'custom' && isConfigurable(trade.id) && (
                  <button
                    onClick={(e) => handleConfigureClick(e, trade.id)}
                    className="absolute top-1 right-1 p-1 bg-white border border-gray-300 rounded-md hover:bg-gray-50 hover:border-blue-500 transition-colors shadow-sm"
                    title="Configure Calculator"
                  >
                    <Settings2 className="w-3 h-3 text-gray-600" />
                  </button>
                )}
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
};

export default TradeSelector;