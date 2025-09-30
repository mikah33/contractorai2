import { useNavigate } from 'react-router-dom';
import { Menu, Bell, User, ChevronDown, LogOut } from 'lucide-react';
import { useAuthStore } from '../../stores/authStore';
import { stripeProducts } from '../../stripe-config';

interface HeaderProps {
  sidebarOpen: boolean;
  setSidebarOpen: (open: boolean) => void;
}

const Header = ({ sidebarOpen, setSidebarOpen }: HeaderProps) => {
  const navigate = useNavigate();
  const { user, subscription, signOut } = useAuthStore();

  const handleNotificationClick = () => {
    console.log('Notifications clicked - Feature coming soon');
  };

  const handleProfileClick = () => {
    navigate('/settings');
  };

  const handleSignOut = async () => {
    try {
      await signOut();
      navigate('/auth/login');
    } catch (error) {
      console.error('Error signing out:', error);
    }
  };

  const getSubscriptionPlanName = () => {
    if (!subscription || !['active', 'trialing'].includes(subscription.subscription_status)) {
      return 'Free Plan';
    }

    const product = stripeProducts.find(p => p.priceId === subscription.price_id);
    return product?.name || 'Active Plan';
  };

  return (
    <header className="sticky top-0 z-10 flex items-center justify-between h-16 px-4 bg-white border-b border-gray-200 sm:px-6 lg:px-8">
      <div className="flex items-center">
        <button
          type="button"
          className="p-2 text-gray-500 lg:hidden"
          onClick={() => setSidebarOpen(!sidebarOpen)}
        >
          <Menu className="w-6 h-6" />
        </button>
        <h1 className="hidden ml-2 text-xl font-bold text-blue-900 md:block">ContractorAI</h1>
      </div>

      <div className="flex items-center gap-4">
        <div className="hidden sm:block">
          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
            {getSubscriptionPlanName()}
          </span>
        </div>

        <div className="relative">
          <button 
            onClick={handleNotificationClick}
            className="p-2 text-gray-500 rounded-full hover:bg-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <Bell className="w-5 h-5" />
            <span className="absolute top-1 right-1 w-2 h-2 bg-red-500 rounded-full"></span>
          </button>
        </div>

        <div className="relative group">
          <button 
            className="flex items-center gap-2 p-2 text-gray-700 rounded-full hover:bg-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <div className="flex items-center justify-center w-8 h-8 bg-blue-500 rounded-full">
              <User className="w-4 h-4 text-white" />
            </div>
            <span className="hidden font-medium sm:block">{user?.email}</span>
            <ChevronDown className="w-4 h-4" />
          </button>

          <div className="absolute right-0 mt-2 w-48 bg-white rounded-md shadow-lg z-10 opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-200">
            <div className="py-1">
              <button
                onClick={handleProfileClick}
                className="flex items-center w-full px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
              >
                <User className="w-4 h-4 mr-2" />
                Settings
              </button>
              <button
                onClick={handleSignOut}
                className="flex items-center w-full px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
              >
                <LogOut className="w-4 h-4 mr-2" />
                Sign Out
              </button>
            </div>
          </div>
        </div>
      </div>
    </header>
  );
};

export default Header;