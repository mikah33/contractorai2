import { Link, useLocation } from 'react-router-dom';
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
  Users
} from 'lucide-react';

interface SidebarProps {
  sidebarOpen: boolean;
  setSidebarOpen: (open: boolean) => void;
}

const Sidebar = ({ sidebarOpen, setSidebarOpen }: SidebarProps) => {
  const location = useLocation();
  
  const navigation = [
    { name: 'Dashboard', icon: Home, href: '/' },
    { name: 'Pricing Calculator', icon: Calculator, href: '/pricing' },
    { name: 'Finance Tracker', icon: BarChart2, href: '/finance' },
    { name: 'Estimate Generator', icon: FileText, href: '/estimates' },
    { name: 'Project Manager', icon: Clipboard, href: '/projects' },
    { name: 'Clients', icon: Users, href: '/clients' },
    { name: 'Calendar', icon: Calendar, href: '/calendar' },
    { name: 'Ad Analyzer', icon: BarChart3, href: '/ad-analyzer' },
    { name: 'Subscription Plans', icon: CreditCard, href: '/subscriptions' },
    { name: 'Settings', icon: Settings, href: '/settings' },
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
        <nav className="mt-5 px-2 space-y-1">
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
                <item.icon className="w-5 h-5 mr-3 text-blue-300" />
                {item.name}
              </Link>
            );
          })}
        </nav>
        
        <div className="absolute bottom-0 w-full px-6 py-4">
          <div className="bg-blue-800 rounded-lg p-4 text-blue-100 text-sm">
            <p className="font-semibold mb-2">Pro Subscription</p>
            <p className="text-xs text-blue-300 mb-3">Valid until Dec 31, 2025</p>
            <button className="w-full py-1.5 bg-teal-500 hover:bg-teal-600 text-white rounded-md text-xs font-medium transition-colors">
              Manage Subscription
            </button>
          </div>
        </div>
      </div>
    </>
  );
};

export default Sidebar;