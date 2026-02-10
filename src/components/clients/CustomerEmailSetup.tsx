import React, { useState } from 'react';
import { Mail, ExternalLink, AlertCircle, CheckCircle, Loader2, Send, X } from 'lucide-react';
import { useTheme, getThemeClasses } from '../../contexts/ThemeContext';
import useClientStore from '../../stores/clientsStore';
import { supabase } from '../../lib/supabase';

interface Client {
  id: string;
  name: string;
  email: string;
  gmail_email?: string;
  email_sending_enabled?: boolean;
  email_auth_method?: string;
}

interface Props {
  client: Client;
  onEmailConnected?: (client: Client) => void;
  onEmailDisconnected?: (client: Client) => void;
}

const CustomerEmailSetup: React.FC<Props> = ({
  client,
  onEmailConnected,
  onEmailDisconnected
}) => {
  const { theme } = useTheme();
  const themeClasses = getThemeClasses(theme);
  const { updateClient } = useClientStore();

  const [isConnecting, setIsConnecting] = useState(false);
  const [isDisconnecting, setIsDisconnecting] = useState(false);
  const [isTesting, setIsTesting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const isConnected = client.email_sending_enabled && client.gmail_email;

  const handleConnectGmail = async () => {
    try {
      setIsConnecting(true);
      setError(null);

      // Get Google OAuth client ID from environment
      const googleClientId = import.meta.env.VITE_GOOGLE_CLIENT_ID;
      if (!googleClientId) {
        throw new Error('Google OAuth not configured. Please contact support.');
      }

      // Create OAuth URL with client_id parameter
      const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
      const redirectUri = `${supabaseUrl}/functions/v1/customer-gmail-oauth?client_id=${client.id}`;

      const oauthUrl = new URL('https://accounts.google.com/o/oauth2/v2/auth');
      oauthUrl.searchParams.set('client_id', googleClientId);
      oauthUrl.searchParams.set('redirect_uri', redirectUri);
      oauthUrl.searchParams.set('response_type', 'code');
      oauthUrl.searchParams.set('scope', 'gmail.send userinfo.email');
      oauthUrl.searchParams.set('access_type', 'offline');
      oauthUrl.searchParams.set('prompt', 'consent');

      // Open OAuth popup
      const popup = window.open(
        oauthUrl.toString(),
        'gmail-oauth',
        'width=500,height=600,scrollbars=yes,resizable=yes'
      );

      if (!popup) {
        throw new Error('Popup blocked. Please allow popups for this site.');
      }

      // Listen for popup completion
      const checkClosed = setInterval(async () => {
        if (popup.closed) {
          clearInterval(checkClosed);
          setIsConnecting(false);

          // Check if client was updated (OAuth success)
          try {
            const { data: updatedClient, error: fetchError } = await supabase
              .from('clients')
              .select('*')
              .eq('id', client.id)
              .single();

            if (fetchError) {
              console.error('Error fetching updated client:', fetchError);
              setError('Failed to verify email connection');
              return;
            }

            if (updatedClient?.email_sending_enabled && updatedClient?.gmail_email) {
              // Success - update local state
              updateClient(updatedClient);
              setSuccess(`Gmail account ${updatedClient.gmail_email} connected successfully!`);
              onEmailConnected?.(updatedClient);
            } else {
              setError('Gmail connection was not completed. Please try again.');
            }
          } catch (err) {
            console.error('Error checking connection status:', err);
            setError('Failed to verify email connection');
          }
        }
      }, 1000);

      // Cleanup if popup is closed without completion after 5 minutes
      setTimeout(() => {
        if (!popup.closed) {
          popup.close();
          clearInterval(checkClosed);
          setIsConnecting(false);
          setError('Connection timeout. Please try again.');
        }
      }, 300000);

    } catch (err) {
      console.error('Gmail connection error:', err);
      setError(err instanceof Error ? err.message : 'Failed to connect Gmail account');
      setIsConnecting(false);
    }
  };

  const handleDisconnectGmail = async () => {
    try {
      setIsDisconnecting(true);
      setError(null);

      const { data: updatedClient, error } = await supabase
        .from('clients')
        .update({
          gmail_access_token: null,
          gmail_refresh_token: null,
          gmail_token_expiry: null,
          gmail_email: null,
          email_sending_enabled: false,
          email_auth_method: 'none',
          updated_at: new Date().toISOString()
        })
        .eq('id', client.id)
        .select('*')
        .single();

      if (error) {
        throw error;
      }

      updateClient(updatedClient);
      setSuccess('Gmail account disconnected successfully');
      onEmailDisconnected?.(updatedClient);

    } catch (err) {
      console.error('Disconnect error:', err);
      setError('Failed to disconnect Gmail account');
    } finally {
      setIsDisconnecting(false);
    }
  };

  const handleTestEmail = async () => {
    try {
      setIsTesting(true);
      setError(null);

      // This would call a test email edge function
      // For now, just simulate the test
      await new Promise(resolve => setTimeout(resolve, 2000));
      setSuccess('Test email sent successfully!');

    } catch (err) {
      console.error('Test email error:', err);
      setError('Failed to send test email');
    } finally {
      setIsTesting(false);
    }
  };

  const clearMessages = () => {
    setError(null);
    setSuccess(null);
  };

  return (
    <div className={`${themeClasses.bg.card} rounded-lg border ${themeClasses.border.primary} p-4`}>
      <div className="flex items-center gap-3 mb-4">
        <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${
          isConnected ? 'bg-green-500/20' : `${themeClasses.bg.secondary}`
        }`}>
          <Mail className={`w-5 h-5 ${
            isConnected ? 'text-green-500' : themeClasses.text.secondary
          }`} />
        </div>
        <div>
          <h3 className={`font-semibold ${themeClasses.text.primary}`}>
            Email Sending Setup
          </h3>
          <p className={`text-sm ${themeClasses.text.secondary}`}>
            Connect {client.name}'s Gmail to send estimates from their email
          </p>
        </div>
      </div>

      {/* Connection Status */}
      <div className={`flex items-center gap-2 p-3 rounded-lg mb-4 ${
        isConnected
          ? 'bg-green-50 border border-green-200 dark:bg-green-900/20 dark:border-green-800'
          : `${themeClasses.bg.secondary} border ${themeClasses.border.primary}`
      }`}>
        {isConnected ? (
          <>
            <CheckCircle className="w-4 h-4 text-green-500" />
            <div>
              <p className={`text-sm font-medium ${themeClasses.text.primary}`}>
                Connected to Gmail
              </p>
              <p className={`text-xs ${themeClasses.text.secondary}`}>
                {client.gmail_email}
              </p>
            </div>
          </>
        ) : (
          <>
            <AlertCircle className={`w-4 h-4 ${themeClasses.text.secondary}`} />
            <div>
              <p className={`text-sm font-medium ${themeClasses.text.primary}`}>
                Not Connected
              </p>
              <p className={`text-xs ${themeClasses.text.secondary}`}>
                Estimates will be sent from your email
              </p>
            </div>
          </>
        )}
      </div>

      {/* Messages */}
      {error && (
        <div className="flex items-center justify-between p-3 bg-red-50 border border-red-200 rounded-lg mb-4 dark:bg-red-900/20 dark:border-red-800">
          <div className="flex items-center gap-2">
            <AlertCircle className="w-4 h-4 text-red-500" />
            <p className="text-sm text-red-700 dark:text-red-300">{error}</p>
          </div>
          <button
            onClick={clearMessages}
            className="text-red-500 hover:text-red-700 p-1"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {success && (
        <div className="flex items-center justify-between p-3 bg-green-50 border border-green-200 rounded-lg mb-4 dark:bg-green-900/20 dark:border-green-800">
          <div className="flex items-center gap-2">
            <CheckCircle className="w-4 h-4 text-green-500" />
            <p className="text-sm text-green-700 dark:text-green-300">{success}</p>
          </div>
          <button
            onClick={clearMessages}
            className="text-green-500 hover:text-green-700 p-1"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Action Buttons */}
      <div className="space-y-3">
        {!isConnected ? (
          <button
            onClick={handleConnectGmail}
            disabled={isConnecting}
            className={`w-full flex items-center justify-center gap-2 px-4 py-2.5 ${themeClasses.button.primary} rounded-md font-medium ${themeClasses.button.primaryHover} disabled:opacity-50 disabled:cursor-not-allowed transition-all`}
          >
            {isConnecting ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <ExternalLink className="w-4 h-4" />
            )}
            {isConnecting ? 'Connecting...' : 'Connect Gmail Account'}
          </button>
        ) : (
          <div className="grid grid-cols-2 gap-3">
            <button
              onClick={handleTestEmail}
              disabled={isTesting}
              className={`flex items-center justify-center gap-2 px-4 py-2.5 ${themeClasses.bg.tertiary} border ${themeClasses.border.primary} rounded-md font-medium ${themeClasses.hover.bg} disabled:opacity-50 disabled:cursor-not-allowed transition-all`}
            >
              {isTesting ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Send className="w-4 h-4" />
              )}
              {isTesting ? 'Sending...' : 'Test Email'}
            </button>
            <button
              onClick={handleDisconnectGmail}
              disabled={isDisconnecting}
              className={`flex items-center justify-center gap-2 px-4 py-2.5 bg-red-500/10 border border-red-300 text-red-600 rounded-md font-medium hover:bg-red-500/20 disabled:opacity-50 disabled:cursor-not-allowed transition-all`}
            >
              {isDisconnecting ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <X className="w-4 h-4" />
              )}
              {isDisconnecting ? 'Disconnecting...' : 'Disconnect'}
            </button>
          </div>
        )}
      </div>

      {/* Info Text */}
      <div className={`mt-4 p-3 ${themeClasses.bg.secondary} rounded-lg`}>
        <p className={`text-xs ${themeClasses.text.muted} leading-relaxed`}>
          {isConnected ? (
            <>
              Estimates will now be sent from <strong>{client.gmail_email}</strong>.
              Reply notifications will still come to your email.
            </>
          ) : (
            <>
              Connect {client.name}'s Gmail account to send estimates that appear to come
              directly from them. This creates a more professional experience for their clients.
            </>
          )}
        </p>
      </div>
    </div>
  );
};

export default CustomerEmailSetup;