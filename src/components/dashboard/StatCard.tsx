import { ReactNode } from 'react';
import { TrendingUp, TrendingDown } from 'lucide-react';

interface StatCardProps {
  title: string;
  value: string;
  change: string;
  positive: boolean;
  icon: ReactNode;
}

const StatCard = ({ title, value, change, positive, icon }: StatCardProps) => {
  return (
    <div className="p-6 bg-white rounded-lg shadow transition-transform hover:translate-y-[-3px]">
      <div className="flex justify-between">
        <div>
          <p className="text-sm font-medium text-gray-600">{title}</p>
          <p className="mt-1 text-2xl font-semibold text-gray-900">{value}</p>
        </div>
        <div className="flex items-center justify-center w-12 h-12 bg-blue-100 rounded-lg">
          {icon}
        </div>
      </div>
      <div className="flex items-center mt-4">
        {positive ? (
          <TrendingUp className="w-4 h-4 mr-1 text-green-600" />
        ) : (
          <TrendingDown className="w-4 h-4 mr-1 text-red-600" />
        )}
        <span className={`text-sm font-medium ${positive ? 'text-green-600' : 'text-red-600'}`}>
          {change}
        </span>
        <span className="ml-2 text-sm text-gray-500">from last month</span>
      </div>
    </div>
  );
};

export default StatCard;