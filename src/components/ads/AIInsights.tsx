import { useState } from 'react';
import { Brain, TrendingUp, AlertTriangle, Lightbulb, Target, Check, X, RefreshCw } from 'lucide-react';
import { useAdAnalyzerStore } from '../../stores/adAnalyzerStore';
import { AIInsight, AdRecommendation } from '../../types/ads';

const AIInsights = () => {
  const [activeTab, setActiveTab] = useState<'insights' | 'recommendations'>('insights');
  const [selectedInsight, setSelectedInsight] = useState<AIInsight | null>(null);
  
  const { 
    insights, 
    recommendations, 
    campaigns,
    loading,
    generateInsights,
    generateRecommendations,
    applyRecommendation,
    dismissRecommendation
  } = useAdAnalyzerStore();

  const handleGenerateInsights = async () => {
    const campaignIds = campaigns.map(c => c.id);
    await generateInsights(campaignIds);
  };

  const handleGenerateRecommendations = async (campaignId: string) => {
    await generateRecommendations(campaignId);
  };

  const handleApplyRecommendation = async (recommendationId: string) => {
    await applyRecommendation(recommendationId);
  };

  const handleDismissRecommendation = async (recommendationId: string) => {
    await dismissRecommendation(recommendationId);
  };

  const getInsightIcon = (type: AIInsight['type']) => {
    switch (type) {
      case 'optimization':
        return <TrendingUp className="w-5 h-5 text-green-500" />;
      case 'warning':
        return <AlertTriangle className="w-5 h-5 text-yellow-500" />;
      case 'opportunity':
        return <Lightbulb className="w-5 h-5 text-blue-500" />;
      case 'trend':
        return <Target className="w-5 h-5 text-purple-500" />;
      default:
        return <Brain className="w-5 h-5 text-gray-500" />;
    }
  };

  const getInsightColor = (type: AIInsight['type']) => {
    switch (type) {
      case 'optimization':
        return 'bg-green-50 border-green-200';
      case 'warning':
        return 'bg-yellow-50 border-yellow-200';
      case 'opportunity':
        return 'bg-blue-50 border-blue-200';
      case 'trend':
        return 'bg-purple-50 border-purple-200';
      default:
        return 'bg-gray-50 border-gray-200';
    }
  };

  const getImpactColor = (impact: string) => {
    switch (impact) {
      case 'high':
        return 'bg-red-100 text-red-800';
      case 'medium':
        return 'bg-yellow-100 text-yellow-800';
      case 'low':
        return 'bg-green-100 text-green-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const getRecommendationIcon = (type: AdRecommendation['type']) => {
    switch (type) {
      case 'budget':
        return '💰';
      case 'targeting':
        return '🎯';
      case 'creative':
        return '🎨';
      case 'bidding':
        return '📊';
      case 'schedule':
        return '⏰';
      default:
        return '💡';
    }
  };

  return (
    <div className="bg-white rounded-lg shadow">
      <div className="p-6 border-b border-gray-200">
        <div className="flex items-center justify-between">
          <div className="flex items-center">
            <Brain className="w-6 h-6 text-blue-600 mr-3" />
            <div>
              <h2 className="text-lg font-medium text-gray-900">AI Insights & Recommendations</h2>
              <p className="text-sm text-gray-600">AI-powered analysis of your ad performance</p>
            </div>
          </div>
          <button
            onClick={handleGenerateInsights}
            disabled={loading}
            className="inline-flex items-center px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-md hover:bg-blue-700 disabled:opacity-50"
          >
            <RefreshCw className={`w-4 h-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
            {loading ? 'Analyzing...' : 'Refresh Analysis'}
          </button>
        </div>

        <div className="mt-4">
          <nav className="flex space-x-8">
            <button
              onClick={() => setActiveTab('insights')}
              className={`py-2 px-1 border-b-2 font-medium text-sm ${
                activeTab === 'insights'
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              Insights ({insights.length})
            </button>
            <button
              onClick={() => setActiveTab('recommendations')}
              className={`py-2 px-1 border-b-2 font-medium text-sm ${
                activeTab === 'recommendations'
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              Recommendations ({recommendations.filter(r => r.status === 'pending').length})
            </button>
          </nav>
        </div>
      </div>

      <div className="p-6">
        {activeTab === 'insights' ? (
          <div className="space-y-4">
            {insights.length === 0 ? (
              <div className="text-center py-12">
                <Brain className="w-16 h-16 mx-auto text-gray-300 mb-4" />
                <h3 className="text-lg font-medium text-gray-900 mb-2">No insights available</h3>
                <p className="text-gray-600 mb-6">Generate AI insights to get performance analysis</p>
                <button
                  onClick={handleGenerateInsights}
                  className="inline-flex items-center px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-md hover:bg-blue-700"
                >
                  <Brain className="w-4 h-4 mr-2" />
                  Generate Insights
                </button>
              </div>
            ) : (
              insights.map((insight) => (
                <div
                  key={insight.id}
                  className={`border rounded-lg p-4 cursor-pointer transition-all hover:shadow-md ${getInsightColor(insight.type)}`}
                  onClick={() => setSelectedInsight(insight)}
                >
                  <div className="flex items-start justify-between">
                    <div className="flex items-start space-x-3">
                      {getInsightIcon(insight.type)}
                      <div className="flex-1">
                        <h3 className="text-sm font-medium text-gray-900">{insight.title}</h3>
                        <p className="text-sm text-gray-600 mt-1">{insight.description}</p>
                        {insight.actionable && (
                          <p className="text-sm text-blue-600 mt-2 font-medium">{insight.recommendation}</p>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center space-x-2">
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getImpactColor(insight.impact)}`}>
                        {insight.impact} impact
                      </span>
                      <div className="text-xs text-gray-500">
                        {insight.confidence}% confidence
                      </div>
                    </div>
                  </div>
                  {insight.estimatedImprovement && (
                    <div className="mt-3 p-2 bg-white rounded border">
                      <div className="text-xs text-gray-600">Estimated improvement:</div>
                      <div className="text-sm font-medium text-green-600">{insight.estimatedImprovement}</div>
                    </div>
                  )}
                </div>
              ))
            )}
          </div>
        ) : (
          <div className="space-y-4">
            {recommendations.filter(r => r.status === 'pending').length === 0 ? (
              <div className="text-center py-12">
                <Target className="w-16 h-16 mx-auto text-gray-300 mb-4" />
                <h3 className="text-lg font-medium text-gray-900 mb-2">No recommendations available</h3>
                <p className="text-gray-600 mb-6">AI will generate recommendations based on your campaign performance</p>
                {campaigns.length > 0 && (
                  <div className="space-y-2">
                    {campaigns.map(campaign => (
                      <button
                        key={campaign.id}
                        onClick={() => handleGenerateRecommendations(campaign.id)}
                        className="block w-full px-4 py-2 text-sm font-medium text-blue-600 bg-blue-50 rounded-md hover:bg-blue-100"
                      >
                        Generate recommendations for {campaign.name}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            ) : (
              recommendations
                .filter(r => r.status === 'pending')
                .map((recommendation) => (
                  <div key={recommendation.id} className="border border-gray-200 rounded-lg p-4">
                    <div className="flex items-start justify-between">
                      <div className="flex items-start space-x-3">
                        <div className="text-2xl">{getRecommendationIcon(recommendation.type)}</div>
                        <div className="flex-1">
                          <h3 className="text-sm font-medium text-gray-900">{recommendation.title}</h3>
                          <p className="text-sm text-gray-600 mt-1">{recommendation.description}</p>
                          
                          <div className="mt-3 grid grid-cols-2 gap-4">
                            <div>
                              <div className="text-xs text-gray-500">Current</div>
                              <div className="text-sm font-medium">{recommendation.currentValue}</div>
                            </div>
                            <div>
                              <div className="text-xs text-gray-500">Suggested</div>
                              <div className="text-sm font-medium text-blue-600">{recommendation.suggestedValue}</div>
                            </div>
                          </div>
                          
                          <div className="mt-2">
                            <div className="text-xs text-gray-500">Expected Impact</div>
                            <div className="text-sm font-medium text-green-600">{recommendation.expectedImpact}</div>
                          </div>
                        </div>
                      </div>
                      
                      <div className="flex items-center space-x-2">
                        <div className="text-xs text-gray-500">
                          {recommendation.confidence}% confidence
                        </div>
                        <button
                          onClick={() => handleApplyRecommendation(recommendation.id)}
                          className="inline-flex items-center px-3 py-1 text-xs font-medium text-white bg-green-600 rounded hover:bg-green-700"
                        >
                          <Check className="w-3 h-3 mr-1" />
                          Apply
                        </button>
                        <button
                          onClick={() => handleDismissRecommendation(recommendation.id)}
                          className="inline-flex items-center px-3 py-1 text-xs font-medium text-gray-700 bg-gray-100 rounded hover:bg-gray-200"
                        >
                          <X className="w-3 h-3 mr-1" />
                          Dismiss
                        </button>
                      </div>
                    </div>
                  </div>
                ))
            )}
          </div>
        )}
      </div>

      {/* Insight Detail Modal */}
      {selectedInsight && (
        <div className="fixed inset-0 z-50 overflow-y-auto">
          <div className="flex items-center justify-center min-h-screen px-4">
            <div className="fixed inset-0 bg-gray-500 bg-opacity-75 transition-opacity" onClick={() => setSelectedInsight(null)}></div>

            <div className="relative bg-white rounded-lg shadow-xl max-w-2xl w-full mx-4">
              <div className="flex items-center justify-between p-6 border-b">
                <div className="flex items-center">
                  {getInsightIcon(selectedInsight.type)}
                  <h3 className="ml-3 text-lg font-medium text-gray-900">{selectedInsight.title}</h3>
                </div>
                <button
                  onClick={() => setSelectedInsight(null)}
                  className="text-gray-400 hover:text-gray-500"
                >
                  <X className="w-6 h-6" />
                </button>
              </div>

              <div className="p-6">
                <div className="space-y-4">
                  <div>
                    <h4 className="text-sm font-medium text-gray-900">Description</h4>
                    <p className="text-sm text-gray-600 mt-1">{selectedInsight.description}</p>
                  </div>

                  <div>
                    <h4 className="text-sm font-medium text-gray-900">AI Recommendation</h4>
                    <p className="text-sm text-blue-600 mt-1">{selectedInsight.recommendation}</p>
                  </div>

                  <div className="grid grid-cols-3 gap-4">
                    <div>
                      <h4 className="text-sm font-medium text-gray-900">Impact Level</h4>
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium mt-1 ${getImpactColor(selectedInsight.impact)}`}>
                        {selectedInsight.impact}
                      </span>
                    </div>
                    <div>
                      <h4 className="text-sm font-medium text-gray-900">Confidence</h4>
                      <p className="text-sm text-gray-600 mt-1">{selectedInsight.confidence}%</p>
                    </div>
                    <div>
                      <h4 className="text-sm font-medium text-gray-900">Type</h4>
                      <p className="text-sm text-gray-600 mt-1 capitalize">{selectedInsight.type}</p>
                    </div>
                  </div>

                  {selectedInsight.estimatedImprovement && (
                    <div>
                      <h4 className="text-sm font-medium text-gray-900">Estimated Improvement</h4>
                      <p className="text-sm text-green-600 mt-1 font-medium">{selectedInsight.estimatedImprovement}</p>
                    </div>
                  )}

                  <div>
                    <h4 className="text-sm font-medium text-gray-900">Related Campaigns</h4>
                    <div className="mt-1 space-y-1">
                      {selectedInsight.relatedCampaigns.map(campaignId => {
                        const campaign = campaigns.find(c => c.id === campaignId);
                        return campaign ? (
                          <span key={campaignId} className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800 mr-2">
                            {campaign.name}
                          </span>
                        ) : null;
                      })}
                    </div>
                  </div>
                </div>
              </div>

              <div className="flex justify-end space-x-3 p-6 border-t">
                <button
                  onClick={() => setSelectedInsight(null)}
                  className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50"
                >
                  Close
                </button>
                {selectedInsight.actionable && (
                  <button className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-md hover:bg-blue-700">
                    Take Action
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AIInsights;