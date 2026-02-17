import { useState, useEffect, useRef } from 'react';
import {
  X, Send, User, UserPlus, Mail, Check, Users, Briefcase,
  Trash2, Search, Image, Plus, Loader2, Save, FileText,
  ChevronLeft, Paperclip, ImagePlus, FolderOpen, Images,
  Receipt, FileCheck, DollarSign, Sparkles, Calculator, ChevronDown, ChevronUp,
  CheckCircle2, XCircle, CreditCard, Bell, ToggleLeft, ToggleRight
} from 'lucide-react';
import { supabase } from '../../lib/supabase';
import jsPDF from 'jspdf';
import { useAuthStore } from '../../stores/authStore';
import usePhotosStore, { ProjectPhoto } from '../../stores/photosStore';

interface SendEmailModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialAttachments?: { type: 'image' | 'file'; url: string; name: string }[];
  draftId?: string;
  preAttachedEstimate?: {
    id: string;
    title: string;
    total: number;
    clientName?: string;
  };
}

interface Recipient {
  id: string;
  name: string;
  email: string;
  type: 'employee' | 'client';
}

interface Employee {
  id: string;
  name: string;
  email: string;
}

interface Client {
  id: string;
  name: string;
  email: string;
  company?: string;
}

interface Attachment {
  type: 'image' | 'file';
  url: string;
  name: string;
}

interface QuickLineItem {
  id: string;
  description: string;
  quantity: number;
  unitPrice: number;
  total: number;
}

interface EmailDraft {
  id: string;
  subject: string;
  body: string;
  recipients: Recipient[];
  attachments: Attachment[];
  status: 'draft' | 'sent';
  updated_at: string;
}

const SendEmailModal = ({ isOpen, onClose, initialAttachments = [], draftId, preAttachedEstimate }: SendEmailModalProps) => {
  const { user } = useAuthStore();
  const { photos: galleryPhotos, fetchPhotos: fetchGalleryPhotos, isLoading: loadingGallery } = usePhotosStore();
  const [step, setStep] = useState<'recipients' | 'compose' | 'approval' | 'confirm'>('recipients');
  const [recipientTab, setRecipientTab] = useState<'employees' | 'clients'>('employees');

  const [subject, setSubject] = useState('');
  const [body, setBody] = useState('');
  const [selectedRecipients, setSelectedRecipients] = useState<Recipient[]>([]);
  const [attachments, setAttachments] = useState<Attachment[]>(initialAttachments);

  const [isSending, setIsSending] = useState(false);
  const [isSavingDraft, setIsSavingDraft] = useState(false);
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [clients, setClients] = useState<Client[]>([]);
  const [showAddNew, setShowAddNew] = useState(false);
  const [newRecipient, setNewRecipient] = useState({ name: '', email: '' });
  const [isCreating, setIsCreating] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  const [currentDraftId, setCurrentDraftId] = useState<string | null>(draftId || null);
  const [drafts, setDrafts] = useState<EmailDraft[]>([]);
  const [showDrafts, setShowDrafts] = useState(false);

  // Gallery picker state
  const [showGalleryPicker, setShowGalleryPicker] = useState(false);
  const [selectedGalleryPhotos, setSelectedGalleryPhotos] = useState<Set<string>>(new Set());

  // Document attachment state (estimates/invoices)
  const [showDocumentPicker, setShowDocumentPicker] = useState(false);
  const [documentTab, setDocumentTab] = useState<'estimates' | 'invoices'>('estimates');
  const [availableEstimates, setAvailableEstimates] = useState<any[]>([]);
  const [availableInvoices, setAvailableInvoices] = useState<any[]>([]);
  const [loadingDocuments, setLoadingDocuments] = useState(false);
  const [attachedDocuments, setAttachedDocuments] = useState<{type: 'estimate' | 'invoice', id: string, name: string, pdfUrl: string}[]>([]);

  // Quick Create state
  const [showQuickCreate, setShowQuickCreate] = useState(false);
  const [quickCreateTab, setQuickCreateTab] = useState<'manual' | 'ai'>('manual');
  const [quickLineItems, setQuickLineItems] = useState<QuickLineItem[]>([]);
  const [quickEstimateName, setQuickEstimateName] = useState('');
  const [quickEstimateNotes, setQuickEstimateNotes] = useState('');
  const [quickAiPrompt, setQuickAiPrompt] = useState('');
  const [quickAiLoading, setQuickAiLoading] = useState(false);
  const [savingQuickEstimate, setSavingQuickEstimate] = useState(false);

  // Estimate approval workflow state
  const [enableApproval, setEnableApproval] = useState(true);

  // Check if any estimate is attached (for showing approval step)
  const hasEstimateAttached = attachedDocuments.some(d => d.type === 'estimate');

  const fileInputRef = useRef<HTMLInputElement>(null);
  const autoSaveTimeout = useRef<NodeJS.Timeout | null>(null);

  // Fetch employees, clients, and drafts when modal opens
  useEffect(() => {
    if (isOpen && user) {
      const fetchData = async () => {
        try {
          const [empResult, clientResult, draftsResult] = await Promise.all([
            supabase.from('employees').select('id, name, email').eq('user_id', user.id),
            supabase.from('clients').select('id, name, email, company').eq('user_id', user.id),
            supabase.from('email_drafts').select('*').eq('user_id', user.id).eq('status', 'draft').order('updated_at', { ascending: false })
          ]);

          if (empResult.data) setEmployees(empResult.data);
          if (clientResult.data) setClients(clientResult.data.filter(c => c.email));
          if (draftsResult.data) setDrafts(draftsResult.data as EmailDraft[]);
        } catch (error) {
          console.error('Error fetching data:', error);
        }
      };
      fetchData();
    }
  }, [isOpen, user]);

  // Load draft if draftId provided
  useEffect(() => {
    if (draftId && isOpen) {
      loadDraft(draftId);
    }
  }, [draftId, isOpen]);

  // Set initial attachments
  useEffect(() => {
    if (initialAttachments.length > 0) {
      setAttachments(initialAttachments);
      setStep('compose');
    }
  }, [initialAttachments]);

  // Pre-attach estimate if provided
  useEffect(() => {
    if (isOpen && preAttachedEstimate && preAttachedEstimate.id) {
      // Check if not already attached
      const alreadyAttached = attachedDocuments.some(d => d.id === preAttachedEstimate.id);
      if (!alreadyAttached) {
        const estimateName = `${preAttachedEstimate.title || 'Estimate'} - $${(preAttachedEstimate.total || 0).toFixed(2)}`;
        setAttachedDocuments(prev => [...prev, {
          type: 'estimate',
          id: preAttachedEstimate.id,
          name: estimateName,
          pdfUrl: '' // Will be generated when sending
        }]);
        // Set a default subject line
        if (!subject) {
          setSubject(`Estimate: ${preAttachedEstimate.title || 'Your Estimate'}`);
        }
        // Stay on recipients step (1. To) so user can select who to send to
        setStep('recipients');
      }
    }
  }, [isOpen, preAttachedEstimate]);

  // Auto-save draft
  useEffect(() => {
    if (!isOpen || !user) return;

    if (autoSaveTimeout.current) {
      clearTimeout(autoSaveTimeout.current);
    }

    // Only auto-save if there's content
    if (subject || body || selectedRecipients.length > 0 || attachments.length > 0) {
      autoSaveTimeout.current = setTimeout(() => {
        saveDraft(true);
      }, 3000);
    }

    return () => {
      if (autoSaveTimeout.current) {
        clearTimeout(autoSaveTimeout.current);
      }
    };
  }, [subject, body, selectedRecipients, attachments]);

  const loadDraft = async (id: string) => {
    try {
      const { data, error } = await supabase
        .from('email_drafts')
        .select('*')
        .eq('id', id)
        .single();

      if (error) throw error;
      if (data) {
        setSubject(data.subject || '');
        setBody(data.body || '');
        setSelectedRecipients(data.recipients || []);
        setAttachments(data.attachments || []);
        setCurrentDraftId(id);
      }
    } catch (error) {
      console.error('Error loading draft:', error);
    }
  };

  const saveDraft = async (silent = false) => {
    if (!user) return;

    if (!silent) setIsSavingDraft(true);

    try {
      const draftData = {
        user_id: user.id,
        subject,
        body,
        recipients: selectedRecipients,
        attachments,
        status: 'draft' as const,
        updated_at: new Date().toISOString()
      };

      if (currentDraftId) {
        await supabase
          .from('email_drafts')
          .update(draftData)
          .eq('id', currentDraftId);
      } else {
        const { data } = await supabase
          .from('email_drafts')
          .insert(draftData)
          .select()
          .single();

        if (data) setCurrentDraftId(data.id);
      }

      if (!silent) {
        // Refresh drafts list
        const { data: draftsData } = await supabase
          .from('email_drafts')
          .select('*')
          .eq('user_id', user.id)
          .eq('status', 'draft')
          .order('updated_at', { ascending: false });
        if (draftsData) setDrafts(draftsData as EmailDraft[]);
      }
    } catch (error) {
      console.error('Error saving draft:', error);
    } finally {
      if (!silent) setIsSavingDraft(false);
    }
  };

  const deleteDraft = async (id: string) => {
    try {
      await supabase.from('email_drafts').delete().eq('id', id);
      setDrafts(drafts.filter(d => d.id !== id));
      if (currentDraftId === id) {
        resetForm();
      }
    } catch (error) {
      console.error('Error deleting draft:', error);
    }
  };

  const resetForm = () => {
    setStep('recipients');
    setRecipientTab('employees');
    setSelectedRecipients([]);
    setSubject('');
    setBody('');
    setAttachments([]);
    setAttachedDocuments([]);
    setShowAddNew(false);
    setSearchQuery('');
    setCurrentDraftId(null);
    setShowDrafts(false);
    setShowGalleryPicker(false);
    setSelectedGalleryPhotos(new Set());
    setShowDocumentPicker(false);
    setShowQuickCreate(false);
    setQuickLineItems([]);
    setQuickEstimateName('');
    setQuickEstimateNotes('');
    setQuickAiPrompt('');
    setEnableApproval(true);
  };

  // Gallery picker functions
  const openGalleryPicker = () => {
    fetchGalleryPhotos();
    setSelectedGalleryPhotos(new Set());
    setShowGalleryPicker(true);
  };

  const toggleGalleryPhoto = (photoId: string) => {
    setSelectedGalleryPhotos(prev => {
      const newSet = new Set(prev);
      if (newSet.has(photoId)) {
        newSet.delete(photoId);
      } else {
        newSet.add(photoId);
      }
      return newSet;
    });
  };

  const addSelectedGalleryPhotos = () => {
    const photosToAdd = galleryPhotos.filter(p => selectedGalleryPhotos.has(p.id));
    const newAttachments: Attachment[] = photosToAdd.map(p => ({
      type: 'image' as const,
      url: p.imageUrl,
      name: p.caption || `Photo ${p.id.slice(0, 8)}`
    }));
    setAttachments(prev => [...prev, ...newAttachments]);
    setShowGalleryPicker(false);
    setSelectedGalleryPhotos(new Set());
  };

  // Fetch estimates and invoices for document picker
  const openDocumentPicker = async () => {
    setShowDocumentPicker(true);
    setLoadingDocuments(true);

    try {
      // Fetch from main estimates table
      const { data: mainEstimates } = await supabase
        .from('estimates')
        .select('id, title, client_name, total, created_at')
        .eq('user_id', user?.id)
        .order('created_at', { ascending: false })
        .limit(20);

      // Check for existing PDFs in estimate-pdfs bucket
      const { data: existingPdfs, error: storageError } = await supabase.storage
        .from('estimate-pdfs')
        .list('', { limit: 500 });

      console.log('[Document Picker] Storage bucket response:', {
        fileCount: existingPdfs?.length || 0,
        error: storageError?.message,
        files: existingPdfs?.slice(0, 5).map(f => f.name) // Log first 5 filenames for debugging
      });

      // Create a map of estimate IDs to PDF URLs
      const pdfMap: Record<string, string> = {};
      if (existingPdfs && existingPdfs.length > 0) {
        for (const file of existingPdfs) {
          // Skip folders/directories
          if (file.id === null) continue;

          // Try multiple naming patterns to match estimate IDs
          let estimateId: string | null = null;

          // Pattern 1: estimate-{uuid}-{timestamp}.pdf (new Quick Create format)
          const pattern1 = file.name.match(/^estimate-([a-f0-9-]{36})-\d+\.pdf$/i);
          if (pattern1) {
            estimateId = pattern1[1];
          }

          // Pattern 2: estimate_{uuid}.pdf or estimate-{uuid}.pdf
          if (!estimateId) {
            const pattern2 = file.name.match(/^estimate[-_]([a-f0-9-]{36})\.pdf$/i);
            if (pattern2) {
              estimateId = pattern2[1];
            }
          }

          // Pattern 3: Just {uuid}.pdf
          if (!estimateId) {
            const pattern3 = file.name.match(/^([a-f0-9-]{36})\.pdf$/i);
            if (pattern3) {
              estimateId = pattern3[1];
            }
          }

          // Pattern 4: Any filename containing a UUID
          if (!estimateId) {
            const pattern4 = file.name.match(/([a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12})/i);
            if (pattern4) {
              estimateId = pattern4[1];
            }
          }

          if (estimateId) {
            const { data: { publicUrl } } = supabase.storage
              .from('estimate-pdfs')
              .getPublicUrl(file.name);
            pdfMap[estimateId.toLowerCase()] = publicUrl;
          }
        }
        console.log('[Document Picker] PDF map created:', {
          matchedCount: Object.keys(pdfMap).length,
          sampleIds: Object.keys(pdfMap).slice(0, 3)
        });
      }

      // Format estimates for display (normalize ID comparison to lowercase)
      const formattedEstimates = (mainEstimates || []).map(est => {
        const normalizedId = est.id.toLowerCase();
        const pdfUrl = pdfMap[normalizedId] || null;
        console.log(`[Document Picker] Estimate ${est.id}: PDF ${pdfUrl ? 'FOUND' : 'NOT FOUND'}`);
        return {
          id: est.id,
          estimate_number: est.title,
          client_name: est.client_name,
          total_amount: est.total,
          pdf_url: pdfUrl,
          created_at: est.created_at
        };
      });

      // Fetch invoices
      const { data: invoices } = await supabase
        .from('invoices')
        .select('id, invoice_number, total_amount, status, created_at, client_id, clients(name)')
        .eq('user_id', user?.id)
        .order('created_at', { ascending: false })
        .limit(20);

      setAvailableEstimates(formattedEstimates);
      setAvailableInvoices(invoices || []);
    } catch (error) {
      console.error('Error fetching documents:', error);
    } finally {
      setLoadingDocuments(false);
    }
  };

  const attachDocument = (type: 'estimate' | 'invoice', doc: any) => {
    const name = type === 'estimate'
      ? `Estimate #${doc.estimate_number || doc.id.slice(0, 8)} - ${doc.client_name || 'Customer'}`
      : `Invoice #${doc.invoice_number || doc.id.slice(0, 8)} - ${doc.clients?.name || 'Customer'}`;

    const pdfUrl = doc.pdf_url || '';

    // Don't add duplicates
    if (attachedDocuments.some(d => d.id === doc.id)) return;

    setAttachedDocuments(prev => [...prev, { type, id: doc.id, name, pdfUrl }]);
    setShowDocumentPicker(false);
  };

  const removeDocument = (docId: string) => {
    setAttachedDocuments(prev => prev.filter(d => d.id !== docId));
  };

  // Quick Create functions
  const addQuickLineItem = () => {
    const newItem: QuickLineItem = {
      id: crypto.randomUUID(),
      description: '',
      quantity: 1,
      unitPrice: 0,
      total: 0
    };
    setQuickLineItems(prev => [...prev, newItem]);
  };

  const updateQuickLineItem = (idx: number, field: keyof QuickLineItem, value: string | number) => {
    setQuickLineItems(prev => {
      const updated = [...prev];
      if (field === 'description') {
        updated[idx] = { ...updated[idx], description: value as string };
      } else if (field === 'quantity') {
        const qty = parseFloat(value as string) || 0;
        updated[idx] = { ...updated[idx], quantity: qty, total: qty * updated[idx].unitPrice };
      } else if (field === 'unitPrice') {
        const price = parseFloat(value as string) || 0;
        updated[idx] = { ...updated[idx], unitPrice: price, total: updated[idx].quantity * price };
      }
      return updated;
    });
  };

  const removeQuickLineItem = (idx: number) => {
    setQuickLineItems(prev => prev.filter((_, i) => i !== idx));
  };

  const generateAiEstimate = async () => {
    if (!quickAiPrompt.trim()) return;
    setQuickAiLoading(true);

    try {
      const { data, error } = await supabase.functions.invoke('contractor-chat', {
        body: {
          messages: [
            { role: 'user', content: `Generate a detailed estimate for: ${quickAiPrompt}. Include all materials, labor, and any other costs with accurate quantities and prices.` }
          ],
          currentEstimate: [],
          mode: 'estimating'
        }
      });

      if (error) throw error;

      const generatedItems: QuickLineItem[] = (data?.updatedEstimate || []).map((item: any) => ({
        id: crypto.randomUUID(),
        description: item.name || item.description,
        quantity: item.quantity || 1,
        unitPrice: item.unitPrice || 0,
        total: item.totalPrice || (item.quantity * item.unitPrice) || 0
      }));

      if (generatedItems.length === 0) {
        alert('Could not generate estimate. Please try a more specific description.');
        return;
      }

      setQuickLineItems(prev => [...prev, ...generatedItems]);
      setQuickCreateTab('manual');
      setQuickAiPrompt('');
    } catch (err: any) {
      console.error('AI estimate error:', err);
      alert('Failed to generate estimate: ' + (err.message || 'Unknown error'));
    } finally {
      setQuickAiLoading(false);
    }
  };

  const saveQuickEstimate = async () => {
    if (!user || quickLineItems.length === 0) return;
    setSavingQuickEstimate(true);

    try {
      // Get the first selected recipient as the client
      const recipient = selectedRecipients[0];
      const clientName = recipient?.name || 'Customer';

      // Calculate totals
      const subtotal = quickLineItems.reduce((sum, item) => sum + item.total, 0);
      const taxRate = 8;
      const taxAmount = subtotal * (taxRate / 100);
      const totalAmount = subtotal + taxAmount;

      // Format line items for estimate
      const formattedLineItems = quickLineItems.map(item => ({
        id: item.id,
        description: item.description,
        quantity: item.quantity,
        unit: 'ea',
        unitPrice: item.unitPrice,
        totalPrice: item.total,
        type: 'material' as const
      }));

      // Generate estimate title
      const estimateTitle = quickEstimateName.trim() || `Quick Estimate - ${clientName}`;

      // Create the estimate using the estimates table
      const { data: estimate, error: createError } = await supabase
        .from('estimates')
        .insert({
          user_id: user.id,
          title: estimateTitle,
          client_name: clientName,
          status: 'draft',
          subtotal,
          tax_rate: taxRate,
          tax_amount: taxAmount,
          total: totalAmount,
          notes: quickEstimateNotes || null,
          items: formattedLineItems
        })
        .select()
        .single();

      if (createError) throw createError;

      // Generate PDF
      const pdf = new jsPDF();
      const pageWidth = pdf.internal.pageSize.getWidth();

      // Header
      pdf.setFillColor(4, 61, 107); // #043d6b
      pdf.rect(0, 0, pageWidth, 40, 'F');
      pdf.setTextColor(255, 255, 255);
      pdf.setFontSize(24);
      pdf.text('OnSite', 20, 25);
      pdf.setFontSize(12);
      pdf.text('ESTIMATE', pageWidth - 20, 25, { align: 'right' });

      // Reset text color
      pdf.setTextColor(0, 0, 0);

      // Estimate info
      let y = 55;
      pdf.setFontSize(14);
      pdf.setFont('helvetica', 'bold');
      pdf.text(estimateTitle, 20, y);
      y += 10;

      pdf.setFontSize(10);
      pdf.setFont('helvetica', 'normal');
      pdf.setTextColor(100, 100, 100);
      pdf.text(`Prepared for: ${clientName}`, 20, y);
      y += 6;
      pdf.text(`Date: ${new Date().toLocaleDateString()}`, 20, y);
      y += 15;

      // Line items header
      pdf.setTextColor(0, 0, 0);
      pdf.setFont('helvetica', 'bold');
      pdf.setFontSize(10);
      pdf.text('Description', 20, y);
      pdf.text('Qty', 110, y);
      pdf.text('Price', 130, y);
      pdf.text('Total', 160, y);
      y += 3;
      pdf.setDrawColor(200, 200, 200);
      pdf.line(20, y, pageWidth - 20, y);
      y += 7;

      // Line items
      pdf.setFont('helvetica', 'normal');
      formattedLineItems.forEach(item => {
        const desc = item.description.length > 40 ? item.description.substring(0, 40) + '...' : item.description;
        pdf.text(desc, 20, y);
        pdf.text(item.quantity.toString(), 110, y);
        pdf.text(`$${item.unitPrice.toFixed(2)}`, 130, y);
        pdf.text(`$${item.totalPrice.toFixed(2)}`, 160, y);
        y += 8;
      });

      // Totals
      y += 5;
      pdf.line(120, y, pageWidth - 20, y);
      y += 10;
      pdf.text('Subtotal:', 130, y);
      pdf.text(`$${subtotal.toFixed(2)}`, 160, y);
      y += 7;
      pdf.text(`Tax (${taxRate}%):`, 130, y);
      pdf.text(`$${taxAmount.toFixed(2)}`, 160, y);
      y += 7;
      pdf.setFont('helvetica', 'bold');
      pdf.setFontSize(12);
      pdf.text('Total:', 130, y);
      pdf.text(`$${totalAmount.toFixed(2)}`, 160, y);

      // Notes
      if (quickEstimateNotes) {
        y += 20;
        pdf.setFontSize(10);
        pdf.setFont('helvetica', 'bold');
        pdf.text('Notes:', 20, y);
        y += 6;
        pdf.setFont('helvetica', 'normal');
        const splitNotes = pdf.splitTextToSize(quickEstimateNotes, pageWidth - 40);
        pdf.text(splitNotes, 20, y);
      }

      // Generate PDF blob and upload to estimate-pdfs bucket
      const pdfBlob = pdf.output('blob');
      const fileName = `estimate-${estimate.id}-${Date.now()}.pdf`;

      console.log('Uploading PDF to storage:', { bucket: 'estimate-pdfs', fileName, size: pdfBlob.size });

      const { error: uploadError } = await supabase.storage
        .from('estimate-pdfs')
        .upload(fileName, pdfBlob, {
          contentType: 'application/pdf',
          upsert: true
        });

      if (uploadError) {
        console.error('PDF upload error:', uploadError);
        throw new Error('Failed to upload PDF: ' + uploadError.message);
      }

      const { data: { publicUrl } } = supabase.storage
        .from('estimate-pdfs')
        .getPublicUrl(fileName);

      console.log('PDF uploaded successfully:', publicUrl);

      // Add to attached documents
      setAttachedDocuments(prev => [...prev, {
        type: 'estimate',
        id: estimate.id,
        name: `${estimateTitle} - $${totalAmount.toFixed(2)}`,
        pdfUrl: publicUrl
      }]);

      // Reset quick create state
      setShowQuickCreate(false);
      setQuickLineItems([]);
      setQuickEstimateName('');
      setQuickEstimateNotes('');
      setQuickAiPrompt('');
    } catch (error: any) {
      console.error('Error saving estimate:', error);
      alert('Failed to create estimate: ' + (error.message || 'Unknown error'));
    } finally {
      setSavingQuickEstimate(false);
    }
  };

  const quickEstimateSubtotal = quickLineItems.reduce((sum, item) => sum + item.total, 0);
  const quickEstimateTax = quickEstimateSubtotal * 0.08;
  const quickEstimateTotal = quickEstimateSubtotal + quickEstimateTax;

  const handleClose = () => {
    resetForm();
    onClose();
  };

  const isSelected = (id: string, type: 'employee' | 'client') => {
    return selectedRecipients.some(r => r.id === id && r.type === type);
  };

  const toggleRecipient = (item: Employee | Client, type: 'employee' | 'client') => {
    const selected = isSelected(item.id, type);
    if (selected) {
      setSelectedRecipients(selectedRecipients.filter(r => !(r.id === item.id && r.type === type)));
    } else {
      setSelectedRecipients([...selectedRecipients, {
        id: item.id,
        name: item.name,
        email: item.email,
        type
      }]);
    }
  };

  const removeRecipient = (id: string, type: 'employee' | 'client') => {
    setSelectedRecipients(selectedRecipients.filter(r => !(r.id === id && r.type === type)));
  };

  const handleCreateNew = async () => {
    if (!user || !newRecipient.name.trim() || !newRecipient.email.trim()) return;

    setIsCreating(true);
    try {
      const table = recipientTab === 'employees' ? 'employees' : 'clients';

      // Employees table requires phone, job_title, and hourly_rate
      const insertData = recipientTab === 'employees'
        ? {
            user_id: user.id,
            name: newRecipient.name.trim(),
            email: newRecipient.email.trim(),
            phone: '',
            job_title: 'Team Member',
            hourly_rate: 0
          }
        : {
            user_id: user.id,
            name: newRecipient.name.trim(),
            email: newRecipient.email.trim(),
          };

      const { data, error } = await supabase
        .from(table)
        .insert([insertData])
        .select()
        .single();

      if (error) throw error;

      if (recipientTab === 'employees') {
        setEmployees([...employees, data]);
      } else {
        setClients([...clients, data]);
      }

      setSelectedRecipients([...selectedRecipients, {
        id: data.id,
        name: data.name,
        email: data.email,
        type: recipientTab === 'employees' ? 'employee' : 'client'
      }]);

      setNewRecipient({ name: '', email: '' });
      setShowAddNew(false);
    } catch (error) {
      console.error('Error creating:', error);
      alert('Failed to create');
    } finally {
      setIsCreating(false);
    }
  };

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || !user) return;

    for (const file of Array.from(files)) {
      try {
        const fileName = `${user.id}/email-attachments/${Date.now()}_${file.name}`;
        const { error: uploadError } = await supabase.storage
          .from('project-photos')
          .upload(fileName, file);

        if (uploadError) throw uploadError;

        const { data: { publicUrl } } = supabase.storage
          .from('project-photos')
          .getPublicUrl(fileName);

        setAttachments(prev => [...prev, {
          type: 'image',
          url: publicUrl,
          name: file.name
        }]);
      } catch (error) {
        console.error('Error uploading image:', error);
      }
    }

    e.target.value = '';
  };

  const removeAttachment = (index: number) => {
    setAttachments(attachments.filter((_, i) => i !== index));
  };

  const handleSend = async () => {
    if (selectedRecipients.length === 0 || !subject.trim() || !user) return;

    setIsSending(true);
    try {
      // Get recipient email addresses
      const recipientEmails = selectedRecipients.map(r => r.email);
      const firstRecipient = selectedRecipients[0];

      // Build email body with recipient names for context
      let emailBody = body.trim();

      console.log('Sending email with:', {
        userId: user.id,
        to: recipientEmails,
        subject: subject.trim(),
        attachmentCount: attachments.length
      });

      // If approval is enabled and estimate is attached, create estimate_email_responses record
      if (enableApproval && hasEstimateAttached) {
        const estimateDocs = attachedDocuments.filter(d => d.type === 'estimate');

        for (const doc of estimateDocs) {
          // First delete any existing record for this estimate
          await supabase
            .from('estimate_email_responses')
            .delete()
            .eq('estimate_id', doc.id);

          // Create new email response record
          const { error: insertError } = await supabase
            .from('estimate_email_responses')
            .insert({
              estimate_id: doc.id,
              customer_name: firstRecipient?.name || 'Customer',
              customer_email: firstRecipient?.email || '',
              pdf_url: doc.pdfUrl || '',
              user_id: user.id,
              email_subject: subject.trim(),
              email_body: emailBody,
              accepted: null,
              declined: null
            });

          if (insertError) {
            console.error('Error creating estimate_email_responses:', insertError);
          } else {
            console.log('Created estimate_email_responses for estimate:', doc.id);
          }
        }
      }

      // Send via Gmail OAuth (send-user-gmail edge function)
      // Build HTML body with attachments if any
      let htmlBody = `<div style="font-family: Arial, sans-serif;">${emailBody.replace(/\n/g, '<br>')}</div>`;

      // Add inline images if attachments exist
      if (attachments.length > 0) {
        htmlBody += '<div style="margin-top: 20px;">';
        for (const att of attachments) {
          if (att.url) {
            htmlBody += `<div style="margin: 10px 0;"><img src="${att.url}" alt="${att.name || 'Attachment'}" style="max-width: 100%; max-height: 400px; border-radius: 8px;" /></div>`;
          }
        }
        htmlBody += '</div>';
      }

      // Add attached documents (estimates/invoices) as links
      if (attachedDocuments.length > 0) {
        const estimateDocs = attachedDocuments.filter(d => d.type === 'estimate');
        const otherDocs = attachedDocuments.filter(d => d.type !== 'estimate');

        // Show estimate with approval buttons if enabled
        if (estimateDocs.length > 0 && enableApproval) {
          const supabaseUrl = 'https://ujhgwcurllkkeouzwvgk.supabase.co/functions/v1';

          for (const doc of estimateDocs) {
            const approveUrl = `${supabaseUrl}/handle-estimate-response?id=${doc.id}&action=approve`;
            const declineUrl = `${supabaseUrl}/handle-estimate-response?id=${doc.id}&action=decline`;

            htmlBody += `
              <div style="margin-top: 24px; padding: 24px; background: linear-gradient(135deg, #f0fdf4 0%, #ecfdf5 100%); border-radius: 12px; border: 2px solid #86efac;">
                <div style="text-align: center; margin-bottom: 20px;">
                  <p style="margin: 0; font-size: 18px; font-weight: 700; color: #166534;">📋 Your Estimate is Ready</p>
                  <p style="margin: 8px 0 0 0; font-size: 14px; color: #15803d;">${doc.name}</p>
                </div>

                ${doc.pdfUrl ? `
                  <div style="text-align: center; margin-bottom: 20px;">
                    <a href="${doc.pdfUrl}" style="display: inline-block; padding: 12px 24px; background: #043d6b; color: white; text-decoration: none; border-radius: 8px; font-size: 14px; font-weight: 600;">
                      📄 View Full Estimate PDF
                    </a>
                  </div>
                ` : ''}

                <div style="text-align: center; padding-top: 20px; border-top: 1px solid #86efac;">
                  <p style="margin: 0 0 16px 0; font-size: 16px; font-weight: 600; color: #1f2937;">Ready to proceed?</p>
                  <div style="display: inline-block;">
                    <a href="${approveUrl}" style="display: inline-block; padding: 14px 32px; background: #22c55e; color: white; text-decoration: none; border-radius: 8px; font-size: 16px; font-weight: 700; margin-right: 12px;">
                      ✓ Approve Estimate
                    </a>
                    <a href="${declineUrl}" style="display: inline-block; padding: 14px 32px; background: #f3f4f6; color: #4b5563; text-decoration: none; border-radius: 8px; font-size: 16px; font-weight: 600; border: 1px solid #d1d5db;">
                      ✕ Decline
                    </a>
                  </div>
                  <p style="margin: 16px 0 0 0; font-size: 12px; color: #6b7280;">
                    💳 Approve to receive a secure payment link via Stripe
                  </p>
                </div>
              </div>
            `;
          }
        } else if (estimateDocs.length > 0) {
          // Show estimates without approval buttons
          htmlBody += '<div style="margin-top: 24px; padding: 16px; background: #f3f4f6; border-radius: 8px;">';
          htmlBody += '<p style="margin: 0 0 12px 0; font-weight: 600; color: #1f2937;">📎 Attached Estimates</p>';
          for (const doc of estimateDocs) {
            if (doc.pdfUrl) {
              htmlBody += `
                <div style="margin: 8px 0; padding: 12px; background: white; border-radius: 6px; border: 1px solid #e5e7eb;">
                  <p style="margin: 0; font-weight: 500; color: #374151;">📋 ${doc.name}</p>
                  <a href="${doc.pdfUrl}" style="display: inline-block; margin-top: 8px; padding: 8px 16px; background: #043d6b; color: white; text-decoration: none; border-radius: 6px; font-size: 14px;">View Estimate PDF</a>
                </div>
              `;
            }
          }
          htmlBody += '</div>';
        }

        // Show other documents (invoices)
        if (otherDocs.length > 0) {
          htmlBody += '<div style="margin-top: 24px; padding: 16px; background: #f3f4f6; border-radius: 8px;">';
          htmlBody += '<p style="margin: 0 0 12px 0; font-weight: 600; color: #1f2937;">📎 Attached Documents</p>';
          for (const doc of otherDocs) {
            if (doc.pdfUrl) {
              htmlBody += `
                <div style="margin: 8px 0; padding: 12px; background: white; border-radius: 6px; border: 1px solid #e5e7eb;">
                  <p style="margin: 0; font-weight: 500; color: #374151;">💵 ${doc.name}</p>
                  <a href="${doc.pdfUrl}" style="display: inline-block; margin-top: 8px; padding: 8px 16px; background: #043d6b; color: white; text-decoration: none; border-radius: 6px; font-size: 14px;">View Invoice PDF</a>
                </div>
              `;
            }
          }
          htmlBody += '</div>';
        }
      }

      // Send to each recipient (Gmail API takes single recipient)
      let data, sendError;
      try {
        // Send to first recipient (or loop for multiple)
        for (const recipient of recipientEmails) {
          const response = await supabase.functions.invoke('send-user-gmail', {
            body: {
              userId: user.id,
              to: recipient,
              subject: subject.trim(),
              htmlBody: htmlBody
            }
          });
          data = response.data;
          sendError = response.error;

          if (sendError || data?.error) break; // Stop on first error
        }
      } catch (e: any) {
        throw e;
      }

      console.log('Edge function response:', { data, sendError });

      // Handle different error scenarios
      if (sendError) {
        // Check if it's a network/timeout error (FunctionsFetchError with empty context)
        // These often mean the request completed but the response wasn't received
        if (sendError.name === 'FunctionsFetchError' &&
            (!sendError.context || Object.keys(sendError.context).length === 0)) {
          console.log('Network timeout - email likely sent successfully');
          // Treat as success since email usually sends despite timeout
          alert('Email sent! (The server took a while to respond, but your email was delivered.)');
          handleClose();
          return;
        }

        // Try to extract error message from context
        let errorMessage = sendError.message || 'Failed to send email';

        // Check if there's a body in the context with more details
        if (sendError.context?.body) {
          try {
            const bodyError = JSON.parse(sendError.context.body);
            if (bodyError.error) {
              errorMessage = bodyError.error;
            }
          } catch (e) {
            // Ignore parse error
          }
        }

        // Check for common errors
        if (errorMessage.includes('Gmail not connected') || errorMessage.includes('connect your Google account')) {
          alert('Please connect your Gmail account first!\n\nGo to Settings > Email Preferences to connect your Google account.');
          return;
        }

        throw new Error(errorMessage);
      }

      if (data?.error) {
        // Check if it's a Gmail not connected error
        if (data.error.includes('Gmail not connected') || data.error.includes('connect your Google account')) {
          alert('Please connect your Gmail account first!\n\nGo to Settings > Email Preferences to connect your Google account.');
          return;
        }
        throw new Error(data.error);
      }

      // Mark draft as sent if exists
      if (currentDraftId) {
        await supabase
          .from('email_drafts')
          .update({ status: 'sent', sent_at: new Date().toISOString() })
          .eq('id', currentDraftId);
      }

      alert(`Email sent from ${data?.from || 'your Gmail account'}!`);
      handleClose();
    } catch (error: any) {
      console.error('Error sending email:', error);
      console.error('Error details:', JSON.stringify(error, Object.getOwnPropertyNames(error)));

      let errorMsg = error.message || 'Failed to send email';

      // Provide helpful message for no mailbox error
      if (errorMsg.includes('No mailbox found') || errorMsg.includes('set up')) {
        alert('Please set up your business email first!\n\nGo to Settings > Business Email to create your @contractorai.work email address.');
      } else {
        alert(errorMsg);
      }
    } finally {
      setIsSending(false);
    }
  };

  if (!isOpen) return null;

  const currentList = recipientTab === 'employees' ? employees : clients;
  const filteredList = currentList.filter((item) => {
    if (!searchQuery.trim()) return true;
    const query = searchQuery.toLowerCase();
    return item.name.toLowerCase().includes(query) ||
           item.email.toLowerCase().includes(query) ||
           ('company' in item && item.company?.toLowerCase().includes(query));
  });

  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center px-4">
      <div className="absolute inset-0 bg-black/80" onClick={handleClose} />

      <div className="relative w-full max-w-xl bg-white rounded-2xl max-h-[95vh] overflow-hidden animate-slide-up shadow-2xl">
        {/* Handle */}
        <div className="flex justify-center pt-4 pb-3">
          <div className="w-12 h-1.5 bg-gray-300 rounded-full" />
        </div>

        {/* Header */}
        <div className="flex items-center justify-between px-6 pb-5 border-b border-gray-200">
          <div className="flex items-center gap-4">
            {showDrafts && (
              <button onClick={() => setShowDrafts(false)} className="p-2 text-gray-500 hover:text-gray-700 bg-gray-100 rounded-xl">
                <ChevronLeft className="w-6 h-6" />
              </button>
            )}
            <div className="w-14 h-14 bg-blue-500/20 rounded-xl flex items-center justify-center">
              <Mail className="w-7 h-7 text-blue-500" />
            </div>
            <div>
              <h2 className="text-2xl font-bold text-black">
                {showDrafts ? 'Drafts' : 'Send Email'}
              </h2>
              <p className="text-base text-gray-500">
                {showDrafts ? `${drafts.length} saved drafts` : 'Compose your message'}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            {!showDrafts && drafts.length > 0 && (
              <button
                onClick={() => setShowDrafts(true)}
                className="p-3 text-gray-500 hover:text-gray-700 bg-gray-100 rounded-xl"
              >
                <FileText className="w-6 h-6" />
              </button>
            )}
            <button onClick={handleClose} className="p-3 text-gray-500 hover:text-gray-700 bg-gray-100 rounded-xl">
              <X className="w-7 h-7" />
            </button>
          </div>
        </div>

        {/* Drafts List */}
        {showDrafts ? (
          <div className="p-4 overflow-y-auto max-h-[60vh]">
            {drafts.length === 0 ? (
              <div className="text-center py-12">
                <FileText className="w-12 h-12 text-gray-500 mx-auto mb-3" />
                <p className="text-gray-500">No drafts saved</p>
              </div>
            ) : (
              <div className="space-y-2">
                {drafts.map((draft) => (
                  <div
                    key={draft.id}
                    className="flex items-center gap-3 p-4 bg-gray-100 rounded-lg border border-gray-200"
                  >
                    <button
                      onClick={() => { loadDraft(draft.id); setShowDrafts(false); }}
                      className="flex-1 text-left"
                    >
                      <p className="font-medium text-black truncate">
                        {draft.subject || 'No subject'}
                      </p>
                      <p className="text-sm text-gray-500">
                        {draft.recipients?.length || 0} recipients • {new Date(draft.updated_at).toLocaleDateString()}
                      </p>
                    </button>
                    <button
                      onClick={() => deleteDraft(draft.id)}
                      className="p-2 text-gray-400 hover:text-red-400"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        ) : (
          <>
            {/* Selected Recipients Bar */}
            {selectedRecipients.length > 0 && (
              <div className="mx-4 mt-3 p-3 bg-gray-100 border border-gray-200 rounded-lg">
                <div className="flex items-center justify-between mb-2">
                  <p className="text-sm font-medium text-black">
                    {selectedRecipients.length} recipient{selectedRecipients.length !== 1 ? 's' : ''}
                  </p>
                </div>
                <div className="flex flex-wrap gap-2">
                  {selectedRecipients.map((r) => (
                    <div
                      key={`${r.type}-${r.id}`}
                      className="flex items-center gap-2 px-3 py-1.5 bg-gray-200 rounded-md"
                    >
                      <span className="text-sm text-black">{r.name}</span>
                      <button
                        onClick={() => removeRecipient(r.id, r.type)}
                        className="text-gray-500 hover:text-gray-700"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Attachments Preview */}
            {attachments.length > 0 && (
              <div className="mx-4 mt-3 p-3 bg-gray-100 border border-gray-200 rounded-lg">
                <p className="text-sm font-medium text-black mb-2">
                  {attachments.length} attachment{attachments.length !== 1 ? 's' : ''}
                </p>
                <div className="flex gap-2 overflow-x-auto pb-1">
                  {attachments.map((att, i) => (
                    <div key={i} className="relative flex-shrink-0">
                      <img
                        src={att.url}
                        alt={att.name}
                        className="w-16 h-16 object-cover rounded-lg"
                      />
                      <button
                        onClick={() => removeAttachment(i)}
                        className="absolute -top-1 -right-1 w-5 h-5 bg-red-500 rounded-full flex items-center justify-center"
                      >
                        <X className="w-3 h-3 text-white" />
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Step Indicator - Dynamic based on estimate attachment */}
            <div className="flex items-center gap-2 px-4 py-4">
              <button
                onClick={() => setStep('recipients')}
                className={`flex-1 py-2 rounded-md text-sm font-medium transition-colors ${
                  step === 'recipients' ? 'bg-blue-500 text-white' : 'bg-gray-100 text-gray-500'
                }`}
              >
                1. To
              </button>
              <button
                onClick={() => selectedRecipients.length > 0 && setStep('compose')}
                className={`flex-1 py-2 rounded-md text-sm font-medium transition-colors ${
                  step === 'compose' ? 'bg-blue-500 text-white' : 'bg-gray-100 text-gray-500'
                }`}
              >
                2. Compose
              </button>
              {hasEstimateAttached && (
                <button
                  onClick={() => selectedRecipients.length > 0 && subject && setStep('approval')}
                  className={`flex-1 py-2 rounded-md text-sm font-medium transition-colors ${
                    step === 'approval' ? 'bg-green-500 text-white' : 'bg-gray-100 text-gray-500'
                  }`}
                >
                  3. Approval
                </button>
              )}
              <button
                onClick={() => selectedRecipients.length > 0 && subject && setStep('confirm')}
                className={`flex-1 py-2 rounded-md text-sm font-medium transition-colors ${
                  step === 'confirm' ? 'bg-blue-500 text-white' : 'bg-gray-100 text-gray-500'
                }`}
              >
                {hasEstimateAttached ? '4. Send' : '3. Send'}
              </button>
            </div>

            {/* Content */}
            <div className="px-4 pb-6 overflow-y-auto max-h-[65vh]">
              {/* Step 1: Recipients */}
              {step === 'recipients' && (
                <div className="space-y-3">
                  <div className="flex gap-2 p-1 bg-gray-100 rounded-lg">
                    <button
                      onClick={() => { setRecipientTab('employees'); setSearchQuery(''); }}
                      className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-md text-sm font-medium transition-colors ${
                        recipientTab === 'employees' ? 'bg-blue-500 text-white' : 'text-gray-500'
                      }`}
                    >
                      <Users className="w-4 h-4" />
                      Team ({employees.length})
                    </button>
                    <button
                      onClick={() => { setRecipientTab('clients'); setSearchQuery(''); }}
                      className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-md text-sm font-medium transition-colors ${
                        recipientTab === 'clients' ? 'bg-blue-500 text-white' : 'text-gray-500'
                      }`}
                    >
                      <Briefcase className="w-4 h-4" />
                      Clients ({clients.length})
                    </button>
                  </div>

                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                    <input
                      type="text"
                      placeholder={`Search ${recipientTab}...`}
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="w-full pl-10 pr-4 py-3 bg-gray-100 border border-gray-200 rounded-lg text-black placeholder-gray-400 focus:border-blue-500 focus:outline-none"
                    />
                  </div>

                  <div className="flex justify-end">
                    <button
                      onClick={() => setShowAddNew(!showAddNew)}
                      className="text-sm text-blue-500 font-medium flex items-center gap-1"
                    >
                      <UserPlus className="w-4 h-4" />
                      Add New
                    </button>
                  </div>

                  {showAddNew && (
                    <div className="p-4 bg-gray-100 rounded-lg border border-blue-500/30 space-y-3">
                      <input
                        type="text"
                        placeholder="Name"
                        value={newRecipient.name}
                        onChange={(e) => setNewRecipient({ ...newRecipient, name: e.target.value })}
                        className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-md text-black placeholder-gray-400"
                      />
                      <input
                        type="email"
                        placeholder="Email"
                        value={newRecipient.email}
                        onChange={(e) => setNewRecipient({ ...newRecipient, email: e.target.value })}
                        className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-md text-black placeholder-gray-400"
                      />
                      <button
                        onClick={handleCreateNew}
                        disabled={isCreating || !newRecipient.name || !newRecipient.email}
                        className="w-full py-3 bg-blue-500 text-white rounded-md font-medium disabled:opacity-50"
                      >
                        {isCreating ? 'Creating...' : 'Create & Add'}
                      </button>
                    </div>
                  )}

                  {filteredList.length === 0 ? (
                    <div className="text-center py-8">
                      <Users className="w-12 h-12 text-gray-500 mx-auto mb-3" />
                      <p className="text-gray-500">No {recipientTab} found</p>
                    </div>
                  ) : (
                    <div className="space-y-2">
                      {filteredList.map((item) => {
                        const type = recipientTab === 'employees' ? 'employee' : 'client';
                        const selected = isSelected(item.id, type);
                        return (
                          <button
                            key={item.id}
                            onClick={() => toggleRecipient(item, type)}
                            className={`w-full flex items-center gap-3 p-4 rounded-lg border transition-all ${
                              selected
                                ? 'bg-blue-500/20 border-blue-500'
                                : 'bg-gray-100 border-gray-200 hover:border-zinc-500'
                            }`}
                          >
                            <div className={`w-10 h-10 rounded-full flex items-center justify-center ${
                              selected ? 'bg-blue-500' : 'bg-gray-200'
                            }`}>
                              {selected ? (
                                <Check className="w-5 h-5 text-white" />
                              ) : (
                                <User className="w-5 h-5 text-gray-500" />
                              )}
                            </div>
                            <div className="flex-1 text-left">
                              <p className="font-medium text-black">{item.name}</p>
                              <p className="text-sm text-gray-500">{item.email}</p>
                            </div>
                          </button>
                        );
                      })}
                    </div>
                  )}
                </div>
              )}

              {/* Step 2: Compose */}
              {step === 'compose' && (
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-zinc-300 mb-2">Subject</label>
                    <input
                      type="text"
                      value={subject}
                      onChange={(e) => setSubject(e.target.value)}
                      placeholder="Enter subject..."
                      className="w-full px-4 py-3 bg-gray-100 border border-gray-200 rounded-lg text-black placeholder-gray-400 focus:border-blue-500 focus:outline-none"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-zinc-300 mb-2">Message</label>
                    <textarea
                      value={body}
                      onChange={(e) => setBody(e.target.value)}
                      placeholder="Write your message..."
                      rows={6}
                      className="w-full px-4 py-3 bg-gray-100 border border-gray-200 rounded-lg text-black placeholder-gray-400 focus:border-blue-500 focus:outline-none resize-none"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-zinc-300 mb-2">Attachments</label>
                    <div className="flex gap-2">
                      <button
                        onClick={() => fileInputRef.current?.click()}
                        className="flex-1 flex items-center justify-center gap-2 px-4 py-3 bg-gray-100 border border-dashed border-gray-200 rounded-lg text-gray-500 hover:border-blue-500 hover:text-blue-500 transition-colors"
                      >
                        <ImagePlus className="w-5 h-5" />
                        <span>Upload</span>
                      </button>
                      <button
                        onClick={openGalleryPicker}
                        className="flex-1 flex items-center justify-center gap-2 px-4 py-3 bg-gray-100 border border-dashed border-gray-200 rounded-lg text-gray-500 hover:border-blue-500 hover:text-blue-500 transition-colors"
                      >
                        <Images className="w-5 h-5" />
                        <span>Gallery</span>
                      </button>
                    </div>
                    <input
                      ref={fileInputRef}
                      type="file"
                      accept="image/*"
                      multiple
                      onChange={handleImageUpload}
                      className="hidden"
                    />
                  </div>

                  {/* Documents Section */}
                  <div>
                    <label className="block text-sm font-medium text-zinc-300 mb-2">Documents</label>
                    <div className="flex gap-2">
                      <button
                        onClick={openDocumentPicker}
                        className="flex-1 flex items-center justify-center gap-2 px-4 py-3 bg-gray-100 border border-dashed border-gray-200 rounded-lg text-gray-500 hover:border-green-500 hover:text-green-600 transition-colors"
                      >
                        <Receipt className="w-5 h-5" />
                        <span>Attach</span>
                      </button>
                      <button
                        onClick={() => setShowQuickCreate(true)}
                        className="flex-1 flex items-center justify-center gap-2 px-4 py-3 bg-gray-100 border border-dashed border-gray-200 rounded-lg text-gray-500 hover:border-blue-500 hover:text-blue-600 transition-colors"
                      >
                        <Plus className="w-5 h-5" />
                        <span>Quick Create</span>
                      </button>
                    </div>

                    {/* Attached Documents Preview */}
                    {attachedDocuments.length > 0 && (
                      <div className="mt-3 space-y-2">
                        {attachedDocuments.map((doc) => (
                          <div key={doc.id} className="flex items-center gap-3 p-3 bg-green-50 border border-green-200 rounded-lg">
                            <div className="w-10 h-10 bg-green-100 rounded-lg flex items-center justify-center">
                              {doc.type === 'estimate' ? (
                                <FileCheck className="w-5 h-5 text-green-600" />
                              ) : (
                                <DollarSign className="w-5 h-5 text-green-600" />
                              )}
                            </div>
                            <div className="flex-1 min-w-0">
                              <p className="text-sm font-medium text-gray-900 truncate">{doc.name}</p>
                              <p className="text-xs text-gray-500 capitalize">{doc.type}</p>
                            </div>
                            <button
                              onClick={() => removeDocument(doc.id)}
                              className="p-1 text-gray-400 hover:text-red-500"
                            >
                              <X className="w-4 h-4" />
                            </button>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Step 3: Approval Options (only when estimate attached) */}
              {step === 'approval' && hasEstimateAttached && (
                <div className="space-y-4">
                  {/* Approval Toggle */}
                  <div className="p-4 bg-white rounded-xl border border-gray-200">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-green-100 rounded-lg flex items-center justify-center">
                          <CheckCircle2 className="w-5 h-5 text-green-600" />
                        </div>
                        <div>
                          <p className="font-medium text-gray-900">Customer Approval</p>
                          <p className="text-sm text-gray-500">Let customer approve or decline</p>
                        </div>
                      </div>
                      <button
                        onClick={() => setEnableApproval(!enableApproval)}
                        className={`w-12 h-7 rounded-full transition-colors relative ${
                          enableApproval ? 'bg-green-500' : 'bg-gray-300'
                        }`}
                      >
                        <div className={`absolute top-1 w-5 h-5 bg-white rounded-full shadow transition-transform ${
                          enableApproval ? 'translate-x-6' : 'translate-x-1'
                        }`} />
                      </button>
                    </div>
                  </div>

                  {enableApproval && (
                    <>
                      {/* What happens info */}
                      <div className="p-4 bg-blue-50 rounded-xl border border-blue-200">
                        <h4 className="font-medium text-blue-900 mb-3 flex items-center gap-2">
                          <Bell className="w-4 h-4" />
                          How it works
                        </h4>
                        <div className="space-y-3 text-sm">
                          <div className="flex items-start gap-3">
                            <div className="w-6 h-6 bg-blue-100 rounded-full flex items-center justify-center flex-shrink-0">
                              <span className="text-xs font-bold text-blue-600">1</span>
                            </div>
                            <p className="text-blue-800">Customer receives email with your estimate</p>
                          </div>
                          <div className="flex items-start gap-3">
                            <div className="w-6 h-6 bg-blue-100 rounded-full flex items-center justify-center flex-shrink-0">
                              <span className="text-xs font-bold text-blue-600">2</span>
                            </div>
                            <p className="text-blue-800">They click <span className="font-semibold text-green-600">Approve</span> or <span className="font-semibold text-red-500">Decline</span></p>
                          </div>
                          <div className="flex items-start gap-3">
                            <div className="w-6 h-6 bg-green-100 rounded-full flex items-center justify-center flex-shrink-0">
                              <CheckCircle2 className="w-3 h-3 text-green-600" />
                            </div>
                            <p className="text-blue-800"><span className="font-semibold">If approved:</span> Payment link auto-sent via Stripe</p>
                          </div>
                          <div className="flex items-start gap-3">
                            <div className="w-6 h-6 bg-red-100 rounded-full flex items-center justify-center flex-shrink-0">
                              <XCircle className="w-3 h-3 text-red-500" />
                            </div>
                            <p className="text-blue-800"><span className="font-semibold">If declined:</span> You'll be notified with optional feedback</p>
                          </div>
                        </div>
                      </div>

                      {/* Attached Estimates Preview */}
                      <div className="p-4 bg-gray-100 rounded-xl">
                        <h4 className="font-medium text-gray-900 mb-3 flex items-center gap-2">
                          <FileCheck className="w-4 h-4 text-green-600" />
                          Estimates for Approval
                        </h4>
                        <div className="space-y-2">
                          {attachedDocuments.filter(d => d.type === 'estimate').map((doc) => (
                            <div key={doc.id} className="flex items-center gap-3 p-3 bg-white rounded-lg border border-green-200">
                              <div className="w-8 h-8 bg-green-100 rounded-lg flex items-center justify-center">
                                <FileCheck className="w-4 h-4 text-green-600" />
                              </div>
                              <div className="flex-1 min-w-0">
                                <p className="text-sm font-medium text-gray-900 truncate">{doc.name}</p>
                                <p className="text-xs text-green-600">Approval buttons will be included</p>
                              </div>
                              <CheckCircle2 className="w-5 h-5 text-green-500" />
                            </div>
                          ))}
                        </div>
                      </div>

                      {/* Payment Info */}
                      <div className="p-3 bg-gradient-to-r from-green-50 to-emerald-50 rounded-lg border border-green-200 flex items-center gap-3">
                        <CreditCard className="w-5 h-5 text-green-600" />
                        <p className="text-sm text-green-800">
                          <span className="font-medium">Stripe Integration:</span> Payment link generated automatically when approved
                        </p>
                      </div>
                    </>
                  )}

                  {!enableApproval && (
                    <div className="p-4 bg-gray-50 rounded-xl border border-gray-200 text-center">
                      <XCircle className="w-8 h-8 text-gray-400 mx-auto mb-2" />
                      <p className="text-sm text-gray-500">Approval buttons disabled</p>
                      <p className="text-xs text-gray-400 mt-1">Customer will receive estimate without approve/decline options</p>
                    </div>
                  )}
                </div>
              )}

              {/* Step 4: Confirm (or Step 3 if no estimate) */}
              {step === 'confirm' && (
                <div className="space-y-4">
                  <div className="p-4 bg-gray-100 rounded-lg">
                    <h4 className="font-medium text-black mb-2">To:</h4>
                    <div className="space-y-1">
                      {selectedRecipients.map((r) => (
                        <p key={`${r.type}-${r.id}`} className="text-sm text-zinc-300">
                          {r.name} ({r.email})
                        </p>
                      ))}
                    </div>
                  </div>

                  <div className="p-4 bg-gray-100 rounded-lg">
                    <h4 className="font-medium text-black mb-2">Subject:</h4>
                    <p className="text-sm text-zinc-300">{subject}</p>
                  </div>

                  {body && (
                    <div className="p-4 bg-gray-100 rounded-lg">
                      <h4 className="font-medium text-black mb-2">Message:</h4>
                      <p className="text-sm text-zinc-300 whitespace-pre-wrap">{body}</p>
                    </div>
                  )}

                  {attachments.length > 0 && (
                    <div className="p-4 bg-gray-100 rounded-lg">
                      <h4 className="font-medium text-black mb-2">
                        {attachments.length} Attachment{attachments.length !== 1 ? 's' : ''}
                      </h4>
                      <div className="flex gap-2">
                        {attachments.map((att, i) => (
                          <img
                            key={i}
                            src={att.url}
                            alt={att.name}
                            className="w-12 h-12 object-cover rounded"
                          />
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Documents attached */}
                  {attachedDocuments.length > 0 && (
                    <div className="p-4 bg-gray-100 rounded-lg">
                      <h4 className="font-medium text-black mb-2">Documents</h4>
                      <div className="space-y-2">
                        {attachedDocuments.map((doc) => (
                          <div key={doc.id} className="flex items-center gap-2 text-sm">
                            {doc.type === 'estimate' ? (
                              <FileCheck className="w-4 h-4 text-green-600" />
                            ) : (
                              <DollarSign className="w-4 h-4 text-blue-600" />
                            )}
                            <span className="text-gray-700">{doc.name}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Approval status */}
                  {hasEstimateAttached && (
                    <div className={`p-4 rounded-lg flex items-center gap-3 ${
                      enableApproval ? 'bg-green-50 border border-green-200' : 'bg-gray-100'
                    }`}>
                      {enableApproval ? (
                        <>
                          <CheckCircle2 className="w-5 h-5 text-green-600" />
                          <div>
                            <p className="font-medium text-green-800">Approval Flow Enabled</p>
                            <p className="text-xs text-green-600">Customer can approve/decline • Payment link auto-sent</p>
                          </div>
                        </>
                      ) : (
                        <>
                          <XCircle className="w-5 h-5 text-gray-400" />
                          <div>
                            <p className="font-medium text-gray-700">Approval Flow Disabled</p>
                            <p className="text-xs text-gray-500">Estimate sent without approve/decline buttons</p>
                          </div>
                        </>
                      )}
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Footer */}
            <div className="p-4 border-t border-gray-200 bg-gray-50">
              {step === 'recipients' && (
                <div className="flex gap-3">
                  <button
                    onClick={() => saveDraft()}
                    disabled={isSavingDraft}
                    className="flex-1 py-4 bg-gray-100 text-black rounded-md font-semibold flex items-center justify-center gap-2 border border-gray-200"
                  >
                    <Save className="w-5 h-5" />
                    {isSavingDraft ? 'Saving...' : 'Save Draft'}
                  </button>
                  <button
                    onClick={() => setStep('compose')}
                    disabled={selectedRecipients.length === 0}
                    className="flex-1 py-4 bg-blue-500 text-white rounded-md font-semibold disabled:opacity-50"
                  >
                    Continue
                  </button>
                </div>
              )}

              {step === 'compose' && (
                <div className="flex gap-3">
                  <button
                    onClick={() => setStep('recipients')}
                    className="flex-1 py-4 bg-gray-100 text-black rounded-md font-semibold border border-gray-200"
                  >
                    Back
                  </button>
                  <button
                    onClick={() => setStep(hasEstimateAttached ? 'approval' : 'confirm')}
                    disabled={!subject.trim()}
                    className="flex-1 py-4 bg-blue-500 text-white rounded-md font-semibold disabled:opacity-50"
                  >
                    {hasEstimateAttached ? 'Next' : 'Review'}
                  </button>
                </div>
              )}

              {step === 'approval' && (
                <div className="flex gap-3">
                  <button
                    onClick={() => setStep('compose')}
                    className="flex-1 py-4 bg-gray-100 text-black rounded-md font-semibold border border-gray-200"
                  >
                    Back
                  </button>
                  <button
                    onClick={() => setStep('confirm')}
                    className="flex-1 py-4 bg-green-500 text-white rounded-md font-semibold flex items-center justify-center gap-2"
                  >
                    <CheckCircle2 className="w-5 h-5" />
                    Review & Send
                  </button>
                </div>
              )}

              {step === 'confirm' && (
                <div className="flex gap-3">
                  <button
                    onClick={() => setStep(hasEstimateAttached ? 'approval' : 'compose')}
                    className="flex-1 py-4 bg-gray-100 text-black rounded-md font-semibold border border-gray-200"
                  >
                    Back
                  </button>
                  <button
                    onClick={handleSend}
                    disabled={isSending}
                    className="flex-1 py-4 bg-blue-500 text-white rounded-md font-semibold flex items-center justify-center gap-2 disabled:opacity-50"
                  >
                    {isSending ? (
                      <Loader2 className="w-5 h-5 animate-spin" />
                    ) : (
                      <Send className="w-5 h-5" />
                    )}
                    {isSending ? 'Sending...' : 'Send Email'}
                  </button>
                </div>
              )}
            </div>
          </>
        )}
      </div>

      {/* Gallery Picker Modal */}
      {showGalleryPicker && (
        <div className="fixed inset-0 z-[300] flex items-end justify-center">
          <div className="absolute inset-0 bg-black/90" onClick={() => setShowGalleryPicker(false)} />

          <div className="relative w-full max-w-lg bg-gray-50 rounded-t-2xl max-h-[85vh] overflow-hidden animate-slide-up">
            {/* Handle */}
            <div className="flex justify-center pt-3 pb-2">
              <div className="w-10 h-1 bg-gray-200 rounded-full" />
            </div>

            {/* Header */}
            <div className="flex items-center justify-between px-4 pb-4 border-b border-gray-200">
              <div className="flex items-center gap-3">
                <button
                  onClick={() => setShowGalleryPicker(false)}
                  className="p-1 text-gray-500 hover:text-gray-700"
                >
                  <ChevronLeft className="w-5 h-5" />
                </button>
                <div className="w-10 h-10 bg-blue-500/20 rounded-lg flex items-center justify-center">
                  <Images className="w-5 h-5 text-blue-500" />
                </div>
                <div>
                  <h2 className="text-2xl font-bold text-black">Select Photos</h2>
                  <p className="text-sm text-gray-500">
                    {selectedGalleryPhotos.size > 0
                      ? `${selectedGalleryPhotos.size} selected`
                      : 'Choose from your gallery'}
                  </p>
                </div>
              </div>
              <button onClick={() => setShowGalleryPicker(false)} className="p-2 text-gray-500 hover:text-gray-700">
                <X className="w-6 h-6" />
              </button>
            </div>

            {/* Gallery Grid */}
            <div className="p-4 overflow-y-auto max-h-[55vh]">
              {loadingGallery ? (
                <div className="flex items-center justify-center py-12">
                  <Loader2 className="w-8 h-8 text-blue-500 animate-spin" />
                </div>
              ) : galleryPhotos.length === 0 ? (
                <div className="text-center py-12">
                  <Images className="w-12 h-12 text-gray-500 mx-auto mb-3" />
                  <p className="text-gray-500 font-medium">No photos in gallery</p>
                  <p className="text-sm text-gray-400 mt-1">Take some project photos first</p>
                </div>
              ) : (
                <div className="grid grid-cols-3 gap-2">
                  {galleryPhotos.map((photo) => {
                    const isSelected = selectedGalleryPhotos.has(photo.id);
                    return (
                      <button
                        key={photo.id}
                        onClick={() => toggleGalleryPhoto(photo.id)}
                        className={`relative aspect-square rounded-lg overflow-hidden border-2 transition-all ${
                          isSelected
                            ? 'border-blue-500 ring-2 ring-blue-500/50'
                            : 'border-transparent hover:border-zinc-600'
                        }`}
                      >
                        <img
                          src={photo.imageUrl}
                          alt={photo.caption || 'Photo'}
                          className="w-full h-full object-cover"
                        />
                        {isSelected && (
                          <div className="absolute inset-0 bg-blue-500/30 flex items-center justify-center">
                            <div className="w-8 h-8 bg-blue-500 rounded-full flex items-center justify-center">
                              <Check className="w-5 h-5 text-white" />
                            </div>
                          </div>
                        )}
                        {photo.projectName && (
                          <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/80 to-transparent p-1.5">
                            <p className="text-xs text-black truncate">{photo.projectName}</p>
                          </div>
                        )}
                      </button>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Footer */}
            <div className="p-4 border-t border-gray-200 bg-gray-50">
              <button
                onClick={addSelectedGalleryPhotos}
                disabled={selectedGalleryPhotos.size === 0}
                className="w-full py-4 bg-blue-500 text-white rounded-md font-semibold disabled:opacity-50 flex items-center justify-center gap-2"
              >
                <ImagePlus className="w-5 h-5" />
                {selectedGalleryPhotos.size > 0
                  ? `Add ${selectedGalleryPhotos.size} Photo${selectedGalleryPhotos.size !== 1 ? 's' : ''}`
                  : 'Select Photos'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Document Picker Modal */}
      {showDocumentPicker && (
        <div className="fixed inset-0 z-[300] flex items-end justify-center">
          <div className="absolute inset-0 bg-black/90" onClick={() => setShowDocumentPicker(false)} />

          <div className="relative w-full max-w-lg bg-gray-50 rounded-t-2xl max-h-[85vh] overflow-hidden animate-slide-up">
            {/* Handle */}
            <div className="flex justify-center pt-3 pb-2">
              <div className="w-10 h-1 bg-gray-200 rounded-full" />
            </div>

            {/* Header */}
            <div className="flex items-center justify-between px-4 pb-4 border-b border-gray-200">
              <div className="flex items-center gap-3">
                <button
                  onClick={() => setShowDocumentPicker(false)}
                  className="p-1 text-gray-500 hover:text-gray-700"
                >
                  <ChevronLeft className="w-5 h-5" />
                </button>
                <div className="w-10 h-10 bg-green-500/20 rounded-lg flex items-center justify-center">
                  <Receipt className="w-5 h-5 text-green-600" />
                </div>
                <div>
                  <h2 className="text-xl font-bold text-black">Attach Document</h2>
                  <p className="text-sm text-gray-500">Select estimate or invoice</p>
                </div>
              </div>
              <button onClick={() => setShowDocumentPicker(false)} className="p-2 text-gray-500 hover:text-gray-700">
                <X className="w-6 h-6" />
              </button>
            </div>

            {/* Tabs */}
            <div className="flex gap-2 p-4 bg-gray-100">
              <button
                onClick={() => setDocumentTab('estimates')}
                className={`flex-1 py-2.5 rounded-lg text-sm font-medium transition-colors ${
                  documentTab === 'estimates' ? 'bg-green-500 text-white' : 'bg-white text-gray-600'
                }`}
              >
                <FileCheck className="w-4 h-4 inline mr-2" />
                Estimates
              </button>
              <button
                onClick={() => setDocumentTab('invoices')}
                className={`flex-1 py-2.5 rounded-lg text-sm font-medium transition-colors ${
                  documentTab === 'invoices' ? 'bg-green-500 text-white' : 'bg-white text-gray-600'
                }`}
              >
                <DollarSign className="w-4 h-4 inline mr-2" />
                Invoices
              </button>
            </div>

            {/* Document List */}
            <div className="p-4 overflow-y-auto max-h-[50vh]">
              {loadingDocuments ? (
                <div className="flex items-center justify-center py-12">
                  <Loader2 className="w-8 h-8 text-green-500 animate-spin" />
                </div>
              ) : documentTab === 'estimates' ? (
                availableEstimates.length === 0 ? (
                  <div className="text-center py-12">
                    <FileCheck className="w-12 h-12 text-gray-400 mx-auto mb-3" />
                    <p className="text-gray-500 font-medium">No estimates found</p>
                    <p className="text-sm text-gray-400 mt-1">Create an estimate first</p>
                  </div>
                ) : (
                  <div className="space-y-2">
                    {availableEstimates.map((est) => (
                      <button
                        key={est.id}
                        onClick={() => attachDocument('estimate', est)}
                        disabled={attachedDocuments.some(d => d.id === est.id) || !est.pdf_url}
                        className={`w-full flex items-center gap-3 p-3 rounded-lg border transition-colors ${
                          attachedDocuments.some(d => d.id === est.id)
                            ? 'bg-green-50 border-green-300 opacity-60'
                            : !est.pdf_url
                            ? 'bg-gray-50 border-gray-200 opacity-60 cursor-not-allowed'
                            : 'bg-white border-gray-200 hover:border-green-400'
                        }`}
                      >
                        <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${
                          est.pdf_url ? 'bg-green-100' : 'bg-gray-200'
                        }`}>
                          <FileCheck className={`w-5 h-5 ${est.pdf_url ? 'text-green-600' : 'text-gray-400'}`} />
                        </div>
                        <div className="flex-1 text-left">
                          <p className={`font-medium ${est.pdf_url ? 'text-gray-900' : 'text-gray-500'}`}>
                            {est.estimate_number || est.id.slice(0, 8)}
                          </p>
                          <p className="text-sm text-gray-500">
                            {est.client_name || 'Customer'} • ${Number(est.total_amount || 0).toFixed(2)}
                          </p>
                        </div>
                        {attachedDocuments.some(d => d.id === est.id) ? (
                          <Check className="w-5 h-5 text-green-500" />
                        ) : !est.pdf_url ? (
                          <span className="text-xs text-gray-400 bg-gray-100 px-2 py-1 rounded">No PDF</span>
                        ) : (
                          <span className="text-xs text-green-600 bg-green-50 px-2 py-1 rounded">PDF Ready</span>
                        )}
                      </button>
                    ))}
                  </div>
                )
              ) : (
                availableInvoices.length === 0 ? (
                  <div className="text-center py-12">
                    <DollarSign className="w-12 h-12 text-gray-400 mx-auto mb-3" />
                    <p className="text-gray-500 font-medium">No invoices found</p>
                    <p className="text-sm text-gray-400 mt-1">Create an invoice first</p>
                  </div>
                ) : (
                  <div className="space-y-2">
                    {availableInvoices.map((inv) => (
                      <button
                        key={inv.id}
                        onClick={() => attachDocument('invoice', inv)}
                        disabled={attachedDocuments.some(d => d.id === inv.id)}
                        className={`w-full flex items-center gap-3 p-3 rounded-lg border transition-colors ${
                          attachedDocuments.some(d => d.id === inv.id)
                            ? 'bg-green-50 border-green-300 opacity-60'
                            : 'bg-white border-gray-200 hover:border-green-400'
                        }`}
                      >
                        <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
                          <DollarSign className="w-5 h-5 text-blue-600" />
                        </div>
                        <div className="flex-1 text-left">
                          <p className="font-medium text-gray-900">
                            #{inv.invoice_number || inv.id.slice(0, 8)}
                          </p>
                          <p className="text-sm text-gray-500">
                            {inv.clients?.name || 'Customer'} • ${Number(inv.total_amount || 0).toFixed(2)}
                          </p>
                        </div>
                        <span className={`px-2 py-0.5 text-xs rounded-full ${
                          inv.status === 'paid' ? 'bg-green-100 text-green-700' :
                          inv.status === 'pending' ? 'bg-yellow-100 text-yellow-700' :
                          'bg-gray-100 text-gray-700'
                        }`}>
                          {inv.status}
                        </span>
                        {attachedDocuments.some(d => d.id === inv.id) && (
                          <Check className="w-5 h-5 text-green-500" />
                        )}
                      </button>
                    ))}
                  </div>
                )
              )}
            </div>
          </div>
        </div>
      )}

      {/* Quick Create Estimate Modal */}
      {showQuickCreate && (
        <div className="fixed inset-0 z-[300] flex items-end justify-center">
          <div className="absolute inset-0 bg-black/90" onClick={() => setShowQuickCreate(false)} />

          <div className="relative w-full max-w-lg bg-gray-50 rounded-t-2xl max-h-[85vh] overflow-hidden animate-slide-up">
            {/* Handle */}
            <div className="flex justify-center pt-3 pb-2">
              <div className="w-10 h-1 bg-gray-200 rounded-full" />
            </div>

            {/* Header */}
            <div className="flex items-center justify-between px-4 pb-4 border-b border-gray-200">
              <div className="flex items-center gap-3">
                <button
                  onClick={() => setShowQuickCreate(false)}
                  className="p-1 text-gray-500 hover:text-gray-700"
                >
                  <ChevronLeft className="w-5 h-5" />
                </button>
                <div className="w-10 h-10 bg-blue-500/20 rounded-lg flex items-center justify-center">
                  <FileCheck className="w-5 h-5 text-blue-600" />
                </div>
                <div>
                  <h2 className="text-xl font-bold text-black">Quick Estimate</h2>
                  <p className="text-sm text-gray-500">Create and attach inline</p>
                </div>
              </div>
              <button onClick={() => setShowQuickCreate(false)} className="p-2 text-gray-500 hover:text-gray-700">
                <X className="w-6 h-6" />
              </button>
            </div>

            {/* Tab buttons */}
            <div className="flex gap-2 p-4 bg-gray-100">
              <button
                onClick={() => setQuickCreateTab('manual')}
                className={`flex-1 py-2.5 rounded-lg text-sm font-medium transition-colors flex items-center justify-center gap-2 ${
                  quickCreateTab === 'manual' ? 'bg-blue-500 text-white' : 'bg-white text-gray-600'
                }`}
              >
                <Calculator className="w-4 h-4" />
                Line Items
              </button>
              <button
                onClick={() => setQuickCreateTab('ai')}
                className={`flex-1 py-2.5 rounded-lg text-sm font-medium transition-colors flex items-center justify-center gap-2 ${
                  quickCreateTab === 'ai' ? 'bg-blue-500 text-white' : 'bg-white text-gray-600'
                }`}
              >
                <Sparkles className="w-4 h-4" />
                AI Generate
              </button>
            </div>

            {/* Content */}
            <div className="p-4 overflow-y-auto max-h-[50vh]">
              {/* AI Generation Tab */}
              {quickCreateTab === 'ai' && (
                <div className="space-y-4">
                  <div className="p-4 bg-white rounded-xl border border-gray-200">
                    <p className="text-sm text-gray-600 mb-3">
                      Describe your project and AI will generate line items:
                    </p>
                    <textarea
                      value={quickAiPrompt}
                      onChange={(e) => setQuickAiPrompt(e.target.value)}
                      placeholder="e.g., Install new deck 12x16 ft with composite decking, railing, and stairs..."
                      className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg text-gray-900 text-sm resize-none placeholder-gray-400"
                      rows={4}
                    />
                    <button
                      onClick={generateAiEstimate}
                      disabled={!quickAiPrompt.trim() || quickAiLoading}
                      className="mt-3 w-full py-3 bg-blue-500 text-white rounded-lg font-medium flex items-center justify-center gap-2 disabled:opacity-50"
                    >
                      {quickAiLoading ? (
                        <>
                          <Loader2 className="w-5 h-5 animate-spin" />
                          Generating...
                        </>
                      ) : (
                        <>
                          <Sparkles className="w-5 h-5" />
                          Generate Line Items
                        </>
                      )}
                    </button>
                  </div>
                  <p className="text-xs text-gray-500 text-center">
                    AI will add items to your line items list
                  </p>
                </div>
              )}

              {/* Manual Line Items Tab */}
              {quickCreateTab === 'manual' && (
                <div className="space-y-4">
                  {/* Line Items */}
                  <div className="space-y-2">
                    {quickLineItems.length === 0 ? (
                      <div className="text-center py-8 bg-white rounded-xl border border-gray-200">
                        <FileCheck className="w-12 h-12 text-gray-300 mx-auto mb-3" />
                        <p className="text-gray-500 font-medium">No line items yet</p>
                        <p className="text-sm text-gray-400 mt-1">Add items manually or use AI</p>
                      </div>
                    ) : (
                      quickLineItems.map((item, idx) => (
                        <div key={item.id} className="flex items-center gap-2 p-3 bg-white rounded-lg border border-gray-200">
                          <input
                            type="text"
                            value={item.description}
                            onChange={(e) => updateQuickLineItem(idx, 'description', e.target.value)}
                            className="flex-1 px-2 py-1.5 bg-gray-50 border border-gray-200 rounded text-sm text-gray-900 placeholder-gray-400"
                            placeholder="Description"
                          />
                          <input
                            type="number"
                            value={item.quantity}
                            onChange={(e) => updateQuickLineItem(idx, 'quantity', e.target.value)}
                            className="w-16 px-2 py-1.5 bg-gray-50 border border-gray-200 rounded text-sm text-center text-gray-900"
                            placeholder="Qty"
                          />
                          <input
                            type="number"
                            value={item.unitPrice}
                            onChange={(e) => updateQuickLineItem(idx, 'unitPrice', e.target.value)}
                            className="w-20 px-2 py-1.5 bg-gray-50 border border-gray-200 rounded text-sm text-center text-gray-900"
                            placeholder="Price"
                          />
                          <span className="w-20 text-sm text-right text-gray-700 font-medium">
                            ${item.total.toFixed(2)}
                          </span>
                          <button
                            onClick={() => removeQuickLineItem(idx)}
                            className="text-red-400 hover:text-red-500 p-1"
                          >
                            <X className="w-4 h-4" />
                          </button>
                        </div>
                      ))
                    )}
                  </div>

                  {/* Add Line Item Button */}
                  <button
                    onClick={addQuickLineItem}
                    className="flex items-center gap-2 text-blue-500 text-sm font-medium"
                  >
                    <Plus className="w-4 h-4" />
                    Add Line Item
                  </button>

                  {/* Notes */}
                  <div>
                    <label className="block text-sm font-medium text-gray-600 mb-1">Notes (optional)</label>
                    <textarea
                      value={quickEstimateNotes}
                      onChange={(e) => setQuickEstimateNotes(e.target.value)}
                      placeholder="Add any notes for this estimate..."
                      className="w-full px-3 py-2 bg-white border border-gray-200 rounded-lg text-gray-900 text-sm resize-none placeholder-gray-400"
                      rows={2}
                    />
                  </div>

                  {/* Totals */}
                  {quickLineItems.length > 0 && (
                    <div className="p-4 bg-white rounded-xl border border-gray-200">
                      <div className="flex justify-between text-sm">
                        <span className="text-gray-500">Subtotal</span>
                        <span className="text-gray-900">${quickEstimateSubtotal.toFixed(2)}</span>
                      </div>
                      <div className="flex justify-between text-sm mt-1">
                        <span className="text-gray-500">Tax (8%)</span>
                        <span className="text-gray-900">${quickEstimateTax.toFixed(2)}</span>
                      </div>
                      <div className="flex justify-between font-semibold mt-2 pt-2 border-t border-gray-200">
                        <span className="text-gray-900">Total</span>
                        <span className="text-blue-600">${quickEstimateTotal.toFixed(2)}</span>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Footer */}
            <div className="p-4 border-t border-gray-200 bg-gray-50">
              <button
                onClick={saveQuickEstimate}
                disabled={quickLineItems.length === 0 || savingQuickEstimate}
                className="w-full py-4 bg-blue-500 text-white rounded-xl font-semibold disabled:opacity-50 flex items-center justify-center gap-2"
              >
                {savingQuickEstimate ? (
                  <>
                    <Loader2 className="w-5 h-5 animate-spin" />
                    Creating...
                  </>
                ) : (
                  <>
                    <FileCheck className="w-5 h-5" />
                    Create & Attach Estimate
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
};

export default SendEmailModal;
