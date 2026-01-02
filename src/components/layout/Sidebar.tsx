import { Link, useLocation, useNavigate } from 'react-router-dom';
import {
  Home,
  Calculator,
  BarChart2,
  FileText,
  Clipboard,
  Settings,
  Calendar,
  BarChart3,
  Users,
  UserCog,
  Code,
  Bot
} from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { useData } from '../../contexts/DataContext';

interface SidebarProps {
  sidebarOpen: boolean;
  setSidebarOpen: (open: boolean) => void;
}

const Sidebar = ({ sidebarOpen, setSidebarOpen }: SidebarProps) => {
  const { t } = useTranslation();
  const location = useLocation();
  const navigate = useNavigate();
  const { subscription } = useData();

  const getSubscriptionInfo = () => {
    if (!subscription || subscription.status === 'canceled' || !subscription.status) {
      return {
        name: 'Free Plan',
        validUntil: null,
        isActive: false
      };
    }

    const endDate = subscription.current_period_end
      ? new Date(subscription.current_period_end).toLocaleDateString('en-US', {
          year: 'numeric',
          month: 'short',
          day: 'numeric'
        })
      : null;

    return {
      name: 'Pro Plan',
      validUntil: endDate,
      isActive: true
    };
  };

  const subscriptionInfo = getSubscriptionInfo();

  const navigation = [
    { name: t('navigation.dashboard'), icon: Home, href: '/' },
    { name: 'AI Team', icon: Bot, href: '/ai-team', badge: 'New!' },
    { name: t('navigation.calculator'), icon: Calculator, href: '/pricing' },
    { name: t('navigation.finance'), icon: BarChart2, href: '/finance' },
    { name: t('navigation.estimates'), icon: FileText, href: '/estimates' },
    { name: t('navigation.projects'), icon: Clipboard, href: '/projects' },
    { name: t('navigation.clients'), icon: Users, href: '/clients' },
    { name: t('navigation.employees'), icon: UserCog, href: '/employees' },
    { name: t('navigation.calendar'), icon: Calendar, href: '/calendar' },
    { name: 'Ad Analyzer', icon: BarChart3, href: '/ad-analyzer' },
    { name: t('navigation.settings'), icon: Settings, href: '/settings', badge: 'Widgets now here' },
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
        className={`fixed inset-y-0 left-0 z-30 w-64 bg-[#0F0F0F] border-r border-[#2A2A2A] transition duration-300 transform lg:translate-x-0 lg:static lg:inset-0 ${
          sidebarOpen ? 'translate-x-0 ease-out' : '-translate-x-full ease-in'
        }`}
      >
        <div className="flex items-center justify-between h-16 px-6 bg-[#0F0F0F] pt-safe">
          <div className="flex items-center" style={{ marginTop: '44px' }}>
            <span className="text-xl font-bold text-white">ContractorAI</span>
          </div>
        </div>
        <nav className="mt-5 px-2 space-y-1 pb-64 overflow-y-auto max-h-[calc(100vh-4rem)]">
          {navigation.map((item) => {
            const isActive = location.pathname === item.href;
            return (
              <Link
                key={item.name}
                to={item.href}
                onClick={() => setSidebarOpen(false)}
                className={`group flex items-center justify-between px-4 py-3 text-sm font-medium rounded-lg transition-colors ${
                  isActive
                    ? 'bg-[#1A1A1A] text-yellow-500'
                    : 'text-gray-300 hover:bg-[#1A1A1A] hover:text-white'
                }`}
              >
                <div className="flex items-center">
                  <item.icon className={`w-5 h-5 mr-3 flex-shrink-0 ${isActive ? 'text-yellow-500' : 'text-gray-400'}`} />
                  <span className="truncate">{item.name}</span>
                </div>
                {item.badge && (
                  <span className="ml-2 px-2 py-0.5 text-xs font-medium bg-yellow-500 text-black rounded-full whitespace-nowrap">
                    {item.badge}
                  </span>
                )}
              </Link>
            );
          })}
        </nav>

        <div className="absolute bottom-0 w-full px-4 py-4">
          <div className="bg-[#1A1A1A] rounded-xl p-4 text-gray-300 text-sm border border-[#2A2A2A]">
            <p className="font-semibold mb-2 text-white">{subscriptionInfo.name}</p>
            {subscriptionInfo.validUntil && (
              <p className="text-xs text-gray-400 mb-3">
                {t('common.validUntil')} {subscriptionInfo.validUntil}
              </p>
            )}
            {!subscriptionInfo.isActive && (
              <p className="text-xs text-gray-400 mb-3">
                {t('common.upgradeMessage')}
              </p>
            )}
            <a
              href="https://contractorai.work/login"
              target="_blank"
              rel="noopener noreferrer"
              className="block w-full py-2 bg-yellow-500 hover:bg-yellow-600 text-black rounded-lg text-xs font-semibold transition-colors text-center"
            >
              {subscriptionInfo.isActive ? t('common.manageSubscription') : t('common.upgradeNow')}
            </a>
          </div>
        </div>
      </div>
    </>
  );
};

export default Sidebar;