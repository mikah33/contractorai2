import { useState, useEffect } from 'react';
import { Mail, CheckCircle, XCircle, AlertCircle, Loader2, Send, RefreshCw } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { useAuthStore } from '../../stores/authStore';
import { useTheme, getThemeClasses } from '../../contexts/ThemeContext';

const googleClientId = import.meta.env.VITE_GOOGLE_CLIENT_ID;
const redirectUri = import.meta.env.VITE_GMAIL_REDIRECT_URI || `${window.location.origin}/gmail-oauth-callback`;

export const BusinessEmailSetup: React.FC = () => {
  const { user, session } = useAuthStore();
  const { theme } = useTheme();
  const themeClasses = getThemeClasses(theme);

  const [isConnected, setIsConnected] = useState(false);
  const [gmailEmail, setGmailEmail] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isConnecting, setIsConnecting] = useState(false);
  const [isSendingTest, setIsSendingTest] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  useEffect(() => {
    if (session?.user?.id) {
      checkGmailConnection();
    }
  }, [session?.user?.id]);

  const checkGmailConnection = async () => {
    try {
      setIsLoading(true);
      const { data: profile, error } = await supabase
        .from('profiles')
        .select('gmail_email, gmail_access_token')
        .eq('id', session?.user.id)
        .single();

      if (error) throw error;

      if (profile?.gmail_access_token) {
        setIsConnected(true);
        setGmailEmail(profile.gmail_email);
      } else {
        setIsConnected(false);
        setGmailEmail(null);
      }
    } catch (error: any) {
      console.error('Error checking Gmail connection:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleConnectGoogle = () => {
    setIsConnecting(true);
    setError(null);

    const scope = 'https://www.googleapis.com/auth/gmail.send https://www.googleapis.com/auth/userinfo.email';
    const authUrl = `https://accounts.google.com/o/oauth2/v2/auth?${new URLSearchParams({
      client_id: googleClientId,
      redirect_uri: redirectUri,
      response_type: 'code',
      scope,
      access_type: 'offline',
      prompt: 'consent',
    })}`;

    // Open OAuth popup
    const width = 600;
    const height = 700;
    const left = window.screenX + (window.outerWidth - width) / 2;
    const top = window.screenY + (window.outerHeight - height) / 2;

    const popup = window.open(
      authUrl,
      'Google OAuth',
      `width=${width},height=${height},left=${left},top=${top}`
    );

    // Listen for OAuth callback
    const handleMessage = async (event: MessageEvent) => {
      if (event.origin !== window.location.origin) return;

      if (event.data.type === 'GMAIL_OAUTH_SUCCESS') {
        setIsConnected(true);
        setGmailEmail(event.data.email);
        setIsConnecting(false);
        setSuccessMessage('Google account connected successfully!');
        popup?.close();
        window.removeEventListener('message', handleMessage);
      } else if (event.data.type === 'GMAIL_OAUTH_ERROR') {
        setError(event.data.error || 'Failed to connect Google account');
        setIsConnecting(false);
        popup?.close();
        window.removeEventListener('message', handleMessage);
      }
    };

    window.addEventListener('message', handleMessage);

    // Cleanup if popup is closed manually
    const checkPopup = setInterval(() => {
      if (popup?.closed) {
        clearInterval(checkPopup);
        setIsConnecting(false);
        window.removeEventListener('message', handleMessage);
      }
    }, 500);
  };

  const handleDisconnect = async () => {
    try {
      const { error } = await supabase
        .from('profiles')
        .update({
          gmail_access_token: null,
          gmail_refresh_token: null,
          gmail_token_expiry: null,
          gmail_email: null,
        })
        .eq('id', session?.user.id);

      if (error) throw error;

      setIsConnected(false);
      setGmailEmail(null);
      setSuccessMessage('Google account disconnected');
    } catch (error: any) {
      console.error('Error disconnecting Gmail:', error);
      setError('Failed to disconnect Google account');
    }
  };

  const handleSendTestEmail = async () => {
    if (!user) return;

    setIsSendingTest(true);
    setError(null);
    setSuccessMessage(null);

    try {
      // Use the Gmail API via edge function
      const { data, error: sendError } = await supabase.functions.invoke('send-user-gmail', {
        body: {
          userId: user.id,
          to: user.email,
          subject: 'Test Email from ContractorAI',
          htmlBody: `
            <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
              <div style="background: linear-gradient(135deg, #3B82F6 0%, #2563EB 100%); padding: 24px; border-radius: 12px 12px 0 0; text-align: center;">
                <h1 style="color: white; margin: 0; font-size: 24px;">ContractorAI</h1>
              </div>
              <div style="background: #ffffff; padding: 32px; border: 1px solid #e5e7eb; border-top: none; border-radius: 0 0 12px 12px;">
                <h2 style="color: #18181b; margin: 0 0 16px;">Email Connection Successful!</h2>
                <p style="color: #52525b; line-height: 1.6;">This is a test email from ContractorAI.</p>
                <p style="color: #52525b; line-height: 1.6;">Your Google account email (<strong>${gmailEmail}</strong>) is connected and working correctly!</p>
                <div style="margin-top: 24px; padding: 16px; background: #f0fdf4; border-radius: 8px; border-left: 4px solid #22c55e;">
                  <p style="color: #166534; margin: 0;">✓ Task reminders and notifications will be sent from this email address.</p>
                </div>
              </div>
            </div>
          `
        }
      });

      if (sendError) throw new Error(sendError.message || 'Failed to send test email');
      if (data?.error) throw new Error(data.error);

      setSuccessMessage(`Test email sent! Check your inbox at ${user.email}`);
    } catch (err: any) {
      console.error('Error sending test email:', err);
      setError(err.message || 'Failed to send test email');
    } finally {
      setIsSendingTest(false);
    }
  };

  if (isLoading) {
    return (
      <div className={`${themeClasses.bg.secondary} rounded-lg border ${themeClasses.border.primary} p-6`}>
        <div className="flex items-center justify-center">
          <Loader2 className="w-8 h-8 text-blue-500 animate-spin" />
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Header Card */}
      <div className={`${themeClasses.bg.secondary} rounded-lg border border-blue-500/30 p-4`}>
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 bg-blue-500/20 rounded-lg flex items-center justify-center">
              <Mail className="w-6 h-6 text-blue-500" />
            </div>
            <div>
              <h3 className={`text-lg font-semibold ${themeClasses.text.primary}`}>Business Email</h3>
              <p className={`text-sm ${themeClasses.text.secondary}`}>
                Send emails from your Google account
              </p>
            </div>
          </div>
          {isConnected && (
            <button
              onClick={checkGmailConnection}
              className={`p-2 ${themeClasses.text.muted} hover:${themeClasses.text.primary} transition-colors`}
            >
              <RefreshCw className="w-5 h-5" />
            </button>
          )}
        </div>
      </div>

      {error && (
        <div className="p-4 bg-red-500/10 border border-red-500/30 rounded-lg flex items-start gap-2">
          <AlertCircle className="w-5 h-5 text-red-500 flex-shrink-0 mt-0.5" />
          <p className="text-sm text-red-400">{error}</p>
        </div>
      )}

      {successMessage && (
        <div className="p-4 bg-green-500/10 border border-green-500/30 rounded-lg flex items-start gap-2">
          <CheckCircle className="w-5 h-5 text-green-500 flex-shrink-0 mt-0.5" />
          <p className="text-sm text-green-400">{successMessage}</p>
        </div>
      )}

      {isConnected ? (
        /* Connected State */
        <div className="space-y-4">
          <div className="p-4 bg-green-500/10 border border-green-500/30 rounded-lg">
            <div className="flex items-center gap-3 mb-3">
              {/* Gmail Logo */}
              <svg className="w-6 h-6" viewBox="0 0 24 24">
                <path fill="#EA4335" d="M24 5.457v13.909c0 .904-.732 1.636-1.636 1.636h-3.819V11.73L12 16.64l-6.545-4.91v9.273H1.636A1.636 1.636 0 0 1 0 19.366V5.457c0-2.023 2.309-3.178 3.927-1.964L5.455 4.64 12 9.548l6.545-4.91 1.528-1.145C21.69 2.28 24 3.434 24 5.457z"/>
                <path fill="#34A853" d="M24 5.457v.274L12 14.183 0 5.73v-.274C0 3.434 2.309 2.28 3.927 3.493L12 9.548l8.073-6.055C21.69 2.28 24 3.434 24 5.457z"/>
                <path fill="#FBBC05" d="M0 5.457v13.909c0 .904.732 1.636 1.636 1.636h3.819V11.73l-3.928-2.95L0 7.637z" opacity="0"/>
                <path fill="#4285F4" d="M24 5.457v2.18l-1.527 1.144-4.928 3.695v8.527h3.819c.904 0 1.636-.732 1.636-1.636V5.457z" opacity="0"/>
              </svg>
              <div>
                <div className="flex items-center gap-2">
                  <CheckCircle className="w-4 h-4 text-green-500" />
                  <span className="font-medium text-green-400">Gmail Connected</span>
                </div>
              </div>
            </div>

            <div className="flex items-center gap-2 ml-9">
              <Mail className={`w-4 h-4 ${themeClasses.text.muted}`} />
              <span className={`text-sm ${themeClasses.text.primary} font-medium`}>{gmailEmail}</span>
            </div>
            <p className={`text-xs ${themeClasses.text.muted} mt-2 ml-9`}>
              Task reminders and notifications will be sent from this email
            </p>
          </div>

          <div className="flex gap-3">
            <button
              onClick={handleSendTestEmail}
              disabled={isSendingTest}
              className="flex-1 flex items-center justify-center gap-2 px-4 py-3 bg-blue-500/20 text-blue-500 rounded-lg font-medium hover:bg-blue-500/30 transition-colors disabled:opacity-50"
            >
              {isSendingTest ? (
                <Loader2 className="w-5 h-5 animate-spin" />
              ) : (
                <Send className="w-5 h-5" />
              )}
              {isSendingTest ? 'Sending...' : 'Send Test Email'}
            </button>
            <button
              onClick={handleDisconnect}
              className="px-4 py-3 text-red-400 border border-red-500/30 rounded-lg font-medium hover:bg-red-500/10 transition-colors"
            >
              Disconnect
            </button>
          </div>
        </div>
      ) : (
        /* Not Connected State */
        <div className="space-y-4">
          <div className={`p-4 ${themeClasses.bg.input} border ${themeClasses.border.primary} rounded-lg`}>
            <div className="flex items-center gap-2 mb-3">
              <XCircle className={`w-5 h-5 ${themeClasses.text.muted}`} />
              <span className={`font-medium ${themeClasses.text.secondary}`}>No Account Connected</span>
            </div>
            <p className={`text-sm ${themeClasses.text.muted}`}>
              Connect your Google account to send task reminders, estimates, and invoices to clients.
            </p>

            <ul className="mt-4 space-y-2">
              {[
                'Send from your own Gmail address',
                'Task reminder emails to clients & employees',
                'Professional estimates and invoices',
                'Secure OAuth - we never see your password'
              ].map((item, i) => (
                <li key={i} className={`flex items-center gap-2 text-sm ${themeClasses.text.muted}`}>
                  <CheckCircle className="w-4 h-4 text-blue-500 flex-shrink-0" />
                  {item}
                </li>
              ))}
            </ul>
          </div>

          <button
            onClick={handleConnectGoogle}
            disabled={isConnecting}
            className="w-full flex items-center justify-center gap-2 px-4 py-4 bg-blue-500 text-white rounded-lg font-semibold disabled:opacity-50"
          >
            {isConnecting ? (
              <>
                <Loader2 className="w-5 h-5 animate-spin" />
                Connecting...
              </>
            ) : (
              <>
                <svg className="w-5 h-5" viewBox="0 0 24 24">
                  <path fill="currentColor" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                  <path fill="currentColor" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                  <path fill="currentColor" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
                  <path fill="currentColor" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
                </svg>
                Connect Google Account
              </>
            )}
          </button>

          <p className={`text-xs ${themeClasses.text.muted} text-center`}>
            By connecting, you allow ContractorAI to send emails on your behalf.
            You can disconnect at any time.
          </p>
        </div>
      )}
    </div>
  );
};

export default BusinessEmailSetup;
