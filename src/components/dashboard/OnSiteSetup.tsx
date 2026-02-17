import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  CheckCircle2,
  Circle,
  Building2,
  Mail,
  CreditCard,
  Users,
  ChevronRight,
  ChevronDown,
  Rocket,
  Megaphone,
  ClipboardList,
  UserPlus,
  FileText,
  Camera,
  Mic,
  X,
  Check,
  BarChart3
} from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { useTheme, getThemeClasses } from '../../contexts/ThemeContext';

interface SetupStep {
  id: string;
  title: string;
  description: string;
  icon: React.ElementType;
  isComplete: boolean;
  action: () => void;
}

interface OnSiteSetupProps {
  profile: any;
  userId: string | undefined;
  onShowEstimateTutorial?: () => void;
  onShowManageTutorial?: () => void;
}

export const OnSiteSetup: React.FC<OnSiteSetupProps> = ({ profile, userId, onShowEstimateTutorial, onShowManageTutorial }) => {
  const navigate = useNavigate();
  const { theme } = useTheme();
  const themeClasses = getThemeClasses(theme);

  const [loading, setLoading] = useState(true);
  const [step1Expanded, setStep1Expanded] = useState(true);
  const [step2Expanded, setStep2Expanded] = useState(true);
  const [step3Expanded, setStep3Expanded] = useState(true);
  const [hasViewedMarketing, setHasViewedMarketing] = useState(false);
  const [hasOpenedTaskModal, setHasOpenedTaskModal] = useState(false);
  const [hasOpenedClientModal, setHasOpenedClientModal] = useState(false);
  const [hasOpenedTeamPage, setHasOpenedTeamPage] = useState(false);
  const [hasOpenedEstimate, setHasOpenedEstimate] = useState(false);
  const [hasOpenedVisionCam, setHasOpenedVisionCam] = useState(false);
  const [hasUsedOnSiteAI, setHasUsedOnSiteAI] = useState(false);
  const [hasOpenedManage, setHasOpenedManage] = useState(false);
  const [showOnSiteAITutorial, setShowOnSiteAITutorial] = useState(false);
  const [showVisionCamTutorial, setShowVisionCamTutorial] = useState(false);

  // Check if marketing page, task modal, and client modal have been viewed
  useEffect(() => {
    const marketingViewed = localStorage.getItem('onsite_marketing_viewed');
    if (marketingViewed === 'true') {
      setHasViewedMarketing(true);
    }

    const taskModalOpened = localStorage.getItem('onsite_task_modal_opened');
    if (taskModalOpened === 'true') {
      setHasOpenedTaskModal(true);
    }

    const clientModalOpened = localStorage.getItem('onsite_client_modal_opened');
    if (clientModalOpened === 'true') {
      setHasOpenedClientModal(true);
    }

    const teamPageOpened = localStorage.getItem('onsite_team_page_opened');
    if (teamPageOpened === 'true') {
      setHasOpenedTeamPage(true);
    }

    const estimateOpened = localStorage.getItem('onsite_estimate_opened');
    if (estimateOpened === 'true') {
      setHasOpenedEstimate(true);
    }

    const visionCamOpened = localStorage.getItem('onsite_vision_cam_opened');
    if (visionCamOpened === 'true') {
      setHasOpenedVisionCam(true);
    }

    const onSiteAIUsed = localStorage.getItem('onsite_ai_used');
    if (onSiteAIUsed === 'true') {
      setHasUsedOnSiteAI(true);
    }

    const manageOpened = localStorage.getItem('onsite_manage_opened');
    if (manageOpened === 'true') {
      setHasOpenedManage(true);
    }
  }, []);

  // Set loading to false after initial render
  useEffect(() => {
    setLoading(false);
  }, []);

  // Determine completion status for each step
  const isProfileComplete = Boolean(
    profile?.company_name &&
    profile?.phone &&
    profile?.address
  );

  const isGmailConnected = Boolean(profile?.gmail_access_token);

  const isStripeConnected = Boolean(profile?.stripe_customer_id);

  // Step 1 items - Get Started (3 tasks)
  const step1Items: SetupStep[] = [
    {
      id: 'profile',
      title: 'Set up Profile & Business',
      description: 'Add your company name, phone, and address',
      icon: Building2,
      isComplete: isProfileComplete,
      action: () => navigate('/settings', { state: { section: 'profile' } })
    },
    {
      id: 'gmail',
      title: 'Connect Gmail',
      description: 'Send estimates and invoices from your email',
      icon: Mail,
      isComplete: isGmailConnected,
      action: () => navigate('/settings', { state: { section: 'email' } })
    },
    {
      id: 'stripe',
      title: 'Connect Stripe for Payments',
      description: 'Accept credit card payments from customers',
      icon: CreditCard,
      isComplete: isStripeConnected,
      action: () => navigate('/settings', { state: { section: 'payments' } })
    },
  ];

  // Step 2 items - Core Features (4 tasks)
  const step2Items: SetupStep[] = [
    {
      id: 'estimate',
      title: 'Use AI To Create an Estimate',
      description: 'Build and send professional estimates',
      icon: FileText,
      isComplete: hasOpenedEstimate,
      action: () => {
        localStorage.setItem('onsite_estimate_opened', 'true');
        setHasOpenedEstimate(true);
        if (onShowEstimateTutorial) {
          onShowEstimateTutorial();
        }
      }
    },
    {
      id: 'onsite-ai',
      title: 'Use OnSite AI',
      description: 'Use speech-to-text to handle any task quickly',
      icon: Mic,
      isComplete: hasUsedOnSiteAI,
      action: () => setShowOnSiteAITutorial(true)
    },
    {
      id: 'vision-cam',
      title: 'How to Use Vision Cam',
      description: 'Scan materials and get instant pricing',
      icon: Camera,
      isComplete: hasOpenedVisionCam,
      action: () => setShowVisionCamTutorial(true)
    },
    {
      id: 'manage',
      title: 'Use Manage',
      description: 'Track payroll, expenses, revenue & invoices',
      icon: BarChart3,
      isComplete: hasOpenedManage,
      action: () => {
        if (onShowManageTutorial) {
          onShowManageTutorial();
        }
      }
    },
  ];

  // Step 3 items - Get a Feel (4 tasks)
  const step3Items: SetupStep[] = [
    {
      id: 'client',
      title: 'Add Your First Client',
      description: 'Save customer contact info',
      icon: UserPlus,
      isComplete: hasOpenedClientModal,
      action: () => {
        localStorage.setItem('onsite_client_modal_opened', 'true');
        setHasOpenedClientModal(true);
        navigate('/clients-hub', { state: { openCreate: true } });
      }
    },
    {
      id: 'team',
      title: 'Set up Your Team',
      description: 'Add employees and set their hourly wages',
      icon: Users,
      isComplete: hasOpenedTeamPage,
      action: () => {
        localStorage.setItem('onsite_team_page_opened', 'true');
        setHasOpenedTeamPage(true);
        navigate('/employees-hub');
      }
    },
    {
      id: 'task',
      title: 'Create Your First Task',
      description: 'Schedule jobs and set reminders',
      icon: ClipboardList,
      isComplete: hasOpenedTaskModal,
      action: () => {
        localStorage.setItem('onsite_task_modal_opened', 'true');
        setHasOpenedTaskModal(true);
        navigate('/todo-hub', { state: { openCreateTask: true } });
      }
    },
    {
      id: 'marketing',
      title: 'View Marketing Services',
      description: 'Let us set up your personal lead gen system',
      icon: Megaphone,
      isComplete: hasViewedMarketing,
      action: () => navigate('/ad-analyzer')
    },
  ];

  // Calculate total completion across all steps (10 tasks total = 10% each)
  const allTasks = [...step1Items, ...step2Items, ...step3Items];
  const totalTasks = allTasks.length; // 10 tasks
  const completedTasks = allTasks.filter(item => item.isComplete).length;
  const progressPercent = (completedTasks / totalTasks) * 100;
  const allComplete = completedTasks === totalTasks;

  // Check if each step is fully complete (for auto-collapse)
  const step1Complete = step1Items.every(item => item.isComplete);
  const step2Complete = step2Items.every(item => item.isComplete);
  const step3Complete = step3Items.every(item => item.isComplete);

  // Auto-collapse completed steps
  useEffect(() => {
    if (step1Complete && step1Expanded) setStep1Expanded(false);
    if (step2Complete && step2Expanded) setStep2Expanded(false);
    if (step3Complete && step3Expanded) setStep3Expanded(false);
  }, [step1Complete, step2Complete, step3Complete]);

  // Helper to render a step item
  const renderStepItem = (item: SetupStep) => (
    <button
      key={item.id}
      onClick={item.action}
      className={`w-full flex items-center gap-3 p-3 rounded-lg transition-all ${
        item.isComplete
          ? theme === 'light' ? 'bg-green-50' : 'bg-green-500/10'
          : theme === 'light' ? 'bg-gray-50 hover:bg-gray-100' : 'bg-zinc-800 hover:bg-zinc-700'
      }`}
    >
      {item.isComplete ? (
        <CheckCircle2 className="w-5 h-5 text-green-500 flex-shrink-0" />
      ) : (
        <Circle className={`w-5 h-5 ${themeClasses.text.muted} flex-shrink-0`} />
      )}
      <div className={`w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 ${
        item.isComplete ? 'bg-green-500/20' : 'bg-[#043d6b]/20'
      }`}>
        <item.icon className={`w-4 h-4 ${item.isComplete ? 'text-green-500' : 'text-[#043d6b]'}`} />
      </div>
      <div className="flex-1 text-left min-w-0">
        <p className={`text-sm font-medium ${item.isComplete ? 'text-green-600 dark:text-green-400' : themeClasses.text.primary} truncate`}>
          {item.title}
        </p>
        <p className={`text-xs ${themeClasses.text.muted} truncate`}>
          {item.description}
        </p>
      </div>
      {!item.isComplete && (
        <ChevronRight className={`w-4 h-4 ${themeClasses.text.muted} flex-shrink-0`} />
      )}
    </button>
  );

  if (loading) {
    return (
      <div className="w-full px-4 py-4">
        <div className="flex items-center justify-center">
          <div className="animate-pulse flex flex-col items-center gap-2">
            <div className="w-12 h-12 bg-gray-300 rounded-xl"></div>
            <div className="w-32 h-4 bg-gray-300 rounded"></div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full max-w-lg mx-auto px-4 py-4">
      {/* Header */}
      <div className="flex flex-col items-center text-center mb-6">
        <div className={`w-16 h-16 ${allComplete ? 'bg-green-500' : 'bg-gradient-to-br from-[#043d6b] to-[#065a9e]'} rounded-2xl flex items-center justify-center shadow-lg mb-3`}>
          {allComplete ? (
            <Check className="w-8 h-8 text-white" />
          ) : (
            <Rocket className="w-8 h-8 text-white" />
          )}
        </div>
        <h3 className={`font-bold ${themeClasses.text.primary} text-xl`}>
          {allComplete ? 'Setup Complete!' : 'OnSite Setup'}
        </h3>
        <p className={`text-base ${themeClasses.text.muted}`}>
          {completedTasks} of {totalTasks} complete
        </p>
      </div>

      {/* Progress Bar */}
      <div className="mb-6">
        <div className={`h-3 ${theme === 'light' ? 'bg-gray-200' : 'bg-zinc-700'} rounded-full overflow-hidden`}>
          <div
            className={`h-full ${allComplete ? 'bg-green-500' : 'bg-gradient-to-r from-[#043d6b] to-green-500'} rounded-full transition-all duration-500`}
            style={{ width: `${progressPercent}%` }}
          />
        </div>
        <p className={`text-sm ${themeClasses.text.muted} mt-2 text-right font-medium`}>
          {Math.round(progressPercent)}%
        </p>
      </div>

      {/* Step 1: Get Started - Collapsible */}
      <div className={`border-b ${theme === 'light' ? 'border-gray-200' : 'border-zinc-700'}`}>
        <button
          onClick={() => setStep1Expanded(!step1Expanded)}
          className="w-full flex items-center justify-between py-4"
        >
          <div className="flex items-center gap-3">
            {step1Complete ? (
              <CheckCircle2 className="w-6 h-6 text-green-500" />
            ) : (
              <div className={`w-6 h-6 rounded-full border-2 ${theme === 'light' ? 'border-gray-300' : 'border-zinc-500'} flex items-center justify-center`}>
                <span className={`text-sm font-bold ${themeClasses.text.muted}`}>1</span>
              </div>
            )}
            <span className={`font-semibold text-base ${step1Complete ? 'text-green-600' : themeClasses.text.primary}`}>
              Get Started
            </span>
            <span className={`text-sm ${themeClasses.text.muted}`}>
              ({step1Items.filter(i => i.isComplete).length}/{step1Items.length})
            </span>
          </div>
          <ChevronDown className={`w-5 h-5 ${themeClasses.text.muted} transition-transform ${step1Expanded ? 'rotate-180' : ''}`} />
        </button>
        <div className={`overflow-hidden transition-all duration-300 ${step1Expanded ? 'max-h-[500px] opacity-100' : 'max-h-0 opacity-0'}`}>
          <div className="pb-3 space-y-2">
            {step1Items.map(renderStepItem)}
          </div>
        </div>
      </div>

      {/* Step 2: Core Features - Collapsible */}
      <div className={`border-b ${theme === 'light' ? 'border-gray-200' : 'border-zinc-700'}`}>
        <button
          onClick={() => setStep2Expanded(!step2Expanded)}
          className="w-full flex items-center justify-between py-4"
        >
          <div className="flex items-center gap-3">
            {step2Complete ? (
              <CheckCircle2 className="w-6 h-6 text-green-500" />
            ) : (
              <div className={`w-6 h-6 rounded-full border-2 ${theme === 'light' ? 'border-gray-300' : 'border-zinc-500'} flex items-center justify-center`}>
                <span className={`text-sm font-bold ${themeClasses.text.muted}`}>2</span>
              </div>
            )}
            <span className={`font-semibold text-base ${step2Complete ? 'text-green-600' : themeClasses.text.primary}`}>
              Core Features
            </span>
            <span className={`text-sm ${themeClasses.text.muted}`}>
              ({step2Items.filter(i => i.isComplete).length}/{step2Items.length})
            </span>
          </div>
          <ChevronDown className={`w-5 h-5 ${themeClasses.text.muted} transition-transform ${step2Expanded ? 'rotate-180' : ''}`} />
        </button>
        <div className={`overflow-hidden transition-all duration-300 ${step2Expanded ? 'max-h-[500px] opacity-100' : 'max-h-0 opacity-0'}`}>
          <div className="pb-3 space-y-2">
            {step2Items.map(renderStepItem)}
          </div>
        </div>
      </div>

      {/* Step 3: Get a Feel - Collapsible */}
      <div className={`border-b ${theme === 'light' ? 'border-gray-200' : 'border-zinc-700'}`}>
        <button
          onClick={() => setStep3Expanded(!step3Expanded)}
          className="w-full flex items-center justify-between py-4"
        >
          <div className="flex items-center gap-3">
            {step3Complete ? (
              <CheckCircle2 className="w-6 h-6 text-green-500" />
            ) : (
              <div className={`w-6 h-6 rounded-full border-2 ${theme === 'light' ? 'border-gray-300' : 'border-zinc-500'} flex items-center justify-center`}>
                <span className={`text-sm font-bold ${themeClasses.text.muted}`}>3</span>
              </div>
            )}
            <span className={`font-semibold text-base ${step3Complete ? 'text-green-600' : themeClasses.text.primary}`}>
              Get a Feel
            </span>
            <span className={`text-sm ${themeClasses.text.muted}`}>
              ({step3Items.filter(i => i.isComplete).length}/{step3Items.length})
            </span>
          </div>
          <ChevronDown className={`w-5 h-5 ${themeClasses.text.muted} transition-transform ${step3Expanded ? 'rotate-180' : ''}`} />
        </button>
        <div className={`overflow-hidden transition-all duration-300 ${step3Expanded ? 'max-h-[500px] opacity-100' : 'max-h-0 opacity-0'}`}>
          <div className="pb-3 space-y-2">
            {step3Items.map(renderStepItem)}
          </div>
        </div>
      </div>

      {/* OnSite AI Tutorial Popup */}
      {showOnSiteAITutorial && (
        <div className="fixed inset-0 z-[200] flex items-center justify-center px-4">
          {/* Backdrop */}
          <div
            className="absolute inset-0 bg-black/60 backdrop-blur-sm"
            onClick={() => setShowOnSiteAITutorial(false)}
          />

          {/* Modal */}
          <div className="relative w-full max-w-md bg-white rounded-2xl overflow-hidden shadow-2xl animate-slide-up">
            {/* Close Button */}
            <button
              onClick={() => setShowOnSiteAITutorial(false)}
              className="absolute top-4 right-4 p-2 text-gray-400 hover:text-gray-600 rounded-lg z-10"
            >
              <X className="w-5 h-5" />
            </button>

            {/* Header */}
            <div className="p-6 pb-4">
              <div className="flex items-start gap-4">
                <div className="w-14 h-14 bg-[#043d6b] rounded-xl flex items-center justify-center flex-shrink-0">
                  <Mic className="w-7 h-7 text-white" />
                </div>
                <div>
                  <h2 className="text-xl font-bold text-gray-900">OnSite AI Assistant</h2>
                  <p className="text-gray-500 text-sm mt-1">Your voice-powered helper</p>
                </div>
              </div>
            </div>

            {/* Content */}
            <div className="px-6 pb-4">
              <p className="text-gray-600 mb-4">
                OnSite AI is your on-the-fly assistant. Open it anytime from the bottom bar and use voice or text to get things done fast.
              </p>

              {/* What you can do */}
              <div className="bg-blue-50 rounded-xl p-4 mb-4">
                <h3 className="font-semibold text-gray-900 mb-3">What you can do:</h3>
                <div className="space-y-3">
                  <div className="flex items-start gap-3">
                    <div className="w-6 h-6 bg-[#043d6b] rounded-full flex items-center justify-center flex-shrink-0 text-white text-xs font-bold">1</div>
                    <p className="text-gray-700 text-sm"><span className="font-semibold">Tap the mic icon</span> on the bottom bar to start talking</p>
                  </div>
                  <div className="flex items-start gap-3">
                    <div className="w-6 h-6 bg-[#043d6b] rounded-full flex items-center justify-center flex-shrink-0 text-white text-xs font-bold">2</div>
                    <p className="text-gray-700 text-sm"><span className="font-semibold">Ask anything</span> - create estimates, add clients, schedule tasks</p>
                  </div>
                  <div className="flex items-start gap-3">
                    <div className="w-6 h-6 bg-[#043d6b] rounded-full flex items-center justify-center flex-shrink-0 text-white text-xs font-bold">3</div>
                    <p className="text-gray-700 text-sm"><span className="font-semibold">Get instant help</span> with any question about your business</p>
                  </div>
                </div>
              </div>

              {/* Pro tip */}
              <div className="bg-amber-50 border-2 border-amber-200 rounded-xl p-4">
                <p className="text-amber-800 text-sm">
                  <span className="font-semibold">Pro tip:</span> Use speech-to-text while on a job site to quickly log notes, create tasks, or draft estimates hands-free!
                </p>
              </div>
            </div>

            {/* Footer */}
            <div className="px-6 pb-6">
              <button
                onClick={() => {
                  localStorage.setItem('onsite_ai_used', 'true');
                  setHasUsedOnSiteAI(true);
                  setShowOnSiteAITutorial(false);
                  // Open AI chat
                  window.dispatchEvent(new CustomEvent('openAIChat'));
                }}
                className="w-full py-3.5 bg-[#043d6b] hover:bg-[#035291] text-white rounded-xl font-semibold active:scale-[0.98] transition-all"
              >
                Got it, let's try it!
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Vision Cam Tutorial Popup */}
      {showVisionCamTutorial && (
        <div className="fixed inset-0 z-[200] flex items-center justify-center px-4">
          {/* Backdrop */}
          <div
            className="absolute inset-0 bg-black/60 backdrop-blur-sm"
            onClick={() => setShowVisionCamTutorial(false)}
          />

          {/* Modal */}
          <div className="relative w-full max-w-md bg-white rounded-2xl overflow-hidden shadow-2xl animate-slide-up">
            {/* Close Button */}
            <button
              onClick={() => setShowVisionCamTutorial(false)}
              className="absolute top-4 right-4 p-2 text-gray-400 hover:text-gray-600 rounded-lg z-10"
            >
              <X className="w-5 h-5" />
            </button>

            {/* Header */}
            <div className="p-6 pb-4">
              <div className="flex items-start gap-4">
                <div className="w-14 h-14 bg-[#043d6b] rounded-xl flex items-center justify-center flex-shrink-0">
                  <Camera className="w-7 h-7 text-white" />
                </div>
                <div>
                  <h2 className="text-xl font-bold text-gray-900">Vision Cam</h2>
                  <p className="text-gray-500 text-sm mt-1">AI-powered material scanning</p>
                </div>
              </div>
            </div>

            {/* Content */}
            <div className="px-6 pb-4">
              <p className="text-gray-600 mb-4">
                Vision Cam uses AI to identify materials and provide instant pricing estimates. Point your camera at any material on the job site.
              </p>

              {/* What you can do */}
              <div className="bg-blue-50 rounded-xl p-4 mb-4">
                <h3 className="font-semibold text-gray-900 mb-3">What you can do:</h3>
                <div className="space-y-3">
                  <div className="flex items-start gap-3">
                    <div className="w-6 h-6 bg-[#043d6b] rounded-full flex items-center justify-center flex-shrink-0 text-white text-xs font-bold">1</div>
                    <p className="text-gray-700 text-sm"><span className="font-semibold">Tap Camera</span> in the bottom navigation bar</p>
                  </div>
                  <div className="flex items-start gap-3">
                    <div className="w-6 h-6 bg-[#043d6b] rounded-full flex items-center justify-center flex-shrink-0 text-white text-xs font-bold">2</div>
                    <p className="text-gray-700 text-sm"><span className="font-semibold">Select Vision Cam</span> to activate AI material detection</p>
                  </div>
                  <div className="flex items-start gap-3">
                    <div className="w-6 h-6 bg-[#043d6b] rounded-full flex items-center justify-center flex-shrink-0 text-white text-xs font-bold">3</div>
                    <p className="text-gray-700 text-sm"><span className="font-semibold">Point & scan</span> any material to get instant pricing</p>
                  </div>
                </div>
              </div>

              {/* Pro tip */}
              <div className="bg-amber-50 border-2 border-amber-200 rounded-xl p-4">
                <p className="text-amber-800 text-sm">
                  <span className="font-semibold">Pro tip:</span> Use Vision Cam at the hardware store to compare prices, or on-site to quickly add materials to your estimates!
                </p>
              </div>
            </div>

            {/* Footer */}
            <div className="px-6 pb-6">
              <button
                onClick={() => {
                  localStorage.setItem('onsite_vision_cam_opened', 'true');
                  setHasOpenedVisionCam(true);
                  setShowVisionCamTutorial(false);
                  // Open Vision Cam so they can try it
                  window.dispatchEvent(new CustomEvent('openVisionCam'));
                }}
                className="w-full py-3.5 bg-[#043d6b] hover:bg-[#035291] text-white rounded-xl font-semibold active:scale-[0.98] transition-all"
              >
                Got it, let's try it!
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
};

export default OnSiteSetup;
