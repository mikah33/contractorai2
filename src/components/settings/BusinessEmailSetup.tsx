import { useState, useEffect } from 'react';
import { Mail, CheckCircle, XCircle, AlertCircle, Loader2, Building2, Send, RefreshCw } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { useAuthStore } from '../../stores/authStore';

interface UserMailbox {
  id: string;
  mailbox_email: string;
  forward_to: string;
  company_name: string;
  created_at: string;
}

export const BusinessEmailSetup: React.FC = () => {
  const { user } = useAuthStore();
  const [mailbox, setMailbox] = useState<UserMailbox | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isCreating, setIsCreating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [companyName, setCompanyName] = useState('');
  const [showSetup, setShowSetup] = useState(false);

  useEffect(() => {
    if (user) {
      checkMailbox();
    }
  }, [user]);

  const checkMailbox = async () => {
    try {
      setIsLoading(true);
      setError(null);

      const { data, error: fetchError } = await supabase
        .from('user_mailboxes')
        .select('*')
        .eq('user_id', user?.id)
        .single();

      if (fetchError && fetchError.code !== 'PGRST116') {
        throw fetchError;
      }

      if (data) {
        setMailbox(data);
      }
    } catch (err: any) {
      console.error('Error checking mailbox:', err);
    } finally {
      setIsLoading(false);
    }
  };

  const handleCreateMailbox = async () => {
    if (!companyName.trim() || !user) return;

    setIsCreating(true);
    setError(null);

    try {
      const { data, error: createError } = await supabase.functions.invoke('create-user-mailbox', {
        body: {
          companyName: companyName.trim(),
          userEmail: user.email,
          userId: user.id
        }
      });

      if (createError) {
        throw new Error(createError.message || 'Failed to create mailbox');
      }

      if (data?.error) {
        throw new Error(data.error);
      }

      // Refresh mailbox data
      await checkMailbox();
      setShowSetup(false);
      setCompanyName('');
    } catch (err: any) {
      console.error('Error creating mailbox:', err);
      setError(err.message || 'Failed to create business email');
    } finally {
      setIsCreating(false);
    }
  };

  const handleSendTestEmail = async () => {
    if (!mailbox || !user) return;

    setError(null);

    try {
      const { data, error: sendError } = await supabase.functions.invoke('send-email', {
        body: {
          userId: user.id,
          to: user.email,
          subject: 'Test Email from ContractorAI',
          body: `This is a test email from your business email: ${mailbox.mailbox_email}\n\nIf you received this email, your business email is set up correctly!`
        }
      });

      console.log('Send email response:', { data, sendError });

      if (sendError) {
        // Check if there's a more detailed error in the response
        const errorMsg = sendError.message ||
          (sendError.context?.body ? JSON.parse(sendError.context.body)?.error : null) ||
          'Failed to send test email';
        throw new Error(errorMsg);
      }

      if (data?.error) {
        throw new Error(data.error);
      }

      alert('Test email sent! Check your inbox at ' + user.email);
    } catch (err: any) {
      console.error('Error sending test email:', err);
      const errorMessage = err.message || 'Failed to send test email. Please try again.';
      setError(errorMessage);
      alert(errorMessage);
    }
  };

  if (isLoading) {
    return (
      <div className="bg-[#1C1C1E] rounded-lg border border-orange-500/30 p-6">
        <div className="flex items-center justify-center">
          <Loader2 className="w-8 h-8 text-orange-500 animate-spin" />
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Header Card */}
      <div className="bg-[#1C1C1E] rounded-lg border border-orange-500/30 p-4">
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 bg-orange-500/20 rounded-lg flex items-center justify-center">
              <Mail className="w-6 h-6 text-orange-500" />
            </div>
            <div>
              <h3 className="text-lg font-semibold text-white">Business Email</h3>
              <p className="text-sm text-zinc-400">
                Send professional emails from your business address
              </p>
            </div>
          </div>
          {mailbox && (
            <button
              onClick={checkMailbox}
              className="p-2 text-zinc-400 hover:text-white transition-colors"
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

      {mailbox ? (
        /* Connected State */
        <div className="space-y-4">
          <div className="p-4 bg-green-500/10 border border-green-500/30 rounded-lg">
            <div className="flex items-center gap-2 mb-3">
              <CheckCircle className="w-5 h-5 text-green-500" />
              <span className="font-medium text-green-400">Email Connected</span>
            </div>

            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <Building2 className="w-4 h-4 text-zinc-500" />
                <span className="text-sm text-zinc-300">{mailbox.company_name}</span>
              </div>
              <div className="flex items-center gap-2">
                <Mail className="w-4 h-4 text-zinc-500" />
                <span className="text-sm text-white font-medium">{mailbox.mailbox_email}</span>
              </div>
              <p className="text-xs text-zinc-500 mt-2">
                Replies will be forwarded to: {mailbox.forward_to}
              </p>
            </div>
          </div>

          <button
            onClick={handleSendTestEmail}
            className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-orange-500/20 text-orange-500 rounded-lg font-medium hover:bg-orange-500/30 transition-colors"
          >
            <Send className="w-5 h-5" />
            Send Test Email
          </button>

          <div className="text-xs text-zinc-500 text-center">
            Emails you send will appear from {mailbox.mailbox_email}
          </div>
        </div>
      ) : showSetup ? (
        /* Setup Form */
        <div className="space-y-4">
          <div className="bg-[#1C1C1E] rounded-lg border border-orange-500/30 p-4 space-y-4">
            <div>
              <label className="block text-sm font-medium text-zinc-300 mb-2">
                Your Business Name
              </label>
              <input
                type="text"
                value={companyName}
                onChange={(e) => setCompanyName(e.target.value)}
                placeholder="e.g., Smith Plumbing"
                className="w-full px-4 py-3 bg-[#2C2C2E] border border-[#3A3A3C] rounded-lg text-white placeholder-zinc-500 focus:border-orange-500 focus:outline-none"
                maxLength={30}
              />
              <p className="text-xs text-zinc-500 mt-2">
                Your email will be: <span className="text-orange-500">{companyName ? `${companyName.toLowerCase().replace(/[^a-z0-9]/g, '-').replace(/-+/g, '-').replace(/^-|-$/g, '')}@contractorai.work` : 'yourcompany@contractorai.work'}</span>
              </p>
            </div>

            <div className="flex gap-3">
              <button
                onClick={() => {
                  setShowSetup(false);
                  setCompanyName('');
                  setError(null);
                }}
                className="flex-1 px-4 py-3 bg-[#2C2C2E] text-zinc-300 rounded-lg font-medium"
              >
                Cancel
              </button>
              <button
                onClick={handleCreateMailbox}
                disabled={isCreating || !companyName.trim()}
                className="flex-1 flex items-center justify-center gap-2 px-4 py-3 bg-orange-500 text-white rounded-lg font-semibold disabled:opacity-50"
              >
                {isCreating ? (
                  <>
                    <Loader2 className="w-5 h-5 animate-spin" />
                    Creating...
                  </>
                ) : (
                  'Create Email'
                )}
              </button>
            </div>
          </div>
        </div>
      ) : (
        /* Not Connected State */
        <div className="space-y-4">
          <div className="p-4 bg-[#2C2C2E] border border-[#3A3A3C] rounded-lg">
            <div className="flex items-center gap-2 mb-3">
              <XCircle className="w-5 h-5 text-zinc-500" />
              <span className="font-medium text-zinc-300">No Business Email</span>
            </div>
            <p className="text-sm text-zinc-400">
              Set up a professional business email to send estimates, invoices, and messages to your clients.
            </p>

            <ul className="mt-4 space-y-2">
              {[
                'Professional @contractorai.work email',
                'Replies forward to your personal email',
                'No inbox to manage - just send & receive',
                'Works with estimates and notifications'
              ].map((item, i) => (
                <li key={i} className="flex items-center gap-2 text-sm text-zinc-400">
                  <CheckCircle className="w-4 h-4 text-orange-500 flex-shrink-0" />
                  {item}
                </li>
              ))}
            </ul>
          </div>

          <button
            onClick={() => setShowSetup(true)}
            className="w-full flex items-center justify-center gap-2 px-4 py-4 bg-orange-500 text-white rounded-lg font-semibold"
          >
            <Mail className="w-5 h-5" />
            Set Up Business Email
          </button>
        </div>
      )}
    </div>
  );
};

export default BusinessEmailSetup;
