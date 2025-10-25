import React, { useState, useEffect } from 'react';
import { Mail, CheckCircle, XCircle, AlertCircle } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { useAuthStore } from '../../stores/authStore';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || import.meta.env.NEXT_PUBLIC_SUPABASE_URL;
const googleClientId = import.meta.env.VITE_GOOGLE_CLIENT_ID;
const redirectUri = import.meta.env.VITE_GMAIL_REDIRECT_URI || `${window.location.origin}/gmail-oauth-callback`;

export const GmailConnection: React.FC = () => {
  const { session } = useAuthStore();
  const [isConnected, setIsConnected] = useState(false);
  const [gmailEmail, setGmailEmail] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isConnecting, setIsConnecting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    checkGmailConnection();
  }, []);

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
      }
    } catch (error: any) {
      console.error('Error checking Gmail connection:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleConnectGmail = () => {
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
        popup?.close();
        window.removeEventListener('message', handleMessage);
      } else if (event.data.type === 'GMAIL_OAUTH_ERROR') {
        setError(event.data.error || 'Failed to connect Gmail');
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

  const handleDisconnectGmail = async () => {
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
    } catch (error: any) {
      console.error('Error disconnecting Gmail:', error);
      setError('Failed to disconnect Gmail');
    }
  };

  if (isLoading) {
    return (
      <div className="bg-white rounded-lg shadow p-6">
        <div className="flex items-center justify-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-lg shadow p-6">
      <div className="flex items-start justify-between mb-4">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center">
            <Mail className="w-6 h-6 text-blue-600" />
          </div>
          <div>
            <h3 className="text-lg font-semibold text-gray-900">Gmail Integration</h3>
            <p className="text-sm text-gray-600">
              Send emails from Cindy using your Gmail account
            </p>
          </div>
        </div>
      </div>

      {error && (
        <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg flex items-start gap-2">
          <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
          <p className="text-sm text-red-700">{error}</p>
        </div>
      )}

      {isConnected ? (
        <div className="space-y-4">
          <div className="p-4 bg-green-50 border border-green-200 rounded-lg">
            <div className="flex items-center gap-2 mb-2">
              <CheckCircle className="w-5 h-5 text-green-600" />
              <span className="font-medium text-green-900">Connected</span>
            </div>
            <p className="text-sm text-green-700">
              Emails will be sent from: <span className="font-medium">{gmailEmail}</span>
            </p>
          </div>

          <button
            onClick={handleDisconnectGmail}
            className="px-4 py-2 text-red-600 border border-red-300 rounded-lg hover:bg-red-50 transition-colors"
          >
            Disconnect Gmail
          </button>
        </div>
      ) : (
        <div className="space-y-4">
          <div className="p-4 bg-gray-50 border border-gray-200 rounded-lg">
            <div className="flex items-center gap-2 mb-2">
              <XCircle className="w-5 h-5 text-gray-600" />
              <span className="font-medium text-gray-900">Not Connected</span>
            </div>
            <p className="text-sm text-gray-600">
              Connect your Gmail account to send emails directly from Cindy
            </p>
          </div>

          <button
            onClick={handleConnectGmail}
            disabled={isConnecting}
            className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
          >
            {isConnecting ? (
              <>
                <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
                Connecting...
              </>
            ) : (
              <>
                <Mail className="w-5 h-5" />
                Connect Gmail Account
              </>
            )}
          </button>

          <div className="text-xs text-gray-500">
            By connecting, you allow ContractorAI to send emails on your behalf using Gmail API.
            You can disconnect at any time.
          </div>
        </div>
      )}
    </div>
  );
};

export default GmailConnection;
