import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Eye, EyeOff, Mail, Lock, ArrowRight, ArrowLeft } from 'lucide-react';
import { useAuthStore } from '../../stores/authStore';
import { supabase } from '../../lib/supabase';
import { Capacitor } from '@capacitor/core';
import { useTheme, getThemeClasses } from '../../contexts/ThemeContext';

const LoginPage = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [oauthLoading, setOauthLoading] = useState<'google' | 'apple' | null>(null);
  const [error, setError] = useState('');
  const navigate = useNavigate();
  const signIn = useAuthStore((state) => state.signIn);

  const { theme } = useTheme();
  const themeClasses = getThemeClasses(theme);

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
          // Open the OAuth URL in the system browser
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
        // Native iOS - use Sign in with Apple native
        const { SignInWithApple } = await import('@capacitor-community/apple-sign-in');
        const result = await SignInWithApple.authorize({
          clientId: 'com.elevated.contractorai',
          redirectURI: 'https://ujhgwcurllkkeouzwvgk.supabase.co/auth/v1/callback',
          scopes: 'email name',
        });

        // Exchange Apple ID token for Supabase session
        const { error } = await supabase.auth.signInWithIdToken({
          provider: 'apple',
          token: result.response.identityToken,
        });
        if (error) throw error;
        navigate('/');
      } else {
        // Web - use OAuth redirect
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
    setLoading(true);

    try {
      const { error } = await signIn(email, password);

      if (error) {
        if (error.message.toLowerCase().includes('email not confirmed')) {
          setError('Please confirm your email address. Check your inbox for the confirmation link.');
          setTimeout(() => {
            navigate(`/auth/confirm-email?email=${encodeURIComponent(email)}`);
          }, 2000);
        } else {
          setError(error.message);
        }
      } else {
        navigate('/');
      }
    } catch (err) {
      setError('An unexpected error occurred');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className={`min-h-screen ${themeClasses.bg.primary} flex flex-col justify-center px-4 sm:px-6 lg:px-8`}>
      {/* Back button */}
      <div className="absolute top-12 left-4 md:top-16 md:left-6">
        <button
          onClick={() => {
            console.log('Back button clicked');
            navigate(-1);
          }}
          className={`flex items-center gap-2 px-3 py-2 rounded-lg ${themeClasses.text.secondary} ${themeClasses.hover.text} transition-colors`}
        >
          <ArrowLeft className="h-5 w-5" />
          <span className="text-sm font-medium">Back</span>
        </button>
      </div>

      <div className="sm:mx-auto w-full sm:max-w-sm md:max-w-md">
        {/* Logo */}
        <div className="flex justify-center mb-6">
          <div className={`${themeClasses.bg.secondary} rounded-lg p-2 md:p-3 border ${themeClasses.border.secondary}`}>
            <img
              src="/onsite-icon.png"
              alt="OnSite Logo"
              className="w-10 h-10 md:w-12 md:h-12 object-contain"
            />
          </div>
        </div>

        <div className="text-center mb-6">
          <h1 className={`text-xl md:text-2xl font-semibold ${themeClasses.text.primary} mb-2`}>
            Welcome back
          </h1>
          <p className={`${themeClasses.text.muted} text-sm`}>
            Sign in to your account
          </p>
        </div>
      </div>

      <div className="sm:mx-auto w-full sm:max-w-sm md:max-w-md">
        <div className={`${themeClasses.bg.secondary} py-6 px-4 md:py-7 md:px-6 rounded-lg border ${themeClasses.border.secondary}`}>
          <form className="space-y-4" onSubmit={handleSubmit}>
            {error && (
              <div className={`border ${themeClasses.border.secondary} ${themeClasses.text.secondary} px-3 py-2 rounded-md text-sm`}>
                {error}
              </div>
            )}

            <div>
              <label htmlFor="email" className={`block text-sm ${themeClasses.text.secondary} mb-1.5`}>
                Email
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <Mail className={`h-4 w-4 ${themeClasses.text.muted}`} />
                </div>
                <input
                  id="email"
                  name="email"
                  type="email"
                  autoComplete="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className={`w-full pl-9 pr-4 py-2.5 ${themeClasses.bg.input} border ${themeClasses.border.input} rounded-md ${themeClasses.text.primary} ${theme === 'light' ? 'placeholder-gray-500' : 'placeholder-zinc-600'} focus:outline-none ${themeClasses.focus.border} transition-colors`}
                  placeholder="you@example.com"
                />
              </div>
            </div>

            <div>
              <label htmlFor="password" className={`block text-sm ${themeClasses.text.secondary} mb-1.5`}>
                Password
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <Lock className={`h-4 w-4 ${themeClasses.text.muted}`} />
                </div>
                <input
                  id="password"
                  name="password"
                  type={showPassword ? 'text' : 'password'}
                  autoComplete="current-password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className={`w-full pl-9 pr-11 py-2.5 ${themeClasses.bg.input} border ${themeClasses.border.input} rounded-md ${themeClasses.text.primary} ${theme === 'light' ? 'placeholder-gray-500' : 'placeholder-zinc-600'} focus:outline-none ${themeClasses.focus.border} transition-colors`}
                  placeholder="Enter password"
                />
                <div className="absolute inset-y-0 right-0 pr-3 flex items-center">
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className={`${themeClasses.text.muted} ${themeClasses.hover.text} transition-colors`}
                  >
                    {showPassword ? (
                      <EyeOff className="h-4 w-4" />
                    ) : (
                      <Eye className="h-4 w-4" />
                    )}
                  </button>
                </div>
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className={`w-full flex justify-center items-center py-2.5 px-4 rounded-md text-sm font-medium ${themeClasses.button.primary} ${themeClasses.button.primaryHover} focus:outline-none disabled:opacity-50 disabled:cursor-not-allowed transition-colors`}
            >
              {loading ? (
                <div className={`w-4 h-4 border-2 ${theme === 'light' ? 'border-black border-t-transparent' : 'border-black border-t-transparent'} rounded-full animate-spin`}></div>
              ) : (
                <>
                  Sign in
                  <ArrowRight className="ml-2 h-3.5 w-3.5" />
                </>
              )}
            </button>

            <div className="relative my-5">
              <div className="absolute inset-0 flex items-center">
                <div className={`w-full border-t ${themeClasses.border.secondary}`}></div>
              </div>
              <div className="relative flex justify-center text-xs">
                <span className={`px-3 ${themeClasses.bg.secondary} ${themeClasses.text.muted}`}>or continue with</span>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <button
                type="button"
                onClick={handleGoogleSignIn}
                disabled={oauthLoading !== null}
                className={`flex items-center justify-center gap-2 py-2.5 px-3 ${themeClasses.bg.input} border ${themeClasses.border.secondary} rounded-md ${themeClasses.text.primary} ${themeClasses.hover.bg} focus:outline-none disabled:opacity-50 disabled:cursor-not-allowed transition-colors text-sm`}
              >
                {oauthLoading === 'google' ? (
                  <div className={`w-4 h-4 border-2 ${theme === 'light' ? 'border-black border-t-transparent' : 'border-white border-t-transparent'} rounded-full animate-spin`}></div>
                ) : (
                  <>
                    <svg className="w-4 h-4" viewBox="0 0 24 24">
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
                className={`flex items-center justify-center gap-2 py-2.5 px-3 ${themeClasses.bg.input} border ${themeClasses.border.secondary} rounded-md ${themeClasses.text.primary} ${themeClasses.hover.bg} focus:outline-none disabled:opacity-50 disabled:cursor-not-allowed transition-colors text-sm`}
              >
                {oauthLoading === 'apple' ? (
                  <div className={`w-4 h-4 border-2 ${theme === 'light' ? 'border-black border-t-transparent' : 'border-white border-t-transparent'} rounded-full animate-spin`}></div>
                ) : (
                  <>
                    <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
                      <path d="M18.71 19.5c-.83 1.24-1.71 2.45-3.05 2.47-1.34.03-1.77-.79-3.29-.79-1.53 0-2 .77-3.27.82-1.31.05-2.3-1.32-3.14-2.53C4.25 17 2.94 12.45 4.7 9.39c.87-1.52 2.43-2.48 4.12-2.51 1.28-.02 2.5.87 3.29.87.78 0 2.26-1.07 3.81-.91.65.03 2.47.26 3.64 1.98-.09.06-2.17 1.28-2.15 3.81.03 3.02 2.65 4.03 2.68 4.04-.03.07-.42 1.44-1.38 2.83M13 3.5c.73-.83 1.94-1.46 2.94-1.5.13 1.17-.34 2.35-1.04 3.19-.69.85-1.83 1.51-2.95 1.42-.15-1.15.41-2.35 1.05-3.11z"/>
                    </svg>
                    Apple
                  </>
                )}
              </button>
            </div>

            <div className="text-center pt-3">
              <p className={`${themeClasses.text.muted} text-xs`}>
                Don't have an account?{' '}
                <Link
                  to="/auth/signup"
                  className={`${themeClasses.text.primary} ${themeClasses.hover.text} transition-colors`}
                >
                  Sign up
                </Link>
              </p>
            </div>
          </form>

          <div className={`mt-4 pt-4 border-t ${themeClasses.border.secondary}`}>
            <div className={`flex items-center justify-center gap-3 text-xs ${themeClasses.text.muted}`}>
              <Link to="/legal/terms" className={`${themeClasses.hover.text} transition-colors`}>
                Terms
              </Link>
              <span>•</span>
              <Link to="/legal/privacy" className={`${themeClasses.hover.text} transition-colors`}>
                Privacy
              </Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default LoginPage;
