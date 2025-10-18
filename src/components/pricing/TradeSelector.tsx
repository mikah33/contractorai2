import { useTranslation } from 'react-i18next';
import { Trade } from '../../types';

interface TradeSelectorProps {
  trades: Trade[];
  selectedTrade: Trade | null;
  onSelectTrade: (trade: Trade) => void;
}

const TradeSelector = ({ trades, selectedTrade, onSelectTrade }: TradeSelectorProps) => {
  const { t } = useTranslation();
  // Group trades by category
  const categories = trades.reduce((acc, trade) => {
    if (!acc[trade.category]) {
      acc[trade.category] = [];
    }
    acc[trade.category].push(trade);
    return acc;
  }, {} as Record<string, Trade[]>);

  return (
    <div className="space-y-4">
      {Object.entries(categories).map(([category, categoryTrades]) => (
        <div key={category}>
          <h3 className="text-sm font-medium text-gray-700 mb-2">{category}</h3>
          <div className="grid grid-cols-2 gap-2">
            {categoryTrades.map((trade) => (
              <button
                key={trade.id}
                onClick={() => onSelectTrade(trade)}
                className={`flex flex-col items-center justify-center p-3 border rounded-md transition-colors ${
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
            ))}
          </div>
        </div>
      ))}
    </div>
  );
};

export default TradeSelector;