import { useState } from 'react';
import { DollarSign, AlertCircle, TrendingUp, TrendingDown, Edit, Plus } from 'lucide-react';

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

interface BudgetTrackerProps {
  projects: Project[];
  budgetItems: BudgetItem[];
  onAddBudgetItem: (item: Omit<BudgetItem, 'id' | 'variance' | 'variancePercentage'>) => void;
  onUpdateBudgetItem: (item: BudgetItem) => void;
  onDeleteBudgetItem: (id: string) => void;
}

const BudgetTracker: React.FC<BudgetTrackerProps> = ({
  projects,
  budgetItems,
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

  const selectedProject = projects.find(p => p.id === selectedProjectId);
  const projectBudgetItems = budgetItems.filter(item => item.projectId === selectedProjectId);

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
          <h3 className="text-lg font-medium text-gray-900">Budget Tracker - UPDATED CATEGORIES</h3>
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
            <button
              onClick={() => setShowAddForm(true)}
              className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
            >
              <Plus className="h-4 w-4 mr-2" />
              Add Budget Item
            </button>
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
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div>
              <p className="text-sm font-medium text-gray-500">Total Budget</p>
              <p className="mt-1 text-2xl font-semibold text-gray-900">${selectedProject.totalBudget.toLocaleString()}</p>
            </div>
            <div>
              <p className="text-sm font-medium text-gray-500">Total Actual</p>
              <p className="mt-1 text-2xl font-semibold text-gray-900">${selectedProject.totalActual.toLocaleString()}</p>
            </div>
            <div>
              <p className="text-sm font-medium text-gray-500">Variance</p>
              <div className="mt-1 flex items-center">
                <p className={`text-2xl font-semibold ${getVarianceColor(selectedProject.variance)}`}>
                  ${Math.abs(selectedProject.variance).toLocaleString()}
                </p>
                <div className="ml-2 flex items-center">
                  {getVarianceIcon(selectedProject.variance)}
                  <span className={`ml-1 text-sm font-medium ${getVarianceColor(selectedProject.variance)}`}>
                    {selectedProject.variance >= 0 ? 'Under' : 'Over'} budget ({Math.abs(selectedProject.variancePercentage).toFixed(1)}%)
                  </span>
                </div>
              </div>
            </div>
          </div>
          
          <div className="mt-4">
            {renderProgressBar(selectedProject.totalActual, selectedProject.totalBudget)}
          </div>
        </div>
      )}

      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Category
              </th>
              <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Budgeted
              </th>
              <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Actual
              </th>
              <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Variance
              </th>
              <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Progress
              </th>
              <th scope="col" className="relative px-6 py-3">
                <span className="sr-only">Actions</span>
              </th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {categorySummary.length === 0 ? (
              <tr>
                <td colSpan={6} className="px-6 py-4 text-center text-sm text-gray-500">
                  No budget items for this project
                </td>
              </tr>
            ) : (
              categorySummary.map((categoryData) => (
                <tr key={categoryData.category} className="hover:bg-gray-50">
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center space-x-3">
                      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                        {categoryData.category}
                      </span>
                      <span className="text-sm text-gray-500">
                        ({categoryData.itemCount} item{categoryData.itemCount !== 1 ? 's' : ''})
                      </span>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                    ${categoryData.totalBudgeted.toFixed(2)}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center">
                      <span className="text-sm font-medium text-gray-900 mr-2">
                        ${categoryData.totalActual.toFixed(2)}
                      </span>
                      <button 
                        className="text-gray-400 hover:text-gray-600"
                        title="Update actual amount"
                      >
                        <Edit className="h-4 w-4" />
                      </button>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center">
                      {getVarianceIcon(categoryData.totalVariance)}
                      <span className={`ml-1 text-sm font-medium ${getVarianceColor(categoryData.totalVariance)}`}>
                        ${Math.abs(categoryData.totalVariance).toFixed(2)} ({Math.abs(categoryData.totalVariancePercentage).toFixed(1)}%)
                      </span>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <div className="w-full">
                      {renderProgressBar(categoryData.totalActual, categoryData.totalBudgeted)}
                      <div className="mt-1 text-xs text-gray-500">
                        {Math.round((categoryData.totalActual / categoryData.totalBudgeted) * 100)}% of budget
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                    <div className="flex items-center space-x-2">
                      <button className="text-blue-600 hover:text-blue-900">
                        <Edit className="h-4 w-4" />
                      </button>
                      <button 
                        onClick={() => {
                          // Find all items in this category and delete them
                          const itemsToDelete = projectBudgetItems.filter(item => item.category === categoryData.category);
                          itemsToDelete.forEach(item => onDeleteBudgetItem(item.id));
                        }}
                        className="text-red-600 hover:text-red-900"
                        title="Delete all items in this category"
                      >
                        <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                        </svg>
                      </button>
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
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