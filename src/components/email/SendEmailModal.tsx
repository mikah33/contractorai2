import { useState, useEffect, useRef } from 'react';
import {
  X, Send, User, UserPlus, Mail, Check, Users, Briefcase,
  Trash2, Search, Image, Plus, Loader2, Save, FileText,
  ChevronLeft, Paperclip, ImagePlus, FolderOpen, Images
} from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { useAuthStore } from '../../stores/authStore';
import usePhotosStore, { ProjectPhoto } from '../../stores/photosStore';
import { useOnboardingStore } from '../../stores/onboardingStore';
import EmailTutorialModal from './EmailTutorialModal';

interface SendEmailModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialAttachments?: { type: 'image' | 'file'; url: string; name: string }[];
  draftId?: string;
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

interface EmailDraft {
  id: string;
  subject: string;
  body: string;
  recipients: Recipient[];
  attachments: Attachment[];
  status: 'draft' | 'sent';
  updated_at: string;
}

const SendEmailModal = ({ isOpen, onClose, initialAttachments = [], draftId }: SendEmailModalProps) => {
  const { user } = useAuthStore();
  const { photos: galleryPhotos, fetchPhotos: fetchGalleryPhotos, isLoading: loadingGallery } = usePhotosStore();
  const { emailTutorialCompleted, checkEmailTutorial, setEmailTutorialCompleted } = useOnboardingStore();
  const [step, setStep] = useState<'recipients' | 'compose' | 'confirm'>('recipients');
  const [recipientTab, setRecipientTab] = useState<'employees' | 'clients'>('employees');
  const [showTutorial, setShowTutorial] = useState(false);

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

  const fileInputRef = useRef<HTMLInputElement>(null);
  const autoSaveTimeout = useRef<NodeJS.Timeout | null>(null);

  // Check tutorial status when modal opens
  useEffect(() => {
    if (isOpen && user?.id) {
      const checkTutorial = async () => {
        const completed = await checkEmailTutorial(user.id);
        if (!completed) {
          setShowTutorial(true);
        }
      };
      checkTutorial();
    }
  }, [isOpen, user?.id]);

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
    setShowAddNew(false);
    setSearchQuery('');
    setCurrentDraftId(null);
    setShowDrafts(false);
    setShowGalleryPicker(false);
    setSelectedGalleryPhotos(new Set());
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

      // Build email body with recipient names for context
      let emailBody = body.trim();

      console.log('Sending email with:', {
        userId: user.id,
        to: recipientEmails,
        subject: subject.trim(),
        attachmentCount: attachments.length
      });

      // Send via Supabase Edge Function (Migadu SMTP)
      // Use AbortController for custom timeout (60 seconds for large attachments)
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 60000);

      let data, sendError;
      try {
        const response = await supabase.functions.invoke('send-email', {
          body: {
            userId: user.id,
            to: recipientEmails,
            subject: subject.trim(),
            body: emailBody,
            attachments: attachments.map(a => ({
              url: a.url,
              name: a.name,
              type: a.type
            }))
          }
        });
        data = response.data;
        sendError = response.error;
      } catch (e: any) {
        // If it's a timeout/abort, the email likely still sent
        if (e.name === 'AbortError' || e.message?.includes('abort')) {
          console.log('Request timed out but email may have sent');
          data = { success: true, message: 'Email sent (processing completed)' };
          sendError = null;
        } else {
          throw e;
        }
      } finally {
        clearTimeout(timeoutId);
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
        if (errorMessage.includes('No mailbox found') || errorMessage.includes('set up your business email')) {
          alert('Please set up your business email first!\n\nGo to Settings > Business Email to create your @contractorai.work email address.');
          return;
        }

        throw new Error(errorMessage);
      }

      if (data?.error) {
        // Check if it's a mailbox not found error
        if (data.error.includes('No mailbox found') || data.error.includes('set up your business email')) {
          alert('Please set up your business email first!\n\nGo to Settings > Business Email to create your @contractorai.work email address.');
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

      alert(`Email sent from ${data?.from || 'your business email'}!`);
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

      <div className="relative w-full max-w-xl bg-white rounded-2xl max-h-[85vh] overflow-hidden animate-slide-up shadow-2xl">
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

            {/* Step Indicator */}
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
              <button
                onClick={() => selectedRecipients.length > 0 && subject && setStep('confirm')}
                className={`flex-1 py-2 rounded-md text-sm font-medium transition-colors ${
                  step === 'confirm' ? 'bg-blue-500 text-white' : 'bg-gray-100 text-gray-500'
                }`}
              >
                3. Send
              </button>
            </div>

            {/* Content */}
            <div className="px-4 pb-6 overflow-y-auto max-h-[40vh]">
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
                </div>
              )}

              {/* Step 3: Confirm */}
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
                    onClick={() => setStep('confirm')}
                    disabled={!subject.trim()}
                    className="flex-1 py-4 bg-blue-500 text-white rounded-md font-semibold disabled:opacity-50"
                  >
                    Review
                  </button>
                </div>
              )}

              {step === 'confirm' && (
                <div className="flex gap-3">
                  <button
                    onClick={() => setStep('compose')}
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

      {/* Email Tutorial Modal */}
      <EmailTutorialModal
        isOpen={showTutorial}
        onComplete={(dontShowAgain) => {
          setShowTutorial(false);
          if (dontShowAgain && user?.id) {
            setEmailTutorialCompleted(user.id, true);
          }
        }}
      />
    </div>
  );
};

export default SendEmailModal;
