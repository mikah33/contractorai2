import { useState, useEffect } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../components/ui/tabs';
import { DollarSign, Receipt, Calendar, BarChart2, FileText, Download, RefreshCw } from 'lucide-react';
import ReceiptCapture from '../components/finance/ReceiptCapture';
import ExpenseList from '../components/finance/ExpenseList';
import PaymentTracker from '../components/finance/PaymentTracker';
import FinanceDashboard from '../components/finance/FinanceDashboard';
import RecurringExpenses from '../components/finance/RecurringExpenses';
import BudgetTracker from '../components/finance/BudgetTracker';
import ReportGenerator from '../components/finance/ReportGenerator';
import RevenueTracker from '../components/finance/RevenueTracker';
import InvoiceManager from '../components/finance/InvoiceManager';
import { useFinanceStore } from '../stores/financeStoreSupabase';

const FinanceTracker = () => {
  const [activeTab, setActiveTab] = useState('dashboard');
  
  const {
    receipts,
    payments,
    recurringExpenses,
    budgetItems,
    projects,
    clients,
    invoices,
    financialSummary,
    dateRange,
    isLoading,
    error,
    
    fetchReceipts,
    fetchPayments,
    fetchRecurringExpenses,
    fetchBudgetItems,
    fetchProjects,
    fetchClients,
    fetchInvoices,
    
    addReceipt,
    updateReceipt,
    deleteReceipt,
    
    addPayment,
    updatePayment,
    deletePayment,
    
    addRecurringExpense,
    updateRecurringExpense,
    deleteRecurringExpense,
    toggleRecurringExpense,
    
    addBudgetItem,
    updateBudgetItem,
    deleteBudgetItem,
    
    setDateRange,
    generateReport,
    
    predictCashFlow,
    detectAnomalies,
    suggestCostSavings
  } = useFinanceStore();

  // Fetch data when component mounts
  useEffect(() => {
    const loadData = async () => {
      await Promise.all([
        fetchReceipts(),
        fetchPayments(),
        fetchRecurringExpenses(),
        fetchBudgetItems(),
        fetchProjects(),
        fetchClients(),
        fetchInvoices()
      ]);
    };
    
    loadData();
  }, []);

  const handleExportData = (format: 'csv' | 'pdf') => {
    console.log(`Exporting data in ${format} format`);
    // In a real app, this would trigger a download
  };

  const handleGenerateReport = (options: any) => {
    generateReport(options);
  };

  const handleRefresh = async () => {
    await Promise.all([
      fetchReceipts(),
      fetchPayments(),
      fetchRecurringExpenses(),
      fetchBudgetItems(),
      fetchProjects(),
      fetchClients(),
      fetchInvoices()
    ]);
  };

  return (
    <div className="space-y-4 px-4 sm:px-6 lg:px-0">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-gray-900">Finance Tracker</h1>
          <p className="mt-1 text-sm text-gray-600">
            Manage receipts, track expenses, and monitor your financial health
          </p>
        </div>

        <div className="flex flex-col sm:flex-row gap-2">
          <button className="inline-flex items-center justify-center px-3 py-2 border border-gray-300 shadow-sm text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500">
            <Download className="h-4 w-4 sm:mr-2" />
            <span className="hidden sm:inline">Export</span>
          </button>
          <button
            onClick={handleRefresh}
            disabled={isLoading}
            className="inline-flex items-center justify-center px-3 py-2 text-sm font-medium text-white bg-blue-600 rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <RefreshCw className={`h-4 w-4 sm:mr-2 ${isLoading ? 'animate-spin' : ''}`} />
            <span className="hidden sm:inline">{isLoading ? 'Syncing...' : 'Sync'}</span>
          </button>
        </div>
      </div>
      
      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded relative" role="alert">
          <strong className="font-bold">Error: </strong>
          <span className="block sm:inline">{error}</span>
        </div>
      )}

      <div className="bg-white rounded-lg shadow">
        <div className="border-b border-gray-200 overflow-x-auto">
          <nav className="flex space-x-4 md:space-x-8 px-4 sm:px-6 min-w-max md:min-w-0" aria-label="Tabs">
            <button
              onClick={() => setActiveTab('dashboard')}
              className={`py-4 px-1 border-b-2 font-medium text-sm flex items-center whitespace-nowrap ${
                activeTab === 'dashboard'
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              <BarChart2 className="w-4 h-4 md:mr-2" />
              <span className="hidden md:inline">Dashboard</span>
            </button>
            <button
              onClick={() => setActiveTab('revenue')}
              className={`py-4 px-1 border-b-2 font-medium text-sm flex items-center whitespace-nowrap ${
                activeTab === 'revenue'
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              <DollarSign className="w-4 h-4 md:mr-2" />
              <span className="hidden md:inline">Revenue</span>
            </button>
            <button
              onClick={() => setActiveTab('expenses')}
              className={`py-4 px-1 border-b-2 font-medium text-sm flex items-center whitespace-nowrap ${
                activeTab === 'expenses'
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              <Receipt className="w-4 h-4 md:mr-2" />
              <span className="hidden md:inline">Expenses</span>
            </button>
            <button
              onClick={() => setActiveTab('payments')}
              className={`py-4 px-1 border-b-2 font-medium text-sm flex items-center whitespace-nowrap ${
                activeTab === 'payments'
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              <DollarSign className="w-4 h-4 md:mr-2" />
              <span className="hidden md:inline">Payments</span>
            </button>
            <button
              onClick={() => setActiveTab('invoices')}
              className={`py-4 px-1 border-b-2 font-medium text-sm flex items-center whitespace-nowrap ${
                activeTab === 'invoices'
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              <FileText className="w-4 h-4 md:mr-2" />
              <span className="hidden md:inline">Invoices</span>
            </button>
            <button
              onClick={() => setActiveTab('recurring')}
              className={`py-4 px-1 border-b-2 font-medium text-sm flex items-center whitespace-nowrap ${
                activeTab === 'recurring'
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              <Calendar className="w-4 h-4 md:mr-2" />
              <span className="hidden md:inline">Recurring</span>
            </button>
            <button
              onClick={() => setActiveTab('budget')}
              className={`py-4 px-1 border-b-2 font-medium text-sm flex items-center whitespace-nowrap ${
                activeTab === 'budget'
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              <DollarSign className="w-4 h-4 md:mr-2" />
              <span className="hidden md:inline">Budget</span>
            </button>
            <button
              onClick={() => setActiveTab('reports')}
              className={`py-4 px-1 border-b-2 font-medium text-sm flex items-center whitespace-nowrap ${
                activeTab === 'reports'
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              <FileText className="w-4 h-4 md:mr-2" />
              <span className="hidden md:inline">Reports</span>
            </button>
          </nav>
        </div>

        <div className="p-4 sm:p-6">
          {activeTab === 'dashboard' && (
            <FinanceDashboard
              summary={financialSummary}
              dateRange={dateRange}
              onChangeDateRange={setDateRange}
              onExport={(format) => handleExportData(format)}
            />
          )}

          {activeTab === 'revenue' && (
            <RevenueTracker
              projects={projects}
              receipts={receipts}
              payments={payments}
              recurringExpenses={recurringExpenses}
            />
          )}

          {activeTab === 'expenses' && (
            <div className="space-y-6">
              <ReceiptCapture 
                onSave={addReceipt}
                projects={projects}
              />
              
              <ExpenseList 
                expenses={receipts}
                projects={projects}
                onEdit={updateReceipt}
                onDelete={deleteReceipt}
                onExport={handleExportData}
              />
            </div>
          )}
          
          {activeTab === 'payments' && (
            <PaymentTracker 
                payments={payments}
                clients={clients}
                projects={projects}
                invoices={invoices}
                onAddPayment={addPayment}
                onEditPayment={updatePayment}
                onDeletePayment={deletePayment}
              />
          )}
          
          {activeTab === 'invoices' && (
            <div className="p-6">
              <InvoiceManager />
            </div>
          )}

          {activeTab === 'recurring' && (
            <RecurringExpenses
              expenses={recurringExpenses}
              projects={projects}
              onAdd={addRecurringExpense}
              onEdit={updateRecurringExpense}
              onDelete={deleteRecurringExpense}
              onToggleActive={toggleRecurringExpense}
            />
          )}
          
          {activeTab === 'budget' && (
            <BudgetTracker
              projects={projects}
              budgetItems={budgetItems}
              receipts={receipts}
              payments={payments}
              onAddBudgetItem={addBudgetItem}
              onUpdateBudgetItem={updateBudgetItem}
              onDeleteBudgetItem={deleteBudgetItem}
            />
          )}
          
          {activeTab === 'reports' && (
            <ReportGenerator 
              onGenerateReport={handleGenerateReport}
            />
          )}
        </div>
      </div>
    </div>
  );
};

export default FinanceTracker;