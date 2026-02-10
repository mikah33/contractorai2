import { useState, useEffect } from 'react';
import { X, Mail, User, FileText, Loader2, CheckCircle, Bell, ExternalLink, AlertCircle } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { uploadPdfToStorage } from '../../services/supabaseStorage';
import { useData } from '../../contexts/DataContext';
import { useTheme, getThemeClasses } from '../../contexts/ThemeContext';
import html2canvas from 'html2canvas';
import jsPDF from 'jspdf';

interface Client {
  id: string;
  name: string;
  email: string;
  phone?: string;
  address?: string;
  gmail_email?: string;
  email_sending_enabled?: boolean;
  email_auth_method?: string;
  gmail_access_token?: string;
  gmail_refresh_token?: string;
  gmail_token_expiry?: string;
}

interface SendEstimateModalProps {
  isOpen: boolean;
  onClose: () => void;
  estimate: any; // Your estimate data type
  companyInfo: {
    name: string;
    email: string;
    phone: string;
    address?: string;
  };
  activeTab?: 'editor' | 'preview';
  setActiveTab?: (tab: 'editor' | 'preview') => void;
}

interface EstimateEmailResponseInsert {
  customer_name: string;
  customer_email: string;
  email_subject: string;
  email_body: string;
  pdf_url: string;
  estimate_id: string;
  client_id: string | null;
}

// Use Edge Function instead of direct webhook call to avoid CORS issues
const EDGE_FUNCTION_URL = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/send-estimate-email`;

const SendEstimateModal: React.FC<SendEstimateModalProps> = ({
  isOpen,
  onClose,
  estimate,
  companyInfo,
  activeTab,
  setActiveTab
}) => {
  const { profile } = useData();
  const { theme } = useTheme();
  const themeClasses = getThemeClasses(theme);
  const [clients, setClients] = useState<Client[]>([]);
  const [selectedClient, setSelectedClient] = useState<Client | null>(null);
  const [newClientName, setNewClientName] = useState('');
  const [newClientEmail, setNewClientEmail] = useState('');
  const [newClientPhone, setNewClientPhone] = useState('');
  const [newClientAddress, setNewClientAddress] = useState('');
  const [showAddClient, setShowAddClient] = useState(false);
  const [contractorEmail, setContractorEmail] = useState('');
  const [emailSubject, setEmailSubject] = useState('');
  const [emailBody, setEmailBody] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [successMessage, setSuccessMessage] = useState('');
  const [pdfUrl, setPdfUrl] = useState('');
  const [isConnectingGmail, setIsConnectingGmail] = useState(false);
  const [gmailError, setGmailError] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen) {
      fetchClients();
      resetForm();
      // Pre-fill contractor email from profile
      setContractorEmail(profile?.contractor_notification_email || '');
    }
  }, [isOpen, profile]);

  useEffect(() => {
    if (isOpen) {
      // Get customer name
      const customerName = showAddClient ? newClientName || 'Customer' : selectedClient?.name || 'Customer';

      // Get company name - use email as fallback if name is empty
      const companyName = companyInfo.name && companyInfo.name !== 'Your Company'
        ? companyInfo.name
        : companyInfo.email.split('@')[0] || 'Your Company';

      // Set default email subject and body with actual company name
      setEmailSubject(`Estimate #${estimate?.estimateNumber || 'NEW'} from ${companyName}`);
      setEmailBody(`Dear ${customerName},\n\nPlease find attached your estimate for the proposed work.\n\nEstimate Details:\n- Estimate #: ${estimate?.estimateNumber || 'NEW'}\n- Total Amount: $${estimate?.total?.toFixed(2) || '0.00'}\n\nThis estimate is valid for 30 days. Please review and click Accept or Decline in the email to let us know your decision.\n\nIf you have any questions, please don't hesitate to contact us.\n\nBest regards,\n${companyName}\n${companyInfo.phone}\n${companyInfo.email}`);
    }
  }, [estimate, companyInfo, selectedClient, showAddClient, newClientName, isOpen]);

  const resetForm = () => {
    setSuccessMessage('');
    setPdfUrl('');
    setIsLoading(false);
  };

  const fetchClients = async () => {
    try {
      const { data, error } = await supabase
        .from('clients')
        .select('id, name, email, phone, address, gmail_email, email_sending_enabled, email_auth_method')
        .order('name');

      if (error) throw error;
      setClients(data || []);
    } catch (error) {
      console.error('Error fetching clients:', error);
    }
  };

  const handleConnectGmail = async (client: Client) => {
    try {
      setIsConnectingGmail(true);
      setGmailError(null);

      // Get Google OAuth client ID from environment
      const googleClientId = import.meta.env.VITE_GOOGLE_CLIENT_ID;
      if (!googleClientId) {
        throw new Error('Google OAuth not configured. Please contact support.');
      }

      // Create OAuth URL with state parameter (client_id is reserved)
      const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
      const redirectUri = `${supabaseUrl}/functions/v1/customer-gmail-oauth`;

      const oauthUrl = new URL('https://accounts.google.com/o/oauth2/v2/auth');
      oauthUrl.searchParams.set('client_id', googleClientId);
      oauthUrl.searchParams.set('redirect_uri', redirectUri);
      oauthUrl.searchParams.set('response_type', 'code');
      oauthUrl.searchParams.set('scope', 'https://www.googleapis.com/auth/gmail.send https://www.googleapis.com/auth/userinfo.email');
      oauthUrl.searchParams.set('access_type', 'offline');
      oauthUrl.searchParams.set('prompt', 'consent');
      oauthUrl.searchParams.set('state', client.id); // Pass client ID via state parameter

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
          setIsConnectingGmail(false);

          // Check if client was updated (OAuth success)
          try {
            const { data: updatedClient, error: fetchError } = await supabase
              .from('clients')
              .select('*')
              .eq('id', client.id)
              .single();

            if (fetchError) {
              console.error('Error fetching updated client:', fetchError);
              setGmailError('Failed to verify email connection');
              return;
            }

            if (updatedClient?.email_sending_enabled && updatedClient?.gmail_email) {
              // Success - update client in local state
              setClients(prev => prev.map(c => c.id === client.id ? updatedClient : c));
              setSelectedClient(updatedClient);
              setSuccessMessage(`Gmail account ${updatedClient.gmail_email} connected successfully!`);
            } else {
              setGmailError('Gmail connection was not completed. Please try again.');
            }
          } catch (err) {
            console.error('Error checking connection status:', err);
            setGmailError('Failed to verify email connection');
          }
        }
      }, 1000);

      // Cleanup if popup is closed without completion after 5 minutes
      setTimeout(() => {
        if (!popup.closed) {
          popup.close();
          clearInterval(checkClosed);
          setIsConnectingGmail(false);
          setGmailError('Connection timeout. Please try again.');
        }
      }, 300000);

    } catch (err) {
      console.error('Gmail connection error:', err);
      setGmailError(err instanceof Error ? err.message : 'Failed to connect Gmail account');
      setIsConnectingGmail(false);
    }
  };

  const generatePdfBlob = async (): Promise<Blob> => {
    // Wait for preview element to be available
    const waitForPreview = async (maxAttempts = 10): Promise<HTMLElement | null> => {
      for (let i = 0; i < maxAttempts; i++) {
        const element = document.getElementById('estimate-preview');
        if (element) return element;
        await new Promise(resolve => setTimeout(resolve, 100));
      }
      return null;
    };

    const previewElement = await waitForPreview();

    if (previewElement) {
      // Generate from preview with proper scaling
      const canvas = await html2canvas(previewElement, {
        scale: 1.5,
        logging: false,
        useCORS: true,
        backgroundColor: '#ffffff',
        windowWidth: previewElement.scrollWidth,
        windowHeight: previewElement.scrollHeight
      });

      const imgData = canvas.toDataURL('image/png');
      const pdf = new jsPDF({
        orientation: 'portrait',
        unit: 'mm',
        format: 'a4'
      });

      const pdfWidth = pdf.internal.pageSize.getWidth();
      const pdfHeight = pdf.internal.pageSize.getHeight();
      const imgWidth = canvas.width;
      const imgHeight = canvas.height;

      // Calculate proper scaling to fit on page
      const ratio = Math.min(pdfWidth / (imgWidth * 0.264583), pdfHeight / (imgHeight * 0.264583));
      const scaledWidth = imgWidth * 0.264583 * ratio;
      const scaledHeight = imgHeight * 0.264583 * ratio;

      // Center the image on the page
      const x = (pdfWidth - scaledWidth) / 2;
      const y = 0;

      pdf.addImage(imgData, 'PNG', x, y, scaledWidth, scaledHeight);
      return pdf.output('blob');
    } else {
      // Generate basic PDF without preview
      const pdf = new jsPDF();
      pdf.setFontSize(20);
      pdf.text(`Estimate #${estimate.estimateNumber}`, 20, 20);
      pdf.setFontSize(12);
      pdf.text(`Total: $${estimate.total?.toFixed(2) || '0.00'}`, 20, 40);
      pdf.text('Unable to generate formatted PDF. Please try again.', 20, 60);
      return pdf.output('blob');
    }
  };

  const handleSendEstimate = async () => {
    // Prevent multiple concurrent executions (fixes call stack overflow)
    if (isLoading) {
      console.warn('🚫 Send estimate already in progress, ignoring duplicate click');
      return;
    }

    // Check Gmail connection requirement for existing clients
    if (selectedClient && !selectedClient.email_sending_enabled) {
      alert('Gmail connection is required. Please connect your Gmail account first.');
      return;
    }

    // Get authenticated user for adding new client
    const { data: { user } } = await supabase.auth.getUser();
    if (!user?.id) {
      alert('User not authenticated');
      return;
    }

    let recipientEmail: string | undefined;
    let customerName: string;
    let clientId: string | null;

    // If adding a new client, create it first
    if (showAddClient) {
      if (!newClientName || !newClientEmail) {
        alert('Please enter client name and email');
        return;
      }

      // Create new client in database
      const { data: newClient, error: clientError } = await supabase
        .from('clients')
        .insert({
          user_id: user.id,
          name: newClientName,
          email: newClientEmail,
          phone: newClientPhone || null,
          address: newClientAddress || null
        })
        .select()
        .single();

      if (clientError) {
        alert(`Failed to create client: ${clientError.message}`);
        return;
      }

      // New clients don't have Gmail connected - they need to connect before sending
      alert(`Client created successfully! ${newClient.name} must connect their Gmail account before you can send estimates from their email address.`);

      // Switch to client selection mode and select the new client
      setSelectedClient(newClient);
      setShowAddClient(false);
      setNewClientName('');
      setNewClientEmail('');
      setNewClientPhone('');
      setNewClientAddress('');

      // Refresh clients list
      await fetchClients();
      return; // Stop here to force Gmail connection

    } else {
      // Use selected client
      if (!selectedClient) {
        alert('Please select a client or add a new one');
        return;
      }

      recipientEmail = selectedClient.email;
      customerName = selectedClient.name || 'Customer';
      clientId = selectedClient.id;
    }

    if (!recipientEmail) {
      alert('Client email is required');
      return;
    }

    setIsLoading(true);
    setSuccessMessage('');
    setPdfUrl('');

    // Remember original tab to switch back later
    const originalTab = activeTab;
    let switchedTab = false;

    try {
      // CRITICAL FIX: Check if estimate exists in database, if not, save it first
      let estimateId = estimate.id || estimate.estimateNumber;

      console.log('🔍 Checking if estimate exists in database...', { estimateId });

      const { data: existingEstimate, error: checkError } = await supabase
        .from('estimates')
        .select('id')
        .eq('id', estimateId)
        .single();

      if (checkError && checkError.code === 'PGRST116') {
        // Estimate doesn't exist in database - save it first
        console.log('💾 Estimate not found in database, saving it first...');

        const estimateToSave = {
          id: estimateId,
          user_id: user.id,
          estimate_number: estimate.estimateNumber || estimateId,
          client_name: customerName,
          client_email: recipientEmail,
          project_id: estimate.projectId || null,
          date: new Date().toISOString().split('T')[0], // Required field: current date as DATE
          valid_until: estimate.validUntil || null,
          status: estimate.status || 'draft',
          subtotal: estimate.subtotal || 0,
          tax_rate: estimate.taxRate || 0,
          tax_amount: estimate.taxAmount || 0,
          total: estimate.total || 0,
          notes: estimate.notes || '',
          items: estimate.items || [],
          calculator_type: estimate.calculatorType || null,
          calculator_data: estimate.calculatorData || null
        };

        const { error: saveError } = await supabase
          .from('estimates')
          .insert(estimateToSave);

        if (saveError) {
          console.error('❌ Failed to save estimate to database:', saveError);
          throw new Error(`Failed to save estimate: ${saveError.message}`);
        }

        console.log('✅ Estimate saved to database successfully');
      } else if (checkError) {
        // Other database error
        console.error('❌ Error checking estimate:', checkError);
        throw new Error(`Database error: ${checkError.message}`);
      } else {
        console.log('✅ Estimate already exists in database');
      }

      // Step 1: Automatically switch to preview tab if not already there
      if (activeTab !== 'preview' && setActiveTab) {
        console.log('🔄 Switching to Preview tab for PDF generation...');
        setActiveTab('preview');
        switchedTab = true;
        // Wait for tab to render
        await new Promise(resolve => setTimeout(resolve, 300));
      }

      // Step 2: Generate PDF
      console.log('📄 Generating PDF from preview...');
      const pdfBlob = await generatePdfBlob();

      // Step 2: Upload to Supabase Storage
      const fileName = `estimate-${estimate.id || estimate.estimateNumber}-${Date.now()}.pdf`;
      const uploadedPdfUrl = await uploadPdfToStorage(pdfBlob, fileName);
      setPdfUrl(uploadedPdfUrl);

      // Step 3: Send to Edge Function (it will create the database record and forward to webhook)
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        throw new Error('No active session');
      }

      const emailPayload = {
        customerName,
        customerEmail: recipientEmail,
        subject: emailSubject,
        body: emailBody,
        pdfUrl: uploadedPdfUrl,
        estimateId: estimate.id || estimate.estimateNumber,
        clientId: clientId,
        contractorEmail: contractorEmail || null,
        totalAmount: estimate?.total?.toFixed(2) || '0.00'
      };

      const edgeFunctionResponse = await fetch(EDGE_FUNCTION_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session.access_token}`,
        },
        body: JSON.stringify(emailPayload)
      });

      if (!edgeFunctionResponse.ok) {
        const errorData = await edgeFunctionResponse.json();
        throw new Error(`Email sending failed: ${errorData.error || edgeFunctionResponse.statusText}`);
      }

      // Success!
      setSuccessMessage(`Email sent successfully to ${recipientEmail}!`);

      // Switch back to original tab if we switched
      if (switchedTab && originalTab && setActiveTab) {
        console.log(`🔄 Switching back to ${originalTab} tab...`);
        setTimeout(() => setActiveTab(originalTab), 500);
      }

      // Auto-close after 3 seconds
      setTimeout(() => {
        onClose();
      }, 3000);

    } catch (error) {
      console.error('Error sending estimate:', error);
      alert(`Error sending estimate: ${error instanceof Error ? error.message : 'Unknown error'}`);

      // Switch back to original tab on error too
      if (switchedTab && originalTab && setActiveTab) {
        setActiveTab(originalTab);
      }
    } finally {
      setIsLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      <div className="flex items-center justify-center min-h-screen px-4 pt-4 pb-20 text-center sm:block sm:p-0">
        <div className="fixed inset-0 transition-opacity bg-black/70" onClick={onClose}></div>

        <div className={`inline-block w-full max-w-2xl my-8 overflow-hidden text-left align-middle transition-all transform ${themeClasses.bg.secondary} rounded-2xl shadow-xl border border-orange-500/30`}>
          {/* Header */}
          <div className="flex items-center justify-between px-6 py-4 border-b border-orange-500/30">
            <div className="flex items-center space-x-3">
              <div className="w-10 h-10 bg-orange-500/20 rounded-lg flex items-center justify-center">
                <Mail className="w-5 h-5 text-orange-500" />
              </div>
              <h3 className={`text-lg font-semibold ${themeClasses.text.primary}`}>Send Estimate to Customer</h3>
            </div>
            <button onClick={onClose} className={`${themeClasses.text.secondary} hover:${themeClasses.text.primary} transition-colors`} disabled={isLoading}>
              <X className="w-6 h-6" />
            </button>
          </div>

          {/* Body */}
          <div className="px-6 py-4 space-y-4 max-h-[60vh] overflow-y-auto">
            {/* Success Message */}
            {successMessage && (
              <div className="bg-green-500/20 border border-green-500/30 rounded-lg p-4">
                <div className="flex items-start space-x-3">
                  <CheckCircle className="w-5 h-5 text-green-500 mt-0.5" />
                  <div className="flex-1">
                    <p className="text-sm font-medium text-green-400">{successMessage}</p>
                    {pdfUrl && (
                      <p className="mt-1 text-xs text-green-500/80">
                        PDF URL: <a href={pdfUrl} target="_blank" rel="noopener noreferrer" className="underline">{pdfUrl}</a>
                      </p>
                    )}
                  </div>
                </div>
              </div>
            )}

            {/* Contractor Email Input */}
            <div>
              <label className={`block text-sm font-medium ${themeClasses.text.secondary} mb-2`}>
                <Bell className="inline w-4 h-4 mr-1 text-orange-500" />
                Your Email (for notifications)
              </label>
              <input
                type="email"
                value={contractorEmail}
                onChange={(e) => setContractorEmail(e.target.value)}
                placeholder="your-email@company.com"
                disabled={isLoading}
                className={`w-full px-4 py-3 ${themeClasses.bg.tertiary} border border-orange-500/30 rounded-lg ${themeClasses.text.primary} placeholder-${theme === 'light' ? 'gray-400' : 'zinc-500'} focus:outline-none focus:border-orange-500 disabled:opacity-50 disabled:cursor-not-allowed`}
              />
              <p className={`mt-1 text-xs ${themeClasses.text.muted}`}>
                You'll receive notifications when the customer responds to this estimate
              </p>
            </div>

            {/* Client Selection or Add New */}
            {!showAddClient ? (
              <div>
                <div className="flex items-center justify-between mb-2">
                  <label className={`block text-sm font-medium ${themeClasses.text.secondary}`}>
                    Select Client
                  </label>
                  <button
                    onClick={() => setShowAddClient(true)}
                    disabled={isLoading}
                    className="text-sm text-orange-500 hover:text-orange-400 font-medium disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    + Add New Client
                  </button>
                </div>
                <select
                  value={selectedClient?.id || ''}
                  onChange={(e) => {
                    const client = clients.find(c => c.id === e.target.value);
                    setSelectedClient(client || null);
                  }}
                  disabled={isLoading}
                  className={`w-full px-4 py-3 ${themeClasses.bg.tertiary} border border-orange-500/30 rounded-lg ${themeClasses.text.primary} focus:outline-none focus:border-orange-500 disabled:opacity-50 disabled:cursor-not-allowed`}
                >
                  <option value="">Choose a client...</option>
                  {clients.map(client => (
                    <option key={client.id} value={client.id}>
                      {client.name} ({client.email})
                    </option>
                  ))}
                </select>
              </div>
            ) : (
              <div>
                <div className="flex items-center justify-between mb-2">
                  <label className={`block text-sm font-medium ${themeClasses.text.secondary}`}>
                    Add New Client
                  </label>
                  <button
                    onClick={() => {
                      setShowAddClient(false);
                      setNewClientName('');
                      setNewClientEmail('');
                      setNewClientPhone('');
                      setNewClientAddress('');
                    }}
                    disabled={isLoading}
                    className={`text-sm ${themeClasses.text.muted} hover:${themeClasses.text.primary} font-medium disabled:opacity-50 disabled:cursor-not-allowed`}
                  >
                    Cancel
                  </button>
                </div>
                <div className="space-y-3">
                  <div>
                    <label className={`block text-xs font-medium ${themeClasses.text.muted} mb-1`}>
                      Client Name *
                    </label>
                    <input
                      type="text"
                      value={newClientName}
                      onChange={(e) => setNewClientName(e.target.value)}
                      placeholder="John Smith"
                      disabled={isLoading}
                      className={`w-full px-4 py-3 ${themeClasses.bg.tertiary} border border-orange-500/30 rounded-lg ${themeClasses.text.primary} placeholder-${theme === 'light' ? 'gray-400' : 'zinc-500'} focus:outline-none focus:border-orange-500 disabled:opacity-50 disabled:cursor-not-allowed`}
                    />
                  </div>
                  <div>
                    <label className={`block text-xs font-medium ${themeClasses.text.muted} mb-1`}>
                      Email *
                    </label>
                    <input
                      type="email"
                      value={newClientEmail}
                      onChange={(e) => setNewClientEmail(e.target.value)}
                      placeholder="john@example.com"
                      disabled={isLoading}
                      className={`w-full px-4 py-3 ${themeClasses.bg.tertiary} border border-orange-500/30 rounded-lg ${themeClasses.text.primary} placeholder-${theme === 'light' ? 'gray-400' : 'zinc-500'} focus:outline-none focus:border-orange-500 disabled:opacity-50 disabled:cursor-not-allowed`}
                    />
                  </div>
                  <div>
                    <label className={`block text-xs font-medium ${themeClasses.text.muted} mb-1`}>
                      Phone (optional)
                    </label>
                    <input
                      type="tel"
                      value={newClientPhone}
                      onChange={(e) => setNewClientPhone(e.target.value)}
                      placeholder="(555) 123-4567"
                      disabled={isLoading}
                      className={`w-full px-4 py-3 ${themeClasses.bg.tertiary} border border-orange-500/30 rounded-lg ${themeClasses.text.primary} placeholder-${theme === 'light' ? 'gray-400' : 'zinc-500'} focus:outline-none focus:border-orange-500 disabled:opacity-50 disabled:cursor-not-allowed`}
                    />
                  </div>
                  <div>
                    <label className={`block text-xs font-medium ${themeClasses.text.muted} mb-1`}>
                      Address (optional)
                    </label>
                    <input
                      type="text"
                      value={newClientAddress}
                      onChange={(e) => setNewClientAddress(e.target.value)}
                      placeholder="123 Main St, City, State"
                      disabled={isLoading}
                      className={`w-full px-4 py-3 ${themeClasses.bg.tertiary} border border-orange-500/30 rounded-lg ${themeClasses.text.primary} placeholder-${theme === 'light' ? 'gray-400' : 'zinc-500'} focus:outline-none focus:border-orange-500 disabled:opacity-50 disabled:cursor-not-allowed`}
                    />
                  </div>
                </div>
              </div>
            )}

            {/* Gmail Connection Requirement */}
            {selectedClient && !selectedClient.email_sending_enabled && (
              <div className="bg-red-500/10 border border-red-500/30 rounded-lg p-4">
                <div className="flex items-start space-x-3">
                  <AlertCircle className="w-5 h-5 text-red-500 mt-0.5" />
                  <div className="flex-1">
                    <p className="text-sm font-medium text-red-400 mb-2">Gmail Connection Required</p>
                    <p className={`text-sm ${themeClasses.text.muted} mb-4`}>
                      {selectedClient.name} must connect their Gmail account to send estimates from their email address.
                    </p>

                    {/* Gmail Error Message */}
                    {gmailError && (
                      <div className="bg-red-500/20 border border-red-500/40 rounded-lg p-3 mb-4">
                        <p className="text-sm text-red-300">{gmailError}</p>
                      </div>
                    )}

                    <button
                      onClick={() => handleConnectGmail(selectedClient)}
                      disabled={isConnectingGmail || isLoading}
                      className="flex items-center gap-2 px-4 py-2.5 bg-orange-500 text-white rounded-lg hover:bg-orange-600 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
                    >
                      {isConnectingGmail ? (
                        <>
                          <Loader2 className="w-4 h-4 animate-spin" />
                          Connecting Gmail...
                        </>
                      ) : (
                        <>
                          <ExternalLink className="w-4 h-4" />
                          Connect {selectedClient.name}'s Gmail
                        </>
                      )}
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* Gmail Connected Status */}
            {selectedClient && selectedClient.email_sending_enabled && selectedClient.gmail_email && (
              <div className="bg-green-500/10 border border-green-500/30 rounded-lg p-4">
                <div className="flex items-center space-x-3">
                  <CheckCircle className="w-5 h-5 text-green-500" />
                  <div className="flex-1">
                    <p className="text-sm font-medium text-green-400">Gmail Connected</p>
                    <p className={`text-sm ${themeClasses.text.muted}`}>
                      Estimates will be sent from <strong>{selectedClient.gmail_email}</strong>
                    </p>
                  </div>
                </div>
              </div>
            )}

            {/* Email Subject - Only show if client has Gmail connected or no client selected */}
            {(!selectedClient || selectedClient.email_sending_enabled) && (
              <>
                <div>
                  <label className={`block text-sm font-medium ${themeClasses.text.secondary} mb-2`}>
                    Email Subject
                  </label>
                  <input
                    type="text"
                    value={emailSubject}
                    onChange={(e) => setEmailSubject(e.target.value)}
                    disabled={isLoading}
                    className={`w-full px-4 py-3 ${themeClasses.bg.tertiary} border border-orange-500/30 rounded-lg ${themeClasses.text.primary} placeholder-${theme === 'light' ? 'gray-400' : 'zinc-500'} focus:outline-none focus:border-orange-500 disabled:opacity-50 disabled:cursor-not-allowed`}
                  />
                </div>

                {/* Email Body */}
                <div>
                  <label className={`block text-sm font-medium ${themeClasses.text.secondary} mb-2`}>
                    Email Message
                  </label>
                  <textarea
                    value={emailBody}
                    onChange={(e) => setEmailBody(e.target.value)}
                    rows={8}
                    disabled={isLoading}
                    className={`w-full px-4 py-3 ${themeClasses.bg.tertiary} border border-orange-500/30 rounded-lg ${themeClasses.text.primary} placeholder-${theme === 'light' ? 'gray-400' : 'zinc-500'} focus:outline-none focus:border-orange-500 disabled:opacity-50 disabled:cursor-not-allowed resize-none`}
                  />
                </div>
              </>
            )}

            {/* Info Box */}
            <div className="bg-orange-500/10 border border-orange-500/30 rounded-lg p-4">
              <div className="flex items-start space-x-3">
                <FileText className="w-5 h-5 text-orange-500 mt-0.5" />
                <div className="flex-1">
                  <p className="text-sm font-medium text-orange-400">What happens when you click "Send":</p>
                  <ul className={`mt-2 text-sm ${themeClasses.text.muted} list-disc list-inside space-y-1`}>
                    <li>PDF estimate will be uploaded to secure storage</li>
                    <li>Email will be sent to customer with Accept/Decline buttons</li>
                    <li>Customer can respond directly from the email</li>
                    <li>You'll be notified of their decision</li>
                  </ul>
                </div>
              </div>
            </div>
          </div>

          {/* Footer */}
          <div className={`flex items-center justify-end px-6 py-4 space-x-3 ${themeClasses.bg.tertiary} border-t border-orange-500/30`}>
            <button
              onClick={onClose}
              disabled={isLoading}
              className={`px-5 py-2.5 text-sm font-medium ${themeClasses.text.secondary} bg-transparent border ${theme === 'light' ? 'border-gray-300 hover:bg-gray-100' : 'border-zinc-600 hover:bg-zinc-700'} rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed`}
            >
              Cancel
            </button>
            <button
              onClick={handleSendEstimate}
              disabled={
                isLoading ||
                (!showAddClient && !selectedClient) ||
                (showAddClient && (!newClientEmail || !newClientName)) ||
                (selectedClient && !selectedClient.email_sending_enabled)
              }
              className="px-5 py-2.5 text-sm font-semibold text-white bg-orange-500 rounded-lg hover:bg-orange-600 active:scale-[0.98] transition-all disabled:opacity-50 disabled:cursor-not-allowed shadow-lg shadow-orange-500/30 disabled:hover:bg-orange-500"
            >
              {isLoading ? (
                <>
                  <Loader2 className="inline w-4 h-4 mr-2 animate-spin" />
                  Sending...
                </>
              ) : (
                <>
                  <Mail className="inline w-4 h-4 mr-2" />
                  Send to Customer
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default SendEstimateModal;
