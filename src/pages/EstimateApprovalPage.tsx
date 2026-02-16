import { useState, useEffect } from 'react';
import { useParams, useSearchParams } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import {
  CheckCircle2,
  XCircle,
  FileText,
  Loader2,
  CreditCard,
  ExternalLink,
  AlertCircle,
  MessageSquare
} from 'lucide-react';

interface EstimateData {
  id: string;
  estimate_id: string;
  customer_name: string;
  customer_email: string;
  pdf_url: string;
  user_id: string;
  client_id: string | null;
  contractor_email: string | null;
  email_subject: string;
  email_body: string;
  accepted: boolean | null;
  declined: boolean | null;
  declined_reason: string | null;
  created_at: string;
  // Joined estimate data
  estimate?: {
    title: string;
    total: number;
    items: any[];
  };
}

const EstimateApprovalPage = () => {
  const { id } = useParams<{ id: string }>();
  const [searchParams] = useSearchParams();
  const token = searchParams.get('token');

  const [loading, setLoading] = useState(true);
  const [estimateData, setEstimateData] = useState<EstimateData | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [showDeclineForm, setShowDeclineForm] = useState(false);
  const [declineReason, setDeclineReason] = useState('');
  const [responseSubmitted, setResponseSubmitted] = useState<'approved' | 'declined' | null>(null);
  const [paymentUrl, setPaymentUrl] = useState<string | null>(null);
  const [generatingPayment, setGeneratingPayment] = useState(false);

  useEffect(() => {
    fetchEstimateData();
  }, [id, token]);

  const fetchEstimateData = async () => {
    try {
      setLoading(true);
      setError(null);

      if (!id) {
        setError('Invalid estimate link');
        return;
      }

      // Fetch from estimate_email_responses table using estimate_id
      const { data, error: fetchError } = await supabase
        .from('estimate_email_responses')
        .select(`
          *,
          estimate:estimates(title, total, items)
        `)
        .eq('estimate_id', id)
        .single();

      if (fetchError || !data) {
        console.error('Fetch error:', fetchError);
        setError('Estimate not found or link has expired');
        return;
      }

      // Check if already responded
      if (data.accepted || data.declined) {
        setResponseSubmitted(data.accepted ? 'approved' : 'declined');
      }

      setEstimateData(data);
    } catch (err) {
      console.error('Error fetching estimate:', err);
      setError('Failed to load estimate');
    } finally {
      setLoading(false);
    }
  };

  const handleApprove = async () => {
    if (!estimateData) return;

    setSubmitting(true);
    setGeneratingPayment(true);

    try {
      // Update estimate_email_responses to mark as accepted
      const { error: updateError } = await supabase
        .from('estimate_email_responses')
        .update({
          accepted: true,
          declined: false,
          responded_at: new Date().toISOString()
        })
        .eq('id', estimateData.id);

      if (updateError) throw updateError;

      // Generate Stripe payment link using edge function
      const { data: paymentData, error: paymentError } = await supabase.functions.invoke('create-estimate-payment', {
        body: {
          estimateId: estimateData.estimate_id,
          estimateResponseId: estimateData.id,
          customerEmail: estimateData.customer_email,
          customerName: estimateData.customer_name,
          amount: estimateData.estimate?.total || 0
        }
      });

      if (paymentError) {
        console.error('Payment link error:', paymentError);
        // Still mark as approved even if payment link fails
      } else if (paymentData?.paymentUrl) {
        setPaymentUrl(paymentData.paymentUrl);
      }

      setResponseSubmitted('approved');
    } catch (err: any) {
      console.error('Approval error:', err);
      setError('Failed to submit approval. Please try again.');
    } finally {
      setSubmitting(false);
      setGeneratingPayment(false);
    }
  };

  const handleDecline = async () => {
    if (!estimateData) return;

    setSubmitting(true);

    try {
      // Update estimate_email_responses to mark as declined
      const { error: updateError } = await supabase
        .from('estimate_email_responses')
        .update({
          accepted: false,
          declined: true,
          declined_reason: declineReason.trim() || null,
          responded_at: new Date().toISOString()
        })
        .eq('id', estimateData.id);

      if (updateError) throw updateError;

      setResponseSubmitted('declined');
    } catch (err: any) {
      console.error('Decline error:', err);
      setError('Failed to submit response. Please try again.');
    } finally {
      setSubmitting(false);
      setShowDeclineForm(false);
    }
  };

  // Loading state
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-50 to-blue-50">
        <div className="bg-white rounded-2xl shadow-xl p-8 max-w-md w-full mx-4">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-4 border-blue-600 border-t-transparent mx-auto mb-4"></div>
            <h2 className="text-xl font-semibold text-gray-900 mb-2">
              Loading Estimate...
            </h2>
            <p className="text-gray-600">
              Please wait while we retrieve your estimate details.
            </p>
          </div>
        </div>
      </div>
    );
  }

  // Error state
  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-50 to-blue-50">
        <div className="bg-white rounded-2xl shadow-xl p-8 max-w-md w-full mx-4">
          <div className="text-center">
            <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <AlertCircle className="w-8 h-8 text-red-600" />
            </div>
            <h2 className="text-2xl font-bold text-gray-900 mb-2">
              Oops!
            </h2>
            <p className="text-gray-600 mb-6">{error}</p>
            <button
              onClick={() => window.location.reload()}
              className="bg-blue-600 text-white py-3 px-6 rounded-lg font-medium hover:bg-blue-700 transition-colors"
            >
              Try Again
            </button>
          </div>
        </div>
      </div>
    );
  }

  // Already responded - Approved
  if (responseSubmitted === 'approved') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-green-50 to-emerald-50 p-4">
        <div className="bg-white rounded-2xl shadow-xl p-8 max-w-lg w-full">
          <div className="text-center">
            <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-6">
              <CheckCircle2 className="w-10 h-10 text-green-600" />
            </div>
            <h2 className="text-3xl font-bold text-gray-900 mb-3">
              Estimate Approved!
            </h2>
            <p className="text-gray-600 mb-6">
              Thank you for approving the estimate. Your contractor has been notified.
            </p>

            {/* Payment Link Section */}
            {generatingPayment ? (
              <div className="p-6 bg-blue-50 rounded-xl border border-blue-200 mb-6">
                <Loader2 className="w-8 h-8 text-blue-600 animate-spin mx-auto mb-3" />
                <p className="text-blue-800 font-medium">Generating payment link...</p>
              </div>
            ) : paymentUrl ? (
              <div className="p-6 bg-gradient-to-r from-green-50 to-emerald-50 rounded-xl border border-green-200 mb-6">
                <CreditCard className="w-10 h-10 text-green-600 mx-auto mb-3" />
                <h3 className="font-semibold text-gray-900 mb-2">Ready to Pay?</h3>
                <p className="text-sm text-gray-600 mb-4">
                  Complete your payment securely with Stripe
                </p>
                <a
                  href={paymentUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-2 bg-green-600 text-white py-3 px-6 rounded-lg font-medium hover:bg-green-700 transition-colors"
                >
                  <CreditCard className="w-5 h-5" />
                  Pay Now
                  <ExternalLink className="w-4 h-4" />
                </a>
              </div>
            ) : (
              <div className="p-6 bg-gray-50 rounded-xl border border-gray-200 mb-6">
                <p className="text-gray-600">
                  Your contractor will send you a payment link shortly.
                </p>
              </div>
            )}

            {/* Estimate Summary */}
            {estimateData?.estimate && (
              <div className="p-4 bg-gray-50 rounded-xl border border-gray-200 text-left">
                <h4 className="font-medium text-gray-900 mb-2">Estimate Summary</h4>
                <p className="text-sm text-gray-600 mb-1">{estimateData.estimate.title}</p>
                <p className="text-xl font-bold text-green-600">
                  ${Number(estimateData.estimate.total).toLocaleString('en-US', { minimumFractionDigits: 2 })}
                </p>
              </div>
            )}
          </div>
        </div>
      </div>
    );
  }

  // Already responded - Declined
  if (responseSubmitted === 'declined') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-50 to-gray-100 p-4">
        <div className="bg-white rounded-2xl shadow-xl p-8 max-w-lg w-full">
          <div className="text-center">
            <div className="w-20 h-20 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-6">
              <XCircle className="w-10 h-10 text-gray-500" />
            </div>
            <h2 className="text-3xl font-bold text-gray-900 mb-3">
              Estimate Declined
            </h2>
            <p className="text-gray-600 mb-6">
              Your response has been recorded. Your contractor has been notified.
            </p>
            <div className="p-4 bg-gray-50 rounded-xl border border-gray-200">
              <p className="text-sm text-gray-500">
                If you change your mind or have questions, please contact your contractor directly.
              </p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Main approval form
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50 p-4 py-8">
      <div className="max-w-2xl mx-auto">
        {/* Header */}
        <div className="bg-[#043d6b] rounded-t-2xl p-6 text-center">
          <h1 className="text-2xl font-bold text-white mb-1">OnSite</h1>
          <p className="text-blue-200 text-sm">Estimate Review</p>
        </div>

        {/* Main Content */}
        <div className="bg-white rounded-b-2xl shadow-xl p-6 md:p-8">
          {/* Greeting */}
          <div className="text-center mb-8">
            <h2 className="text-2xl font-bold text-gray-900 mb-2">
              Hi {estimateData?.customer_name || 'there'}!
            </h2>
            <p className="text-gray-600">
              Please review your estimate and let us know if you'd like to proceed.
            </p>
          </div>

          {/* Estimate Card */}
          <div className="bg-gray-50 rounded-xl p-6 mb-6 border border-gray-200">
            <div className="flex items-start gap-4 mb-4">
              <div className="w-12 h-12 bg-blue-100 rounded-xl flex items-center justify-center flex-shrink-0">
                <FileText className="w-6 h-6 text-blue-600" />
              </div>
              <div className="flex-1">
                <h3 className="font-semibold text-gray-900 text-lg">
                  {estimateData?.estimate?.title || 'Your Estimate'}
                </h3>
                <p className="text-sm text-gray-500">
                  Sent on {estimateData?.created_at ? new Date(estimateData.created_at).toLocaleDateString() : 'N/A'}
                </p>
              </div>
            </div>

            {/* Total Amount */}
            <div className="p-4 bg-white rounded-lg border border-gray-200 mb-4">
              <p className="text-sm text-gray-500 mb-1">Estimated Total</p>
              <p className="text-3xl font-bold text-gray-900">
                ${estimateData?.estimate?.total ? Number(estimateData.estimate.total).toLocaleString('en-US', { minimumFractionDigits: 2 }) : '0.00'}
              </p>
            </div>

            {/* View PDF Button */}
            {estimateData?.pdf_url && (
              <a
                href={estimateData.pdf_url}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center justify-center gap-2 w-full py-3 px-4 bg-blue-50 text-blue-600 rounded-lg font-medium hover:bg-blue-100 transition-colors"
              >
                <FileText className="w-5 h-5" />
                View Full Estimate PDF
                <ExternalLink className="w-4 h-4" />
              </a>
            )}
          </div>

          {/* Action Buttons */}
          {!showDeclineForm ? (
            <div className="space-y-3">
              <button
                onClick={handleApprove}
                disabled={submitting}
                className="w-full py-4 px-6 bg-green-600 text-white rounded-xl font-semibold text-lg hover:bg-green-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-3"
              >
                {submitting ? (
                  <>
                    <Loader2 className="w-5 h-5 animate-spin" />
                    Processing...
                  </>
                ) : (
                  <>
                    <CheckCircle2 className="w-6 h-6" />
                    Approve Estimate
                  </>
                )}
              </button>

              <button
                onClick={() => setShowDeclineForm(true)}
                disabled={submitting}
                className="w-full py-4 px-6 bg-gray-100 text-gray-700 rounded-xl font-semibold text-lg hover:bg-gray-200 transition-colors disabled:opacity-50 flex items-center justify-center gap-3"
              >
                <XCircle className="w-6 h-6" />
                Decline Estimate
              </button>

              <p className="text-center text-sm text-gray-500 mt-4">
                <CreditCard className="w-4 h-4 inline mr-1" />
                If approved, you'll be able to pay securely via Stripe
              </p>
            </div>
          ) : (
            // Decline Form
            <div className="space-y-4">
              <div className="p-4 bg-red-50 rounded-xl border border-red-200">
                <h4 className="font-medium text-red-800 mb-2 flex items-center gap-2">
                  <MessageSquare className="w-5 h-5" />
                  Would you like to provide feedback? (Optional)
                </h4>
                <textarea
                  value={declineReason}
                  onChange={(e) => setDeclineReason(e.target.value)}
                  placeholder="Let us know why you're declining... (optional)"
                  className="w-full p-3 border border-red-200 rounded-lg text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-red-300 resize-none"
                  rows={3}
                />
              </div>

              <div className="flex gap-3">
                <button
                  onClick={() => {
                    setShowDeclineForm(false);
                    setDeclineReason('');
                  }}
                  disabled={submitting}
                  className="flex-1 py-3 px-4 bg-gray-100 text-gray-700 rounded-lg font-medium hover:bg-gray-200 transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={handleDecline}
                  disabled={submitting}
                  className="flex-1 py-3 px-4 bg-red-600 text-white rounded-lg font-medium hover:bg-red-700 transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
                >
                  {submitting ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      Submitting...
                    </>
                  ) : (
                    'Confirm Decline'
                  )}
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="text-center mt-6 text-sm text-gray-500">
          <p>Powered by OnSite</p>
        </div>
      </div>
    </div>
  );
};

export default EstimateApprovalPage;
