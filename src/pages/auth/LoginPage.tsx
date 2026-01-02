import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Eye, EyeOff, Mail, Lock, ArrowRight } from 'lucide-react';
import { useAuthStore } from '../../stores/authStore';

const LoginPage = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const navigate = useNavigate();
  const signIn = useAuthStore((state) => state.signIn);

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
    <div className="min-h-screen bg-[#0F0F0F] flex flex-col justify-center px-4 sm:px-6 lg:px-8">
      <div className="sm:mx-auto w-full sm:max-w-md">
        {/* Logo */}
        <div className="flex justify-center mb-8">
          <div className="bg-[#1C1C1E] rounded-lg p-3 border border-[#2C2C2E]">
            <img
              src="/logo.png"
              alt="ContractorAI Logo"
              className="w-14 h-14 object-contain"
            />
          </div>
        </div>

        <div className="text-center mb-8">
          <h1 className="text-2xl font-semibold text-white mb-2">
            Welcome back
          </h1>
          <p className="text-zinc-500 text-sm">
            Sign in to your account
          </p>
        </div>
      </div>

      <div className="sm:mx-auto w-full sm:max-w-md">
        <div className="bg-[#1C1C1E] py-8 px-6 rounded-lg border border-[#2C2C2E]">
          <form className="space-y-5" onSubmit={handleSubmit}>
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
                  autoComplete="current-password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full pl-10 pr-12 py-3 bg-[#0F0F0F] border border-[#2C2C2E] rounded-md text-white placeholder-zinc-600 focus:outline-none focus:border-zinc-500 transition-colors"
                  placeholder="Enter password"
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
              className="w-full flex justify-center items-center py-3 px-4 rounded-md text-sm font-medium text-black bg-white hover:bg-zinc-200 focus:outline-none disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              {loading ? (
                <div className="w-5 h-5 border-2 border-black border-t-transparent rounded-full animate-spin"></div>
              ) : (
                <>
                  Sign in
                  <ArrowRight className="ml-2 h-4 w-4" />
                </>
              )}
            </button>

            <div className="text-center pt-2">
              <p className="text-zinc-500 text-sm">
                Don't have an account?{' '}
                <Link
                  to="/auth/signup"
                  className="text-white hover:text-zinc-300 transition-colors"
                >
                  Sign up
                </Link>
              </p>
            </div>
          </form>

          <div className="mt-6 pt-6 border-t border-[#2C2C2E]">
            <div className="flex items-center justify-center gap-4 text-xs text-zinc-600">
              <Link to="/legal/terms" className="hover:text-zinc-400 transition-colors">
                Terms
              </Link>
              <span>•</span>
              <Link to="/legal/privacy" className="hover:text-zinc-400 transition-colors">
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
