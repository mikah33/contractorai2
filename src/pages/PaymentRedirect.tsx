import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { Loader2, AlertCircle } from 'lucide-react';

const PaymentRedirect = () => {
  const { shortCode } = useParams<{ shortCode: string }>();
  const navigate = useNavigate();
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const lookupAndRedirect = async () => {
      if (!shortCode) {
        setError('Invalid payment link');
        setLoading(false);
        return;
      }

      try {
        // Look up the payment link by short code
        const { data, error: dbError } = await supabase
          .from('invoice_payment_links')
          .select('payment_url, status, expires_at')
          .eq('short_code', shortCode)
          .single();

        if (dbError || !data) {
          setError('Payment link not found');
          setLoading(false);
          return;
        }

        // Check if expired
        if (data.expires_at && new Date(data.expires_at) < new Date()) {
          setError('This payment link has expired');
          setLoading(false);
          return;
        }

        // Check if already paid
        if (data.status === 'paid') {
          setError('This invoice has already been paid');
          setLoading(false);
          return;
        }

        // Redirect to Stripe checkout
        window.location.href = data.payment_url;
      } catch (err) {
        console.error('Error looking up payment link:', err);
        setError('Failed to load payment link');
        setLoading(false);
      }
    };

    lookupAndRedirect();
  }, [shortCode]);

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-900 flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="w-12 h-12 text-blue-500 animate-spin mx-auto mb-4" />
          <p className="text-white text-lg">Redirecting to payment...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-900 flex items-center justify-center p-4">
        <div className="max-w-md w-full bg-gray-800 rounded-2xl p-8 text-center">
          <div className="w-16 h-16 bg-red-500/20 rounded-full flex items-center justify-center mx-auto mb-4">
            <AlertCircle className="w-8 h-8 text-red-500" />
          </div>
          <h1 className="text-2xl font-bold text-white mb-2">Payment Link Error</h1>
          <p className="text-gray-400 mb-6">{error}</p>
          <button
            onClick={() => navigate('/')}
            className="px-6 py-3 bg-blue-500 text-white rounded-lg font-medium hover:bg-blue-600 transition-colors"
          >
            Go to Homepage
          </button>
        </div>
      </div>
    );
  }

  return null;
};

export default PaymentRedirect;
