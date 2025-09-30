import { useState } from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import Header from './components/layout/Header';
import Sidebar from './components/layout/Sidebar';
import Dashboard from './pages/Dashboard';
import PricingCalculator from './pages/PricingCalculator';
import FinanceTracker from './pages/FinanceTracker';
import EstimateGenerator from './pages/EstimateGenerator';
import ProjectManager from './pages/ProjectManager';
import Calendar from './pages/Calendar';
import AdAnalyzer from './pages/AdAnalyzer';
import Settings from './pages/Settings';
import Clients from './pages/Clients';
import LoginPage from './pages/auth/LoginPage';
import SignupPage from './pages/auth/SignupPage';
import { PricingProvider } from './contexts/PricingContext';
import { ProjectProvider } from './contexts/ProjectContext';
import { useAuthStore } from './stores/authStore';

function App() {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const { user, initialized } = useAuthStore();

  if (!initialized) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
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
                <Route path="/finance" element={<FinanceTracker />} />
                <Route path="/estimates" element={<EstimateGenerator />} />
                <Route path="/projects" element={<ProjectManager />} />
                <Route path="/clients" element={<Clients />} />
                <Route path="/calendar" element={<Calendar />} />
                <Route path="/ad-analyzer" element={<AdAnalyzer />} />
                <Route path="/settings" element={<Settings />} />
                <Route path="*" element={<Navigate to="/" replace />} />
              </Routes>
            </main>
          </div>
        </ProjectProvider>
      </PricingProvider>
    </div>
  );
}

export default App;