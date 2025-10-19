import { useState } from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import Header from './components/layout/Header';
import Sidebar from './components/layout/Sidebar';
import Dashboard from './pages/Dashboard';
import PricingCalculator from './pages/PricingCalculator';
import CalculatorWidgets from './pages/CalculatorWidgets';
import FinanceTracker from './pages/FinanceTracker';
import EstimateGenerator from './pages/EstimateGenerator';
import ProjectManager from './pages/ProjectManager';
import Calendar from './pages/Calendar';
import AdAnalyzer from './pages/AdAnalyzer';
import Settings from './pages/Settings';
import Clients from './pages/Clients';
import EmployeesManager from './pages/EmployeesManager';
import AdAccountsSetup from './pages/AdAccountsSetup';
import AdOAuthCallback from './pages/AdOAuthCallback';
import MetaOAuthCallback from './pages/MetaOAuthCallback';
import AnalyticsDashboard from './pages/AnalyticsDashboard';
import Subscriptions from './pages/Subscriptions';
import ResetPassword from './pages/ResetPassword';
import LoginPage from './pages/auth/LoginPage';
import SignupPage from './pages/auth/SignupPage';
import { PricingProvider } from './contexts/PricingContext';
import { ProjectProvider } from './contexts/ProjectContext';
import { DataProvider } from './contexts/DataContext';
import { useAuthStore } from './stores/authStore';
import { useAppInitialization } from './hooks/useAppInitialization';

function App() {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const { user, initialized } = useAuthStore();
  const { isInitialized: dataInitialized, initError } = useAppInitialization();

  // Show loading while auth or data initializes
  if (!initialized || (user && !dataInitialized)) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center max-w-md px-4">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600 text-lg mb-2">
            {!initialized ? 'Checking authentication...' : 'Loading your data...'}
          </p>
          {initError && (
            <div className="mt-4 p-4 bg-red-50 border border-red-200 rounded-lg">
              <p className="text-red-700 text-sm font-medium">Error: {initError}</p>
              <button
                onClick={() => window.location.reload()}
                className="mt-3 px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700 transition-colors text-sm"
              >
                Reload Page
              </button>
            </div>
          )}
          {!initialized && (
            <p className="text-gray-500 text-sm mt-4">
              If this takes more than 10 seconds, please check your internet connection or{' '}
              <button
                onClick={() => window.location.reload()}
                className="text-blue-600 hover:underline"
              >
                reload the page
              </button>
            </p>
          )}
        </div>
      </div>
    );
  }

  // Handle authentication routes
  if (!user) {
    return (
      <Routes>
        <Route path="/auth/login" element={<LoginPage />} />
        <Route path="/auth/signup" element={<SignupPage />} />
        <Route path="*" element={<Navigate to="/auth/login" replace />} />
      </Routes>
    );
  }

  // Show main app when user is logged in
  return (
    <DataProvider>
      <div className="flex h-screen bg-gray-50">
        <PricingProvider>
          <ProjectProvider>
          <Sidebar sidebarOpen={sidebarOpen} setSidebarOpen={setSidebarOpen} />
          
          <div className="flex flex-col flex-1 overflow-hidden">
            <Header sidebarOpen={sidebarOpen} setSidebarOpen={setSidebarOpen} />
            
            <main className="flex-1 overflow-y-auto pt-8 px-4 sm:px-6 lg:px-8 pb-8">
              <Routes>
                <Route path="/" element={<Dashboard />} />
                <Route path="/pricing" element={<PricingCalculator />} />
                <Route path="/calculator-widgets" element={<CalculatorWidgets />} />
                <Route path="/finance" element={<FinanceTracker />} />
                <Route path="/estimates" element={<EstimateGenerator />} />
                <Route path="/projects" element={<ProjectManager />} />
                <Route path="/clients" element={<Clients />} />
                <Route path="/employees" element={<EmployeesManager />} />
                <Route path="/calendar" element={<Calendar />} />
                <Route path="/ad-analyzer" element={<AdAnalyzer />} />
                <Route path="/ad-accounts" element={<AdAccountsSetup />} />
                <Route path="/ad-oauth-callback" element={<AdOAuthCallback />} />
                <Route path="/meta-oauth-callback" element={<MetaOAuthCallback />} />
                <Route path="/analytics" element={<AnalyticsDashboard />} />
                <Route path="/subscriptions" element={<Subscriptions />} />
                <Route path="/settings" element={<Settings />} />
                <Route path="/reset-password" element={<ResetPassword />} />
                <Route path="*" element={<Navigate to="/" replace />} />
              </Routes>
            </main>
          </div>
        </ProjectProvider>
      </PricingProvider>
      </div>
    </DataProvider>
  );
}

export default App;