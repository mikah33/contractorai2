import React, { useState, useEffect } from 'react';
import {
  TrendingUp,
  DollarSign,
  MousePointer,
  Users,
  Target,
  Activity,
  BarChart3,
  PieChart,
} from 'lucide-react';
import { AnalyticsSummary, RealTimeMetrics, AdMetrics } from '../types/analytics';
import { getAnalyticsSummary, getRealTimeMetrics } from '../services/analytics';

const AnalyticsDashboard: React.FC = () => {
  const [dateRange, setDateRange] = useState({
    start: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
    end: new Date().toISOString().split('T')[0],
  });

  const [summary, setSummary] = useState<AnalyticsSummary | null>(null);
  const [realTime, setRealTime] = useState<RealTimeMetrics | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadAnalytics();

    // Refresh real-time metrics every 30 seconds
    const interval = setInterval(loadRealTimeMetrics, 30000);
    return () => clearInterval(interval);
  }, [dateRange]);

  const loadAnalytics = async () => {
    setLoading(true);
    try {
      const [summaryData, realTimeData] = await Promise.all([
        getAnalyticsSummary(dateRange.start, dateRange.end),
        getRealTimeMetrics(),
      ]);

      setSummary(summaryData);
      setRealTime(realTimeData);
    } catch (error) {
      console.error('Failed to load analytics:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadRealTimeMetrics = async () => {
    try {
      const data = await getRealTimeMetrics();
      setRealTime(data);
    } catch (error) {
      console.error('Failed to load real-time metrics:', error);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="text-xl text-gray-600">Loading analytics...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">Ad Analytics Dashboard</h1>
        <p className="text-gray-600">Track your marketing performance and ROI</p>
      </div>

      {/* Date Range Selector */}
      <div className="bg-white rounded-lg shadow p-4 mb-6">
        <div className="flex items-center space-x-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Start Date</label>
            <input
              type="date"
              value={dateRange.start}
              onChange={(e) => setDateRange({ ...dateRange, start: e.target.value })}
              className="border border-gray-300 rounded-md px-3 py-2"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">End Date</label>
            <input
              type="date"
              value={dateRange.end}
              onChange={(e) => setDateRange({ ...dateRange, end: e.target.value })}
              className="border border-gray-300 rounded-md px-3 py-2"
            />
          </div>
          <button
            onClick={loadAnalytics}
            className="mt-6 px-6 py-2 bg-orange-600 text-white rounded-md hover:bg-orange-700"
          >
            Update
          </button>
        </div>
      </div>

      {/* Real-Time Metrics */}
      {realTime && (
        <div className="bg-gradient-to-r from-orange-500 to-orange-600 rounded-lg shadow-lg p-6 mb-6 text-white">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-semibold flex items-center">
              <Activity className="h-5 w-5 mr-2" />
              Real-Time Activity
            </h2>
            <span className="text-sm opacity-90">Live</span>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div>
              <div className="text-3xl font-bold">{realTime.active_users}</div>
              <div className="text-sm opacity-90">Active Users</div>
            </div>
            <div>
              <div className="text-3xl font-bold">{realTime.active_sessions}</div>
              <div className="text-sm opacity-90">Active Sessions</div>
            </div>
            <div>
              <div className="text-3xl font-bold">{realTime.current_conversions_today}</div>
              <div className="text-sm opacity-90">Conversions Today</div>
            </div>
            <div>
              <div className="text-3xl font-bold">${realTime.current_spend_today.toFixed(2)}</div>
              <div className="text-sm opacity-90">Spend Today</div>
            </div>
          </div>
        </div>
      )}

      {/* Key Metrics */}
      {summary && (
        <>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-6">
            <MetricCard
              icon={<DollarSign className="h-6 w-6" />}
              title="Total Spend"
              value={`$${summary.total_spend.toFixed(2)}`}
              change="+12.5%"
              positive={false}
            />
            <MetricCard
              icon={<MousePointer className="h-6 w-6" />}
              title="Total Clicks"
              value={summary.total_clicks.toLocaleString()}
              change="+8.2%"
              positive={true}
            />
            <MetricCard
              icon={<Target className="h-6 w-6" />}
              title="Conversions"
              value={summary.total_conversions.toLocaleString()}
              change="+15.3%"
              positive={true}
            />
            <MetricCard
              icon={<TrendingUp className="h-6 w-6" />}
              title="ROAS"
              value={`${summary.avg_roas.toFixed(2)}x`}
              change="+18.7%"
              positive={true}
            />
          </div>

          {/* Platform Breakdown */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
            <div className="bg-white rounded-lg shadow p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
                <PieChart className="h-5 w-5 mr-2 text-orange-600" />
                Platform Performance
              </h3>
              <div className="space-y-4">
                {summary.platform_breakdown.map((platform) => (
                  <div key={platform.platform} className="flex items-center justify-between">
                    <div className="flex-1">
                      <div className="text-sm font-medium text-gray-900 capitalize">
                        {platform.platform.replace('_', ' ')}
                      </div>
                      <div className="text-xs text-gray-500">
                        ${platform.spend.toFixed(2)} spend
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="text-sm font-semibold text-gray-900">
                        {platform.conversions} conv
                      </div>
                      <div className="text-xs text-green-600">
                        {platform.roas.toFixed(2)}x ROAS
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Top Campaigns */}
            <div className="bg-white rounded-lg shadow p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
                <BarChart3 className="h-5 w-5 mr-2 text-orange-600" />
                Top Campaigns
              </h3>
              <div className="space-y-4">
                {summary.top_campaigns.map((campaign) => (
                  <div key={campaign.campaign_id} className="flex items-center justify-between">
                    <div className="flex-1">
                      <div className="text-sm font-medium text-gray-900">{campaign.name}</div>
                      <div className="text-xs text-gray-500 capitalize">
                        {campaign.platform.replace('_', ' ')}
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="text-sm font-semibold text-gray-900">
                        {campaign.conversions} conv
                      </div>
                      <div className="text-xs text-green-600">
                        {campaign.roas.toFixed(2)}x ROAS
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Performance Chart Placeholder */}
          <div className="bg-white rounded-lg shadow p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Performance Trend</h3>
            <div className="h-64 flex items-center justify-center text-gray-400">
              Chart visualization will be added with AI integration
            </div>
          </div>
        </>
      )}
    </div>
  );
};

// Metric Card Component
interface MetricCardProps {
  icon: React.ReactNode;
  title: string;
  value: string;
  change: string;
  positive: boolean;
}

const MetricCard: React.FC<MetricCardProps> = ({ icon, title, value, change, positive }) => {
  return (
    <div className="bg-white rounded-lg shadow p-6">
      <div className="flex items-center justify-between mb-2">
        <div className="text-gray-500">{icon}</div>
        <span className={`text-sm font-medium ${positive ? 'text-green-600' : 'text-red-600'}`}>
          {change}
        </span>
      </div>
      <h3 className="text-sm font-medium text-gray-600 mb-1">{title}</h3>
      <p className="text-2xl font-bold text-gray-900">{value}</p>
    </div>
  );
};

export default AnalyticsDashboard;
