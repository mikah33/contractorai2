import { useState, useRef, useEffect, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { FileText, Plus, Download, Trash2, Edit2, Image, Copy, Check, X, Settings, Palette, Layout, FileUp, FileDown, Sparkles, DollarSign, Printer, Eye, RefreshCw, Receipt, ArrowLeft, Mail, Calculator, CheckCircle, XCircle, Clock, Search } from 'lucide-react';
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
import AIChatPopup from '../components/ai/AIChatPopup';
import { Estimate, EstimateItem } from '../types/estimates';
import { estimateService } from '../services/estimateService';
import { estimateResponseService } from '../services/estimateResponseService';
import { useData } from '../contexts/DataContext';
import { usePricing } from '../contexts/PricingContext';
import { useTheme, getThemeClasses } from '../contexts/ThemeContext';

const EstimateGenerator = () => {
  const { t } = useTranslation();
  const location = useLocation();
  const navigate = useNavigate();
  const { theme } = useTheme();
  const themeClasses = getThemeClasses(theme);
  const { profile } = useData();
  const { getPendingCalculatorImport, clearPendingCalculatorImport } = usePricing();
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
  const [estimateResponses, setEstimateResponses] = useState<Map<string, any>>(new Map());
  const [searchQuery, setSearchQuery] = useState('');
  const [showAIEditChat, setShowAIEditChat] = useState(false);
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
  
  // Check if editing a specific estimate (from EstimatesHub)
  useEffect(() => {
    const loadEstimateForEdit = async () => {
      if (location.state?.editEstimateId) {
        console.log('Loading estimate for edit:', location.state.editEstimateId);
        try {
          const result = await estimateService.getEstimate(location.state.editEstimateId);
          if (result.success && result.data) {
            const est = result.data;
            const estimateToEdit = {
              id: est.id,
              title: est.title || 'Untitled Estimate',
              clientName: est.client_name || '',
              projectName: est.project_name || '',
              status: est.status || 'draft',
              createdAt: est.created_at || new Date().toISOString(),
              expiresAt: est.expires_at || new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
              items: est.items || [],
              subtotal: est.subtotal || 0,
              taxRate: est.tax_rate || 0,
              taxAmount: est.tax_amount || 0,
              total: est.total || 0,
              notes: est.notes || '',
              terms: est.terms || 'Valid for 30 days from the date of issue.'
            };
            setCurrentEstimate(estimateToEdit);
            setActiveTab('editor');
            // Clear the state to prevent re-loading on refresh
            window.history.replaceState({}, document.title);
          }
        } catch (error) {
          console.error('Error loading estimate for edit:', error);
        }
      }
    };
    loadEstimateForEdit();
  }, [location.state?.editEstimateId]);

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
  
  // Check for pending calculator import on mount
  useEffect(() => {
    const handleCalculatorImport = () => {
      const pendingImport = getPendingCalculatorImport();

      if (pendingImport && !currentEstimate) {
        console.log('Found pending calculator import:', pendingImport);

        // Convert CalculationResult[] to EstimateItem[]
        const items: EstimateItem[] = pendingImport.results
          .filter(result => result.cost && result.cost > 0) // Only include items with costs
          .map((result, index) => ({
            id: `calc-item-${Date.now()}-${index}`,
            description: result.label,
            quantity: result.value,
            unit: result.unit,
            unitPrice: result.cost ? result.cost / result.value : 0,
            totalPrice: result.cost || 0,
            type: 'material' as const
          }));

        // Calculate totals
        const subtotal = items.reduce((sum, item) => sum + item.totalPrice, 0);
        const taxRate = 0;
        const taxAmount = 0;
        const total = subtotal;

        // Create new estimate from calculator results
        // Format trade name properly (remove 'trades.' prefix and capitalize)
        const tradeName = pendingImport.trade
          .replace(/^trades\./, '')
          .split(/(?=[A-Z])/)
          .join(' ')
          .replace(/^\w/, c => c.toUpperCase());

        const calculatorEstimate: Estimate = {
          id: generateUUID(),
          title: `${tradeName} Estimate`,
          clientName: '',
          projectName: '',
          status: 'draft',
          createdAt: new Date().toISOString(),
          expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
          items,
          subtotal,
          taxRate,
          taxAmount,
          total,
          notes: `Generated from ${pendingImport.trade} calculator`,
          terms: profile?.default_terms || 'Valid for 30 days from the date of issue.',
          branding: {
            logo: profile?.logo_url || '',
            primaryColor: '#3B82F6',
            fontFamily: 'Inter'
          }
        };

        setCurrentEstimate(calculatorEstimate);
        setActiveTab('editor');

        // Clear the pending import
        clearPendingCalculatorImport();

        // Show success message
        alert(`Successfully imported ${items.length} items from ${pendingImport.trade} calculator!`);
      }
    };

    handleCalculatorImport();
  }, []); // Only run on mount

  // Fetch projects, clients, and estimates on component mount
  useEffect(() => {
    console.log('EstimateGenerator mounted, fetching data...');
    fetchProjects();
    fetchClients();
    fetchEstimates();
    fetchEstimatesFromStore();
  }, []);
  
  // Fetch estimate responses from database
  const fetchEstimateResponses = async () => {
    try {
      const responses = await estimateResponseService.getAllResponsesForUser();
      const responseMap = new Map();
      responses.forEach((response: any) => {
        responseMap.set(response.estimate_id, response);
      });
      setEstimateResponses(responseMap);
    } catch (error) {
      console.error('Error fetching estimate responses:', error);
    }
  };

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
          date: new Date(est.createdAt).toLocaleDateString(),
          calculatorType: est.calculatorType,
          calculatorData: est.calculatorData
        }));
        setRecentEstimates(transformedEstimates);
      }

      // Also fetch response statuses
      await fetchEstimateResponses();
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
      const confirmLeave = window.confirm(t('estimates.unsavedChanges'));
      if (!confirmLeave) {
        return;
      }
    }

    // Check if we should return to a specific page (e.g., projects-hub)
    if (location.state?.returnTo) {
      navigate(location.state.returnTo, {
        state: location.state.returnProjectId ? { selectedProjectId: location.state.returnProjectId } : undefined
      });
      return;
    }

    // Go back to estimates hub
    navigate('/estimates-hub');
  };

  const handleRecalculate = (estimate: any) => {
    if (!estimate.calculatorType) {
      alert('This estimate was not created with a calculator');
      return;
    }
    // Navigate to pricing calculator with calculator type and estimate ID
    navigate(`/pricing?calculator=${estimate.calculatorType}&estimateId=${estimate.id}`);
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
    if (!confirm(t('estimates.deleteConfirm'))) return;
    
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
        console.log('🔄 Auto-saving estimate...', {
          id: estimateWithTotals.id,
          total: estimateWithTotals.total
        });

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

        console.log('✅ Auto-save completed');

        // Reset unsaved changes flag after successful save
        initialEstimateRef.current = currentState;
        setHasUnsavedChanges(false);
      } catch (error: any) {
        console.error('❌ Error auto-saving estimate:', error);
        console.error('Auto-save error details:', {
          message: error?.message,
          code: error?.code
        });
        // Keep unsaved changes flag set on error
        setHasUnsavedChanges(true);
      }
    } else {
      console.warn('⚠️ Cannot auto-save: estimate has no ID');
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
    if (!currentEstimate) {
      console.error('❌ No estimate to save');
      return;
    }

    console.log('💾 Starting estimate save...', {
      id: currentEstimate.id,
      title: currentEstimate.title,
      total: currentEstimate.total
    });

    setIsGenerating(true);

    try {
      // Prepare the estimate data
      const estimateData = {
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
      };

      console.log('📝 Estimate data prepared:', estimateData);

      // Use updateEstimate which handles both insert and update
      await updateEstimate(currentEstimate.id, estimateData);

      console.log('✅ Database operation completed');

      // Verify the save by fetching the estimate back
      const result = await estimateService.getEstimate(currentEstimate.id);

      if (result.success && result.data) {
        console.log('✅ Estimate verified in database:', result.data);

        // Update local state with saved data
        setCurrentEstimate(result.data);
        initialEstimateRef.current = JSON.stringify(result.data);
        setHasUnsavedChanges(false);

        // Show success message
        setShowSaveSuccess(true);
        console.log('✅ Estimate saved successfully to Supabase!');

        // Refresh the estimates list
        await fetchEstimates();

        setTimeout(() => {
          setShowSaveSuccess(false);
        }, 3000);
      } else {
        throw new Error('Failed to verify estimate save: ' + (result.error?.message || 'Unknown error'));
      }

      setIsGenerating(false);
    } catch (error: any) {
      setIsGenerating(false);
      console.error('❌ Error saving estimate:', error);
      console.error('Error details:', {
        message: error?.message,
        code: error?.code,
        details: error?.details
      });
      alert(`Error saving estimate: ${error?.message || 'Unknown error'}`);
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

  const getResponseStatusBadge = (estimateId: string) => {
    const response = estimateResponses.get(estimateId);

    if (!response) {
      return null; // No email sent yet
    }

    if (response.accepted === true) {
      return (
        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800 ml-2">
          <CheckCircle className="w-3 h-3 mr-1" />
          Customer Approved
        </span>
      );
    }

    if (response.declined === true) {
      return (
        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-800 ml-2">
          <XCircle className="w-3 h-3 mr-1" />
          Customer Declined
        </span>
      );
    }

    // Sent but no response yet
    return (
      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800 ml-2">
        <Clock className="w-3 h-3 mr-1" />
        Pending Response
      </span>
    );
  };

  // Filter estimates based on search query
  const filteredEstimates = useMemo(() => {
    if (!searchQuery.trim()) {
      return recentEstimates;
    }

    const query = searchQuery.toLowerCase().trim();
    return recentEstimates.filter(estimate => {
      // Search by estimate ID
      if (estimate.id.toLowerCase().includes(query)) {
        return true;
      }
      // Also search by client name, project name, or amount
      if (estimate.client.toLowerCase().includes(query)) {
        return true;
      }
      if (estimate.project.toLowerCase().includes(query)) {
        return true;
      }
      if (estimate.amount.toLowerCase().includes(query)) {
        return true;
      }
      return false;
    });
  }, [recentEstimates, searchQuery]);

  return (
    <div className={`min-h-full ${themeClasses.bg.primary} pb-24`}>
      {/* Header */}
      <div className={`${themeClasses.bg.secondary} border-b ${themeClasses.border.primary} px-4 pb-4 pt-[calc(env(safe-area-inset-top)+16px)] sticky top-0 z-10`}>
        <div className="flex items-center justify-between mb-4">
          <div className="flex-1">
            <div className="flex items-center gap-3">
              {currentEstimate && (
                <button
                  onClick={handleBack}
                  className={`p-2 ${themeClasses.text.secondary} hover:${themeClasses.text.primary} hover:bg-orange-500/10 rounded-md transition-colors`}
                  title="Back to Estimates List"
                >
                  <ArrowLeft className="w-5 h-5" />
                </button>
              )}
              <div className="w-10 h-10 bg-orange-500/20 rounded-lg flex items-center justify-center">
                <FileText className="w-5 h-5 text-orange-500" />
              </div>
              <div>
                <h1 className={`text-xl font-bold ${themeClasses.text.primary}`}>{t('estimates.title')}</h1>
                <p className={`text-sm ${themeClasses.text.secondary}`}>{t('estimates.subtitle')}</p>
              </div>
            </div>
          </div>
          <button
            onClick={() => navigate('/settings')}
            className="w-10 h-10 bg-orange-500/20 rounded-lg flex items-center justify-center hover:bg-orange-500/30 transition-colors border border-orange-500/40"
          >
            <Settings className="w-5 h-5 text-orange-500" />
          </button>
        </div>
      </div>

      <div className="px-4 py-4 space-y-4">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
          <div></div>
        
        {currentEstimate ? (
          <div className="flex flex-wrap items-center gap-2 w-full sm:w-auto">
            {/* Send to Customer Button */}
            <button
              onClick={() => setShowSendModal(true)}
              className="flex-1 sm:flex-none inline-flex items-center justify-center px-4 py-2.5 text-sm font-semibold rounded-lg text-white bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 shadow-lg transition-all duration-200"
            >
              <Mail className="w-4 h-4 mr-2" />
              Send to Customer
            </button>

            {/* Convert to Invoice Button - always show but disabled if not approved or already converted */}
            <button
              onClick={handleConvertToInvoice}
              disabled={currentEstimate.status !== 'approved' || currentEstimate.convertedToInvoice}
              className={`flex-1 sm:flex-none inline-flex items-center justify-center px-4 py-2.5 text-sm font-semibold rounded-lg shadow-md transition-all duration-200 ${
                currentEstimate.convertedToInvoice
                  ? 'bg-gray-400 text-white cursor-not-allowed'
                  : currentEstimate.status === 'approved'
                    ? 'bg-gradient-to-r from-green-600 to-green-700 hover:from-green-700 hover:to-green-800 text-white'
                    : 'bg-gray-200 text-gray-500 cursor-not-allowed'
              }`}
              title={
                currentEstimate.convertedToInvoice
                  ? 'Already converted to invoice'
                  : currentEstimate.status !== 'approved'
                    ? 'Estimate must be approved first'
                    : 'Convert to Invoice'
              }
            >
              <Receipt className="w-4 h-4 mr-2" />
              {currentEstimate.convertedToInvoice ? 'Already Invoiced' : 'Convert to Invoice'}
            </button>
          </div>
        ) : (
          <button
            onClick={handleCreateFromScratch}
            className="inline-flex items-center px-4 py-2 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
          >
            <Plus className="w-4 h-4 mr-2" />
            {t('estimates.newEstimate')}
          </button>
        )}
      </div>

      {showSaveSuccess && (
        <div className="fixed top-4 right-4 bg-green-100 border border-green-400 text-green-700 px-4 py-3 rounded z-50 flex items-center shadow-md">
          <Check className="w-5 h-5 mr-2" />
          <span>{t('estimates.savedSuccessfully')}</span>
        </div>
      )}

      {activeTab === 'editor' && (
        <>
          {!currentEstimate && (
            <div className="bg-[#1C1C1E] rounded-lg shadow mb-6">
              <div className="p-6 border-b border-white/10">
                <div className="flex items-center justify-between mb-4">
                  <h2 className="text-lg font-medium text-white">{t('estimates.yourEstimates')}</h2>
                </div>
                {/* Search Bar */}
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <Search className="h-5 w-5 text-gray-400" />
                  </div>
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="block w-full pl-10 pr-3 py-2 border border-white/20 rounded-md leading-5 bg-[#2C2C2E] text-white placeholder-gray-400 focus:outline-none focus:placeholder-gray-500 focus:ring-1 focus:ring-orange-500 focus:border-orange-500 sm:text-sm"
                    placeholder="Search by Estimate ID, Client, Project, or Amount..."
                  />
                  {searchQuery && (
                    <button
                      onClick={() => setSearchQuery('')}
                      className="absolute inset-y-0 right-0 pr-3 flex items-center"
                    >
                      <X className="h-5 w-5 text-gray-400 hover:text-white" />
                    </button>
                  )}
                </div>
              </div>
              <div className="p-4">
                {loadingEstimates ? (
                  <div className="py-8 text-center text-gray-400">
                    <RefreshCw className="w-6 h-6 animate-spin mx-auto mb-2" />
                    Loading estimates...
                  </div>
                ) : filteredEstimates.length === 0 ? (
                  <div className="py-8 text-center text-gray-400">
                    {searchQuery ? (
                      <>
                        No estimates found matching "{searchQuery}"
                        <button
                          onClick={() => setSearchQuery('')}
                          className="block mx-auto mt-2 text-orange-500 hover:text-orange-400"
                        >
                          Clear search
                        </button>
                      </>
                    ) : (
                      t('estimates.noEstimatesYet')
                    )}
                  </div>
                ) : (
                  <div className="space-y-3">
                    {filteredEstimates.map((estimate) => (
                      <div
                        key={estimate.id}
                        className="flex items-center justify-between p-4 bg-[#2C2C2E] border border-white/10 rounded-lg hover:border-orange-500/50 hover:shadow-md transition-all duration-200"
                      >
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-1">
                            <h3 className="text-sm font-semibold text-white truncate">
                              {estimate.project || estimate.client || 'Untitled Estimate'}
                            </h3>
                            {getResponseStatusBadge(estimate.id)}
                          </div>
                          <div className="flex items-center gap-3 text-xs text-gray-400">
                            <span>{estimate.amount}</span>
                            <span>•</span>
                            <span className={`inline-flex items-center px-2 py-0.5 rounded-full font-medium ${getStatusColor(estimate.status)}`}>
                              {estimate.status}
                            </span>
                            {estimate.calculatorType && (
                              <>
                                <span>•</span>
                                <span className="inline-flex items-center">
                                  <Calculator className="w-3 h-3 mr-1" />
                                  {estimate.calculatorType}
                                </span>
                              </>
                            )}
                          </div>
                        </div>
                        <button
                          onClick={() => handleEditEstimate(estimate.id)}
                          className="ml-4 flex-shrink-0 inline-flex items-center px-4 py-2 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 rounded-lg transition-colors"
                        >
                          <Edit2 className="w-4 h-4 mr-2" />
                          Edit
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}

          {currentEstimate ? (
            <>
              {/* Edit with AI Banner */}
              <div className="bg-gradient-to-r from-orange-50 to-amber-50 rounded-lg shadow-md p-4 sm:p-6 mb-6 border-2 border-orange-200">
                <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                  <div className="flex items-start gap-3 sm:gap-4 w-full sm:w-auto">
                    <div className="bg-gradient-to-r from-orange-500 to-amber-500 rounded-full p-2 sm:p-3 flex-shrink-0">
                      <Sparkles className="w-5 h-5 sm:w-6 sm:h-6 text-white" />
                    </div>
                    <div className="flex-1">
                      <h3 className="text-base sm:text-lg font-semibold text-gray-900">Edit This Estimate with AI</h3>
                      <p className="text-xs sm:text-sm text-gray-600 mt-1">Let AI help you modify line items, adjust pricing, add materials, or make changes to this estimate</p>
                    </div>
                  </div>
                  <button
                    onClick={() => setShowAIEditChat(true)}
                    className="w-full sm:w-auto inline-flex items-center justify-center px-4 sm:px-6 py-2.5 sm:py-3 text-xs sm:text-sm font-semibold rounded-lg text-white bg-gradient-to-r from-orange-500 to-amber-500 hover:from-orange-600 hover:to-amber-600 shadow-lg hover:shadow-xl transform hover:scale-105 transition-all duration-200 whitespace-nowrap"
                  >
                    <Sparkles className="w-4 h-4 sm:w-5 sm:h-5 mr-2" />
                    Edit with AI
                  </button>
                </div>
              </div>

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
            </>
          ) : (
            <>
              {/* Calculate Job Cost Card for Empty State */}
              <div className="bg-gradient-to-r from-blue-50 to-purple-50 rounded-lg shadow-lg p-8 mb-6 border-2 border-blue-200">
                <div className="text-center">
                  <div className="bg-blue-600 rounded-full p-4 w-16 h-16 mx-auto mb-4 flex items-center justify-center">
                    <Calculator className="w-8 h-8 text-white" />
                  </div>
                  <h3 className="text-xl font-bold text-gray-900 mb-2">Start with Job Cost Calculations</h3>
                  <p className="text-gray-600 mb-6 max-w-2xl mx-auto">
                    Use our professional calculators to quickly estimate material and labor costs for roofing, concrete, HVAC, plumbing, and 17+ other trades. Your calculations will automatically create a new estimate.
                  </p>
                  <button
                    onClick={() => navigate('/pricing', { state: { fromEstimate: true } })}
                    className="inline-flex items-center px-8 py-4 text-lg font-semibold rounded-lg text-white bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 shadow-lg hover:shadow-xl transform hover:scale-105 transition-all duration-200"
                  >
                    <Calculator className="w-6 h-6 mr-3" />
                    Calculate Job Cost
                  </button>
                </div>
              </div>
            </>
          )}
        </>
      )}

      {activeTab === 'preview' && currentEstimate && (
        <div className="bg-white rounded-lg shadow-lg overflow-hidden">
          <div className="p-6 bg-gray-50 border-b border-gray-200">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-medium text-gray-900">Estimate Preview</h2>
            </div>
          </div>
          
          <div id="estimate-preview">
            <EstimatePreview estimate={currentEstimate} clients={clients} projects={projects} hideStatus={true} />
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
        activeTab={activeTab}
        setActiveTab={setActiveTab}
      />

      {/* AI Edit Chat Popup */}
      <AIChatPopup
        isOpen={showAIEditChat}
        onClose={() => setShowAIEditChat(false)}
        mode="estimating"
        initialContext={currentEstimate ? {
          estimateId: currentEstimate.id,
          title: currentEstimate.title,
          clientName: currentEstimate.clientName,
          projectName: currentEstimate.projectName,
          items: currentEstimate.items,
          subtotal: currentEstimate.subtotal,
          taxRate: currentEstimate.taxRate,
          taxAmount: currentEstimate.taxAmount,
          total: currentEstimate.total,
          notes: currentEstimate.notes
        } : undefined}
      />
      </div>
    </div>
  );
};

export default EstimateGenerator;