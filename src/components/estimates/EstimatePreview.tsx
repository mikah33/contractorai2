import { DollarSign, Calendar, User, Briefcase, Check } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { Estimate } from '../../types/estimates';
import { format } from 'date-fns';
import { useData } from '../../contexts/DataContext';

interface EstimatePreviewProps {
  estimate: Estimate;
  clients: { id: string; name: string; email?: string; phone?: string; address?: string }[];
  projects: { id: string; name: string; address?: string }[];
}

const EstimatePreview: React.FC<EstimatePreviewProps> = ({ estimate, clients, projects }) => {
  const { t } = useTranslation();
  const { profile } = useData();
  const client = clients.find(c => c.name === estimate.clientName || c.id === estimate.clientId);
  const project = projects.find(p => p.name === estimate.projectName || p.id === estimate.projectId);
  
  const formatDate = (dateString: string) => {
    try {
      return format(new Date(dateString), 'MMMM d, yyyy');
    } catch (error) {
      return dateString;
    }
  };

  return (
    <div className="p-8 max-w-4xl mx-auto" style={{ fontFamily: estimate.branding?.fontFamily || 'Inter' }}>
      {/* Header */}
      <div className="flex justify-between items-start mb-8">
        <div>
          {profile?.logo_url && (
            <img
              src={profile.logo_url}
              alt="Company Logo"
              className="h-16 w-auto object-contain mb-4"
            />
          )}
          <h1 className="text-2xl font-bold" style={{ color: estimate.branding?.primaryColor || '#3B82F6' }}>
            {estimate.title}
          </h1>
          <p className="text-gray-500 mt-1">Estimate #{estimate.id.slice(-6)}</p>
        </div>
        
        <div className="text-right">
          <div className="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-800 mb-2">
            {estimate.status.toUpperCase()}
          </div>
          <div className="flex items-center text-gray-600 text-sm mt-2">
            <Calendar className="h-4 w-4 mr-1" />
            <span>Created: {formatDate(estimate.createdAt)}</span>
          </div>
          <div className="flex items-center text-gray-600 text-sm mt-1">
            <Calendar className="h-4 w-4 mr-1" />
            <span>Valid until: {formatDate(estimate.expiresAt)}</span>
          </div>
        </div>
      </div>
      
      {/* Client and Project Info */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-8">
        <div className="border rounded-lg p-4">
          <h2 className="text-sm font-medium text-gray-500 mb-2">{t('clients.client')}</h2>
          {client ? (
            <div>
              <p className="font-medium">{client.name}</p>
              {client.email && <p className="text-gray-600 text-sm mt-1">{client.email}</p>}
              {client.phone && <p className="text-gray-600 text-sm">{client.phone}</p>}
              {client.address && <p className="text-gray-600 text-sm">{client.address}</p>}
            </div>
          ) : estimate.clientName ? (
            <div>
              <p className="font-medium">{estimate.clientName}</p>
            </div>
          ) : (
            <p className="text-gray-500 italic">No client selected</p>
          )}
        </div>
        
        <div className="border rounded-lg p-4">
          <h2 className="text-sm font-medium text-gray-500 mb-2">PROJECT</h2>
          {project ? (
            <div>
              <p className="font-medium">{project.name}</p>
              {project.address && <p className="text-gray-600 text-sm mt-1">{project.address}</p>}
            </div>
          ) : estimate.projectName ? (
            <div>
              <p className="font-medium">{estimate.projectName}</p>
            </div>
          ) : (
            <p className="text-gray-500 italic">No project selected</p>
          )}
        </div>
      </div>
      
      {/* Custom Fields */}
      {(estimate.customFields?.field1Name || estimate.customFields?.field2Name) && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-8">
          {estimate.customFields?.field1Name && (
            <div className="border rounded-lg p-4">
              <h2 className="text-sm font-medium text-gray-500 mb-2">{estimate.customFields.field1Name.toUpperCase()}</h2>
              <p className="font-medium">{estimate.customFields.field1Value || 'N/A'}</p>
            </div>
          )}
          
          {estimate.customFields?.field2Name && (
            <div className="border rounded-lg p-4">
              <h2 className="text-sm font-medium text-gray-500 mb-2">{estimate.customFields.field2Name.toUpperCase()}</h2>
              <p className="font-medium">{estimate.customFields.field2Value || 'N/A'}</p>
            </div>
          )}
        </div>
      )}
      
      {/* Line Items */}
      <div className="mb-8">
        <table className="min-w-full divide-y divide-gray-200">
          <thead>
            <tr style={{ backgroundColor: (estimate.branding?.primaryColor || '#3B82F6') + '10' }}>
              <th scope="col" className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider" style={{ color: estimate.branding?.primaryColor || '#3B82F6' }}>
                Description
              </th>
              <th scope="col" className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider" style={{ color: estimate.branding?.primaryColor || '#3B82F6' }}>
                Quantity
              </th>
              <th scope="col" className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider" style={{ color: estimate.branding?.primaryColor || '#3B82F6' }}>
                Unit
              </th>
              <th scope="col" className="px-6 py-3 text-right text-xs font-medium uppercase tracking-wider" style={{ color: estimate.branding?.primaryColor || '#3B82F6' }}>
                Unit Price
              </th>
              <th scope="col" className="px-6 py-3 text-right text-xs font-medium uppercase tracking-wider" style={{ color: estimate.branding?.primaryColor || '#3B82F6' }}>
                Total
              </th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {estimate.items.length === 0 ? (
              <tr>
                <td colSpan={5} className="px-6 py-4 text-center text-sm text-gray-500">
                  No items added to this estimate
                </td>
              </tr>
            ) : (
              estimate.items.map((item) => (
                <tr key={item.id} className={item.type === 'section' ? 'bg-gray-50' : ''}>
                  <td className="px-6 py-4">
                    {item.type === 'section' ? (
                      <h3 className="font-medium" style={{ color: estimate.branding?.secondaryColor || '#6B7280' }}>
                        {item.description}
                      </h3>
                    ) : (
                      <div className="text-sm text-gray-900">{item.description}</div>
                    )}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {item.type !== 'section' ? item.quantity : ''}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {item.type !== 'section' ? item.unit : ''}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 text-right">
                    {item.type !== 'section' ? `$${item.unitPrice.toFixed(2)}` : ''}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 text-right">
                    {item.type !== 'section' ? `$${item.totalPrice.toFixed(2)}` : ''}
                  </td>
                </tr>
              ))
            )}
          </tbody>
          <tfoot>
            <tr className="border-t-2 border-gray-200">
              <td colSpan={4} className="px-6 py-4 text-right text-sm font-medium text-gray-900">
                Subtotal
              </td>
              <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900 text-right">
                ${estimate.subtotal.toFixed(2)}
              </td>
            </tr>
            <tr>
              <td colSpan={4} className="px-6 py-4 text-right text-sm font-medium text-gray-900">
                Tax ({estimate.taxRate}%)
              </td>
              <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900 text-right">
                ${estimate.taxAmount.toFixed(2)}
              </td>
            </tr>
            <tr>
              <td colSpan={4} className="px-6 py-4 text-right text-sm font-bold text-gray-900">
                Total
              </td>
              <td className="px-6 py-4 whitespace-nowrap text-lg font-bold text-right" style={{ color: estimate.branding?.primaryColor || '#3B82F6' }}>
                ${estimate.total.toFixed(2)}
              </td>
            </tr>
          </tfoot>
        </table>
      </div>
      
      {/* Notes & Terms */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-8">
        {estimate.notes && (
          <div className="border rounded-lg p-4">
            <h2 className="text-sm font-medium mb-2" style={{ color: estimate.branding?.secondaryColor || '#6B7280' }}>NOTES</h2>
            <p className="text-sm text-gray-600">{estimate.notes}</p>
          </div>
        )}
        
        {estimate.terms && (
          <div className="border rounded-lg p-4">
            <h2 className="text-sm font-medium mb-2" style={{ color: estimate.branding?.secondaryColor || '#6B7280' }}>TERMS & CONDITIONS</h2>
            <p className="text-sm text-gray-600">{estimate.terms}</p>
          </div>
        )}
      </div>
      
      {/* Signature */}
      <div className="border-t border-gray-200 pt-8 mt-8">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          <div>
            <h2 className="text-sm font-medium text-gray-500 mb-2">CUSTOMER ACCEPTANCE</h2>
            <div className="border-b border-gray-300 pb-8 mb-2"></div>
            <p className="text-xs text-gray-500">Signature</p>
          </div>
          
          <div>
            <h2 className="text-sm font-medium text-gray-500 mb-2">DATE</h2>
            <div className="border-b border-gray-300 pb-8 mb-2"></div>
            <p className="text-xs text-gray-500">MM/DD/YYYY</p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default EstimatePreview;