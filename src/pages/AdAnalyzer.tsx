import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { BarChart3, Brain, Users, Target, TrendingUp, Settings, Download, ChevronDown } from 'lucide-react';
import AccountConnection from '../components/ads/AccountConnection';
import MetricsDashboard from '../components/ads/MetricsDashboard';
import AIInsights from '../components/ads/AIInsights';
import CompetitorAnalysis from '../components/ads/CompetitorAnalysis';
import ABTesting from '../components/ads/ABTesting';
import { useAdAnalyzerStore } from '../stores/adAnalyzerStore';

const AdAnalyzer = () => {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState<'overview' | 'insights' | 'competitors' | 'testing' | 'accounts'>('overview');
  const [showMobileMenu, setShowMobileMenu] = useState(false);

  const {
    accounts,
    campaigns,
    metrics,
    selectedAccount,
    dateRange,
    fetchCampaigns,
    fetchMetrics,
    setSelectedAccount
  } = useAdAnalyzerStore();

  // Auto-fetch data when account is selected
  useEffect(() => {
    if (selectedAccount) {
      fetchCampaigns(selectedAccount.id);
    }
  }, [selectedAccount, fetchCampaigns]);

  // Auto-fetch metrics when campaigns are available
  useEffect(() => {
    if (campaigns.length > 0) {
      const campaignIds = campaigns.map(c => c.id);
      fetchMetrics(campaignIds, dateRange);
    }
  }, [campaigns, dateRange, fetchMetrics]);

  const tabs = [
    { id: 'overview', name: 'Overview', icon: BarChart3 },
    { id: 'insights', name: 'AI Insights', icon: Brain },
    { id: 'competitors', name: 'Competitors', icon: Users },
    { id: 'testing', name: 'A/B Testing', icon: Target },
    { id: 'accounts', name: 'Accounts', icon: Settings }
  ];

  const connectedAccounts = accounts.filter(acc => acc.status === 'connected');
  const totalSpend = metrics.reduce((sum, metric) => sum + metric.spend, 0);
  const totalConversions = metrics.reduce((sum, metric) => sum + metric.conversions, 0);
  const avgROAS = metrics.length > 0 ? metrics.reduce((sum, metric) => sum + metric.roas, 0) / metrics.length : 0;

  return (
    <div className="relative space-y-6">
      {/* Coming Soon Overlay */}
      <div className="absolute inset-0 bg-gray-900/50 backdrop-blur-sm z-10 flex items-center justify-center rounded-lg">
        <div className="text-center px-6 py-12 bg-white rounded-lg shadow-2xl max-w-md mx-4">
          <div className="w-20 h-20 mx-auto mb-6 bg-gradient-to-br from-blue-500 to-purple-600 rounded-full flex items-center justify-center">
            <BarChart3 className="w-10 h-10 text-white" />
          </div>
          <h2 className="text-3xl font-bold text-gray-900 mb-3">Coming Soon</h2>
          <p className="text-gray-600 text-lg mb-6">
            AI-powered ad analytics and optimization features are currently in development.
          </p>
          <div className="flex items-center justify-center space-x-2 text-sm text-gray-500">
            <div className="w-2 h-2 bg-blue-500 rounded-full animate-pulse"></div>
            <span>We're working on something amazing</span>
          </div>
        </div>
      </div>

      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Ad Analyzer</h1>
          <p className="mt-1 text-sm text-gray-600">
            AI-powered advertising performance analysis and optimization
          </p>
        </div>

        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
          {selectedAccount && (
            <div className="flex items-center space-x-2 px-3 py-2 bg-blue-50 rounded-lg">
              <div className="w-2 h-2 bg-green-500 rounded-full"></div>
              <span className="text-sm font-medium text-blue-900 truncate">{selectedAccount.name}</span>
            </div>
          )}
          <button className="inline-flex items-center justify-center px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-md hover:bg-blue-700">
            <Download className="w-4 h-4 mr-2" />
            <span className="hidden sm:inline">Export Report</span>
            <span className="sm:hidden">Export</span>
          </button>
        </div>
      </div>

      {/* Quick Stats */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center">
            <div className="p-2 bg-blue-100 rounded-lg">
              <Settings className="w-6 h-6 text-blue-600" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">Connected Accounts</p>
              <p className="text-2xl font-semibold text-gray-900">{connectedAccounts.length}</p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center">
            <div className="p-2 bg-green-100 rounded-lg">
              <TrendingUp className="w-6 h-6 text-green-600" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">Total Spend</p>
              <p className="text-2xl font-semibold text-gray-900">${totalSpend.toLocaleString()}</p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center">
            <div className="p-2 bg-purple-100 rounded-lg">
              <Target className="w-6 h-6 text-purple-600" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">Conversions</p>
              <p className="text-2xl font-semibold text-gray-900">{totalConversions}</p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center">
            <div className="p-2 bg-orange-100 rounded-lg">
              <BarChart3 className="w-6 h-6 text-orange-600" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">Avg ROAS</p>
              <p className="text-2xl font-semibold text-gray-900">{avgROAS.toFixed(2)}x</p>
            </div>
          </div>
        </div>
      </div>

      {/* Navigation Tabs */}
      <div className="bg-white rounded-lg shadow">
        <div className="border-b border-gray-200">
          {/* Desktop Tabs */}
          <nav className="hidden md:flex space-x-8 px-6">
            {tabs.map((tab) => (
              <button
                key={tab.id}
                onClick={() => tab.id === 'accounts' ? navigate('/ad-accounts') : setActiveTab(tab.id as any)}
                className={`py-4 px-1 border-b-2 font-medium text-sm flex items-center ${
                  activeTab === tab.id
                    ? 'border-blue-500 text-blue-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                <tab.icon className="w-4 h-4 mr-2" />
                {tab.name}
              </button>
            ))}
          </nav>

          {/* Mobile Dropdown */}
          <div className="md:hidden px-4 py-3">
            <button
              onClick={() => setShowMobileMenu(!showMobileMenu)}
              className="w-full flex items-center justify-between px-4 py-2 text-sm font-medium text-gray-700 bg-gray-50 rounded-md hover:bg-gray-100"
            >
              <span className="flex items-center">
                {tabs.find(t => t.id === activeTab)?.icon && (
                  <span className="mr-2">
                    {(() => {
                      const Icon = tabs.find(t => t.id === activeTab)!.icon;
                      return <Icon className="w-4 h-4" />;
                    })()}
                  </span>
                )}
                {tabs.find(t => t.id === activeTab)?.name}
              </span>
              <ChevronDown className={`w-4 h-4 transition-transform ${showMobileMenu ? 'rotate-180' : ''}`} />
            </button>

            {showMobileMenu && (
              <div className="mt-2 bg-white rounded-md shadow-lg border border-gray-200">
                {tabs.map((tab) => (
                  <button
                    key={tab.id}
                    onClick={() => {
                      if (tab.id === 'accounts') {
                        navigate('/ad-accounts');
                      } else {
                        setActiveTab(tab.id as any);
                      }
                      setShowMobileMenu(false);
                    }}
                    className={`w-full flex items-center px-4 py-3 text-sm font-medium ${
                      activeTab === tab.id
                        ? 'bg-blue-50 text-blue-600'
                        : 'text-gray-700 hover:bg-gray-50'
                    }`}
                  >
                    <tab.icon className="w-4 h-4 mr-3" />
                    {tab.name}
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>

        <div className="p-6">
          {activeTab === 'overview' && <MetricsDashboard />}
          {activeTab === 'insights' && <AIInsights />}
          {activeTab === 'competitors' && <CompetitorAnalysis />}
          {activeTab === 'testing' && <ABTesting />}
          {activeTab === 'accounts' && <AccountConnection />}
        </div>
      </div>

      {/* No Accounts Connected State */}
      {connectedAccounts.length === 0 && activeTab === 'overview' && (
        <div className="bg-white rounded-lg shadow p-12 text-center">
          <div className="w-16 h-16 mx-auto bg-gray-100 rounded-full flex items-center justify-center mb-4">
            <BarChart3 className="w-8 h-8 text-gray-400" />
          </div>
          <h3 className="text-lg font-medium text-gray-900 mb-2">Connect Your Ad Accounts</h3>
          <p className="text-gray-600 mb-6 max-w-md mx-auto">
            Connect your Google Ads, Facebook Ads, or other advertising accounts to start analyzing performance with AI-powered insights.
          </p>
          <button
            onClick={() => navigate('/ad-accounts')}
            className="inline-flex items-center px-6 py-3 text-base font-medium text-white bg-blue-600 rounded-md hover:bg-blue-700"
          >
            <Settings className="w-5 h-5 mr-2" />
            Connect Accounts
          </button>
        </div>
      )}
    </div>
  );
};

export default AdAnalyzer;