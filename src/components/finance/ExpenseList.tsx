import { useState } from 'react';
import { Search, Filter, Download, Edit, Trash, Tag, FileText, ChevronDown, ChevronUp, Receipt, Package, MapPin, Phone } from 'lucide-react';
import { format } from 'date-fns';
import EditExpenseModal from './EditExpenseModal';

interface LineItem {
  description: string;
  quantity: number;
  unitPrice: number;
  totalAmount: number;
}

interface ExpenseMetadata {
  receiptNumber?: string;
  taxAmount?: number;
  subtotal?: number;
  supplierAddress?: string;
  supplierPhone?: string;
  lineItems?: LineItem[];
  confidence?: {
    vendor?: number;
    amount?: number;
    date?: number;
    overall?: number;
  };
  source?: string;
}

interface Expense {
  id: string;
  vendor: string;
  date: string;
  amount: number;
  category: string;
  projectId?: string;
  notes?: string;
  imageUrl?: string;
  status: 'pending' | 'processed' | 'verified';
  isRecurring?: boolean;
  recurringInterval?: 'weekly' | 'monthly' | 'quarterly' | 'yearly';
  metadata?: ExpenseMetadata;
}

interface ExpenseListProps {
  expenses: Expense[];
  projects: { id: string; name: string }[];
  onEdit: (expense: Expense) => void;
  onDelete: (id: string) => void;
  onExport: (format: 'csv' | 'pdf') => void;
}

const ExpenseList: React.FC<ExpenseListProps> = ({
  expenses,
  projects,
  onEdit,
  onDelete,
  onExport
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [categoryFilter, setCategoryFilter] = useState<string>('');
  const [projectFilter, setProjectFilter] = useState<string>('');
  const [dateRange, setDateRange] = useState<{start: string, end: string}>({
    start: '',
    end: ''
  });
  const [sortField, setSortField] = useState<keyof Expense>('date');
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('desc');
  const [expandedRow, setExpandedRow] = useState<string | null>(null);
  const [editingExpense, setEditingExpense] = useState<Expense | null>(null);

  const categories = [...new Set(expenses.map(expense => expense.category))];

  const handleSort = (field: keyof Expense) => {
    if (sortField === field) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortDirection('asc');
    }
  };

  const filteredExpenses = expenses
    .filter(expense => {
      // Search term filter
      const searchLower = searchTerm.toLowerCase();
      if (searchTerm && !expense.vendor.toLowerCase().includes(searchLower) && 
          !expense.notes?.toLowerCase().includes(searchLower)) {
        return false;
      }
      
      // Category filter
      if (categoryFilter && expense.category !== categoryFilter) {
        return false;
      }
      
      // Project filter
      if (projectFilter && expense.projectId !== projectFilter) {
        return false;
      }
      
      // Date range filter
      if (dateRange.start && new Date(expense.date) < new Date(dateRange.start)) {
        return false;
      }
      
      if (dateRange.end && new Date(expense.date) > new Date(dateRange.end)) {
        return false;
      }
      
      return true;
    })
    .sort((a, b) => {
      if (sortField === 'amount') {
        return sortDirection === 'asc' ? a.amount - b.amount : b.amount - a.amount;
      } else if (sortField === 'date') {
        return sortDirection === 'asc' 
          ? new Date(a.date).getTime() - new Date(b.date).getTime()
          : new Date(b.date).getTime() - new Date(a.date).getTime();
      } else {
        const aValue = a[sortField]?.toString() || '';
        const bValue = b[sortField]?.toString() || '';
        return sortDirection === 'asc' 
          ? aValue.localeCompare(bValue)
          : bValue.localeCompare(aValue);
      }
    });

  const getProjectName = (projectId?: string) => {
    if (!projectId) return 'Unassigned';
    
    // Handle Revenue Tracker project specially
    const revenueTrackerProject = projects.find(p => p.name === 'Revenue Tracker');
    if (revenueTrackerProject && projectId === revenueTrackerProject.id) {
      return '📊 Revenue Tracker';
    }
    
    const project = projects.find(p => p.id === projectId);
    return project ? project.name : 'Unknown Project';
  };

  const getSortIcon = (field: keyof Expense) => {
    if (sortField !== field) return null;
    return sortDirection === 'asc' ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />;
  };

  return (
    <>
      {editingExpense && (
        <EditExpenseModal
          expense={editingExpense}
          projects={projects}
          onSave={onEdit}
          onClose={() => setEditingExpense(null)}
        />
      )}

      <div className="bg-white rounded-lg shadow-md">
      <div className="p-6 border-b border-gray-200">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div className="flex-1 min-w-0">
            <div className="relative rounded-md shadow-sm">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <Search className="h-5 w-5 text-gray-400" />
              </div>
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="block w-full pl-10 pr-3 py-2 border border-gray-300 rounded-md leading-5 bg-white placeholder-gray-500 focus:outline-none focus:placeholder-gray-400 focus:ring-1 focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                placeholder="Search expenses..."
              />
            </div>
          </div>
          <div className="flex items-center space-x-2">
            <button 
              onClick={() => onExport('csv')}
              className="inline-flex items-center px-3 py-2 border border-gray-300 shadow-sm text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
            >
              <Download className="h-4 w-4 mr-2 text-gray-500" />
              Export
            </button>
            <div className="relative">
              <button className="inline-flex items-center px-3 py-2 border border-gray-300 shadow-sm text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500">
                <Filter className="h-4 w-4 mr-2 text-gray-500" />
                Filter
              </button>
              <div className="absolute right-0 mt-2 w-64 bg-white rounded-md shadow-lg z-10 hidden">
                <div className="p-4 space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Category</label>
                    <select
                      value={categoryFilter}
                      onChange={(e) => setCategoryFilter(e.target.value)}
                      className="mt-1 block w-full pl-3 pr-10 py-2 text-base border-gray-300 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm rounded-md"
                    >
                      <option value="">All Categories</option>
                      {categories.map(category => (
                        <option key={category} value={category}>{category}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Project</label>
                    <select
                      value={projectFilter}
                      onChange={(e) => setProjectFilter(e.target.value)}
                      className="mt-1 block w-full pl-3 pr-10 py-2 text-base border-gray-300 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm rounded-md"
                    >
                      <option value="">All Projects</option>
                      {projects.map(project => (
                        <option key={project.id} value={project.id}>{project.name}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Date Range</label>
                    <div className="mt-1 grid grid-cols-2 gap-2">
                      <input
                        type="date"
                        value={dateRange.start}
                        onChange={(e) => setDateRange({...dateRange, start: e.target.value})}
                        className="block w-full pl-3 pr-10 py-2 text-base border-gray-300 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm rounded-md"
                      />
                      <input
                        type="date"
                        value={dateRange.end}
                        onChange={(e) => setDateRange({...dateRange, end: e.target.value})}
                        className="block w-full pl-3 pr-10 py-2 text-base border-gray-300 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm rounded-md"
                      />
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th 
                scope="col" 
                className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer"
                onClick={() => handleSort('date')}
              >
                <div className="flex items-center">
                  Date {getSortIcon('date')}
                </div>
              </th>
              <th 
                scope="col" 
                className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer"
                onClick={() => handleSort('vendor')}
              >
                <div className="flex items-center">
                  Vendor {getSortIcon('vendor')}
                </div>
              </th>
              <th 
                scope="col" 
                className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer"
                onClick={() => handleSort('category')}
              >
                <div className="flex items-center">
                  Category {getSortIcon('category')}
                </div>
              </th>
              <th 
                scope="col" 
                className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer"
                onClick={() => handleSort('amount')}
              >
                <div className="flex items-center">
                  Amount {getSortIcon('amount')}
                </div>
              </th>
              <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Project
              </th>
              <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Receipt
              </th>
              <th scope="col" className="relative px-6 py-3">
                <span className="sr-only">Actions</span>
              </th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {filteredExpenses.length === 0 ? (
              <tr>
                <td colSpan={7} className="px-6 py-12">
                  <div className="text-center">
                    <Receipt className="mx-auto h-12 w-12 text-gray-400" />
                    <h3 className="mt-2 text-sm font-medium text-gray-900">No expenses found</h3>
                    <p className="mt-1 text-sm text-gray-500">
                      {searchTerm || categoryFilter || projectFilter || dateRange.start || dateRange.end
                        ? "Try adjusting your filters to find what you're looking for."
                        : "Get started by adding your first expense using the form above."}
                    </p>
                  </div>
                </td>
              </tr>
            ) : (
              filteredExpenses.map((expense) => {
                const hasLineItems = expense.metadata?.lineItems && expense.metadata.lineItems.length > 0;
                const isExpanded = expandedRow === expense.id;

                return (
                  <>
                    <tr key={expense.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {format(new Date(expense.date), 'MMM d, yyyy')}
                        {expense.isRecurring && (
                          <span className="ml-2 inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-blue-100 text-blue-800">
                            Recurring
                          </span>
                        )}
                        {expense.metadata?.source === 'n8n_webhook' && (
                          <span className="ml-2 inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-green-100 text-green-800">
                            Auto
                          </span>
                        )}
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-900">
                        <div className="flex items-center justify-between">
                          <div>
                            <div className="font-medium">{expense.vendor}</div>
                            {expense.metadata?.receiptNumber && (
                              <div className="text-xs text-gray-500">Receipt #{expense.metadata.receiptNumber}</div>
                            )}
                          </div>
                          {hasLineItems && (
                            <button
                              onClick={() => setExpandedRow(isExpanded ? null : expense.id)}
                              className="ml-2 text-gray-400 hover:text-gray-600"
                            >
                              {isExpanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                            </button>
                          )}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                          <Tag className="mr-1 h-3 w-3" />
                          {expense.category}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        <div className="font-medium">${expense.amount.toFixed(2)}</div>
                        {expense.metadata?.taxAmount && (
                          <div className="text-xs text-gray-500">Tax: ${expense.metadata.taxAmount.toFixed(2)}</div>
                        )}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {getProjectName(expense.projectId)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {expense.imageUrl ? (
                          <button className="text-blue-600 hover:text-blue-800">
                            <FileText className="h-5 w-5" />
                          </button>
                        ) : hasLineItems ? (
                          <Package className="h-5 w-5 text-green-500" />
                        ) : (
                          <span className="text-gray-400">None</span>
                        )}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                        <button
                          onClick={() => setEditingExpense(expense)}
                          className="text-blue-600 hover:text-blue-900 mr-4"
                          title="Edit expense"
                        >
                          <Edit className="h-4 w-4" />
                        </button>
                        <button
                          onClick={() => onDelete(expense.id)}
                          className="text-red-600 hover:text-red-900"
                        >
                          <Trash className="h-4 w-4" />
                        </button>
                      </td>
                    </tr>

                    {/* Expanded row with line items */}
                    {isExpanded && hasLineItems && (
                      <tr key={`${expense.id}-expanded`} className="bg-gray-50">
                        <td colSpan={7} className="px-6 py-4">
                          <div className="space-y-4">
                            {/* Line Items Table */}
                            <div>
                              <h4 className="text-sm font-medium text-gray-700 mb-2 flex items-center">
                                <Package className="h-4 w-4 mr-2" />
                                Line Items ({expense.metadata!.lineItems!.length})
                              </h4>
                              <div className="bg-white rounded-md shadow-sm overflow-hidden">
                                <table className="min-w-full">
                                  <thead className="bg-gray-100">
                                    <tr>
                                      <th className="px-4 py-2 text-left text-xs font-medium text-gray-500">Description</th>
                                      <th className="px-4 py-2 text-right text-xs font-medium text-gray-500">Qty</th>
                                      <th className="px-4 py-2 text-right text-xs font-medium text-gray-500">Unit Price</th>
                                      <th className="px-4 py-2 text-right text-xs font-medium text-gray-500">Total</th>
                                    </tr>
                                  </thead>
                                  <tbody className="divide-y divide-gray-200">
                                    {expense.metadata!.lineItems!.map((item, idx) => (
                                      <tr key={`${expense.id}-line-${idx}`}>
                                        <td className="px-4 py-2 text-sm text-gray-900">{item.description}</td>
                                        <td className="px-4 py-2 text-sm text-gray-600 text-right">{item.quantity}</td>
                                        <td className="px-4 py-2 text-sm text-gray-600 text-right">${item.unitPrice.toFixed(2)}</td>
                                        <td className="px-4 py-2 text-sm font-medium text-gray-900 text-right">${item.totalAmount.toFixed(2)}</td>
                                      </tr>
                                    ))}
                                  </tbody>
                                  {expense.metadata!.subtotal && (
                                    <tfoot className="bg-gray-50">
                                      <tr>
                                        <td colSpan={3} className="px-4 py-2 text-sm text-gray-600 text-right">Subtotal:</td>
                                        <td className="px-4 py-2 text-sm font-medium text-gray-900 text-right">${expense.metadata!.subtotal.toFixed(2)}</td>
                                      </tr>
                                      {expense.metadata!.taxAmount && (
                                        <tr>
                                          <td colSpan={3} className="px-4 py-2 text-sm text-gray-600 text-right">Tax:</td>
                                          <td className="px-4 py-2 text-sm font-medium text-gray-900 text-right">${expense.metadata!.taxAmount.toFixed(2)}</td>
                                        </tr>
                                      )}
                                      <tr className="font-bold">
                                        <td colSpan={3} className="px-4 py-2 text-sm text-gray-900 text-right">Total:</td>
                                        <td className="px-4 py-2 text-sm font-bold text-gray-900 text-right">${expense.amount.toFixed(2)}</td>
                                      </tr>
                                    </tfoot>
                                  )}
                                </table>
                              </div>
                            </div>

                            {/* Supplier Details */}
                            {(expense.metadata!.supplierAddress || expense.metadata!.supplierPhone) && (
                              <div className="grid grid-cols-2 gap-4 pt-3 border-t border-gray-200">
                                {expense.metadata!.supplierAddress && (
                                  <div className="flex items-start">
                                    <MapPin className="h-4 w-4 text-gray-400 mr-2 mt-0.5" />
                                    <div>
                                      <div className="text-xs font-medium text-gray-500">Address</div>
                                      <div className="text-sm text-gray-700">{expense.metadata!.supplierAddress}</div>
                                    </div>
                                  </div>
                                )}
                                {expense.metadata!.supplierPhone && (
                                  <div className="flex items-start">
                                    <Phone className="h-4 w-4 text-gray-400 mr-2 mt-0.5" />
                                    <div>
                                      <div className="text-xs font-medium text-gray-500">Phone</div>
                                      <div className="text-sm text-gray-700">{expense.metadata!.supplierPhone}</div>
                                    </div>
                                  </div>
                                )}
                              </div>
                            )}
                          </div>
                        </td>
                      </tr>
                    )}
                  </>
                );
              })
            )}
          </tbody>
        </table>
      </div>
    </div>
    </>
  );
};

export default ExpenseList;