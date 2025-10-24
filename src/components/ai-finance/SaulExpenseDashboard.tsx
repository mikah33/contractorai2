import React, { useState, useEffect } from 'react';
import { Receipt, TrendingDown, Calendar, DollarSign, Filter, RefreshCw } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { format } from 'date-fns';

interface Expense {
  id: string;
  vendor: string;
  date: string;
  amount: number;
  category: string;
  notes?: string;
  status: string;
  created_at: string;
}

interface SaulExpenseDashboardProps {
  sessionStartTime: Date;
  onRefresh?: () => void;
}

export const SaulExpenseDashboard: React.FC<SaulExpenseDashboardProps> = ({
  sessionStartTime,
  onRefresh
}) => {
  const [allExpenses, setAllExpenses] = useState<Expense[]>([]);
  const [sessionExpenses, setSessionExpenses] = useState<Expense[]>([]);
  const [activeTab, setActiveTab] = useState<'session' | 'all' | 'dashboard'>('session');
  const [isLoading, setIsLoading] = useState(false);
  const [categoryFilter, setCategoryFilter] = useState<string>('');

  const fetchExpenses = async () => {
    setIsLoading(true);
    try {
      const { data, error } = await supabase
        .from('finance_expenses')
        .select('*')
        .order('date', { ascending: false })
        .limit(50);

      if (error) throw error;

      setAllExpenses(data || []);

      // Filter expenses from current session
      const sessionExp = (data || []).filter(exp =>
        new Date(exp.created_at) >= sessionStartTime
      );
      setSessionExpenses(sessionExp);
    } catch (error) {
      console.error('Error fetching expenses:', error);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchExpenses();
  }, []);

  const handleRefresh = () => {
    fetchExpenses();
    onRefresh?.();
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD'
    }).format(amount);
  };

  const getExpensesToShow = () => {
    const expenses = activeTab === 'session' ? sessionExpenses : allExpenses;
    if (categoryFilter) {
      return expenses.filter(e => e.category === categoryFilter);
    }
    return expenses;
  };

  const expensesToShow = getExpensesToShow();
  const totalAmount = expensesToShow.reduce((sum, exp) => sum + parseFloat(exp.amount.toString()), 0);

  const categories = [...new Set(allExpenses.map(e => e.category))];
  const categoryTotals = categories.map(cat => ({
    category: cat,
    total: allExpenses
      .filter(e => e.category === cat)
      .reduce((sum, e) => sum + parseFloat(e.amount.toString()), 0)
  })).sort((a, b) => b.total - a.total);

  return (
    <div className="bg-white rounded-lg shadow-lg">
      {/* Header */}
      <div className="p-4 border-b border-gray-200 bg-gradient-to-r from-green-500 to-green-600">
        <div className="flex items-center justify-between text-white">
          <div className="flex items-center gap-2">
            <Receipt className="w-5 h-5" />
            <h3 className="font-bold">Expense Dashboard</h3>
          </div>
          <button
            onClick={handleRefresh}
            disabled={isLoading}
            className="p-2 hover:bg-green-600 rounded-lg transition-colors"
            title="Refresh"
          >
            <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-gray-200">
        <button
          onClick={() => setActiveTab('session')}
          className={`flex-1 px-4 py-3 text-sm font-medium ${
            activeTab === 'session'
              ? 'border-b-2 border-green-500 text-green-600'
              : 'text-gray-500 hover:text-gray-700'
          }`}
        >
          Session ({sessionExpenses.length})
        </button>
        <button
          onClick={() => setActiveTab('all')}
          className={`flex-1 px-4 py-3 text-sm font-medium ${
            activeTab === 'all'
              ? 'border-b-2 border-green-500 text-green-600'
              : 'text-gray-500 hover:text-gray-700'
          }`}
        >
          All ({allExpenses.length})
        </button>
        <button
          onClick={() => setActiveTab('dashboard')}
          className={`flex-1 px-4 py-3 text-sm font-medium ${
            activeTab === 'dashboard'
              ? 'border-b-2 border-green-500 text-green-600'
              : 'text-gray-500 hover:text-gray-700'
          }`}
        >
          Dashboard
        </button>
      </div>

      {/* Content */}
      <div className="p-4">
        {activeTab === 'dashboard' ? (
          /* Dashboard View */
          <div className="space-y-4">
            {/* Stats Cards */}
            <div className="grid grid-cols-3 gap-4">
              <div className="p-4 bg-red-50 rounded-lg border border-red-200">
                <div className="flex items-center gap-2 text-red-700 mb-1">
                  <TrendingDown className="w-4 h-4" />
                  <span className="text-xs font-medium">Total Expenses</span>
                </div>
                <div className="text-xl font-bold text-red-900">
                  {formatCurrency(totalAmount)}
                </div>
              </div>

              <div className="p-4 bg-blue-50 rounded-lg border border-blue-200">
                <div className="flex items-center gap-2 text-blue-700 mb-1">
                  <Receipt className="w-4 h-4" />
                  <span className="text-xs font-medium">Transactions</span>
                </div>
                <div className="text-xl font-bold text-blue-900">
                  {expensesToShow.length}
                </div>
              </div>

              <div className="p-4 bg-green-50 rounded-lg border border-green-200">
                <div className="flex items-center gap-2 text-green-700 mb-1">
                  <Calendar className="w-4 h-4" />
                  <span className="text-xs font-medium">This Session</span>
                </div>
                <div className="text-xl font-bold text-green-900">
                  {sessionExpenses.length}
                </div>
              </div>
            </div>

            {/* Category Breakdown */}
            <div>
              <h4 className="text-sm font-semibold text-gray-700 mb-3">By Category</h4>
              <div className="space-y-2">
                {categoryTotals.map(({ category, total }) => {
                  const percentage = (total / totalAmount) * 100;
                  return (
                    <div key={category} className="flex items-center gap-3">
                      <div className="flex-1">
                        <div className="flex justify-between text-sm mb-1">
                          <span className="font-medium text-gray-700">{category}</span>
                          <span className="text-gray-600">{formatCurrency(total)}</span>
                        </div>
                        <div className="w-full bg-gray-200 rounded-full h-2">
                          <div
                            className="bg-green-500 h-2 rounded-full"
                            style={{ width: `${percentage}%` }}
                          />
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        ) : (
          /* Table View */
          <div className="space-y-4">
            {/* Filter */}
            <div className="flex items-center gap-2">
              <Filter className="w-4 h-4 text-gray-500" />
              <select
                value={categoryFilter}
                onChange={(e) => setCategoryFilter(e.target.value)}
                className="flex-1 px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-green-500"
              >
                <option value="">All Categories</option>
                {categories.map(cat => (
                  <option key={cat} value={cat}>{cat}</option>
                ))}
              </select>
            </div>

            {/* Total */}
            <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
              <span className="text-sm font-medium text-gray-700">Total:</span>
              <span className="text-lg font-bold text-gray-900">{formatCurrency(totalAmount)}</span>
            </div>

            {/* Expenses Table */}
            <div className="overflow-hidden border border-gray-200 rounded-lg">
              <div className="overflow-x-auto max-h-[400px] overflow-y-auto">
                {expensesToShow.length === 0 ? (
                  <div className="text-center py-12">
                    <Receipt className="mx-auto h-12 w-12 text-gray-400" />
                    <h3 className="mt-2 text-sm font-medium text-gray-900">No expenses</h3>
                    <p className="mt-1 text-sm text-gray-500">
                      {activeTab === 'session'
                        ? 'Add expenses by chatting with Saul'
                        : 'No expenses found'}
                    </p>
                  </div>
                ) : (
                  <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50 sticky top-0">
                      <tr>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Date</th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Vendor</th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Category</th>
                        <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">Amount</th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                      {expensesToShow.map((expense) => (
                        <tr key={expense.id} className="hover:bg-gray-50">
                          <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-900">
                            {format(new Date(expense.date), 'MMM d, yyyy')}
                            {new Date(expense.created_at) >= sessionStartTime && (
                              <span className="ml-2 inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-green-100 text-green-800">
                                New
                              </span>
                            )}
                          </td>
                          <td className="px-4 py-3 text-sm">
                            <div className="font-medium text-gray-900">{expense.vendor}</div>
                            {expense.notes && (
                              <div className="text-xs text-gray-500 truncate max-w-xs">{expense.notes}</div>
                            )}
                          </td>
                          <td className="px-4 py-3 whitespace-nowrap">
                            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                              {expense.category}
                            </span>
                          </td>
                          <td className="px-4 py-3 whitespace-nowrap text-sm font-medium text-gray-900 text-right">
                            {formatCurrency(parseFloat(expense.amount.toString()))}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default SaulExpenseDashboard;
