import { useState } from 'react';
import { DollarSign, TrendingUp, TrendingDown, Calendar, AlertCircle, Download, Filter } from 'lucide-react';
import { format, subDays, subMonths } from 'date-fns';

interface FinancialSummary {
  totalRevenue: number;
  totalExpenses: number;
  profit: number;
  profitMargin: number;
  outstandingInvoices: number;
  upcomingPayments: {
    amount: number;
    dueDate: string;
    projectName: string;
    clientName: string;
  }[];
  recentTransactions: {
    id: string;
    date: string;
    description: string;
    amount: number;
    type: 'income' | 'expense';
  }[];
  monthlyData: {
    month: string;
    revenue: number;
    expenses: number;
  }[];
  expensesByCategory: {
    category: string;
    amount: number;
    percentage: number;
  }[];
}

interface FinanceDashboardProps {
  summary: FinancialSummary;
  dateRange: 'week' | 'month' | 'quarter' | 'year';
  onChangeDateRange: (range: 'week' | 'month' | 'quarter' | 'year') => void;
  onExport: (format: 'pdf' | 'csv') => void;
}

const FinanceDashboard: React.FC<FinanceDashboardProps> = ({
  summary,
  dateRange,
  onChangeDateRange,
  onExport
}) => {
  const [selectedChart, setSelectedChart] = useState<'revenue' | 'expenses' | 'profit'>('revenue');

  // Calculate date range for display
  const getDateRangeText = () => {
    const endDate = new Date();
    let startDate;
    
    switch (dateRange) {
      case 'week':
        startDate = subDays(endDate, 7);
        break;
      case 'month':
        startDate = subMonths(endDate, 1);
        break;
      case 'quarter':
        startDate = subMonths(endDate, 3);
        break;
      case 'year':
        startDate = subMonths(endDate, 12);
        break;
      default:
        startDate = subMonths(endDate, 1);
    }
    
    return `${format(startDate, 'MMM d, yyyy')} - ${format(endDate, 'MMM d, yyyy')}`;
  };

  // Render the bar chart
  const renderBarChart = () => {
    const maxValue = Math.max(
      ...summary.monthlyData.map(d => 
        selectedChart === 'revenue' ? d.revenue : 
        selectedChart === 'expenses' ? d.expenses : 
        d.revenue - d.expenses
      )
    );
    
    return (
      <div className="h-64 flex items-end space-x-2">
        {summary.monthlyData.map((data, index) => {
          const value = selectedChart === 'revenue' ? data.revenue : 
                        selectedChart === 'expenses' ? data.expenses : 
                        data.revenue - data.expenses;
          
          const height = maxValue > 0 ? (value / maxValue) * 100 : 0;
          
          return (
            <div key={index} className="flex-1 flex flex-col items-center">
              <div 
                className={`w-full rounded-t ${
                  selectedChart === 'revenue' ? 'bg-blue-500' : 
                  selectedChart === 'expenses' ? 'bg-red-500' : 
                  value >= 0 ? 'bg-green-500' : 'bg-red-500'
                }`}
                style={{ height: `${Math.max(height, 1)}%` }}
              ></div>
              <div className="text-xs text-gray-500 mt-2">{data.month}</div>
            </div>
          );
        })}
      </div>
    );
  };

  // Render the pie chart for expense categories
  const renderPieChart = () => {
    const colors = [
      'bg-blue-500', 'bg-green-500', 'bg-yellow-500', 
      'bg-purple-500', 'bg-pink-500', 'bg-indigo-500',
      'bg-red-500', 'bg-orange-500', 'bg-teal-500'
    ];
    
    return (
      <div className="mt-4">
        <div className="relative pt-1">
          <div className="flex h-4 overflow-hidden rounded-full">
            {summary.expensesByCategory.map((category, index) => (
              <div
                key={index}
                className={`${colors[index % colors.length]}`}
                style={{ width: `${category.percentage}%` }}
                title={`${category.category}: $${category.amount.toFixed(2)} (${category.percentage.toFixed(1)}%)`}
              ></div>
            ))}
          </div>
        </div>
        
        <div className="mt-4 grid grid-cols-2 gap-2">
          {summary.expensesByCategory.map((category, index) => (
            <div key={index} className="flex items-center">
              <div className={`w-3 h-3 rounded-full ${colors[index % colors.length]} mr-2`}></div>
              <div className="text-xs">
                <span className="font-medium">{category.category}</span>
                <span className="text-gray-500 ml-1">${category.amount.toFixed(0)}</span>
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h2 className="text-lg font-medium text-gray-900">Financial Overview</h2>
          <p className="mt-1 text-sm text-gray-500">{getDateRangeText()}</p>
        </div>
        
        <div className="flex items-center space-x-2">
          <div className="relative">
            <select
              value={dateRange}
              onChange={(e) => onChangeDateRange(e.target.value as any)}
              className="appearance-none pl-3 pr-10 py-2 text-base border-gray-300 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm rounded-md"
            >
              <option value="week">Last 7 days</option>
              <option value="month">Last 30 days</option>
              <option value="quarter">Last 90 days</option>
              <option value="year">Last 12 months</option>
            </select>
            <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-2 text-gray-500">
              <Filter className="h-4 w-4" />
            </div>
          </div>
          
          <button
            onClick={() => onExport('pdf')}
            className="inline-flex items-center px-3 py-2 border border-gray-300 shadow-sm text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
          >
            <Download className="h-4 w-4 mr-2" />
            Export
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4">
        <div className="bg-white overflow-hidden shadow rounded-lg">
          <div className="p-5">
            <div className="flex items-center">
              <div className="flex-shrink-0 bg-blue-500 rounded-md p-3">
                <DollarSign className="h-6 w-6 text-white" />
              </div>
              <div className="ml-5 w-0 flex-1">
                <dl>
                  <dt className="text-sm font-medium text-gray-500 truncate">Total Revenue</dt>
                  <dd className="flex items-baseline">
                    <div className="text-2xl font-semibold text-gray-900">${summary.totalRevenue.toLocaleString()}</div>
                    <div className="ml-2 flex items-baseline text-sm font-semibold text-green-600">
                      <TrendingUp className="self-center flex-shrink-0 h-4 w-4 text-green-500" />
                      <span className="ml-1">12.5%</span>
                    </div>
                  </dd>
                </dl>
              </div>
            </div>
          </div>
        </div>

        <div className="bg-white overflow-hidden shadow rounded-lg">
          <div className="p-5">
            <div className="flex items-center">
              <div className="flex-shrink-0 bg-red-500 rounded-md p-3">
                <DollarSign className="h-6 w-6 text-white" />
              </div>
              <div className="ml-5 w-0 flex-1">
                <dl>
                  <dt className="text-sm font-medium text-gray-500 truncate">Total Expenses</dt>
                  <dd className="flex items-baseline">
                    <div className="text-2xl font-semibold text-gray-900">${summary.totalExpenses.toLocaleString()}</div>
                    <div className="ml-2 flex items-baseline text-sm font-semibold text-red-600">
                      <TrendingUp className="self-center flex-shrink-0 h-4 w-4 text-red-500" />
                      <span className="ml-1">8.2%</span>
                    </div>
                  </dd>
                </dl>
              </div>
            </div>
          </div>
        </div>

        <div className="bg-white overflow-hidden shadow rounded-lg">
          <div className="p-5">
            <div className="flex items-center">
              <div className="flex-shrink-0 bg-green-500 rounded-md p-3">
                <DollarSign className="h-6 w-6 text-white" />
              </div>
              <div className="ml-5 w-0 flex-1">
                <dl>
                  <dt className="text-sm font-medium text-gray-500 truncate">Net Profit</dt>
                  <dd className="flex items-baseline">
                    <div className="text-2xl font-semibold text-gray-900">${summary.profit.toLocaleString()}</div>
                    <div className="ml-2 flex items-baseline text-sm font-semibold text-green-600">
                      <TrendingUp className="self-center flex-shrink-0 h-4 w-4 text-green-500" />
                      <span className="ml-1">23.1%</span>
                    </div>
                  </dd>
                </dl>
              </div>
            </div>
          </div>
        </div>

        <div className="bg-white overflow-hidden shadow rounded-lg">
          <div className="p-5">
            <div className="flex items-center">
              <div className="flex-shrink-0 bg-yellow-500 rounded-md p-3">
                <DollarSign className="h-6 w-6 text-white" />
              </div>
              <div className="ml-5 w-0 flex-1">
                <dl>
                  <dt className="text-sm font-medium text-gray-500 truncate">Outstanding Invoices</dt>
                  <dd className="flex items-baseline">
                    <div className="text-2xl font-semibold text-gray-900">${summary.outstandingInvoices.toLocaleString()}</div>
                    <div className="ml-2 flex items-baseline text-sm font-semibold text-red-600">
                      <TrendingDown className="self-center flex-shrink-0 h-4 w-4 text-red-500" />
                      <span className="ml-1">4.3%</span>
                    </div>
                  </dd>
                </dl>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-5 lg:grid-cols-2">
        <div className="bg-white overflow-hidden shadow rounded-lg">
          <div className="px-5 py-4 border-b border-gray-200">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-medium text-gray-900">Revenue vs. Expenses</h3>
              <div className="flex space-x-2">
                <button
                  onClick={() => setSelectedChart('revenue')}
                  className={`px-3 py-1 text-xs font-medium rounded-md ${
                    selectedChart === 'revenue' 
                      ? 'bg-blue-100 text-blue-800' 
                      : 'bg-gray-100 text-gray-800 hover:bg-gray-200'
                  }`}
                >
                  Revenue
                </button>
                <button
                  onClick={() => setSelectedChart('expenses')}
                  className={`px-3 py-1 text-xs font-medium rounded-md ${
                    selectedChart === 'expenses' 
                      ? 'bg-blue-100 text-blue-800' 
                      : 'bg-gray-100 text-gray-800 hover:bg-gray-200'
                  }`}
                >
                  Expenses
                </button>
                <button
                  onClick={() => setSelectedChart('profit')}
                  className={`px-3 py-1 text-xs font-medium rounded-md ${
                    selectedChart === 'profit' 
                      ? 'bg-blue-100 text-blue-800' 
                      : 'bg-gray-100 text-gray-800 hover:bg-gray-200'
                  }`}
                >
                  Profit
                </button>
              </div>
            </div>
          </div>
          <div className="p-5">
            {renderBarChart()}
          </div>
        </div>

        <div className="bg-white overflow-hidden shadow rounded-lg">
          <div className="px-5 py-4 border-b border-gray-200">
            <h3 className="text-lg font-medium text-gray-900">Expenses by Category</h3>
          </div>
          <div className="p-5">
            {renderPieChart()}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-5 lg:grid-cols-3">
        <div className="lg:col-span-2 bg-white overflow-hidden shadow rounded-lg">
          <div className="px-5 py-4 border-b border-gray-200">
            <h3 className="text-lg font-medium text-gray-900">Recent Transactions</h3>
          </div>
          <div className="p-5">
            <div className="flow-root">
              <ul className="-my-5 divide-y divide-gray-200">
                {summary.recentTransactions.map((transaction) => (
                  <li key={transaction.id} className="py-4">
                    <div className="flex items-center space-x-4">
                      <div className="flex-shrink-0">
                        <span className={`inline-flex items-center justify-center h-8 w-8 rounded-full ${
                          transaction.type === 'income' ? 'bg-green-100' : 'bg-red-100'
                        }`}>
                          {transaction.type === 'income' ? (
                            <TrendingUp className="h-4 w-4 text-green-600" />
                          ) : (
                            <TrendingDown className="h-4 w-4 text-red-600" />
                          )}
                        </span>
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-gray-900 truncate">
                          {transaction.description}
                        </p>
                        <p className="text-sm text-gray-500 truncate">
                          {format(new Date(transaction.date), 'MMM d, yyyy')}
                        </p>
                      </div>
                      <div>
                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                          transaction.type === 'income' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                        }`}>
                          {transaction.type === 'income' ? '+' : '-'}${transaction.amount.toFixed(2)}
                        </span>
                      </div>
                    </div>
                  </li>
                ))}
              </ul>
            </div>
            <div className="mt-6">
              <a href="#" className="w-full flex justify-center items-center px-4 py-2 border border-gray-300 shadow-sm text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50">
                View all
              </a>
            </div>
          </div>
        </div>

        <div className="bg-white overflow-hidden shadow rounded-lg">
          <div className="px-5 py-4 border-b border-gray-200">
            <h3 className="text-lg font-medium text-gray-900">Upcoming Payments</h3>
          </div>
          <div className="p-5">
            <div className="flow-root">
              <ul className="-my-5 divide-y divide-gray-200">
                {summary.upcomingPayments.length === 0 ? (
                  <li className="py-4 text-center text-sm text-gray-500">
                    No upcoming payments
                  </li>
                ) : (
                  summary.upcomingPayments.map((payment, index) => (
                    <li key={index} className="py-4">
                      <div className="flex items-center space-x-4">
                        <div className="flex-shrink-0">
                          <Calendar className="h-5 w-5 text-gray-400" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-gray-900 truncate">
                            {payment.clientName}
                          </p>
                          <p className="text-sm text-gray-500 truncate">
                            {payment.projectName}
                          </p>
                        </div>
                        <div className="flex flex-col items-end">
                          <span className="text-sm font-medium text-gray-900">
                            ${payment.amount.toFixed(2)}
                          </span>
                          <span className="text-xs text-gray-500">
                            Due {format(new Date(payment.dueDate), 'MMM d')}
                          </span>
                        </div>
                      </div>
                    </li>
                  ))
                )}
              </ul>
            </div>
            <div className="mt-6">
              <a href="#" className="w-full flex justify-center items-center px-4 py-2 border border-gray-300 shadow-sm text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50">
                View all
              </a>
            </div>
          </div>
        </div>
      </div>

      <div className="bg-white overflow-hidden shadow rounded-lg">
        <div className="px-5 py-4 border-b border-gray-200">
          <h3 className="text-lg font-medium text-gray-900">AI Financial Insights</h3>
        </div>
        <div className="p-5">
          <div className="space-y-4">
            <div className="bg-blue-50 border-l-4 border-blue-400 p-4">
              <div className="flex">
                <div className="flex-shrink-0">
                  <TrendingUp className="h-5 w-5 text-blue-400" />
                </div>
                <div className="ml-3">
                  <p className="text-sm text-blue-700">
                    <span className="font-medium">Cash Flow Prediction:</span> Based on your current revenue and expense patterns, you're projected to have a positive cash flow of approximately $12,500 next month.
                  </p>
                </div>
              </div>
            </div>
            
            <div className="bg-yellow-50 border-l-4 border-yellow-400 p-4">
              <div className="flex">
                <div className="flex-shrink-0">
                  <AlertCircle className="h-5 w-5 text-yellow-400" />
                </div>
                <div className="ml-3">
                  <p className="text-sm text-yellow-700">
                    <span className="font-medium">Budget Alert:</span> No active projects to monitor.
                  </p>
                </div>
              </div>
            </div>
            
            <div className="bg-green-50 border-l-4 border-green-400 p-4">
              <div className="flex">
                <div className="flex-shrink-0">
                  <TrendingUp className="h-5 w-5 text-green-400" />
                </div>
                <div className="ml-3">
                  <p className="text-sm text-green-700">
                    <span className="font-medium">Profit Opportunity:</span> Your bathroom renovation projects have a 35% higher profit margin than your kitchen projects. Consider focusing marketing efforts on bathroom renovations.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default FinanceDashboard;