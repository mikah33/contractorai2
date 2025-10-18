import { useState, useEffect } from 'react';
import { X, Mail, User, FileText, Loader2, CheckCircle, Bell } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { uploadPdfToStorage } from '../../services/supabaseStorage';
import { useData } from '../../contexts/DataContext';
import html2canvas from 'html2canvas';
import jsPDF from 'jspdf';

interface Client {
  id: string;
  name: string;
  email: string;
  phone?: string;
  address?: string;
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
  const [clients, setClients] = useState<Client[]>([]);
  const [selectedClient, setSelectedClient] = useState<Client | null>(null);
  const [manualEmail, setManualEmail] = useState('');
  const [manualName, setManualName] = useState('');
  const [contractorEmail, setContractorEmail] = useState('');
  const [emailSubject, setEmailSubject] = useState('');
  const [emailBody, setEmailBody] = useState('');
  const [useManual, setUseManual] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [successMessage, setSuccessMessage] = useState('');
  const [pdfUrl, setPdfUrl] = useState('');

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
      const customerName = useManual ? manualName || 'Customer' : selectedClient?.name || 'Customer';

      // Get company name - use email as fallback if name is empty
      const companyName = companyInfo.name && companyInfo.name !== 'Your Company'
        ? companyInfo.name
        : companyInfo.email.split('@')[0] || 'Your Company';

      // Set default email subject and body with actual company name
      setEmailSubject(`Estimate #${estimate?.estimateNumber || 'NEW'} from ${companyName}`);
      setEmailBody(`Dear ${customerName},\n\nPlease find attached your estimate for the proposed work.\n\nEstimate Details:\n- Estimate #: ${estimate?.estimateNumber || 'NEW'}\n- Total Amount: $${estimate?.total?.toFixed(2) || '0.00'}\n\nThis estimate is valid for 30 days. Please review and click Accept or Decline in the email to let us know your decision.\n\nIf you have any questions, please don't hesitate to contact us.\n\nBest regards,\n${companyName}\n${companyInfo.phone}\n${companyInfo.email}`);
    }
  }, [estimate, companyInfo, selectedClient, useManual, manualName, isOpen]);

  const resetForm = () => {
    setSuccessMessage('');
    setPdfUrl('');
    setIsLoading(false);
  };

  const fetchClients = async () => {
    try {
      const { data, error } = await supabase
        .from('clients')
        .select('id, name, email, phone, address')
        .order('name');

      if (error) throw error;
      setClients(data || []);
    } catch (error) {
      console.error('Error fetching clients:', error);
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
    const recipientEmail = useManual ? manualEmail : selectedClient?.email;
    const customerName = useManual ? manualName : selectedClient?.name || 'Customer';
    const clientId = selectedClient?.id || null;

    if (!recipientEmail) {
      alert('Please select a client or enter an email address');
      return;
    }

    if (useManual && !manualName) {
      alert('Please enter customer name');
      return;
    }

    setIsLoading(true);
    setSuccessMessage('');
    setPdfUrl('');

    // Remember original tab to switch back later
    const originalTab = activeTab;
    let switchedTab = false;

    try {
      // Get authenticated user
      const { data: { user } } = await supabase.auth.getUser();
      if (!user?.id) {
        throw new Error('User not authenticated');
      }

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
        <div className="fixed inset-0 transition-opacity bg-gray-500 bg-opacity-75" onClick={onClose}></div>

        <div className="inline-block w-full max-w-2xl my-8 overflow-hidden text-left align-middle transition-all transform bg-white rounded-lg shadow-xl">
          {/* Header */}
          <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200">
            <div className="flex items-center space-x-3">
              <Mail className="w-6 h-6 text-blue-600" />
              <h3 className="text-lg font-medium text-gray-900">Send Estimate to Customer</h3>
            </div>
            <button onClick={onClose} className="text-gray-400 hover:text-gray-500" disabled={isLoading}>
              <X className="w-6 h-6" />
            </button>
          </div>

          {/* Body */}
          <div className="px-6 py-4 space-y-4">
            {/* Success Message */}
            {successMessage && (
              <div className="bg-green-50 border border-green-200 rounded-md p-4">
                <div className="flex items-start space-x-3">
                  <CheckCircle className="w-5 h-5 text-green-600 mt-0.5" />
                  <div className="flex-1">
                    <p className="text-sm font-medium text-green-900">{successMessage}</p>
                    {pdfUrl && (
                      <p className="mt-1 text-xs text-green-700">
                        PDF URL: <a href={pdfUrl} target="_blank" rel="noopener noreferrer" className="underline">{pdfUrl}</a>
                      </p>
                    )}
                  </div>
                </div>
              </div>
            )}

            {/* Contractor Email Input */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                <Bell className="inline w-4 h-4 mr-1 text-orange-600" />
                Your Email (for notifications)
              </label>
              <input
                type="email"
                value={contractorEmail}
                onChange={(e) => setContractorEmail(e.target.value)}
                placeholder="your-email@company.com"
                disabled={isLoading}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
              />
              <p className="mt-1 text-xs text-gray-500">
                You'll receive notifications when the customer responds to this estimate
              </p>
            </div>

            {/* Client Selection Toggle */}
            <div className="flex items-center space-x-4">
              <button
                onClick={() => setUseManual(false)}
                disabled={isLoading}
                className={`flex-1 py-2 px-4 rounded-md text-sm font-medium transition-colors ${
                  !useManual
                    ? 'bg-blue-600 text-white'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                } disabled:opacity-50 disabled:cursor-not-allowed`}
              >
                <User className="inline w-4 h-4 mr-2" />
                Select from CRM
              </button>
              <button
                onClick={() => setUseManual(true)}
                disabled={isLoading}
                className={`flex-1 py-2 px-4 rounded-md text-sm font-medium transition-colors ${
                  useManual
                    ? 'bg-blue-600 text-white'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                } disabled:opacity-50 disabled:cursor-not-allowed`}
              >
                <Mail className="inline w-4 h-4 mr-2" />
                Manual Email
              </button>
            </div>

            {/* Client Dropdown or Manual Input */}
            {!useManual ? (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Select Client
                </label>
                <select
                  value={selectedClient?.id || ''}
                  onChange={(e) => {
                    const client = clients.find(c => c.id === e.target.value);
                    setSelectedClient(client || null);
                  }}
                  disabled={isLoading}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
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
              <div className="space-y-3">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Customer Name
                  </label>
                  <input
                    type="text"
                    value={manualName}
                    onChange={(e) => setManualName(e.target.value)}
                    placeholder="John Smith"
                    disabled={isLoading}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Customer Email
                  </label>
                  <input
                    type="email"
                    value={manualEmail}
                    onChange={(e) => setManualEmail(e.target.value)}
                    placeholder="customer@example.com"
                    disabled={isLoading}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
                  />
                </div>
              </div>
            )}

            {/* Email Subject */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Email Subject
              </label>
              <input
                type="text"
                value={emailSubject}
                onChange={(e) => setEmailSubject(e.target.value)}
                disabled={isLoading}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
              />
            </div>

            {/* Email Body */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Email Message
              </label>
              <textarea
                value={emailBody}
                onChange={(e) => setEmailBody(e.target.value)}
                rows={8}
                disabled={isLoading}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
              />
            </div>

            {/* Info Box */}
            <div className="bg-blue-50 border border-blue-200 rounded-md p-4">
              <div className="flex items-start space-x-3">
                <FileText className="w-5 h-5 text-blue-600 mt-0.5" />
                <div className="flex-1">
                  <p className="text-sm font-medium text-blue-900">What happens when you click "Send":</p>
                  <ul className="mt-2 text-sm text-blue-700 list-disc list-inside space-y-1">
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
          <div className="flex items-center justify-end px-6 py-4 space-x-3 bg-gray-50 border-t border-gray-200">
            <button
              onClick={onClose}
              disabled={isLoading}
              className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Cancel
            </button>
            <button
              onClick={handleSendEstimate}
              disabled={isLoading || (!useManual && !selectedClient) || (useManual && (!manualEmail || !manualName))}
              className="px-4 py-2 text-sm font-medium text-white bg-blue-600 border border-transparent rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
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
