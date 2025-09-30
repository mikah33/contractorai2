import { useState } from 'react';
import { Plus, CheckCircle, AlertCircle, RefreshCw, Trash2, Settings } from 'lucide-react';
import { useAdAnalyzerStore } from '../../stores/adAnalyzerStore';
import { AdAccount } from '../../types/ads';

const AccountConnection = () => {
  const [showConnectModal, setShowConnectModal] = useState(false);
  const [selectedPlatform, setSelectedPlatform] = useState<string>('');
  
  const { 
    accounts, 
    loading, 
    error, 
    connectAccount, 
    disconnectAccount, 
    refreshAccountData,
    setSelectedAccount 
  } = useAdAnalyzerStore();

  const platforms = [
    { id: 'google', name: 'Google Ads', icon: '🔍', color: 'bg-blue-500' },
    { id: 'facebook', name: 'Facebook Ads', icon: '📘', color: 'bg-blue-600' },
    { id: 'instagram', name: 'Instagram Ads', icon: '📷', color: 'bg-pink-500' },
    { id: 'linkedin', name: 'LinkedIn Ads', icon: '💼', color: 'bg-blue-700' }
  ];

  const handleConnect = async () => {
    if (!selectedPlatform) return;
    
    await connectAccount(selectedPlatform);
    setShowConnectModal(false);
    setSelectedPlatform('');
  };

  const handleDisconnect = async (accountId: string) => {
    if (confirm('Are you sure you want to disconnect this account?')) {
      await disconnectAccount(accountId);
    }
  };

  const handleRefresh = async (accountId: string) => {
    await refreshAccountData(accountId);
  };

  const getStatusIcon = (status: AdAccount['status']) => {
    switch (status) {
      case 'connected':
        return <CheckCircle className="w-5 h-5 text-green-500" />;
      case 'error':
        return <AlertCircle className="w-5 h-5 text-red-500" />;
      case 'pending':
        return <RefreshCw className="w-5 h-5 text-yellow-500 animate-spin" />;
      default:
        return <AlertCircle className="w-5 h-5 text-gray-400" />;
    }
  };

  const getStatusColor = (status: AdAccount['status']) => {
    switch (status) {
      case 'connected':
        return 'bg-green-100 text-green-800';
      case 'error':
        return 'bg-red-100 text-red-800';
      case 'pending':
        return 'bg-yellow-100 text-yellow-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  return (
    <div className="bg-white rounded-lg shadow">
      <div className="p-6 border-b border-gray-200">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-lg font-medium text-gray-900">Connected Ad Accounts</h2>
            <p className="mt-1 text-sm text-gray-600">
              Manage your advertising platform connections
            </p>
          </div>
          <button
            onClick={() => setShowConnectModal(true)}
            className="inline-flex items-center px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
          >
            <Plus className="w-4 h-4 mr-2" />
            Connect Account
          </button>
        </div>
      </div>

      {error && (
        <div className="p-4 bg-red-50 border-l-4 border-red-400">
          <div className="flex">
            <AlertCircle className="w-5 h-5 text-red-400" />
            <div className="ml-3">
              <p className="text-sm text-red-700">{error}</p>
            </div>
          </div>
        </div>
      )}

      <div className="p-6">
        {accounts.length === 0 ? (
          <div className="text-center py-12">
            <div className="w-16 h-16 mx-auto bg-gray-100 rounded-full flex items-center justify-center mb-4">
              <Plus className="w-8 h-8 text-gray-400" />
            </div>
            <h3 className="text-lg font-medium text-gray-900 mb-2">No accounts connected</h3>
            <p className="text-gray-600 mb-6">Connect your advertising accounts to start analyzing performance</p>
            <button
              onClick={() => setShowConnectModal(true)}
              className="inline-flex items-center px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-md hover:bg-blue-700"
            >
              <Plus className="w-4 h-4 mr-2" />
              Connect Your First Account
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {accounts.map((account) => (
              <div key={account.id} className="border border-gray-200 rounded-lg p-4 hover:shadow-md transition-shadow">
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center">
                    <div className={`w-10 h-10 rounded-lg flex items-center justify-center text-white ${
                      platforms.find(p => p.id === account.platform)?.color || 'bg-gray-500'
                    }`}>
                      {platforms.find(p => p.id === account.platform)?.icon || '📊'}
                    </div>
                    <div className="ml-3">
                      <h3 className="text-sm font-medium text-gray-900">{account.name}</h3>
                      <p className="text-xs text-gray-500">{account.accountId}</p>
                    </div>
                  </div>
                  {getStatusIcon(account.status)}
                </div>

                <div className="mb-3">
                  <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getStatusColor(account.status)}`}>
                    {account.status.charAt(0).toUpperCase() + account.status.slice(1)}
                  </span>
                </div>

                <div className="text-xs text-gray-500 mb-4">
                  Last sync: {new Date(account.lastSync).toLocaleDateString()}
                </div>

                <div className="flex items-center justify-between">
                  <button
                    onClick={() => setSelectedAccount(account)}
                    className="text-sm text-blue-600 hover:text-blue-700 font-medium"
                  >
                    View Details
                  </button>
                  <div className="flex items-center space-x-2">
                    <button
                      onClick={() => handleRefresh(account.id)}
                      disabled={loading}
                      className="p-1 text-gray-400 hover:text-gray-600"
                      title="Refresh data"
                    >
                      <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
                    </button>
                    <button
                      onClick={() => handleDisconnect(account.id)}
                      className="p-1 text-gray-400 hover:text-red-600"
                      title="Disconnect account"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Connect Account Modal */}
      {showConnectModal && (
        <div className="fixed inset-0 z-50 overflow-y-auto">
          <div className="flex items-center justify-center min-h-screen px-4">
            <div className="fixed inset-0 bg-gray-500 bg-opacity-75 transition-opacity" onClick={() => setShowConnectModal(false)}></div>

            <div className="relative bg-white rounded-lg shadow-xl max-w-md w-full mx-4">
              <div className="flex items-center justify-between p-6 border-b">
                <h3 className="text-lg font-medium text-gray-900">Connect Ad Account</h3>
                <button
                  onClick={() => setShowConnectModal(false)}
                  className="text-gray-400 hover:text-gray-500"
                >
                  <span className="sr-only">Close</span>
                  <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>

              <div className="p-6">
                <p className="text-sm text-gray-600 mb-4">
                  Choose a platform to connect your advertising account
                </p>

                <div className="space-y-3">
                  {platforms.map((platform) => (
                    <button
                      key={platform.id}
                      onClick={() => setSelectedPlatform(platform.id)}
                      className={`w-full flex items-center p-4 border rounded-lg transition-colors ${
                        selectedPlatform === platform.id
                          ? 'border-blue-500 bg-blue-50'
                          : 'border-gray-200 hover:border-gray-300'
                      }`}
                    >
                      <div className={`w-10 h-10 rounded-lg flex items-center justify-center text-white ${platform.color}`}>
                        {platform.icon}
                      </div>
                      <div className="ml-3 text-left">
                        <h4 className="text-sm font-medium text-gray-900">{platform.name}</h4>
                        <p className="text-xs text-gray-500">Connect your {platform.name} account</p>
                      </div>
                    </button>
                  ))}
                </div>
              </div>

              <div className="flex justify-end space-x-3 p-6 border-t">
                <button
                  onClick={() => setShowConnectModal(false)}
                  className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50"
                >
                  Cancel
                </button>
                <button
                  onClick={handleConnect}
                  disabled={!selectedPlatform || loading}
                  className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {loading ? 'Connecting...' : 'Connect Account'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AccountConnection;