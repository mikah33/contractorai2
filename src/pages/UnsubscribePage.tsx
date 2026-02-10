import { useState, useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabase';

interface UnsubscribeResult {
  success: boolean;
  message: string;
  email?: string;
  unsubscribe_type?: string;
  code?: string;
}

const UnsubscribePage = () => {
  const location = useLocation();
  const navigate = useNavigate();

  const [loading, setLoading] = useState(true);
  const [result, setResult] = useState<UnsubscribeResult | null>(null);
  const [selectedType, setSelectedType] = useState<string>('all');
  const [processing, setProcessing] = useState(false);

  // Get token from URL parameters
  const searchParams = new URLSearchParams(location.search);
  const token = searchParams.get('token');
  const initialType = searchParams.get('type') || 'all';

  useEffect(() => {
    if (!token) {
      setResult({
        success: false,
        message: 'Invalid unsubscribe link - missing token',
        code: 'MISSING_TOKEN'
      });
      setLoading(false);
      return;
    }

    // Auto-process unsubscribe if type is specified in URL
    if (initialType !== 'all' || !location.search.includes('interactive=true')) {
      processUnsubscribe(initialType);
    } else {
      setLoading(false);
      setSelectedType(initialType);
    }
  }, [token, initialType]);

  const processUnsubscribe = async (unsubscribeType: string) => {
    if (!token) return;

    setProcessing(true);

    try {
      console.log('📤 Processing unsubscribe request:', {
        token: token.substring(0, 8) + '...',
        type: unsubscribeType
      });

      const { data, error } = await supabase.functions.invoke('unsubscribe-email', {
        body: {
          token,
          unsubscribe_type: unsubscribeType,
          source: 'web_page'
        }
      });

      if (error) {
        console.error('❌ Unsubscribe error:', error);
        setResult({
          success: false,
          message: error.message || 'Failed to process unsubscribe request',
          code: 'API_ERROR'
        });
      } else {
        console.log('✅ Unsubscribe successful:', data);
        setResult(data);
      }
    } catch (err) {
      console.error('❌ Unsubscribe exception:', err);
      setResult({
        success: false,
        message: 'An unexpected error occurred. Please try again.',
        code: 'NETWORK_ERROR'
      });
    } finally {
      setLoading(false);
      setProcessing(false);
    }
  };

  const handleUnsubscribe = () => {
    processUnsubscribe(selectedType);
  };

  const getTypeDisplayName = (type: string) => {
    switch (type) {
      case 'all': return 'All Emails';
      case 'marketing': return 'Marketing Emails';
      case 'estimates': return 'Estimate Notifications';
      case 'notifications': return 'System Notifications';
      default: return type;
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-indigo-50 to-blue-100">
        <div className="bg-white rounded-2xl shadow-xl p-8 max-w-md w-full mx-4">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-4 border-indigo-600 border-t-transparent mx-auto mb-4"></div>
            <h2 className="text-xl font-semibold text-gray-900 mb-2">
              Processing Request...
            </h2>
            <p className="text-gray-600">
              Please wait while we process your unsubscribe request.
            </p>
          </div>
        </div>
      </div>
    );
  }

  if (result) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-indigo-50 to-blue-100">
        <div className="bg-white rounded-2xl shadow-xl p-8 max-w-md w-full mx-4">
          <div className="text-center">
            {result.success ? (
              <>
                <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
                  <svg className="w-8 h-8 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                </div>
                <h2 className="text-2xl font-bold text-gray-900 mb-2">
                  You're Unsubscribed!
                </h2>
                <p className="text-gray-600 mb-4">
                  {result.message}
                </p>
                {result.email && (
                  <div className="bg-gray-50 rounded-lg p-4 mb-6">
                    <p className="text-sm text-gray-600 mb-1">Email Address:</p>
                    <p className="font-medium text-gray-900 break-all">{result.email}</p>
                    {result.unsubscribe_type && (
                      <p className="text-sm text-indigo-600 font-medium mt-2">
                        Unsubscribed from: {getTypeDisplayName(result.unsubscribe_type)}
                      </p>
                    )}
                  </div>
                )}
              </>
            ) : (
              <>
                <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
                  <svg className="w-8 h-8 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </div>
                <h2 className="text-2xl font-bold text-gray-900 mb-2">
                  Something Went Wrong
                </h2>
                <p className="text-gray-600 mb-4">
                  {result.message}
                </p>
              </>
            )}

            <div className="space-y-3">
              <button
                onClick={() => navigate('/')}
                className="w-full bg-indigo-600 text-white py-3 px-4 rounded-lg font-medium hover:bg-indigo-700 transition-colors"
              >
                Return to ContractorAI
              </button>

              <button
                onClick={() => navigate('/settings')}
                className="w-full bg-gray-100 text-gray-700 py-3 px-4 rounded-lg font-medium hover:bg-gray-200 transition-colors"
              >
                Email Preferences
              </button>
            </div>

            <div className="mt-6 pt-6 border-t border-gray-200">
              <p className="text-xs text-gray-500">
                If you unsubscribed by mistake, you can update your email preferences in your account settings.
              </p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Interactive unsubscribe selection (when interactive=true is in URL)
  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-indigo-50 to-blue-100">
      <div className="bg-white rounded-2xl shadow-xl p-8 max-w-md w-full mx-4">
        <div className="text-center mb-6">
          <div className="w-16 h-16 bg-orange-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <svg className="w-8 h-8 text-orange-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 4.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
            </svg>
          </div>
          <h2 className="text-2xl font-bold text-gray-900 mb-2">
            Unsubscribe Options
          </h2>
          <p className="text-gray-600">
            Choose what types of emails you'd like to stop receiving from ContractorAI.
          </p>
        </div>

        <div className="space-y-3 mb-6">
          {[
            { value: 'all', label: 'All Emails', description: 'Stop all email communications' },
            { value: 'marketing', label: 'Marketing Emails', description: 'Promotional content and updates' },
            { value: 'estimates', label: 'Estimate Notifications', description: 'Estimate-related communications' },
            { value: 'notifications', label: 'System Notifications', description: 'Account and system updates' }
          ].map((option) => (
            <label
              key={option.value}
              className={`block p-4 border rounded-lg cursor-pointer transition-colors ${
                selectedType === option.value
                  ? 'border-indigo-600 bg-indigo-50'
                  : 'border-gray-200 hover:border-gray-300'
              }`}
            >
              <div className="flex items-start">
                <input
                  type="radio"
                  name="unsubscribe_type"
                  value={option.value}
                  checked={selectedType === option.value}
                  onChange={(e) => setSelectedType(e.target.value)}
                  className="mt-1 mr-3 text-indigo-600 focus:ring-indigo-500"
                />
                <div>
                  <div className="font-medium text-gray-900">{option.label}</div>
                  <div className="text-sm text-gray-600">{option.description}</div>
                </div>
              </div>
            </label>
          ))}
        </div>

        <button
          onClick={handleUnsubscribe}
          disabled={processing}
          className={`w-full py-3 px-4 rounded-lg font-medium transition-colors ${
            processing
              ? 'bg-gray-400 cursor-not-allowed'
              : 'bg-red-600 hover:bg-red-700'
          } text-white`}
        >
          {processing ? (
            <div className="flex items-center justify-center">
              <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent mr-2"></div>
              Processing...
            </div>
          ) : (
            `Unsubscribe from ${getTypeDisplayName(selectedType)}`
          )}
        </button>

        <div className="mt-4 text-center">
          <button
            onClick={() => navigate('/')}
            className="text-sm text-indigo-600 hover:text-indigo-700"
          >
            Never mind, take me back
          </button>
        </div>
      </div>
    </div>
  );
};

export default UnsubscribePage;