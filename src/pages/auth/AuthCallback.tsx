import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../../lib/supabase';
import { Loader2 } from 'lucide-react';

const AuthCallback = () => {
  const navigate = useNavigate();

  useEffect(() => {
    const handleAuthCallback = async () => {
      try {
        console.log('[AuthCallback] Processing auth callback...');

        // Get the session from the URL hash
        const { data: { session }, error } = await supabase.auth.getSession();

        console.log('[AuthCallback] Session check result:', {
          hasSession: !!session,
          emailConfirmed: session?.user?.email_confirmed_at,
          error
        });

        if (error) {
          console.error('[AuthCallback] Error:', error);
          navigate('/auth/login?error=' + encodeURIComponent(error.message));
          return;
        }

        if (session?.user) {
          console.log('[AuthCallback] Email confirmed! Redirecting to app...');
          // Email confirmed successfully!
          // Wait a moment for the auth store to update
          setTimeout(() => {
            navigate('/');
          }, 500);
        } else {
          console.log('[AuthCallback] No session found, redirecting to login');
          navigate('/auth/login');
        }
      } catch (err) {
        console.error('[AuthCallback] Exception:', err);
        navigate('/auth/login');
      }
    };

    handleAuthCallback();
  }, [navigate]);

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-blue-900 to-slate-800 flex flex-col justify-center px-4 sm:px-6 lg:px-8">
      <div className="sm:mx-auto w-full sm:max-w-md">
        <div className="bg-white/95 backdrop-blur-sm py-8 px-6 shadow-2xl rounded-2xl border border-blue-100">
          <div className="flex flex-col items-center">
            <Loader2 className="w-12 h-12 text-blue-600 animate-spin mb-4" />
            <h2 className="text-xl font-bold text-gray-900 mb-2">
              Confirming your email...
            </h2>
            <p className="text-gray-600 text-center text-sm">
              Please wait while we confirm your email address
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AuthCallback;
