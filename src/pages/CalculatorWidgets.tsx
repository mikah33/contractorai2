import { useState } from 'react';
import { Code, Copy, Check, ExternalLink, Sparkles } from 'lucide-react';

const CalculatorWidgets = () => {
  const [copiedCode, setCopiedCode] = useState<string | null>(null);

  const baseUrl = window.location.origin;
  const widgetUrl = `${baseUrl}/widget/roofing.html`;

  const embedCodes = {
    iframe: `<iframe
  src="${widgetUrl}"
  width="100%"
  height="900"
  frameborder="0"
  style="border-radius: 12px; border: 2px solid #e5e7eb;">
</iframe>`,

    responsive: `<div style="position: relative; padding-bottom: 120%; height: 0; overflow: hidden; max-width: 100%;">
  <iframe
    src="${widgetUrl}"
    style="position: absolute; top: 0; left: 0; width: 100%; height: 100%; border: none; border-radius: 12px;"
    frameborder="0">
  </iframe>
</div>`,

    button: `<a
  href="${widgetUrl}"
  target="_blank"
  style="display: inline-block; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 15px 30px; border-radius: 8px; text-decoration: none; font-weight: 600; box-shadow: 0 4px 12px rgba(102, 126, 234, 0.3);">
  Calculate Your Roof Cost →
</a>`,

    wordpress: `[iframe src="${widgetUrl}" width="100%" height="900"]`,
  };

  const copyToClipboard = (code: string, type: string) => {
    navigator.clipboard.writeText(code);
    setCopiedCode(type);
    setTimeout(() => setCopiedCode(null), 2000);
  };

  const features = [
    { icon: '🏠', title: 'Address Auto-Detection', desc: 'Automatically detect roof area from any US address using Google Solar API' },
    { icon: '💰', title: 'Materials-Only Pricing', desc: 'Transparent material costs without labor markup' },
    { icon: '📊', title: 'Real-Time Calculations', desc: 'Instant estimates with detailed cost breakdown' },
    { icon: '📱', title: 'Mobile Responsive', desc: 'Perfect experience on all devices and screen sizes' },
    { icon: '🎨', title: 'Customizable', desc: 'Easy to style and match your brand colors' },
    { icon: '⚡', title: 'Lightning Fast', desc: 'No dependencies, pure vanilla JavaScript' },
  ];

  return (
    <div className="max-w-6xl mx-auto">
      {/* Header */}
      <div className="mb-8">
        <div className="flex items-center gap-3 mb-2">
          <Sparkles className="w-8 h-8 text-purple-600" />
          <h1 className="text-3xl font-bold text-gray-900">Calculator Widgets</h1>
        </div>
        <p className="text-gray-600">
          Embed our powerful roofing calculator on your website. Copy and paste the code below to get started.
        </p>
      </div>

      {/* Live Preview */}
      <div className="bg-white rounded-xl shadow-lg p-6 mb-8">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-semibold text-gray-900">Live Preview</h2>
          <a
            href={widgetUrl}
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
            src={widgetUrl}
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
              <code>{embedCodes.iframe}</code>
            </pre>
            <button
              onClick={() => copyToClipboard(embedCodes.iframe, 'iframe')}
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
              <code>{embedCodes.responsive}</code>
            </pre>
            <button
              onClick={() => copyToClipboard(embedCodes.responsive, 'responsive')}
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
              <code>{embedCodes.button}</code>
            </pre>
            <button
              onClick={() => copyToClipboard(embedCodes.button, 'button')}
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
          <div className="mt-4 p-4 bg-gradient-to-r from-purple-50 to-blue-50 rounded-lg">
            <p className="text-sm font-medium text-gray-700 mb-2">Preview:</p>
            <a
              href={widgetUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-block bg-gradient-to-r from-purple-600 to-blue-600 text-white px-6 py-3 rounded-lg font-semibold hover:from-purple-700 hover:to-blue-700 transition-all shadow-lg hover:shadow-xl"
            >
              Calculate Your Roof Cost →
            </a>
          </div>
        </div>

        {/* WordPress */}
        <div className="bg-white rounded-xl shadow-lg p-6">
          <div className="flex items-center gap-2 mb-3">
            <Code className="w-5 h-5 text-purple-600" />
            <h3 className="text-lg font-semibold text-gray-900">WordPress Shortcode</h3>
          </div>
          <p className="text-sm text-gray-600 mb-4">
            For WordPress sites with iframe shortcode support.
          </p>
          <div className="relative">
            <pre className="bg-gray-900 text-gray-100 p-4 rounded-lg overflow-x-auto text-sm">
              <code>{embedCodes.wordpress}</code>
            </pre>
            <button
              onClick={() => copyToClipboard(embedCodes.wordpress, 'wordpress')}
              className="absolute top-3 right-3 bg-gray-800 hover:bg-gray-700 text-white px-3 py-1.5 rounded-md flex items-center gap-2 text-sm transition-colors"
            >
              {copiedCode === 'wordpress' ? (
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
        <h3 className="text-lg font-semibold text-gray-900 mb-3">Need Help?</h3>
        <div className="space-y-2 text-sm text-gray-700">
          <p><strong>Step 1:</strong> Choose an embed method above</p>
          <p><strong>Step 2:</strong> Click "Copy Code" to copy the HTML</p>
          <p><strong>Step 3:</strong> Paste it into your website's HTML</p>
          <p><strong>Step 4:</strong> Customize colors and styles if needed</p>
        </div>
        <div className="mt-4 pt-4 border-t border-purple-200">
          <p className="text-sm text-gray-600">
            <strong>Widget URL:</strong>{' '}
            <code className="bg-white px-2 py-1 rounded text-purple-600">{widgetUrl}</code>
          </p>
        </div>
      </div>
    </div>
  );
};

export default CalculatorWidgets;
