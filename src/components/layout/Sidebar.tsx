import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useState } from 'react';
import {
  Home,
  Calculator,
  BarChart2,
  FileText,
  Clipboard,
  CreditCard,
  Settings,
  Calendar,
  X,
  BarChart3,
  Users,
  UserCog,
  Code,
  Plus,
  ChevronDown,
  ChevronRight
} from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { useData } from '../../contexts/DataContext';
import { stripeProducts } from '../../stripe-config';
import { useCalculatorPreferences } from '../../hooks/useCalculatorPreferences';
import CalculatorManagementModal from '../calculators/CalculatorManagementModal';

interface SidebarProps {
  sidebarOpen: boolean;
  setSidebarOpen: (open: boolean) => void;
}

const Sidebar = ({ sidebarOpen, setSidebarOpen }: SidebarProps) => {
  const { t } = useTranslation();
  const location = useLocation();
  const navigate = useNavigate();
  const { subscription } = useData();
  const { selectedCalculators, loading: loadingCalculators } = useCalculatorPreferences();
  const [calculatorsExpanded, setCalculatorsExpanded] = useState(true);
  const [showCalculatorModal, setShowCalculatorModal] = useState(false);

  const getSubscriptionInfo = () => {
    if (!subscription || subscription.status === 'canceled' || !subscription.status) {
      return {
        name: 'Free Plan',
        validUntil: null,
        isActive: false
      };
    }

    const product = stripeProducts.find(p => p.priceId === subscription.price_id);
    const endDate = subscription.current_period_end
      ? new Date(subscription.current_period_end).toLocaleDateString('en-US', {
          year: 'numeric',
          month: 'short',
          day: 'numeric'
        })
      : null;

    return {
      name: product?.name || 'Pro Plan',
      validUntil: endDate,
      isActive: true
    };
  };

  const subscriptionInfo = getSubscriptionInfo();

  const navigation = [
    { name: t('navigation.dashboard'), icon: Home, href: '/' },
    { name: t('navigation.calculator'), icon: Calculator, href: '/pricing' },
    { name: 'Calculator Widgets', icon: Code, href: '/calculator-widgets' },
    { name: t('navigation.finance'), icon: BarChart2, href: '/finance' },
    { name: t('navigation.estimates'), icon: FileText, href: '/estimates' },
    { name: t('navigation.projects'), icon: Clipboard, href: '/projects' },
    { name: t('navigation.clients'), icon: Users, href: '/clients' },
    { name: t('navigation.employees'), icon: UserCog, href: '/employees' },
    { name: t('navigation.calendar'), icon: Calendar, href: '/calendar' },
    { name: 'Ad Analyzer', icon: BarChart3, href: '/ad-analyzer' },
    { name: t('navigation.subscriptions'), icon: CreditCard, href: '/subscriptions' },
    { name: t('navigation.settings'), icon: Settings, href: '/settings' },
  ];

  return (
    <>
      <div
        className={`fixed inset-0 z-20 bg-gray-600 bg-opacity-75 transition-opacity lg:hidden ${
          sidebarOpen ? 'opacity-100 ease-out duration-300' : 'opacity-0 ease-in duration-200 pointer-events-none'
        }`}
        onClick={() => setSidebarOpen(false)}
      ></div>

      <div
        className={`fixed inset-y-0 left-0 z-30 w-64 bg-blue-900 transition duration-300 transform lg:translate-x-0 lg:static lg:inset-0 ${
          sidebarOpen ? 'translate-x-0 ease-out' : '-translate-x-full ease-in'
        }`}
      >
        <div className="flex items-center justify-between h-16 px-6 bg-blue-800">
          <div className="flex items-center">
            <span className="text-xl font-bold text-white">ContractorAI</span>
          </div>
          <button
            type="button"
            className="p-1 text-white lg:hidden"
            onClick={() => setSidebarOpen(false)}
          >
            <X className="w-6 h-6" />
          </button>
        </div>
        <nav className="mt-5 px-2 space-y-1 pb-64 overflow-y-auto max-h-[calc(100vh-4rem)]">
          {navigation.map((item) => {
            const isActive = location.pathname === item.href;
            return (
              <Link
                key={item.name}
                to={item.href}
                className={`group flex items-center px-4 py-3 text-sm font-medium rounded-md transition-colors ${
                  isActive
                    ? 'bg-blue-800 text-white'
                    : 'text-blue-100 hover:bg-blue-800 hover:text-white'
                }`}
              >
                <item.icon className="w-5 h-5 mr-3 text-blue-300 flex-shrink-0" />
                <span className="truncate">{item.name}</span>
              </Link>
            );
          })}

          {/* My Calculators Section */}
          <div className="mt-6 pt-6 border-t border-blue-800">
            <button
              onClick={() => setCalculatorsExpanded(!calculatorsExpanded)}
              className="w-full flex items-center justify-between px-4 py-2 text-sm font-semibold text-blue-100 hover:text-white transition-colors"
            >
              <span className="flex items-center">
                <Calculator className="w-5 h-5 mr-2 text-blue-300" />
                My Calculators
              </span>
              {calculatorsExpanded ? (
                <ChevronDown className="w-4 h-4 text-blue-300" />
              ) : (
                <ChevronRight className="w-4 h-4 text-blue-300" />
              )}
            </button>

            {calculatorsExpanded && (
              <div className="mt-2 space-y-1">
                {loadingCalculators ? (
                  <div className="px-4 py-2 text-xs text-blue-300">Loading...</div>
                ) : selectedCalculators.length === 0 ? (
                  <div className="px-4 py-2 text-xs text-blue-300">
                    No calculators selected
                  </div>
                ) : (
                  selectedCalculators.map((calc) => {
                    const CalcIcon = calc.icon;
                    const isActive = location.pathname === calc.route;
                    return (
                      <Link
                        key={calc.id}
                        to={calc.route}
                        className={`group flex items-center px-4 py-2 text-sm rounded-md transition-colors ${
                          isActive
                            ? 'bg-blue-800 text-white'
                            : 'text-blue-100 hover:bg-blue-800 hover:text-white'
                        }`}
                      >
                        <CalcIcon className="w-4 h-4 mr-3 text-blue-300 flex-shrink-0" />
                        <span className="truncate text-xs">{t(calc.translationKey)}</span>
                      </Link>
                    );
                  })
                )}

                <button
                  onClick={() => setShowCalculatorModal(true)}
                  className="w-full flex items-center px-4 py-2 text-sm text-teal-400 hover:text-teal-300 hover:bg-blue-800 rounded-md transition-colors mt-2"
                >
                  <Plus className="w-4 h-4 mr-2" />
                  <span className="text-xs">Manage Calculators</span>
                </button>
              </div>
            )}
          </div>
        </nav>

        {/* Calculator Management Modal */}
        <CalculatorManagementModal
          isOpen={showCalculatorModal}
          onClose={() => setShowCalculatorModal(false)}
        />
        
        <div className="absolute bottom-0 w-full px-6 py-4">
          <div className="bg-blue-800 rounded-lg p-4 text-blue-100 text-sm">
            <p className="font-semibold mb-2">{subscriptionInfo.name}</p>
            {subscriptionInfo.validUntil && (
              <p className="text-xs text-blue-300 mb-3">
                {t('common.validUntil')} {subscriptionInfo.validUntil}
              </p>
            )}
            {!subscriptionInfo.isActive && (
              <p className="text-xs text-blue-300 mb-3">
                {t('common.upgradeMessage')}
              </p>
            )}
            <button
              onClick={() => navigate('/subscriptions')}
              className="w-full py-1.5 bg-teal-500 hover:bg-teal-600 text-white rounded-md text-xs font-medium transition-colors"
            >
              {subscriptionInfo.isActive ? t('common.manageSubscription') : t('common.upgradeNow')}
            </button>
          </div>
        </div>
      </div>
    </>
  );
};

export default Sidebar;