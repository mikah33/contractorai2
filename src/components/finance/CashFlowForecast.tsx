import { useState, useEffect } from 'react';
import { TrendingUp, TrendingDown, Calendar, RefreshCw, AlertTriangle, Download } from 'lucide-react';
import { useFinanceStore } from '../../stores/financeStore';

interface CashFlowForecastProps {
  months?: number;
}

const CashFlowForecast: React.FC<CashFlowForecastProps> = ({ months = 6 }) => {
  const [isLoading, setIsLoading] = useState(false);
  const [forecast, setForecast] = useState<any[]>([]);
  const { predictCashFlow } = useFinanceStore();

  useEffect(() => {
    loadForecast();
  }, [months]);

  const loadForecast = async () => {
    setIsLoading(true);
    try {
      const data = await predictCashFlow(months);
      setForecast(data);
    } catch (error) {
      console.error('Error loading forecast:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const renderChart = () => {
    if (forecast.length === 0) return null;
    
    const maxValue = Math.max(
      ...forecast.map(month => Math.max(month.revenue, month.expenses))
    );
    
    return (
      <div className="h-64 flex items-end space-x-2">
        {forecast.map((month, index) => {
          const revenueHeight = maxValue > 0 ? (month.revenue / maxValue) * 100 : 0;
          const expensesHeight = maxValue > 0 ? (month.expenses / maxValue) * 100 : 0;
          const profit = month.revenue - month.expenses;
          
          return (
            <div key={index} className="flex-1 flex flex-col items-center">
              <div className="w-full flex justify-center space-x-1">
                <div 
                  className="w-1/3 rounded-t bg-blue-500"
                  style={{ height: `${Math.max(revenueHeight, 1)}%` }}
                  title={`Revenue: $${month.revenue.toLocaleString()}`}
                ></div>
                <div 
                  className="w-1/3 rounded-t bg-red-500"
                  style={{ height: `${Math.max(expensesHeight, 1)}%` }}
                  title={`Expenses: $${month.expenses.toLocaleString()}`}
                ></div>
                <div 
                  className={`w-1/3 rounded-t ${profit >= 0 ? 'bg-green-500' : 'bg-red-500'}`}
                  style={{ height: `${Math.max(Math.abs(profit) / maxValue * 100, 1)}%` }}
                  title={`Profit: $${profit.toLocaleString()}`}
                ></div>
              </div>
              <div className="text-xs text-gray-500 mt-2">{month.month}</div>
            </div>
          );
        })}
      </div>
    );
  };

  return (
    <div className="bg-white rounded-lg shadow-md">
      <div className="p-6 border-b border-gray-200">
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-medium text-gray-900">Cash Flow Forecast</h3>
          <div className="flex space-x-2">
            <button
              onClick={loadForecast}
              disabled={isLoading}
              className="inline-flex items-center px-3 py-2 border border-gray-300 shadow-sm text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50"
            >
              <RefreshCw className={`h-4 w-4 mr-2 ${isLoading ? 'animate-spin' : ''}`} />
              Refresh
            </button>
            <button className="inline-flex items-center px-3 py-2 border border-gray-300 shadow-sm text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500">
              <Download className="h-4 w-4 mr-2" />
              Export
            </button>
          </div>
        </div>
      </div>

      <div className="p-6">
        {isLoading ? (
          <div className="flex justify-center items-center h-64">
            <RefreshCw className="h-8 w-8 text-blue-500 animate-spin" />
          </div>
        ) : (
          <>
            <div className="mb-6">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="bg-blue-50 rounded-lg p-4">
                  <div className="flex items-center">
                    <Calendar className="h-5 w-5 text-blue-500 mr-2" />
                    <h4 className="text-sm font-medium text-blue-900">Forecast Period</h4>
                  </div>
                  <p className="mt-1 text-2xl font-semibold text-blue-900">Next {months} Months</p>
                </div>
                
                <div className="bg-green-50 rounded-lg p-4">
                  <div className="flex items-center">
                    <TrendingUp className="h-5 w-5 text-green-500 mr-2" />
                    <h4 className="text-sm font-medium text-green-900">Projected Revenue</h4>
                  </div>
                  <p className="mt-1 text-2xl font-semibold text-green-900">
                    ${forecast.reduce((sum, month) => sum + month.revenue, 0).toLocaleString()}
                  </p>
                </div>
                
                <div className="bg-red-50 rounded-lg p-4">
                  <div className="flex items-center">
                    <TrendingDown className="h-5 w-5 text-red-500 mr-2" />
                    <h4 className="text-sm font-medium text-red-900">Projected Expenses</h4>
                  </div>
                  <p className="mt-1 text-2xl font-semibold text-red-900">
                    ${forecast.reduce((sum, month) => sum + month.expenses, 0).toLocaleString()}
                  </p>
                </div>
              </div>
            </div>
            
            {renderChart()}
            
            <div className="mt-6 bg-yellow-50 border-l-4 border-yellow-400 p-4">
              <div className="flex">
                <div className="flex-shrink-0">
                  <AlertTriangle className="h-5 w-5 text-yellow-400" />
                </div>
                <div className="ml-3">
                  <h3 className="text-sm font-medium text-yellow-800">Cash Flow Alert</h3>
                  <div className="mt-2 text-sm text-yellow-700">
                    <p>
                      Your cash flow forecast shows a potential cash shortage in August. Consider adjusting payment schedules or securing additional funding to maintain healthy cash reserves.
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
};

export default CashFlowForecast;