import { useState, useEffect } from 'react';
import { Code, Copy, Check, ExternalLink, Sparkles, Key, AlertCircle, Loader2 } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { useAuthStore } from '../stores/authStore';

interface WidgetKey {
  id: string;
  widget_key: string;
  calculator_type: string;
  domain: string | null;
  is_active: boolean;
  created_at: string;
  usage_count: number;
}

const CalculatorWidgets = () => {
  const [copiedCode, setCopiedCode] = useState<string | null>(null);
  const [widgetKeys, setWidgetKeys] = useState<WidgetKey[]>([]);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { user } = useAuthStore();

  const baseUrl = window.location.origin;

  // Load existing widget keys
  useEffect(() => {
    loadWidgetKeys();
  }, []);

  const loadWidgetKeys = async () => {
    try {
      const { data, error } = await supabase
        .from('widget_keys')
        .select('*')
        .eq('contractor_id', user?.id)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setWidgetKeys(data || []);
    } catch (err: any) {
      console.error('Error loading widget keys:', err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const generateWidgetKey = async () => {
    setGenerating(true);
    setError(null);

    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) throw new Error('Not authenticated');

      const response = await fetch(
        'https://ujhgwcurllkkeouzwvgk.supabase.co/functions/v1/widget-key-generate',
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${session.access_token}`,
          },
          body: JSON.stringify({
            calculatorType: 'roofing',
          }),
        }
      );

      const result = await response.json();

      console.log('Widget key generation response:', result);
      console.log('Response status:', response.status);

      if (!result.success) {
        throw new Error(result.error || 'Failed to generate widget key');
      }

      // Reload widget keys
      await loadWidgetKeys();
    } catch (err: any) {
      console.error('Error generating widget key:', err);
      console.error('Full error object:', err);
      setError(err.message);
    } finally {
      setGenerating(false);
    }
  };

  const getEmbedCode = (widgetKey: string, type: 'iframe' | 'responsive' | 'button') => {
    const widgetUrl = `${baseUrl}/widget/roofing.html?key=${widgetKey}`;

    if (type === 'iframe') {
      return `<iframe
  src="${widgetUrl}"
  width="100%"
  height="900"
  frameborder="0"
  style="border-radius: 12px; border: 2px solid #e5e7eb;">
</iframe>`;
    }

    if (type === 'responsive') {
      return `<div style="position: relative; padding-bottom: 120%; height: 0; overflow: hidden; max-width: 100%;">
  <iframe
    src="${widgetUrl}"
    style="position: absolute; top: 0; left: 0; width: 100%; height: 100%; border: none; border-radius: 12px;"
    frameborder="0">
  </iframe>
</div>`;
    }

    if (type === 'button') {
      return `<a
  href="${widgetUrl}"
  target="_blank"
  style="display: inline-block; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 15px 30px; border-radius: 8px; text-decoration: none; font-weight: 600; box-shadow: 0 4px 12px rgba(102, 126, 234, 0.3);">
  Calculate Your Roof Cost →
</a>`;
    }

    return '';
  };

  const copyToClipboard = (code: string, type: string) => {
    navigator.clipboard.writeText(code);
    setCopiedCode(type);
    setTimeout(() => setCopiedCode(null), 2000);
  };

  const features = [
    { icon: '🔒', title: 'Subscription Protected', desc: 'Widget stops working if subscription expires' },
    { icon: '🏠', title: 'Address Auto-Detection', desc: 'Automatically detect roof area from any US address' },
    { icon: '💰', title: 'Materials-Only Pricing', desc: 'Transparent material costs without labor markup' },
    { icon: '📊', title: 'Real-Time Calculations', desc: 'Instant estimates with detailed cost breakdown' },
    { icon: '📱', title: 'Mobile Responsive', desc: 'Perfect experience on all devices' },
    { icon: '⚡', title: 'Lightning Fast', desc: 'No dependencies, pure vanilla JavaScript' },
  ];

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="w-8 h-8 animate-spin text-purple-600" />
      </div>
    );
  }

  const activeKey = widgetKeys.find(k => k.is_active);

  return (
    <div className="max-w-6xl mx-auto">
      {/* Header */}
      <div className="mb-8">
        <div className="flex items-center gap-3 mb-2">
          <Sparkles className="w-8 h-8 text-purple-600" />
          <h1 className="text-3xl font-bold text-gray-900">Calculator Widgets</h1>
        </div>
        <p className="text-gray-600">
          Embed our powerful roofing calculator on your website. Generate a widget key to get started.
        </p>
      </div>

      {/* Widget Key Generation */}
      <div className="bg-gradient-to-r from-purple-50 to-blue-50 rounded-xl p-6 mb-8">
        <div className="flex items-start gap-4">
          <Key className="w-6 h-6 text-purple-600 mt-1" />
          <div className="flex-1">
            <h3 className="text-lg font-semibold text-gray-900 mb-2">Your Widget Key</h3>
            {activeKey ? (
              <div className="bg-white rounded-lg p-4">
                <div className="flex items-center justify-between mb-2">
                  <code className="text-sm text-purple-600 font-mono">{activeKey.widget_key}</code>
                  <button
                    onClick={() => copyToClipboard(activeKey.widget_key, 'widget-key')}
                    className="text-sm text-purple-600 hover:text-purple-700 flex items-center gap-1"
                  >
                    {copiedCode === 'widget-key' ? (
                      <>
                        <Check className="w-4 h-4" />
                        Copied!
                      </>
                    ) : (
                      <>
                        <Copy className="w-4 h-4" />
                        Copy
                      </>
                    )}
                  </button>
                </div>
                <p className="text-xs text-gray-500">
                  Created: {new Date(activeKey.created_at).toLocaleDateString()} •
                  Usage: {activeKey.usage_count} times
                </p>
              </div>
            ) : (
              <div>
                <p className="text-sm text-gray-600 mb-4">
                  Generate a unique widget key to embed the calculator on your website.
                  <strong className="text-purple-600"> The widget will only work while your subscription is active.</strong>
                </p>
                <button
                  onClick={generateWidgetKey}
                  disabled={generating}
                  className="bg-purple-600 hover:bg-purple-700 text-white px-6 py-2 rounded-lg font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                >
                  {generating ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      Generating...
                    </>
                  ) : (
                    <>
                      <Key className="w-4 h-4" />
                      Generate Widget Key
                    </>
                  )}
                </button>
              </div>
            )}
            {error && (
              <div className="mt-4 bg-red-50 border border-red-200 rounded-lg p-3 flex items-start gap-2">
                <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
                <p className="text-sm text-red-600">{error}</p>
              </div>
            )}
          </div>
        </div>
      </div>

      {!activeKey && (
        <div className="bg-yellow-50 border border-yellow-200 rounded-xl p-6 mb-8">
          <div className="flex items-start gap-3">
            <AlertCircle className="w-6 h-6 text-yellow-600 flex-shrink-0" />
            <div>
              <h3 className="font-semibold text-yellow-900 mb-1">Generate a Widget Key First</h3>
              <p className="text-sm text-yellow-700">
                You need to generate a widget key above to see the embed codes and live preview.
              </p>
            </div>
          </div>
        </div>
      )}

      {activeKey && (
        <>
          {/* Live Preview */}
          <div className="bg-white rounded-xl shadow-lg p-6 mb-8">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-semibold text-gray-900">Live Preview</h2>
              <a
                href={`${baseUrl}/widget/roofing.html?key=${activeKey.widget_key}`}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-2 text-purple-600 hover:text-purple-700 font-medium"
              >
                <ExternalLink className="w-4 h-4" />
                Open Full Widget
              </a>
            </div>
            <div className="bg-gray-50 rounded-lg p-4">
              <iframe
                src={`${baseUrl}/widget/roofing.html?key=${activeKey.widget_key}`}
                className="w-full rounded-lg border-2 border-gray-200"
                style={{ height: '800px' }}
                frameBorder="0"
              />
            </div>
          </div>

          {/* Features Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mb-8">
            {features.map((feature, idx) => (
              <div key={idx} className="bg-white rounded-lg shadow p-4">
                <div className="text-3xl mb-2">{feature.icon}</div>
                <h3 className="font-semibold text-gray-900 mb-1">{feature.title}</h3>
                <p className="text-sm text-gray-600">{feature.desc}</p>
              </div>
            ))}
          </div>

          {/* Embed Codes */}
          <div className="space-y-6">
            {/* Basic Iframe */}
            <div className="bg-white rounded-xl shadow-lg p-6">
              <div className="flex items-center gap-2 mb-3">
                <Code className="w-5 h-5 text-purple-600" />
                <h3 className="text-lg font-semibold text-gray-900">Basic Embed (iframe)</h3>
              </div>
              <p className="text-sm text-gray-600 mb-4">
                The simplest way to embed the calculator. Works on any website.
              </p>
              <div className="relative">
                <pre className="bg-gray-900 text-gray-100 p-4 rounded-lg overflow-x-auto text-sm">
                  <code>{getEmbedCode(activeKey.widget_key, 'iframe')}</code>
                </pre>
                <button
                  onClick={() => copyToClipboard(getEmbedCode(activeKey.widget_key, 'iframe'), 'iframe')}
                  className="absolute top-3 right-3 bg-gray-800 hover:bg-gray-700 text-white px-3 py-1.5 rounded-md flex items-center gap-2 text-sm transition-colors"
                >
                  {copiedCode === 'iframe' ? (
                    <>
                      <Check className="w-4 h-4" />
                      Copied!
                    </>
                  ) : (
                    <>
                      <Copy className="w-4 h-4" />
                      Copy Code
                    </>
                  )}
                </button>
              </div>
            </div>

            {/* Responsive Embed */}
            <div className="bg-white rounded-xl shadow-lg p-6">
              <div className="flex items-center gap-2 mb-3">
                <Code className="w-5 h-5 text-purple-600" />
                <h3 className="text-lg font-semibold text-gray-900">Responsive Embed</h3>
              </div>
              <p className="text-sm text-gray-600 mb-4">
                Maintains aspect ratio and scales perfectly on all devices.
              </p>
              <div className="relative">
                <pre className="bg-gray-900 text-gray-100 p-4 rounded-lg overflow-x-auto text-sm">
                  <code>{getEmbedCode(activeKey.widget_key, 'responsive')}</code>
                </pre>
                <button
                  onClick={() => copyToClipboard(getEmbedCode(activeKey.widget_key, 'responsive'), 'responsive')}
                  className="absolute top-3 right-3 bg-gray-800 hover:bg-gray-700 text-white px-3 py-1.5 rounded-md flex items-center gap-2 text-sm transition-colors"
                >
                  {copiedCode === 'responsive' ? (
                    <>
                      <Check className="w-4 h-4" />
                      Copied!
                    </>
                  ) : (
                    <>
                      <Copy className="w-4 h-4" />
                      Copy Code
                    </>
                  )}
                </button>
              </div>
            </div>

            {/* Button Link */}
            <div className="bg-white rounded-xl shadow-lg p-6">
              <div className="flex items-center gap-2 mb-3">
                <Code className="w-5 h-5 text-purple-600" />
                <h3 className="text-lg font-semibold text-gray-900">Button Link</h3>
              </div>
              <p className="text-sm text-gray-600 mb-4">
                Opens the calculator in a new tab with a beautiful call-to-action button.
              </p>
              <div className="relative">
                <pre className="bg-gray-900 text-gray-100 p-4 rounded-lg overflow-x-auto text-sm">
                  <code>{getEmbedCode(activeKey.widget_key, 'button')}</code>
                </pre>
                <button
                  onClick={() => copyToClipboard(getEmbedCode(activeKey.widget_key, 'button'), 'button')}
                  className="absolute top-3 right-3 bg-gray-800 hover:bg-gray-700 text-white px-3 py-1.5 rounded-md flex items-center gap-2 text-sm transition-colors"
                >
                  {copiedCode === 'button' ? (
                    <>
                      <Check className="w-4 h-4" />
                      Copied!
                    </>
                  ) : (
                    <>
                      <Copy className="w-4 h-4" />
                      Copy Code
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>

          {/* Help Section */}
          <div className="mt-8 bg-gradient-to-r from-purple-50 to-blue-50 rounded-xl p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-3">How It Works</h3>
            <div className="space-y-2 text-sm text-gray-700">
              <p><strong>Step 1:</strong> Generate your widget key above (done! ✓)</p>
              <p><strong>Step 2:</strong> Choose an embed method and copy the code</p>
              <p><strong>Step 3:</strong> Paste it into your website's HTML</p>
              <p><strong>Step 4:</strong> The widget will work as long as your subscription is active</p>
            </div>
            <div className="mt-4 pt-4 border-t border-purple-200">
              <p className="text-sm text-red-600 font-medium">
                ⚠️ Important: The widget will stop working immediately if your subscription expires or is cancelled.
              </p>
            </div>
          </div>
        </>
      )}
    </div>
  );
};

export default CalculatorWidgets;
