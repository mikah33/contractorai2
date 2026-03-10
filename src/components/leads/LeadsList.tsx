import React, { useState, useEffect, useMemo } from 'react';
import { Search, Filter, Plus, Users, ChevronRight, Phone } from 'lucide-react';
import { useTheme, getThemeClasses } from '../../contexts/ThemeContext';
import { useLeadsStore, type Lead } from '../../stores/leadsStore';
import LeadStatusBadge from './LeadStatusBadge';
import LeadDetailModal from './LeadDetailModal';
import { format, formatDistanceToNow, isToday, isPast } from 'date-fns';

const LeadsList: React.FC = () => {
  const { theme } = useTheme();
  const themeClasses = getThemeClasses(theme);
  const { leads, isLoading, fetchLeads, subscribeToNewLeads, unsubscribeFromLeads, addLead } = useLeadsStore();
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<Lead['status'] | 'all'>('all');
  const [selectedLead, setSelectedLead] = useState<Lead | null>(null);
  const [showAddModal, setShowAddModal] = useState(false);

  useEffect(() => {
    fetchLeads();
    subscribeToNewLeads();
    return () => unsubscribeFromLeads();
  }, []);

  const filteredLeads = useMemo(() => {
    const filtered = leads.filter((lead) => {
      const matchesSearch = searchTerm === '' ||
        lead.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        lead.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (lead.phone && lead.phone.includes(searchTerm));

      const matchesStatus = statusFilter === 'all' || lead.status === statusFilter;

      return matchesSearch && matchesStatus;
    });

    // Sort: action-needed leads first (overdue/due today), then new leads, then rest by date
    return filtered.sort((a, b) => {
      const aActionDue = a.nextOutreachDate && (isPast(new Date(a.nextOutreachDate)) || isToday(new Date(a.nextOutreachDate)));
      const bActionDue = b.nextOutreachDate && (isPast(new Date(b.nextOutreachDate)) || isToday(new Date(b.nextOutreachDate)));
      if (aActionDue && !bActionDue) return -1;
      if (!aActionDue && bActionDue) return 1;
      const aNew = a.status === 'new' && (a.outreachCount || 0) === 0;
      const bNew = b.status === 'new' && (b.outreachCount || 0) === 0;
      if (aNew && !bNew) return -1;
      if (!aNew && bNew) return 1;
      return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
    });
  }, [leads, searchTerm, statusFilter]);

  const statusCounts = useMemo(() => {
    const counts: Record<string, number> = { all: leads.length };
    leads.forEach(l => { counts[l.status] = (counts[l.status] || 0) + 1; });
    return counts;
  }, [leads]);

  const filterTabs: { key: Lead['status'] | 'all'; label: string }[] = [
    { key: 'all', label: 'All' },
    { key: 'new', label: 'New' },
    { key: 'contacted', label: 'Contacted' },
    { key: 'quoted', label: 'Quoted' },
    { key: 'converted', label: 'Converted' },
    { key: 'lost', label: 'Lost' },
    { key: 'cold', label: 'Cold' },
    { key: 'dead', label: 'Dead' },
  ];

  return (
    <div className="space-y-4">
      {/* Search */}
      <div className="relative">
        <Search className={`absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 ${themeClasses.text.muted}`} />
        <input
          type="text"
          placeholder="Search leads..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className={`w-full pl-10 pr-4 py-2.5 rounded-xl ${themeClasses.bg.input} ${themeClasses.text.primary} border ${themeClasses.border.input}`}
        />
      </div>

      {/* Status Filter Tabs */}
      <div className="flex gap-2 overflow-x-auto pb-1 -mx-1 px-1">
        {filterTabs.map((tab) => (
          <button
            key={tab.key}
            onClick={() => setStatusFilter(tab.key)}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm font-medium whitespace-nowrap transition-colors ${
              statusFilter === tab.key
                ? 'bg-theme text-white'
                : `${themeClasses.bg.secondary} ${themeClasses.text.secondary}`
            }`}
          >
            {tab.label}
            {statusCounts[tab.key] ? (
              <span className={`text-xs ${statusFilter === tab.key ? 'text-white/70' : themeClasses.text.muted}`}>
                {statusCounts[tab.key]}
              </span>
            ) : null}
          </button>
        ))}
      </div>

      {/* Leads List */}
      {isLoading && leads.length === 0 ? (
        <div className="flex items-center justify-center py-12">
          <div className="w-8 h-8 border-2 border-theme border-t-transparent rounded-full animate-spin" />
        </div>
      ) : filteredLeads.length === 0 ? (
        <div className={`text-center py-12 ${themeClasses.text.muted}`}>
          <Users className="w-12 h-12 mx-auto mb-3 opacity-30" />
          <p className="font-medium">No leads found</p>
          <p className="text-sm mt-1">Leads from your website and Facebook will appear here</p>
        </div>
      ) : (
        <div className="space-y-2">
          {filteredLeads.map((lead) => (
            <button
              key={lead.id}
              onClick={() => setSelectedLead(lead)}
              className={`w-full text-left p-4 rounded-xl ${themeClasses.bg.card} border ${themeClasses.border.primary} ${themeClasses.hover.bg} active:scale-[0.99] transition-all`}
            >
              <div className="flex items-center justify-between">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className={`font-semibold ${themeClasses.text.primary} truncate`}>
                      {(lead.name && lead.name !== 'Facebook Lead')
                        ? lead.name
                        : (lead.projectDetails?.raw_fields?.full_name
                          || (lead.projectDetails?.raw_fields?.first_name ? `${lead.projectDetails.raw_fields.first_name} ${lead.projectDetails.raw_fields.last_name || ''}`.trim() : null)
                          || lead.email
                          || lead.phone
                          || 'Unknown Lead')}
                    </span>
                    <LeadStatusBadge status={lead.status} />
                    {/* Outreach badge */}
                    {lead.outreachCount != null && lead.outreachCount > 0 && lead.status !== 'converted' && lead.status !== 'dead' && (
                      <span className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded-full text-[10px] font-bold bg-theme text-white">
                        {lead.outreachCount}/{lead.outreachCount >= 5 ? 7 : 5}
                      </span>
                    )}
                    {lead.nextOutreachDate && (isPast(new Date(lead.nextOutreachDate)) || isToday(new Date(lead.nextOutreachDate))) && lead.status !== 'converted' && lead.status !== 'dead' && (
                      <span className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded-full text-[10px] font-bold bg-orange-500 text-white animate-pulse">
                        <Phone className="w-2.5 h-2.5" />
                        Today
                      </span>
                    )}
                  </div>
                  <div className={`flex items-center gap-3 mt-1 text-sm ${themeClasses.text.muted} truncate`}>
                    {lead.email && <span className="truncate">{lead.email}</span>}
                    {lead.phone && <span className="flex-shrink-0">{lead.phone}</span>}
                  </div>
                  <div className={`flex items-center gap-2 mt-1.5 text-xs ${themeClasses.text.muted} flex-wrap`}>
                    <span className="capitalize">{lead.source.replace(/_/g, ' ')}</span>
                    {lead.projectDetails?.fb_ad_name && (
                      <>
                        <span>·</span>
                        <span className="truncate max-w-[150px]">{lead.projectDetails.fb_ad_name}</span>
                      </>
                    )}
                    <span>·</span>
                    <span>{formatDistanceToNow(new Date(lead.createdAt), { addSuffix: true })}</span>
                  </div>
                </div>
                <ChevronRight className={`w-5 h-5 ${themeClasses.text.muted} flex-shrink-0`} />
              </div>
            </button>
          ))}
        </div>
      )}

      {/* Lead Detail Modal */}
      {selectedLead && (
        <LeadDetailModal
          lead={selectedLead}
          onClose={() => setSelectedLead(null)}
        />
      )}
    </div>
  );
};

export default LeadsList;
