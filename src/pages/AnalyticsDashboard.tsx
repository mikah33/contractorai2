import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  TrendingUp,
  DollarSign,
  MousePointer,
  Users,
  Target,
  Activity,
  BarChart3,
  PieChart,
  Settings,
} from 'lucide-react';
import { AnalyticsSummary, RealTimeMetrics, AdMetrics } from '../types/analytics';
import { getAnalyticsSummary, getRealTimeMetrics } from '../services/analytics';
import { useTheme, getThemeClasses } from '../contexts/ThemeContext';

const AnalyticsDashboard: React.FC = () => {
  const navigate = useNavigate();
  const { theme } = useTheme();
  const themeClasses = getThemeClasses(theme);

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
      <div className={`flex items-center justify-center h-screen ${themeClasses.bg.primary}`}>
        <div className={`text-xl ${themeClasses.text.secondary}`}>Loading analytics...</div>
      </div>
    );
  }

  return (
    <div className={`min-h-full ${themeClasses.bg.primary} pb-24`}>
      {/* Header */}
      <div className={`fixed top-0 left-0 right-0 z-50 ${themeClasses.bg.secondary} border-b ${themeClasses.border.primary}`}>
        <div className="pt-[env(safe-area-inset-top)]">
          <div className="px-4 pb-5 pt-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <div className="w-14 h-14 bg-blue-500/20 rounded-xl flex items-center justify-center flex-shrink-0">
                  <BarChart3 className="w-7 h-7 text-blue-500" />
                </div>
                <div className="flex-1 min-w-0">
                  <h1 className={`text-2xl font-bold ${themeClasses.text.primary}`}>Analytics</h1>
                  <p className={`text-base ${themeClasses.text.secondary}`}>Track your marketing performance</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
      {/* Spacer for fixed header */}
      <div className="pt-[calc(env(safe-area-inset-top)+100px)]" />

      <div className="px-4 py-4">

      {/* Date Range Selector */}
      <div className={`${themeClasses.bg.secondary} rounded-lg shadow p-4 mb-6`}>
        <div className="flex items-center space-x-4">
          <div>
            <label className={`block text-sm font-medium ${themeClasses.text.secondary} mb-1`}>Start Date</label>
            <input
              type="date"
              value={dateRange.start}
              onChange={(e) => setDateRange({ ...dateRange, start: e.target.value })}
              className={`border ${themeClasses.border.primary} ${themeClasses.bg.input} ${themeClasses.text.primary} rounded-md px-3 py-2`}
            />
          </div>
          <div>
            <label className={`block text-sm font-medium ${themeClasses.text.secondary} mb-1`}>End Date</label>
            <input
              type="date"
              value={dateRange.end}
              onChange={(e) => setDateRange({ ...dateRange, end: e.target.value })}
              className={`border ${themeClasses.border.primary} ${themeClasses.bg.input} ${themeClasses.text.primary} rounded-md px-3 py-2`}
            />
          </div>
          <button
            onClick={loadAnalytics}
            className="mt-6 px-6 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
          >
            Update
          </button>
        </div>
      </div>

      {/* Real-Time Metrics */}
      {realTime && (
        <div className="bg-gradient-to-r from-blue-500 to-blue-600 rounded-lg shadow-lg p-6 mb-6 text-white">
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
            <div className={`${themeClasses.bg.secondary} rounded-lg shadow p-6`}>
              <h3 className={`text-lg font-semibold ${themeClasses.text.primary} mb-4 flex items-center`}>
                <PieChart className="h-5 w-5 mr-2 text-blue-600" />
                Platform Performance
              </h3>
              <div className="space-y-4">
                {summary.platform_breakdown.map((platform) => (
                  <div key={platform.platform} className="flex items-center justify-between">
                    <div className="flex-1">
                      <div className={`text-sm font-medium ${themeClasses.text.primary} capitalize`}>
                        {platform.platform.replace('_', ' ')}
                      </div>
                      <div className={`text-xs ${themeClasses.text.secondary}`}>
                        ${platform.spend.toFixed(2)} spend
                      </div>
                    </div>
                    <div className="text-right">
                      <div className={`text-sm font-semibold ${themeClasses.text.primary}`}>
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
            <div className={`${themeClasses.bg.secondary} rounded-lg shadow p-6`}>
              <h3 className={`text-lg font-semibold ${themeClasses.text.primary} mb-4 flex items-center`}>
                <BarChart3 className="h-5 w-5 mr-2 text-blue-600" />
                Top Campaigns
              </h3>
              <div className="space-y-4">
                {summary.top_campaigns.map((campaign) => (
                  <div key={campaign.campaign_id} className="flex items-center justify-between">
                    <div className="flex-1">
                      <div className={`text-sm font-medium ${themeClasses.text.primary}`}>{campaign.name}</div>
                      <div className={`text-xs ${themeClasses.text.secondary} capitalize`}>
                        {campaign.platform.replace('_', ' ')}
                      </div>
                    </div>
                    <div className="text-right">
                      <div className={`text-sm font-semibold ${themeClasses.text.primary}`}>
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
          <div className={`${themeClasses.bg.secondary} rounded-lg shadow p-6`}>
            <h3 className={`text-lg font-semibold ${themeClasses.text.primary} mb-4`}>Performance Trend</h3>
            <div className={`h-64 flex items-center justify-center ${themeClasses.text.secondary}`}>
              Chart visualization will be added with AI integration
            </div>
          </div>
        </>
      )}
      </div>
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
  const { theme } = useTheme();
  const themeClasses = getThemeClasses(theme);

  return (
    <div className={`${themeClasses.bg.secondary} rounded-lg shadow p-6`}>
      <div className="flex items-center justify-between mb-2">
        <div className={themeClasses.text.secondary}>{icon}</div>
        <span className={`text-sm font-medium ${positive ? 'text-green-600' : 'text-red-600'}`}>
          {change}
        </span>
      </div>
      <h3 className={`text-sm font-medium ${themeClasses.text.secondary} mb-1`}>{title}</h3>
      <p className={`text-2xl font-bold ${themeClasses.text.primary}`}>{value}</p>
    </div>
  );
};

export default AnalyticsDashboard;
