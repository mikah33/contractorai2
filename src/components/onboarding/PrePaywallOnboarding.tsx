import { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import {
  Hammer,
  Zap,
  Wrench,
  Wind,
  Home,
  PaintBucket,
  Ruler,
  TreePine,
  Construction,
  Footprints,
  Building2,
  Warehouse,
  Sun,
  Droplet,
  Truck,
  Shield,
  Thermometer,
  MoreHorizontal,
  ChevronLeft,
  ChevronRight,
  Clock,
  DollarSign,
  TrendingUp,
  FileText,
  AlertTriangle,
  Camera,
  Eye,
  BarChart3,
  CheckCircle2,
  Plus,
  Minus,
  type LucideIcon
} from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { useAuthStore } from '../../stores/authStore';
import { Capacitor } from '@capacitor/core';
import { revenueCatService } from '../../services/revenueCatService';
import { subscriptionService } from '../../services/subscriptionService';

// ─── Color Palette (from Colors+Onsite.swift) ───────────────────────────────

const C = {
  darkNavy: '#022a4a',
  primary: '#043d6b',
  medium: '#035291',
  lightBG: '#e8f0f8',
  gray50: '#F9FAFB',
  gray100: '#F3F4F6',
  gray200: '#E5E7EB',
  gray500: '#71717A',
  gray900: '#111827',
  green: '#16a34a',
  amber: '#d97706',
  violet: '#7c3aed',
  red: '#dc2626',
} as const;

// ─── Trade Presets (from TradeSelectScreen.swift) ────────────────────────────

interface TradePreset {
  id: string;
  name: string;
  icon: LucideIcon;
  avgProjectValue: number;
  avgEstimateHours: number;
  avgProjectsPerMonth: number;
  hourlyRate: number;
  painPoint: string;
  productivityWin: string;
}

const TRADES: TradePreset[] = [
  {
    id: 'gc', name: 'General Contractor', icon: Hammer,
    avgProjectValue: 18000, avgEstimateHours: 2.5, avgProjectsPerMonth: 4, hourlyRate: 95,
    painPoint: 'GCs spend 3-4 hours per bid juggling subs, materials & markup',
    productivityWin: 'Take on more projects without adding overhead',
  },
  {
    id: 'electrician', name: 'Electrician', icon: Zap,
    avgProjectValue: 4500, avgEstimateHours: 1.5, avgProjectsPerMonth: 10, hourlyRate: 105,
    painPoint: 'Electricians lose billable hours calculating load schedules and material lists',
    productivityWin: 'Quote more jobs in less time and increase close rate',
  },
  {
    id: 'plumber', name: 'Plumber', icon: Wrench,
    avgProjectValue: 3000, avgEstimateHours: 1.0, avgProjectsPerMonth: 14, hourlyRate: 100,
    painPoint: 'Plumbers often underbid because fast estimates miss hidden costs',
    productivityWin: 'Accurate bids in minutes — stop leaving money in the ground',
  },
  {
    id: 'hvac', name: 'HVAC', icon: Wind,
    avgProjectValue: 6500, avgEstimateHours: 2.5, avgProjectsPerMonth: 8, hourlyRate: 95,
    painPoint: 'HVAC estimates require complex load calcs that eat hours every week',
    productivityWin: 'Standardize your bids and win more commercial contracts',
  },
  {
    id: 'roofer', name: 'Roofer', icon: Home,
    avgProjectValue: 15000, avgEstimateHours: 2.5, avgProjectsPerMonth: 6, hourlyRate: 82,
    painPoint: 'Storm season floods roofers with leads — slow estimates mean lost jobs',
    productivityWin: 'Close 2x more storm jobs with same-day quotes',
  },
  {
    id: 'painter', name: 'Painter', icon: PaintBucket,
    avgProjectValue: 3500, avgEstimateHours: 1.0, avgProjectsPerMonth: 12, hourlyRate: 68,
    painPoint: 'Painters waste time measuring, calculating paint quantities and labor',
    productivityWin: 'Deliver polished quotes while competitors are still measuring',
  },
  {
    id: 'carpenter', name: 'Carpenter / Framer', icon: Ruler,
    avgProjectValue: 7000, avgEstimateHours: 2.5, avgProjectsPerMonth: 7, hourlyRate: 85,
    painPoint: 'Carpenters lose time on material takeoffs and cutting calculations',
    productivityWin: 'Spend less time on paper and more time building',
  },
  {
    id: 'landscaper', name: 'Landscaper', icon: TreePine,
    avgProjectValue: 4500, avgEstimateHours: 1.5, avgProjectsPerMonth: 12, hourlyRate: 72,
    painPoint: 'Landscapers juggle seasonal demand with slow, manual quoting',
    productivityWin: 'Quote spring cleanups and installs in the field instantly',
  },
  {
    id: 'concrete', name: 'Concrete / Masonry', icon: Construction,
    avgProjectValue: 10000, avgEstimateHours: 2.5, avgProjectsPerMonth: 5, hourlyRate: 82,
    painPoint: 'Concrete bids require precise yardage and labor calcs — errors cost thousands',
    productivityWin: 'Eliminate costly underbids with accurate automated takeoffs',
  },
  {
    id: 'flooring', name: 'Tile & Flooring', icon: Footprints,
    avgProjectValue: 5500, avgEstimateHours: 1.5, avgProjectsPerMonth: 9, hourlyRate: 76,
    painPoint: 'Flooring contractors waste time calculating square footage, waste factor and grout',
    productivityWin: 'Send professional quotes on-site before you leave the house',
  },
  {
    id: 'remodeler', name: 'Remodeler', icon: Building2,
    avgProjectValue: 25000, avgEstimateHours: 2.5, avgProjectsPerMonth: 3, hourlyRate: 92,
    painPoint: "Remodelers lose entire days building detailed scopes for clients who don't close",
    productivityWin: 'Create detailed, impressive scopes in 10 minutes flat',
  },
  {
    id: 'drywall', name: 'Drywall', icon: Warehouse,
    avgProjectValue: 5000, avgEstimateHours: 1.5, avgProjectsPerMonth: 9, hourlyRate: 72,
    painPoint: 'Drywall contractors manually count sheets, mud, and tape every single bid',
    productivityWin: 'Auto-calculate materials and labor in under a minute',
  },
  {
    id: 'solar', name: 'Solar Installer', icon: Sun,
    avgProjectValue: 22000, avgEstimateHours: 2.5, avgProjectsPerMonth: 4, hourlyRate: 110,
    painPoint: 'Solar proposals take hours of design work before a single panel is sold',
    productivityWin: 'Generate system quotes and proposals clients can sign on the spot',
  },
  {
    id: 'pool', name: 'Pool & Spa', icon: Droplet,
    avgProjectValue: 35000, avgEstimateHours: 2.5, avgProjectsPerMonth: 3, hourlyRate: 98,
    painPoint: 'Pool builders write the same scope of work from scratch every single bid',
    productivityWin: 'Close high-ticket pool projects with polished proposals',
  },
  {
    id: 'excavator', name: 'Excavation / Grading', icon: Truck,
    avgProjectValue: 12000, avgEstimateHours: 2.5, avgProjectsPerMonth: 5, hourlyRate: 120,
    painPoint: 'Excavators struggle to accurately price haul distances, cut/fill and machine hours',
    productivityWin: 'Win more site prep contracts with faster, accurate bids',
  },
  {
    id: 'siding', name: 'Siding & Exteriors', icon: Shield,
    avgProjectValue: 9000, avgEstimateHours: 1.5, avgProjectsPerMonth: 6, hourlyRate: 80,
    painPoint: 'Siding crews re-measure the same walls on every job to estimate square footage',
    productivityWin: 'Quote siding, trim and soffit jobs in the driveway',
  },
  {
    id: 'fence', name: 'Fence & Gates', icon: Construction,
    avgProjectValue: 4000, avgEstimateHours: 1.0, avgProjectsPerMonth: 12, hourlyRate: 72,
    painPoint: 'Fence contractors lose time manually calculating linear feet, posts, and panels',
    productivityWin: 'Text a quote before you back out of the driveway',
  },
  {
    id: 'handyman', name: 'Handyman', icon: Hammer,
    avgProjectValue: 800, avgEstimateHours: 0.5, avgProjectsPerMonth: 20, hourlyRate: 75,
    painPoint: 'Handymen juggle dozens of small jobs and often undercharge for their time',
    productivityWin: 'Track every job, charge properly, and stop giving free labor away',
  },
  {
    id: 'insulation', name: 'Insulation', icon: Thermometer,
    avgProjectValue: 6000, avgEstimateHours: 1.5, avgProjectsPerMonth: 8, hourlyRate: 78,
    painPoint: 'Insulation contractors manually calculate R-values, coverage and board feet every bid',
    productivityWin: 'Generate energy-efficiency quotes contractors can hand to homeowners on the spot',
  },
  {
    id: 'other', name: 'Other Trade', icon: MoreHorizontal,
    avgProjectValue: 6000, avgEstimateHours: 1.5, avgProjectsPerMonth: 8, hourlyRate: 80,
    painPoint: 'Most trades spend 2+ hours per week on estimates that could take minutes',
    productivityWin: 'Reclaim your evenings and weekends from paperwork',
  },
];

// ─── Step names for analytics ────────────────────────────────────────────────

const STEP_NAMES = [
  'hook_trade_select',
  'quiz_projects',
  'quiz_estimate_time',
  'quiz_project_value',
  'results',
  'features',
];

// ─── Estimate time options ───────────────────────────────────────────────────

const ESTIMATE_TIME_OPTIONS: { label: string; hours: number; icon: LucideIcon }[] = [
  { label: 'Under 30 minutes', hours: 0.5, icon: Zap },
  { label: 'About 1 hour', hours: 1.0, icon: Clock },
  { label: '1 - 2 hours', hours: 1.5, icon: Clock },
  { label: '3 or more hours', hours: 3.0, icon: Clock },
];

// ─── Features ────────────────────────────────────────────────────────────────

interface Feature {
  icon: LucideIcon;
  title: string;
  tagline: string;
  detail: string;
  color: string;
}

const FEATURES: Feature[] = [
  {
    icon: Zap,
    title: 'Estimates in 60 Seconds',
    tagline: 'Stop spending hours on bids',
    detail: 'Build professional estimates with your saved materials, labor rates, and markup — in under a minute. Send to clients directly from your phone.',
    color: C.amber,
  },
  {
    icon: FileText,
    title: 'Auto Invoice Clients',
    tagline: 'Get paid faster, every time',
    detail: 'Convert any estimate to an invoice in one tap. Track payment status, send reminders, and know exactly who owes you money.',
    color: C.green,
  },
  {
    icon: Camera,
    title: 'Photo Documentation',
    tagline: 'Every job, fully documented',
    detail: 'Attach before/after photos to any project, organize by job site, and share visual progress reports with clients and employees instantly.',
    color: C.primary,
  },
  {
    icon: Eye,
    title: 'AI Vision Cam',
    tagline: 'Transform spaces before you start',
    detail: 'Show clients exactly what their space could look like. Our AI-powered cam visualizes the finished project before a single nail is hammered.',
    color: C.violet,
  },
  {
    icon: BarChart3,
    title: 'Track Every Dollar',
    tagline: 'Know your numbers at all times',
    detail: 'Expenses, mileage, revenue, and profit all in one dashboard. Make smarter bids and stop undercharging for your work.',
    color: C.red,
  },
];

// ─── Project value presets ───────────────────────────────────────────────────

const VALUE_PRESETS: { label: string; value: number }[] = [
  { label: '$500', value: 500 },
  { label: '$1K', value: 1000 },
  { label: '$5K', value: 5000 },
  { label: '$10K', value: 10000 },
  { label: '$25K+', value: 25000 },
];

// ─── Helpers ─────────────────────────────────────────────────────────────────

const getSessionId = () => {
  let sessionId = sessionStorage.getItem('onboarding_session_id');
  if (!sessionId) {
    sessionId = `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    sessionStorage.setItem('onboarding_session_id', sessionId);
  }
  return sessionId;
};

const getDeviceType = () => {
  const width = window.innerWidth;
  if (width < 768) return 'mobile';
  if (width < 1024) return 'tablet';
  return 'desktop';
};

const formatCurrency = (value: number): string => {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    maximumFractionDigits: 0,
  }).format(value);
};

// ─── Component ───────────────────────────────────────────────────────────────

interface PrePaywallOnboardingProps {
  onComplete: () => void;
}

const PrePaywallOnboarding: React.FC<PrePaywallOnboardingProps> = ({ onComplete }) => {
  const { user } = useAuthStore();

  // Navigation
  const [currentStep, setCurrentStep] = useState(0);

  // Trade + quiz state (multi-select, first trade pre-fills quiz defaults)
  const [selectedTrades, setSelectedTrades] = useState<TradePreset[]>([]);
  const [projectsPerMonth, setProjectsPerMonth] = useState(5);
  const [estimateHours, setEstimateHours] = useState(1.0);
  const [avgProjectValue, setAvgProjectValue] = useState(2500);

  // UI state
  const [showResults, setShowResults] = useState(false);
  const [currentFeature, setCurrentFeature] = useState(0);
  const [saving, setSaving] = useState(false);

  // Analytics
  const sessionId = useRef(getSessionId());
  const stepStartTime = useRef(Date.now());
  const trackedSteps = useRef<Set<number>>(new Set());
  const hasCompleted = useRef(false);
  const cleanupListeners = useRef<(() => void) | null>(null);

  // ─── Calculations (from ViewModel) ──────────────────────────────────────────

  const primaryTrade = selectedTrades[0] || null;

  const hoursWastedPerMonth = projectsPerMonth * estimateHours;
  const hoursSavedPerMonth = hoursWastedPerMonth * 0.8;
  const hourlyRate = primaryTrade?.hourlyRate ?? 75;
  const moneySavedPerYear = hoursSavedPerMonth * hourlyRate * 12;
  const extraProjectsPerYear = Math.floor(
    (hoursSavedPerMonth * 12) / Math.max(estimateHours * 1.5, 0.5)
  );
  const extraRevenuePerYear = extraProjectsPerYear * avgProjectValue;
  const totalValuePerYear = moneySavedPerYear + extraRevenuePerYear;

  // ─── Analytics ──────────────────────────────────────────────────────────────

  const trackEvent = useCallback(
    async (
      stepNumber: number,
      action: 'viewed' | 'completed' | 'skipped' | 'dropped',
      timeOnStepMs?: number
    ) => {
      try {
        await supabase.from('onboarding_analytics').insert({
          user_id: user?.id || null,
          session_id: sessionId.current,
          step_number: stepNumber,
          step_name: STEP_NAMES[stepNumber] || `step_${stepNumber}`,
          action,
          selected_trade: selectedTrades.map(t => t.id).join(',') || null,
          time_on_step_ms: timeOnStepMs || null,
          device_type: getDeviceType(),
        });
      } catch (error) {
        console.error('[OnboardingAnalytics] Track error:', error);
      }
    },
    [user?.id, selectedTrades]
  );

  // Track step view
  useEffect(() => {
    if (!trackedSteps.current.has(currentStep)) {
      trackedSteps.current.add(currentStep);
      trackEvent(currentStep, 'viewed');
    }
    stepStartTime.current = Date.now();
  }, [currentStep, trackEvent]);

  // Track drop-off
  useEffect(() => {
    const handleBeforeUnload = () => {
      if (hasCompleted.current) return;
      const timeOnStep = Date.now() - stepStartTime.current;
      const data = JSON.stringify({
        user_id: user?.id || null,
        session_id: sessionId.current,
        step_number: currentStep,
        step_name: STEP_NAMES[currentStep] || `step_${currentStep}`,
        action: 'dropped',
        selected_trade: selectedTrades.map(t => t.id).join(',') || null,
        time_on_step_ms: timeOnStep,
        device_type: getDeviceType(),
      });
      navigator.sendBeacon(
        `${import.meta.env.VITE_SUPABASE_URL}/rest/v1/onboarding_analytics`,
        new Blob([data], { type: 'application/json' })
      );
    };

    const handleVisibilityChange = () => {
      if (hasCompleted.current) return;
      if (document.visibilityState === 'hidden') {
        trackEvent(currentStep, 'dropped', Date.now() - stepStartTime.current);
      }
    };

    window.addEventListener('beforeunload', handleBeforeUnload);
    document.addEventListener('visibilitychange', handleVisibilityChange);

    const cleanup = () => {
      window.removeEventListener('beforeunload', handleBeforeUnload);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
    cleanupListeners.current = cleanup;

    return cleanup;
  }, [currentStep, user?.id, selectedTrades, trackEvent]);

  // ─── Navigation ─────────────────────────────────────────────────────────────

  const advance = useCallback(() => {
    trackEvent(currentStep, 'completed', Date.now() - stepStartTime.current);
    if (currentStep < 5) {
      setCurrentStep((s) => s + 1);
    }
  }, [currentStep, trackEvent]);

  const goBack = useCallback(() => {
    if (currentStep > 0) {
      setCurrentStep((s) => s - 1);
      if (currentStep === 4) setShowResults(false);
    }
  }, [currentStep]);

  // ─── Trade Selection (multi-select, first trade pre-fills quiz defaults) ───

  const handleSelectTrade = useCallback(
    (trade: TradePreset) => {
      setSelectedTrades((prev) => {
        const already = prev.find((t) => t.id === trade.id);
        if (already) {
          // Deselect
          const next = prev.filter((t) => t.id !== trade.id);
          // If we removed the first trade, re-fill defaults from new first
          if (next.length > 0 && prev[0].id === trade.id) {
            setProjectsPerMonth(next[0].avgProjectsPerMonth);
            setEstimateHours(next[0].avgEstimateHours);
            setAvgProjectValue(next[0].avgProjectValue);
          }
          return next;
        }
        // Select — if it's the first trade, pre-fill quiz defaults
        if (prev.length === 0) {
          setProjectsPerMonth(trade.avgProjectsPerMonth);
          setEstimateHours(trade.avgEstimateHours);
          setAvgProjectValue(trade.avgProjectValue);
        }
        return [...prev, trade];
      });
    },
    []
  );

  // ─── Pre-initialize RevenueCat/subscription service during onboarding ─────
  // This runs in the background so the paywall loads instantly after completion

  useEffect(() => {
    if (!user?.id) return;
    const platform = Capacitor.getPlatform();
    if (platform === 'ios') {
      revenueCatService.initialize(user.id).catch(() => {});
    } else {
      subscriptionService.initialize(user.id).catch(() => {});
    }
  }, [user?.id]);

  // ─── Results animation trigger ─────────────────────────────────────────────

  useEffect(() => {
    if (currentStep === 4) {
      const timer = setTimeout(() => setShowResults(true), 150);
      return () => clearTimeout(timer);
    }
  }, [currentStep]);

  // ─── Completion ─────────────────────────────────────────────────────────────

  const handleComplete = async () => {
    if (cleanupListeners.current) cleanupListeners.current();
    hasCompleted.current = true;
    trackEvent(5, 'completed', Date.now() - stepStartTime.current);

    if (!user) {
      onComplete();
      return;
    }

    setSaving(true);
    try {
      // Save trades to profile
      await supabase
        .from('profiles')
        .upsert(
          {
            id: user.id,
            email: user.email,
            business_type: selectedTrades.map(t => t.id).join(',') || 'other',
            updated_at: new Date().toISOString(),
          },
          { onConflict: 'id' }
        );

      // Save quiz data to analytics
      await supabase.from('onboarding_analytics').insert({
        user_id: user.id,
        session_id: sessionId.current,
        step_number: 99,
        step_name: 'quiz_summary',
        action: 'completed',
        selected_trade: selectedTrades.map(t => t.id).join(',') || null,
        device_type: getDeviceType(),
      });

      // Mark pre-paywall completed
      await supabase
        .from('user_onboarding')
        .upsert(
          {
            user_id: user.id,
            pre_paywall_completed: true,
            updated_at: new Date().toISOString(),
          },
          { onConflict: 'user_id' }
        );

      onComplete();
    } catch (error) {
      console.error('[PrePaywallOnboarding] Error:', error);
      onComplete();
    } finally {
      setSaving(false);
    }
  };

  // ─── Feature Carousel ──────────────────────────────────────────────────────

  const carouselRef = useRef<HTMLDivElement>(null);
  const touchStartX = useRef(0);

  const handleTouchStart = (e: React.TouchEvent) => {
    touchStartX.current = e.touches[0].clientX;
  };

  const handleTouchEnd = (e: React.TouchEvent) => {
    const diff = touchStartX.current - e.changedTouches[0].clientX;
    if (Math.abs(diff) > 50) {
      if (diff > 0 && currentFeature < FEATURES.length - 1) {
        setCurrentFeature((f) => f + 1);
      } else if (diff < 0 && currentFeature > 0) {
        setCurrentFeature((f) => f - 1);
      }
    }
  };

  // ─── Screen 0: Hook + Trade Select ──────────────────────────────────────────

  const renderHookAndTradeSelect = () => (
    <div className="flex flex-col h-full">
      {/* Hero Header */}
      <div
        className="flex-shrink-0 relative overflow-hidden"
        style={{
          background: `linear-gradient(135deg, ${C.darkNavy}, ${C.medium})`,
          paddingTop: 'calc(env(safe-area-inset-top) + 16px)',
        }}
      >
        <div className="flex flex-col items-center py-10 px-6">
          <div className="w-20 h-20 rounded-full flex items-center justify-center mb-5" style={{ background: 'rgba(255,255,255,0.14)' }}>
            <Hammer className="w-9 h-9 text-white" />
          </div>
          <h1 className="text-[28px] font-bold text-white text-center leading-tight">
            Stop Leaving Money
          </h1>
          <h1 className="text-[28px] font-bold text-center leading-tight" style={{ color: C.lightBG }}>
            on the Table.
          </h1>
          <p className="text-[15px] text-white/75 text-center mt-4 leading-relaxed px-6">
            The average contractor wastes 12+ hours/week{'\n'}on estimates, invoices, and paperwork.
          </p>
        </div>
      </div>

      {/* Stats Strip */}
      <div className="flex-shrink-0 flex bg-white border-b" style={{ borderColor: C.gray200 }}>
        {[
          { value: '12+', label: 'hrs/week\nwasted', icon: Clock },
          { value: '$31K', label: 'lost per\nyear avg', icon: DollarSign },
          { value: '2x', label: 'more jobs\npossible', icon: TrendingUp },
        ].map((stat, i) => (
          <div key={i} className="flex-1 flex flex-col items-center py-3.5" style={{ borderRight: i < 2 ? `1px solid ${C.gray200}` : 'none' }}>
            <stat.icon className="w-[18px] h-[18px] mb-1" style={{ color: C.primary }} />
            <span className="text-[22px] font-bold" style={{ color: C.gray900 }}>{stat.value}</span>
            <span className="text-[10px] font-medium text-center whitespace-pre-line" style={{ color: C.gray500 }}>{stat.label}</span>
          </div>
        ))}
      </div>

      {/* Scrollable Content */}
      <div className="flex-1 overflow-y-auto px-6 pb-4">
        {/* Trade Grid */}
        <div className="mt-5 mb-4">
          <h2 className="text-lg font-bold mb-1" style={{ color: C.gray900 }}>What's Your Trade?</h2>
          <p className="text-sm mb-4" style={{ color: C.gray500 }}>
            Select all that apply
          </p>
          <div className="grid grid-cols-2 gap-3">
            {TRADES.map((trade) => {
              const Icon = trade.icon;
              const isSelected = selectedTrades.some((t) => t.id === trade.id);
              return (
                <button
                  key={trade.id}
                  onClick={() => handleSelectTrade(trade)}
                  className="relative flex flex-col items-center gap-2.5 py-4 px-2 rounded-2xl border transition-all active:scale-[0.97]"
                  style={{
                    background: isSelected ? C.lightBG : '#fff',
                    borderColor: isSelected ? C.primary : C.gray200,
                    borderWidth: isSelected ? 2 : 1,
                    boxShadow: isSelected
                      ? '0 2px 6px rgba(0,0,0,0.08)'
                      : '0 2px 6px rgba(0,0,0,0.03)',
                  }}
                >
                  {isSelected && (
                    <div className="absolute top-2 right-2">
                      <CheckCircle2 className="w-5 h-5" style={{ color: C.primary }} />
                    </div>
                  )}
                  <div
                    className="w-[52px] h-[52px] rounded-full flex items-center justify-center"
                    style={{ background: isSelected ? C.primary : C.lightBG }}
                  >
                    <Icon
                      className="w-[22px] h-[22px]"
                      style={{ color: isSelected ? '#fff' : C.primary }}
                    />
                  </div>
                  <span
                    className="text-[13px] font-semibold text-center leading-tight"
                    style={{ color: isSelected ? C.primary : C.gray900 }}
                  >
                    {trade.name}
                  </span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Trade-specific pain point (from first selected trade) */}
        {primaryTrade && (
          <div
            className="flex items-start gap-3 p-4 rounded-xl mb-4"
            style={{ background: C.lightBG, border: `1px solid ${C.primary}20` }}
          >
            <AlertTriangle className="w-5 h-5 flex-shrink-0 mt-0.5" style={{ color: C.amber }} />
            <p className="text-sm" style={{ color: C.gray900 }}>{primaryTrade.painPoint}</p>
          </div>
        )}

        {/* Pain Points */}
        <div className="space-y-3.5 mb-4">
          {[
            { icon: FileText, color: C.primary, text: 'Hours spent writing estimates by hand' },
            { icon: AlertTriangle, color: C.amber, text: 'Missed billable items that slip through' },
            { icon: Clock, color: C.red, text: 'Chasing clients for unpaid invoices' },
            { icon: Camera, color: C.violet, text: 'Disorganized project photos & notes' },
          ].map((item, i) => (
            <div key={i} className="flex items-center gap-3.5">
              <div
                className="w-[38px] h-[38px] rounded-[10px] flex items-center justify-center flex-shrink-0"
                style={{ background: `${item.color}15` }}
              >
                <item.icon className="w-4 h-4" style={{ color: item.color }} />
              </div>
              <span className="text-[15px]" style={{ color: C.gray900 }}>{item.text}</span>
            </div>
          ))}
        </div>
      </div>

      {/* CTA */}
      <div className="flex-shrink-0 px-6 pb-10 pt-3 bg-white" style={{ borderTop: `1px solid ${C.gray200}` }}>
        <button
          onClick={advance}
          disabled={selectedTrades.length === 0}
          className="w-full py-4 rounded-[14px] text-white font-semibold text-base active:scale-[0.98] transition-transform disabled:opacity-40"
          style={{
            background: `linear-gradient(90deg, ${C.medium}, ${C.primary})`,
            boxShadow: selectedTrades.length > 0 ? `0 5px 10px ${C.primary}47` : 'none',
          }}
        >
          See How Much You're Missing
        </button>
      </div>
    </div>
  );

  // ─── Screen 1: Quiz Projects/Month ──────────────────────────────────────────

  const renderQuizProjects = () => (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="flex-shrink-0 text-center pt-8 px-6">
        <span
          className="inline-block text-xs font-semibold px-3.5 py-1.5 rounded-full mb-3"
          style={{ background: C.lightBG, color: C.primary }}
        >
          Question 1 of 3
        </span>
        <h2 className="text-2xl font-bold mb-2" style={{ color: C.gray900 }}>
          How many projects do{'\n'}you take on each month?
        </h2>
        <p className="text-sm" style={{ color: C.gray500 }}>
          Include estimates, active jobs, and follow-ups
        </p>
      </div>

      <div className="flex-1 flex flex-col items-center justify-center px-6">
        {/* Big Number */}
        <div className="text-[88px] font-bold leading-none mb-2 transition-all" style={{ color: C.primary }}>
          {projectsPerMonth}
        </div>
        <p className="text-base font-medium mb-7" style={{ color: C.gray500 }}>
          projects per month
        </p>

        {/* Stepper + Slider */}
        <div className="flex items-center gap-5 w-full max-w-sm">
          <button
            onClick={() => setProjectsPerMonth((p) => Math.max(1, p - 1))}
            className="w-12 h-12 rounded-full flex items-center justify-center flex-shrink-0"
            style={{ background: C.lightBG, border: `1.5px solid ${C.primary}4D` }}
          >
            <Minus className="w-[18px] h-[18px]" style={{ color: C.primary }} />
          </button>
          <input
            type="range"
            min={1}
            max={30}
            step={1}
            value={projectsPerMonth}
            onChange={(e) => setProjectsPerMonth(Number(e.target.value))}
            className="flex-1 accent-[#043d6b]"
          />
          <button
            onClick={() => setProjectsPerMonth((p) => Math.min(30, p + 1))}
            className="w-12 h-12 rounded-full flex items-center justify-center flex-shrink-0"
            style={{ background: C.lightBG, border: `1.5px solid ${C.primary}4D` }}
          >
            <Plus className="w-[18px] h-[18px]" style={{ color: C.primary }} />
          </button>
        </div>

        {/* Quick-pick pills */}
        <div className="flex gap-2.5 mt-7">
          {[2, 5, 10, 20].map((val) => (
            <button
              key={val}
              onClick={() => setProjectsPerMonth(val)}
              className="px-[18px] py-2 rounded-full text-sm font-semibold transition-all"
              style={{
                background: projectsPerMonth === val ? C.primary : C.lightBG,
                color: projectsPerMonth === val ? '#fff' : C.primary,
                border: projectsPerMonth === val ? 'none' : `1px solid ${C.primary}40`,
              }}
            >
              {val}
            </button>
          ))}
        </div>
      </div>

      {/* Footer */}
      <div className="flex-shrink-0 px-6 pb-10 pt-3">
        <button
          onClick={advance}
          className="w-full py-4 rounded-[14px] text-white font-semibold text-base active:scale-[0.98] transition-transform"
          style={{
            background: `linear-gradient(90deg, ${C.medium}, ${C.primary})`,
            boxShadow: `0 5px 10px ${C.primary}47`,
          }}
        >
          Continue
        </button>
      </div>
    </div>
  );

  // ─── Screen 2: Quiz Estimate Time ───────────────────────────────────────────

  const renderQuizEstimateTime = () => (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="flex-shrink-0 text-center pt-8 px-6">
        <span
          className="inline-block text-xs font-semibold px-3.5 py-1.5 rounded-full mb-3"
          style={{ background: C.lightBG, color: C.primary }}
        >
          Question 2 of 3
        </span>
        <h2 className="text-2xl font-bold mb-2" style={{ color: C.gray900 }}>
          How long does it take{'\n'}to write one estimate?
        </h2>
        <p className="text-sm" style={{ color: C.gray500 }}>
          Be honest — this is just between us
        </p>
      </div>

      <div className="flex-1 flex flex-col justify-center px-6">
        <div className="space-y-3">
          {ESTIMATE_TIME_OPTIONS.map((opt) => {
            const isSelected = estimateHours === opt.hours;
            const Icon = opt.icon;
            return (
              <button
                key={opt.hours}
                onClick={() => setEstimateHours(opt.hours)}
                className="w-full flex items-center gap-4 px-[18px] py-[15px] rounded-[14px] border transition-all text-left"
                style={{
                  background: isSelected ? C.lightBG : '#fff',
                  borderColor: isSelected ? `${C.primary}73` : C.gray200,
                  borderWidth: isSelected ? 2 : 1,
                }}
              >
                <div
                  className="w-11 h-11 rounded-full flex items-center justify-center flex-shrink-0"
                  style={{ background: isSelected ? C.primary : C.lightBG }}
                >
                  <Icon className="w-[18px] h-[18px]" style={{ color: isSelected ? '#fff' : C.primary }} />
                </div>
                <span
                  className="text-base flex-1"
                  style={{ color: C.gray900, fontWeight: isSelected ? 600 : 400 }}
                >
                  {opt.label}
                </span>
                {isSelected && (
                  <CheckCircle2 className="w-[22px] h-[22px] flex-shrink-0" style={{ color: C.primary }} />
                )}
              </button>
            );
          })}
        </div>
      </div>

      {/* Footer */}
      <div className="flex-shrink-0 flex gap-3 px-6 pb-10 pt-3">
        <button
          onClick={goBack}
          className="w-[54px] h-[54px] rounded-[14px] flex items-center justify-center flex-shrink-0"
          style={{ background: C.lightBG }}
        >
          <ChevronLeft className="w-4 h-4" style={{ color: C.primary }} />
        </button>
        <button
          onClick={advance}
          className="flex-1 py-4 rounded-[14px] text-white font-semibold text-base active:scale-[0.98] transition-transform"
          style={{
            background: `linear-gradient(90deg, ${C.medium}, ${C.primary})`,
            boxShadow: `0 5px 10px ${C.primary}47`,
          }}
        >
          Continue
        </button>
      </div>
    </div>
  );

  // ─── Screen 3: Quiz Project Value ───────────────────────────────────────────

  const renderQuizProjectValue = () => (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="flex-shrink-0 text-center pt-8 px-6">
        <span
          className="inline-block text-xs font-semibold px-3.5 py-1.5 rounded-full mb-3"
          style={{ background: C.lightBG, color: C.primary }}
        >
          Question 3 of 3
        </span>
        <h2 className="text-2xl font-bold mb-2" style={{ color: C.gray900 }}>
          What's your average{'\n'}project value?
        </h2>
        <p className="text-sm" style={{ color: C.gray500 }}>
          A rough number is fine — we'll use this to calculate your potential
        </p>
      </div>

      <div className="flex-1 flex flex-col items-center justify-center px-6">
        {/* Dollar Display */}
        <div className="text-center mb-7">
          <div className="text-[54px] font-bold leading-none transition-all" style={{ color: C.primary }}>
            {formatCurrency(avgProjectValue)}
          </div>
          <p className="text-[15px] font-medium mt-1.5" style={{ color: C.gray500 }}>
            per project
          </p>
        </div>

        {/* Preset Grid */}
        <div className="grid grid-cols-3 gap-2.5 w-full max-w-sm mb-7">
          {VALUE_PRESETS.map((preset) => {
            const isSelected = avgProjectValue === preset.value;
            return (
              <button
                key={preset.value}
                onClick={() => setAvgProjectValue(preset.value)}
                className="py-3 rounded-[10px] text-[15px] font-semibold transition-all"
                style={{
                  background: isSelected ? C.primary : C.lightBG,
                  color: isSelected ? '#fff' : C.primary,
                  border: isSelected ? 'none' : `1px solid ${C.primary}33`,
                }}
              >
                {preset.label}
              </button>
            );
          })}
        </div>

        {/* Fine-tune Slider */}
        <div className="w-full max-w-sm">
          <input
            type="range"
            min={500}
            max={50000}
            step={500}
            value={avgProjectValue}
            onChange={(e) => setAvgProjectValue(Number(e.target.value))}
            className="w-full accent-[#043d6b]"
          />
          <div className="flex justify-between mt-1">
            <span className="text-[11px]" style={{ color: C.gray500 }}>$500</span>
            <span className="text-[11px]" style={{ color: C.gray500 }}>$50K+</span>
          </div>
        </div>
      </div>

      {/* Footer */}
      <div className="flex-shrink-0 flex gap-3 px-6 pb-10 pt-3">
        <button
          onClick={goBack}
          className="w-[54px] h-[54px] rounded-[14px] flex items-center justify-center flex-shrink-0"
          style={{ background: C.lightBG }}
        >
          <ChevronLeft className="w-4 h-4" style={{ color: C.primary }} />
        </button>
        <button
          onClick={advance}
          className="flex-1 py-4 rounded-[14px] text-white font-semibold text-base active:scale-[0.98] transition-transform"
          style={{
            background: `linear-gradient(90deg, ${C.medium}, ${C.primary})`,
            boxShadow: `0 5px 10px ${C.primary}47`,
          }}
        >
          Calculate My Savings
        </button>
      </div>
    </div>
  );

  // ─── Screen 4: Results ──────────────────────────────────────────────────────

  const renderResults = () => (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div
        className="flex-shrink-0 relative overflow-hidden"
        style={{
          background: `linear-gradient(135deg, ${C.darkNavy}, ${C.medium})`,
          paddingTop: 'calc(env(safe-area-inset-top) + 8px)',
        }}
      >
        <div className="flex flex-col items-center py-9 px-6">
          <span className="text-[44px] mb-2.5">&#x1F4A1;</span>
          <h2 className="text-2xl font-bold text-white text-center leading-tight">
            Here's What{'\n'}You're Missing
          </h2>
          <p className="text-[13px] text-white/70 mt-2.5 text-center">
            Based on {projectsPerMonth} projects/mo at {formatCurrency(avgProjectValue)} avg
          </p>
        </div>
      </div>

      {/* Results Content */}
      <div className="flex-1 overflow-y-auto px-6 pb-4">
        <div className="space-y-3.5 pt-5">
          {/* Total Value Callout */}
          <div
            className="text-center py-5 rounded-2xl border transition-all duration-500"
            style={{
              background: '#fff',
              borderColor: C.gray200,
              opacity: showResults ? 1 : 0,
              transform: showResults ? 'scale(1)' : 'scale(0.65)',
            }}
          >
            <p className="text-sm" style={{ color: C.gray500 }}>You're leaving up to</p>
            <p className="text-[50px] font-bold leading-tight my-1" style={{ color: C.primary }}>
              {formatCurrency(totalValuePerYear)}
            </p>
            <p className="text-sm" style={{ color: C.gray500 }}>on the table every year</p>
          </div>

          {/* Result Card: Time */}
          <div
            className="flex items-start gap-4 p-4 rounded-[14px] border transition-all duration-400"
            style={{
              background: '#fff',
              borderColor: C.gray200,
              opacity: showResults ? 1 : 0,
              transform: showResults ? 'translateY(0)' : 'translateY(18px)',
              transitionDelay: '0.15s',
            }}
          >
            <div
              className="w-[50px] h-[50px] rounded-full flex items-center justify-center flex-shrink-0"
              style={{ background: `${C.primary}15` }}
            >
              <Clock className="w-[22px] h-[22px]" style={{ color: C.primary }} />
            </div>
            <div>
              <p className="text-xs font-medium" style={{ color: C.gray500 }}>Estimate Time Wasted</p>
              <p className="text-[19px] font-bold" style={{ color: C.gray900 }}>
                {Math.round(hoursWastedPerMonth)} hrs/month
              </p>
              <p className="text-xs leading-relaxed" style={{ color: C.gray500 }}>
                OnSite cuts this by 80% — reclaim {Math.round(hoursSavedPerMonth)} hours every month
              </p>
            </div>
          </div>

          {/* Result Card: Money */}
          <div
            className="flex items-start gap-4 p-4 rounded-[14px] border transition-all duration-400"
            style={{
              background: '#fff',
              borderColor: C.gray200,
              opacity: showResults ? 1 : 0,
              transform: showResults ? 'translateY(0)' : 'translateY(18px)',
              transitionDelay: '0.25s',
            }}
          >
            <div
              className="w-[50px] h-[50px] rounded-full flex items-center justify-center flex-shrink-0"
              style={{ background: `${C.green}15` }}
            >
              <DollarSign className="w-[22px] h-[22px]" style={{ color: C.green }} />
            </div>
            <div>
              <p className="text-xs font-medium" style={{ color: C.gray500 }}>Productivity You're Losing</p>
              <p className="text-[19px] font-bold" style={{ color: C.gray900 }}>
                {formatCurrency(moneySavedPerYear)}/year
              </p>
              <p className="text-xs leading-relaxed" style={{ color: C.gray500 }}>
                Your time is worth ${hourlyRate}/hr. Stop spending it on paperwork.
              </p>
            </div>
          </div>

          {/* Result Card: Extra Jobs */}
          <div
            className="flex items-start gap-4 p-4 rounded-[14px] border transition-all duration-400"
            style={{
              background: '#fff',
              borderColor: C.gray200,
              opacity: showResults ? 1 : 0,
              transform: showResults ? 'translateY(0)' : 'translateY(18px)',
              transitionDelay: '0.35s',
            }}
          >
            <div
              className="w-[50px] h-[50px] rounded-full flex items-center justify-center flex-shrink-0"
              style={{ background: `${C.amber}15` }}
            >
              <TrendingUp className="w-[22px] h-[22px]" style={{ color: C.amber }} />
            </div>
            <div>
              <p className="text-xs font-medium" style={{ color: C.gray500 }}>Jobs You Could Be Taking</p>
              <p className="text-[19px] font-bold" style={{ color: C.gray900 }}>
                +{extraProjectsPerYear} extra jobs/year
              </p>
              <p className="text-xs leading-relaxed" style={{ color: C.gray500 }}>
                Worth {formatCurrency(extraRevenuePerYear)} in additional revenue
              </p>
            </div>
          </div>

          {/* Solution Teaser */}
          <div
            className="flex items-center gap-3.5 p-4 rounded-[14px] transition-all duration-400"
            style={{
              background: C.lightBG,
              border: `1px solid ${C.primary}33`,
              opacity: showResults ? 1 : 0,
              transitionDelay: '0.45s',
            }}
          >
            <CheckCircle2 className="w-7 h-7 flex-shrink-0" style={{ color: C.primary }} />
            <div>
              <p className="text-[15px] font-semibold" style={{ color: C.gray900 }}>
                OnSite eliminates all of this
              </p>
              <p className="text-[13px]" style={{ color: C.gray500 }}>
                Estimates in 60 seconds. Auto-invoicing. AI-powered.
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* CTA */}
      <div className="flex-shrink-0 px-6 pb-10 pt-3 bg-white" style={{ borderTop: `1px solid ${C.gray200}` }}>
        <button
          onClick={advance}
          className="w-full py-4 rounded-[14px] text-white font-semibold text-base active:scale-[0.98] transition-transform"
          style={{
            background: `linear-gradient(90deg, ${C.medium}, ${C.primary})`,
            boxShadow: `0 5px 10px ${C.primary}47`,
          }}
        >
          Show Me How &rarr;
        </button>
      </div>
    </div>
  );

  // ─── Screen 5: Features ─────────────────────────────────────────────────────

  const renderFeatures = () => (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="flex-shrink-0 text-center pt-8 px-6">
        <h2 className="text-[22px] font-bold mb-1.5" style={{ color: C.gray900 }}>
          Why Contractors Choose OnSite
        </h2>
        <p className="text-[15px]" style={{ color: C.gray500 }}>
          Everything you need. Nothing you don't.
        </p>
      </div>

      {/* Feature Cards Carousel */}
      <div
        className="flex-1 flex flex-col justify-center overflow-hidden"
        onTouchStart={handleTouchStart}
        onTouchEnd={handleTouchEnd}
        ref={carouselRef}
      >
        <div className="px-6">
          <div
            className="flex transition-transform duration-300 ease-out"
            style={{ transform: `translateX(-${currentFeature * 100}%)` }}
          >
            {FEATURES.map((feature, idx) => {
              const Icon = feature.icon;
              return (
                <div key={idx} className="w-full flex-shrink-0 px-1">
                  <div
                    className="flex flex-col items-center text-center p-[26px] rounded-[20px] border"
                    style={{
                      background: '#fff',
                      borderColor: C.gray200,
                      boxShadow: '0 5px 14px rgba(0,0,0,0.05)',
                    }}
                  >
                    <div
                      className="w-20 h-20 rounded-full flex items-center justify-center mb-5"
                      style={{ background: `${feature.color}1E` }}
                    >
                      <Icon className="w-[34px] h-[34px]" style={{ color: feature.color }} />
                    </div>
                    <h3 className="text-xl font-bold mb-2" style={{ color: C.gray900 }}>
                      {feature.title}
                    </h3>
                    <p className="text-[13px] font-semibold mb-2" style={{ color: feature.color }}>
                      {feature.tagline}
                    </p>
                    <p className="text-sm leading-relaxed" style={{ color: C.gray500 }}>
                      {feature.detail}
                    </p>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Dot indicators */}
        <div className="flex justify-center gap-[7px] mt-4">
          {FEATURES.map((_, i) => (
            <button
              key={i}
              onClick={() => setCurrentFeature(i)}
              className="rounded-full transition-all duration-300"
              style={{
                width: i === currentFeature ? 22 : 8,
                height: 8,
                background: i === currentFeature ? C.primary : C.gray200,
              }}
            />
          ))}
        </div>
      </div>

      {/* CTA */}
      <div className="flex-shrink-0 px-6 pb-10 pt-3">
        <button
          onClick={handleComplete}
          disabled={saving}
          className="w-full py-4 rounded-[14px] text-white font-semibold text-base active:scale-[0.98] transition-transform disabled:opacity-60"
          style={{
            background: `linear-gradient(90deg, ${C.medium}, ${C.primary})`,
            boxShadow: `0 5px 10px ${C.primary}47`,
          }}
        >
          {saving ? (
            <div className="flex items-center justify-center gap-2">
              <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              <span>Setting up...</span>
            </div>
          ) : (
            'Get Started Free'
          )}
        </button>
      </div>
    </div>
  );

  // ─── Progress Bar ───────────────────────────────────────────────────────────

  const progressWidth = currentStep > 0 ? `${(currentStep / 5) * 100}%` : '0%';

  // ─── Render ─────────────────────────────────────────────────────────────────

  return (
    <div className="fixed inset-0 z-50" style={{ background: C.gray50 }}>
      <div className="h-full w-full flex flex-col" style={{ paddingBottom: 'env(safe-area-inset-bottom)' }}>
        {/* Progress Bar — hidden on step 0 */}
        {currentStep > 0 && (
          <div
            className="flex-shrink-0 px-6"
            style={{ paddingTop: 'calc(env(safe-area-inset-top) + 16px)' }}
          >
            <div className="h-1 rounded-full" style={{ background: C.gray200 }}>
              <div
                className="h-1 rounded-full transition-all duration-350 ease-in-out"
                style={{
                  width: progressWidth,
                  background: `linear-gradient(90deg, ${C.medium}, ${C.primary})`,
                }}
              />
            </div>
          </div>
        )}

        {/* Screen Content */}
        <div className="flex-1 overflow-hidden">
          {currentStep === 0 && renderHookAndTradeSelect()}
          {currentStep === 1 && renderQuizProjects()}
          {currentStep === 2 && renderQuizEstimateTime()}
          {currentStep === 3 && renderQuizProjectValue()}
          {currentStep === 4 && renderResults()}
          {currentStep === 5 && renderFeatures()}
        </div>
      </div>
    </div>
  );
};

export default PrePaywallOnboarding;
