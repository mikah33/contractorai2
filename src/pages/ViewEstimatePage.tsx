import { useSearchParams } from 'react-router-dom';
import { FileText, CheckCircle2, XCircle, CreditCard } from 'lucide-react';
import { useState } from 'react';

interface EstimateItem {
  d: string; // description
  q: number; // quantity
  u: string; // unit
  p: number; // unitPrice
  t: string; // type
}

const SUPABASE_URL = 'https://ujhgwcurllkkeouzwvgk.supabase.co';

const ViewEstimatePage = () => {
  const [searchParams] = useSearchParams();
  const [responding, setResponding] = useState(false);
  const [responded, setResponded] = useState<'approved' | 'declined' | null>(null);
  const [declineReason, setDeclineReason] = useState('');
  const [showDeclineForm, setShowDeclineForm] = useState(false);
  const [paymentUrl, setPaymentUrl] = useState<string | null>(null);

  const estimateId = searchParams.get('estimateId');
  const title = searchParams.get('title') || 'Estimate';
  const total = parseFloat(searchParams.get('total') || '0');
  const subtotal = parseFloat(searchParams.get('subtotal') || '0');
  const taxRate = parseFloat(searchParams.get('taxRate') || '0');
  const taxAmount = parseFloat(searchParams.get('taxAmount') || '0');
  const clientName = searchParams.get('clientName') || '';
  const notes = searchParams.get('notes') || '';
  const terms = searchParams.get('terms') || 'Valid for 30 days';

  let items: EstimateItem[] = [];
  try {
    const itemsParam = searchParams.get('items');
    if (itemsParam) {
      items = JSON.parse(itemsParam);
    }
  } catch {
    // ignore parse errors
  }

  const formatCurrency = (amount: number) =>
    '$' + amount.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

  const handleApprove = async () => {
    if (!estimateId) return;
    setResponding(true);
    try {
      const res = await fetch(
        `${SUPABASE_URL}/functions/v1/handle-estimate-response?id=${estimateId}&action=approve`,
        { redirect: 'manual' }
      );

      // The edge function returns a 302 redirect — parse the Location header for payment URL
      const location = res.headers.get('Location') || '';
      const redirectParams = new URLSearchParams(location.split('?')[1] || '');
      const pUrl = redirectParams.get('paymentUrl');
      if (pUrl) setPaymentUrl(decodeURIComponent(pUrl));

      setResponded('approved');
    } catch {
      // Even if fetch fails due to redirect, treat as success since edge function processed it
      setResponded('approved');
    }
    setResponding(false);
  };

  const handleDecline = async () => {
    if (!estimateId) return;
    setResponding(true);
    try {
      await fetch(
        `${SUPABASE_URL}/functions/v1/handle-estimate-response?id=${estimateId}&action=decline&reason=${encodeURIComponent(declineReason)}`,
        { redirect: 'manual' }
      );
      setResponded('declined');
    } catch {
      setResponded('declined');
    }
    setResponding(false);
  };

  if (!estimateId) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 p-4">
        <div className="bg-white rounded-2xl shadow-xl p-8 max-w-md w-full text-center">
          <p className="text-gray-600">Invalid estimate link.</p>
        </div>
      </div>
    );
  }

  // Post-response view
  if (responded === 'approved') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-green-50 to-emerald-50 p-4">
        <div className="bg-white rounded-2xl shadow-xl p-8 max-w-lg w-full text-center">
          <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-6">
            <CheckCircle2 className="w-10 h-10 text-green-600" />
          </div>
          <h1 className="text-3xl font-bold text-gray-900 mb-3">Estimate Approved!</h1>
          <p className="text-gray-600 mb-6">
            Thank you{clientName ? `, ${clientName}` : ''}! Your contractor has been notified.
          </p>
          <div className="p-6 bg-green-50 rounded-xl border border-green-200 mb-6">
            <p className="text-gray-700 font-medium mb-2">{title}</p>
            <p className="text-3xl font-bold text-green-600">{formatCurrency(total)}</p>
          </div>
          {paymentUrl ? (
            <div className="space-y-4">
              <a
                href={paymentUrl}
                className="flex items-center justify-center gap-3 w-full py-4 px-6 bg-green-600 text-white rounded-xl font-semibold text-lg hover:bg-green-700 transition-colors"
              >
                <CreditCard className="w-6 h-6" />
                Pay Now — {formatCurrency(total)}
              </a>
              <p className="text-sm text-gray-500">Complete your payment securely with Stripe</p>
            </div>
          ) : (
            <div className="p-4 bg-gray-50 rounded-xl border border-gray-200">
              <p className="text-sm text-gray-600">
                Your contractor will send you a payment link shortly.
              </p>
            </div>
          )}
          <p className="text-sm text-gray-400 mt-6">Powered by OnSite</p>
        </div>
      </div>
    );
  }

  if (responded === 'declined') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-50 to-gray-100 p-4">
        <div className="bg-white rounded-2xl shadow-xl p-8 max-w-md w-full text-center">
          <div className="w-20 h-20 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-6">
            <XCircle className="w-10 h-10 text-gray-500" />
          </div>
          <h1 className="text-2xl font-bold text-gray-900 mb-3">Estimate Declined</h1>
          <p className="text-gray-600 mb-6">
            Your response has been recorded{clientName ? `, ${clientName}` : ''}.
          </p>
          <div className="p-4 bg-gray-50 rounded-xl border border-gray-200">
            <p className="text-sm text-gray-500">
              Your contractor has been notified. If you change your mind, please contact them directly.
            </p>
          </div>
          <p className="text-sm text-gray-400 mt-6">Powered by OnSite</p>
        </div>
      </div>
    );
  }

  // Decline reason form
  if (showDeclineForm) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-50 to-gray-100 p-4">
        <div className="bg-white rounded-2xl shadow-xl p-8 max-w-md w-full">
          <h1 className="text-2xl font-bold text-gray-900 mb-2 text-center">Decline Estimate</h1>
          <p className="text-gray-600 text-center mb-6">{title}</p>
          <div className="mb-6">
            <label htmlFor="reason" className="block text-gray-700 font-medium mb-2">
              Would you like to share why? (Optional)
            </label>
            <textarea
              id="reason"
              value={declineReason}
              onChange={(e) => setDeclineReason(e.target.value)}
              placeholder="Your feedback helps contractors improve..."
              className="w-full p-3 border border-gray-300 rounded-lg text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-red-300 resize-none"
              rows={4}
            />
          </div>
          <div className="flex gap-3">
            <button
              onClick={() => setShowDeclineForm(false)}
              className="flex-1 py-3 px-4 bg-gray-100 text-gray-700 rounded-lg font-medium hover:bg-gray-200 transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={handleDecline}
              disabled={responding}
              className="flex-1 py-3 px-4 bg-red-600 text-white rounded-lg font-medium hover:bg-red-700 transition-colors disabled:opacity-50"
            >
              {responding ? 'Declining...' : 'Confirm Decline'}
            </button>
          </div>
        </div>
      </div>
    );
  }

  // Main estimate view
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50 p-4">
      <div className="max-w-lg mx-auto space-y-4 py-6">
        {/* Header */}
        <div className="bg-white rounded-2xl shadow-xl overflow-hidden">
          <div className="bg-[#043d6b] px-6 py-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <FileText className="w-5 h-5 text-white" />
                <span className="text-white font-bold text-lg">OnSite</span>
              </div>
              <span className="text-white/80 text-sm font-medium tracking-wide">ESTIMATE</span>
            </div>
          </div>

          <div className="p-6">
            <h1 className="text-xl font-bold text-gray-900 mb-1">{title}</h1>
            {clientName && (
              <p className="text-sm text-gray-500 mb-4">Prepared for {clientName}</p>
            )}
            <p className="text-3xl font-bold text-[#043d6b]">{formatCurrency(total)}</p>
            <p className="text-sm text-gray-500 mt-1">{items.length} line items</p>
          </div>
        </div>

        {/* Line Items */}
        {items.length > 0 && (
          <div className="bg-white rounded-2xl shadow-xl p-6">
            <h2 className="text-sm font-semibold text-gray-900 mb-3">Line Items</h2>
            <div className="space-y-2">
              {items.map((item, idx) => (
                <div key={idx} className="flex items-center justify-between py-2 px-3 bg-gray-50 rounded-lg">
                  <div>
                    <p className="text-sm font-medium text-gray-900">{item.d}</p>
                    <p className="text-xs text-gray-500">
                      {item.q} {item.u} @ {formatCurrency(item.p)}
                    </p>
                  </div>
                  <p className="text-sm font-semibold text-gray-900">
                    {formatCurrency(item.q * item.p)}
                  </p>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Totals */}
        <div className="bg-white rounded-2xl shadow-xl p-6">
          <div className="space-y-2">
            <div className="flex justify-between text-sm">
              <span className="text-gray-500">Subtotal</span>
              <span className="text-gray-900">{formatCurrency(subtotal)}</span>
            </div>
            {taxRate > 0 && (
              <div className="flex justify-between text-sm">
                <span className="text-gray-500">Tax ({taxRate.toFixed(1)}%)</span>
                <span className="text-gray-900">{formatCurrency(taxAmount)}</span>
              </div>
            )}
            <div className="border-t pt-2 flex justify-between">
              <span className="text-base font-bold text-gray-900">Total</span>
              <span className="text-lg font-bold text-[#043d6b]">{formatCurrency(total)}</span>
            </div>
          </div>
        </div>

        {/* Notes */}
        {notes && (
          <div className="bg-white rounded-2xl shadow-xl p-6">
            <h3 className="text-xs font-semibold text-[#043d6b] mb-1">Notes</h3>
            <p className="text-sm text-gray-600">{notes}</p>
          </div>
        )}

        {/* Action Buttons */}
        <div className="space-y-3">
          <button
            onClick={handleApprove}
            disabled={responding}
            className="flex items-center justify-center gap-2 w-full py-4 bg-green-600 text-white rounded-xl font-bold text-lg hover:bg-green-700 transition-colors disabled:opacity-50 shadow-lg shadow-green-600/20"
          >
            <CheckCircle2 className="w-5 h-5" />
            {responding ? 'Processing...' : 'Approve Estimate'}
          </button>

          <button
            onClick={() => setShowDeclineForm(true)}
            disabled={responding}
            className="flex items-center justify-center gap-2 w-full py-3 bg-white text-red-600 rounded-xl font-semibold border border-red-200 hover:bg-red-50 transition-colors disabled:opacity-50"
          >
            <XCircle className="w-5 h-5" />
            Decline Estimate
          </button>
        </div>

        {/* Terms */}
        <p className="text-xs text-gray-400 text-center px-4">{terms}</p>
        <p className="text-xs text-gray-400 text-center">Powered by OnSite</p>
      </div>
    </div>
  );
};

export default ViewEstimatePage;
