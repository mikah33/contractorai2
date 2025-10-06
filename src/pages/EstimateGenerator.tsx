import { useState, useRef, useEffect, useMemo } from 'react';
import { FileText, Plus, Download, Trash2, Edit2, Image, Copy, Check, X, Settings, Palette, Layout, FileUp, FileDown, Sparkles, DollarSign, Printer, Eye, RefreshCw, Receipt, ArrowLeft, Mail } from 'lucide-react';
import { useLocation, useNavigate } from 'react-router-dom';
import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';
import useProjectStore from '../stores/projectStore';
import { useClientsStore } from '../stores/clientsStore';
import useEstimateStore from '../stores/estimateStore';
import { useFinanceStore } from '../stores/financeStoreSupabase';
import EstimateEditor from '../components/estimates/EstimateEditor';
import EstimatePreview from '../components/estimates/EstimatePreview';
import AIEstimateAssistant from '../components/estimates/AIEstimateAssistant';
import SendEstimateModal from '../components/estimates/SendEstimateModal';
import { Estimate, EstimateItem } from '../types/estimates';
import { estimateService } from '../services/estimateService';
import { useData } from '../contexts/DataContext';

const EstimateGenerator = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const { profile } = useData();
  const [activeTab, setActiveTab] = useState<'editor' | 'preview'>('editor');
  const [currentEstimate, setCurrentEstimate] = useState<Estimate | null>(null);
  const [showAIAssistant, setShowAIAssistant] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const [showSaveSuccess, setShowSaveSuccess] = useState(false);
  const [showExportMenu, setShowExportMenu] = useState(false);
  const [showSendModal, setShowSendModal] = useState(false);
  const [recentEstimates, setRecentEstimates] = useState<any[]>([]);
  const [loadingEstimates, setLoadingEstimates] = useState(false);
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  const hasSavedCalculator = useRef(false); // PREVENT DOUBLE SAVES
  const initialEstimateRef = useRef<string>(''); // Track initial state

  const { projects, fetchProjects } = useProjectStore();
  const { clients: clientsData, fetchClients } = useClientsStore();
  const { createFromCalculator, fetchEstimates: fetchEstimatesFromStore, updateEstimate } = useEstimateStore();
  const { convertEstimateToInvoice } = useFinanceStore();
  
  // Helper function to generate UUID v4
  const generateUUID = () => {
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
      const r = Math.random() * 16 | 0;
      const v = c === 'x' ? r : (r & 0x3 | 0x8);
      return v.toString(16);
    });
  };
  
  // Check if coming from calculator with data
  useEffect(() => {
    const saveCalculatorData = async () => {
      console.log('EstimateGenerator - Location state:', location.state);
      if (location.state?.fromCalculator && location.state?.calculatorData) {
        console.log('Processing calculator data:', location.state.calculatorData);

        // ABSOLUTE GUARD - use ref to prevent ANY duplicate saves
        if (hasSavedCalculator.current) {
          console.log('🛑 BLOCKED: Already saved calculator estimate in this session');
          return;
        }

        console.log('✅ SAVING: First save, proceeding...');
        hasSavedCalculator.current = true; // Mark immediately to prevent race conditions

        // Clear any old localStorage data that might have invalid IDs
        localStorage.removeItem('currentEstimate');
        localStorage.removeItem('estimateData');

        // Save calculator data to database
        const savedEstimate = await createFromCalculator(location.state.calculatorData);
        
        if (savedEstimate) {
          console.log('Estimate saved to database:', savedEstimate);
          
          // Create display estimate with simple schema format
          const calculatorEstimate = {
            id: savedEstimate.id,
            title: savedEstimate.title,
            clientName: savedEstimate.client_name || '',
            projectName: savedEstimate.project_name || '',
            status: savedEstimate.status || 'draft',
            createdAt: savedEstimate.created_at || new Date().toISOString(),
            expiresAt: savedEstimate.expires_at || new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
            items: location.state.calculatorData.items || [],
            subtotal: savedEstimate.subtotal,
            taxRate: savedEstimate.tax_rate,
            taxAmount: savedEstimate.tax_amount,
            total: savedEstimate.total,
            notes: savedEstimate.notes || '',
            terms: savedEstimate.terms || 'Valid for 30 days from the date of issue.'
          };
          console.log('Setting current estimate:', calculatorEstimate);
          setCurrentEstimate(calculatorEstimate);
          setActiveTab('editor');
          console.log('Active tab set to editor');
        } else {
          // Fallback to displaying without saving - use simple schema
          const calculatorEstimate = {
            id: location.state.calculatorData.id && location.state.calculatorData.id.match(/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i) 
              ? location.state.calculatorData.id 
              : generateUUID(),
            title: location.state.calculatorData.title || 'New Estimate',
            clientName: location.state.calculatorData.clientName || '',
            projectName: location.state.calculatorData.projectName || '',
            status: location.state.calculatorData.status || 'draft',
            createdAt: location.state.calculatorData.createdAt || new Date().toISOString(),
            expiresAt: location.state.calculatorData.expiresAt || new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
            items: location.state.calculatorData.items || [],
            subtotal: location.state.calculatorData.subtotal || 0,
            taxRate: location.state.calculatorData.taxRate || 0,
            taxAmount: location.state.calculatorData.taxAmount || 0,
            total: location.state.calculatorData.total || 0,
            notes: location.state.calculatorData.notes || '',
            terms: location.state.calculatorData.terms || 'Valid for 30 days from the date of issue.',
            branding: {
              logo: '',
              primaryColor: '#3B82F6',
              fontFamily: 'Inter'
            }
          };
          setCurrentEstimate(calculatorEstimate);
          setActiveTab('editor');
        }
      }
    };
    
    saveCalculatorData();
  }, [location.state?.fromCalculator, location.state?.calculatorData]); // eslint-disable-line react-hooks/exhaustive-deps
  
  // Fetch projects, clients, and estimates on component mount
  useEffect(() => {
    console.log('EstimateGenerator mounted, fetching data...');
    fetchProjects();
    fetchClients();
    fetchEstimates();
    fetchEstimatesFromStore();
  }, []);
  
  // Fetch estimates from Supabase
  const fetchEstimates = async () => {
    setLoadingEstimates(true);
    try {
      const result = await estimateService.getEstimates();
      if (result.success && result.data) {
        console.log('Fetched estimates:', result.data);
        // Transform the data for display using simple schema columns
        const transformedEstimates = result.data.map((est: any) => ({
          id: est.id,
          client: est.clientName || 'No Client',
          project: est.projectName || est.title,
          amount: `$${est.total?.toFixed(2) || '0.00'}`,
          status: est.status || 'draft',
          date: new Date(est.createdAt).toLocaleDateString()
        }));
        setRecentEstimates(transformedEstimates);
      }
    } catch (error) {
      console.error('Error fetching estimates:', error);
    } finally {
      setLoadingEstimates(false);
    }
  };
  
  // Refresh estimates when save is successful
  useEffect(() => {
    if (showSaveSuccess) {
      fetchEstimates();
    }
  }, [showSaveSuccess]);

  // Set initial state when estimate is first loaded
  useEffect(() => {
    if (currentEstimate && !initialEstimateRef.current) {
      initialEstimateRef.current = JSON.stringify(currentEstimate);
      setHasUnsavedChanges(false);
    }
  }, [currentEstimate]);

  const handleBack = () => {
    if (hasUnsavedChanges) {
      const confirmLeave = window.confirm(
        'You have unsaved changes. Are you sure you want to leave? Your changes will be lost.'
      );
      if (!confirmLeave) {
        return;
      }
    }
    // Clear current estimate and go back to list view
    setCurrentEstimate(null);
    initialEstimateRef.current = '';
    setHasUnsavedChanges(false);
  };

  // Debug: Log data to see what we're working with
  useEffect(() => {
    console.log('Projects loaded:', projects);
    console.log('Number of projects:', projects.length);
    console.log('Clients loaded:', clientsData);
    console.log('Number of clients:', clientsData.length);
  }, [projects, clientsData]);

  // Map clients from clientsStore to the format needed for the component
  // Use useMemo to prevent infinite re-render loop
  const clients = useMemo(() => {
    return clientsData.map(client => ({
      id: client.id,    // Use actual client ID
      name: client.name  // Use actual client name
    }));
  }, [clientsData]);

  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleTemplateSelect = () => {
    // Create a new estimate using simple schema
    const newEstimate: Estimate = {
      id: generateUUID(),
      title: 'New Estimate',
      clientName: '',
      projectName: '',
      status: 'draft',
      createdAt: new Date().toISOString(),
      expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
      items: [],
      subtotal: 0,
      taxRate: 0,
      taxAmount: 0,
      total: 0,
      notes: '',
      terms: profile?.default_terms || 'Valid for 30 days from the date of issue.',
      branding: {
        logo: '',
        primaryColor: '#3B82F6',
        fontFamily: 'Inter'
      }
    };

    setCurrentEstimate(newEstimate);
    setActiveTab('editor');
  };

  const handleCreateFromScratch = () => {

    // Create a blank estimate using simple schema
    const newEstimate: Estimate = {
      id: generateUUID(),
      title: 'New Estimate',
      clientName: '',
      projectName: '',
      status: 'draft',
      createdAt: new Date().toISOString(),
      expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
      items: [],
      subtotal: 0,
      taxRate: 0,
      taxAmount: 0,
      total: 0,
      notes: '',
      terms: profile?.default_terms || 'Valid for 30 days from the date of issue.',
      branding: {
        logo: '',
        primaryColor: '#3B82F6',
        fontFamily: 'Inter'
      }
    };

    setCurrentEstimate(newEstimate);
    setActiveTab('editor');
  };

  const handleEditEstimate = async (estimateId: string) => {
    console.log('Loading estimate for editing:', estimateId);
    try {
      const result = await estimateService.getEstimate(estimateId);
      if (result.success && result.data) {
        setCurrentEstimate(result.data);
        setActiveTab('editor');
      } else {
        console.error('Failed to load estimate:', result.error);
        alert('Failed to load estimate for editing');
      }
    } catch (error) {
      console.error('Error loading estimate:', error);
      alert('Error loading estimate');
    }
  };
  
  const handleDeleteEstimate = async (estimateId: string) => {
    if (!confirm('Are you sure you want to delete this estimate?')) return;
    
    try {
      const result = await estimateService.deleteEstimate(estimateId);
      if (result.success) {
        alert('Estimate deleted successfully');
        fetchEstimates(); // Refresh the list
      } else {
        alert('Failed to delete estimate');
      }
    } catch (error) {
      console.error('Error deleting estimate:', error);
      alert('Error deleting estimate');
    }
  };

  const handleUpdateEstimate = async (updatedEstimate: Estimate) => {
    // Recalculate totals
    const subtotal = updatedEstimate.items.reduce((sum, item) => sum + (item.quantity * item.unitPrice), 0);
    const taxAmount = subtotal * (updatedEstimate.taxRate / 100);
    const total = subtotal + taxAmount;

    const estimateWithTotals = {
      ...updatedEstimate,
      subtotal,
      taxAmount,
      total
    };

    // Check if estimate has changed from initial state
    const currentState = JSON.stringify(estimateWithTotals);
    if (currentState !== initialEstimateRef.current) {
      setHasUnsavedChanges(true);
    }

    setCurrentEstimate(estimateWithTotals);

    // Auto-save to database if estimate has an ID
    if (estimateWithTotals.id) {
      try {
        await updateEstimate(estimateWithTotals.id, {
          title: estimateWithTotals.title,
          client_name: estimateWithTotals.clientName,
          project_name: estimateWithTotals.projectName,
          project_id: estimateWithTotals.projectId,
          status: estimateWithTotals.status,
          items: estimateWithTotals.items,
          subtotal: estimateWithTotals.subtotal,
          tax_rate: estimateWithTotals.taxRate,
          tax_amount: estimateWithTotals.taxAmount,
          total: estimateWithTotals.total,
          notes: estimateWithTotals.notes,
          terms: estimateWithTotals.terms,
          expires_at: estimateWithTotals.expiresAt
        });
        console.log('Auto-saved estimate to database');
        // Reset unsaved changes flag after successful save
        initialEstimateRef.current = currentState;
        setHasUnsavedChanges(false);
      } catch (error) {
        console.error('Error auto-saving estimate:', error);
      }
    }
  };

  const handleAddItem = (item: EstimateItem) => {
    if (!currentEstimate) return;
    
    const updatedEstimate = {
      ...currentEstimate,
      items: [...currentEstimate.items, item]
    };
    
    handleUpdateEstimate(updatedEstimate);
  };

  const handleRemoveItem = (index: number) => {
    if (!currentEstimate) return;
    
    const updatedItems = [...currentEstimate.items];
    updatedItems.splice(index, 1);
    
    const updatedEstimate = {
      ...currentEstimate,
      items: updatedItems
    };
    
    handleUpdateEstimate(updatedEstimate);
  };

  const handleUpdateItem = (index: number, updatedItem: EstimateItem) => {
    if (!currentEstimate) return;
    
    const updatedItems = [...currentEstimate.items];
    updatedItems[index] = updatedItem;
    
    const updatedEstimate = {
      ...currentEstimate,
      items: updatedItems
    };
    
    handleUpdateEstimate(updatedEstimate);
  };

  const handleSaveEstimate = async () => {
    if (!currentEstimate) return;

    setIsGenerating(true);

    try {
      // Use the same update method as auto-save to avoid duplicates
      await updateEstimate(currentEstimate.id, {
        title: currentEstimate.title,
        client_name: currentEstimate.clientName,
        project_name: currentEstimate.projectName,
        project_id: currentEstimate.projectId,
        status: currentEstimate.status,
        items: currentEstimate.items,
        subtotal: currentEstimate.subtotal,
        tax_rate: currentEstimate.taxRate,
        tax_amount: currentEstimate.taxAmount,
        total: currentEstimate.total,
        notes: currentEstimate.notes,
        terms: currentEstimate.terms,
        expires_at: currentEstimate.expiresAt
      });

      setIsGenerating(false);
      setShowSaveSuccess(true);
      console.log('Estimate saved successfully to Supabase!');

      setTimeout(() => {
        setShowSaveSuccess(false);
      }, 3000);
    } catch (error) {
      setIsGenerating(false);
      console.error('Error saving estimate:', error);
      alert(`Error saving estimate: ${error.message || 'Unknown error'}`);
    }
  };


  const handleExportPDF = async () => {
    if (!currentEstimate) return;
    
    setIsGenerating(true);
    
    // Get the preview element or switch to preview mode
    let previewElement = document.getElementById('estimate-preview');
    
    if (!previewElement && activeTab !== 'preview') {
      // Switch to preview mode first
      setActiveTab('preview');
      // Wait for the preview to render
      setTimeout(async () => {
        const preview = document.getElementById('estimate-preview');
        if (preview) {
          await generatePDF(preview);
          setIsGenerating(false);
        }
      }, 500);
    } else if (previewElement) {
      await generatePDF(previewElement);
      setIsGenerating(false);
    } else {
      alert('Please switch to Preview mode first');
      setIsGenerating(false);
    }
  };
  
  const generatePDF = async (element: HTMLElement) => {
    try {
      const canvas = await html2canvas(element, {
        scale: 2,
        useCORS: true,
        logging: false,
        backgroundColor: '#ffffff'
      });
      
      const imgData = canvas.toDataURL('image/png');
      const pdf = new jsPDF({
        orientation: 'portrait',
        unit: 'mm',
        format: 'a4'
      });
      
      const imgWidth = 210; // A4 width in mm
      const imgHeight = (canvas.height * imgWidth) / canvas.width;
      const pageHeight = 297; // A4 height in mm
      
      let heightLeft = imgHeight;
      let position = 0;
      
      // Add first page
      pdf.addImage(imgData, 'PNG', 0, position, imgWidth, imgHeight);
      heightLeft -= pageHeight;
      
      // Add additional pages if needed
      while (heightLeft > 0) {
        position = heightLeft - imgHeight;
        pdf.addPage();
        pdf.addImage(imgData, 'PNG', 0, position, imgWidth, imgHeight);
        heightLeft -= pageHeight;
      }
      
      // Save the PDF
      const filename = `estimate-${currentEstimate?.title?.replace(/\s+/g, '-') || 'document'}-${new Date().toISOString().split('T')[0]}.pdf`;
      pdf.save(filename);
      
      console.log('PDF exported successfully:', filename);
    } catch (error) {
      console.error('Error generating PDF:', error);
      alert('Error generating PDF. Please try again.');
    }
  };

  const handleExportExcel = () => {
    if (!currentEstimate) return;
    
    setIsGenerating(true);
    
    // Create CSV content
    const csvContent = [
      ['Estimate Details'],
      ['ID', currentEstimate.id],
      ['Title', currentEstimate.title],
      ['Date', new Date(currentEstimate.createdAt).toLocaleDateString()],
      ['Expires', new Date(currentEstimate.expiresAt).toLocaleDateString()],
      [],
      ['Items', 'Quantity', 'Unit', 'Unit Price', 'Total'],
      ...currentEstimate.items.map(item => [
        item.description,
        item.quantity.toString(),
        item.unit,
        `$${item.unitPrice.toFixed(2)}`,
        `$${item.totalPrice.toFixed(2)}`
      ]),
      [],
      ['', '', '', 'Subtotal', `$${currentEstimate.subtotal.toFixed(2)}`],
      ['', '', '', `Tax (${currentEstimate.taxRate}%)`, `$${currentEstimate.taxAmount.toFixed(2)}`],
      ['', '', '', 'TOTAL', `$${currentEstimate.total.toFixed(2)}`]
    ].map(row => row.join(',')).join('\n');
    
    // Create a blob and download
    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `estimate-${currentEstimate.id}.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    window.URL.revokeObjectURL(url);
    
    setIsGenerating(false);
    console.log('Estimate exported as CSV file');
  };

  const handleLogoUpload = () => {
    if (fileInputRef.current) {
      fileInputRef.current.click();
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file && currentEstimate) {
      // Convert image to base64 for storage in estimate branding
      const reader = new FileReader();
      reader.onload = (event) => {
        if (event.target?.result && currentEstimate) {
          const logoDataUrl = event.target.result as string;
          setCurrentEstimate({
            ...currentEstimate,
            branding: {
              ...currentEstimate.branding,
              logo: logoDataUrl
            }
          });
          console.log('Logo uploaded and set in estimate branding');
        }
      };
      reader.readAsDataURL(file);
    }
  };

  const handleAIAssistance = () => {
    setShowAIAssistant(!showAIAssistant);
  };

  const handleAIGeneratedItems = (items: EstimateItem[]) => {
    if (!currentEstimate) return;

    const updatedEstimate = {
      ...currentEstimate,
      items: [...currentEstimate.items, ...items]
    };

    handleUpdateEstimate(updatedEstimate);
    setShowAIAssistant(false);
  };

  const handleMarkAsApproved = async () => {
    if (!currentEstimate || !currentEstimate.id) {
      alert('Please save the estimate first');
      return;
    }

    // Update estimate status to approved
    await updateEstimate(currentEstimate.id, { status: 'approved' });

    setCurrentEstimate({
      ...currentEstimate,
      status: 'approved'
    });

    // Ask if they want to convert to invoice
    const createInvoice = confirm('Estimate marked as approved! Would you like to create an invoice now?');
    if (createInvoice) {
      const invoice = await convertEstimateToInvoice(currentEstimate.id);
      if (invoice) {
        alert(`Invoice ${invoice.invoiceNumber} created successfully!`);
      }
    }
  };

  const handleConvertToInvoice = async () => {
    if (!currentEstimate || !currentEstimate.id) {
      alert('Please save the estimate before converting to invoice');
      return;
    }

    // Check if estimate has already been converted to invoice
    if (currentEstimate.convertedToInvoice) {
      alert('This estimate has already been converted to an invoice. Each estimate can only be converted once.');
      return;
    }

    if (currentEstimate.status !== 'approved') {
      const confirmConvert = confirm('This estimate has not been approved yet. Convert to invoice anyway?');
      if (!confirmConvert) return;
    }

    const invoice = await convertEstimateToInvoice(currentEstimate.id);
    if (invoice) {
      // Update local state to reflect conversion
      setCurrentEstimate({
        ...currentEstimate,
        convertedToInvoice: true,
        invoiceId: invoice.id
      });
      alert(`Invoice ${invoice.invoiceNumber} created successfully!`);
    } else {
      alert('Failed to convert estimate to invoice');
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'Approved':
        return 'bg-green-100 text-green-800';
      case 'Sent':
        return 'bg-blue-100 text-blue-800';
      case 'Draft':
        return 'bg-gray-100 text-gray-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <div className="flex items-center space-x-3">
            {currentEstimate && (
              <button
                onClick={handleBack}
                className="p-2 text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-md transition-colors"
                title="Back to Estimates List"
              >
                <ArrowLeft className="w-5 h-5" />
              </button>
            )}
            <div>
              <h1 className="text-2xl font-bold text-gray-900">Estimate Generator</h1>
              <p className="mt-1 text-sm text-gray-600">
                Create professional estimates and proposals for your clients
              </p>
            </div>
          </div>
        </div>
        
        {currentEstimate ? (
          <div className="flex items-center gap-3">
            {/* Preview Button */}
            <button
              onClick={() => setActiveTab('preview')}
              className="inline-flex items-center px-4 py-2.5 text-sm font-semibold rounded-lg text-blue-700 bg-blue-50 hover:bg-blue-100 border border-blue-200 shadow-sm hover:shadow transition-all duration-200 whitespace-nowrap"
            >
              <Eye className="w-4 h-4 mr-2" />
              <span className="hidden sm:inline">Preview Invoice</span>
              <span className="sm:hidden">Preview</span>
            </button>

            {/* Primary Action - Send */}
            <button
              onClick={() => setShowSendModal(true)}
              className="inline-flex items-center px-5 py-2.5 text-sm font-semibold rounded-lg text-white bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 shadow-lg hover:shadow-xl transform hover:scale-105 transition-all duration-200 whitespace-nowrap"
            >
              <Mail className="w-4 h-4 mr-2" />
              <span className="hidden sm:inline">Send to Customer</span>
              <span className="sm:hidden">Send</span>
            </button>

            {/* Actions Dropdown */}
            <div className="relative">
              <button
                onClick={() => setShowExportMenu(!showExportMenu)}
                className="inline-flex items-center px-4 py-2.5 text-sm font-medium rounded-lg text-gray-700 bg-white border-2 border-gray-200 hover:border-blue-500 hover:text-blue-600 hover:shadow-md transition-all duration-200 whitespace-nowrap"
              >
                <Settings className="w-4 h-4 mr-2" />
                <span>Actions</span>
                <svg className="w-4 h-4 ml-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                </svg>
              </button>

              {showExportMenu && (
                <div className="absolute right-0 mt-2 w-56 bg-white rounded-xl shadow-2xl border border-gray-100 z-50 overflow-hidden">
                  <div className="py-2">
                    <button
                      onClick={handleSaveEstimate}
                      disabled={isGenerating}
                      className="w-full flex items-center px-4 py-3 text-sm text-gray-700 hover:bg-blue-50 hover:text-blue-600 transition-colors duration-150"
                    >
                      {isGenerating ? (
                        <RefreshCw className="w-5 h-5 mr-3 animate-spin text-blue-500" />
                      ) : (
                        <FileDown className="w-5 h-5 mr-3 text-blue-500" />
                      )}
                      <span className="font-medium">Save Estimate</span>
                    </button>

                    <div className="border-t border-gray-100 my-1"></div>

                    <button
                      onClick={() => {
                        handleExportPDF();
                        setShowExportMenu(false);
                      }}
                      className="w-full flex items-center px-4 py-3 text-sm text-gray-700 hover:bg-blue-50 hover:text-blue-600 transition-colors duration-150"
                    >
                      <Download className="w-5 h-5 mr-3 text-green-500" />
                      <span className="font-medium">Export as PDF</span>
                    </button>

                    <button
                      onClick={() => {
                        handleExportExcel();
                        setShowExportMenu(false);
                      }}
                      className="w-full flex items-center px-4 py-3 text-sm text-gray-700 hover:bg-blue-50 hover:text-blue-600 transition-colors duration-150"
                    >
                      <FileText className="w-5 h-5 mr-3 text-green-500" />
                      <span className="font-medium">Export as Excel</span>
                    </button>
                  </div>
                </div>
              )}
            </div>

            {currentEstimate.status !== 'approved' ? (
              <button
                onClick={handleMarkAsApproved}
                className="inline-flex items-center px-3 py-2 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
              >
                <Check className="w-4 h-4 mr-2" />
                Customer Approved
              </button>
            ) : (
              <button
                onClick={handleConvertToInvoice}
                disabled={currentEstimate.convertedToInvoice}
                className={`inline-flex items-center px-3 py-2 border border-transparent shadow-sm text-sm font-medium rounded-md text-white ${
                  currentEstimate.convertedToInvoice
                    ? 'bg-gray-400 cursor-not-allowed'
                    : 'bg-green-600 hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500'
                }`}
                title={currentEstimate.convertedToInvoice ? 'Already converted to invoice' : 'Convert to Invoice'}
              >
                <Receipt className="w-4 h-4 mr-2" />
                {currentEstimate.convertedToInvoice ? 'Already Invoiced' : 'Convert to Invoice'}
              </button>
            )}

            {activeTab === 'preview' && (
              <button
                onClick={() => setActiveTab('editor')}
                className="inline-flex items-center px-3 py-2 border border-gray-300 shadow-sm text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
              >
                <Edit2 className="w-4 h-4 mr-2" />
                Edit
              </button>
            )}
            
            {activeTab === 'editor' && (
              <>
                <button
                  onClick={() => setActiveTab('preview')}
                  className="inline-flex items-center px-4 py-2.5 text-sm font-semibold rounded-lg text-white bg-gradient-to-r from-green-600 to-green-700 hover:from-green-700 hover:to-green-800 shadow-md hover:shadow-lg transform hover:scale-105 transition-all duration-200 whitespace-nowrap"
                >
                  <Eye className="w-4 h-4 mr-2" />
                  Preview
                </button>

                <button
                  onClick={() => {
                    if (confirm('Clear all data and start fresh?')) {
                      localStorage.clear();
                      sessionStorage.clear();
                      window.location.href = '/estimates';
                    }
                  }}
                  className="inline-flex items-center px-3 py-2 text-sm font-medium rounded-lg text-red-600 bg-white border-2 border-red-200 hover:border-red-400 hover:bg-red-50 transition-all duration-200 whitespace-nowrap"
                  title="Clear all cached data and start fresh"
                >
                  <X className="w-4 h-4 mr-2" />
                  <span className="hidden sm:inline">Clear Data</span>
                </button>
              </>
            )}
          </div>
        ) : (
          <button 
            onClick={handleCreateFromScratch}
            className="inline-flex items-center px-4 py-2 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
          >
            <Plus className="w-4 h-4 mr-2" />
            New Estimate
          </button>
        )}
      </div>

      {showSaveSuccess && (
        <div className="fixed top-4 right-4 bg-green-100 border border-green-400 text-green-700 px-4 py-3 rounded z-50 flex items-center shadow-md">
          <Check className="w-5 h-5 mr-2" />
          <span>Estimate saved successfully!</span>
        </div>
      )}

      {activeTab === 'editor' && (
        <>
          {!currentEstimate && (
            <div className="bg-white rounded-lg shadow mb-6">
              <div className="p-6 border-b border-gray-200">
                <h2 className="text-lg font-medium text-gray-900">Your Estimates</h2>
              </div>
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Client & Project
                      </th>
                      <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Amount
                      </th>
                      <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Status
                      </th>
                      <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Date
                      </th>
                      <th scope="col" className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Actions
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {loadingEstimates ? (
                      <tr>
                        <td colSpan={5} className="px-6 py-8 text-center text-gray-500">
                          <RefreshCw className="w-6 h-6 animate-spin mx-auto mb-2" />
                          Loading estimates...
                        </td>
                      </tr>
                    ) : recentEstimates.length === 0 ? (
                      <tr>
                        <td colSpan={5} className="px-6 py-8 text-center text-gray-500">
                          No estimates yet. Create your first estimate!
                        </td>
                      </tr>
                    ) : (
                    recentEstimates.map((estimate) => (
                      <tr key={estimate.id} className="hover:bg-gray-50">
                        <td className="px-6 py-4">
                          <div className="text-sm font-medium text-gray-900">{estimate.client}</div>
                          <div className="text-sm text-gray-500">{estimate.project}</div>
                        </td>
                        <td className="px-6 py-4 text-sm text-gray-900">{estimate.amount}</td>
                        <td className="px-6 py-4">
                          <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getStatusColor(estimate.status)}`}>
                            {estimate.status}
                          </span>
                        </td>
                        <td className="px-6 py-4 text-sm text-gray-500">{estimate.date}</td>
                        <td className="px-6 py-4 text-right text-sm font-medium">
                          <div className="flex items-center justify-end space-x-3">
                            <button
                              onClick={() => handleEditEstimate(estimate.id)}
                              className="text-blue-600 hover:text-blue-900"
                              title="Edit Estimate"
                            >
                              <Edit2 className="w-4 h-4" />
                            </button>
                            <button
                              onClick={async () => {
                                const result = await estimateService.getEstimate(estimate.id);
                                if (result.success && result.data) {
                                  setCurrentEstimate(result.data);
                                  setActiveTab('preview');
                                  setTimeout(() => handleExportPDF(), 500);
                                }
                              }}
                              className="text-gray-600 hover:text-gray-900"
                              title="Download PDF"
                            >
                              <Download className="w-4 h-4" />
                            </button>
                            <button
                              onClick={() => handleDeleteEstimate(estimate.id)}
                              className="text-red-600 hover:text-red-900"
                              title="Delete Estimate"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    )))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {currentEstimate ? (
            <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
              <div className={`${showAIAssistant ? 'lg:col-span-2' : 'lg:col-span-3'}`}>
                <EstimateEditor 
                  estimate={currentEstimate}
                  onUpdateEstimate={handleUpdateEstimate}
                  onAddItem={handleAddItem}
                  onUpdateItem={handleUpdateItem}
                  onRemoveItem={handleRemoveItem}
                  onLogoUpload={handleLogoUpload}
                  clients={clients}
                  projects={projects.map(p => ({ id: p.id, name: p.name }))}
                />
                <input
                  type="file"
                  ref={fileInputRef}
                  onChange={handleFileChange}
                  accept="image/*"
                  className="hidden"
                />
              </div>
              
              {showAIAssistant && (
                <div className="lg:col-span-1">
                  <AIEstimateAssistant 
                    projectType={currentEstimate.projectId ? projects.find(p => p.id === currentEstimate.projectId)?.name || '' : ''}
                    onGenerateItems={handleAIGeneratedItems}
                    onClose={() => setShowAIAssistant(false)}
                  />
                </div>
              )}
            </div>
          ) : (
            <div className="bg-white rounded-lg shadow-md p-8 text-center">
              <p className="text-gray-500 mb-4">No estimate loaded. Please select a template or create from scratch.</p>
              <button
                onClick={handleCreateFromScratch}
                className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
              >
                Create New Estimate
              </button>
            </div>
          )}
        </>
      )}

      {activeTab === 'preview' && currentEstimate && (
        <div className="bg-white rounded-lg shadow-lg overflow-hidden">
          <div className="p-6 bg-gray-50 border-b border-gray-200">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-medium text-gray-900">Estimate Preview</h2>
              <div className="flex space-x-2">
                <button 
                  onClick={() => window.print()}
                  className="inline-flex items-center px-3 py-2 border border-gray-300 shadow-sm text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                >
                  <Printer className="w-4 h-4 mr-2" />
                  Print
                </button>
              </div>
            </div>
          </div>
          
          <div id="estimate-preview">
            <EstimatePreview estimate={currentEstimate} clients={clients} projects={projects} />
          </div>
        </div>
      )}

      {/* Send Estimate Modal */}
      <SendEstimateModal
        isOpen={showSendModal}
        onClose={() => setShowSendModal(false)}
        estimate={currentEstimate}
        companyInfo={{
          name: profile?.company_name || profile?.company || profile?.full_name || 'Your Company',
          email: profile?.email || '',
          phone: profile?.phone || '',
          address: profile?.address || ''
        }}
      />
    </div>
  );
};

export default EstimateGenerator;