import { useNavigate } from 'react-router-dom';
import { useState } from 'react';
import { Menu, Bell, User, ChevronDown, LogOut, Settings } from 'lucide-react';
import { useAuthStore } from '../../stores/authStore';
import { useData } from '../../contexts/DataContext';

interface HeaderProps {
  sidebarOpen: boolean;
  setSidebarOpen: (open: boolean) => void;
}

const Header = ({ sidebarOpen, setSidebarOpen }: HeaderProps) => {
  const navigate = useNavigate();
  const { user, signOut } = useAuthStore();
  const { subscription, profile } = useData();
  const [showNotifications, setShowNotifications] = useState(false);

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
    if (!subscription || subscription.status === 'canceled' || !subscription.status) {
      return 'Free Plan';
    }

    return 'Pro Plan';
  };

  // TODO: Replace with real notifications from database
  const notifications: any[] = [];

  return (
    <header className="sticky top-0 z-50 flex items-center justify-between h-16 px-4 bg-white border-b border-gray-200 sm:px-6 lg:px-8">
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

        {/* Settings Icon - Small */}
        <button
          onClick={() => navigate('/settings')}
          className="p-2 text-gray-500 rounded-full hover:bg-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
          title="Settings"
        >
          <Settings className="w-5 h-5" />
        </button>

        <div className="relative">
          <button
            onClick={() => setShowNotifications(!showNotifications)}
            className="p-2 text-gray-500 rounded-full hover:bg-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <Bell className="w-5 h-5" />
            {notifications.filter(n => !n.read).length > 0 && (
              <span className="absolute top-1 right-1 flex items-center justify-center w-4 h-4 text-xs text-white bg-red-500 rounded-full">
                {notifications.filter(n => !n.read).length}
              </span>
            )}
          </button>

          {showNotifications && (
            <div className="absolute right-0 mt-2 w-80 bg-white rounded-md shadow-lg z-20 border border-gray-200">
              <div className="p-4 border-b border-gray-200">
                <h3 className="text-sm font-semibold text-gray-900">Notifications</h3>
              </div>
              <div className="max-h-96 overflow-y-auto">
                {notifications.length > 0 ? (
                  notifications.map(notification => (
                    <div
                      key={notification.id}
                      className={`p-4 border-b border-gray-100 hover:bg-gray-50 cursor-pointer ${
                        !notification.read ? 'bg-blue-50' : ''
                      }`}
                    >
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <p className="text-sm font-medium text-gray-900">{notification.title}</p>
                          <p className="text-xs text-gray-600 mt-1">{notification.message}</p>
                          <p className="text-xs text-gray-400 mt-2">{notification.time}</p>
                        </div>
                        {!notification.read && (
                          <div className="w-2 h-2 bg-blue-500 rounded-full mt-1 ml-2"></div>
                        )}
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="p-8 text-center">
                    <Bell className="w-12 h-12 mx-auto text-gray-300 mb-2" />
                    <p className="text-sm text-gray-500">No notifications</p>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>

        <div className="relative group">
          <button
            className="flex items-center gap-1 sm:gap-2 p-1 sm:p-2 text-gray-700 rounded-full hover:bg-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            {profile?.logo_url ? (
              <img
                src={profile.logo_url}
                alt="Company Logo"
                className="w-7 h-7 sm:w-8 sm:h-8 object-contain rounded-full border border-gray-200"
              />
            ) : (
              <div className="flex items-center justify-center w-7 h-7 sm:w-8 sm:h-8 bg-blue-500 rounded-full">
                <User className="w-3 h-3 sm:w-4 sm:h-4 text-white" />
              </div>
            )}
            <span className="hidden text-xs sm:text-sm font-medium md:block max-w-[100px] truncate">{user?.email}</span>
            <ChevronDown className="w-3 h-3 sm:w-4 sm:h-4" />
          </button>

          <div className="absolute right-0 mt-2 bg-white rounded-lg shadow-xl z-50 opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-200 border border-gray-200">
            <div className="py-1 px-1 flex flex-col gap-1">
              <button
                onClick={handleProfileClick}
                className="p-3 text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
                title="Settings"
              >
                <User className="w-6 h-6" />
              </button>
              <button
                onClick={handleSignOut}
                className="p-3 text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
                title="Sign Out"
              >
                <LogOut className="w-6 h-6" />
              </button>
            </div>
          </div>
        </div>
      </div>
    </header>
  );
};

export default Header;