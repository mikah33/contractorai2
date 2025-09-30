import { useEffect, useRef } from 'react';
import { DollarSign } from 'lucide-react';

const FinanceSummaryChart = () => {
  // In a real app, we would use a charting library like Chart.js or Recharts
  // For now, we'll create a simple static chart for demonstration

  return (
    <div>
      <div className="grid grid-cols-1 gap-4 md:grid-cols-3 mb-6">
        <div className="p-3 bg-blue-50 rounded-lg border border-blue-100">
          <p className="text-sm text-blue-700 font-medium">Total Revenue</p>
          <div className="flex items-end">
            <span className="text-xl font-bold text-blue-900">$0</span>
            <span className="ml-2 text-xs text-green-600 flex items-center">
              +0%
            </span>
          </div>
        </div>
        <div className="p-3 bg-green-50 rounded-lg border border-green-100">
          <p className="text-sm text-green-700 font-medium">Project Margins</p>
          <div className="flex items-end">
            <span className="text-xl font-bold text-green-900">0%</span>
            <span className="ml-2 text-xs text-green-600 flex items-center">
              +0%
            </span>
          </div>
        </div>
        <div className="p-3 bg-amber-50 rounded-lg border border-amber-100">
          <p className="text-sm text-amber-700 font-medium">Outstanding Invoices</p>
          <div className="flex items-end">
            <span className="text-xl font-bold text-amber-900">$0</span>
            <span className="ml-2 text-xs text-red-600 flex items-center">
              +0%
            </span>
          </div>
        </div>
      </div>
      
      <div className="w-full h-60 bg-gray-50 rounded-lg relative flex items-end p-4">
        {/* Simplified bar chart */}
        <div className="absolute top-2 left-2 text-xs text-gray-500">Revenue vs. Expenses (Last 6 Months)</div>
        
        {[0, 0, 0, 0, 0, 0].map((height, i) => (
          <div key={i} className="flex flex-col items-center mx-2 flex-1">
            <div className="w-full flex space-x-1">
              <div 
                className="bg-blue-500 rounded-t-sm" 
                style={{ height: `${height}px`, width: '45%' }}
              ></div>
              <div 
                className="bg-teal-500 rounded-t-sm" 
                style={{ height: `${height * 0.7}px`, width: '45%' }}
              ></div>
            </div>
            <div className="text-xs text-gray-500 mt-2">
              {['May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct'][i]}
            </div>
          </div>
        ))}
        
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