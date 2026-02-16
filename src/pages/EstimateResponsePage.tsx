import { useSearchParams } from 'react-router-dom';
import { CheckCircle2, XCircle, AlertCircle, CreditCard, Clock } from 'lucide-react';

const EstimateResponsePage = () => {
  const [searchParams] = useSearchParams();

  const status = searchParams.get('status');
  const error = searchParams.get('error');
  const message = searchParams.get('message');
  const name = searchParams.get('name');
  const title = searchParams.get('title');
  const amount = searchParams.get('amount');
  const previous = searchParams.get('previous');
  const action = searchParams.get('action');
  const id = searchParams.get('id');
  const paymentUrl = searchParams.get('paymentUrl');

  // Error state
  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-red-50 to-orange-50 p-4">
        <div className="bg-white rounded-2xl shadow-xl p-8 max-w-md w-full text-center">
          <div className="w-20 h-20 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-6">
            <AlertCircle className="w-10 h-10 text-red-600" />
          </div>
          <h1 className="text-2xl font-bold text-gray-900 mb-3">Oops!</h1>
          <p className="text-gray-600 mb-6">
            {message ? decodeURIComponent(message) : 'Something went wrong. Please try again.'}
          </p>
          <div className="p-4 bg-red-50 rounded-xl border border-red-200">
            <p className="text-sm text-red-700">
              If this problem persists, please contact your contractor directly.
            </p>
          </div>
        </div>
      </div>
    );
  }

  // Already responded
  if (status === 'already-responded') {
    const isApproved = previous === 'approved';
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-50 to-gray-100 p-4">
        <div className="bg-white rounded-2xl shadow-xl p-8 max-w-md w-full text-center">
          <div className={`w-20 h-20 rounded-full flex items-center justify-center mx-auto mb-6 ${isApproved ? 'bg-green-100' : 'bg-gray-100'}`}>
            {isApproved ? (
              <CheckCircle2 className="w-10 h-10 text-green-600" />
            ) : (
              <XCircle className="w-10 h-10 text-gray-500" />
            )}
          </div>
          <h1 className="text-2xl font-bold text-gray-900 mb-3">Already Responded</h1>
          <p className="text-gray-600 mb-6">
            This estimate has already been {previous}.
          </p>
          <div className="p-4 bg-gray-50 rounded-xl border border-gray-200">
            <p className="text-sm text-gray-500">
              If you need to change your response, please contact your contractor directly.
            </p>
          </div>
        </div>
      </div>
    );
  }

  // Approved state
  if (status === 'approved') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-green-50 to-emerald-50 p-4">
        <div className="bg-white rounded-2xl shadow-xl p-8 max-w-lg w-full text-center">
          <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-6">
            <CheckCircle2 className="w-10 h-10 text-green-600" />
          </div>
          <h1 className="text-3xl font-bold text-gray-900 mb-3">Estimate Approved!</h1>
          <p className="text-gray-600 mb-6">
            Thank you{name ? `, ${decodeURIComponent(name)}` : ''}! Your contractor has been notified.
          </p>

          {/* Estimate Summary */}
          {(title || amount) && (
            <div className="p-6 bg-green-50 rounded-xl border border-green-200 mb-6">
              {title && (
                <p className="text-gray-700 font-medium mb-2">{decodeURIComponent(title)}</p>
              )}
              {amount && (
                <p className="text-3xl font-bold text-green-600">
                  ${Number(amount).toLocaleString('en-US', { minimumFractionDigits: 2 })}
                </p>
              )}
            </div>
          )}

          {/* Payment Button or Message */}
          {paymentUrl ? (
            <div className="space-y-4">
              <a
                href={decodeURIComponent(paymentUrl)}
                className="flex items-center justify-center gap-3 w-full py-4 px-6 bg-green-600 text-white rounded-xl font-semibold text-lg hover:bg-green-700 transition-colors"
              >
                <CreditCard className="w-6 h-6" />
                Pay Now
              </a>
              <p className="text-sm text-gray-500 text-center">
                Complete your payment securely with Stripe
              </p>
            </div>
          ) : (
            <div className="p-4 bg-gray-50 rounded-xl border border-gray-200">
              <CreditCard className="w-8 h-8 text-gray-400 mx-auto mb-2" />
              <p className="text-sm text-gray-600">
                Your contractor will send you a payment link shortly.
              </p>
            </div>
          )}

          <p className="text-sm text-gray-400 mt-6">
            Powered by OnSite
          </p>
        </div>
      </div>
    );
  }

  // Declined state
  if (status === 'declined') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-50 to-gray-100 p-4">
        <div className="bg-white rounded-2xl shadow-xl p-8 max-w-md w-full text-center">
          <div className="w-20 h-20 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-6">
            <XCircle className="w-10 h-10 text-gray-500" />
          </div>
          <h1 className="text-2xl font-bold text-gray-900 mb-3">Estimate Declined</h1>
          <p className="text-gray-600 mb-6">
            Your response has been recorded{name ? `, ${decodeURIComponent(name)}` : ''}.
          </p>
          <div className="p-4 bg-gray-50 rounded-xl border border-gray-200">
            <p className="text-sm text-gray-500">
              Your contractor has been notified. If you change your mind or have questions, please contact them directly.
            </p>
          </div>
          <p className="text-sm text-gray-400 mt-6">
            Powered by OnSite
          </p>
        </div>
      </div>
    );
  }

  // Decline form
  if (action === 'decline-form' && id) {
    const supabaseUrl = 'https://ujhgwcurllkkeouzwvgk.supabase.co';

    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-50 to-gray-100 p-4">
        <div className="bg-white rounded-2xl shadow-xl p-8 max-w-md w-full">
          <h1 className="text-2xl font-bold text-gray-900 mb-2 text-center">Decline Estimate</h1>
          <p className="text-gray-600 text-center mb-6">
            {title ? decodeURIComponent(title) : 'Estimate'}{name ? ` for ${decodeURIComponent(name)}` : ''}
          </p>

          <form action={`${supabaseUrl}/functions/v1/handle-estimate-response`} method="GET">
            <input type="hidden" name="id" value={id} />
            <input type="hidden" name="action" value="decline" />

            <div className="mb-6">
              <label htmlFor="reason" className="block text-gray-700 font-medium mb-2">
                Would you like to share why? (Optional)
              </label>
              <textarea
                name="reason"
                id="reason"
                placeholder="Your feedback helps contractors improve their service..."
                className="w-full p-3 border border-gray-300 rounded-lg text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-red-300 resize-none"
                rows={4}
              />
            </div>

            <div className="flex gap-3">
              <button
                type="button"
                onClick={() => window.history.back()}
                className="flex-1 py-3 px-4 bg-gray-100 text-gray-700 rounded-lg font-medium hover:bg-gray-200 transition-colors"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="flex-1 py-3 px-4 bg-red-600 text-white rounded-lg font-medium hover:bg-red-700 transition-colors"
              >
                Confirm Decline
              </button>
            </div>
          </form>

          <p className="text-sm text-gray-400 text-center mt-6">
            Your contractor will be notified of your decision.
          </p>
        </div>
      </div>
    );
  }

  // Default/unknown state
  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-50 to-blue-50 p-4">
      <div className="bg-white rounded-2xl shadow-xl p-8 max-w-md w-full text-center">
        <div className="w-20 h-20 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-6">
          <Clock className="w-10 h-10 text-blue-600" />
        </div>
        <h1 className="text-2xl font-bold text-gray-900 mb-3">Estimate Response</h1>
        <p className="text-gray-600 mb-6">
          Processing your response...
        </p>
        <div className="p-4 bg-gray-50 rounded-xl border border-gray-200">
          <p className="text-sm text-gray-500">
            If you're seeing this page unexpectedly, please contact your contractor for assistance.
          </p>
        </div>
        <p className="text-sm text-gray-400 mt-6">
          Powered by OnSite
        </p>
      </div>
    </div>
  );
};

export default EstimateResponsePage;
