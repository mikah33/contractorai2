import React, { useState, useEffect } from 'react';
import { Settings, Plus, RefreshCw, Trash2, CheckCircle, XCircle } from 'lucide-react';
import {
  getAdAccounts,
  createAdAccount,
  deleteAdAccount,
  syncGoogleAdsCampaigns,
  getGoogleAdsOAuthUrl,
  getMetaAdsOAuthUrl,
  AdAccount,
} from '../services/googleAds';

const AdAccountsSetup: React.FC = () => {
  const [accounts, setAccounts] = useState<AdAccount[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAddModal, setShowAddModal] = useState(false);
  const [syncing, setSyncing] = useState<string | null>(null);

  useEffect(() => {
    loadAccounts();
  }, []);

  const loadAccounts = async () => {
    try {
      const data = await getAdAccounts();
      setAccounts(data);
    } catch (error) {
      console.error('Failed to load ad accounts:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleConnectGoogleAds = () => {
    const redirectUri = `${window.location.origin}/ad-oauth-callback`;
    const oauthUrl = getGoogleAdsOAuthUrl(redirectUri);

    console.log('=== Google OAuth Debug ===');
    console.log('Redirect URI:', redirectUri);
    console.log('OAuth URL:', oauthUrl);
    console.log('========================');

    window.location.href = oauthUrl;
  };

  const handleConnectMetaAds = () => {
    const redirectUri = `${window.location.origin}/meta-oauth-callback`;
    const oauthUrl = getMetaAdsOAuthUrl(redirectUri);

    console.log('=== Meta OAuth Debug ===');
    console.log('Redirect URI:', redirectUri);
    console.log('OAuth URL:', oauthUrl);
    console.log('========================');

    window.location.href = oauthUrl;
  };

  const handleSyncCampaigns = async (accountId: string) => {
    setSyncing(accountId);
    try {
      await syncGoogleAdsCampaigns(accountId);
      await loadAccounts();
      alert('Campaigns synced successfully!');
    } catch (error) {
      console.error('Sync failed:', error);
      alert('Failed to sync campaigns');
    } finally {
      setSyncing(null);
    }
  };

  const handleDeleteAccount = async (accountId: string) => {
    if (!confirm('Are you sure you want to disconnect this ad account?')) return;

    try {
      await deleteAdAccount(accountId);
      setAccounts(accounts.filter(a => a.id !== accountId));
    } catch (error) {
      console.error('Delete failed:', error);
      alert('Failed to delete account');
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="text-xl text-gray-600">Loading...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-2 flex items-center">
          <Settings className="h-8 w-8 mr-3 text-orange-600" />
          Ad Accounts Setup
        </h1>
        <p className="text-gray-600">Connect and manage your Google Ads and Meta Ads accounts</p>
      </div>

      {/* Connected Accounts */}
      <div className="bg-white rounded-lg shadow mb-6">
        <div className="p-6 border-b border-gray-200 flex items-center justify-between">
          <h2 className="text-xl font-semibold text-gray-900">Connected Accounts</h2>
          <button
            onClick={() => setShowAddModal(true)}
            className="inline-flex items-center px-4 py-2 bg-orange-600 text-white rounded-md hover:bg-orange-700"
          >
            <Plus className="h-4 w-4 mr-2" />
            Add Account
          </button>
        </div>

        {accounts.length === 0 ? (
          <div className="p-12 text-center">
            <Settings className="h-16 w-16 mx-auto text-gray-300 mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">No accounts connected</h3>
            <p className="text-gray-500 mb-6">Connect your Google Ads or Meta Ads account to start tracking performance</p>
            <button
              onClick={() => setShowAddModal(true)}
              className="inline-flex items-center px-6 py-3 bg-orange-600 text-white rounded-md hover:bg-orange-700"
            >
              <Plus className="h-5 w-5 mr-2" />
              Connect Ad Account
            </button>
          </div>
        ) : (
          <div className="divide-y divide-gray-200">
            {accounts.map((account) => (
              <div key={account.id} className="p-6 flex items-center justify-between">
                <div className="flex-1">
                  <div className="flex items-center space-x-3">
                    <div className={`w-10 h-10 rounded-full flex items-center justify-center ${
                      account.platform === 'google_ads' ? 'bg-blue-100' : 'bg-blue-600'
                    }`}>
                      {account.platform === 'google_ads' ? (
                        <span className="text-blue-600 font-bold text-sm">G</span>
                      ) : (
                        <span className="text-white font-bold text-sm">M</span>
                      )}
                    </div>
                    <div>
                      <h3 className="text-lg font-medium text-gray-900">{account.account_name}</h3>
                      <p className="text-sm text-gray-500">
                        {account.platform === 'google_ads' ? 'Google Ads' : 'Meta Ads'} • ID: {account.account_id}
                      </p>
                    </div>
                  </div>

                  <div className="mt-3 flex items-center space-x-4 text-sm">
                    <div className="flex items-center">
                      {account.status === 'active' ? (
                        <>
                          <CheckCircle className="h-4 w-4 text-green-500 mr-1" />
                          <span className="text-green-700">Active</span>
                        </>
                      ) : (
                        <>
                          <XCircle className="h-4 w-4 text-red-500 mr-1" />
                          <span className="text-red-700">Error</span>
                        </>
                      )}
                    </div>
                    {account.last_synced_at && (
                      <span className="text-gray-500">
                        Last synced: {new Date(account.last_synced_at).toLocaleDateString()}
                      </span>
                    )}
                  </div>
                </div>

                <div className="flex items-center space-x-3">
                  <button
                    onClick={() => handleSyncCampaigns(account.id)}
                    disabled={syncing === account.id}
                    className="inline-flex items-center px-4 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50"
                  >
                    <RefreshCw className={`h-4 w-4 mr-2 ${syncing === account.id ? 'animate-spin' : ''}`} />
                    Sync
                  </button>
                  <button
                    onClick={() => handleDeleteAccount(account.id)}
                    className="inline-flex items-center px-4 py-2 border border-red-300 rounded-md text-sm font-medium text-red-700 hover:bg-red-50"
                  >
                    <Trash2 className="h-4 w-4 mr-2" />
                    Disconnect
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Add Account Modal */}
      {showAddModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg max-w-md w-full p-6">
            <h3 className="text-xl font-semibold text-gray-900 mb-4">Connect Ad Account</h3>

            <div className="space-y-4">
              <button
                onClick={handleConnectGoogleAds}
                className="w-full flex items-center justify-between p-4 border-2 border-gray-200 rounded-lg hover:border-blue-500 hover:bg-blue-50 transition-colors"
              >
                <div className="flex items-center">
                  <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center mr-4">
                    <span className="text-blue-600 font-bold">G</span>
                  </div>
                  <div className="text-left">
                    <div className="font-medium text-gray-900">Google Ads</div>
                    <div className="text-sm text-gray-500">Connect your Google Ads account</div>
                  </div>
                </div>
                <svg className="h-5 w-5 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                </svg>
              </button>

              <button
                onClick={handleConnectMetaAds}
                className="w-full flex items-center justify-between p-4 border-2 border-gray-200 rounded-lg hover:border-blue-600 hover:bg-blue-50 transition-colors"
              >
                <div className="flex items-center">
                  <div className="w-12 h-12 bg-blue-600 rounded-full flex items-center justify-center mr-4">
                    <span className="text-white font-bold">M</span>
                  </div>
                  <div className="text-left">
                    <div className="font-medium text-gray-900">Meta Ads</div>
                    <div className="text-sm text-gray-500">Facebook & Instagram</div>
                  </div>
                </div>
                <svg className="h-5 w-5 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                </svg>
              </button>
            </div>

            <button
              onClick={() => setShowAddModal(false)}
              className="mt-6 w-full px-4 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 hover:bg-gray-50"
            >
              Cancel
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdAccountsSetup;
