import { useState, useEffect, useRef } from 'react';
import { X, Send, Clock, User, UserPlus, Calendar as CalendarIcon, Mail, MapPin, Check, Users, Briefcase, Trash2, Search, Image, Images, Loader2, ChevronLeft, ImagePlus } from 'lucide-react';
import { CalendarEvent } from '../../services/calendarService';
import { supabase } from '../../lib/supabase';
import { useAuthStore } from '../../stores/authStore';
import { format, parseISO } from 'date-fns';
import usePhotosStore, { ProjectPhoto } from '../../stores/photosStore';

interface NotificationWebhookModalProps {
  isOpen: boolean;
  onClose: () => void;
  event: CalendarEvent | null;
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
  url: string;
  name: string;
}

const NotificationWebhookModal = ({ isOpen, onClose, event }: NotificationWebhookModalProps) => {
  const { user } = useAuthStore();
  const { photos: galleryPhotos, fetchPhotos: fetchGalleryPhotos, isLoading: loadingGallery } = usePhotosStore();
  const [step, setStep] = useState<'recipients' | 'message' | 'confirm'>('recipients');
  const [recipientTab, setRecipientTab] = useState<'employees' | 'clients'>('employees');
  const [message, setMessage] = useState('');
  const [selectedRecipients, setSelectedRecipients] = useState<Recipient[]>([]);
  const [isSending, setIsSending] = useState(false);
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [clients, setClients] = useState<Client[]>([]);
  const [showAddNew, setShowAddNew] = useState(false);
  const [newRecipient, setNewRecipient] = useState({ name: '', email: '' });
  const [isCreating, setIsCreating] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [attachments, setAttachments] = useState<Attachment[]>([]);
  const [isUploading, setIsUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Gallery picker state
  const [showGalleryPicker, setShowGalleryPicker] = useState(false);
  const [selectedGalleryPhotos, setSelectedGalleryPhotos] = useState<Set<string>>(new Set());

  // Fetch employees and clients when modal opens
  useEffect(() => {
    if (isOpen && user) {
      const fetchData = async () => {
        try {
          // Fetch employees
          const { data: empData } = await supabase
            .from('employees')
            .select('id, name, email')
            .eq('user_id', user.id);
          if (empData) setEmployees(empData);

          // Fetch clients
          const { data: clientData } = await supabase
            .from('clients')
            .select('id, name, email, company')
            .eq('user_id', user.id);
          if (clientData) setClients(clientData.filter(c => c.email));
        } catch (error) {
          console.error('Error fetching data:', error);
        }
      };
      fetchData();
    }
  }, [isOpen, user]);

  // Reset state when modal opens
  useEffect(() => {
    if (isOpen) {
      setStep('recipients');
      setRecipientTab('employees');
      setSelectedRecipients([]);
      setMessage('');
      setShowAddNew(false);
      setSearchQuery('');
      setAttachments([]);
      setShowGalleryPicker(false);
      setSelectedGalleryPhotos(new Set());
    }
  }, [isOpen]);

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
      url: p.imageUrl,
      name: p.caption || `Photo ${p.id.slice(0, 8)}`
    }));
    setAttachments(prev => [...prev, ...newAttachments]);
    setShowGalleryPicker(false);
    setSelectedGalleryPhotos(new Set());
  };

  // Handle image upload
  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0 || !user) return;

    setIsUploading(true);
    try {
      for (const file of Array.from(files)) {
        const fileName = `${user.id}/email-attachments/${Date.now()}-${file.name}`;
        const { error: uploadError } = await supabase.storage
          .from('project-photos')
          .upload(fileName, file, {
            contentType: file.type,
            upsert: false
          });

        if (uploadError) {
          console.error('Upload error:', uploadError);
          continue;
        }

        const { data: { publicUrl } } = supabase.storage
          .from('project-photos')
          .getPublicUrl(fileName);

        setAttachments(prev => [...prev, { url: publicUrl, name: file.name }]);
      }
    } catch (error) {
      console.error('Error uploading:', error);
      alert('Failed to upload image');
    } finally {
      setIsUploading(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  const removeAttachment = (index: number) => {
    setAttachments(prev => prev.filter((_, i) => i !== index));
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

      // Auto-select the new recipient
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

  const handleSend = async () => {
    if (!event || selectedRecipients.length === 0) return;

    setIsSending(true);
    try {
      const payload = {
        event: {
          id: event.id,
          title: event.title,
          description: event.description,
          start_date: event.start_date,
          end_date: event.end_date,
          location: event.location,
          event_type: event.event_type,
          status: event.status,
        },
        notification: {
          trigger_time: new Date().toISOString(),
          message: message,
          recipients: selectedRecipients.map(r => ({
            email: r.email,
            name: r.name,
            type: r.type
          })),
          attachments: attachments.map(a => ({
            url: a.url,
            name: a.name
          })),
        },
        timestamp: new Date().toISOString()
      };

      const response = await fetch('https://contractorai.app.n8n.cloud/webhook/110a2ba9-93f2-4574-b2f6-3dc1d2f69637', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      if (response.ok) {
        alert('Email sent successfully!');
        onClose();
      } else {
        throw new Error('Failed to send');
      }
    } catch (error) {
      console.error('Error sending:', error);
      alert('Failed to send email');
    } finally {
      setIsSending(false);
    }
  };

  if (!isOpen || !event) return null;

  const currentList = recipientTab === 'employees' ? employees : clients;

  // Filter list based on search query
  const filteredList = currentList.filter((item) => {
    if (!searchQuery.trim()) return true;
    const query = searchQuery.toLowerCase();
    const nameMatch = item.name.toLowerCase().includes(query);
    const emailMatch = item.email.toLowerCase().includes(query);
    const companyMatch = 'company' in item && item.company ? item.company.toLowerCase().includes(query) : false;
    return nameMatch || emailMatch || companyMatch;
  });

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/80" onClick={onClose} />

      {/* Modal */}
      <div className="relative w-full max-w-lg bg-[#1C1C1E] rounded-t-2xl max-h-[90vh] overflow-hidden animate-slide-up">
        {/* Handle */}
        <div className="flex justify-center pt-3 pb-2">
          <div className="w-10 h-1 bg-[#3A3A3C] rounded-full" />
        </div>

        {/* Header */}
        <div className="flex items-center justify-between px-4 pb-4 border-b border-[#3A3A3C]">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 flex items-center justify-center">
              <Mail className="w-5 h-5 text-white" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-white">Send Email</h2>
              <p className="text-sm text-zinc-400">Notify about event</p>
            </div>
          </div>
          <button onClick={onClose} className="p-2 text-zinc-400 hover:text-white rounded-md">
            <X className="w-6 h-6" />
          </button>
        </div>

        {/* Event Preview */}
        <div className="mx-4 mt-4 p-4 bg-[#2C2C2E] rounded-lg border border-[#3A3A3C]">
          <div className="flex items-start gap-3">
            <div className="w-10 h-10 flex items-center justify-center flex-shrink-0">
              <CalendarIcon className="w-5 h-5 text-white" />
            </div>
            <div className="flex-1 min-w-0">
              <h3 className="font-semibold text-white truncate">{event.title}</h3>
              {event.start_date && (
                <p className="text-sm text-zinc-400 mt-1">
                  <Clock className="w-3.5 h-3.5 inline mr-1" />
                  {format(parseISO(event.start_date), 'MMM d, yyyy • h:mm a')}
                </p>
              )}
              {event.location && (
                <p className="text-sm text-zinc-500 mt-1 truncate">
                  <MapPin className="w-3.5 h-3.5 inline mr-1" />
                  {event.location}
                </p>
              )}
            </div>
          </div>
        </div>

        {/* Selected Recipients Bar */}
        {selectedRecipients.length > 0 && (
          <div className="mx-4 mt-3 p-3 bg-[#2C2C2E] border border-[#3A3A3C] rounded-lg">
            <div className="flex items-center justify-between mb-2">
              <p className="text-sm font-medium text-white">
                {selectedRecipients.length} recipient{selectedRecipients.length !== 1 ? 's' : ''} selected
              </p>
            </div>
            <div className="flex flex-wrap gap-2">
              {selectedRecipients.map((r) => (
                <div
                  key={`${r.type}-${r.id}`}
                  className="flex items-center gap-2 px-3 py-1.5 bg-[#3A3A3C] rounded-md"
                >
                  <span className="text-sm text-white">{r.name}</span>
                  <button
                    onClick={() => removeRecipient(r.id, r.type)}
                    className="text-zinc-400 hover:text-white"
                  >
                    <X className="w-4 h-4" />
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
              step === 'recipients' ? 'bg-white text-black' : 'bg-[#2C2C2E] text-zinc-400'
            }`}
          >
            1. Recipients
          </button>
          <button
            onClick={() => selectedRecipients.length > 0 && setStep('message')}
            className={`flex-1 py-2 rounded-md text-sm font-medium transition-colors ${
              step === 'message' ? 'bg-white text-black' : 'bg-[#2C2C2E] text-zinc-400'
            }`}
          >
            2. Message
          </button>
          <button
            onClick={() => selectedRecipients.length > 0 && setStep('confirm')}
            className={`flex-1 py-2 rounded-md text-sm font-medium transition-colors ${
              step === 'confirm' ? 'bg-white text-black' : 'bg-[#2C2C2E] text-zinc-400'
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
              {/* Tab Toggle */}
              <div className="flex gap-2 p-1 bg-[#2C2C2E] rounded-lg">
                <button
                  onClick={() => { setRecipientTab('employees'); setSearchQuery(''); }}
                  className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-md text-sm font-medium transition-colors ${
                    recipientTab === 'employees' ? 'bg-[#3A3A3C] text-white' : 'text-zinc-400'
                  }`}
                >
                  <Users className="w-4 h-4" />
                  Team ({employees.length})
                </button>
                <button
                  onClick={() => { setRecipientTab('clients'); setSearchQuery(''); }}
                  className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-md text-sm font-medium transition-colors ${
                    recipientTab === 'clients' ? 'bg-[#3A3A3C] text-white' : 'text-zinc-400'
                  }`}
                >
                  <Briefcase className="w-4 h-4" />
                  Clients ({clients.length})
                </button>
              </div>

              {/* Search Input */}
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-zinc-500" />
                <input
                  type="text"
                  placeholder={`Search ${recipientTab === 'employees' ? 'team members' : 'clients'}...`}
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-10 pr-4 py-3 bg-[#2C2C2E] border border-[#3A3A3C] rounded-lg text-white placeholder-zinc-500 focus:border-zinc-500 focus:outline-none"
                />
                {searchQuery && (
                  <button
                    onClick={() => setSearchQuery('')}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-500 hover:text-white"
                  >
                    <X className="w-4 h-4" />
                  </button>
                )}
              </div>

              {/* Add New Button */}
              <div className="flex justify-end">
                <button
                  onClick={() => setShowAddNew(!showAddNew)}
                  className="text-sm text-white font-medium flex items-center gap-1 hover:text-zinc-300"
                >
                  <UserPlus className="w-4 h-4" />
                  Add {recipientTab === 'employees' ? 'Employee' : 'Client'}
                </button>
              </div>

              {/* Add New Form */}
              {showAddNew && (
                <div className="p-4 bg-[#2C2C2E] rounded-lg border border-[#3A3A3C] space-y-3">
                  <input
                    type="text"
                    placeholder="Name"
                    value={newRecipient.name}
                    onChange={(e) => setNewRecipient({ ...newRecipient, name: e.target.value })}
                    className="w-full px-4 py-3 bg-[#1C1C1E] border border-[#3A3A3C] rounded-md text-white placeholder-zinc-500 focus:border-zinc-500 focus:outline-none"
                  />
                  <input
                    type="email"
                    placeholder="Email"
                    value={newRecipient.email}
                    onChange={(e) => setNewRecipient({ ...newRecipient, email: e.target.value })}
                    className="w-full px-4 py-3 bg-[#1C1C1E] border border-[#3A3A3C] rounded-md text-white placeholder-zinc-500 focus:border-zinc-500 focus:outline-none"
                  />
                  <button
                    onClick={handleCreateNew}
                    disabled={isCreating || !newRecipient.name || !newRecipient.email}
                    className="w-full py-3 bg-white text-black rounded-md font-medium disabled:opacity-50 hover:bg-zinc-200 transition-colors"
                  >
                    {isCreating ? 'Creating...' : 'Create & Add'}
                  </button>
                </div>
              )}

              {/* List */}
              {currentList.length === 0 ? (
                <div className="text-center py-8">
                  {recipientTab === 'employees' ? (
                    <Users className="w-12 h-12 text-zinc-600 mx-auto mb-3" />
                  ) : (
                    <Briefcase className="w-12 h-12 text-zinc-600 mx-auto mb-3" />
                  )}
                  <p className="text-zinc-400">No {recipientTab} yet</p>
                  <p className="text-sm text-zinc-500">Add someone to get started</p>
                </div>
              ) : filteredList.length === 0 ? (
                <div className="text-center py-8">
                  <Search className="w-12 h-12 text-zinc-600 mx-auto mb-3" />
                  <p className="text-zinc-400">No results found</p>
                  <p className="text-sm text-zinc-500">Try a different search term</p>
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
                            ? 'bg-[#3A3A3C] border-white'
                            : 'bg-[#2C2C2E] border-[#3A3A3C] hover:border-zinc-500'
                        }`}
                      >
                        <div className={`w-10 h-10 rounded-full flex items-center justify-center ${
                          selected ? 'bg-white' : 'bg-[#3A3A3C]'
                        }`}>
                          {selected ? (
                            <Check className="w-5 h-5 text-black" />
                          ) : recipientTab === 'employees' ? (
                            <User className="w-5 h-5 text-zinc-400" />
                          ) : (
                            <Briefcase className="w-5 h-5 text-zinc-400" />
                          )}
                        </div>
                        <div className="flex-1 text-left">
                          <p className="font-medium text-white">{item.name}</p>
                          <p className="text-sm text-zinc-400">{item.email}</p>
                          {'company' in item && item.company && (
                            <p className="text-xs text-zinc-500">{item.company}</p>
                          )}
                        </div>
                        {selected && (
                          <div className="text-white">
                            <Check className="w-5 h-5" />
                          </div>
                        )}
                      </button>
                    );
                  })}
                </div>
              )}
            </div>
          )}

          {/* Step 2: Message */}
          {step === 'message' && (
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-zinc-300 mb-2">
                  Add a personal message (optional):
                </label>
                <textarea
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  placeholder="Hey, just a reminder about this upcoming event..."
                  rows={5}
                  className="w-full px-4 py-3 bg-[#2C2C2E] border border-[#3A3A3C] rounded-lg text-white placeholder-zinc-500 focus:border-zinc-500 focus:outline-none resize-none"
                />
              </div>

              {/* Image Attachments */}
              <div>
                <label className="block text-sm font-medium text-zinc-300 mb-2">
                  Attach Photos (optional):
                </label>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  multiple
                  onChange={handleImageUpload}
                  className="hidden"
                />
                <div className="flex gap-2">
                  <button
                    onClick={() => fileInputRef.current?.click()}
                    disabled={isUploading}
                    className="flex-1 flex items-center justify-center gap-2 p-4 bg-[#2C2C2E] border border-dashed border-[#3A3A3C] rounded-lg text-zinc-400 hover:text-white hover:border-zinc-500 transition-colors disabled:opacity-50"
                  >
                    {isUploading ? (
                      <>
                        <Loader2 className="w-5 h-5 animate-spin" />
                        <span>Uploading...</span>
                      </>
                    ) : (
                      <>
                        <ImagePlus className="w-5 h-5" />
                        <span>Upload</span>
                      </>
                    )}
                  </button>
                  <button
                    onClick={openGalleryPicker}
                    className="flex-1 flex items-center justify-center gap-2 p-4 bg-[#2C2C2E] border border-dashed border-[#3A3A3C] rounded-lg text-zinc-400 hover:text-white hover:border-zinc-500 transition-colors"
                  >
                    <Images className="w-5 h-5" />
                    <span>Gallery</span>
                  </button>
                </div>

                {/* Attachments Preview */}
                {attachments.length > 0 && (
                  <div className="mt-3 grid grid-cols-3 gap-2">
                    {attachments.map((attachment, index) => (
                      <div key={index} className="relative aspect-square rounded-lg overflow-hidden bg-zinc-800">
                        <img
                          src={attachment.url}
                          alt={attachment.name}
                          className="w-full h-full object-cover"
                        />
                        <button
                          onClick={() => removeAttachment(index)}
                          className="absolute top-1 right-1 p-1 bg-black/60 rounded-full hover:bg-black/80"
                        >
                          <X className="w-4 h-4 text-white" />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <div className="p-4 bg-[#2C2C2E] rounded-lg">
                <p className="text-sm text-zinc-400 mb-2">Email will include:</p>
                <ul className="text-sm text-zinc-300 space-y-1">
                  <li>• Event title and details</li>
                  <li>• Date and time</li>
                  <li>• Location (if provided)</li>
                  <li>• Your personal message</li>
                  {attachments.length > 0 && (
                    <li>• {attachments.length} photo{attachments.length !== 1 ? 's' : ''} attached</li>
                  )}
                </ul>
              </div>
            </div>
          )}

          {/* Step 3: Confirm */}
          {step === 'confirm' && (
            <div className="space-y-4">
              <div className="p-4 bg-[#2C2C2E] rounded-lg">
                <h4 className="font-medium text-white mb-3">Sending to:</h4>
                <div className="space-y-2">
                  {selectedRecipients.map((r) => (
                    <div key={`${r.type}-${r.id}`} className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-full flex items-center justify-center bg-[#3A3A3C]">
                          {r.type === 'employee' ? (
                            <User className="w-4 h-4 text-white" />
                          ) : (
                            <Briefcase className="w-4 h-4 text-white" />
                          )}
                        </div>
                        <div>
                          <p className="text-sm font-medium text-white">{r.name}</p>
                          <p className="text-xs text-zinc-400">{r.email}</p>
                        </div>
                      </div>
                      <button
                        onClick={() => removeRecipient(r.id, r.type)}
                        className="p-2 text-zinc-400 hover:text-white"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  ))}
                </div>
              </div>

              {message && (
                <div className="p-4 bg-[#2C2C2E] rounded-lg">
                  <h4 className="font-medium text-white mb-2">Your message:</h4>
                  <p className="text-sm text-zinc-300">{message}</p>
                </div>
              )}

              {/* Attachments Preview */}
              {attachments.length > 0 && (
                <div className="p-4 bg-[#2C2C2E] rounded-lg">
                  <h4 className="font-medium text-white mb-3">
                    {attachments.length} Photo{attachments.length !== 1 ? 's' : ''} Attached:
                  </h4>
                  <div className="grid grid-cols-4 gap-2">
                    {attachments.map((attachment, index) => (
                      <div key={index} className="relative aspect-square rounded-lg overflow-hidden bg-zinc-800">
                        <img
                          src={attachment.url}
                          alt={attachment.name}
                          className="w-full h-full object-cover"
                        />
                      </div>
                    ))}
                  </div>
                </div>
              )}

              <div className="p-4 bg-[#2C2C2E] border border-[#3A3A3C] rounded-lg">
                <p className="text-sm text-zinc-300">
                  Ready to send! Click the button below to notify your recipients.
                </p>
              </div>
            </div>
          )}
        </div>

        {/* Footer Actions */}
        <div className="p-4 border-t border-[#3A3A3C] bg-[#1C1C1E]">
          {step === 'recipients' && (
            <button
              onClick={() => setStep('message')}
              disabled={selectedRecipients.length === 0}
              className="w-full py-4 bg-white text-black rounded-md font-semibold disabled:opacity-50 disabled:cursor-not-allowed hover:bg-zinc-200 transition-colors"
            >
              Continue ({selectedRecipients.length} selected)
            </button>
          )}

          {step === 'message' && (
            <div className="flex gap-3">
              <button
                onClick={() => setStep('recipients')}
                className="flex-1 py-4 bg-[#2C2C2E] text-white rounded-md font-semibold border border-[#3A3A3C] hover:border-zinc-500 transition-colors"
              >
                Back
              </button>
              <button
                onClick={() => setStep('confirm')}
                className="flex-1 py-4 bg-white text-black rounded-md font-semibold hover:bg-zinc-200 transition-colors"
              >
                Review
              </button>
            </div>
          )}

          {step === 'confirm' && (
            <div className="flex gap-3">
              <button
                onClick={() => setStep('message')}
                className="flex-1 py-4 bg-[#2C2C2E] text-white rounded-md font-semibold border border-[#3A3A3C] hover:border-zinc-500 transition-colors"
              >
                Back
              </button>
              <button
                onClick={handleSend}
                disabled={isSending || selectedRecipients.length === 0}
                className="flex-1 py-4 bg-white text-black rounded-md font-semibold flex items-center justify-center gap-2 disabled:opacity-50 hover:bg-zinc-200 transition-colors"
              >
                <Send className="w-5 h-5" />
                {isSending ? 'Sending...' : 'Send Email'}
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Gallery Picker Modal */}
      {showGalleryPicker && (
        <div className="fixed inset-0 z-[100] flex items-end justify-center">
          <div className="absolute inset-0 bg-black/90" onClick={() => setShowGalleryPicker(false)} />

          <div className="relative w-full max-w-lg bg-[#1C1C1E] rounded-t-2xl max-h-[85vh] overflow-hidden animate-slide-up">
            {/* Handle */}
            <div className="flex justify-center pt-3 pb-2">
              <div className="w-10 h-1 bg-[#3A3A3C] rounded-full" />
            </div>

            {/* Header */}
            <div className="flex items-center justify-between px-4 pb-4 border-b border-[#3A3A3C]">
              <div className="flex items-center gap-3">
                <button
                  onClick={() => setShowGalleryPicker(false)}
                  className="p-1 text-zinc-400 hover:text-white"
                >
                  <ChevronLeft className="w-5 h-5" />
                </button>
                <div className="w-10 h-10 bg-white/10 rounded-lg flex items-center justify-center">
                  <Images className="w-5 h-5 text-white" />
                </div>
                <div>
                  <h2 className="text-lg font-bold text-white">Select Photos</h2>
                  <p className="text-sm text-zinc-400">
                    {selectedGalleryPhotos.size > 0
                      ? `${selectedGalleryPhotos.size} selected`
                      : 'Choose from your gallery'}
                  </p>
                </div>
              </div>
              <button onClick={() => setShowGalleryPicker(false)} className="p-2 text-zinc-400 hover:text-white">
                <X className="w-6 h-6" />
              </button>
            </div>

            {/* Gallery Grid */}
            <div className="p-4 overflow-y-auto max-h-[55vh]">
              {loadingGallery ? (
                <div className="flex items-center justify-center py-12">
                  <Loader2 className="w-8 h-8 text-white animate-spin" />
                </div>
              ) : galleryPhotos.length === 0 ? (
                <div className="text-center py-12">
                  <Images className="w-12 h-12 text-zinc-600 mx-auto mb-3" />
                  <p className="text-zinc-400 font-medium">No photos in gallery</p>
                  <p className="text-sm text-zinc-500 mt-1">Take some project photos first</p>
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
                            ? 'border-white ring-2 ring-white/50'
                            : 'border-transparent hover:border-zinc-600'
                        }`}
                      >
                        <img
                          src={photo.imageUrl}
                          alt={photo.caption || 'Photo'}
                          className="w-full h-full object-cover"
                        />
                        {isSelected && (
                          <div className="absolute inset-0 bg-white/30 flex items-center justify-center">
                            <div className="w-8 h-8 bg-white rounded-full flex items-center justify-center">
                              <Check className="w-5 h-5 text-black" />
                            </div>
                          </div>
                        )}
                        {photo.projectName && (
                          <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/80 to-transparent p-1.5">
                            <p className="text-xs text-white truncate">{photo.projectName}</p>
                          </div>
                        )}
                      </button>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Footer */}
            <div className="p-4 border-t border-[#3A3A3C] bg-[#1C1C1E]">
              <button
                onClick={addSelectedGalleryPhotos}
                disabled={selectedGalleryPhotos.size === 0}
                className="w-full py-4 bg-white text-black rounded-md font-semibold disabled:opacity-50 flex items-center justify-center gap-2 hover:bg-zinc-200 transition-colors"
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
    </div>
  );
};

export default NotificationWebhookModal;
