import React, { useState } from 'react';
import { X, Phone, Mail, MapPin, Calendar, MessageSquare, UserPlus, ChevronDown } from 'lucide-react';
import { useTheme, getThemeClasses } from '../../contexts/ThemeContext';
import { useLeadsStore, type Lead } from '../../stores/leadsStore';
import LeadStatusBadge from './LeadStatusBadge';
import { format } from 'date-fns';

interface LeadDetailModalProps {
  lead: Lead;
  onClose: () => void;
}

const LeadDetailModal: React.FC<LeadDetailModalProps> = ({ lead, onClose }) => {
  const { theme } = useTheme();
  const themeClasses = getThemeClasses(theme);
  const { updateLeadStatus, updateLeadNotes, convertToClient } = useLeadsStore();
  const [notes, setNotes] = useState(lead.notes || '');
  const [showStatusDropdown, setShowStatusDropdown] = useState(false);
  const [saving, setSaving] = useState(false);

  const handleStatusChange = async (status: Lead['status']) => {
    await updateLeadStatus(lead.id, status);
    setShowStatusDropdown(false);
  };

  const handleSaveNotes = async () => {
    setSaving(true);
    await updateLeadNotes(lead.id, notes);
    setSaving(false);
  };

  const handleConvert = async () => {
    await convertToClient(lead.id);
    onClose();
  };

  const sourceLabel = {
    website_widget: 'Website Widget',
    facebook_lead_ad: 'Facebook Lead Ad',
    website: 'Website Form',
    manual: 'Manual Entry',
    referral: 'Referral',
  }[lead.source] || lead.source;

  return (
    <div className="fixed inset-0 z-50 flex items-end md:items-center justify-center">
      <div className="absolute inset-0 bg-black/50" onClick={onClose} />
      <div className={`relative w-full max-w-lg ${themeClasses.bg.modal} rounded-t-2xl md:rounded-2xl max-h-[85vh] overflow-y-auto`}>
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
            <div>
              <h3 className={`text-xl font-bold ${themeClasses.text.primary}`}>{lead.name}</h3>
              <p className={`text-sm ${themeClasses.text.muted} mt-0.5`}>{sourceLabel}</p>
            </div>
            <div className="relative">
              <button
                onClick={() => setShowStatusDropdown(!showStatusDropdown)}
                className="flex items-center gap-1"
              >
                <LeadStatusBadge status={lead.status} size="md" />
                <ChevronDown className="w-4 h-4" />
              </button>
              {showStatusDropdown && (
                <div className={`absolute right-0 top-full mt-1 ${themeClasses.bg.card} rounded-lg shadow-xl border ${themeClasses.border.primary} z-20 min-w-[140px]`}>
                  {(['new', 'contacted', 'quoted', 'converted', 'lost'] as Lead['status'][]).map((s) => (
                    <button
                      key={s}
                      onClick={() => handleStatusChange(s)}
                      className={`w-full text-left px-3 py-2 text-sm ${themeClasses.hover.bg} first:rounded-t-lg last:rounded-b-lg ${themeClasses.text.primary}`}
                    >
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
                <Mail className="w-4 h-4 text-[#043d6b]" />
                <span className={`text-sm ${themeClasses.text.primary}`}>{lead.email}</span>
              </a>
            )}
            {lead.phone && (
              <a href={`tel:${lead.phone}`} className="flex items-center gap-3">
                <Phone className="w-4 h-4 text-[#043d6b]" />
                <span className={`text-sm ${themeClasses.text.primary}`}>{lead.phone}</span>
              </a>
            )}
            {lead.address && (
              <div className="flex items-center gap-3">
                <MapPin className="w-4 h-4 text-[#043d6b]" />
                <span className={`text-sm ${themeClasses.text.primary}`}>{lead.address}</span>
              </div>
            )}
            <div className="flex items-center gap-3">
              <Calendar className="w-4 h-4 text-[#043d6b]" />
              <span className={`text-sm ${themeClasses.text.muted}`}>
                {format(new Date(lead.createdAt), 'MMM d, yyyy h:mm a')}
              </span>
            </div>
          </div>

          {/* Project Details */}
          {lead.projectDetails && Object.keys(lead.projectDetails).length > 0 && (
            <div>
              <h4 className={`text-sm font-semibold ${themeClasses.text.primary} mb-2`}>Project Details</h4>
              <div className={`p-4 rounded-xl ${themeClasses.bg.secondary} space-y-2`}>
                {lead.calculatorType && (
                  <div className="flex justify-between">
                    <span className={`text-sm ${themeClasses.text.muted}`}>Service</span>
                    <span className={`text-sm font-medium ${themeClasses.text.primary} capitalize`}>
                      {lead.calculatorType.replace(/_/g, ' ')}
                    </span>
                  </div>
                )}
                {lead.estimatedValue && (
                  <div className="flex justify-between">
                    <span className={`text-sm ${themeClasses.text.muted}`}>Est. Value</span>
                    <span className={`text-sm font-medium ${themeClasses.text.primary}`}>
                      ${lead.estimatedValue.toLocaleString()}
                    </span>
                  </div>
                )}
                {lead.projectDetails.message && (
                  <div className="pt-2 border-t border-gray-200 dark:border-zinc-700">
                    <p className={`text-sm ${themeClasses.text.secondary}`}>{lead.projectDetails.message}</p>
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
              <button
                onClick={handleSaveNotes}
                disabled={saving}
                className="mt-2 px-4 py-2 bg-[#043d6b] text-white rounded-lg text-sm font-medium hover:bg-[#035291] disabled:opacity-50"
              >
                {saving ? 'Saving...' : 'Save Notes'}
              </button>
            )}
          </div>

          {/* Actions */}
          <div className="flex gap-3 pb-4">
            {lead.phone && (
              <a
                href={`tel:${lead.phone}`}
                className="flex-1 flex items-center justify-center gap-2 py-3 bg-[#043d6b] text-white rounded-xl font-medium active:scale-[0.98] transition-transform"
              >
                <Phone className="w-4 h-4" />
                Call
              </a>
            )}
            {lead.email && (
              <a
                href={`mailto:${lead.email}`}
                className={`flex-1 flex items-center justify-center gap-2 py-3 rounded-xl font-medium border-2 border-[#043d6b] text-[#043d6b] active:scale-[0.98] transition-transform`}
              >
                <Mail className="w-4 h-4" />
                Email
              </a>
            )}
            {lead.status !== 'converted' && (
              <button
                onClick={handleConvert}
                className="flex-1 flex items-center justify-center gap-2 py-3 bg-green-600 text-white rounded-xl font-medium active:scale-[0.98] transition-transform"
              >
                <UserPlus className="w-4 h-4" />
                Convert
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default LeadDetailModal;
