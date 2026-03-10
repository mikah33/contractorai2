import React, { useState, useEffect } from 'react';
import { X, Phone, Mail, MapPin, Calendar, UserPlus, ChevronDown, ChevronUp, Megaphone, FileText, Target, BarChart3, Facebook, Eye, MousePointer, DollarSign, Users, MapPinned, Loader2, ExternalLink, MessageSquare, PhoneCall, MailPlus, Clock, CheckCircle2, Trash2 } from 'lucide-react';
import { useTheme, getThemeClasses } from '../../contexts/ThemeContext';
import { useLeadsStore, type Lead, type OutreachAttempt } from '../../stores/leadsStore';
import LeadStatusBadge from './LeadStatusBadge';
import { supabase } from '../../lib/supabase';
import { format, formatDistanceToNow } from 'date-fns';

interface LeadDetailModalProps {
  lead: Lead;
  onClose: () => void;
}

interface AdDetails {
  ad: { id: string; name: string; status: string };
  creative: {
    title: string | null;
    body: string | null;
    description: string | null;
    imageUrl: string | null;
    callToAction: string | null;
    link: string | null;
  };
  metrics: {
    impressions: number;
    clicks: number;
    spend: string;
    cpc: string | null;
    ctr: string | null;
    leads: number;
    costPerLead: string | null;
  } | null;
  demographics: { age: string; gender: string; impressions: number; clicks: number }[] | null;
  regions: { region: string; impressions: number; clicks: number }[] | null;
}

const formatValue = (value: string): string => {
  if (!value) return '';
  if (value.startsWith('http') || value.includes('@')) return value;
  return value.replace(/_/g, ' ').replace(/-/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());
};

const formatKey = (key: string): string => {
  return key.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());
};

const SKIP_FIELDS = [
  'email', 'phone_number', 'phone', 'full_name', 'first_name', 'last_name',
  'street_address', 'city', 'state', 'zip_code', 'zip', 'postal_code',
  'message', 'comments', 'country',
];

const isUrl = (value: string): boolean => /^https?:\/\//i.test(value?.trim?.() || '');

const LeadDetailModal: React.FC<LeadDetailModalProps> = ({ lead, onClose }) => {
  const { theme } = useTheme();
  const themeClasses = getThemeClasses(theme);
  const { updateLeadStatus, updateLeadNotes, convertToClient, logOutreach, deleteLead } = useLeadsStore();
  const [notes, setNotes] = useState(lead.notes || '');
  const [showStatusDropdown, setShowStatusDropdown] = useState(false);
  const [saving, setSaving] = useState(false);
  const [showOutreachPopup, setShowOutreachPopup] = useState(false);
  const [outreachNotes, setOutreachNotes] = useState('');
  const [loggingOutreach, setLoggingOutreach] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [deleting, setDeleting] = useState(false);

  // Ad details state
  const [showAdDetails, setShowAdDetails] = useState(false);
  const [adDetails, setAdDetails] = useState<AdDetails | null>(null);
  const [adLoading, setAdLoading] = useState(false);
  const [adError, setAdError] = useState<string | null>(null);
  const [activeAdTab, setActiveAdTab] = useState<'creative' | 'metrics' | 'audience'>('creative');

  const pd = lead.projectDetails || {};
  const hasAdId = !!pd.fb_ad_id;

  // Fetch ad details when expanded
  useEffect(() => {
    if (showAdDetails && hasAdId && !adDetails && !adLoading) {
      fetchAdDetails();
    }
  }, [showAdDetails]);

  const fetchAdDetails = async () => {
    setAdLoading(true);
    setAdError(null);
    try {
      const { data, error } = await supabase.functions.invoke('fb-ad-details', {
        body: { adId: pd.fb_ad_id, pageId: pd.fb_page_id },
      });
      if (error) throw error;
      if (data?.error) {
        setAdError(data.error);
      } else {
        setAdDetails(data);
      }
    } catch (err) {
      setAdError(err instanceof Error ? err.message : 'Failed to load ad details');
    } finally {
      setAdLoading(false);
    }
  };

  const handleStatusChange = async (status: Lead['status']) => {
    await updateLeadStatus(lead.id, status);
    setShowStatusDropdown(false);
  };

  const handleSaveNotes = async () => {
    setSaving(true);
    await updateLeadNotes(lead.id, notes);
    setSaving(false);
  };

  const handleLogOutreach = async (method: OutreachAttempt['method']) => {
    setLoggingOutreach(true);
    await logOutreach(lead.id, method, outreachNotes || undefined);
    setLoggingOutreach(false);
    setShowOutreachPopup(false);
    setOutreachNotes('');
  };

  const handleConvert = async () => {
    await convertToClient(lead.id);
    onClose();
  };

  const handleDelete = async () => {
    setDeleting(true);
    await deleteLead(lead.id);
    setDeleting(false);
    onClose();
  };

  const totalOutreachSteps = lead.outreachCount >= 5 ? 7 : 5;
  const isActionDue = lead.nextOutreachDate && new Date(lead.nextOutreachDate) <= new Date();

  const sourceLabel = {
    website_widget: 'Website Widget',
    facebook_lead_ad: 'Facebook Lead Ad',
    website: 'Website Form',
    manual: 'Manual Entry',
    referral: 'Referral',
  }[lead.source] || lead.source;

  const displayName = (lead.name && lead.name !== 'Facebook Lead')
    ? lead.name
    : (pd.raw_fields?.full_name || (pd.raw_fields?.first_name ? `${pd.raw_fields.first_name} ${pd.raw_fields.last_name || ''}`.trim() : null) || lead.email || lead.phone || 'Unknown Lead');

  const formResponses = pd.raw_fields
    ? Object.entries(pd.raw_fields as Record<string, string>)
        .filter(([k, v]) => !SKIP_FIELDS.includes(k) && v && !isUrl(v))
    : [];

  return (
    <div className="fixed inset-0 z-[9999] flex items-end md:items-center justify-center">
      <div className="absolute inset-0 bg-black/50" onClick={onClose} />
      <div className={`relative w-full max-w-lg ${themeClasses.bg.modal} rounded-t-2xl md:rounded-2xl max-h-[80vh] overflow-y-auto mb-0 md:mb-0`} style={{ marginBottom: 'env(safe-area-inset-bottom, 0px)' }}>
        {/* Header */}
        <div className={`sticky top-0 ${themeClasses.bg.modal} px-5 pt-5 pb-3 border-b ${themeClasses.border.primary} z-10`}>
          <div className="flex items-center justify-between">
            <h2 className={`text-lg font-bold ${themeClasses.text.primary}`}>Lead Details</h2>
            <button onClick={onClose} className={`p-2 rounded-lg ${themeClasses.hover.bg}`}>
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        <div className="px-5 py-4 space-y-5">
          {/* Name + Status */}
          <div className="flex items-start justify-between">
            <div className="flex-1 min-w-0">
              <h3 className={`text-xl font-bold ${themeClasses.text.primary} truncate`}>{displayName}</h3>
              <p className={`text-sm ${themeClasses.text.muted} mt-0.5`}>{sourceLabel}</p>
            </div>
            <div className="relative flex-shrink-0 ml-3">
              <button onClick={() => setShowStatusDropdown(!showStatusDropdown)} className="flex items-center gap-1">
                <LeadStatusBadge status={lead.status} size="md" />
                <ChevronDown className="w-4 h-4" />
              </button>
              {showStatusDropdown && (
                <div className={`absolute right-0 top-full mt-1 ${themeClasses.bg.card} rounded-lg shadow-xl border ${themeClasses.border.primary} z-20 min-w-[140px]`}>
                  {(['new', 'contacted', 'quoted', 'converted', 'lost', 'cold', 'dead'] as Lead['status'][]).map((s) => (
                    <button key={s} onClick={() => handleStatusChange(s)} className={`w-full text-left px-3 py-2 text-sm ${themeClasses.hover.bg} first:rounded-t-lg last:rounded-b-lg ${themeClasses.text.primary}`}>
                      <LeadStatusBadge status={s} />
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Contact Info */}
          <div className={`space-y-3 p-4 rounded-xl ${themeClasses.bg.secondary}`}>
            {lead.email && (
              <a href={`mailto:${lead.email}`} className="flex items-center gap-3">
                <Mail className="w-4 h-4 text-theme" />
                <span className={`text-sm ${themeClasses.text.primary}`}>{lead.email}</span>
              </a>
            )}
            {lead.phone && (
              <a href={`tel:${lead.phone}`} className="flex items-center gap-3">
                <Phone className="w-4 h-4 text-theme" />
                <span className={`text-sm ${themeClasses.text.primary}`}>{lead.phone}</span>
              </a>
            )}
            {lead.address && (
              <div className="flex items-center gap-3">
                <MapPin className="w-4 h-4 text-theme" />
                <span className={`text-sm ${themeClasses.text.primary}`}>{lead.address}</span>
              </div>
            )}
            <div className="flex items-center gap-3">
              <Calendar className="w-4 h-4 text-theme" />
              <span className={`text-sm ${themeClasses.text.muted}`}>
                {format(new Date(lead.createdAt), 'MMM d, yyyy h:mm a')}
              </span>
            </div>
          </div>

          {/* Outreach Tracking */}
          {!['converted', 'lost'].includes(lead.status) && (
            <div>
              <div className="flex items-center justify-between mb-2">
                <h4 className={`text-sm font-semibold ${themeClasses.text.primary}`}>Outreach Progress</h4>
                <span className={`text-xs font-medium ${themeClasses.text.muted}`}>
                  {lead.outreachCount}/{totalOutreachSteps}
                </span>
              </div>

              {/* Progress dots */}
              <div className="flex items-center gap-2 mb-3">
                {Array.from({ length: totalOutreachSteps }, (_, i) => (
                  <div
                    key={i}
                    className={`flex-1 h-2 rounded-full ${
                      i < lead.outreachCount
                        ? 'bg-theme'
                        : i === lead.outreachCount
                          ? isActionDue ? 'bg-orange-400 animate-pulse' : 'bg-theme/30'
                          : `${theme === 'light' ? 'bg-gray-200' : 'bg-zinc-700'}`
                    }`}
                  />
                ))}
              </div>

              {/* Next outreach info */}
              {lead.nextOutreachDate && lead.status !== 'cold' && lead.status !== 'dead' && (
                <div className={`flex items-center gap-2 mb-3 text-xs ${isActionDue ? 'text-orange-600 font-semibold' : themeClasses.text.muted}`}>
                  <Clock className="w-3.5 h-3.5" />
                  {isActionDue ? 'Follow-up due now!' : `Next follow-up: ${format(new Date(lead.nextOutreachDate), 'MMM d')}`}
                </div>
              )}

              {lead.status === 'cold' && !lead.nextOutreachDate && (
                <div className={`flex items-center gap-2 mb-3 text-xs ${themeClasses.text.muted}`}>
                  <Clock className="w-3.5 h-3.5" />
                  Cold — follow-up in {lead.coldSince ? Math.max(0, 30 - Math.floor((Date.now() - new Date(lead.coldSince).getTime()) / 86400000)) : 30} days
                </div>
              )}

              {/* Log Outreach Button */}
              {lead.status !== 'dead' && lead.outreachCount < 7 && (
                <button
                  onClick={() => setShowOutreachPopup(true)}
                  className="w-full py-3 bg-theme text-white rounded-xl font-semibold text-sm flex items-center justify-center gap-2 active:scale-[0.98] transition-transform"
                >
                  <PhoneCall className="w-4 h-4" />
                  Log Outreach
                </button>
              )}

              {/* Outreach History */}
              {lead.outreachAttempts.length > 0 && (
                <div className="mt-3 space-y-1.5">
                  {lead.outreachAttempts.slice().reverse().map((attempt, i) => (
                    <div key={i} className={`flex items-center gap-2.5 text-xs ${themeClasses.text.muted}`}>
                      <CheckCircle2 className="w-3.5 h-3.5 text-green-500 flex-shrink-0" />
                      <span className="capitalize font-medium">{attempt.method}</span>
                      <span>—</span>
                      <span>{formatDistanceToNow(new Date(attempt.date), { addSuffix: true })}</span>
                      {attempt.notes && <span className={`truncate ${themeClasses.text.secondary}`}>· {attempt.notes}</span>}
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Outreach Popup */}
          {showOutreachPopup && (
            <div className="fixed inset-0 z-[10000] flex items-end justify-center">
              <div className="absolute inset-0 bg-black/40" onClick={() => setShowOutreachPopup(false)} />
              <div className={`relative w-full max-w-lg ${themeClasses.bg.modal} rounded-t-2xl p-5 space-y-4`} style={{ paddingBottom: 'calc(env(safe-area-inset-bottom, 0px) + 20px)' }}>
                <h3 className={`text-lg font-bold ${themeClasses.text.primary}`}>Log Outreach</h3>
                <p className={`text-sm ${themeClasses.text.muted}`}>How did you reach out to {displayName}?</p>
                <div className="grid grid-cols-3 gap-3">
                  {[
                    { method: 'call' as const, icon: PhoneCall, label: 'Call', color: 'bg-green-500' },
                    { method: 'text' as const, icon: MessageSquare, label: 'Text', color: 'bg-blue-500' },
                    { method: 'email' as const, icon: MailPlus, label: 'Email', color: 'bg-purple-500' },
                  ].map(({ method, icon: Icon, label, color }) => (
                    <button
                      key={method}
                      onClick={() => handleLogOutreach(method)}
                      disabled={loggingOutreach}
                      className={`flex flex-col items-center gap-2 py-4 rounded-xl ${themeClasses.bg.secondary} border ${themeClasses.border.primary} active:scale-[0.96] transition-all disabled:opacity-50`}
                    >
                      <div className={`w-10 h-10 ${color} rounded-full flex items-center justify-center`}>
                        <Icon className="w-5 h-5 text-white" />
                      </div>
                      <span className={`text-sm font-semibold ${themeClasses.text.primary}`}>{label}</span>
                    </button>
                  ))}
                </div>
                <input
                  type="text"
                  value={outreachNotes}
                  onChange={(e) => setOutreachNotes(e.target.value)}
                  placeholder="Add a note (optional)"
                  className={`w-full px-4 py-3 rounded-xl ${themeClasses.bg.input} ${themeClasses.text.primary} border ${themeClasses.border.input}`}
                />
              </div>
            </div>
          )}

          {/* Form Responses */}
          {formResponses.length > 0 && (
            <div>
              <h4 className={`text-sm font-semibold ${themeClasses.text.primary} mb-2`}>Form Responses</h4>
              <div className={`p-4 rounded-xl ${themeClasses.bg.secondary} space-y-3`}>
                {formResponses.map(([key, value]) => (
                  <div key={key}>
                    <p className={`text-xs ${themeClasses.text.muted} mb-0.5`}>{formatKey(key)}</p>
                    <p className={`text-sm font-medium ${themeClasses.text.primary}`}>{formatValue(value)}</p>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Facebook Ad Details — Expandable */}
          {lead.source === 'facebook_lead_ad' && hasAdId && (
            <div>
              <button
                onClick={() => setShowAdDetails(!showAdDetails)}
                className={`w-full flex items-center justify-between p-4 rounded-xl border ${themeClasses.border.primary} ${themeClasses.bg.card} active:scale-[0.99] transition-all`}
              >
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 bg-[#1877F2]/10 rounded-lg flex items-center justify-center">
                    <Megaphone className="w-4.5 h-4.5 text-[#1877F2]" />
                  </div>
                  <div className="text-left">
                    <p className={`text-sm font-semibold ${themeClasses.text.primary}`}>
                      {pd.fb_ad_name || 'Facebook Ad'}
                    </p>
                    <p className={`text-xs ${themeClasses.text.muted}`}>
                      {pd.fb_campaign_name ? `${pd.fb_campaign_name}` : 'View creative, copy & metrics'}
                    </p>
                  </div>
                </div>
                {showAdDetails ? (
                  <ChevronUp className={`w-5 h-5 ${themeClasses.text.muted}`} />
                ) : (
                  <ChevronDown className={`w-5 h-5 ${themeClasses.text.muted}`} />
                )}
              </button>

              {showAdDetails && (
                <div className={`mt-2 rounded-xl border ${themeClasses.border.primary} overflow-hidden`}>
                  {/* Tabs */}
                  <div className={`flex border-b ${themeClasses.border.primary}`}>
                    {(['creative', 'metrics', 'audience'] as const).map((tab) => (
                      <button
                        key={tab}
                        onClick={() => setActiveAdTab(tab)}
                        className={`flex-1 py-2.5 text-xs font-semibold capitalize transition-colors ${
                          activeAdTab === tab
                            ? 'text-theme border-b-2 border-theme'
                            : `${themeClasses.text.muted}`
                        }`}
                      >
                        {tab}
                      </button>
                    ))}
                  </div>

                  <div className="p-4">
                    {adLoading && (
                      <div className="flex items-center justify-center py-8">
                        <Loader2 className="w-6 h-6 text-theme animate-spin" />
                      </div>
                    )}

                    {adError && (
                      <div className={`text-center py-6 ${themeClasses.text.muted}`}>
                        <p className="text-sm">Could not load ad details</p>
                        <p className="text-xs mt-1 opacity-60">{adError}</p>
                        <button onClick={fetchAdDetails} className="mt-2 text-xs text-theme font-medium">
                          Retry
                        </button>
                      </div>
                    )}

                    {adDetails && !adLoading && (
                      <>
                        {/* Creative Tab */}
                        {activeAdTab === 'creative' && (
                          <div className="space-y-4">
                            {/* Ad Image */}
                            {adDetails.creative.imageUrl && (
                              <div className="rounded-xl overflow-hidden">
                                <img
                                  src={adDetails.creative.imageUrl}
                                  alt="Ad creative"
                                  className="w-full h-auto"
                                  onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }}
                                />
                              </div>
                            )}

                            {/* Ad Title */}
                            {adDetails.creative.title && (
                              <div>
                                <p className={`text-xs ${themeClasses.text.muted} mb-0.5`}>Headline</p>
                                <p className={`text-sm font-bold ${themeClasses.text.primary}`}>{adDetails.creative.title}</p>
                              </div>
                            )}

                            {/* Ad Body / Copy */}
                            {adDetails.creative.body && (
                              <div>
                                <p className={`text-xs ${themeClasses.text.muted} mb-0.5`}>Copy</p>
                                <p className={`text-sm ${themeClasses.text.secondary} leading-relaxed`}>{adDetails.creative.body}</p>
                              </div>
                            )}

                            {/* Description */}
                            {adDetails.creative.description && (
                              <div>
                                <p className={`text-xs ${themeClasses.text.muted} mb-0.5`}>Description</p>
                                <p className={`text-sm ${themeClasses.text.secondary}`}>{adDetails.creative.description}</p>
                              </div>
                            )}

                            {/* CTA */}
                            {adDetails.creative.callToAction && (
                              <div className="flex items-center gap-2">
                                <span className={`text-xs ${themeClasses.text.muted}`}>CTA:</span>
                                <span className="text-xs font-medium px-2.5 py-1 rounded-full bg-theme/10 text-theme">
                                  {formatValue(adDetails.creative.callToAction)}
                                </span>
                              </div>
                            )}

                            {/* No creative data */}
                            {!adDetails.creative.title && !adDetails.creative.body && !adDetails.creative.imageUrl && (
                              <p className={`text-sm text-center py-4 ${themeClasses.text.muted}`}>
                                No creative data available
                              </p>
                            )}
                          </div>
                        )}

                        {/* Metrics Tab */}
                        {activeAdTab === 'metrics' && (
                          <div className="space-y-3">
                            {adDetails.metrics ? (
                              <>
                                <div className="grid grid-cols-2 gap-3">
                                  <div className={`p-3 rounded-xl ${themeClasses.bg.secondary}`}>
                                    <div className="flex items-center gap-1.5 mb-1">
                                      <Eye className="w-3.5 h-3.5 text-theme" />
                                      <span className={`text-xs ${themeClasses.text.muted}`}>Impressions</span>
                                    </div>
                                    <p className={`text-lg font-bold ${themeClasses.text.primary}`}>
                                      {adDetails.metrics.impressions.toLocaleString()}
                                    </p>
                                  </div>
                                  <div className={`p-3 rounded-xl ${themeClasses.bg.secondary}`}>
                                    <div className="flex items-center gap-1.5 mb-1">
                                      <MousePointer className="w-3.5 h-3.5 text-theme" />
                                      <span className={`text-xs ${themeClasses.text.muted}`}>Clicks</span>
                                    </div>
                                    <p className={`text-lg font-bold ${themeClasses.text.primary}`}>
                                      {adDetails.metrics.clicks.toLocaleString()}
                                    </p>
                                  </div>
                                  <div className={`p-3 rounded-xl ${themeClasses.bg.secondary}`}>
                                    <div className="flex items-center gap-1.5 mb-1">
                                      <DollarSign className="w-3.5 h-3.5 text-theme" />
                                      <span className={`text-xs ${themeClasses.text.muted}`}>Spend</span>
                                    </div>
                                    <p className={`text-lg font-bold ${themeClasses.text.primary}`}>
                                      ${adDetails.metrics.spend}
                                    </p>
                                  </div>
                                  <div className={`p-3 rounded-xl ${themeClasses.bg.secondary}`}>
                                    <div className="flex items-center gap-1.5 mb-1">
                                      <Users className="w-3.5 h-3.5 text-theme" />
                                      <span className={`text-xs ${themeClasses.text.muted}`}>Leads</span>
                                    </div>
                                    <p className={`text-lg font-bold ${themeClasses.text.primary}`}>
                                      {adDetails.metrics.leads}
                                    </p>
                                  </div>
                                </div>

                                {/* Additional metrics row */}
                                <div className={`space-y-2 p-3 rounded-xl ${themeClasses.bg.secondary}`}>
                                  {adDetails.metrics.ctr && (
                                    <div className="flex justify-between">
                                      <span className={`text-sm ${themeClasses.text.muted}`}>CTR</span>
                                      <span className={`text-sm font-medium ${themeClasses.text.primary}`}>{adDetails.metrics.ctr}%</span>
                                    </div>
                                  )}
                                  {adDetails.metrics.cpc && (
                                    <div className="flex justify-between">
                                      <span className={`text-sm ${themeClasses.text.muted}`}>Cost per Click</span>
                                      <span className={`text-sm font-medium ${themeClasses.text.primary}`}>${adDetails.metrics.cpc}</span>
                                    </div>
                                  )}
                                  {adDetails.metrics.costPerLead && (
                                    <div className="flex justify-between">
                                      <span className={`text-sm ${themeClasses.text.muted}`}>Cost per Lead</span>
                                      <span className={`text-sm font-bold text-green-600`}>${adDetails.metrics.costPerLead}</span>
                                    </div>
                                  )}
                                </div>
                              </>
                            ) : (
                              <p className={`text-sm text-center py-4 ${themeClasses.text.muted}`}>
                                No metrics available
                              </p>
                            )}
                          </div>
                        )}

                        {/* Audience Tab */}
                        {activeAdTab === 'audience' && (
                          <div className="space-y-4">
                            {/* Demographics */}
                            {adDetails.demographics && adDetails.demographics.length > 0 ? (
                              <div>
                                <p className={`text-xs font-semibold ${themeClasses.text.muted} mb-2 uppercase tracking-wide`}>Age & Gender</p>
                                <div className="space-y-1.5">
                                  {adDetails.demographics
                                    .sort((a, b) => b.impressions - a.impressions)
                                    .slice(0, 8)
                                    .map((d, i) => {
                                      const maxImpressions = Math.max(...adDetails.demographics!.map(x => x.impressions));
                                      const pct = maxImpressions > 0 ? (d.impressions / maxImpressions) * 100 : 0;
                                      return (
                                        <div key={i} className="flex items-center gap-2">
                                          <span className={`text-xs w-16 flex-shrink-0 ${themeClasses.text.muted}`}>
                                            {d.gender === 'male' ? 'M' : d.gender === 'female' ? 'F' : 'U'} {d.age}
                                          </span>
                                          <div className={`flex-1 h-5 rounded-full ${themeClasses.bg.secondary} overflow-hidden`}>
                                            <div
                                              className="h-full rounded-full bg-theme/60"
                                              style={{ width: `${pct}%` }}
                                            />
                                          </div>
                                          <span className={`text-xs w-12 text-right flex-shrink-0 ${themeClasses.text.muted}`}>
                                            {d.impressions.toLocaleString()}
                                          </span>
                                        </div>
                                      );
                                    })}
                                </div>
                              </div>
                            ) : (
                              <p className={`text-sm ${themeClasses.text.muted}`}>No demographic data available</p>
                            )}

                            {/* Regions */}
                            {adDetails.regions && adDetails.regions.length > 0 && (
                              <div>
                                <p className={`text-xs font-semibold ${themeClasses.text.muted} mb-2 uppercase tracking-wide`}>Top Regions</p>
                                <div className="space-y-2">
                                  {adDetails.regions.slice(0, 6).map((r, i) => (
                                    <div key={i} className="flex items-center justify-between">
                                      <div className="flex items-center gap-2">
                                        <MapPinned className="w-3.5 h-3.5 text-theme" />
                                        <span className={`text-sm ${themeClasses.text.primary}`}>{r.region}</span>
                                      </div>
                                      <span className={`text-xs ${themeClasses.text.muted}`}>
                                        {r.impressions.toLocaleString()} imp · {r.clicks} clicks
                                      </span>
                                    </div>
                                  ))}
                                </div>
                              </div>
                            )}
                          </div>
                        )}
                      </>
                    )}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Ad info for leads without ad_id (form name, campaign) */}
          {lead.source === 'facebook_lead_ad' && !hasAdId && (pd.fb_campaign_name || pd.fb_form_name) && (
            <div>
              <h4 className={`text-sm font-semibold ${themeClasses.text.primary} mb-2`}>Ad Details</h4>
              <div className={`p-4 rounded-xl ${themeClasses.bg.secondary} space-y-2.5`}>
                {pd.fb_campaign_name && (
                  <div className="flex items-start gap-3">
                    <Target className="w-4 h-4 text-[#1877F2] mt-0.5 flex-shrink-0" />
                    <div>
                      <p className={`text-xs ${themeClasses.text.muted}`}>Campaign</p>
                      <p className={`text-sm font-medium ${themeClasses.text.primary}`}>{pd.fb_campaign_name}</p>
                    </div>
                  </div>
                )}
                {pd.fb_form_name && (
                  <div className="flex items-start gap-3">
                    <FileText className="w-4 h-4 text-[#1877F2] mt-0.5 flex-shrink-0" />
                    <div>
                      <p className={`text-xs ${themeClasses.text.muted}`}>Lead Form</p>
                      <p className={`text-sm font-medium ${themeClasses.text.primary}`}>{pd.fb_form_name}</p>
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Project Details */}
          {lead.projectDetails && (lead.calculatorType || lead.estimatedValue || pd.message) && (
            <div>
              <h4 className={`text-sm font-semibold ${themeClasses.text.primary} mb-2`}>Project Details</h4>
              <div className={`p-4 rounded-xl ${themeClasses.bg.secondary} space-y-2`}>
                {lead.calculatorType && (
                  <div className="flex justify-between">
                    <span className={`text-sm ${themeClasses.text.muted}`}>Service</span>
                    <span className={`text-sm font-medium ${themeClasses.text.primary}`}>{formatValue(lead.calculatorType)}</span>
                  </div>
                )}
                {lead.estimatedValue && (
                  <div className="flex justify-between">
                    <span className={`text-sm ${themeClasses.text.muted}`}>Est. Value</span>
                    <span className={`text-sm font-medium ${themeClasses.text.primary}`}>${lead.estimatedValue.toLocaleString()}</span>
                  </div>
                )}
                {pd.message && (
                  <div className="pt-2 border-t border-gray-200 dark:border-zinc-700">
                    <p className={`text-sm ${themeClasses.text.secondary}`}>{pd.message}</p>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Notes */}
          <div>
            <h4 className={`text-sm font-semibold ${themeClasses.text.primary} mb-2`}>Notes</h4>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Add notes about this lead..."
              rows={3}
              className={`w-full px-3 py-2 rounded-xl ${themeClasses.bg.input} ${themeClasses.text.primary} border ${themeClasses.border.input} resize-none`}
            />
            {notes !== (lead.notes || '') && (
              <button onClick={handleSaveNotes} disabled={saving} className="mt-2 px-4 py-2 bg-theme text-white rounded-lg text-sm font-medium hover:bg-[#035291] disabled:opacity-50">
                {saving ? 'Saving...' : 'Save Notes'}
              </button>
            )}
          </div>

          {/* Actions */}
          <div className="flex gap-3">
            {lead.phone && (
              <a href={`tel:${lead.phone}`} className="flex-1 flex items-center justify-center gap-2 py-3 bg-theme text-white rounded-xl font-medium active:scale-[0.98] transition-transform">
                <Phone className="w-4 h-4" />
                Call
              </a>
            )}
            {lead.email && (
              <a href={`mailto:${lead.email}`} className="flex-1 flex items-center justify-center gap-2 py-3 rounded-xl font-medium border-2 border-theme text-theme active:scale-[0.98] transition-transform">
                <Mail className="w-4 h-4" />
                Email
              </a>
            )}
            {lead.status !== 'converted' && (
              <button onClick={handleConvert} className="flex-1 flex items-center justify-center gap-2 py-3 bg-green-600 text-white rounded-xl font-medium active:scale-[0.98] transition-transform">
                <UserPlus className="w-4 h-4" />
                Convert
              </button>
            )}
          </div>

          {/* Delete */}
          <div className="pb-8">
            {!showDeleteConfirm ? (
              <button
                onClick={() => setShowDeleteConfirm(true)}
                className={`w-full flex items-center justify-center gap-2 py-3 rounded-xl text-sm font-medium text-red-500 ${themeClasses.bg.secondary} active:scale-[0.98] transition-all`}
              >
                <Trash2 className="w-4 h-4" />
                Remove Lead
              </button>
            ) : (
              <div className="flex gap-3">
                <button
                  onClick={() => setShowDeleteConfirm(false)}
                  className={`flex-1 py-3 rounded-xl text-sm font-medium ${themeClasses.bg.secondary} ${themeClasses.text.secondary}`}
                >
                  Cancel
                </button>
                <button
                  onClick={handleDelete}
                  disabled={deleting}
                  className="flex-1 py-3 rounded-xl text-sm font-semibold bg-red-500 text-white active:scale-[0.98] transition-transform disabled:opacity-50"
                >
                  {deleting ? 'Removing...' : 'Confirm Remove'}
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default LeadDetailModal;
