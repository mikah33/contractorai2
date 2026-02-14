import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  FileText,
  Plus,
  Edit2,
  ChevronRight,
  DollarSign,
  Clock,
  CheckCircle,
  XCircle,
  Sparkles,
  Search,
  X,
  Calendar,
  User,
  Trash2,
  Send,
  Settings,
  Mail
} from 'lucide-react';
import useEstimateStore from '../stores/estimateStore';
import { useOnboardingStore } from '../stores/onboardingStore';
import { supabase } from '../lib/supabase';
import AIChatPopup from '../components/ai/AIChatPopup';
import FloatingAIChatButton from '../components/ai/FloatingAIChatButton';
import AddChoiceModal from '../components/common/AddChoiceModal';
import EstimatingTutorialModal from '../components/estimates/EstimatingTutorialModal';
import SendEstimateModal from '../components/estimates/SendEstimateModal';
import EstimateRealtimeTest from '../components/estimates/EstimateRealtimeTest';
import { useTheme, getThemeClasses } from '../contexts/ThemeContext';
import { useData } from '../contexts/DataContext';
import useEstimateRealtime from '../hooks/useEstimateRealtime';

interface Estimate {
  id: string;
  title: string;
  client_name?: string;
  project_name?: string;
  status: 'draft' | 'sent' | 'approved' | 'rejected';
  total: number;
  subtotal?: number;
  tax_rate?: number;
  tax_amount?: number;
  notes?: string;
  terms?: string;
  items?: Array<{
    id: string;
    description: string;
    quantity: number;
    unit: string;
    unitPrice: number;
    totalPrice: number;
    type: string;
  }>;
  created_at?: string;
  expires_at?: string;
}

interface EstimatesHubProps {
  embedded?: boolean;
  searchQuery?: string;
}

const EstimatesHub: React.FC<EstimatesHubProps> = ({ embedded = false, searchQuery: externalSearchQuery }) => {
  const navigate = useNavigate();
  const { theme } = useTheme();
  const themeClasses = getThemeClasses(theme);
  const { profile } = useData();
  const { estimates, fetchEstimates, loading, deleteEstimate, updateEstimate } = useEstimateStore();
  const { estimatingTutorialCompleted, checkEstimatingTutorial, setEstimatingTutorialCompleted } = useOnboardingStore();
  const [showAddChoice, setShowAddChoice] = useState(false);
  const [showAIChat, setShowAIChat] = useState(false);
  const [internalSearchQuery, setInternalSearchQuery] = useState('');

  // Use external search query if provided (embedded mode)
  const searchQuery = externalSearchQuery !== undefined ? externalSearchQuery : internalSearchQuery;
  const setSearchQuery = externalSearchQuery !== undefined ? () => {} : setInternalSearchQuery;
  const [showTutorial, setShowTutorial] = useState(false);
  const [userId, setUserId] = useState<string | null>(null);
  const [selectedEstimate, setSelectedEstimate] = useState<Estimate | null>(null);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [showSendEmail, setShowSendEmail] = useState(false);
  const [showRealtimeTest, setShowRealtimeTest] = useState(false);

  // Set up real-time subscription for estimate updates
  useEstimateRealtime(userId);

  useEffect(() => {
    fetchEstimates();
  }, [fetchEstimates]);

  // Check tutorial status on mount
  useEffect(() => {
    const checkTutorial = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (user?.id) {
        setUserId(user.id);
        const completed = await checkEstimatingTutorial(user.id);
        if (!completed) {
          setShowTutorial(true);
        }
      }
    };
    checkTutorial();
  }, []);

  const handleTutorialComplete = async (dontShowAgain: boolean) => {
    setShowTutorial(false);
    if (dontShowAgain && userId) {
      await setEstimatingTutorialCompleted(userId, true);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'approved':
        return theme === 'light' ? 'bg-green-100 text-green-700' : 'bg-green-500/20 text-green-400';
      case 'sent':
        return theme === 'light' ? 'bg-blue-100 text-blue-700' : 'bg-blue-500/20 text-blue-400';
      case 'declined':
      case 'rejected':
        return theme === 'light' ? 'bg-red-100 text-red-700' : 'bg-red-500/20 text-red-400';
      case 'draft':
      default:
        return theme === 'light' ? 'bg-gray-100 text-gray-600' : 'bg-zinc-800 text-zinc-400';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'approved':
        return <CheckCircle className="w-4 h-4" />;
      case 'sent':
        return <Clock className="w-4 h-4" />;
      case 'declined':
      case 'rejected':
        return <XCircle className="w-4 h-4" />;
      default:
        return <FileText className="w-4 h-4" />;
    }
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(amount);
  };

  const filteredEstimates = estimates.filter(est =>
    est.title?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    est.client_name?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const handleEditEstimate = (estimateId: string) => {
    navigate('/estimates', { state: { editEstimateId: estimateId } });
  };

  const handleAIChat = () => {
    setShowAIChat(true);
  };

  const handleManual = () => {
    navigate('/pricing');
  };

  return (
    <div className={`${embedded ? '' : 'min-h-screen'} ${themeClasses.bg.primary} ${embedded ? '' : 'pb-40'}`}>
      {/* Estimating Tutorial Modal */}
      <EstimatingTutorialModal
        isOpen={showTutorial}
        onComplete={handleTutorialComplete}
      />

      {/* Header - hidden when embedded */}
      {!embedded && (
        <>
          <div className={`fixed top-0 left-0 right-0 z-50 ${themeClasses.bg.secondary} border-b ${themeClasses.border.primary}`}>
            <div className="pt-[env(safe-area-inset-top)]">
              <div className="px-4 pb-5 pt-4">
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-4">
                    <div className="w-14 h-14 bg-blue-500/20 rounded-xl flex items-center justify-center flex-shrink-0">
                      <FileText className="w-7 h-7 text-blue-500" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <h1 className={`text-2xl font-bold ${themeClasses.text.primary}`}>Estimates</h1>
                      <p className={`text-base ${themeClasses.text.secondary}`}>{estimates.length} total</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <button
                      onClick={() => navigate('/settings')}
                      className={`w-14 h-14 ${themeClasses.bg.tertiary} rounded-xl flex items-center justify-center hover:opacity-80 transition-colors`}
                    >
                      <Settings className={`w-7 h-7 ${themeClasses.text.secondary}`} />
                    </button>
                    <button
                      onClick={() => setShowAddChoice(true)}
                      className="flex items-center gap-2 px-4 py-2.5 bg-blue-500 text-white rounded-lg font-medium hover:bg-blue-600 active:scale-95 transition-all"
                    >
                      <Plus className="w-5 h-5" />
                      <span>Add</span>
                    </button>
                  </div>
                </div>

                {/* Search */}
                <div className="relative">
                  <Search className={`absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 ${themeClasses.text.muted}`} />
                  <input
                    type="text"
                    placeholder="Search estimates..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className={`w-full pl-10 pr-4 py-2.5 ${themeClasses.bg.input} rounded-lg border ${themeClasses.border.input} ${themeClasses.text.primary} placeholder-${theme === 'light' ? 'gray-400' : 'zinc-500'} focus:ring-2 focus:ring-blue-500 transition-all`}
                  />
                </div>
              </div>
            </div>
          </div>
          {/* Spacer for fixed header */}
          <div className="pt-[calc(env(safe-area-inset-top)+135px)]" />
        </>
      )}
      {/* Add Estimate Card */}
      <div className="px-4 pb-4 -mt-1">
        <div className={`${themeClasses.bg.card} rounded-2xl border-2 ${theme === 'light' ? 'border-gray-300' : 'border-zinc-600'} p-6 relative overflow-hidden`}>
          {/* Background decorations */}
          <div className="absolute -right-6 -top-6 w-44 h-44 bg-blue-500/10 rounded-full" />
          <div className="absolute right-16 top-20 w-28 h-28 bg-blue-500/5 rounded-full" />

          <div className="relative min-h-[240px] flex flex-col">
            <div className="flex items-center gap-4 mb-5">
              <div className="w-16 h-16 bg-blue-500/20 rounded-2xl flex items-center justify-center">
                <FileText className="w-8 h-8 text-blue-500" />
              </div>
              <div>
                <h3 className={`font-bold ${themeClasses.text.primary} text-xl`}>Add Estimate</h3>
                <p className={`${themeClasses.text.secondary} text-base`}>Create professional quotes</p>
              </div>
            </div>

            <p className={`${themeClasses.text.secondary} italic text-base flex-1`}>
              Add new estimates manually or use AI to generate professional quotes, calculate costs, and send to clients.
            </p>

            <div className="space-y-3 mt-auto">
              <button
                onClick={() => setShowAddChoice(true)}
                className="w-full flex items-center justify-center gap-2 px-5 py-4 bg-blue-500 text-white rounded-xl font-semibold text-lg hover:bg-blue-600 active:scale-[0.98] transition-all"
              >
                <Plus className="w-6 h-6" />
                Add Estimate
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Estimates List */}
      <div className="px-4 space-y-3">
        {loading ? (
          <div className="flex items-center justify-center py-12">
            <div className={`animate-spin rounded-full h-8 w-8 border-b-2 ${theme === 'light' ? 'border-gray-600' : 'border-white'}`}></div>
          </div>
        ) : filteredEstimates.length === 0 ? (
          <div className="text-center py-12">
            <FileText className={`w-12 h-12 ${theme === 'light' ? 'text-gray-400' : 'text-zinc-600'} mx-auto mb-3`} />
            <p className={`${themeClasses.text.secondary} font-medium`}>No estimates yet</p>
            <p className={`text-sm ${themeClasses.text.muted} mt-1`}>Tap + to create your first estimate</p>
          </div>
        ) : (
          filteredEstimates.map((estimate, index) => (
            <div key={estimate.id} className={index < filteredEstimates.length - 1 ? `border-b ${themeClasses.border.primary} pb-3 mb-3` : ''}>
              <button
                onClick={() => setSelectedEstimate(estimate as Estimate)}
                className={`w-full ${themeClasses.bg.card} rounded-lg border-2 ${theme === 'light' ? 'border-gray-300' : 'border-zinc-600'} overflow-hidden text-left active:scale-[0.98] transition-transform`}
              >
              <div className="p-3 md:p-4">
                <div className="flex items-start justify-between mb-2">
                  <div className="flex-1 min-w-0">
                    <h3 className={`font-semibold ${themeClasses.text.primary} truncate`}>
                      {estimate.title || 'Untitled Estimate'}
                    </h3>
                    {estimate.client_name && (
                      <p className={`text-sm ${themeClasses.text.secondary} truncate`}>{estimate.client_name}</p>
                    )}
                  </div>
                  <span className={`flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium ${getStatusColor(estimate.status)}`}>
                    {getStatusIcon(estimate.status)}
                    {estimate.status}
                  </span>
                </div>

                <div className="flex items-center justify-between mt-3">
                  <div className={`flex items-center gap-1 text-base md:text-lg font-bold ${themeClasses.text.primary}`}>
                    <DollarSign className={`w-5 h-5 ${themeClasses.text.primary}`} />
                    {formatCurrency(estimate.total || 0)}
                  </div>
                  <div className="flex items-center gap-2">
                    <span className={`text-xs ${themeClasses.text.muted}`}>
                      {new Date(estimate.created_at || '').toLocaleDateString()}
                    </span>
                    <ChevronRight className={`w-5 h-5 ${themeClasses.text.muted}`} />
                  </div>
                </div>
              </div>
              </button>
            </div>
          ))
        )}
      </div>

      {/* Add Choice Modal */}
      <AddChoiceModal
        isOpen={showAddChoice}
        onClose={() => setShowAddChoice(false)}
        onAIChat={handleAIChat}
        onManual={handleManual}
        title="Create Estimate"
        aiLabel="AI Assistant"
        aiDescription="Describe your project and I'll build the estimate"
        manualLabel="Calculator"
        manualDescription="Use the pricing calculator manually"
      />

      {/* AI Chat Popup */}
      <AIChatPopup
        isOpen={showAIChat}
        onClose={() => setShowAIChat(false)}
        mode="estimating"
      />

      {/* Estimate Detail Modal */}
      {selectedEstimate && (
        <div className="fixed inset-0 z-50 overflow-hidden pb-16">
          {/* Backdrop */}
          <div
            className="absolute inset-0 bg-black/50 transition-opacity"
            onClick={() => setSelectedEstimate(null)}
          />

          {/* Slide-up Modal */}
          <div className={`absolute inset-x-0 bottom-16 top-12 ${themeClasses.bg.primary} rounded-t-3xl shadow-2xl flex flex-col animate-slide-up overflow-hidden`}>
            {/* Header */}
            <div className={`${themeClasses.bg.secondary} px-3 md:px-4 py-3 md:py-4 border-b border-blue-500/30 flex items-center justify-between flex-shrink-0`}>
              <button
                onClick={() => setSelectedEstimate(null)}
                className={`${themeClasses.text.secondary} text-base font-medium`}
              >
                Close
              </button>
              <h2 className={`text-lg font-semibold ${themeClasses.text.primary}`}>Estimate Details</h2>
              <button
                onClick={() => {
                  handleEditEstimate(selectedEstimate.id);
                  setSelectedEstimate(null);
                }}
                className="text-blue-500 text-base font-semibold"
              >
                Edit
              </button>
            </div>

            {/* Content */}
            <div className="flex-1 overflow-y-auto">
              <div className="p-3 md:p-4 space-y-3 md:space-y-4">
                {/* Title & Status */}
                <div className={`${themeClasses.bg.secondary} rounded-lg border border-blue-500/30 p-3 md:p-4`}>
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex-1">
                      <h3 className={`text-lg md:text-xl font-bold ${themeClasses.text.primary}`}>{selectedEstimate.title || 'Untitled Estimate'}</h3>
                      {selectedEstimate.client_name && (
                        <div className={`flex items-center gap-2 mt-1 ${themeClasses.text.secondary}`}>
                          <User className="w-4 h-4" />
                          <span>{selectedEstimate.client_name}</span>
                        </div>
                      )}
                    </div>
                    <span className={`flex items-center gap-1 px-3 py-1.5 rounded-full text-sm font-medium ${getStatusColor(selectedEstimate.status)}`}>
                      {getStatusIcon(selectedEstimate.status)}
                      {selectedEstimate.status}
                    </span>
                  </div>

                  <div className={`flex items-center gap-4 text-sm ${themeClasses.text.secondary}`}>
                    <div className="flex items-center gap-1">
                      <Calendar className="w-4 h-4" />
                      <span>Created: {new Date(selectedEstimate.created_at || '').toLocaleDateString()}</span>
                    </div>
                    {selectedEstimate.expires_at && (
                      <div className="flex items-center gap-1">
                        <Clock className="w-4 h-4" />
                        <span>Expires: {new Date(selectedEstimate.expires_at).toLocaleDateString()}</span>
                      </div>
                    )}
                  </div>
                </div>

                {/* Totals */}
                <div className={`${themeClasses.bg.secondary} rounded-lg border border-blue-500/30 p-3 md:p-4`}>
                  <h4 className={`text-sm font-medium ${themeClasses.text.muted} mb-3`}>Summary</h4>
                  <div className="space-y-2">
                    <div className={`flex justify-between ${themeClasses.text.primary}`}>
                      <span>Subtotal</span>
                      <span>{formatCurrency(selectedEstimate.subtotal || selectedEstimate.total || 0)}</span>
                    </div>
                    {selectedEstimate.tax_rate && selectedEstimate.tax_rate > 0 && (
                      <div className={`flex justify-between ${themeClasses.text.secondary}`}>
                        <span>Tax ({selectedEstimate.tax_rate}%)</span>
                        <span>{formatCurrency(selectedEstimate.tax_amount || 0)}</span>
                      </div>
                    )}
                    <div className={`flex justify-between text-lg md:text-xl font-bold ${themeClasses.text.primary} pt-2 border-t border-blue-500/20`}>
                      <span>Total</span>
                      <span className="text-blue-500">{formatCurrency(selectedEstimate.total || 0)}</span>
                    </div>
                  </div>
                </div>

                {/* Line Items */}
                {selectedEstimate.items && selectedEstimate.items.length > 0 && (
                  <div className={`${themeClasses.bg.secondary} rounded-lg border border-blue-500/30 p-3 md:p-4`}>
                    <h4 className={`text-sm font-medium ${themeClasses.text.muted} mb-3`}>Line Items ({selectedEstimate.items.length})</h4>
                    <div className="space-y-3">
                      {selectedEstimate.items.map((item, index) => (
                        <div key={item.id || index} className="flex justify-between items-start py-2 border-b border-blue-500/10 last:border-0">
                          <div className="flex-1">
                            <p className={`${themeClasses.text.primary} font-medium`}>{item.description}</p>
                            <p className={`text-sm ${themeClasses.text.muted}`}>
                              {item.quantity} {item.unit} × {formatCurrency(item.unitPrice)}
                            </p>
                          </div>
                          <p className={`${themeClasses.text.primary} font-medium`}>{formatCurrency(item.totalPrice)}</p>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Notes */}
                {selectedEstimate.notes && (
                  <div className={`${themeClasses.bg.secondary} rounded-lg border border-blue-500/30 p-3 md:p-4`}>
                    <h4 className={`text-sm font-medium ${themeClasses.text.muted} mb-2`}>Notes</h4>
                    <p className={`${themeClasses.text.primary} whitespace-pre-wrap`}>{selectedEstimate.notes}</p>
                  </div>
                )}

                {/* Terms */}
                {selectedEstimate.terms && (
                  <div className={`${themeClasses.bg.secondary} rounded-lg border border-blue-500/30 p-3 md:p-4`}>
                    <h4 className={`text-sm font-medium ${themeClasses.text.muted} mb-2`}>Terms & Conditions</h4>
                    <p className={`${themeClasses.text.secondary} text-sm whitespace-pre-wrap`}>{selectedEstimate.terms}</p>
                  </div>
                )}

                {/* Actions */}
                <div className="space-y-3 pt-2">
                  {/* Send to Customer Button */}
                  <button
                    onClick={() => {
                      setShowSendEmail(true);
                    }}
                    className="w-full flex items-center justify-center gap-2 p-4 bg-blue-500 text-white rounded-xl font-semibold hover:bg-blue-600 transition-colors"
                  >
                    <Mail className="w-5 h-5" />
                    Send to Customer
                  </button>

                  {selectedEstimate.status === 'draft' && (
                    <button
                      onClick={async () => {
                        await updateEstimate(selectedEstimate.id, { status: 'sent' });
                        setSelectedEstimate({ ...selectedEstimate, status: 'sent' });
                        fetchEstimates();
                      }}
                      className="w-full flex items-center justify-center gap-2 p-4 bg-blue-500 text-white rounded-xl font-semibold"
                    >
                      <Send className="w-5 h-5" />
                      Mark as Sent
                    </button>
                  )}

                  {selectedEstimate.status === 'sent' && (
                    <button
                      onClick={async () => {
                        await updateEstimate(selectedEstimate.id, { status: 'approved' });
                        setSelectedEstimate({ ...selectedEstimate, status: 'approved' });
                        fetchEstimates();
                      }}
                      className="w-full flex items-center justify-center gap-2 p-4 bg-green-600 text-white rounded-xl font-semibold"
                    >
                      <CheckCircle className="w-5 h-5" />
                      Mark as Approved
                    </button>
                  )}

                  <button
                    onClick={() => {
                      handleEditEstimate(selectedEstimate.id);
                      setSelectedEstimate(null);
                    }}
                    className={`w-full flex items-center justify-center gap-2 p-4 ${themeClasses.bg.tertiary} ${themeClasses.text.primary} rounded-xl font-semibold`}
                  >
                    <Edit2 className="w-5 h-5" />
                    Edit Estimate
                  </button>

                  <button
                    onClick={() => setShowDeleteConfirm(true)}
                    className="w-full flex items-center justify-center gap-2 p-4 bg-red-500/20 text-red-400 rounded-xl font-semibold"
                  >
                    <Trash2 className="w-5 h-5" />
                    Delete Estimate
                  </button>
                </div>
              </div>
            </div>
          </div>

          {/* Delete Confirmation */}
          {showDeleteConfirm && (
            <div className="absolute inset-0 z-60 flex items-center justify-center bg-black/70">
              <div className={`${themeClasses.bg.secondary} rounded-xl p-6 mx-4 max-w-sm w-full`}>
                <h3 className={`text-lg font-bold ${themeClasses.text.primary} mb-2`}>Delete Estimate?</h3>
                <p className={`${themeClasses.text.secondary} mb-6`}>This action cannot be undone.</p>
                <div className="flex gap-3">
                  <button
                    onClick={() => setShowDeleteConfirm(false)}
                    className={`flex-1 p-3 ${themeClasses.bg.tertiary} ${themeClasses.text.primary} rounded-xl font-medium`}
                  >
                    Cancel
                  </button>
                  <button
                    onClick={async () => {
                      await deleteEstimate(selectedEstimate.id);
                      setShowDeleteConfirm(false);
                      setSelectedEstimate(null);
                      fetchEstimates();
                    }}
                    className="flex-1 p-3 bg-red-500 text-white rounded-xl font-medium"
                  >
                    Delete
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Send Estimate Modal */}
      {showSendEmail && selectedEstimate && (
        <SendEstimateModal
          isOpen={showSendEmail}
          onClose={() => setShowSendEmail(false)}
          estimate={selectedEstimate}
          companyInfo={{
            name: profile?.company_name || profile?.full_name || 'Your Company',
            email: profile?.email || '',
            phone: profile?.phone || '',
            address: profile?.business_address || ''
          }}
        />
      )}

      {/* Real-time Test Modal */}
      <EstimateRealtimeTest
        isOpen={showRealtimeTest}
        onClose={() => setShowRealtimeTest(false)}
      />

    </div>
  );
};

export default EstimatesHub;
