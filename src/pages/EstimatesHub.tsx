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
  Send
} from 'lucide-react';
import useEstimateStore from '../stores/estimateStore';
import { useOnboardingStore } from '../stores/onboardingStore';
import { supabase } from '../lib/supabase';
import AIChatPopup from '../components/ai/AIChatPopup';
import AddChoiceModal from '../components/common/AddChoiceModal';
import EstimatingTutorialModal from '../components/estimates/EstimatingTutorialModal';

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

const EstimatesHub: React.FC = () => {
  const navigate = useNavigate();
  const { estimates, fetchEstimates, loading, deleteEstimate, updateEstimate } = useEstimateStore();
  const { estimatingTutorialCompleted, checkEstimatingTutorial, setEstimatingTutorialCompleted } = useOnboardingStore();
  const [showAddChoice, setShowAddChoice] = useState(false);
  const [showAIChat, setShowAIChat] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [showTutorial, setShowTutorial] = useState(false);
  const [userId, setUserId] = useState<string | null>(null);
  const [selectedEstimate, setSelectedEstimate] = useState<Estimate | null>(null);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

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
        return 'bg-green-500/20 text-green-400';
      case 'sent':
        return 'bg-blue-500/20 text-blue-400';
      case 'declined':
        return 'bg-red-500/20 text-red-400';
      case 'draft':
      default:
        return 'bg-zinc-800 text-zinc-400';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'approved':
        return <CheckCircle className="w-4 h-4" />;
      case 'sent':
        return <Clock className="w-4 h-4" />;
      case 'declined':
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
    <div className="min-h-full bg-[#0F0F0F] pb-24">
      {/* Estimating Tutorial Modal */}
      <EstimatingTutorialModal
        isOpen={showTutorial}
        onComplete={handleTutorialComplete}
      />

      {/* Header */}
      <div className="bg-[#1C1C1E] border-b border-orange-500/30 px-4 pb-4 pt-[calc(env(safe-area-inset-top)+16px)] sticky top-0 z-10">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-orange-500/20 rounded-lg flex items-center justify-center">
              <FileText className="w-5 h-5 text-orange-500" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-white">Estimates</h1>
              <p className="text-sm text-zinc-400">{estimates.length} total</p>
            </div>
          </div>
          <button
            onClick={() => setShowAddChoice(true)}
            className="flex items-center gap-2 px-4 py-2.5 bg-white text-black rounded-md font-medium hover:bg-zinc-200 active:scale-95 transition-all"
          >
            <Plus className="w-5 h-5" />
            <span>Add</span>
          </button>
        </div>

        {/* Search */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-zinc-500" />
          <input
            type="text"
            placeholder="Search estimates..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-2.5 bg-[#262626] rounded-lg border border-[#3A3A3C] text-white placeholder-zinc-500 focus:ring-2 focus:ring-zinc-500 focus:bg-[#2C2C2E] transition-all"
          />
        </div>
      </div>

      {/* AI Chat Quick Access */}
      <div className="px-4 py-3">
        <button
          onClick={handleAIChat}
          className="w-full flex items-center gap-3 p-3 md:p-4 bg-[#1C1C1E] rounded-lg border border-orange-500/30 active:scale-[0.98] transition-transform hover:border-orange-500/50"
        >
          <div className="w-10 h-10 bg-orange-500/20 rounded-lg flex items-center justify-center">
            <Sparkles className="w-5 h-5 text-orange-500" />
          </div>
          <div className="flex-1 text-left">
            <p className="font-semibold text-white">AI Estimating Assistant</p>
            <p className="text-sm text-zinc-400">Create estimates through conversation</p>
          </div>
          <ChevronRight className="w-5 h-5 text-zinc-500" />
        </button>
      </div>

      {/* Estimates List */}
      <div className="px-4 space-y-3">
        {loading ? (
          <div className="flex items-center justify-center py-12">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-white"></div>
          </div>
        ) : filteredEstimates.length === 0 ? (
          <div className="text-center py-12">
            <FileText className="w-12 h-12 text-zinc-600 mx-auto mb-3" />
            <p className="text-zinc-400 font-medium">No estimates yet</p>
            <p className="text-sm text-zinc-500 mt-1">Tap + to create your first estimate</p>
          </div>
        ) : (
          filteredEstimates.map((estimate) => (
            <button
              key={estimate.id}
              onClick={() => setSelectedEstimate(estimate as Estimate)}
              className="w-full bg-[#1C1C1E] rounded-lg border border-orange-500/30 overflow-hidden text-left active:scale-[0.98] transition-transform"
            >
              <div className="p-3 md:p-4">
                <div className="flex items-start justify-between mb-2">
                  <div className="flex-1 min-w-0">
                    <h3 className="font-semibold text-white truncate">
                      {estimate.title || 'Untitled Estimate'}
                    </h3>
                    {estimate.client_name && (
                      <p className="text-sm text-zinc-400 truncate">{estimate.client_name}</p>
                    )}
                  </div>
                  <span className={`flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium ${getStatusColor(estimate.status)}`}>
                    {getStatusIcon(estimate.status)}
                    {estimate.status}
                  </span>
                </div>

                <div className="flex items-center justify-between mt-3">
                  <div className="flex items-center gap-1 text-base md:text-lg font-bold text-white">
                    <DollarSign className="w-5 h-5 text-white" />
                    {formatCurrency(estimate.total || 0)}
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-zinc-500">
                      {new Date(estimate.created_at || '').toLocaleDateString()}
                    </span>
                    <ChevronRight className="w-5 h-5 text-zinc-500" />
                  </div>
                </div>
              </div>
            </button>
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
          <div className="absolute inset-x-0 bottom-16 top-12 bg-[#0F0F0F] rounded-t-3xl shadow-2xl flex flex-col animate-slide-up overflow-hidden">
            {/* Header */}
            <div className="bg-[#1C1C1E] px-3 md:px-4 py-3 md:py-4 border-b border-orange-500/30 flex items-center justify-between flex-shrink-0">
              <button
                onClick={() => setSelectedEstimate(null)}
                className="text-zinc-400 text-base font-medium"
              >
                Close
              </button>
              <h2 className="text-lg font-semibold text-white">Estimate Details</h2>
              <button
                onClick={() => {
                  handleEditEstimate(selectedEstimate.id);
                  setSelectedEstimate(null);
                }}
                className="text-orange-500 text-base font-semibold"
              >
                Edit
              </button>
            </div>

            {/* Content */}
            <div className="flex-1 overflow-y-auto">
              <div className="p-3 md:p-4 space-y-3 md:space-y-4">
                {/* Title & Status */}
                <div className="bg-[#1C1C1E] rounded-lg border border-orange-500/30 p-3 md:p-4">
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex-1">
                      <h3 className="text-lg md:text-xl font-bold text-white">{selectedEstimate.title || 'Untitled Estimate'}</h3>
                      {selectedEstimate.client_name && (
                        <div className="flex items-center gap-2 mt-1 text-zinc-400">
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

                  <div className="flex items-center gap-4 text-sm text-zinc-400">
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
                <div className="bg-[#1C1C1E] rounded-lg border border-orange-500/30 p-3 md:p-4">
                  <h4 className="text-sm font-medium text-zinc-400 mb-3">Summary</h4>
                  <div className="space-y-2">
                    <div className="flex justify-between text-white">
                      <span>Subtotal</span>
                      <span>{formatCurrency(selectedEstimate.subtotal || selectedEstimate.total || 0)}</span>
                    </div>
                    {selectedEstimate.tax_rate && selectedEstimate.tax_rate > 0 && (
                      <div className="flex justify-between text-zinc-400">
                        <span>Tax ({selectedEstimate.tax_rate}%)</span>
                        <span>{formatCurrency(selectedEstimate.tax_amount || 0)}</span>
                      </div>
                    )}
                    <div className="flex justify-between text-lg md:text-xl font-bold text-white pt-2 border-t border-orange-500/20">
                      <span>Total</span>
                      <span className="text-orange-500">{formatCurrency(selectedEstimate.total || 0)}</span>
                    </div>
                  </div>
                </div>

                {/* Line Items */}
                {selectedEstimate.items && selectedEstimate.items.length > 0 && (
                  <div className="bg-[#1C1C1E] rounded-lg border border-orange-500/30 p-3 md:p-4">
                    <h4 className="text-sm font-medium text-zinc-400 mb-3">Line Items ({selectedEstimate.items.length})</h4>
                    <div className="space-y-3">
                      {selectedEstimate.items.map((item, index) => (
                        <div key={item.id || index} className="flex justify-between items-start py-2 border-b border-orange-500/10 last:border-0">
                          <div className="flex-1">
                            <p className="text-white font-medium">{item.description}</p>
                            <p className="text-sm text-zinc-500">
                              {item.quantity} {item.unit} × {formatCurrency(item.unitPrice)}
                            </p>
                          </div>
                          <p className="text-white font-medium">{formatCurrency(item.totalPrice)}</p>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Notes */}
                {selectedEstimate.notes && (
                  <div className="bg-[#1C1C1E] rounded-lg border border-orange-500/30 p-3 md:p-4">
                    <h4 className="text-sm font-medium text-zinc-400 mb-2">Notes</h4>
                    <p className="text-white whitespace-pre-wrap">{selectedEstimate.notes}</p>
                  </div>
                )}

                {/* Terms */}
                {selectedEstimate.terms && (
                  <div className="bg-[#1C1C1E] rounded-lg border border-orange-500/30 p-3 md:p-4">
                    <h4 className="text-sm font-medium text-zinc-400 mb-2">Terms & Conditions</h4>
                    <p className="text-zinc-300 text-sm whitespace-pre-wrap">{selectedEstimate.terms}</p>
                  </div>
                )}

                {/* Actions */}
                <div className="space-y-3 pt-2">
                  {selectedEstimate.status === 'draft' && (
                    <button
                      onClick={async () => {
                        await updateEstimate(selectedEstimate.id, { status: 'sent' });
                        setSelectedEstimate({ ...selectedEstimate, status: 'sent' });
                        fetchEstimates();
                      }}
                      className="w-full flex items-center justify-center gap-2 p-4 bg-orange-500 text-white rounded-xl font-semibold"
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
                    className="w-full flex items-center justify-center gap-2 p-4 bg-[#2C2C2E] text-white rounded-xl font-semibold"
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
              <div className="bg-[#1C1C1E] rounded-xl p-6 mx-4 max-w-sm w-full">
                <h3 className="text-lg font-bold text-white mb-2">Delete Estimate?</h3>
                <p className="text-zinc-400 mb-6">This action cannot be undone.</p>
                <div className="flex gap-3">
                  <button
                    onClick={() => setShowDeleteConfirm(false)}
                    className="flex-1 p-3 bg-[#2C2C2E] text-white rounded-xl font-medium"
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
    </div>
  );
};

export default EstimatesHub;
