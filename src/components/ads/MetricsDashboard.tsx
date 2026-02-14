import { useState, useMemo } from 'react';
import { TrendingUp, TrendingDown, DollarSign, MousePointer, Eye, Target, Download, Filter } from 'lucide-react';
import { useAdAnalyzerStore } from '../../stores/adAnalyzerStore';

const MetricsDashboard = () => {
  const [selectedMetric, setSelectedMetric] = useState<string>('spend');
  const [chartType, setChartType] = useState<'line' | 'bar'>('line');
  
  const { 
    campaigns, 
    metrics, 
    dateRange, 
    setDateRange, 
    fetchMetrics,
    exportReport,
    loading 
  } = useAdAnalyzerStore();

  // Calculate aggregated metrics
  const aggregatedMetrics = useMemo(() => {
    if (!metrics.length) return null;

    const totals = metrics.reduce((acc, metric) => ({
      spend: acc.spend + metric.spend,
      impressions: acc.impressions + metric.impressions,
      clicks: acc.clicks + metric.clicks,
      conversions: acc.conversions + metric.conversions
    }), { spend: 0, impressions: 0, clicks: 0, conversions: 0 });

    const avgCTR = metrics.reduce((sum, m) => sum + m.ctr, 0) / metrics.length;
    const avgCPC = totals.spend / totals.clicks;
    const avgCPM = (totals.spend / totals.impressions) * 1000;
    const avgCPA = totals.spend / totals.conversions;
    const avgROAS = metrics.reduce((sum, m) => sum + m.roas, 0) / metrics.length;

    return {
      ...totals,
      ctr: avgCTR,
      cpc: avgCPC,
      cpm: avgCPM,
      cpa: avgCPA,
      roas: avgROAS
    };
  }, [metrics]);

  // Group metrics by date for charting
  const chartData = useMemo(() => {
    const grouped = metrics.reduce((acc, metric) => {
      if (!acc[metric.date]) {
        acc[metric.date] = { date: metric.date, spend: 0, clicks: 0, impressions: 0, conversions: 0 };
      }
      acc[metric.date].spend += metric.spend;
      acc[metric.date].clicks += metric.clicks;
      acc[metric.date].impressions += metric.impressions;
      acc[metric.date].conversions += metric.conversions;
      return acc;
    }, {} as Record<string, any>);

    return Object.values(grouped).sort((a: any, b: any) => 
      new Date(a.date).getTime() - new Date(b.date).getTime()
    );
  }, [metrics]);

  const handleDateRangeChange = (start: string, end: string) => {
    setDateRange({ start, end });
    const campaignIds = campaigns.map(c => c.id);
    fetchMetrics(campaignIds, { start, end });
  };

  const handleExport = (format: 'pdf' | 'excel') => {
    exportReport(format, { metrics: aggregatedMetrics, campaigns, dateRange });
  };

  const metricCards = [
    {
      title: 'Total Spend',
      value: aggregatedMetrics ? `$${aggregatedMetrics.spend.toLocaleString()}` : '$0',
      change: '+12.5%',
      positive: true,
      icon: <DollarSign className="w-6 h-6 text-green-600" />
    },
    {
      title: 'Impressions',
      value: aggregatedMetrics ? aggregatedMetrics.impressions.toLocaleString() : '0',
      change: '+8.2%',
      positive: true,
      icon: <Eye className="w-6 h-6 text-blue-600" />
    },
    {
      title: 'Clicks',
      value: aggregatedMetrics ? aggregatedMetrics.clicks.toLocaleString() : '0',
      change: '+15.3%',
      positive: true,
      icon: <MousePointer className="w-6 h-6 text-purple-600" />
    },
    {
      title: 'Conversions',
      value: aggregatedMetrics ? aggregatedMetrics.conversions.toLocaleString() : '0',
      change: '+22.1%',
      positive: true,
      icon: <Target className="w-6 h-6 text-blue-600" />
    },
    {
      title: 'CTR',
      value: aggregatedMetrics ? `${aggregatedMetrics.ctr.toFixed(2)}%` : '0%',
      change: '-2.1%',
      positive: false,
      icon: <MousePointer className="w-6 h-6 text-red-600" />
    },
    {
      title: 'CPC',
      value: aggregatedMetrics ? `$${aggregatedMetrics.cpc.toFixed(2)}` : '$0',
      change: '-5.4%',
      positive: true,
      icon: <DollarSign className="w-6 h-6 text-green-600" />
    },
    {
      title: 'CPM',
      value: aggregatedMetrics ? `$${aggregatedMetrics.cpm.toFixed(2)}` : '$0',
      change: '+3.2%',
      positive: false,
      icon: <Eye className="w-6 h-6 text-blue-600" />
    },
    {
      title: 'ROAS',
      value: aggregatedMetrics ? `${aggregatedMetrics.roas.toFixed(2)}x` : '0x',
      change: '+18.7%',
      positive: true,
      icon: <TrendingUp className="w-6 h-6 text-green-600" />
    }
  ];

  return (
    <div className="space-y-6">
      {/* Controls */}
      <div className="bg-white rounded-lg shadow p-6">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div className="flex items-center space-x-4">
            <div>
              <label className="block text-sm font-medium text-gray-700">Date Range</label>
              <div className="flex items-center space-x-2 mt-1">
                <input
                  type="date"
                  value={dateRange.start}
                  onChange={(e) => handleDateRangeChange(e.target.value, dateRange.end)}
                  className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                />
                <span className="text-gray-500">to</span>
                <input
                  type="date"
                  value={dateRange.end}
                  onChange={(e) => handleDateRangeChange(dateRange.start, e.target.value)}
                  className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                />
              </div>
            </div>
          </div>

          <div className="flex items-center space-x-2">
            <button
              onClick={() => handleExport('excel')}
              className="inline-flex items-center px-3 py-2 border border-gray-300 shadow-sm text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50"
            >
              <Download className="w-4 h-4 mr-2" />
              Excel
            </button>
            <button
              onClick={() => handleExport('pdf')}
              className="inline-flex items-center px-3 py-2 border border-gray-300 shadow-sm text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50"
            >
              <Download className="w-4 h-4 mr-2" />
              PDF
            </button>
          </div>
        </div>
      </div>

      {/* Metric Cards */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {metricCards.map((metric, index) => (
          <div key={index} className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">{metric.title}</p>
                <p className="text-2xl font-semibold text-gray-900">{metric.value}</p>
              </div>
              <div className="flex items-center justify-center w-12 h-12 bg-gray-100 rounded-lg">
                {metric.icon}
              </div>
            </div>
            <div className="flex items-center mt-4">
              {metric.positive ? (
                <TrendingUp className="w-4 h-4 mr-1 text-green-600" />
              ) : (
                <TrendingDown className="w-4 h-4 mr-1 text-red-600" />
              )}
              <span className={`text-sm font-medium ${metric.positive ? 'text-green-600' : 'text-red-600'}`}>
                {metric.change}
              </span>
              <span className="ml-2 text-sm text-gray-500">vs last period</span>
            </div>
          </div>
        ))}
      </div>

      {/* Chart */}
      <div className="bg-white rounded-lg shadow">
        <div className="p-6 border-b border-gray-200">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-medium text-gray-900">Performance Trends</h3>
            <div className="flex items-center space-x-4">
              <select
                value={selectedMetric}
                onChange={(e) => setSelectedMetric(e.target.value)}
                className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
              >
                <option value="spend">Spend</option>
                <option value="clicks">Clicks</option>
                <option value="impressions">Impressions</option>
                <option value="conversions">Conversions</option>
              </select>
              <div className="flex border border-gray-300 rounded-md">
                <button
                  onClick={() => setChartType('line')}
                  className={`px-3 py-2 text-sm font-medium ${
                    chartType === 'line'
                      ? 'bg-blue-50 text-blue-600'
                      : 'text-gray-700 hover:bg-gray-50'
                  }`}
                >
                  Line
                </button>
                <button
                  onClick={() => setChartType('bar')}
                  className={`px-3 py-2 text-sm font-medium ${
                    chartType === 'bar'
                      ? 'bg-blue-50 text-blue-600'
                      : 'text-gray-700 hover:bg-gray-50'
                  }`}
                >
                  Bar
                </button>
              </div>
            </div>
          </div>
        </div>

        <div className="p-6">
          {loading ? (
            <div className="flex items-center justify-center h-64">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
            </div>
          ) : chartData.length > 0 ? (
            <div className="h-64 flex items-end space-x-2">
              {chartData.map((data: any, index) => (
                <div key={index} className="flex-1 flex flex-col items-center">
                  <div
                    className="w-full bg-blue-500 rounded-t-sm transition-all duration-300 hover:bg-blue-600"
                    style={{
                      height: `${(data[selectedMetric] / Math.max(...chartData.map((d: any) => d[selectedMetric]))) * 200}px`,
                      minHeight: '4px'
                    }}
                    title={`${data.date}: ${data[selectedMetric]}`}
                  ></div>
                  <div className="text-xs text-gray-500 mt-2 transform -rotate-45 origin-top-left">
                    {new Date(data.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="flex items-center justify-center h-64 text-gray-500">
              <div className="text-center">
                <Eye className="w-12 h-12 mx-auto mb-4 text-gray-300" />
                <p>No data available for the selected date range</p>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Campaign Performance Table */}
      <div className="bg-white rounded-lg shadow">
        <div className="p-6 border-b border-gray-200">
          <h3 className="text-lg font-medium text-gray-900">Campaign Performance</h3>
        </div>
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Campaign
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Status
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Budget
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Spend
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Impressions
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Clicks
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  CTR
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  CPC
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Conversions
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {campaigns.map((campaign) => {
                const campaignMetrics = metrics.filter(m => m.campaignId === campaign.id);
                const totals = campaignMetrics.reduce((acc, m) => ({
                  spend: acc.spend + m.spend,
                  impressions: acc.impressions + m.impressions,
                  clicks: acc.clicks + m.clicks,
                  conversions: acc.conversions + m.conversions
                }), { spend: 0, impressions: 0, clicks: 0, conversions: 0 });
                
                const avgCTR = campaignMetrics.reduce((sum, m) => sum + m.ctr, 0) / campaignMetrics.length || 0;
                const avgCPC = totals.spend / totals.clicks || 0;

                return (
                  <tr key={campaign.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm font-medium text-gray-900">{campaign.name}</div>
                      <div className="text-sm text-gray-500">{campaign.platform}</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                        campaign.status === 'active' ? 'bg-green-100 text-green-800' :
                        campaign.status === 'paused' ? 'bg-yellow-100 text-yellow-800' :
                        'bg-gray-100 text-gray-800'
                      }`}>
                        {campaign.status}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      ${campaign.budget}/{campaign.budgetType}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      ${totals.spend.toFixed(2)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {totals.impressions.toLocaleString()}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {totals.clicks.toLocaleString()}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {avgCTR.toFixed(2)}%
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      ${avgCPC.toFixed(2)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {totals.conversions}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default MetricsDashboard;