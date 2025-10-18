import { useState, useMemo } from 'react';
import { DollarSign, AlertCircle, TrendingUp, TrendingDown, Receipt as ReceiptIcon, CreditCard } from 'lucide-react';

interface BudgetItem {
  id: string;
  projectId: string;
  category: string;
  budgetedAmount: number;
  actualAmount: number;
  variance: number;
  variancePercentage: number;
  name?: string; // Optional name for the budget item
}

interface Project {
  id: string;
  name: string;
  totalBudget: number;
  totalActual: number;
  variance: number;
  variancePercentage: number;
}

interface Receipt {
  id: string;
  projectId?: string;
  amount: number;
  category: string;
  date: string;
  vendor: string;
}

interface Payment {
  id: string;
  projectId: string;
  amount: number;
  date: string;
}

interface BudgetTrackerProps {
  projects: Project[];
  budgetItems: BudgetItem[];
  receipts: Receipt[];
  payments: Payment[];
  onAddBudgetItem: (item: Omit<BudgetItem, 'id' | 'variance' | 'variancePercentage'>) => void;
  onUpdateBudgetItem: (item: BudgetItem) => void;
  onDeleteBudgetItem: (id: string) => void;
}

const BudgetTracker: React.FC<BudgetTrackerProps> = ({
  projects,
  budgetItems,
  receipts,
  payments,
  onAddBudgetItem,
  onUpdateBudgetItem,
  onDeleteBudgetItem
}) => {
  const [selectedProjectId, setSelectedProjectId] = useState<string>(projects[0]?.id || '');
  const [showAddForm, setShowAddForm] = useState(false);
  const [formData, setFormData] = useState<{
    projectId: string;
    category: string;
    name: string;
    budgetedAmount: number;
    actualAmount: number;
  }>({
    projectId: selectedProjectId,
    category: '',
    name: '',
    budgetedAmount: 0,
    actualAmount: 0
  });

  const categories = [
    'Labor', 'Materials', 'Subcontractors', 'Equipment Rental',
    'Tools', 'Permits', 'Office Supplies', 'Travel', 'Other'
  ];

  // Calculate actual expenses from receipts for this project
  const projectReceipts = useMemo(() =>
    receipts.filter(r => r.projectId === selectedProjectId),
    [receipts, selectedProjectId]
  );

  const projectPayments = useMemo(() =>
    payments.filter(p => p.projectId === selectedProjectId),
    [payments, selectedProjectId]
  );

  const totalExpenses = useMemo(() =>
    projectReceipts.reduce((sum, r) => sum + r.amount, 0),
    [projectReceipts]
  );

  const totalPaymentsReceived = useMemo(() =>
    projectPayments.reduce((sum, p) => sum + p.amount, 0),
    [projectPayments]
  );

  const selectedProject = projects.find(p => p.id === selectedProjectId);
  const projectBudgetItems = budgetItems.filter(item => item.projectId === selectedProjectId);

  // Group receipts by category to show actual spending
  const expensesByCategory = useMemo(() => {
    const categoryMap = new Map<string, { total: number; count: number; receipts: Receipt[] }>();

    projectReceipts.forEach(receipt => {
      const category = receipt.category || 'Other';
      const existing = categoryMap.get(category) || { total: 0, count: 0, receipts: [] };
      categoryMap.set(category, {
        total: existing.total + receipt.amount,
        count: existing.count + 1,
        receipts: [...existing.receipts, receipt]
      });
    });

    return Array.from(categoryMap.entries()).map(([category, data]) => ({
      category,
      totalActual: data.total,
      receiptCount: data.count,
      receipts: data.receipts
    }));
  }, [projectReceipts]);

  // Group budget items by category and calculate totals
  const categoryTotals = projectBudgetItems.reduce((acc, item) => {
    if (!acc[item.category]) {
      acc[item.category] = {
        category: item.category,
        totalBudgeted: 0,
        totalActual: 0,
        itemCount: 0
      };
    }
    acc[item.category].totalBudgeted += item.budgetedAmount;
    acc[item.category].totalActual += item.actualAmount;
    acc[item.category].itemCount += 1;
    return acc;
  }, {} as Record<string, { category: string; totalBudgeted: number; totalActual: number; itemCount: number }>);

  // Convert to array and calculate variance
  const categorySummary = Object.values(categoryTotals).map(cat => {
    const totalVariance = cat.totalBudgeted - cat.totalActual;
    const totalVariancePercentage = cat.totalBudgeted > 0 ? (totalVariance / cat.totalBudgeted) * 100 : 0;

    return {
      category: cat.category,
      totalBudgeted: cat.totalBudgeted,
      totalActual: cat.totalActual,
      totalVariance,
      totalVariancePercentage,
      itemCount: cat.itemCount
    };
  });



  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onAddBudgetItem(formData);
    setShowAddForm(false);
    setFormData({
      projectId: selectedProjectId,
      category: '',
      name: '',
      budgetedAmount: 0,
      actualAmount: 0
    });
  };

  const handleUpdateActual = (item: BudgetItem, newActualAmount: number) => {
    onUpdateBudgetItem({
      ...item,
      actualAmount: newActualAmount,
      variance: item.budgetedAmount - newActualAmount,
      variancePercentage: ((item.budgetedAmount - newActualAmount) / item.budgetedAmount) * 100
    });
  };

  const getVarianceColor = (variance: number) => {
    return variance >= 0 ? 'text-green-600' : 'text-red-600';
  };

  const getVarianceIcon = (variance: number) => {
    return variance >= 0 ? (
      <TrendingUp className="h-4 w-4 text-green-500" />
    ) : (
      <TrendingDown className="h-4 w-4 text-red-500" />
    );
  };

  const renderProgressBar = (actual: number, budgeted: number) => {
    const percentage = Math.min(Math.round((actual / budgeted) * 100), 100);
    const isOverBudget = actual > budgeted;
    
    return (
      <div className="w-full bg-gray-200 rounded-full h-2.5">
        <div 
          className={`h-2.5 rounded-full ${isOverBudget ? 'bg-red-500' : 'bg-blue-500'}`}
          style={{ width: `${percentage}%` }}
        ></div>
      </div>
    );
  };

  return (
    <div className="bg-white rounded-lg shadow-md">
      <div className="p-6 border-b border-gray-200">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <h3 className="text-lg font-medium text-gray-900">Project Budget Tracker</h3>
          <div className="flex items-center space-x-2">
            <select
              value={selectedProjectId}
              onChange={(e) => {
                setSelectedProjectId(e.target.value);
                setFormData(prev => ({ ...prev, projectId: e.target.value }));
              }}
              className="block pl-3 pr-10 py-2 text-base border-gray-300 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm rounded-md"
            >
              {projects.map(project => (
                <option key={project.id} value={project.id}>{project.name}</option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {showAddForm && (
        <div className="p-6 border-b border-gray-200 bg-gray-50">
          <form onSubmit={handleSubmit}>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-medium text-gray-700">Item Name</label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) => setFormData({...formData, name: e.target.value})}
                  placeholder="e.g., Framing Labor, Concrete Materials"
                  required
                  className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                />
                <p className="mt-1 text-xs text-gray-500">
                  This will be added to the selected category total
                </p>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">Category</label>
                <select
                  value={formData.category}
                  onChange={(e) => setFormData({...formData, category: e.target.value})}
                  required
                  className="mt-1 block w-full pl-3 pr-10 py-2 text-base border-gray-300 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm rounded-md"
                >
                  <option value="">Select Category</option>
                  {categories.map(category => (
                    <option key={category} value={category}>{category}</option>
                  ))}
                </select>
              </div>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-6">

              <div>
                <label className="block text-sm font-medium text-gray-700">Budgeted Amount ($)</label>
                <div className="mt-1 relative rounded-md shadow-sm">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <DollarSign className="h-5 w-5 text-gray-400" />
                  </div>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    value={formData.budgetedAmount}
                    onChange={(e) => setFormData({...formData, budgetedAmount: parseFloat(e.target.value)})}
                    required
                    className="block w-full pl-10 pr-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700">Actual Amount ($)</label>
                <div className="mt-1 relative rounded-md shadow-sm">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <DollarSign className="h-5 w-5 text-gray-400" />
                  </div>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    value={formData.actualAmount}
                    onChange={(e) => setFormData({...formData, actualAmount: parseFloat(e.target.value)})}
                    required
                    className="block w-full pl-10 pr-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                  />
                </div>
              </div>
            </div>

            <div className="mt-6 flex justify-end space-x-3">
              <button
                type="button"
                onClick={() => setShowAddForm(false)}
                className="inline-flex items-center px-4 py-2 border border-gray-300 shadow-sm text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="inline-flex items-center px-4 py-2 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
              >
                Add Budget Item
              </button>
            </div>
          </form>
        </div>
      )}

      {selectedProject && (
        <div className="p-6 border-b border-gray-200 bg-blue-50">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            <div>
              <div className="flex items-center">
                <DollarSign className="h-5 w-5 text-gray-400 mr-2" />
                <p className="text-sm font-medium text-gray-500">Total Budget</p>
              </div>
              <p className="mt-1 text-2xl font-semibold text-gray-900">${selectedProject.totalBudget.toLocaleString()}</p>
            </div>
            <div>
              <div className="flex items-center">
                <ReceiptIcon className="h-5 w-5 text-red-400 mr-2" />
                <p className="text-sm font-medium text-gray-500">Total Expenses</p>
              </div>
              <p className="mt-1 text-2xl font-semibold text-red-600">${totalExpenses.toLocaleString()}</p>
              <p className="text-xs text-gray-500 mt-1">{projectReceipts.length} receipts</p>
            </div>
            <div>
              <div className="flex items-center">
                <CreditCard className="h-5 w-5 text-green-400 mr-2" />
                <p className="text-sm font-medium text-gray-500">Payments Received</p>
              </div>
              <p className="mt-1 text-2xl font-semibold text-green-600">${totalPaymentsReceived.toLocaleString()}</p>
              <p className="text-xs text-gray-500 mt-1">{projectPayments.length} payments</p>
            </div>
            <div>
              <div className="flex items-center">
                <TrendingUp className="h-5 w-5 text-blue-400 mr-2" />
                <p className="text-sm font-medium text-gray-500">Net Position</p>
              </div>
              <p className={`mt-1 text-2xl font-semibold ${totalPaymentsReceived - totalExpenses >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                ${Math.abs(totalPaymentsReceived - totalExpenses).toLocaleString()}
              </p>
              <p className="text-xs text-gray-500 mt-1">
                {totalPaymentsReceived - totalExpenses >= 0 ? 'Profit' : 'Loss'}
              </p>
            </div>
          </div>

          <div className="mt-4">
            <p className="text-sm text-gray-600 mb-2">Budget Usage: {selectedProject.totalBudget > 0 ? ((totalExpenses / selectedProject.totalBudget) * 100).toFixed(1) : 0}%</p>
            {renderProgressBar(totalExpenses, selectedProject.totalBudget)}
          </div>
        </div>
      )}

      <div>
        <h4 className="px-6 py-4 text-md font-semibold text-gray-700">Expenses by Category</h4>
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Category
              </th>
              <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Total Spent
              </th>
              <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Receipts
              </th>
              <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                % of Budget
              </th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {expensesByCategory.length === 0 ? (
              <tr>
                <td colSpan={4} className="px-6 py-4 text-center text-sm text-gray-500">
                  No expenses recorded for this project yet
                </td>
              </tr>
            ) : (
              expensesByCategory.map((categoryData) => (
                <tr key={categoryData.category} className="hover:bg-gray-50">
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center space-x-3">
                      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                        {categoryData.category}
                      </span>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                    ${categoryData.totalActual.toFixed(2)}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {categoryData.receiptCount} receipt{categoryData.receiptCount !== 1 ? 's' : ''}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {selectedProject && selectedProject.totalBudget > 0
                      ? ((categoryData.totalActual / selectedProject.totalBudget) * 100).toFixed(1)
                      : 0}%
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
        </div>
      </div>

      {selectedProject && selectedProject.totalActual > selectedProject.totalBudget && (
        <div className="p-4 bg-red-50 border-t border-red-200">
          <div className="flex">
            <div className="flex-shrink-0">
              <AlertCircle className="h-5 w-5 text-red-400" />
            </div>
            <div className="ml-3">
              <h3 className="text-sm font-medium text-red-800">Budget Alert</h3>
              <div className="mt-2 text-sm text-red-700">
                <p>
                  This project is currently ${Math.abs(selectedProject.variance).toLocaleString()} ({Math.abs(selectedProject.variancePercentage).toFixed(1)}%) over budget. 
                  Consider reviewing expenses or adjusting the budget.
                </p>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default BudgetTracker;