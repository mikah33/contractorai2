import { useState, useEffect } from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import OnboardingModal from './components/onboarding/OnboardingModal';
import { useOnboardingStore } from './stores/onboardingStore';
import { useDeepLinks } from './hooks/useDeepLinks';
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
import EmployeesHub from './pages/EmployeesHub';
import AdAccountsSetup from './pages/AdAccountsSetup';
import AdOAuthCallback from './pages/AdOAuthCallback';
import MetaOAuthCallback from './pages/MetaOAuthCallback';
import GmailOAuthCallback from './pages/GmailOAuthCallback';
import AnalyticsDashboard from './pages/AnalyticsDashboard';
// Import both subscription pages - use based on platform
import SubscriptionsIOS from './pages/SubscriptionsIOS';
import SubscriptionsWeb from './pages/SubscriptionsWeb';
import ResetPassword from './pages/ResetPassword';
import LoginPage from './pages/auth/LoginPage';
import SignupPage from './pages/auth/SignupPage';
import EmailConfirmation from './pages/auth/EmailConfirmation';
import AuthCallback from './pages/auth/AuthCallback';
import WelcomePage from './pages/auth/WelcomePage';
import TermsOfService from './pages/legal/TermsOfService';
import PrivacyPolicy from './pages/legal/PrivacyPolicy';
import { Capacitor } from '@capacitor/core';
import ConfigureDeckCalculator from './pages/ConfigureDeckCalculator';
import ConfigureRoofingCalculator from './pages/ConfigureRoofingCalculator';
import ConfigureConcreteCalculator from './pages/ConfigureConcreteCalculator';
import ConfigureSidingCalculator from './pages/ConfigureSidingCalculator';
import ConfigurePaintCalculator from './pages/ConfigurePaintCalculator';
import ConfigureFlooringCalculator from './pages/ConfigureFlooringCalculator';
import ConfigureTileCalculator from './pages/ConfigureTileCalculator';
import ConfigureDrywallCalculator from './pages/ConfigureDrywallCalculator';
import ConfigureFencingCalculator from './pages/ConfigureFencingCalculator';
import ConfigurePaversCalculator from './pages/ConfigurePaversCalculator';
import ConfigureVeneerCalculator from './pages/ConfigureVeneerCalculator';
import ConfigureHVACCalculator from './pages/ConfigureHVACCalculator';
import ConfigureElectricalCalculator from './pages/ConfigureElectricalCalculator';
import ConfigureGutterCalculator from './pages/ConfigureGutterCalculator';
import ConfigureFoundationCalculator from './pages/ConfigureFoundationCalculator';
import ConfigureRetainingWallCalculator from './pages/ConfigureRetainingWallCalculator';
import ConfigureDoorsWindowsCalculator from './pages/ConfigureDoorsWindowsCalculator';
import ConfigurePlumbingCalculator from './pages/ConfigurePlumbingCalculator';
import ConfigureFramingCalculator from './pages/ConfigureFramingCalculator';
import ConfigureJunkRemovalCalculator from './pages/ConfigureJunkRemovalCalculator';
import ConfigureExcavationCalculator from './pages/ConfigureExcavationCalculator';
import AITeamHub from './pages/AITeamHub';
import EstimatesHub from './pages/EstimatesHub';
import ProjectsHub from './pages/ProjectsHub';
import PhotosGallery from './pages/PhotosGallery';
import ClientsHub from './pages/ClientsHub';
import FinanceHub from './pages/FinanceHub';
import BusinessHub from './pages/BusinessHub';
import TodoHub from './pages/TodoHub';
import MobileBottomNav from './components/layout/MobileBottomNav';
import GlobalAISearchBar from './components/ai/GlobalAISearchBar';
// Deprecated: Individual chatbot pages - now redirected to unified AITeamHub
import { PricingProvider } from './contexts/PricingContext';
import { ProjectProvider } from './contexts/ProjectContext';
import { DataProvider } from './contexts/DataContext';
import { CalculatorTabProvider } from './contexts/CalculatorTabContext';
import { useAuthStore } from './stores/authStore';
import { useAppInitialization } from './hooks/useAppInitialization';
import { supabase } from './lib/supabase';
import { revenueCatService } from './services/revenueCatService';
import { revenueCatWebService } from './services/revenueCatWebService';

function App() {
  const { user, initialized } = useAuthStore();
  const { isInitialized: dataInitialized, initError } = useAppInitialization();
  const [hasActiveSubscription, setHasActiveSubscription] = useState<boolean | null>(null);
  const [checkingSubscription, setCheckingSubscription] = useState(true);
  const { profileCompleted, checkOnboardingStatus } = useOnboardingStore();
  const [showOnboarding, setShowOnboarding] = useState(false);

  // Handle deep links on iOS/Android
  useDeepLinks();

  // Check subscription status when user is authenticated
  useEffect(() => {
    const checkSubscription = async () => {
      if (!user) {
        setCheckingSubscription(false);
        return;
      }

      try {
        console.log('[Subscription Check] Checking subscription for user:', user.id);

        // Check platform
        const platform = Capacitor.getPlatform();

        if (platform === 'ios') {
          // For iOS: Check Stripe FIRST (for web subscribers), then RevenueCat
          console.log('[Subscription Check] iOS - Checking Stripe first for web subscribers');

          // Check if user has active Stripe subscription (from web signup)
          const { data: customer } = await supabase
            .from('stripe_customers')
            .select('customer_id')
            .eq('user_id', user.id)
            .single();

          if (customer?.customer_id) {
            const { data: stripeSubscription } = await supabase
              .from('stripe_subscriptions')
              .select('*')
              .eq('customer_id', customer.customer_id)
              .eq('status', 'active')
              .single();

            if (stripeSubscription) {
              console.log('[Subscription Check] User has active Stripe subscription from web!');
              setHasActiveSubscription(true);
              setCheckingSubscription(false);
              return;
            }
          }

          // No Stripe subscription, check RevenueCat (Apple IAP)
          console.log('[Subscription Check] No Stripe subscription, checking RevenueCat');
          await revenueCatService.initialize(user.id);
          const hasSubscription = await revenueCatService.hasActiveSubscription();

          console.log('[Subscription Check] RevenueCat subscription status:', hasSubscription);
          setHasActiveSubscription(hasSubscription);
          setCheckingSubscription(false);
        } else {
          // Use RevenueCat Web SDK for web and Android
          console.log('[Subscription Check] Using RevenueCat Web for', platform);

          try {
            await revenueCatWebService.initialize(user.id);
            const hasSubscription = await revenueCatWebService.hasActiveSubscription();

            console.log('[Subscription Check] RevenueCat Web subscription status:', hasSubscription);
            setHasActiveSubscription(hasSubscription);
          } catch (webError) {
            console.error('[Subscription Check] RevenueCat Web error:', webError);
            setHasActiveSubscription(false);
          }

          setCheckingSubscription(false);
        }
      } catch (error) {
        console.error('[Subscription Check] Error:', error);
        setHasActiveSubscription(false);
        setCheckingSubscription(false);
      }
    };

    checkSubscription();
  }, [user]);

  // Check onboarding status when user has active subscription
  useEffect(() => {
    const checkOnboarding = async () => {
      if (user && hasActiveSubscription === true) {
        const completed = await checkOnboardingStatus(user.id);
        if (!completed) {
          console.log('[Onboarding] Profile not completed, showing modal');
          setShowOnboarding(true);
        }
      }
    };

    checkOnboarding();
  }, [user, hasActiveSubscription, checkOnboardingStatus]);

  // Handle onboarding completion
  const handleOnboardingComplete = () => {
    setShowOnboarding(false);
  };

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
        <Route path="/auth/welcome" element={<WelcomePage />} />
        <Route path="/auth/login" element={<LoginPage />} />
        <Route path="/auth/signup" element={<SignupPage />} />
        <Route path="/auth/confirm-email" element={<EmailConfirmation />} />
        <Route path="/auth/callback" element={<AuthCallback />} />
        <Route path="/legal/terms" element={<TermsOfService />} />
        <Route path="/legal/privacy" element={<PrivacyPolicy />} />
        <Route path="*" element={<Navigate to="/auth/welcome" replace />} />
      </Routes>
    );
  }

  // Show subscription paywall if no active subscription
  if (checkingSubscription) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Checking subscription...</p>
        </div>
      </div>
    );
  }

  if (hasActiveSubscription === false) {
    // Use platform-specific subscription page:
    // - iOS uses RevenueCat (Apple IAP) via SubscriptionsIOS
    // - Web/Desktop uses Stripe via SubscriptionsWeb
    const isNativePlatform = Capacitor.isNativePlatform();
    const SubscriptionPage = isNativePlatform ? SubscriptionsIOS : SubscriptionsWeb;

    return (
      <Routes>
        <Route path="/subscriptions" element={<SubscriptionPage />} />
        <Route path="*" element={<Navigate to="/subscriptions" replace />} />
      </Routes>
    );
  }

  // Show main app when user is logged in and has active subscription
  return (
    <DataProvider>
      <CalculatorTabProvider>
        <PricingProvider>
          <ProjectProvider>
            {/* Onboarding Modal */}
            <OnboardingModal
              isOpen={showOnboarding}
              onComplete={handleOnboardingComplete}
            />

            <div className="flex h-screen bg-[#0F0F0F] w-screen max-w-full overflow-x-hidden">
              <div className="flex flex-col flex-1 overflow-hidden min-w-0">
                <main className="flex-1 overflow-y-auto overflow-x-hidden pb-40 w-full">
                  <Routes>
                    <Route path="/" element={<Dashboard />} />
                    <Route path="/pricing" element={<PricingCalculator />} />
                    <Route path="/pricing/configure/deck" element={<ConfigureDeckCalculator />} />
                    <Route path="/pricing/configure/roofing" element={<ConfigureRoofingCalculator />} />
                    <Route path="/pricing/configure/concrete" element={<ConfigureConcreteCalculator />} />
                    <Route path="/pricing/configure/siding" element={<ConfigureSidingCalculator />} />
                    <Route path="/pricing/configure/paint" element={<ConfigurePaintCalculator />} />
                    <Route path="/pricing/configure/flooring" element={<ConfigureFlooringCalculator />} />
                    <Route path="/pricing/configure/tile" element={<ConfigureTileCalculator />} />
                    <Route path="/pricing/configure/drywall" element={<ConfigureDrywallCalculator />} />
                    <Route path="/pricing/configure/fencing" element={<ConfigureFencingCalculator />} />
                    <Route path="/pricing/configure/pavers" element={<ConfigurePaversCalculator />} />
                    <Route path="/pricing/configure/veneer" element={<ConfigureVeneerCalculator />} />
                    <Route path="/pricing/configure/hvac" element={<ConfigureHVACCalculator />} />
                    <Route path="/pricing/configure/electrical" element={<ConfigureElectricalCalculator />} />
                    <Route path="/pricing/configure/gutter" element={<ConfigureGutterCalculator />} />
                    <Route path="/pricing/configure/foundation" element={<ConfigureFoundationCalculator />} />
                    <Route path="/pricing/configure/retaining-wall" element={<ConfigureRetainingWallCalculator />} />
                    <Route path="/pricing/configure/doors-windows" element={<ConfigureDoorsWindowsCalculator />} />
                    <Route path="/pricing/configure/plumbing" element={<ConfigurePlumbingCalculator />} />
                    <Route path="/pricing/configure/framing" element={<ConfigureFramingCalculator />} />
                    <Route path="/pricing/configure/junk-removal" element={<ConfigureJunkRemovalCalculator />} />
                    <Route path="/pricing/configure/excavation" element={<ConfigureExcavationCalculator />} />
                    <Route path="/calculator-widgets" element={<CalculatorWidgets />} />
                    <Route path="/ai-team" element={<AITeamHub />} />
                    <Route path="/estimates-hub" element={<EstimatesHub />} />
                    <Route path="/projects-hub" element={<ProjectsHub />} />
                    <Route path="/photos-gallery" element={<PhotosGallery />} />
                    <Route path="/clients-hub" element={<ClientsHub />} />
                    <Route path="/finance-hub" element={<FinanceHub />} />
                    <Route path="/business-hub" element={<BusinessHub />} />
                    <Route path="/todo-hub" element={<TodoHub />} />
                    <Route path="/employees-hub" element={<EmployeesHub />} />
                    {/* Redirect deprecated chatbot routes to unified AITeamHub with mode */}
                    <Route path="/ai-calculator" element={<Navigate to="/ai-team?mode=estimating" replace />} />
                    <Route path="/saul-finance" element={<Navigate to="/ai-team?mode=finance" replace />} />
                    <Route path="/cindy-crm" element={<Navigate to="/ai-team?mode=crm" replace />} />
                    <Route path="/bill-project-manager" element={<Navigate to="/ai-team?mode=projects" replace />} />
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
                    <Route path="/gmail-oauth-callback" element={<GmailOAuthCallback />} />
                    <Route path="/analytics" element={<AnalyticsDashboard />} />
                    <Route path="/settings" element={<Settings />} />
                    <Route path="/reset-password" element={<ResetPassword />} />
                    <Route path="*" element={<Navigate to="/" replace />} />
                  </Routes>
                </main>

                {/* Global AI Search Bar */}
                <GlobalAISearchBar />

                {/* Bottom Navigation */}
                <MobileBottomNav />
              </div>
            </div>
          </ProjectProvider>
        </PricingProvider>
      </CalculatorTabProvider>
    </DataProvider>
  );
}

export default App;