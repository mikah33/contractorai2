import { useState, useEffect } from 'react';
import { Routes, Route, Navigate, useLocation } from 'react-router-dom';
import OnboardingModal from './components/onboarding/OnboardingModal';
import PrePaywallOnboarding from './components/onboarding/PrePaywallOnboarding';
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
import ViewEstimatePage from './pages/ViewEstimatePage';
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
import UnsubscribePage from './pages/UnsubscribePage';
import EstimateApprovalPage from './pages/EstimateApprovalPage';
import EstimateResponsePage from './pages/EstimateResponsePage';
import PaymentRedirect from './pages/PaymentRedirect';
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
import JobsHub from './pages/JobsHub';
import SearchHub from './pages/SearchHub';
import TrackerHub from './pages/TrackerHub';
import MobileBottomNav from './components/layout/MobileBottomNav';
import GlobalAISearchBar from './components/ai/GlobalAISearchBar';
// Deprecated: Individual chatbot pages - now redirected to unified AITeamHub
import { PricingProvider } from './contexts/PricingContext';
import { ProjectProvider } from './contexts/ProjectContext';
import { DataProvider } from './contexts/DataContext';
import { CalculatorTabProvider } from './contexts/CalculatorTabContext';
import { ThemeProvider, useTheme } from './contexts/ThemeContext';
import { useAuthStore } from './stores/authStore';
import { useAppInitialization } from './hooks/useAppInitialization';
import { supabase } from './lib/supabase';
import { revenueCatService } from './services/revenueCatService';
import { revenueCatWebService } from './services/revenueCatWebService';
import { subscriptionService } from './services/subscriptionService';

// Themed wrapper component that can access ThemeContext
const ThemedAppWrapper: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { theme } = useTheme();
  return (
    <div className={`flex h-screen w-screen max-w-full overflow-x-hidden ${theme === 'light' ? 'bg-gray-50' : 'bg-[#0F0F0F]'}`}>
      {children}
    </div>
  );
};

function App() {
  const { user, initialized } = useAuthStore();
  const { isInitialized: dataInitialized, initError } = useAppInitialization();
  const [hasActiveSubscription, setHasActiveSubscription] = useState<boolean | null>(null);
  const [checkingSubscription, setCheckingSubscription] = useState(true);
  const { profileCompleted, checkOnboardingStatus, checkPrePaywallStatus, prePaywallCompleted } = useOnboardingStore();
  const [showOnboarding, setShowOnboarding] = useState(false);
  const [showPrePaywallOnboarding, setShowPrePaywallOnboarding] = useState(false);
  const [checkingPrePaywall, setCheckingPrePaywall] = useState(true);
  const [showSplash, setShowSplash] = useState(true);
  const [splashMinTimePassed, setSplashMinTimePassed] = useState(false);

  // Splash screen timer - matches GIF duration exactly (4.23s)
  useEffect(() => {
    const timer = setTimeout(() => {
      setSplashMinTimePassed(true);
    }, 4230);
    return () => clearTimeout(timer);
  }, []);

  // Handle deep links on iOS/Android
  useDeepLinks();

  // Scroll to top on every route change
  const location = useLocation();
  useEffect(() => {
    window.scrollTo(0, 0);
  }, [location.pathname]);

  // Check pre-paywall onboarding status when user is authenticated
  useEffect(() => {
    const checkPrePaywall = async () => {
      if (!user) {
        setCheckingPrePaywall(false);
        return;
      }

      try {
        console.log('[PrePaywall Check] Checking for user:', user.id);
        const completed = await checkPrePaywallStatus(user.id);
        console.log('[PrePaywall Check] Completed:', completed);

        if (!completed) {
          setShowPrePaywallOnboarding(true);
        }
      } catch (error) {
        console.error('[PrePaywall Check] Error:', error);
      } finally {
        setCheckingPrePaywall(false);
      }
    };

    checkPrePaywall();
  }, [user, checkPrePaywallStatus]);

  // Handle pre-paywall onboarding completion
  const handlePrePaywallComplete = () => {
    setShowPrePaywallOnboarding(false);
  };

  // Check subscription status when user is authenticated AND pre-paywall is complete
  useEffect(() => {
    const checkSubscription = async () => {
      if (!user) {
        setCheckingSubscription(false);
        return;
      }

      // Wait for pre-paywall check to complete
      if (checkingPrePaywall || showPrePaywallOnboarding) {
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
          // Use unified subscription service for web and Android (checks database for iOS + web subscriptions)
          console.log('[Subscription Check] Using unified subscription service for', platform);

          try {
            // Initialize subscription service (handles both iOS and web data)
            await subscriptionService.initialize(user.id);

            // Check for ANY active subscription (iOS from database OR web from RevenueCat)
            const hasSubscription = await subscriptionService.refreshSubscription();

            console.log('[Subscription Check] Unified subscription status:', hasSubscription);
            setHasActiveSubscription(hasSubscription);
          } catch (webError) {
            console.error('[Subscription Check] Unified subscription service error:', webError);
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
  }, [user, checkingPrePaywall, showPrePaywallOnboarding]);

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

  // Public customer-facing pages - render immediately without splash screen
  const pathname = window.location.pathname;
  const isCustomerPage = pathname.startsWith('/estimate-response') ||
                         pathname.startsWith('/estimate-approval/') ||
                         pathname.startsWith('/pay/') ||
                         pathname.startsWith('/unsubscribe') ||
                         pathname.startsWith('/view-estimate');

  if (isCustomerPage) {
    return (
      <ThemeProvider>
        <Routes>
          <Route path="/estimate-response" element={<EstimateResponsePage />} />
          <Route path="/estimate-approval/:id" element={<EstimateApprovalPage />} />
          <Route path="/pay/:shortCode" element={<PaymentRedirect />} />
          <Route path="/unsubscribe" element={<UnsubscribePage />} />
          <Route path="/view-estimate" element={<ViewEstimatePage />} />
          <Route path="*" element={<EstimateResponsePage />} />
        </Routes>
      </ThemeProvider>
    );
  }

  // Show splash screen on every app launch - must complete before transitioning
  const isLoading = !initialized || (user && !dataInitialized);
  const shouldShowSplash = showSplash && (!splashMinTimePassed || isLoading);

  // Hide splash when both animation is done AND loading is complete
  useEffect(() => {
    if (splashMinTimePassed && !isLoading && showSplash) {
      setShowSplash(false);
    }
  }, [splashMinTimePassed, isLoading, showSplash]);

  if (shouldShowSplash) {
    return (
      <div
        className="min-h-screen flex items-center justify-center bg-white"
      >
        <img
          src="/onsite-logo.png"
          alt="Onsite"
          className="w-[300px] h-auto"
          key={Date.now()}
        />
      </div>
    );
  }

  // Handle authentication routes
  if (!user) {
    return (
      <ThemeProvider>
        <Routes>
          <Route path="/auth/welcome" element={<WelcomePage />} />
          <Route path="/auth/login" element={<LoginPage />} />
          <Route path="/auth/signup" element={<SignupPage />} />
          <Route path="/auth/confirm-email" element={<EmailConfirmation />} />
          <Route path="/auth/callback" element={<AuthCallback />} />
          <Route path="/unsubscribe" element={<UnsubscribePage />} />
          <Route path="/estimate-approval/:id" element={<EstimateApprovalPage />} />
          <Route path="/estimate-response" element={<EstimateResponsePage />} />
          <Route path="/pay/:shortCode" element={<PaymentRedirect />} />
          <Route path="/legal/terms" element={<TermsOfService />} />
          <Route path="/legal/privacy" element={<PrivacyPolicy />} />
          <Route path="*" element={<Navigate to="/auth/welcome" replace />} />
        </Routes>
      </ThemeProvider>
    );
  }

  // Show pre-paywall onboarding if not completed
  if (checkingPrePaywall) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#0F0F0F]">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-zinc-400">Loading...</p>
        </div>
      </div>
    );
  }

  if (showPrePaywallOnboarding) {
    return (
      <ThemeProvider>
        <PrePaywallOnboarding onComplete={handlePrePaywallComplete} />
      </ThemeProvider>
    );
  }

  // Show subscription paywall if no active subscription
  if (checkingSubscription) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#0F0F0F]">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-zinc-400">Checking subscription...</p>
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
      <ThemeProvider>
        <Routes>
          <Route path="/subscriptions" element={<SubscriptionPage />} />
          <Route path="/unsubscribe" element={<UnsubscribePage />} />
          <Route path="*" element={<Navigate to="/subscriptions" replace />} />
        </Routes>
      </ThemeProvider>
    );
  }

  // Show main app when user is logged in and has active subscription
  return (
    <ThemeProvider>
      <DataProvider>
      <CalculatorTabProvider>
        <PricingProvider>
          <ProjectProvider>
            {/* Onboarding Modal */}
            <OnboardingModal
              isOpen={showOnboarding}
              onComplete={handleOnboardingComplete}
            />

            <ThemedAppWrapper>
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
                    <Route path="/jobs-hub" element={<JobsHub />} />
                    <Route path="/search" element={<SearchHub />} />
                    <Route path="/tracker" element={<TrackerHub />} />
                    <Route path="/todo-hub" element={<TodoHub />} />
                    <Route path="/employees-hub" element={<EmployeesHub />} />
                    {/* Redirect deprecated chatbot routes to unified AITeamHub with mode */}
                    <Route path="/ai-calculator" element={<Navigate to="/ai-team?mode=estimating" replace />} />
                    <Route path="/saul-finance" element={<Navigate to="/ai-team?mode=finance" replace />} />
                    <Route path="/cindy-crm" element={<Navigate to="/ai-team?mode=crm" replace />} />
                    <Route path="/bill-project-manager" element={<Navigate to="/ai-team?mode=projects" replace />} />
                    <Route path="/finance" element={<FinanceTracker />} />
                    <Route path="/pay/:shortCode" element={<PaymentRedirect />} />
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
            </ThemedAppWrapper>
          </ProjectProvider>
        </PricingProvider>
      </CalculatorTabProvider>
      </DataProvider>
    </ThemeProvider>
  );
}

export default App;