import { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Mail, CheckCircle, Loader2, RefreshCw } from 'lucide-react';
import { supabase } from '../../lib/supabase';

const EmailConfirmation = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const email = searchParams.get('email') || '';
  const [resending, setResending] = useState(false);
  const [resendSuccess, setResendSuccess] = useState(false);
  const [error, setError] = useState('');
  const [checking, setChecking] = useState(false);

  // Poll for confirmation every 3 seconds
  useEffect(() => {
    if (!email) return;

    const checkConfirmation = async () => {
      try {
        console.log('[EmailConfirmation] Checking confirmation status...');

        // First, try to refresh the session from the server
        const { data: { session }, error: refreshError } = await supabase.auth.refreshSession();

        console.log('[EmailConfirmation] Refresh session result:', {
          hasSession: !!session,
          emailConfirmed: session?.user?.email_confirmed_at,
          error: refreshError
        });

        if (session?.user) {
          console.log('[EmailConfirmation] User found! Redirecting to app...');
          // Session exists, user is confirmed! Redirect to app
          navigate('/');
        }
      } catch (error) {
        console.error('[EmailConfirmation] Error checking confirmation:', error);
      }
    };

    // Check immediately
    checkConfirmation();

    // Then check every 3 seconds
    const interval = setInterval(checkConfirmation, 3000);

    return () => clearInterval(interval);
  }, [email, navigate]);

  const handleResendConfirmation = async () => {
    if (!email) {
      setError('Email address not found');
      return;
    }

    setResending(true);
    setError('');
    setResendSuccess(false);

    try {
      console.log('[EmailConfirmation] Resending confirmation to:', email);

      const { data, error } = await supabase.auth.resend({
        type: 'signup',
        email: email,
      });

      console.log('[EmailConfirmation] Resend response:', { data, error });

      if (error) {
        console.error('[EmailConfirmation] Resend error:', error);

        // Check for rate limiting
        if (error.code === 'over_email_send_rate_limit') {
          setError('Too many resend attempts. Please wait a moment and check your email inbox.');
        }
        // Check if email confirmation is disabled
        else if (error.message.includes('Email confirmations are turned off') ||
            error.message.includes('not enabled')) {
          setError('Email confirmation is not enabled for this project. Your account is already active.');
        } else {
          setError(error.message || 'Failed to resend email');
        }
      } else {
        console.log('[EmailConfirmation] Email resent successfully');
        setResendSuccess(true);
        // Hide success message after 5 seconds
        setTimeout(() => setResendSuccess(false), 5000);
      }
    } catch (err: any) {
      console.error('[EmailConfirmation] Resend exception:', err);
      setError(err.message || 'Failed to resend confirmation email');
    } finally {
      setResending(false);
    }
  };

  const handleSkipConfirmation = () => {
    // Redirect to login page
    navigate('/auth/login');
  };

  const handleCheckNow = async () => {
    setChecking(true);
    setError('');

    try {
      console.log('[EmailConfirmation] Manual check - refreshing session...');

      // First try to refresh session
      const { data: { session }, error: refreshError } = await supabase.auth.refreshSession();

      console.log('[EmailConfirmation] Manual check result:', {
        hasSession: !!session,
        emailConfirmed: session?.user?.email_confirmed_at,
        user: session?.user,
        error: refreshError
      });

      if (session?.user) {
        console.log('[EmailConfirmation] Email confirmed! Redirecting...');
        navigate('/');
        return;
      }

      // If no session, the email was confirmed in external browser
      // User needs to sign in manually with their password
      console.log('[EmailConfirmation] No session - redirecting to login');
      setError('Email confirmed! Please sign in with your password.');
      setTimeout(() => {
        navigate('/auth/login?email=' + encodeURIComponent(email) + '&confirmed=true');
      }, 2000);

    } catch (err: any) {
      console.error('[EmailConfirmation] Manual check error:', err);
      setError('Email confirmed! Please sign in with your password.');
      setTimeout(() => {
        navigate('/auth/login?email=' + encodeURIComponent(email));
      }, 2000);
    } finally {
      setChecking(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-blue-900 to-slate-800 flex flex-col justify-center px-4 sm:px-6 lg:px-8 relative overflow-hidden">
      {/* Background Pattern */}
      <div className="absolute inset-0 opacity-10">
        <div className="absolute top-20 left-10 w-64 h-64 bg-blue-400 rounded-full blur-3xl"></div>
        <div className="absolute bottom-20 right-10 w-96 h-96 bg-cyan-400 rounded-full blur-3xl"></div>
      </div>

      <div className="sm:mx-auto w-full sm:max-w-md relative z-10">
        <div className="bg-white/95 backdrop-blur-sm py-8 px-6 shadow-2xl rounded-2xl border border-blue-100">
          {/* Icon */}
          <div className="flex justify-center mb-6">
            <div className="relative">
              <div className="absolute inset-0 bg-blue-400 rounded-full blur-xl opacity-50"></div>
              <div className="relative bg-gradient-to-br from-blue-500 to-cyan-500 rounded-full p-4">
                <Mail className="w-12 h-12 text-white" />
              </div>
            </div>
          </div>

          {/* Header */}
          <h2 className="text-2xl font-bold text-gray-900 text-center mb-2">
            Confirm Your Email
          </h2>
          <p className="text-gray-600 text-center mb-6">
            We've sent a confirmation email to:
          </p>
          <p className="text-blue-600 font-semibold text-center mb-6">
            {email}
          </p>

          {/* Instructions */}
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
            <div className="flex items-start">
              <CheckCircle className="w-5 h-5 text-blue-600 mr-3 mt-0.5 flex-shrink-0" />
              <div className="text-sm text-gray-700">
                <p className="font-semibold mb-2">Next steps:</p>
                <ol className="list-decimal list-inside space-y-1">
                  <li>Open your email inbox</li>
                  <li>Find the confirmation email from ContractorAI</li>
                  <li>Click the confirmation link</li>
                  <li>You'll be automatically logged in</li>
                </ol>
              </div>
            </div>
          </div>

          {/* iOS Email Confirmation Instructions */}
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
            <div className="text-sm text-gray-700">
              <p className="font-semibold mb-2">📱 iOS App Instructions:</p>
              <ol className="list-decimal list-inside space-y-2">
                <li>Check your email inbox for the confirmation link</li>
                <li>Click the confirmation link in the email</li>
                <li className="font-bold text-blue-700">After confirming, come back to this app</li>
                <li>Click "I've Confirmed - Continue" button below</li>
              </ol>
            </div>
          </div>

          {/* Email Configuration Warning */}
          <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 mb-6">
            <div className="text-sm text-yellow-800">
              <p className="font-semibold mb-1">⚠️ Not receiving emails?</p>
              <p className="mb-2">If you don't receive the confirmation email within a few minutes:</p>
              <ul className="list-disc list-inside space-y-1 text-xs">
                <li>Check your spam/junk folder</li>
                <li>Try clicking "Resend" below</li>
                <li>Or click "Skip and sign in" to contact support</li>
              </ul>
            </div>
          </div>

          {/* Success Message */}
          {resendSuccess && (
            <div className="bg-green-50 border border-green-200 text-green-700 px-4 py-3 rounded-lg mb-4">
              <div className="flex items-center">
                <CheckCircle className="w-5 h-5 mr-2" />
                <span>Confirmation email sent! Check your inbox.</span>
              </div>
            </div>
          )}

          {/* Error Message */}
          {error && (
            <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg mb-4 text-sm">
              {error}
            </div>
          )}

          {/* Action Buttons */}
          <div className="space-y-3">
            <button
              onClick={handleCheckNow}
              disabled={checking}
              className="w-full flex justify-center items-center py-3 px-4 border border-transparent rounded-lg shadow-lg text-sm font-bold text-white bg-gradient-to-r from-blue-600 to-cyan-600 hover:from-blue-700 hover:to-cyan-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200"
            >
              {checking ? (
                <>
                  <Loader2 className="animate-spin h-5 w-5 mr-2" />
                  Checking...
                </>
              ) : (
                <>
                  <CheckCircle className="w-5 h-5 mr-2" />
                  I've Confirmed - Continue
                </>
              )}
            </button>

            <button
              onClick={handleResendConfirmation}
              disabled={resending}
              className="w-full flex justify-center items-center py-3 px-4 border-2 border-gray-300 rounded-lg text-sm font-semibold text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200"
            >
              {resending ? (
                <>
                  <Loader2 className="animate-spin h-5 w-5 mr-2" />
                  Sending...
                </>
              ) : (
                <>
                  <RefreshCw className="w-5 h-5 mr-2" />
                  Resend Confirmation Email
                </>
              )}
            </button>
          </div>

          {/* Help Text */}
          <div className="mt-6 text-center space-y-2">
            <p className="text-xs text-gray-500">
              Didn't receive the email? Check your spam folder or{' '}
              <button
                onClick={handleResendConfirmation}
                className="text-blue-600 hover:text-blue-700 font-semibold"
              >
                resend it
              </button>
            </p>
            <p className="text-xs text-gray-500">
              Having trouble?{' '}
              <button
                onClick={handleSkipConfirmation}
                className="text-blue-600 hover:text-blue-700 font-semibold"
              >
                Skip and sign in
              </button>
            </p>
          </div>

          {/* Auto-checking indicator */}
          <div className="mt-4 pt-4 border-t border-gray-200">
            <div className="flex items-center justify-center text-xs text-gray-500">
              <div className="animate-pulse flex items-center">
                <div className="w-2 h-2 bg-blue-500 rounded-full mr-2"></div>
                <span>Auto-checking for confirmation...</span>
              </div>
            </div>
          </div>

          {/* Contact Support */}
          <div className="mt-4 text-center">
            <p className="text-xs text-gray-500">
              Need help?{' '}
              <a
                href="mailto:admin@elevatedsystems.info"
                className="text-blue-600 hover:text-blue-700 font-semibold"
              >
                Contact Support
              </a>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default EmailConfirmation;
