import { useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Mail, RefreshCw } from 'lucide-react';
import { supabase } from '../../lib/supabase';

const EmailConfirmation = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const email = searchParams.get('email') || '';
  const [resending, setResending] = useState(false);
  const [resendSuccess, setResendSuccess] = useState(false);
  const [error, setError] = useState('');
  const [isConfirmed, setIsConfirmed] = useState(false);

  const handleResendConfirmation = async () => {
    if (!email) {
      setError('Email address not found');
      return;
    }

    setResending(true);
    setError('');
    setResendSuccess(false);

    try {
      const { error } = await supabase.auth.resend({
        type: 'signup',
        email: email,
      });

      if (error) {
        if (error.code === 'over_email_send_rate_limit') {
          setError('Too many resend attempts. Please wait a moment.');
        } else {
          setError(error.message || 'Failed to resend email');
        }
      } else {
        setResendSuccess(true);
        setTimeout(() => setResendSuccess(false), 5000);
      }
    } catch (err: any) {
      setError(err.message || 'Failed to resend confirmation email');
    } finally {
      setResending(false);
    }
  };

  const handleContinue = () => {
    if (isConfirmed) {
      navigate('/auth/login?email=' + encodeURIComponent(email) + '&confirmed=true');
    }
  };

  return (
    <div className="min-h-screen bg-[#0F0F0F] flex flex-col justify-center px-4 sm:px-6 lg:px-8">
      <div className="sm:mx-auto w-full sm:max-w-md">
        {/* Logo */}
        <div className="flex justify-center mb-6">
          <div className="bg-[#1C1C1E] rounded-lg p-3 border border-[#2C2C2E]">
            <img
              src="/logo.png"
              alt="ContractorAI Logo"
              className="w-14 h-14 object-contain"
            />
          </div>
        </div>

        <div className="text-center mb-6">
          <h1 className="text-2xl font-semibold text-white mb-2">
            Check Your Email
          </h1>
          <p className="text-zinc-500 text-sm mb-4">
            You will be sent a confirmation email. Please sign in with your email and password after confirming.
          </p>
          <p className="text-orange-500 font-semibold">
            {email}
          </p>
        </div>
      </div>

      <div className="sm:mx-auto w-full sm:max-w-md">
        <div className="bg-[#1C1C1E] py-8 px-6 rounded-lg border border-[#2C2C2E]">

          {/* Success Message */}
          {resendSuccess && (
            <div className="bg-green-500/10 border border-green-500/20 text-green-400 px-4 py-3 rounded-md mb-4 text-sm">
              Confirmation email sent! Check your inbox.
            </div>
          )}

          {/* Error Message */}
          {error && (
            <div className="bg-red-500/10 border border-red-500/20 text-red-400 px-4 py-3 rounded-md mb-4 text-sm">
              {error}
            </div>
          )}

          {/* Confirmation Checkbox */}
          <div className="mb-6">
            <label className="flex items-center space-x-3 cursor-pointer">
              <input
                type="checkbox"
                checked={isConfirmed}
                onChange={(e) => setIsConfirmed(e.target.checked)}
                className="w-5 h-5 bg-[#0F0F0F] border border-[#2C2C2E] rounded focus:ring-orange-500 focus:ring-2 text-orange-500"
              />
              <span className="text-zinc-300 text-sm">
                I have confirmed my email
              </span>
            </label>
          </div>

          {/* Action Buttons */}
          <div className="space-y-3">
            <button
              onClick={handleContinue}
              disabled={!isConfirmed}
              className="w-full py-3 px-4 bg-orange-500 text-white rounded-md hover:bg-orange-600 disabled:opacity-50 disabled:cursor-not-allowed font-semibold transition-colors"
            >
              Continue to Sign In
            </button>

            <button
              onClick={handleResendConfirmation}
              disabled={resending}
              className="w-full flex justify-center items-center py-3 px-4 bg-[#0F0F0F] border border-[#2C2C2E] text-zinc-300 rounded-md hover:bg-[#1C1C1E] disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              {resending ? (
                <>
                  <RefreshCw className="animate-spin h-4 w-4 mr-2" />
                  Sending...
                </>
              ) : (
                <>
                  <RefreshCw className="w-4 h-4 mr-2" />
                  Resend Verification
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default EmailConfirmation;
