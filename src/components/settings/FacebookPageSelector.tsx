import React, { useState, useEffect } from 'react';
import { X, Facebook, CheckCircle, AlertCircle, Loader2 } from 'lucide-react';
import { useTheme, getThemeClasses } from '../../contexts/ThemeContext';
import { supabase } from '../../lib/supabase';

interface FacebookPage {
  id: string;
  name: string;
  category: string;
  access_token: string;
}

interface FacebookPageSelectorProps {
  accessToken: string;
  onClose: () => void;
  onConnected: (pageId: string, pageName: string) => void;
}

const FacebookPageSelector: React.FC<FacebookPageSelectorProps> = ({ accessToken, onClose, onConnected }) => {
  const { theme } = useTheme();
  const themeClasses = getThemeClasses(theme);
  const [pages, setPages] = useState<FacebookPage[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isConnecting, setIsConnecting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [selectedPageId, setSelectedPageId] = useState<string | null>(null);

  useEffect(() => {
    fetchPages();
  }, [accessToken]);

  const fetchPages = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const response = await fetch(
        `https://graph.facebook.com/v18.0/me/accounts?access_token=${encodeURIComponent(accessToken)}`
      );
      const data = await response.json();

      if (data.error) {
        throw new Error(data.error.message || 'Failed to fetch Facebook pages');
      }

      if (!data.data || data.data.length === 0) {
        setError('No Facebook pages found. Make sure you have admin access to at least one page.');
        setPages([]);
      } else {
        setPages(data.data.map((page: any) => ({
          id: page.id,
          name: page.name,
          category: page.category || 'Uncategorized',
          access_token: page.access_token,
        })));
      }
    } catch (err) {
      console.error('Error fetching Facebook pages:', err);
      setError(err instanceof Error ? err.message : 'Failed to fetch Facebook pages');
    } finally {
      setIsLoading(false);
    }
  };

  const handleSelectPage = async (page: FacebookPage) => {
    setIsConnecting(true);
    setError(null);
    setSelectedPageId(page.id);

    try {
      const { data, error: fnError } = await supabase.functions.invoke('fb-connect-page', {
        body: {
          pageId: page.id,
          pageName: page.name,
          pageAccessToken: page.access_token,
          userAccessToken: accessToken,
        },
      });

      if (fnError) throw fnError;

      setSuccess(`Connected to "${page.name}" successfully!`);
      setTimeout(() => {
        onConnected(page.id, page.name);
      }, 1500);
    } catch (err) {
      console.error('Error connecting Facebook page:', err);
      setError(err instanceof Error ? err.message : 'Failed to connect page. Please try again.');
      setSelectedPageId(null);
    } finally {
      setIsConnecting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[9999] flex items-end md:items-center justify-center">
      <div className="absolute inset-0 bg-black/50" onClick={onClose} />
      <div className={`relative w-full max-w-lg ${themeClasses.bg.modal || (theme === 'light' ? 'bg-white' : 'bg-zinc-900')} rounded-t-2xl md:rounded-2xl max-h-[80vh] overflow-y-auto mb-0 md:mb-0`} style={{ marginBottom: 'env(safe-area-inset-bottom, 0px)' }}>
        {/* Header */}
        <div className={`sticky top-0 ${theme === 'light' ? 'bg-white' : 'bg-zinc-900'} px-5 pt-5 pb-3 border-b ${themeClasses.border.primary} z-10`}>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-[#1877F2]/10 rounded-xl flex items-center justify-center">
                <Facebook className="w-5 h-5 text-[#1877F2]" />
              </div>
              <div>
                <h2 className={`text-lg font-bold ${themeClasses.text.primary}`}>Select a Page</h2>
                <p className={`text-sm ${themeClasses.text.muted}`}>Choose a Facebook page to connect</p>
              </div>
            </div>
            <button
              onClick={onClose}
              className={`p-2 rounded-lg ${theme === 'light' ? 'hover:bg-gray-100' : 'hover:bg-zinc-800'}`}
            >
              <X className={`w-5 h-5 ${themeClasses.text.muted}`} />
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="p-5 pb-10 space-y-3">
          {/* Success State */}
          {success && (
            <div className={`flex items-center gap-3 p-4 rounded-xl ${theme === 'light' ? 'bg-green-50 border border-green-200' : 'bg-green-900/20 border border-green-800'}`}>
              <CheckCircle className="w-5 h-5 text-green-500 flex-shrink-0" />
              <p className={`text-sm font-medium ${theme === 'light' ? 'text-green-800' : 'text-green-300'}`}>{success}</p>
            </div>
          )}

          {/* Error State */}
          {error && (
            <div className={`flex items-center gap-3 p-4 rounded-xl ${theme === 'light' ? 'bg-red-50 border border-red-200' : 'bg-red-900/20 border border-red-800'}`}>
              <AlertCircle className="w-5 h-5 text-red-500 flex-shrink-0" />
              <p className={`text-sm font-medium ${theme === 'light' ? 'text-red-800' : 'text-red-300'}`}>{error}</p>
            </div>
          )}

          {/* Loading State */}
          {isLoading && (
            <div className="flex items-center justify-center py-12">
              <div className="flex items-center gap-3">
                <Loader2 className="w-5 h-5 text-theme animate-spin" />
                <span className={themeClasses.text.muted}>Loading your pages...</span>
              </div>
            </div>
          )}

          {/* Pages List */}
          {!isLoading && !success && pages.map((page) => (
            <button
              key={page.id}
              onClick={() => handleSelectPage(page)}
              disabled={isConnecting}
              className={`w-full text-left p-4 rounded-xl border transition-all ${
                selectedPageId === page.id
                  ? 'border-theme bg-theme/5'
                  : `${themeClasses.border.primary} ${themeClasses.bg.card} ${themeClasses.hover?.bg || ''}`
              } ${isConnecting && selectedPageId !== page.id ? 'opacity-50' : ''} active:scale-[0.99]`}
            >
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-[#1877F2]/10 rounded-full flex items-center justify-center flex-shrink-0">
                  <Facebook className="w-5 h-5 text-[#1877F2]" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className={`font-semibold ${themeClasses.text.primary} truncate`}>{page.name}</p>
                  <p className={`text-sm ${themeClasses.text.muted}`}>{page.category}</p>
                </div>
                {isConnecting && selectedPageId === page.id && (
                  <Loader2 className="w-5 h-5 text-theme animate-spin flex-shrink-0" />
                )}
              </div>
            </button>
          ))}

          {/* Empty state */}
          {!isLoading && !error && pages.length === 0 && (
            <div className="text-center py-12">
              <Facebook className={`w-12 h-12 mx-auto mb-3 ${themeClasses.text.muted} opacity-30`} />
              <p className={`font-medium ${themeClasses.text.secondary}`}>No pages found</p>
              <p className={`text-sm mt-1 ${themeClasses.text.muted}`}>
                Make sure you have admin access to a Facebook page
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default FacebookPageSelector;
