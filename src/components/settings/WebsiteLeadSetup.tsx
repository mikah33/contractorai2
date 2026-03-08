import React, { useState, useEffect } from 'react';
import { Copy, Check, Key, Code, Globe, Loader2, RefreshCw, AlertCircle } from 'lucide-react';
import { useTheme, getThemeClasses } from '../../contexts/ThemeContext';
import { useAuthStore } from '../../stores/authStore';
import { supabase } from '../../lib/supabase';

const WebsiteLeadSetup: React.FC = () => {
  const { theme } = useTheme();
  const themeClasses = getThemeClasses(theme);
  const { user } = useAuthStore();

  const [apiKey, setApiKey] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isRegenerating, setIsRegenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [copiedField, setCopiedField] = useState<string | null>(null);

  useEffect(() => {
    if (user?.id) {
      fetchApiKey();
    }
  }, [user?.id]);

  const fetchApiKey = async () => {
    setIsLoading(true);
    setError(null);

    try {
      // Try to fetch existing API key
      const { data, error: fetchError } = await supabase
        .from('lead_api_keys')
        .select('api_key, label')
        .eq('contractor_id', user!.id)
        .eq('is_active', true)
        .maybeSingle();

      if (fetchError) throw fetchError;

      if (data) {
        setApiKey(data.api_key);
      } else {
        // Create a new API key
        await createApiKey();
      }
    } catch (err) {
      console.error('Error fetching API key:', err);
      setError(err instanceof Error ? err.message : 'Failed to load API key');
    } finally {
      setIsLoading(false);
    }
  };

  const createApiKey = async () => {
    try {
      const { data, error: insertError } = await supabase
        .from('lead_api_keys')
        .insert({
          contractor_id: user!.id,
          label: 'Default',
        })
        .select('api_key')
        .single();

      if (insertError) throw insertError;

      setApiKey(data.api_key);
    } catch (err) {
      console.error('Error creating API key:', err);
      setError(err instanceof Error ? err.message : 'Failed to create API key');
    }
  };

  const regenerateApiKey = async () => {
    if (!window.confirm('Regenerate your API key? The old key will stop working immediately.')) return;

    setIsRegenerating(true);
    setError(null);

    try {
      const newKey = crypto.randomUUID();

      const { data, error: updateError } = await supabase
        .from('lead_api_keys')
        .update({ api_key: newKey })
        .eq('contractor_id', user!.id)
        .eq('is_active', true)
        .select('api_key')
        .single();

      if (updateError) throw updateError;

      setApiKey(data.api_key);
    } catch (err) {
      console.error('Error regenerating API key:', err);
      setError(err instanceof Error ? err.message : 'Failed to regenerate API key');
    } finally {
      setIsRegenerating(false);
    }
  };

  const copyToClipboard = async (text: string, field: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopiedField(field);
      setTimeout(() => setCopiedField(null), 2000);
    } catch {
      // Fallback for older browsers
      const textarea = document.createElement('textarea');
      textarea.value = text;
      document.body.appendChild(textarea);
      textarea.select();
      document.execCommand('copy');
      document.body.removeChild(textarea);
      setCopiedField(field);
      setTimeout(() => setCopiedField(null), 2000);
    }
  };

  const embedSnippet = apiKey
    ? `<script src="https://app.contractorai.com/embed/lead-form.js" data-key="${apiKey}"></script>`
    : '';

  const hostedUrl = apiKey
    ? `https://app.contractorai.com/l/${apiKey}`
    : '';

  if (isLoading) {
    return (
      <div className={`p-6 rounded-2xl border ${themeClasses.border.primary} ${themeClasses.bg.card}`}>
        <div className="flex items-center justify-center py-8">
          <Loader2 className="w-6 h-6 text-[#043d6b] animate-spin" />
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Error */}
      {error && (
        <div className={`flex items-center gap-3 p-4 rounded-xl ${theme === 'light' ? 'bg-red-50 border border-red-200' : 'bg-red-900/20 border border-red-800'}`}>
          <AlertCircle className="w-5 h-5 text-red-500 flex-shrink-0" />
          <p className={`text-sm font-medium ${theme === 'light' ? 'text-red-800' : 'text-red-300'}`}>{error}</p>
        </div>
      )}

      {/* API Key Section */}
      <div className={`p-4 rounded-2xl border ${themeClasses.border.primary} ${themeClasses.bg.card}`}>
        <div className="flex items-center gap-3 mb-3">
          <div className="w-10 h-10 bg-[#043d6b]/10 rounded-xl flex items-center justify-center">
            <Key className="w-5 h-5 text-[#043d6b]" />
          </div>
          <div className="flex-1">
            <h3 className={`font-bold ${themeClasses.text.primary}`}>API Key</h3>
            <p className={`text-sm ${themeClasses.text.muted}`}>Use this key to authenticate lead submissions</p>
          </div>
        </div>

        {apiKey && (
          <div className="space-y-2">
            <div className={`flex items-center gap-2 p-3 rounded-xl font-mono text-sm ${theme === 'light' ? 'bg-gray-100 text-gray-800' : 'bg-zinc-800 text-zinc-200'} break-all`}>
              <span className="flex-1">{apiKey}</span>
              <button
                onClick={() => copyToClipboard(apiKey, 'apiKey')}
                className={`flex-shrink-0 p-2 rounded-lg transition-colors ${theme === 'light' ? 'hover:bg-gray-200' : 'hover:bg-zinc-700'}`}
              >
                {copiedField === 'apiKey' ? (
                  <Check className="w-4 h-4 text-green-500" />
                ) : (
                  <Copy className="w-4 h-4 text-[#043d6b]" />
                )}
              </button>
            </div>
            <button
              onClick={regenerateApiKey}
              disabled={isRegenerating}
              className={`flex items-center gap-2 text-sm font-medium ${theme === 'light' ? 'text-gray-600 hover:text-gray-900' : 'text-zinc-400 hover:text-white'} transition-colors`}
            >
              <RefreshCw className={`w-4 h-4 ${isRegenerating ? 'animate-spin' : ''}`} />
              {isRegenerating ? 'Regenerating...' : 'Regenerate Key'}
            </button>
          </div>
        )}
      </div>

      {/* Embed Snippet Section */}
      <div className={`p-4 rounded-2xl border ${themeClasses.border.primary} ${themeClasses.bg.card}`}>
        <div className="flex items-center gap-3 mb-3">
          <div className="w-10 h-10 bg-[#043d6b]/10 rounded-xl flex items-center justify-center">
            <Code className="w-5 h-5 text-[#043d6b]" />
          </div>
          <div className="flex-1">
            <h3 className={`font-bold ${themeClasses.text.primary}`}>Embed Snippet</h3>
            <p className={`text-sm ${themeClasses.text.muted}`}>Add this to your website to capture leads</p>
          </div>
        </div>

        {embedSnippet && (
          <div className="relative">
            <div className={`p-3 rounded-xl font-mono text-xs ${theme === 'light' ? 'bg-gray-100 text-gray-700' : 'bg-zinc-800 text-zinc-300'} break-all leading-relaxed`}>
              {embedSnippet}
            </div>
            <button
              onClick={() => copyToClipboard(embedSnippet, 'embed')}
              className={`mt-2 flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium transition-all ${
                copiedField === 'embed'
                  ? 'bg-green-500 text-white'
                  : 'bg-[#043d6b] text-white hover:bg-[#035291]'
              }`}
            >
              {copiedField === 'embed' ? (
                <>
                  <Check className="w-4 h-4" />
                  Copied!
                </>
              ) : (
                <>
                  <Copy className="w-4 h-4" />
                  Copy Snippet
                </>
              )}
            </button>
          </div>
        )}
      </div>

      {/* Hosted Lead Page Section */}
      <div className={`p-4 rounded-2xl border ${themeClasses.border.primary} ${themeClasses.bg.card}`}>
        <div className="flex items-center gap-3 mb-3">
          <div className="w-10 h-10 bg-[#043d6b]/10 rounded-xl flex items-center justify-center">
            <Globe className="w-5 h-5 text-[#043d6b]" />
          </div>
          <div className="flex-1">
            <h3 className={`font-bold ${themeClasses.text.primary}`}>Hosted Lead Page</h3>
            <p className={`text-sm ${themeClasses.text.muted}`}>Share this URL to collect leads directly</p>
          </div>
        </div>

        {hostedUrl && (
          <div className="space-y-2">
            <div className={`flex items-center gap-2 p-3 rounded-xl text-sm ${theme === 'light' ? 'bg-gray-100 text-[#043d6b]' : 'bg-zinc-800 text-[#5b9bd5]'} break-all`}>
              <span className="flex-1 font-medium">{hostedUrl}</span>
              <button
                onClick={() => copyToClipboard(hostedUrl, 'url')}
                className={`flex-shrink-0 p-2 rounded-lg transition-colors ${theme === 'light' ? 'hover:bg-gray-200' : 'hover:bg-zinc-700'}`}
              >
                {copiedField === 'url' ? (
                  <Check className="w-4 h-4 text-green-500" />
                ) : (
                  <Copy className="w-4 h-4 text-[#043d6b]" />
                )}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default WebsiteLeadSetup;
