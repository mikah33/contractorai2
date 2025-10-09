import { useState, useEffect } from 'react';
import { X, Mail, User, FileText } from 'lucide-react';
import { supabase } from '../../lib/supabase';
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
}

const SendEstimateModal: React.FC<SendEstimateModalProps> = ({
  isOpen,
  onClose,
  estimate,
  companyInfo
}) => {
  const [clients, setClients] = useState<Client[]>([]);
  const [selectedClient, setSelectedClient] = useState<Client | null>(null);
  const [manualEmail, setManualEmail] = useState('');
  const [emailSubject, setEmailSubject] = useState('');
  const [emailBody, setEmailBody] = useState('');
  const [useManual, setUseManual] = useState(false);

  useEffect(() => {
    if (isOpen) {
      fetchClients();

      // Get customer name
      const customerName = selectedClient?.name || 'Customer';

      // Debug: Log company info
      console.log('Company Info:', companyInfo);

      // Get company name - use email as fallback if name is empty
      const companyName = companyInfo.name && companyInfo.name !== 'Your Company'
        ? companyInfo.name
        : companyInfo.email.split('@')[0] || 'Your Company';

      // Set default email subject and body with actual company name
      setEmailSubject(`Estimate #${estimate?.estimateNumber || 'NEW'} from ${companyName}`);
      setEmailBody(`Dear ${customerName},\n\nPlease find attached your estimate for the proposed work.\n\nEstimate Details:\n- Estimate #: ${estimate?.estimateNumber || 'NEW'}\n- Total Amount: $${estimate?.total?.toFixed(2) || '0.00'}\n\nThis estimate is valid for 30 days. Please feel free to contact us if you have any questions.\n\nBest regards,\n${companyName}\n${companyInfo.phone}\n${companyInfo.email}`);
    }
  }, [isOpen, estimate, companyInfo, selectedClient, useManual]);

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

  const handleSendEstimate = async () => {
    const recipientEmail = useManual ? manualEmail : selectedClient?.email;
    const customerName = selectedClient?.name || 'Customer';

    if (!recipientEmail) {
      alert('Please select a client or enter an email address');
      return;
    }

    // Update email body with selected customer name if it still says "Dear Customer"
    if (emailBody.includes('Dear Customer,')) {
      setEmailBody(emailBody.replace('Dear Customer,', `Dear ${customerName},`));
    }

    try {
      // Try to use existing PDF from preview element, or create basic PDF
      let pdfBlob: Blob;

      const previewElement = document.getElementById('estimate-preview');
      if (previewElement) {
        // Generate from preview
        const canvas = await html2canvas(previewElement, {
          scale: 2,
          logging: false,
          useCORS: true
        });

        const imgData = canvas.toDataURL('image/png');
        const pdf = new jsPDF('p', 'mm', 'a4');
        const pdfWidth = pdf.internal.pageSize.getWidth();
        const pdfHeight = (canvas.height * pdfWidth) / canvas.width;

        pdf.addImage(imgData, 'PNG', 0, 0, pdfWidth, pdfHeight);
        pdfBlob = pdf.output('blob');
      } else {
        // Generate basic PDF without preview
        const pdf = new jsPDF();
        pdf.setFontSize(20);
        pdf.text(`Estimate #${estimate.estimateNumber}`, 20, 20);
        pdf.setFontSize(12);
        pdf.text(`Total: $${estimate.total?.toFixed(2) || '0.00'}`, 20, 40);
        pdf.text('Please switch to Preview tab for a formatted estimate.', 20, 60);
        pdfBlob = pdf.output('blob');
      }

      // Download PDF
      const url = URL.createObjectURL(pdfBlob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `estimate-${estimate.estimateNumber}.pdf`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);

      // Copy PDF blob URL to clipboard
      try {
        await navigator.clipboard.writeText(url);
        console.log('PDF URL copied to clipboard');
      } catch (clipErr) {
        console.log('Clipboard copy not supported');
      }

      // Open default mail app with prefilled content immediately
      const mailtoLink = `mailto:${recipientEmail}?subject=${encodeURIComponent(emailSubject)}&body=${encodeURIComponent(emailBody)}`;
      window.location.href = mailtoLink;

      // Close modal and show success
      onClose();
      alert('✅ PDF downloaded! Check your Downloads folder and attach it to the email.');
    } catch (error) {
      console.error('Error generating PDF:', error);
      alert('Error generating PDF. Please try again.');
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
            <button onClick={onClose} className="text-gray-400 hover:text-gray-500">
              <X className="w-6 h-6" />
            </button>
          </div>

          {/* Body */}
          <div className="px-6 py-4 space-y-4">
            {/* Client Selection Toggle */}
            <div className="flex items-center space-x-4">
              <button
                onClick={() => setUseManual(false)}
                className={`flex-1 py-2 px-4 rounded-md text-sm font-medium transition-colors ${
                  !useManual
                    ? 'bg-blue-600 text-white'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                <User className="inline w-4 h-4 mr-2" />
                Select from CRM
              </button>
              <button
                onClick={() => setUseManual(true)}
                className={`flex-1 py-2 px-4 rounded-md text-sm font-medium transition-colors ${
                  useManual
                    ? 'bg-blue-600 text-white'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
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
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
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
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Customer Email
                </label>
                <input
                  type="email"
                  value={manualEmail}
                  onChange={(e) => setManualEmail(e.target.value)}
                  placeholder="customer@example.com"
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
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
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
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
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            {/* Preview Info */}
            <div className="bg-blue-50 border border-blue-200 rounded-md p-4">
              <div className="flex items-start space-x-3">
                <FileText className="w-5 h-5 text-blue-600 mt-0.5" />
                <div className="flex-1">
                  <p className="text-sm font-medium text-blue-900">What happens when you click "Send":</p>
                  <ul className="mt-2 text-sm text-blue-700 list-disc list-inside space-y-1">
                    <li>PDF estimate will be downloaded to your computer</li>
                    <li>Your default email app will open with the message pre-filled</li>
                    <li>You'll need to manually attach the downloaded PDF</li>
                  </ul>
                </div>
              </div>
            </div>
          </div>

          {/* Footer */}
          <div className="flex items-center justify-end px-6 py-4 space-x-3 bg-gray-50 border-t border-gray-200">
            <button
              onClick={onClose}
              className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
            >
              Cancel
            </button>
            <button
              onClick={handleSendEstimate}
              disabled={!useManual && !selectedClient && !manualEmail}
              className="px-4 py-2 text-sm font-medium text-white bg-blue-600 border border-transparent rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <Mail className="inline w-4 h-4 mr-2" />
              Send to Customer
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default SendEstimateModal;
