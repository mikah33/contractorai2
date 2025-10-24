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
            <div className="grid grid-cols-3 gap-3">
              <div className="flex flex-col p-4 bg-red-50 rounded-lg border border-red-200 min-h-[100px]">
                <div className="flex items-center gap-2 text-red-700 mb-2">
                  <TrendingDown className="w-4 h-4 flex-shrink-0" />
                  <span className="text-xs font-medium whitespace-nowrap">Total Expenses</span>
                </div>
                <div className="text-2xl font-bold text-red-900 mt-auto">
                  {formatCurrency(totalAmount)}
                </div>
              </div>

              <div className="flex flex-col p-4 bg-blue-50 rounded-lg border border-blue-200 min-h-[100px]">
                <div className="flex items-center gap-2 text-blue-700 mb-2">
                  <Receipt className="w-4 h-4 flex-shrink-0" />
                  <span className="text-xs font-medium whitespace-nowrap">Transactions</span>
                </div>
                <div className="text-2xl font-bold text-blue-900 mt-auto">
                  {expensesToShow.length}
                </div>
              </div>

              <div className="flex flex-col p-4 bg-green-50 rounded-lg border border-green-200 min-h-[100px]">
                <div className="flex items-center gap-2 text-green-700 mb-2">
                  <Calendar className="w-4 h-4 flex-shrink-0" />
                  <span className="text-xs font-medium whitespace-nowrap">This Session</span>
                </div>
                <div className="text-2xl font-bold text-green-900 mt-auto">
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
          /* List View - Cleaner card-based design */
          <div className="space-y-3">
            {/* Filter & Total Header */}
            <div className="bg-gradient-to-r from-gray-50 to-gray-100 p-4 rounded-xl border border-gray-200">
              <div className="flex items-center gap-2 mb-3">
                <Filter className="w-4 h-4 text-gray-600" />
                <select
                  value={categoryFilter}
                  onChange={(e) => setCategoryFilter(e.target.value)}
                  className="flex-1 px-3 py-2 bg-white border border-gray-300 rounded-lg text-sm font-medium text-gray-700 focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent"
                >
                  <option value="">All Categories</option>
                  {categories.map(cat => (
                    <option key={cat} value={cat}>{cat}</option>
                  ))}
                </select>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm font-semibold text-gray-600">Total Expenses:</span>
                <span className="text-2xl font-bold text-red-600">{formatCurrency(totalAmount)}</span>
              </div>
              <div className="text-xs text-gray-500 mt-1">
                {expensesToShow.length} {expensesToShow.length === 1 ? 'transaction' : 'transactions'}
              </div>
            </div>

            {/* Expenses List - Clean cards */}
            <div className="space-y-2 max-h-[500px] overflow-y-auto">
              {expensesToShow.length === 0 ? (
                <div className="text-center py-12 bg-gray-50 rounded-xl border-2 border-dashed border-gray-300">
                  <Receipt className="mx-auto h-12 w-12 text-gray-400" />
                  <h3 className="mt-2 text-sm font-semibold text-gray-900">No expenses yet</h3>
                  <p className="mt-1 text-sm text-gray-500">
                    {activeTab === 'session'
                      ? 'Start adding expenses by chatting with Saul'
                      : 'No expenses found for this period'}
                  </p>
                </div>
              ) : (
                expensesToShow.map((expense) => (
                  <div
                    key={expense.id}
                    className="bg-white p-4 rounded-xl border border-gray-200 hover:border-gray-300 hover:shadow-sm transition-all"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <span className="text-sm font-semibold text-gray-900 truncate">
                            {expense.vendor}
                          </span>
                          {new Date(expense.created_at) >= sessionStartTime && (
                            <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold bg-green-100 text-green-700 border border-green-200">
                              NEW
                            </span>
                          )}
                        </div>
                        {expense.notes && (
                          <p className="text-xs text-gray-600 mb-2 line-clamp-2">{expense.notes}</p>
                        )}
                        <div className="flex items-center gap-2">
                          <span className="inline-flex items-center px-2.5 py-1 rounded-lg text-xs font-medium bg-blue-50 text-blue-700 border border-blue-100">
                            {expense.category}
                          </span>
                          <span className="text-xs text-gray-500">
                            {format(new Date(expense.date), 'MMM d, yyyy')}
                          </span>
                        </div>
                      </div>
                      <div className="flex-shrink-0 text-right">
                        <div className="text-lg font-bold text-red-600">
                          {formatCurrency(parseFloat(expense.amount.toString()))}
                        </div>
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default SaulExpenseDashboard;
