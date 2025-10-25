import { useEffect, useRef, useState, useMemo } from 'react';
import { DollarSign } from 'lucide-react';
import { useFinanceStore } from '../../stores/financeStoreSupabase';

const FinanceSummaryChart = () => {
  const { financialSummary } = useFinanceStore();


  return (
    <div>
      <div className="grid grid-cols-1 gap-4 md:grid-cols-3 mb-6">
        <div className="p-3 bg-blue-50 rounded-lg border border-blue-100">
          <p className="text-sm text-blue-700 font-medium">Total Revenue</p>
          <span className="text-xl font-bold text-blue-900">
            ${financialSummary.totalRevenue.toLocaleString()}
          </span>
        </div>
        <div className="p-3 bg-green-50 rounded-lg border border-green-100">
          <p className="text-sm text-green-700 font-medium">Profit Margin</p>
          <span className="text-xl font-bold text-green-900">
            {financialSummary.profitMargin.toFixed(1)}%
          </span>
        </div>
        <div className="p-3 bg-amber-50 rounded-lg border border-amber-100">
          <p className="text-sm text-amber-700 font-medium">Outstanding Invoices</p>
          <span className="text-xl font-bold text-amber-900">
            ${financialSummary.outstandingInvoices.toLocaleString()}
          </span>
        </div>
      </div>
      
      <div className="w-full h-60 bg-gray-50 rounded-lg relative p-4">
        {/* Simplified bar chart */}
        <div className="absolute top-2 left-2 text-xs text-gray-500">Revenue vs. Expenses (Last 6 Months)</div>

        <div className="h-full w-full flex items-end justify-between pt-8 pb-8">
          {(() => {
            const monthlyData = financialSummary.monthlyData || [];
            const last6Months = monthlyData.slice(-6);

            // Pad with empty months if less than 6
            while (last6Months.length < 6) {
              const date = new Date();
              date.setMonth(date.getMonth() - (6 - last6Months.length));
              last6Months.unshift({
                month: date.toLocaleDateString('en-US', { month: 'short', year: 'numeric' }),
                revenue: 0,
                expenses: 0
              });
            }

            const maxValue = Math.max(
              ...last6Months.map(d => Math.max(d.revenue, d.expenses)),
              1
            );

            return last6Months.map((data, i) => (
              <div key={i} className="flex flex-col items-center flex-1 max-w-[16%]">
                <div className="w-full flex justify-center items-end space-x-1 h-40">
                  <div
                    className="bg-blue-500 rounded-t-sm w-[40%]"
                    style={{
                      height: `${Math.max((data.revenue / maxValue) * 100, 2)}%`,
                      minHeight: data.revenue > 0 ? '4px' : '0'
                    }}
                  ></div>
                  <div
                    className="bg-teal-500 rounded-t-sm w-[40%]"
                    style={{
                      height: `${Math.max((data.expenses / maxValue) * 100, 2)}%`,
                      minHeight: data.expenses > 0 ? '4px' : '0'
                    }}
                  ></div>
                </div>
                <div className="text-xs text-gray-500 mt-2 whitespace-nowrap">
                  {data.month.split(' ')[0]}
                </div>
              </div>
            ));
          })()}
        </div>
        
        {/* Legend */}
        <div className="absolute bottom-2 right-2 flex items-center text-xs">
          <div className="flex items-center mr-3">
            <div className="w-3 h-3 bg-blue-500 rounded-sm mr-1"></div>
            <span>Revenue</span>
          </div>
          <div className="flex items-center">
            <div className="w-3 h-3 bg-teal-500 rounded-sm mr-1"></div>
            <span>Expenses</span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default FinanceSummaryChart;