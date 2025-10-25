import { useState, useEffect } from 'react';
import { Code, Copy, Check, ExternalLink, Sparkles, Key, AlertCircle, Loader2, Calculator as CalcIcon } from 'lucide-react';
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

interface CalculatorInfo {
  id: string;
  name: string;
  icon: string;
  description: string;
  filename: string;
}

const CALCULATORS: CalculatorInfo[] = [
  { id: 'roofing', name: 'Roofing Calculator', icon: '🏠', description: 'Calculate roofing materials and costs', filename: 'roofing.html' },
  { id: 'concrete', name: 'Concrete Calculator', icon: '🏗️', description: 'Estimate concrete volume and materials', filename: 'concrete.html' },
  { id: 'deck', name: 'Deck Calculator', icon: '🪵', description: 'Plan and price deck materials', filename: 'deck.html' },
  { id: 'doors-windows', name: 'Doors & Windows', icon: '🚪', description: 'Calculate door and window costs', filename: 'doors-windows.html' },
  { id: 'drywall', name: 'Drywall Calculator', icon: '🔲', description: 'Estimate drywall sheets needed', filename: 'drywall.html' },
  { id: 'electrical', name: 'Electrical Calculator', icon: '⚡', description: 'Plan electrical materials', filename: 'electrical.html' },
  { id: 'excavation', name: 'Excavation Calculator', icon: '🚜', description: 'Calculate excavation volumes', filename: 'excavation.html' },
  { id: 'fencing', name: 'Fencing Calculator', icon: '🚧', description: 'Estimate fencing materials', filename: 'fencing.html' },
  { id: 'flooring', name: 'Flooring Calculator', icon: '📐', description: 'Calculate flooring materials', filename: 'flooring.html' },
  { id: 'foundation', name: 'Foundation Calculator', icon: '🧱', description: 'Estimate foundation materials', filename: 'foundation.html' },
  { id: 'framing', name: 'Framing Calculator', icon: '🔨', description: 'Calculate framing lumber', filename: 'framing.html' },
  { id: 'gutter', name: 'Gutter Calculator', icon: '🌧️', description: 'Estimate gutter materials', filename: 'gutter.html' },
  { id: 'hvac', name: 'HVAC Calculator', icon: '❄️', description: 'Calculate HVAC requirements', filename: 'hvac.html' },
  { id: 'junk-removal', name: 'Junk Removal', icon: '🗑️', description: 'Estimate junk removal costs', filename: 'junk-removal.html' },
  { id: 'paint', name: 'Paint Calculator', icon: '🎨', description: 'Calculate paint quantities', filename: 'paint.html' },
  { id: 'pavers', name: 'Pavers Calculator', icon: '🧱', description: 'Estimate paver materials', filename: 'pavers.html' },
  { id: 'plumbing', name: 'Plumbing Calculator', icon: '🚰', description: 'Calculate plumbing materials', filename: 'plumbing.html' },
  { id: 'retaining-walls', name: 'Retaining Walls', icon: '🏔️', description: 'Estimate retaining wall costs', filename: 'retaining-walls.html' },
  { id: 'siding', name: 'Siding Calculator', icon: '🏡', description: 'Calculate siding materials', filename: 'siding.html' },
  { id: 'tile', name: 'Tile Calculator', icon: '⬛', description: 'Estimate tile quantities', filename: 'tile.html' },
];

const CalculatorWidgets = () => {
  const [copiedCode, setCopiedCode] = useState<string | null>(null);
  const [widgetKeys, setWidgetKeys] = useState<WidgetKey[]>([]);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedCalculator, setSelectedCalculator] = useState<string | null>(null);
  const { user } = useAuthStore();

  const baseUrl = window.location.origin;

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
            calculatorType: 'all', // ONE KEY FOR ALL CALCULATORS
          }),
        }
      );

      const result = await response.json();

      if (!result.success) {
        throw new Error(result.error || 'Failed to generate widget key');
      }

      await loadWidgetKeys();
    } catch (err: any) {
      console.error('Error generating widget key:', err);
      setError(err.message);
    } finally {
      setGenerating(false);
    }
  };

  const getEmbedCode = (widgetKey: string, calculator: CalculatorInfo, type: 'iframe' | 'responsive' | 'button') => {
    const widgetUrl = `${baseUrl}/widget/${calculator.filename}?key=${widgetKey}`;

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
  Calculate Your ${calculator.name} →
</a>`;
    }

    return '';
  };

  const copyToClipboard = (code: string, type: string) => {
    navigator.clipboard.writeText(code);
    setCopiedCode(type);
    setTimeout(() => setCopiedCode(null), 2000);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="w-8 h-8 animate-spin text-purple-600" />
      </div>
    );
  }

  const activeKey = widgetKeys.find(k => k.is_active && k.calculator_type === 'all');

  return (
    <div className="max-w-7xl mx-auto">
      {/* Header */}
      <div className="mb-8">
        <div className="flex items-center gap-3 mb-2">
          <Sparkles className="w-8 h-8 text-purple-600" />
          <h1 className="text-3xl font-bold text-gray-900">Calculator Widgets Hub</h1>
        </div>
        <p className="text-gray-600">
          Embed any of our 20 powerful calculators on your website. One widget key works for all calculators.
        </p>
      </div>

      {/* Widget Key Generation */}
      <div className="bg-gradient-to-r from-purple-50 to-blue-50 rounded-xl p-6 mb-8">
        <div className="flex items-start gap-4">
          <Key className="w-6 h-6 text-purple-600 mt-1" />
          <div className="flex-1">
            <h3 className="text-lg font-semibold text-gray-900 mb-2">Your Universal Widget Key</h3>
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
                  Works with ALL 20 calculators
                </p>
              </div>
            ) : (
              <div>
                <p className="text-sm text-gray-600 mb-4">
                  Generate one widget key that works with all 20 calculators below.
                  <strong className="text-purple-600"> The widgets will only work while your subscription is active.</strong>
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
                      Generate Universal Widget Key
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
                You need to generate a universal widget key above to access all 20 calculator widgets.
              </p>
            </div>
          </div>
        </div>
      )}

      {activeKey && (
        <>
          <h2 className="text-2xl font-bold text-gray-900 mb-6">Available Calculators ({CALCULATORS.length})</h2>

          {/* Calculator Cards Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
            {CALCULATORS.map((calc) => (
              <div
                key={calc.id}
                className="bg-white rounded-xl shadow-lg overflow-hidden hover:shadow-xl transition-shadow cursor-pointer"
                onClick={() => setSelectedCalculator(calc.id)}
              >
                <div className="p-6">
                  <div className="flex items-center gap-3 mb-3">
                    <div className="text-4xl">{calc.icon}</div>
                    <div>
                      <h3 className="font-semibold text-gray-900">{calc.name}</h3>
                      <p className="text-xs text-gray-500">{calc.description}</p>
                    </div>
                  </div>

                  <a
                    href={`${baseUrl}/widget/${calc.filename}?key=${activeKey.widget_key}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center justify-center gap-2 bg-purple-600 hover:bg-purple-700 text-white px-4 py-2 rounded-lg font-medium transition-colors text-sm"
                    onClick={(e) => e.stopPropagation()}
                  >
                    <ExternalLink className="w-4 h-4" />
                    Preview Widget
                  </a>

                  <button
                    className="w-full mt-2 flex items-center justify-center gap-2 bg-gray-100 hover:bg-gray-200 text-gray-700 px-4 py-2 rounded-lg font-medium transition-colors text-sm"
                    onClick={(e) => {
                      e.stopPropagation();
                      setSelectedCalculator(calc.id);
                    }}
                  >
                    <Code className="w-4 h-4" />
                    Get Embed Code
                  </button>
                </div>
              </div>
            ))}
          </div>

          {/* Embed Code Modal/Section for Selected Calculator */}
          {selectedCalculator && (
            <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
              <div className="bg-white rounded-xl max-w-4xl w-full max-h-[90vh] overflow-y-auto">
                <div className="sticky top-0 bg-white border-b border-gray-200 p-6 flex items-center justify-between">
                  <h3 className="text-2xl font-bold text-gray-900">
                    {CALCULATORS.find(c => c.id === selectedCalculator)?.name} - Embed Codes
                  </h3>
                  <button
                    onClick={() => setSelectedCalculator(null)}
                    className="text-gray-400 hover:text-gray-600"
                  >
                    ✕
                  </button>
                </div>

                <div className="p-6 space-y-6">
                  {['iframe', 'responsive', 'button'].map((embedType) => {
                    const calc = CALCULATORS.find(c => c.id === selectedCalculator)!;
                    const code = getEmbedCode(activeKey.widget_key, calc, embedType as any);
                    const typeKey = `${selectedCalculator}-${embedType}`;

                    return (
                      <div key={embedType} className="bg-gray-50 rounded-lg p-4">
                        <h4 className="font-semibold text-gray-900 mb-2 capitalize">
                          {embedType === 'iframe' ? 'Basic Embed (iframe)' : embedType === 'responsive' ? 'Responsive Embed' : 'Button Link'}
                        </h4>
                        <div className="relative">
                          <pre className="bg-gray-900 text-gray-100 p-4 rounded-lg overflow-x-auto text-sm">
                            <code>{code}</code>
                          </pre>
                          <button
                            onClick={() => copyToClipboard(code, typeKey)}
                            className="absolute top-3 right-3 bg-gray-800 hover:bg-gray-700 text-white px-3 py-1.5 rounded-md flex items-center gap-2 text-sm"
                          >
                            {copiedCode === typeKey ? (
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
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
};

export default CalculatorWidgets;
