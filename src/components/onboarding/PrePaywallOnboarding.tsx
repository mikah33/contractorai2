import { useState, useEffect, useRef, useCallback } from 'react';
import {
  Building2,
  ChevronRight,
  ChevronLeft,
  Warehouse,
  Maximize,
  Footprints,
  PaintBucket,
  Thermometer,
  Droplet,
  Lightbulb,
  Construction,
  MoreHorizontal,
  Send,
  FileText,
  CreditCard,
  Mail,
  X,
  Copy,
  Upload,
  Image,
  Paperclip,
  Plus,
  CheckCircle2,
  Eye,
  Camera,
  Sparkles,
  ArrowRight
} from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { useAuthStore } from '../../stores/authStore';

// Step names for analytics
const STEP_NAMES = ['business_setup', 'email_compose', 'email_preview', 'vision_cam'];

// Generate or retrieve session ID for tracking
const getSessionId = () => {
  let sessionId = sessionStorage.getItem('onboarding_session_id');
  if (!sessionId) {
    sessionId = `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    sessionStorage.setItem('onboarding_session_id', sessionId);
  }
  return sessionId;
};

// Detect device type
const getDeviceType = () => {
  const width = window.innerWidth;
  if (width < 768) return 'mobile';
  if (width < 1024) return 'tablet';
  return 'desktop';
};

interface PrePaywallOnboardingProps {
  onComplete: () => void;
}

// Top 8 trades based on calculator availability
const TOP_TRADES = [
  { id: 'roofing', name: 'Roofing', icon: Warehouse },
  { id: 'concrete', name: 'Concrete', icon: Maximize },
  { id: 'flooring', name: 'Flooring', icon: Footprints },
  { id: 'paint', name: 'Painting', icon: PaintBucket },
  { id: 'hvac', name: 'HVAC', icon: Thermometer },
  { id: 'plumbing', name: 'Plumbing', icon: Droplet },
  { id: 'electrical', name: 'Electrical', icon: Lightbulb },
  { id: 'deck', name: 'Decks', icon: Construction },
];

// All other trades
const OTHER_TRADES = [
  { id: 'siding', name: 'Siding' },
  { id: 'pavers', name: 'Pavers' },
  { id: 'drywall', name: 'Drywall' },
  { id: 'tile', name: 'Tile' },
  { id: 'framing', name: 'Framing' },
  { id: 'retaining_walls', name: 'Retaining Walls' },
  { id: 'excavation', name: 'Excavation' },
  { id: 'doors_windows', name: 'Doors & Windows' },
  { id: 'fence', name: 'Fencing' },
  { id: 'foundation', name: 'Foundation' },
  { id: 'gutter', name: 'Gutters' },
  { id: 'junk_removal', name: 'Junk Removal' },
  { id: 'veneer', name: 'Veneer' },
];

// Sample estimates for each trade type
const SAMPLE_ESTIMATES: Record<string, { title: string; customerName: string; customerEmail: string; items: { name: string; qty: string; price: number }[]; total: number }> = {
  roofing: {
    title: 'Roof Replacement',
    customerName: 'Michael Johnson',
    customerEmail: 'michael.j@email.com',
    items: [
      { name: 'Architectural Shingles (25 sq)', qty: '25 squares', price: 4500 },
      { name: 'Underlayment & Ice Shield', qty: '25 squares', price: 875 },
      { name: 'Ridge Vent Installation', qty: '45 LF', price: 450 },
      { name: 'Old Roof Tear-Off & Disposal', qty: '1', price: 1800 },
      { name: 'Labor', qty: '1', price: 3200 },
    ],
    total: 10825
  },
  concrete: {
    title: 'Driveway Replacement',
    customerName: 'Sarah Williams',
    customerEmail: 'sarah.w@email.com',
    items: [
      { name: 'Concrete (4" thick)', qty: '650 sq ft', price: 3900 },
      { name: 'Rebar Reinforcement', qty: '650 sq ft', price: 650 },
      { name: 'Demolition & Removal', qty: '1', price: 1200 },
      { name: 'Grading & Prep', qty: '1', price: 800 },
      { name: 'Labor & Finishing', qty: '1', price: 2100 },
    ],
    total: 8650
  },
  flooring: {
    title: 'Hardwood Floor Installation',
    customerName: 'Jennifer Davis',
    customerEmail: 'jennifer.d@email.com',
    items: [
      { name: 'Oak Hardwood Flooring', qty: '850 sq ft', price: 5100 },
      { name: 'Underlayment', qty: '850 sq ft', price: 425 },
      { name: 'Transitions & Trim', qty: '1', price: 350 },
      { name: 'Old Floor Removal', qty: '850 sq ft', price: 680 },
      { name: 'Installation Labor', qty: '1', price: 2550 },
    ],
    total: 9105
  },
  paint: {
    title: 'Interior Painting',
    customerName: 'Robert Miller',
    customerEmail: 'robert.m@email.com',
    items: [
      { name: 'Premium Paint (Sherwin Williams)', qty: '12 gal', price: 720 },
      { name: 'Primer', qty: '4 gal', price: 160 },
      { name: 'Wall Prep & Repair', qty: '1', price: 450 },
      { name: 'Ceiling Painting', qty: '1,200 sq ft', price: 840 },
      { name: 'Labor (Walls & Trim)', qty: '1', price: 2400 },
    ],
    total: 4570
  },
  hvac: {
    title: 'AC System Replacement',
    customerName: 'David Anderson',
    customerEmail: 'david.a@email.com',
    items: [
      { name: '3-Ton AC Unit (14 SEER)', qty: '1', price: 3200 },
      { name: 'Air Handler', qty: '1', price: 1800 },
      { name: 'Thermostat (Smart)', qty: '1', price: 250 },
      { name: 'Refrigerant Lines', qty: '1', price: 400 },
      { name: 'Installation & Startup', qty: '1', price: 2100 },
    ],
    total: 7750
  },
  plumbing: {
    title: 'Bathroom Remodel Plumbing',
    customerName: 'Lisa Thompson',
    customerEmail: 'lisa.t@email.com',
    items: [
      { name: 'Toilet Installation', qty: '1', price: 450 },
      { name: 'Vanity & Faucet Install', qty: '1', price: 380 },
      { name: 'Shower Valve & Trim', qty: '1', price: 650 },
      { name: 'Drain Lines', qty: '1', price: 520 },
      { name: 'Water Supply Lines', qty: '1', price: 340 },
    ],
    total: 2340
  },
  electrical: {
    title: 'Panel Upgrade',
    customerName: 'James Wilson',
    customerEmail: 'james.w@email.com',
    items: [
      { name: '200 Amp Panel', qty: '1', price: 850 },
      { name: 'Main Breaker', qty: '1', price: 180 },
      { name: 'Circuit Breakers', qty: '20', price: 400 },
      { name: 'Permit & Inspection', qty: '1', price: 350 },
      { name: 'Labor', qty: '1', price: 1800 },
    ],
    total: 3580
  },
  deck: {
    title: 'Composite Deck Build',
    customerName: 'Patricia Brown',
    customerEmail: 'patricia.b@email.com',
    items: [
      { name: 'Trex Composite Decking', qty: '320 sq ft', price: 3840 },
      { name: 'Pressure Treated Frame', qty: '1', price: 1200 },
      { name: 'Composite Railing (32 LF)', qty: '32 LF', price: 1280 },
      { name: 'Stairs (4 steps)', qty: '1', price: 650 },
      { name: 'Labor', qty: '1', price: 2800 },
    ],
    total: 9770
  },
  siding: {
    title: 'Vinyl Siding Installation',
    customerName: 'Thomas Garcia',
    customerEmail: 'thomas.g@email.com',
    items: [
      { name: 'Vinyl Siding', qty: '1,800 sq ft', price: 5400 },
      { name: 'House Wrap', qty: '1,800 sq ft', price: 540 },
      { name: 'J-Channel & Trim', qty: '1', price: 450 },
      { name: 'Old Siding Removal', qty: '1', price: 1200 },
      { name: 'Labor', qty: '1', price: 3600 },
    ],
    total: 11190
  },
  pavers: {
    title: 'Paver Patio Installation',
    customerName: 'Nancy Martinez',
    customerEmail: 'nancy.m@email.com',
    items: [
      { name: 'Concrete Pavers', qty: '400 sq ft', price: 2400 },
      { name: 'Base Material & Sand', qty: '1', price: 600 },
      { name: 'Edge Restraints', qty: '80 LF', price: 240 },
      { name: 'Excavation', qty: '1', price: 800 },
      { name: 'Labor', qty: '1', price: 2000 },
    ],
    total: 6040
  },
  drywall: {
    title: 'Drywall Installation',
    customerName: 'Christopher Lee',
    customerEmail: 'chris.l@email.com',
    items: [
      { name: 'Drywall Sheets (1/2")', qty: '50 sheets', price: 750 },
      { name: 'Tape & Mud', qty: '1', price: 180 },
      { name: 'Corner Bead', qty: '1', price: 85 },
      { name: 'Hanging Labor', qty: '1', price: 1500 },
      { name: 'Finishing (Level 4)', qty: '1', price: 1800 },
    ],
    total: 4315
  },
  tile: {
    title: 'Bathroom Tile Installation',
    customerName: 'Karen White',
    customerEmail: 'karen.w@email.com',
    items: [
      { name: 'Porcelain Floor Tile', qty: '85 sq ft', price: 510 },
      { name: 'Shower Wall Tile', qty: '120 sq ft', price: 840 },
      { name: 'Thinset & Grout', qty: '1', price: 185 },
      { name: 'Waterproofing Membrane', qty: '1', price: 320 },
      { name: 'Labor', qty: '1', price: 1650 },
    ],
    total: 3505
  },
  framing: {
    title: 'Room Addition Framing',
    customerName: 'Daniel Harris',
    customerEmail: 'daniel.h@email.com',
    items: [
      { name: 'Lumber Package', qty: '1', price: 4200 },
      { name: 'Hardware & Fasteners', qty: '1', price: 380 },
      { name: 'Headers & Beams', qty: '1', price: 650 },
      { name: 'Sheathing', qty: '1', price: 720 },
      { name: 'Labor', qty: '1', price: 4800 },
    ],
    total: 10750
  },
  retaining_walls: {
    title: 'Block Retaining Wall',
    customerName: 'Michelle Clark',
    customerEmail: 'michelle.c@email.com',
    items: [
      { name: 'Retaining Wall Blocks', qty: '180', price: 1080 },
      { name: 'Gravel Base', qty: '3 yards', price: 180 },
      { name: 'Drainage Pipe', qty: '50 LF', price: 150 },
      { name: 'Excavation', qty: '1', price: 600 },
      { name: 'Labor', qty: '1', price: 2400 },
    ],
    total: 4410
  },
  excavation: {
    title: 'Site Excavation',
    customerName: 'Steven Lewis',
    customerEmail: 'steven.l@email.com',
    items: [
      { name: 'Excavation (8" depth)', qty: '2,000 sq ft', price: 1600 },
      { name: 'Grading & Leveling', qty: '1', price: 800 },
      { name: 'Soil Removal', qty: '50 yards', price: 1500 },
      { name: 'Equipment', qty: '1 day', price: 650 },
      { name: 'Labor', qty: '1', price: 1200 },
    ],
    total: 5750
  },
  doors_windows: {
    title: 'Window Replacement',
    customerName: 'Sandra Walker',
    customerEmail: 'sandra.w@email.com',
    items: [
      { name: 'Double-Hung Windows', qty: '8', price: 3200 },
      { name: 'Entry Door (Fiberglass)', qty: '1', price: 850 },
      { name: 'Trim & Casing', qty: '1', price: 420 },
      { name: 'Caulk & Insulation', qty: '1', price: 180 },
      { name: 'Installation Labor', qty: '1', price: 2400 },
    ],
    total: 7050
  },
  fence: {
    title: 'Privacy Fence Installation',
    customerName: 'Paul Robinson',
    customerEmail: 'paul.r@email.com',
    items: [
      { name: 'Cedar Fence Panels (6\')', qty: '150 LF', price: 3000 },
      { name: 'Posts (4x4)', qty: '25', price: 500 },
      { name: 'Concrete', qty: '25 bags', price: 175 },
      { name: 'Hardware', qty: '1', price: 150 },
      { name: 'Labor', qty: '1', price: 2250 },
    ],
    total: 6075
  },
  foundation: {
    title: 'Foundation Repair',
    customerName: 'Betty Hall',
    customerEmail: 'betty.h@email.com',
    items: [
      { name: 'Helical Piers', qty: '8', price: 4800 },
      { name: 'Crack Injection', qty: '15 LF', price: 750 },
      { name: 'Waterproofing', qty: '1', price: 1200 },
      { name: 'Excavation', qty: '1', price: 800 },
      { name: 'Labor', qty: '1', price: 3200 },
    ],
    total: 10750
  },
  gutter: {
    title: 'Seamless Gutter Installation',
    customerName: 'Richard Young',
    customerEmail: 'richard.y@email.com',
    items: [
      { name: 'Aluminum Gutters (5")', qty: '180 LF', price: 1260 },
      { name: 'Downspouts', qty: '6', price: 360 },
      { name: 'Gutter Guards', qty: '180 LF', price: 900 },
      { name: 'Fascia Repair', qty: '1', price: 250 },
      { name: 'Installation Labor', qty: '1', price: 720 },
    ],
    total: 3490
  },
  junk_removal: {
    title: 'Estate Cleanout',
    customerName: 'Dorothy King',
    customerEmail: 'dorothy.k@email.com',
    items: [
      { name: 'Junk Removal (Full Load)', qty: '2 loads', price: 800 },
      { name: 'Furniture Disposal', qty: '12 items', price: 360 },
      { name: 'Appliance Removal', qty: '4', price: 200 },
      { name: 'Donation Drop-off', qty: '1', price: 75 },
      { name: 'Labor (2 crew)', qty: '4 hours', price: 480 },
    ],
    total: 1915
  },
  veneer: {
    title: 'Stone Veneer Installation',
    customerName: 'George Wright',
    customerEmail: 'george.w@email.com',
    items: [
      { name: 'Natural Stone Veneer', qty: '200 sq ft', price: 2800 },
      { name: 'Mortar & Adhesive', qty: '1', price: 340 },
      { name: 'Metal Lath', qty: '200 sq ft', price: 200 },
      { name: 'Corner Pieces', qty: '20 LF', price: 400 },
      { name: 'Labor', qty: '1', price: 3000 },
    ],
    total: 6740
  },
};

const PrePaywallOnboarding: React.FC<PrePaywallOnboardingProps> = ({ onComplete }) => {
  const { user } = useAuthStore();
  const [step, setStep] = useState(1);
  const [businessName, setBusinessName] = useState('');
  const [selectedTrade, setSelectedTrade] = useState<string | null>(null);
  const [showOtherTrades, setShowOtherTrades] = useState(false);
  const [saving, setSaving] = useState(false);
  const [emailSending, setEmailSending] = useState(false);
  const [showGeneratedImage, setShowGeneratedImage] = useState(false);

  // Analytics tracking
  const sessionId = useRef(getSessionId());
  const stepStartTime = useRef(Date.now());
  const trackedSteps = useRef<Set<number>>(new Set());

  // Track analytics event
  const trackEvent = useCallback(async (
    stepNumber: number,
    action: 'viewed' | 'completed' | 'skipped' | 'dropped',
    timeOnStepMs?: number
  ) => {
    try {
      await supabase.from('onboarding_analytics').insert({
        user_id: user?.id || null,
        session_id: sessionId.current,
        step_number: stepNumber,
        step_name: STEP_NAMES[stepNumber - 1],
        action,
        business_name: businessName || null,
        selected_trade: selectedTrade || null,
        time_on_step_ms: timeOnStepMs || null,
        device_type: getDeviceType(),
      });
    } catch (error) {
      console.error('[OnboardingAnalytics] Track error:', error);
    }
  }, [user?.id, businessName, selectedTrade]);

  // Track step view on mount and step change
  useEffect(() => {
    if (!trackedSteps.current.has(step)) {
      trackedSteps.current.add(step);
      trackEvent(step, 'viewed');
    }
    stepStartTime.current = Date.now();
  }, [step, trackEvent]);

  // Track drop-off when user leaves
  useEffect(() => {
    const handleBeforeUnload = () => {
      const timeOnStep = Date.now() - stepStartTime.current;
      // Use sendBeacon for reliable tracking on page close
      const data = JSON.stringify({
        user_id: user?.id || null,
        session_id: sessionId.current,
        step_number: step,
        step_name: STEP_NAMES[step - 1],
        action: 'dropped',
        business_name: businessName || null,
        selected_trade: selectedTrade || null,
        time_on_step_ms: timeOnStep,
        device_type: getDeviceType(),
      });
      navigator.sendBeacon(
        `${import.meta.env.VITE_SUPABASE_URL}/rest/v1/onboarding_analytics`,
        new Blob([data], { type: 'application/json' })
      );
    };

    const handleVisibilityChange = () => {
      if (document.visibilityState === 'hidden') {
        trackEvent(step, 'dropped', Date.now() - stepStartTime.current);
      }
    };

    window.addEventListener('beforeunload', handleBeforeUnload);
    document.addEventListener('visibilitychange', handleVisibilityChange);

    return () => {
      window.removeEventListener('beforeunload', handleBeforeUnload);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [step, user?.id, businessName, selectedTrade, trackEvent]);

  const handleNext = async () => {
    if (step === 1) {
      if (!businessName.trim()) {
        alert('Please enter your business name');
        return;
      }
      if (!selectedTrade) {
        alert('Please select your trade');
        return;
      }
      // Track step 1 completion
      trackEvent(1, 'completed', Date.now() - stepStartTime.current);
      setStep(2);
    }
  };

  const handleBack = () => {
    if (step > 1) {
      setStep(step - 1);
      setShowGeneratedImage(false);
    }
  };

  const handleSendEmail = () => {
    setEmailSending(true);
    // Track step 2 completion
    trackEvent(2, 'completed', Date.now() - stepStartTime.current);
    setTimeout(() => {
      setEmailSending(false);
      setStep(3);
    }, 1500);
  };

  // Handle step 3 -> step 4 transition
  const handleNextToVisionCam = () => {
    trackEvent(3, 'completed', Date.now() - stepStartTime.current);
    setStep(4);
  };

  const handleComplete = async () => {
    // Track step 4 completion (full onboarding completed)
    trackEvent(4, 'completed', Date.now() - stepStartTime.current);

    if (!user) {
      onComplete();
      return;
    }

    setSaving(true);
    try {
      const { error: profileError } = await supabase
        .from('profiles')
        .upsert({
          id: user.id,
          email: user.email,
          company_name: businessName.trim(),
          business_type: selectedTrade,
          updated_at: new Date().toISOString()
        }, {
          onConflict: 'id'
        });

      if (profileError) {
        console.error('[PrePaywallOnboarding] Profile save error:', profileError);
      }

      const { error: onboardingError } = await supabase
        .from('user_onboarding')
        .upsert({
          user_id: user.id,
          pre_paywall_completed: true,
          updated_at: new Date().toISOString()
        }, {
          onConflict: 'user_id'
        });

      if (onboardingError) {
        console.error('[PrePaywallOnboarding] Onboarding save error:', onboardingError);
      }

      onComplete();
    } catch (error) {
      console.error('[PrePaywallOnboarding] Error:', error);
      onComplete();
    } finally {
      setSaving(false);
    }
  };

  const sampleEstimate = selectedTrade ? SAMPLE_ESTIMATES[selectedTrade] || SAMPLE_ESTIMATES.roofing : SAMPLE_ESTIMATES.roofing;

  // Step 1: Business Setup
  const renderBusinessSetup = () => (
    <div className="flex flex-col h-full">
      <div className="px-6 pt-8 pb-4">
        <h1 className="text-2xl font-bold text-gray-900">Welcome to OnSite</h1>
        <p className="text-gray-500 mt-2">Let's set up your business profile</p>
      </div>

      <div className="flex-1 px-6 overflow-y-auto pb-4">
        <div className="mb-6">
          <label className="flex items-center gap-2 text-sm font-medium text-gray-600 mb-2">
            <Building2 className="w-4 h-4" />
            Business Name
          </label>
          <input
            type="text"
            value={businessName}
            onChange={(e) => setBusinessName(e.target.value)}
            className="w-full px-4 py-3.5 bg-white border border-gray-300 rounded-xl text-gray-900 placeholder-gray-400 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
            placeholder="Smith Roofing LLC"
            autoFocus
          />
        </div>

        <div className="mb-4">
          <label className="text-sm font-medium text-gray-600 mb-3 block">
            What type of work do you do?
          </label>

          <div className="grid grid-cols-2 gap-3 mb-3">
            {TOP_TRADES.map((trade) => {
              const Icon = trade.icon;
              const isSelected = selectedTrade === trade.id;
              return (
                <button
                  key={trade.id}
                  onClick={() => {
                    setSelectedTrade(trade.id);
                    setShowOtherTrades(false);
                  }}
                  className={`flex items-center gap-3 p-4 rounded-xl border transition-all ${
                    isSelected
                      ? 'bg-blue-50 border-blue-500 text-blue-700'
                      : 'bg-white border-gray-200 text-gray-700 hover:border-gray-300'
                  }`}
                >
                  <Icon className={`w-5 h-5 ${isSelected ? 'text-blue-500' : 'text-gray-400'}`} />
                  <span className="font-medium">{trade.name}</span>
                </button>
              );
            })}
          </div>

          <button
            onClick={() => setShowOtherTrades(!showOtherTrades)}
            className={`w-full flex items-center justify-center gap-2 p-3 rounded-xl border transition-all ${
              showOtherTrades || OTHER_TRADES.some(t => t.id === selectedTrade)
                ? 'bg-gray-100 border-gray-300 text-gray-700'
                : 'bg-white border-gray-200 text-gray-500 hover:border-gray-300'
            }`}
          >
            <MoreHorizontal className="w-5 h-5" />
            <span>Other Trades</span>
            <ChevronRight className={`w-4 h-4 transition-transform ${showOtherTrades ? 'rotate-90' : ''}`} />
          </button>

          {showOtherTrades && (
            <div className="mt-3 grid grid-cols-2 gap-2">
              {OTHER_TRADES.map((trade) => {
                const isSelected = selectedTrade === trade.id;
                return (
                  <button
                    key={trade.id}
                    onClick={() => setSelectedTrade(trade.id)}
                    className={`p-3 rounded-lg border text-sm transition-all ${
                      isSelected
                        ? 'bg-blue-50 border-blue-500 text-blue-700'
                        : 'bg-white border-gray-200 text-gray-600 hover:border-gray-300'
                    }`}
                  >
                    {trade.name}
                  </button>
                );
              })}
            </div>
          )}
        </div>
      </div>

      <div className="px-6 py-4 bg-white border-t border-gray-200">
        <button
          onClick={handleNext}
          disabled={!businessName.trim() || !selectedTrade}
          className="w-full flex items-center justify-center gap-2 px-4 py-3.5 bg-blue-500 hover:bg-blue-600 text-white rounded-xl font-semibold active:scale-[0.98] transition-all disabled:opacity-50 disabled:cursor-not-allowed"
        >
          Continue
          <ChevronRight className="w-5 h-5" />
        </button>
      </div>
    </div>
  );

  // Step 2: Send Email Compose View - Matches real app modal
  const renderEmailPreview = () => (
    <div className="flex flex-col h-full">
      <div className="px-6 pt-6 pb-4">
        <h1 className="text-2xl font-bold text-gray-900">Send Professional Estimates</h1>
        <p className="text-gray-500 text-base mt-2">See how easy it is to send estimates and collect payments</p>
      </div>

      <div className="flex-1 px-4 overflow-y-auto pb-4">
        {/* Send Email Modal Container */}
        <div className="bg-white rounded-2xl overflow-hidden shadow-xl">
          {/* Modal Header */}
          <div className="flex items-center justify-between px-5 py-4 border-b border-slate-200">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 bg-blue-100 rounded-xl flex items-center justify-center">
                <Mail className="w-6 h-6 text-blue-600" />
              </div>
              <div>
                <h3 className="font-semibold text-slate-800 text-lg">Send Email</h3>
                <p className="text-sm text-slate-500">Compose your message</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <button className="w-10 h-10 flex items-center justify-center rounded-lg hover:bg-slate-100">
                <Copy className="w-5 h-5 text-slate-500" />
              </button>
              <button className="w-10 h-10 flex items-center justify-center rounded-lg hover:bg-slate-100">
                <X className="w-5 h-5 text-slate-500" />
              </button>
            </div>
          </div>

          {/* Recipient */}
          <div className="px-5 py-4 bg-slate-50 border-b border-slate-200">
            <p className="text-sm text-slate-500 mb-2">1 recipient</p>
            <div className="flex items-center gap-2">
              <span className="inline-flex items-center gap-2 px-4 py-2 bg-slate-200 rounded-full text-base text-slate-700">
                Your Customer
                <X className="w-4 h-4 text-slate-500" />
              </span>
            </div>
          </div>

          {/* Step Tabs */}
          <div className="px-5 py-3 border-b border-slate-200">
            <div className="flex gap-2">
              <button className="flex-1 py-2.5 px-3 text-base text-slate-500 rounded-lg">1. To</button>
              <button className="flex-1 py-2.5 px-3 text-base text-white bg-blue-500 rounded-lg font-medium">2. Compose</button>
              <button className="flex-1 py-2.5 px-3 text-base text-slate-500 rounded-lg">3. Approval</button>
              <button className="flex-1 py-2.5 px-3 text-base text-slate-500 rounded-lg">4. Send</button>
            </div>
          </div>

          {/* Form Fields */}
          <div className="p-5 space-y-5">
            {/* Subject */}
            <div>
              <label className="text-sm text-slate-500 mb-2 block">Subject</label>
              <div className="w-full px-4 py-3.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-800 text-base">
                Your {sampleEstimate.title} Estimate
              </div>
            </div>

            {/* Message */}
            <div>
              <label className="text-sm text-slate-500 mb-2 block">Message</label>
              <div className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-slate-700 text-sm leading-relaxed">
                Hi there,<br /><br />
                Thank you for requesting an estimate. Please find the details for your {sampleEstimate.title.toLowerCase()} project attached.
              </div>
            </div>

            {/* Attachments */}
            <div>
              <label className="text-sm text-slate-500 mb-2 block">Attachments</label>
              <div className="flex gap-3">
                <button className="flex-1 flex items-center justify-center gap-2 px-4 py-3 bg-slate-100 rounded-xl text-slate-600 text-base">
                  <Upload className="w-5 h-5" />
                  Upload
                </button>
                <button className="flex-1 flex items-center justify-center gap-2 px-4 py-3 bg-slate-100 rounded-xl text-slate-600 text-base">
                  <Image className="w-5 h-5" />
                  Gallery
                </button>
              </div>
            </div>

            {/* Documents */}
            <div>
              <label className="text-sm text-slate-500 mb-2 block">Documents</label>
              <div className="flex gap-3 mb-4">
                <button className="flex-1 flex items-center justify-center gap-2 px-4 py-3 bg-slate-100 rounded-xl text-slate-600 text-base">
                  <Paperclip className="w-5 h-5" />
                  Attach
                </button>
                <button className="flex-1 flex items-center justify-center gap-2 px-4 py-3 bg-slate-100 rounded-xl text-slate-600 text-base">
                  <Plus className="w-5 h-5" />
                  Quick Create
                </button>
              </div>

              {/* Attached Estimate */}
              <div className="flex items-center justify-between px-4 py-4 bg-green-50 border border-green-200 rounded-xl">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-green-100 rounded-lg flex items-center justify-center">
                    <CheckCircle2 className="w-5 h-5 text-green-600" />
                  </div>
                  <div>
                    <p className="text-base font-medium text-slate-800">Estimate #{sampleEstimate.title.replace(/\s+/g, '-')}</p>
                    <p className="text-sm text-green-600">Estimate</p>
                  </div>
                </div>
                <X className="w-5 h-5 text-slate-400" />
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Footer */}
      <div className="px-6 py-4 bg-white border-t border-gray-200">
        <div className="flex gap-3">
          <button
            onClick={handleBack}
            className="flex items-center justify-center gap-2 px-4 py-3.5 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-xl font-semibold transition-all"
          >
            <ChevronLeft className="w-5 h-5" />
          </button>
          <button
            onClick={handleSendEmail}
            disabled={emailSending}
            className="flex-1 flex items-center justify-center gap-2 px-4 py-3.5 bg-blue-500 hover:bg-blue-600 text-white rounded-xl font-semibold active:scale-[0.98] transition-all disabled:opacity-70"
          >
            {emailSending ? (
              <>
                <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                Sending...
              </>
            ) : (
              <>
                Next
                <ChevronRight className="w-5 h-5" />
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );

  // Step 3: Customer View - Shows the full email preview customers receive
  const renderCustomerView = () => (
    <div className="flex flex-col h-full overflow-hidden">
      <div className="px-6 pt-6 pb-4 flex-shrink-0">
        <h1 className="text-2xl font-bold text-gray-900">Email Sent!</h1>
        <p className="text-gray-500 text-base mt-2">Here's what your customer receives</p>
      </div>

      <div className="flex-1 px-4 overflow-y-auto pb-4">
        {/* Full Email Preview - Matches what customer receives */}
        <div className="bg-white rounded-2xl overflow-hidden shadow-xl">
          {/* Email Header */}
          <div className="bg-slate-50 px-5 py-4 border-b border-slate-200">
            <p className="text-sm text-slate-500">From</p>
            <p className="text-base font-semibold text-slate-800">{businessName.trim() || 'Your Business'}</p>
          </div>

          {/* Email Content */}
          <div className="p-5">
            <h2 className="text-lg font-bold text-slate-800 mb-2">Your {sampleEstimate.title} Estimate</h2>
            <p className="text-slate-500 text-sm mb-2">Hi there,</p>
            <p className="text-slate-600 text-sm leading-relaxed mb-4">
              Thank you for requesting an estimate. Please find the details for your {sampleEstimate.title.toLowerCase()} project below.
            </p>

            {/* Estimate Card with Line Items */}
            <div className="bg-slate-50 rounded-xl p-4 mb-4 border border-slate-200">
              <div className="flex justify-between items-center mb-3">
                <span className="font-semibold text-slate-800 text-sm flex items-center gap-2">
                  <FileText className="w-4 h-4 text-blue-500" />
                  Estimate Details
                </span>
                <span className="text-xs text-slate-500">Valid 30 days</span>
              </div>

              {/* PDF Button */}
              <button className="w-full py-3 px-4 bg-indigo-100 text-indigo-700 rounded-lg font-semibold text-sm mb-4 flex items-center justify-center gap-2">
                <FileText className="w-4 h-4" />
                View Full Estimate PDF
              </button>

              {/* Line Items */}
              <div className="space-y-2 mb-3">
                {sampleEstimate.items.slice(0, 3).map((item, idx) => (
                  <div key={idx} className="flex justify-between text-sm">
                    <span className="text-slate-600">{item.name}</span>
                    <span className="text-slate-800 font-medium">${item.price.toLocaleString()}</span>
                  </div>
                ))}
                {sampleEstimate.items.length > 3 && (
                  <p className="text-sm text-blue-500">+ {sampleEstimate.items.length - 3} more items</p>
                )}
              </div>

              {/* Total */}
              <div className="flex justify-between items-center pt-3 border-t border-slate-200">
                <span className="font-semibold text-slate-800">Total</span>
                <span className="text-xl font-bold text-green-600">${sampleEstimate.total.toLocaleString()}</span>
              </div>
            </div>

            {/* Approve/Decline Section - Green bordered */}
            <div className="bg-gradient-to-br from-green-50 to-emerald-50 rounded-xl p-4 border-2 border-green-300">
              <p className="text-center font-semibold text-green-700 mb-3">Ready to proceed?</p>

              <button className="w-full py-3 px-4 bg-green-500 text-white rounded-lg font-bold text-sm mb-2 flex items-center justify-center gap-2">
                ✓ Approve Estimate
              </button>

              <button className="w-full py-2.5 px-4 bg-slate-800 text-white rounded-lg font-semibold text-sm mb-3 flex items-center justify-center gap-2">
                ✗ Decline
              </button>

              <p className="text-center text-xs text-slate-500 flex items-center justify-center gap-1">
                <CreditCard className="w-3.5 h-3.5" />
                Approve to receive a secure payment link via Stripe
              </p>
            </div>
          </div>

          {/* Footer */}
          <div className="bg-slate-50 px-5 py-3 border-t border-slate-200 text-center">
            <p className="text-xs text-slate-400">Sent via OnSite • Professional Contractor Software</p>
          </div>
        </div>
      </div>

      {/* Footer */}
      <div className="px-6 py-4 bg-white border-t border-gray-200">
        <div className="flex gap-3">
          <button
            onClick={handleBack}
            className="flex items-center justify-center gap-2 px-4 py-3.5 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-xl font-semibold transition-all"
          >
            <ChevronLeft className="w-5 h-5" />
          </button>
          <button
            onClick={handleNextToVisionCam}
            className="flex-1 flex items-center justify-center gap-2 px-4 py-3.5 bg-blue-500 hover:bg-blue-600 text-white rounded-xl font-semibold active:scale-[0.98] transition-all"
          >
            Next
            <ChevronRight className="w-5 h-5" />
          </button>
        </div>
      </div>
    </div>
  );

  // Step 4: Vision Cam Preview
  const renderVisionCam = () => (
    <div className="flex flex-col h-full bg-white">
      <div className="px-6 pt-6 pb-4">
        <div className="flex items-center gap-2 mb-2">
          <div className="w-8 h-8 bg-gradient-to-r from-purple-500 to-blue-600 rounded-lg flex items-center justify-center">
            <Eye className="w-5 h-5 text-white" />
          </div>
          <h1 className="text-2xl font-bold text-gray-900">Vision Cam</h1>
        </div>
        <p className="text-gray-500 text-base">Show customers what their project will look like with AI-generated images</p>
      </div>

      <div className="flex-1 px-2 overflow-hidden flex flex-col">
        {/* Image Container */}
        <div className="flex-1 relative overflow-hidden rounded-2xl">
          {/* Before Image */}
          <div
            className={`absolute inset-0 flex items-center justify-center transition-transform duration-500 ease-in-out ${
              showGeneratedImage ? '-translate-x-full' : 'translate-x-0'
            }`}
          >
            <img
              src="https://ujhgwcurllkkeouzwvgk.supabase.co/storage/v1/object/public/project-photos/vision-cam-demo/bathroom-before.png"
              alt="Before - Vision Cam Input"
              className="h-full w-auto max-w-none rounded-2xl shadow-lg border-2 border-black"
            />
          </div>

          {/* After Image */}
          <div
            className={`absolute inset-0 flex items-center justify-center transition-transform duration-500 ease-in-out ${
              showGeneratedImage ? 'translate-x-0' : 'translate-x-full'
            }`}
          >
            <img
              src="https://ujhgwcurllkkeouzwvgk.supabase.co/storage/v1/object/public/project-photos/vision-cam-demo/bathroom-after.png"
              alt="After - AI Generated Result"
              className="h-full w-auto max-w-none rounded-2xl shadow-lg border-2 border-black"
            />
          </div>

          {/* Carousel Dots */}
          <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex gap-2 z-10">
            <div className={`w-2.5 h-2.5 rounded-full transition-colors shadow ${!showGeneratedImage ? 'bg-purple-500' : 'bg-white/70'}`} />
            <div className={`w-2.5 h-2.5 rounded-full transition-colors shadow ${showGeneratedImage ? 'bg-purple-500' : 'bg-white/70'}`} />
          </div>
        </div>

        {/* Toggle Button */}
        <div className="py-3">
          {!showGeneratedImage ? (
            <div className="text-center">
              <button
                onClick={() => setShowGeneratedImage(true)}
                className="inline-flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-purple-500 to-blue-600 text-white rounded-xl font-semibold active:scale-[0.98] transition-all"
              >
                <Sparkles className="w-5 h-5" />
                See AI Generated Result
                <ArrowRight className="w-5 h-5" />
              </button>
            </div>
          ) : (
            <div className="text-center">
              <button
                onClick={() => setShowGeneratedImage(false)}
                className="text-purple-600 text-sm font-medium"
              >
                ← View original photo
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Footer */}
      <div className="px-6 py-4 bg-white border-t border-gray-200">
        <div className="flex gap-3">
          <button
            onClick={handleBack}
            className="flex items-center justify-center gap-2 px-4 py-3.5 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-xl font-semibold transition-all"
          >
            <ChevronLeft className="w-5 h-5" />
          </button>
          <button
            onClick={handleComplete}
            disabled={saving}
            className="flex-1 flex items-center justify-center gap-2 px-4 py-3.5 bg-gradient-to-r from-blue-500 to-purple-600 hover:from-blue-600 hover:to-purple-700 text-white rounded-xl font-semibold active:scale-[0.98] transition-all disabled:opacity-50"
          >
            {saving ? (
              <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
            ) : (
              <>
                Start Free Trial
                <ChevronRight className="w-5 h-5" />
              </>
            )}
          </button>
        </div>
        <p className="text-xs text-gray-500 text-center mt-3">
          7-day free trial, cancel anytime
        </p>
      </div>
    </div>
  );

  return (
    <div className="fixed inset-0 z-50 bg-gray-50">
      <div className="h-full w-full flex flex-col">
        {/* Step Indicator */}
        <div className="flex items-center justify-between px-6 pt-4">
          <div className="flex gap-2">
            {[1, 2, 3, 4].map((s) => (
              <div
                key={s}
                className={`h-1 rounded-full transition-all ${
                  s === step ? 'w-8 bg-blue-500' : s < step ? 'w-4 bg-blue-300' : 'w-4 bg-gray-300'
                }`}
              />
            ))}
          </div>
          <span className="text-xs text-gray-500">Step {step} of 4</span>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-hidden">
          {step === 1 && renderBusinessSetup()}
          {step === 2 && renderEmailPreview()}
          {step === 3 && renderCustomerView()}
          {step === 4 && renderVisionCam()}
        </div>
      </div>
    </div>
  );
};

export default PrePaywallOnboarding;
