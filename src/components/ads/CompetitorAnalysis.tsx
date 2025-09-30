import { useState } from 'react';
import { Plus, Search, RefreshCw, Trash2, ExternalLink, TrendingUp, Eye } from 'lucide-react';
import { useAdAnalyzerStore } from '../../stores/adAnalyzerStore';

const CompetitorAnalysis = () => {
  const [showAddModal, setShowAddModal] = useState(false);
  const [newCompetitorDomain, setNewCompetitorDomain] = useState('');
  
  const { 
    competitors, 
    loading, 
    addCompetitor, 
    removeCompetitor, 
    refreshCompetitorData 
  } = useAdAnalyzerStore();

  const handleAddCompetitor = async () => {
    if (!newCompetitorDomain.trim()) return;
    
    await addCompetitor(newCompetitorDomain.trim());
    setNewCompetitorDomain('');
    setShowAddModal(false);
  };

  const handleRemoveCompetitor = async (competitorId: string) => {
    if (confirm('Are you sure you want to remove this competitor?')) {
      await removeCompetitor(competitorId);
    }
  };

  const handleRefreshCompetitor = async (competitorId: string) => {
    await refreshCompetitorData(competitorId);
  };

  return (
    <div className="bg-white rounded-lg shadow">
      <div className="p-6 border-b border-gray-200">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-lg font-medium text-gray-900">Competitor Analysis</h2>
            <p className="mt-1 text-sm text-gray-600">
              Monitor your competitors' advertising strategies and performance
            </p>
          </div>
          <button
            onClick={() => setShowAddModal(true)}
            className="inline-flex items-center px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
          >
            <Plus className="w-4 h-4 mr-2" />
            Add Competitor
          </button>
        </div>
      </div>

      <div className="p-6">
        {competitors.length === 0 ? (
          <div className="text-center py-12">
            <div className="w-16 h-16 mx-auto bg-gray-100 rounded-full flex items-center justify-center mb-4">
              <Search className="w-8 h-8 text-gray-400" />
            </div>
            <h3 className="text-lg font-medium text-gray-900 mb-2">No competitors added</h3>
            <p className="text-gray-600 mb-6">Add competitors to analyze their advertising strategies</p>
            <button
              onClick={() => setShowAddModal(true)}
              className="inline-flex items-center px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-md hover:bg-blue-700"
            >
              <Plus className="w-4 h-4 mr-2" />
              Add Your First Competitor
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
            {competitors.map((competitor) => (
              <div key={competitor.id} className="border border-gray-200 rounded-lg p-6">
                <div className="flex items-center justify-between mb-4">
                  <div>
                    <h3 className="text-lg font-medium text-gray-900">{competitor.name}</h3>
                    <a
                      href={`https://${competitor.domain}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-sm text-blue-600 hover:text-blue-700 flex items-center"
                    >
                      {competitor.domain}
                      <ExternalLink className="w-3 h-3 ml-1" />
                    </a>
                  </div>
                  <div className="flex items-center space-x-2">
                    <button
                      onClick={() => handleRefreshCompetitor(competitor.id)}
                      disabled={loading}
                      className="p-2 text-gray-400 hover:text-gray-600"
                      title="Refresh data"
                    >
                      <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
                    </button>
                    <button
                      onClick={() => handleRemoveCompetitor(competitor.id)}
                      className="p-2 text-gray-400 hover:text-red-600"
                      title="Remove competitor"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>

                <div className="space-y-4">
                  <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                    <div className="flex items-center">
                      <TrendingUp className="w-5 h-5 text-green-500 mr-2" />
                      <span className="text-sm font-medium text-gray-700">Estimated Monthly Spend</span>
                    </div>
                    <span className="text-lg font-semibold text-gray-900">
                      ${competitor.estimatedSpend.toLocaleString()}
                    </span>
                  </div>

                  <div>
                    <h4 className="text-sm font-medium text-gray-900 mb-2">Top Keywords</h4>
                    <div className="flex flex-wrap gap-2">
                      {competitor.topKeywords.map((keyword, index) => (
                        <span
                          key={index}
                          className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800"
                        >
                          {keyword}
                        </span>
                      ))}
                    </div>
                  </div>

                  <div>
                    <h4 className="text-sm font-medium text-gray-900 mb-2">Recent Ad Copy</h4>
                    <div className="space-y-2">
                      {competitor.adCopy.map((copy, index) => (
                        <div key={index} className="p-2 bg-gray-50 rounded text-sm text-gray-700">
                          "{copy}"
                        </div>
                      ))}
                    </div>
                  </div>

                  <div>
                    <h4 className="text-sm font-medium text-gray-900 mb-2">Landing Pages</h4>
                    <div className="space-y-1">
                      {competitor.landingPages.map((page, index) => (
                        <a
                          key={index}
                          href={page}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="block text-sm text-blue-600 hover:text-blue-700 truncate"
                        >
                          {page}
                        </a>
                      ))}
                    </div>
                  </div>

                  <div className="text-xs text-gray-500 pt-2 border-t">
                    Last updated: {new Date(competitor.lastUpdated).toLocaleDateString()}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Add Competitor Modal */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 overflow-y-auto">
          <div className="flex items-center justify-center min-h-screen px-4">
            <div className="fixed inset-0 bg-gray-500 bg-opacity-75 transition-opacity" onClick={() => setShowAddModal(false)}></div>

            <div className="relative bg-white rounded-lg shadow-xl max-w-md w-full mx-4">
              <div className="flex items-center justify-between p-6 border-b">
                <h3 className="text-lg font-medium text-gray-900">Add Competitor</h3>
                <button
                  onClick={() => setShowAddModal(false)}
                  className="text-gray-400 hover:text-gray-500"
                >
                  <span className="sr-only">Close</span>
                  <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>

              <div className="p-6">
                <div className="mb-4">
                  <label htmlFor="domain" className="block text-sm font-medium text-gray-700">
                    Competitor Domain
                  </label>
                  <input
                    type="text"
                    id="domain"
                    value={newCompetitorDomain}
                    onChange={(e) => setNewCompetitorDomain(e.target.value)}
                    placeholder="example.com"
                    className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                  />
                  <p className="mt-2 text-sm text-gray-500">
                    Enter the domain name of your competitor (without http:// or www.)
                  </p>
                </div>

                <div className="bg-blue-50 border border-blue-200 rounded-md p-4">
                  <div className="flex">
                    <Eye className="w-5 h-5 text-blue-400" />
                    <div className="ml-3">
                      <h4 className="text-sm font-medium text-blue-800">What we'll analyze</h4>
                      <ul className="mt-2 text-sm text-blue-700 list-disc list-inside">
                        <li>Estimated ad spend</li>
                        <li>Top performing keywords</li>
                        <li>Ad copy and messaging</li>
                        <li>Landing page strategies</li>
                      </ul>
                    </div>
                  </div>
                </div>
              </div>

              <div className="flex justify-end space-x-3 p-6 border-t">
                <button
                  onClick={() => setShowAddModal(false)}
                  className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50"
                >
                  Cancel
                </button>
                <button
                  onClick={handleAddCompetitor}
                  disabled={!newCompetitorDomain.trim() || loading}
                  className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {loading ? 'Adding...' : 'Add Competitor'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default CompetitorAnalysis;