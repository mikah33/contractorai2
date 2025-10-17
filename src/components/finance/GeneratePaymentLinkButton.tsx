import { useState } from 'react';
import { Link as LinkIcon, Copy, Check, Loader2, ExternalLink } from 'lucide-react';
import { supabase } from '../../lib/supabase';

interface GeneratePaymentLinkButtonProps {
  invoiceId: string;
  existingLink?: string;
  onLinkGenerated?: (link: string) => void;
}

export default function GeneratePaymentLinkButton({
  invoiceId,
  existingLink,
  onLinkGenerated,
}: GeneratePaymentLinkButtonProps) {
  const [loading, setLoading] = useState(false);
  const [paymentLink, setPaymentLink] = useState(existingLink || '');
  const [copied, setCopied] = useState(false);

  const handleGenerateLink = async () => {
    try {
      setLoading(true);
      const { data: { session } } = await supabase.auth.getSession();

      if (!session) {
        alert('Please sign in first');
        return;
      }

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

      const data = await response.json();

      if (data.error) {
        alert(data.error);
        return;
      }

      setPaymentLink(data.url);
      onLinkGenerated?.(data.url);

    } catch (error: any) {
      console.error('Error generating payment link:', error);
      alert('Failed to generate payment link. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(paymentLink);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (error) {
      console.error('Failed to copy:', error);
    }
  };

  const handleOpen = () => {
    window.open(paymentLink, '_blank');
  };

  if (paymentLink) {
    return (
      <div className="space-y-3">
        <div className="flex items-center justify-between p-3 bg-green-50 border border-green-200 rounded-lg">
          <div className="flex items-center min-w-0 flex-1">
            <LinkIcon className="h-5 w-5 text-green-600 flex-shrink-0" />
            <div className="ml-3 min-w-0 flex-1">
              <p className="text-sm font-medium text-green-900">Payment Link Ready</p>
              <p className="text-xs text-green-700 truncate">{paymentLink}</p>
            </div>
          </div>
        </div>

        <div className="flex space-x-2">
          <button
            onClick={handleCopy}
            className="flex-1 inline-flex items-center justify-center px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
          >
            {copied ? (
              <>
                <Check className="w-4 h-4 mr-2 text-green-600" />
                Copied!
              </>
            ) : (
              <>
                <Copy className="w-4 h-4 mr-2" />
                Copy Link
              </>
            )}
          </button>

          <button
            onClick={handleOpen}
            className="flex-1 inline-flex items-center justify-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
          >
            <ExternalLink className="w-4 h-4 mr-2" />
            Open Link
          </button>
        </div>

        <div className="p-3 bg-blue-50 rounded-md">
          <p className="text-xs text-blue-700">
            💡 <strong>Share this link</strong> with your customer via email, text, or any messaging app. They can pay instantly using their credit card.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <button
        onClick={handleGenerateLink}
        disabled={loading}
        className="w-full inline-flex items-center justify-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
      >
        {loading ? (
          <>
            <Loader2 className="w-4 h-4 mr-2 animate-spin" />
            Generating Link...
          </>
        ) : (
          <>
            <LinkIcon className="w-4 h-4 mr-2" />
            Generate Payment Link
          </>
        )}
      </button>

      <div className="p-3 bg-gray-50 rounded-md">
        <h4 className="text-xs font-medium text-gray-900 mb-1">What is a payment link?</h4>
        <p className="text-xs text-gray-600">
          A payment link is a secure URL hosted by Stripe where your customers can pay invoices with their credit card. Simply generate the link and share it via email, text, or any messaging app.
        </p>
      </div>
    </div>
  );
}
