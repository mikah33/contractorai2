import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Eye, EyeOff, Mail, Lock, ArrowRight } from 'lucide-react';
import { useAuthStore } from '../../stores/authStore';
import { supabase } from '../../lib/supabase';
import { Capacitor } from '@capacitor/core';

const SignupPage = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [oauthLoading, setOauthLoading] = useState<'google' | 'apple' | null>(null);
  const [error, setError] = useState('');
  const navigate = useNavigate();
  const signUp = useAuthStore((state) => state.signUp);

  const isNative = Capacitor.isNativePlatform();

  const handleGoogleSignIn = async () => {
    setError('');
    setOauthLoading('google');
    try {
      if (isNative) {
        // Native iOS - get OAuth URL and open in browser
        const { data, error } = await supabase.auth.signInWithOAuth({
          provider: 'google',
          options: {
            redirectTo: 'contractorai://auth/callback',
            skipBrowserRedirect: true,
          },
        });
        if (error) throw error;
        if (data?.url) {
          const { Browser } = await import('@capacitor/browser');
          await Browser.open({ url: data.url });
        }
      } else {
        // Web - use standard OAuth redirect
        const { error } = await supabase.auth.signInWithOAuth({
          provider: 'google',
          options: {
            redirectTo: `${window.location.origin}/auth/callback`,
          },
        });
        if (error) setError(error.message);
      }
    } catch (err: any) {
      console.error('Google sign in error:', err);
      setError(err.message || 'Failed to sign in with Google');
    } finally {
      setOauthLoading(null);
    }
  };

  const handleAppleSignIn = async () => {
    setError('');
    setOauthLoading('apple');
    try {
      if (isNative) {
        const { SignInWithApple } = await import('@capacitor-community/apple-sign-in');
        const result = await SignInWithApple.authorize({
          clientId: 'com.elevated.contractorai',
          redirectURI: 'https://ujhgwcurllkkeouzwvgk.supabase.co/auth/v1/callback',
          scopes: 'email name',
        });

        const { error } = await supabase.auth.signInWithIdToken({
          provider: 'apple',
          token: result.response.identityToken,
        });
        if (error) throw error;
        navigate('/');
      } else {
        const { error } = await supabase.auth.signInWithOAuth({
          provider: 'apple',
          options: {
            redirectTo: `${window.location.origin}/auth/callback`,
          },
        });
        if (error) setError(error.message);
      }
    } catch (err: any) {
      console.error('Apple sign in error:', err);
      setError(err.message || 'Failed to sign in with Apple');
    } finally {
      setOauthLoading(null);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (password.length < 6) {
      setError('Password must be at least 6 characters long');
      return;
    }

    setLoading(true);

    try {
      const result = await signUp(email, password);

      if (result.error) {
        setError(result.error.message);
      } else {
        const needsConfirmation = result.user && !result.user.email_confirmed_at && !result.session;

        if (needsConfirmation) {
          navigate(`/auth/confirm-email?email=${encodeURIComponent(email)}`);
        } else {
          navigate('/');
        }
      }
    } catch (err) {
      setError('An unexpected error occurred');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#0F0F0F] flex flex-col justify-center px-4 sm:px-6 lg:px-8 py-8">
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
            Create account
          </h1>
          <p className="text-zinc-500 text-sm">
            Get started with ContractorAI
          </p>
        </div>
      </div>

      <div className="sm:mx-auto w-full sm:max-w-md">
        <div className="bg-[#1C1C1E] py-8 px-6 rounded-lg border border-[#2C2C2E]">
          <form className="space-y-4" onSubmit={handleSubmit}>
            {error && (
              <div className="border border-[#3A3A3C] text-zinc-400 px-4 py-3 rounded-md text-sm">
                {error}
              </div>
            )}

            <div>
              <label htmlFor="email" className="block text-sm text-zinc-400 mb-2">
                Email
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <Mail className="h-5 w-5 text-zinc-600" />
                </div>
                <input
                  id="email"
                  name="email"
                  type="email"
                  autoComplete="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full pl-10 pr-4 py-3 bg-[#0F0F0F] border border-[#2C2C2E] rounded-md text-white placeholder-zinc-600 focus:outline-none focus:border-zinc-500 transition-colors"
                  placeholder="you@example.com"
                />
              </div>
            </div>

            <div>
              <label htmlFor="password" className="block text-sm text-zinc-400 mb-2">
                Password
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <Lock className="h-5 w-5 text-zinc-600" />
                </div>
                <input
                  id="password"
                  name="password"
                  type={showPassword ? 'text' : 'password'}
                  autoComplete="new-password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full pl-10 pr-12 py-3 bg-[#0F0F0F] border border-[#2C2C2E] rounded-md text-white placeholder-zinc-600 focus:outline-none focus:border-zinc-500 transition-colors"
                  placeholder="Create password"
                />
                <div className="absolute inset-y-0 right-0 pr-3 flex items-center">
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="text-zinc-600 hover:text-zinc-400 transition-colors"
                  >
                    {showPassword ? (
                      <EyeOff className="h-5 w-5" />
                    ) : (
                      <Eye className="h-5 w-5" />
                    )}
                  </button>
                </div>
              </div>
            </div>


            <button
              type="submit"
              disabled={loading}
              className="w-full flex justify-center items-center py-3 px-4 rounded-md text-sm font-medium text-black bg-white hover:bg-zinc-200 focus:outline-none disabled:opacity-50 disabled:cursor-not-allowed transition-colors mt-6"
            >
              {loading ? (
                <div className="w-5 h-5 border-2 border-black border-t-transparent rounded-full animate-spin"></div>
              ) : (
                <>
                  Create account
                  <ArrowRight className="ml-2 h-4 w-4" />
                </>
              )}
            </button>

            <div className="relative my-6">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-[#2C2C2E]"></div>
              </div>
              <div className="relative flex justify-center text-sm">
                <span className="px-4 bg-[#1C1C1E] text-zinc-500">or continue with</span>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <button
                type="button"
                onClick={handleGoogleSignIn}
                disabled={oauthLoading !== null}
                className="flex items-center justify-center gap-2 py-3 px-4 bg-[#0F0F0F] border border-[#2C2C2E] rounded-md text-white hover:bg-[#1C1C1E] focus:outline-none disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                {oauthLoading === 'google' ? (
                  <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                ) : (
                  <>
                    <svg className="w-5 h-5" viewBox="0 0 24 24">
                      <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                      <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                      <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
                      <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
                    </svg>
                    Google
                  </>
                )}
              </button>

              <button
                type="button"
                onClick={handleAppleSignIn}
                disabled={oauthLoading !== null}
                className="flex items-center justify-center gap-2 py-3 px-4 bg-[#0F0F0F] border border-[#2C2C2E] rounded-md text-white hover:bg-[#1C1C1E] focus:outline-none disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                {oauthLoading === 'apple' ? (
                  <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                ) : (
                  <>
                    <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                      <path d="M18.71 19.5c-.83 1.24-1.71 2.45-3.05 2.47-1.34.03-1.77-.79-3.29-.79-1.53 0-2 .77-3.27.82-1.31.05-2.3-1.32-3.14-2.53C4.25 17 2.94 12.45 4.7 9.39c.87-1.52 2.43-2.48 4.12-2.51 1.28-.02 2.5.87 3.29.87.78 0 2.26-1.07 3.81-.91.65.03 2.47.26 3.64 1.98-.09.06-2.17 1.28-2.15 3.81.03 3.02 2.65 4.03 2.68 4.04-.03.07-.42 1.44-1.38 2.83M13 3.5c.73-.83 1.94-1.46 2.94-1.5.13 1.17-.34 2.35-1.04 3.19-.69.85-1.83 1.51-2.95 1.42-.15-1.15.41-2.35 1.05-3.11z"/>
                    </svg>
                    Apple
                  </>
                )}
              </button>
            </div>

            <div className="text-center pt-4">
              <p className="text-zinc-500 text-sm">
                Already have an account?{' '}
                <Link
                  to="/auth/login"
                  className="text-white hover:text-zinc-300 transition-colors"
                >
                  Sign in
                </Link>
              </p>
            </div>
          </form>

          <div className="mt-6 pt-6 border-t border-[#2C2C2E]">
            <p className="text-center text-xs text-zinc-600">
              By signing up, you agree to our{' '}
              <Link to="/legal/terms" className="hover:text-zinc-400">
                Terms
              </Link>
              {' '}and{' '}
              <Link to="/legal/privacy" className="hover:text-zinc-400">
                Privacy Policy
              </Link>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default SignupPage;
