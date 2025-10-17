import { useState, useEffect } from 'react';
import { Link as LinkIcon, Copy, Loader2, X, ExternalLink } from 'lucide-react';
import { supabase } from '../../lib/supabase';

interface GeneratePaymentLinkButtonProps {
  invoiceId: string;
  existingLink?: string | null;
  onLinkGenerated?: () => void;
}

export default function GeneratePaymentLinkButton({
  invoiceId,
  existingLink,
  onLinkGenerated
}: GeneratePaymentLinkButtonProps) {
  const [loading, setLoading] = useState(false);
  const [link, setLink] = useState(existingLink);
  const [copied, setCopied] = useState(false);
  const [showModal, setShowModal] = useState(false);

  // Update local link state when existingLink prop changes
  useEffect(() => {
    console.log('🔵 existingLink changed:', existingLink);
    setLink(existingLink);
  }, [existingLink]);

  console.log('🔵 GeneratePaymentLinkButton render - link:', link, 'existingLink:', existingLink);

  const handleGenerateLink = async () => {
    console.log('🔵 Generate Payment Link clicked for invoice:', invoiceId);
    try {
      setLoading(true);
      const { data: { session } } = await supabase.auth.getSession();
      console.log('🔵 Session retrieved:', session ? 'Yes' : 'No');

      if (!session) {
        alert('Please sign in first');
        return;
      }

      console.log('🔵 Calling edge function with invoiceId:', invoiceId);
      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/generate-payment-link`,
        {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${session.access_token}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ invoiceId }),
        }
      );

      console.log('🔵 Response status:', response.status);
      const data = await response.json();
      console.log('🔵 Response data:', data);

      if (data.error) {
        throw new Error(data.error);
      }

      if (data.url) {
        console.log('🔵 Setting link state to:', data.url);
        setLink(data.url);
        setShowModal(true); // Show modal with the link
        console.log('🔵 Link state updated');
        if (onLinkGenerated) {
          console.log('🔵 Calling onLinkGenerated callback');
          onLinkGenerated();
        }
      } else {
        console.log('🔴 No URL in response');
        throw new Error('No payment link returned');
      }
    } catch (error) {
      console.error('Error generating payment link:', error);
      alert('Failed to generate payment link. Please make sure your Stripe account is connected.');
    } finally {
      setLoading(false);
    }
  };

  const handleCopyLink = async () => {
    if (link) {
      try {
        await navigator.clipboard.writeText(link);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
      } catch (error) {
        console.error('Error copying to clipboard:', error);
        alert('Failed to copy link to clipboard');
      }
    }
  };

  return (
    <>
      {/* Button */}
      <button
        onClick={link ? () => setShowModal(true) : handleGenerateLink}
        disabled={loading}
        className={`inline-flex items-center px-3 py-1.5 text-xs font-medium rounded-md text-white focus:outline-none focus:ring-2 focus:ring-offset-2 disabled:opacity-50 ${
          link
            ? 'bg-green-600 hover:bg-green-700 focus:ring-green-500'
            : 'bg-blue-600 hover:bg-blue-700 focus:ring-blue-500'
        }`}
      >
        {loading ? (
          <>
            <Loader2 className="w-3 h-3 mr-1 animate-spin" />
            Generating...
          </>
        ) : link ? (
          <>
            <LinkIcon className="w-3 h-3 mr-1" />
            View Payment Link
          </>
        ) : (
          <>
            <LinkIcon className="w-3 h-3 mr-1" />
            Generate Payment Link
          </>
        )}
      </button>

      {/* Modal */}
      {showModal && link && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-xl max-w-lg w-full">
            {/* Header */}
            <div className="flex items-center justify-between p-4 border-b border-gray-200">
              <h3 className="text-lg font-semibold text-gray-900">Payment Link Ready</h3>
              <button
                onClick={() => setShowModal(false)}
                className="text-gray-400 hover:text-gray-600 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Body */}
            <div className="p-6 space-y-4">
              <p className="text-sm text-gray-600">
                Share this link with your customer to collect payment:
              </p>

              {/* Link Display */}
              <div className="bg-green-50 border-2 border-green-200 rounded-lg p-4 space-y-3">
                <div className="flex items-start gap-3">
                  <LinkIcon className="w-5 h-5 text-green-600 flex-shrink-0 mt-0.5" />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-green-900 break-all">
                      {link}
                    </p>
                  </div>
                </div>

                {/* Action Buttons */}
                <div className="flex flex-col sm:flex-row gap-2">
                  <button
                    onClick={handleCopyLink}
                    className="flex-1 inline-flex items-center justify-center px-4 py-2 bg-green-600 hover:bg-green-700 text-white font-medium rounded-md transition-colors"
                  >
                    <Copy className="w-4 h-4 mr-2" />
                    {copied ? 'Copied!' : 'Copy Link'}
                  </button>
                  <a
                    href={link}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex-1 inline-flex items-center justify-center px-4 py-2 bg-white hover:bg-gray-50 text-green-700 font-medium rounded-md border-2 border-green-600 transition-colors"
                  >
                    <ExternalLink className="w-4 h-4 mr-2" />
                    Open Link
                  </a>
                </div>
              </div>

              {/* Instructions */}
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                <p className="text-xs text-blue-900 font-medium mb-2">How to use:</p>
                <ul className="text-xs text-blue-800 space-y-1">
                  <li>• Copy and send the link to your customer via email or text</li>
                  <li>• Customer clicks the link and enters their payment details</li>
                  <li>• Payment is processed through Stripe securely</li>
                  <li>• Invoice automatically updates when paid</li>
                </ul>
              </div>
            </div>

            {/* Footer */}
            <div className="flex justify-end p-4 border-t border-gray-200">
              <button
                onClick={() => setShowModal(false)}
                className="px-4 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 font-medium rounded-md transition-colors"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
