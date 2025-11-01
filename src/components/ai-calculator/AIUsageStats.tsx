import React from 'react';
import { TrendingUp, DollarSign, Zap, Clock } from 'lucide-react';
import { useAIUsageTracking } from '../../hooks/useAIUsageTracking';

export const AIUsageStats: React.FC = () => {
  const { summary, dailyUsage, loading, formatCost, formatTokens } = useAIUsageTracking();

  if (loading) {
    return (
      <div className="bg-white rounded-lg shadow p-6">
        <div className="animate-pulse space-y-4">
          <div className="h-4 bg-gray-200 rounded w-1/4"></div>
          <div className="grid grid-cols-4 gap-4">
            {[1, 2, 3, 4].map(i => (
              <div key={i} className="h-20 bg-gray-200 rounded"></div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  if (!summary) {
    return (
      <div className="bg-white rounded-lg shadow p-6 text-center text-gray-500">
        No usage data yet. Start using the AI calculator to see stats!
      </div>
    );
  }

  const totalTokens = summary.totalInputTokens + summary.totalOutputTokens;
  const avgCostPerRequest = summary.totalRequests > 0
    ? summary.totalCost / summary.totalRequests
    : 0;

  return (
    <div className="space-y-6">
      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        {/* Total Cost */}
        <div className="bg-gradient-to-br from-green-50 to-green-100 rounded-lg p-4 border border-green-200">
          <div className="flex items-center justify-between mb-2">
            <DollarSign className="w-5 h-5 text-green-600" />
            <span className="text-xs text-green-600 font-medium">Total Cost</span>
          </div>
          <div className="text-2xl font-bold text-green-900">
            {formatCost(summary.totalCost)}
          </div>
          <div className="text-xs text-green-600 mt-1">
            {formatCost(avgCostPerRequest)}/request
          </div>
        </div>

        {/* Total Requests */}
        <div className="bg-gradient-to-br from-blue-50 to-blue-100 rounded-lg p-4 border border-blue-200">
          <div className="flex items-center justify-between mb-2">
            <TrendingUp className="w-5 h-5 text-blue-600" />
            <span className="text-xs text-blue-600 font-medium">Requests</span>
          </div>
          <div className="text-2xl font-bold text-blue-900">
            {summary.totalRequests}
          </div>
          <div className="text-xs text-blue-600 mt-1">
            Total conversations
          </div>
        </div>

        {/* Total Tokens */}
        <div className="bg-gradient-to-br from-purple-50 to-purple-100 rounded-lg p-4 border border-purple-200">
          <div className="flex items-center justify-between mb-2">
            <Zap className="w-5 h-5 text-purple-600" />
            <span className="text-xs text-purple-600 font-medium">Tokens</span>
          </div>
          <div className="text-2xl font-bold text-purple-900">
            {formatTokens(totalTokens)}
          </div>
          <div className="text-xs text-purple-600 mt-1">
            {formatTokens(summary.totalInputTokens)} in / {formatTokens(summary.totalOutputTokens)} out
          </div>
        </div>

        {/* Avg Response Time */}
        <div className="bg-gradient-to-br from-orange-50 to-orange-100 rounded-lg p-4 border border-orange-200">
          <div className="flex items-center justify-between mb-2">
            <Clock className="w-5 h-5 text-orange-600" />
            <span className="text-xs text-orange-600 font-medium">Speed</span>
          </div>
          <div className="text-2xl font-bold text-orange-900">
            {summary.avgResponseTime.toFixed(0)}ms
          </div>
          <div className="text-xs text-orange-600 mt-1">
            Avg response time
          </div>
        </div>
      </div>

      {/* Daily Usage Chart */}
      {dailyUsage.length > 0 && (
        <div className="bg-white rounded-lg shadow p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">
            Daily Usage (Last 30 Days)
          </h3>
          <div className="space-y-2">
            {dailyUsage.slice(0, 7).map((day) => (
              <div key={day.date} className="flex items-center justify-between py-2 border-b border-gray-100">
                <div className="flex items-center gap-3">
                  <span className="text-sm text-gray-600 w-24">
                    {new Date(day.date).toLocaleDateString('en-US', {
                      month: 'short',
                      day: 'numeric'
                    })}
                  </span>
                  <span className="text-sm font-medium text-gray-900">
                    {day.requests} requests
                  </span>
                </div>
                <div className="flex items-center gap-4">
                  <span className="text-xs text-gray-500">
                    {formatTokens(day.inputTokens + day.outputTokens)} tokens
                  </span>
                  <span className="text-sm font-semibold text-green-600">
                    {formatCost(day.cost)}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Cost Breakdown */}
      <div className="bg-white rounded-lg shadow p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">
          Cost Breakdown
        </h3>
        <div className="space-y-3">
          <div className="flex justify-between items-center">
            <span className="text-sm text-gray-600">Input Tokens</span>
            <div className="text-right">
              <div className="text-sm font-medium text-gray-900">
                {formatTokens(summary.totalInputTokens)}
              </div>
              <div className="text-xs text-gray-500">
                @ $3.00/M tokens
              </div>
            </div>
          </div>
          <div className="flex justify-between items-center">
            <span className="text-sm text-gray-600">Output Tokens</span>
            <div className="text-right">
              <div className="text-sm font-medium text-gray-900">
                {formatTokens(summary.totalOutputTokens)}
              </div>
              <div className="text-xs text-gray-500">
                @ $15.00/M tokens
              </div>
            </div>
          </div>
          <div className="pt-3 border-t border-gray-200">
            <div className="flex justify-between items-center">
              <span className="text-base font-semibold text-gray-900">Total</span>
              <span className="text-xl font-bold text-green-600">
                {formatCost(summary.totalCost)}
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AIUsageStats;
