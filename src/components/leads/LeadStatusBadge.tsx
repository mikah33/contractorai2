import React from 'react';
import type { Lead } from '../../stores/leadsStore';

interface LeadStatusBadgeProps {
  status: Lead['status'];
  size?: 'sm' | 'md';
}

const statusConfig: Record<Lead['status'], { label: string; bg: string; text: string }> = {
  new: { label: 'New', bg: 'bg-blue-100', text: 'text-blue-800' },
  contacted: { label: 'Contacted', bg: 'bg-yellow-100', text: 'text-yellow-800' },
  quoted: { label: 'Quoted', bg: 'bg-purple-100', text: 'text-purple-800' },
  converted: { label: 'Converted', bg: 'bg-green-100', text: 'text-green-800' },
  lost: { label: 'Lost', bg: 'bg-red-100', text: 'text-red-800' },
  cold: { label: 'Cold', bg: 'bg-slate-100', text: 'text-slate-600' },
  dead: { label: 'Dead', bg: 'bg-gray-200', text: 'text-gray-500' },
};

const LeadStatusBadge: React.FC<LeadStatusBadgeProps> = ({ status, size = 'sm' }) => {
  const config = statusConfig[status] || statusConfig.new;
  const sizeClasses = size === 'sm' ? 'px-2 py-0.5 text-xs' : 'px-3 py-1 text-sm';

  return (
    <span className={`inline-flex items-center rounded-full font-medium ${config.bg} ${config.text} ${sizeClasses}`}>
      {config.label}
    </span>
  );
};

export default LeadStatusBadge;
