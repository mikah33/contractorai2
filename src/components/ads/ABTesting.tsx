import { useState } from 'react';
import { Plus, Play, Pause, BarChart3, Trophy, Clock, Users } from 'lucide-react';
import { useAdAnalyzerStore } from '../../stores/adAnalyzerStore';
import { ABTest, ABTestVariant } from '../../types/ads';

const ABTesting = () => {
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [newTest, setNewTest] = useState<Partial<ABTest>>({
    name: '',
    campaignId: '',
    status: 'running',
    startDate: new Date().toISOString().split('T')[0],
    metric: 'conversions',
    variants: []
  });

  const { 
    abTests, 
    campaigns, 
    loading, 
    createABTest, 
    updateABTest 
  } = useAdAnalyzerStore();

  const handleCreateTest = async () => {
    if (!newTest.name || !newTest.campaignId || !newTest.variants || newTest.variants.length < 2) {
      return;
    }

    await createABTest(newTest as Omit<ABTest, 'id'>);
    setShowCreateModal(false);
    setNewTest({
      name: '',
      campaignId: '',
      status: 'running',
      startDate: new Date().toISOString().split('T')[0],
      metric: 'conversions',
      variants: []
    });
  };

  const handleToggleTest = async (testId: string, currentStatus: string) => {
    const newStatus = currentStatus === 'running' ? 'paused' : 'running';
    await updateABTest(testId, { status: newStatus as any });
  };

  const addVariant = () => {
    const newVariant: ABTestVariant = {
      id: `variant-${Date.now()}`,
      name: `Variant ${(newTest.variants?.length || 0) + 1}`,
      creative: {
        headline: '',
        description: '',
        callToAction: 'Learn More'
      },
      metrics: {
        campaignId: newTest.campaignId || '',
        date: new Date().toISOString().split('T')[0],
        impressions: 0,
        clicks: 0,
        spend: 0,
        conversions: 0,
        ctr: 0,
        cpm: 0,
        cpc: 0,
        cpa: 0,
        roas: 0
      },
      trafficSplit: 50
    };

    setNewTest(prev => ({
      ...prev,
      variants: [...(prev.variants || []), newVariant]
    }));
  };

  const updateVariant = (index: number, field: string, value: any) => {
    setNewTest(prev => ({
      ...prev,
      variants: prev.variants?.map((variant, i) => 
        i === index 
          ? { 
              ...variant, 
              creative: field.startsWith('creative.') 
                ? { ...variant.creative, [field.split('.')[1]]: value }
                : { ...variant, [field]: value }
            }
          : variant
      )
    }));
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'running':
        return 'bg-green-100 text-green-800';
      case 'completed':
        return 'bg-blue-100 text-blue-800';
      case 'paused':
        return 'bg-yellow-100 text-yellow-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'running':
        return <Play className="w-4 h-4 text-green-600" />;
      case 'completed':
        return <Trophy className="w-4 h-4 text-blue-600" />;
      case 'paused':
        return <Pause className="w-4 h-4 text-yellow-600" />;
      default:
        return <Clock className="w-4 h-4 text-gray-600" />;
    }
  };

  return (
    <div className="bg-white rounded-lg shadow">
      <div className="p-6 border-b border-gray-200">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-lg font-medium text-gray-900">A/B Testing</h2>
            <p className="mt-1 text-sm text-gray-600">
              Test different ad variations to optimize performance
            </p>
          </div>
          <button
            onClick={() => setShowCreateModal(true)}
            className="inline-flex items-center px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
          >
            <Plus className="w-4 h-4 mr-2" />
            Create Test
          </button>
        </div>
      </div>

      <div className="p-6">
        {abTests.length === 0 ? (
          <div className="text-center py-12">
            <div className="w-16 h-16 mx-auto bg-gray-100 rounded-full flex items-center justify-center mb-4">
              <BarChart3 className="w-8 h-8 text-gray-400" />
            </div>
            <h3 className="text-lg font-medium text-gray-900 mb-2">No A/B tests running</h3>
            <p className="text-gray-600 mb-6">Create your first A/B test to optimize ad performance</p>
            <button
              onClick={() => setShowCreateModal(true)}
              className="inline-flex items-center px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-md hover:bg-blue-700"
            >
              <Plus className="w-4 h-4 mr-2" />
              Create Your First Test
            </button>
          </div>
        ) : (
          <div className="space-y-6">
            {abTests.map((test) => (
              <div key={test.id} className="border border-gray-200 rounded-lg p-6">
                <div className="flex items-center justify-between mb-4">
                  <div>
                    <h3 className="text-lg font-medium text-gray-900">{test.name}</h3>
                    <p className="text-sm text-gray-600">
                      Campaign: {campaigns.find(c => c.id === test.campaignId)?.name}
                    </p>
                  </div>
                  <div className="flex items-center space-x-3">
                    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getStatusColor(test.status)}`}>
                      {getStatusIcon(test.status)}
                      <span className="ml-1">{test.status}</span>
                    </span>
                    <button
                      onClick={() => handleToggleTest(test.id, test.status)}
                      className="inline-flex items-center px-3 py-1 text-xs font-medium text-gray-700 bg-gray-100 rounded hover:bg-gray-200"
                    >
                      {test.status === 'running' ? (
                        <>
                          <Pause className="w-3 h-3 mr-1" />
                          Pause
                        </>
                      ) : (
                        <>
                          <Play className="w-3 h-3 mr-1" />
                          Resume
                        </>
                      )}
                    </button>
                  </div>
                </div>

                <div className="grid grid-cols-1 gap-4 mb-6 sm:grid-cols-3">
                  <div className="text-center p-3 bg-gray-50 rounded-lg">
                    <div className="text-sm text-gray-600">Duration</div>
                    <div className="text-lg font-semibold text-gray-900">
                      {Math.ceil((new Date().getTime() - new Date(test.startDate).getTime()) / (1000 * 60 * 60 * 24))} days
                    </div>
                  </div>
                  <div className="text-center p-3 bg-gray-50 rounded-lg">
                    <div className="text-sm text-gray-600">Confidence</div>
                    <div className="text-lg font-semibold text-gray-900">{test.confidence}%</div>
                  </div>
                  <div className="text-center p-3 bg-gray-50 rounded-lg">
                    <div className="text-sm text-gray-600">Winner</div>
                    <div className="text-lg font-semibold text-gray-900">
                      {test.winner ? test.variants.find(v => v.id === test.winner)?.name : 'TBD'}
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
                  {test.variants.map((variant) => (
                    <div key={variant.id} className={`border rounded-lg p-4 ${
                      test.winner === variant.id ? 'border-green-500 bg-green-50' : 'border-gray-200'
                    }`}>
                      <div className="flex items-center justify-between mb-3">
                        <h4 className="font-medium text-gray-900">{variant.name}</h4>
                        {test.winner === variant.id && (
                          <Trophy className="w-5 h-5 text-green-500" />
                        )}
                      </div>

                      <div className="space-y-2 mb-4">
                        <div className="p-3 bg-white border rounded">
                          <div className="font-medium text-sm">{variant.creative.headline}</div>
                          <div className="text-sm text-gray-600 mt-1">{variant.creative.description}</div>
                          <div className="text-xs text-blue-600 mt-2">{variant.creative.callToAction}</div>
                        </div>
                      </div>

                      <div className="grid grid-cols-2 gap-4 text-sm">
                        <div>
                          <div className="text-gray-600">Impressions</div>
                          <div className="font-medium">{variant.metrics.impressions.toLocaleString()}</div>
                        </div>
                        <div>
                          <div className="text-gray-600">Clicks</div>
                          <div className="font-medium">{variant.metrics.clicks.toLocaleString()}</div>
                        </div>
                        <div>
                          <div className="text-gray-600">CTR</div>
                          <div className="font-medium">{variant.metrics.ctr.toFixed(2)}%</div>
                        </div>
                        <div>
                          <div className="text-gray-600">Conversions</div>
                          <div className="font-medium">{variant.metrics.conversions}</div>
                        </div>
                      </div>

                      <div className="mt-3 pt-3 border-t">
                        <div className="flex items-center justify-between text-sm">
                          <span className="text-gray-600">Traffic Split</span>
                          <span className="font-medium">{variant.trafficSplit}%</span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Create Test Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 z-50 overflow-y-auto">
          <div className="flex items-center justify-center min-h-screen px-4">
            <div className="fixed inset-0 bg-gray-500 bg-opacity-75 transition-opacity" onClick={() => setShowCreateModal(false)}></div>

            <div className="relative bg-white rounded-lg shadow-xl max-w-4xl w-full mx-4 max-h-screen overflow-y-auto">
              <div className="flex items-center justify-between p-6 border-b">
                <h3 className="text-lg font-medium text-gray-900">Create A/B Test</h3>
                <button
                  onClick={() => setShowCreateModal(false)}
                  className="text-gray-400 hover:text-gray-500"
                >
                  <span className="sr-only">Close</span>
                  <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>

              <div className="p-6">
                <div className="space-y-6">
                  <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                    <div>
                      <label className="block text-sm font-medium text-gray-700">Test Name</label>
                      <input
                        type="text"
                        value={newTest.name}
                        onChange={(e) => setNewTest(prev => ({ ...prev, name: e.target.value }))}
                        className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                        placeholder="e.g., Headline Test #1"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700">Campaign</label>
                      <select
                        value={newTest.campaignId}
                        onChange={(e) => setNewTest(prev => ({ ...prev, campaignId: e.target.value }))}
                        className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                      >
                        <option value="">Select Campaign</option>
                        {campaigns.map(campaign => (
                          <option key={campaign.id} value={campaign.id}>{campaign.name}</option>
                        ))}
                      </select>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                    <div>
                      <label className="block text-sm font-medium text-gray-700">Start Date</label>
                      <input
                        type="date"
                        value={newTest.startDate}
                        onChange={(e) => setNewTest(prev => ({ ...prev, startDate: e.target.value }))}
                        className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700">Primary Metric</label>
                      <select
                        value={newTest.metric}
                        onChange={(e) => setNewTest(prev => ({ ...prev, metric: e.target.value }))}
                        className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                      >
                        <option value="conversions">Conversions</option>
                        <option value="clicks">Clicks</option>
                        <option value="ctr">Click-through Rate</option>
                        <option value="cpc">Cost per Click</option>
                      </select>
                    </div>
                  </div>

                  <div>
                    <div className="flex items-center justify-between mb-4">
                      <h4 className="text-lg font-medium text-gray-900">Test Variants</h4>
                      <button
                        onClick={addVariant}
                        className="inline-flex items-center px-3 py-1 text-sm font-medium text-blue-600 bg-blue-50 rounded hover:bg-blue-100"
                      >
                        <Plus className="w-4 h-4 mr-1" />
                        Add Variant
                      </button>
                    </div>

                    <div className="space-y-4">
                      {newTest.variants?.map((variant, index) => (
                        <div key={variant.id} className="border border-gray-200 rounded-lg p-4">
                          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                            <div>
                              <label className="block text-sm font-medium text-gray-700">Variant Name</label>
                              <input
                                type="text"
                                value={variant.name}
                                onChange={(e) => updateVariant(index, 'name', e.target.value)}
                                className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                              />
                            </div>
                            <div>
                              <label className="block text-sm font-medium text-gray-700">Traffic Split (%)</label>
                              <input
                                type="number"
                                value={variant.trafficSplit}
                                onChange={(e) => updateVariant(index, 'trafficSplit', parseInt(e.target.value))}
                                className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                                min="1"
                                max="100"
                              />
                            </div>
                          </div>

                          <div className="mt-4 space-y-3">
                            <div>
                              <label className="block text-sm font-medium text-gray-700">Headline</label>
                              <input
                                type="text"
                                value={variant.creative.headline}
                                onChange={(e) => updateVariant(index, 'creative.headline', e.target.value)}
                                className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                                placeholder="Enter ad headline"
                              />
                            </div>
                            <div>
                              <label className="block text-sm font-medium text-gray-700">Description</label>
                              <textarea
                                value={variant.creative.description}
                                onChange={(e) => updateVariant(index, 'creative.description', e.target.value)}
                                rows={2}
                                className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                                placeholder="Enter ad description"
                              />
                            </div>
                            <div>
                              <label className="block text-sm font-medium text-gray-700">Call to Action</label>
                              <input
                                type="text"
                                value={variant.creative.callToAction}
                                onChange={(e) => updateVariant(index, 'creative.callToAction', e.target.value)}
                                className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                                placeholder="e.g., Learn More, Get Quote"
                              />
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>

                    {(!newTest.variants || newTest.variants.length === 0) && (
                      <div className="text-center py-8 border-2 border-dashed border-gray-300 rounded-lg">
                        <Users className="w-12 h-12 mx-auto text-gray-400 mb-4" />
                        <p className="text-gray-600">Add at least 2 variants to create an A/B test</p>
                      </div>
                    )}
                  </div>
                </div>
              </div>

              <div className="flex justify-end space-x-3 p-6 border-t">
                <button
                  onClick={() => setShowCreateModal(false)}
                  className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50"
                >
                  Cancel
                </button>
                <button
                  onClick={handleCreateTest}
                  disabled={!newTest.name || !newTest.campaignId || !newTest.variants || newTest.variants.length < 2 || loading}
                  className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {loading ? 'Creating...' : 'Create Test'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ABTesting;