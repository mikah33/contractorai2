/**
 * AI Usage Tracking Hook
 * Track and monitor Anthropic API usage and costs
 */

import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';

interface UsageSummary {
  totalRequests: number;
  totalInputTokens: number;
  totalOutputTokens: number;
  totalCost: number;
  avgResponseTime: number;
  lastRequestAt: string | null;
}

interface DailyUsage {
  date: string;
  requests: number;
  inputTokens: number;
  outputTokens: number;
  cost: number;
}

export function useAIUsageTracking() {
  const [summary, setSummary] = useState<UsageSummary | null>(null);
  const [dailyUsage, setDailyUsage] = useState<DailyUsage[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadUsageData();
  }, []);

  const loadUsageData = async () => {
    try {
      setLoading(true);

      // Get user summary
      const { data: summaryData } = await supabase
        .from('user_ai_usage_summary')
        .select('*')
        .single();

      if (summaryData) {
        setSummary({
          totalRequests: summaryData.total_requests,
          totalInputTokens: summaryData.total_input_tokens,
          totalOutputTokens: summaryData.total_output_tokens,
          totalCost: parseFloat(summaryData.total_cost),
          avgResponseTime: summaryData.avg_response_time_ms,
          lastRequestAt: summaryData.last_request_at
        });
      }

      // Get daily usage (last 30 days)
      const { data: dailyData } = await supabase
        .from('daily_ai_usage')
        .select('*')
        .limit(30);

      if (dailyData) {
        setDailyUsage(dailyData.map(d => ({
          date: d.date,
          requests: d.requests,
          inputTokens: d.input_tokens,
          outputTokens: d.output_tokens,
          cost: parseFloat(d.cost)
        })));
      }
    } catch (error) {
      console.error('Error loading usage data:', error);
    } finally {
      setLoading(false);
    }
  };

  const formatCost = (cost: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 2,
      maximumFractionDigits: 4
    }).format(cost);
  };

  const formatTokens = (tokens: number) => {
    if (tokens >= 1000000) {
      return `${(tokens / 1000000).toFixed(2)}M`;
    } else if (tokens >= 1000) {
      return `${(tokens / 1000).toFixed(1)}K`;
    }
    return tokens.toString();
  };

  return {
    summary,
    dailyUsage,
    loading,
    formatCost,
    formatTokens,
    refresh: loadUsageData
  };
}
