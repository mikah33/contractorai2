import { DollarSign, Calendar, User, Briefcase, Check } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { Estimate } from '../../types/estimates';
import { format } from 'date-fns';
import { useData } from '../../contexts/DataContext';

interface EstimatePreviewProps {
  estimate: Estimate;
  clients: { id: string; name: string; email?: string; phone?: string; address?: string }[];
  projects: { id: string; name: string; address?: string }[];
  hideStatus?: boolean; // Hide status badge for PDFs
}

const EstimatePreview: React.FC<EstimatePreviewProps> = ({ estimate, clients, projects, hideStatus = false }) => {
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
    <div className="p-4 sm:p-8 max-w-4xl mx-auto" style={{ fontFamily: estimate.branding?.fontFamily || 'Inter' }}>
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start gap-4 sm:gap-0 mb-6 sm:mb-8">
        <div className="flex-1">
          {profile?.logo_url && (
            <img
              src={profile.logo_url}
              alt="Company Logo"
              className="h-12 sm:h-16 w-auto object-contain mb-3 sm:mb-4"
            />
          )}
          <h1 className="text-xl sm:text-2xl font-bold" style={{ color: estimate.branding?.primaryColor || '#3B82F6' }}>
            {estimate.title}
          </h1>
          <p className="text-gray-500 mt-1 text-sm">Estimate #{estimate.id.slice(-6)}</p>
        </div>

        <div className="text-left sm:text-right w-full sm:w-auto">
          {!hideStatus && (
            <div className="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-800 mb-2">
              {estimate.status.toUpperCase()}
            </div>
          )}
          <div className={`flex items-center text-gray-600 text-xs sm:text-sm font-semibold ${!hideStatus ? 'mt-2' : ''}`}>
            <Calendar className="h-3 w-3 sm:h-4 sm:w-4 mr-1" />
            <span>Created: {formatDate(estimate.createdAt)}</span>
          </div>
          <div className="flex items-center text-gray-600 text-xs sm:text-sm font-semibold mt-1">
            <Calendar className="h-3 w-3 sm:h-4 sm:w-4 mr-1" />
            <span>Valid until: {formatDate(estimate.expiresAt)}</span>
          </div>
        </div>
      </div>
      
      {/* Client and Project Info */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-8 mb-6 sm:mb-8">
        <div className="border-2 border-gray-300 rounded-lg p-3 sm:p-4">
          <h2 className="text-xs sm:text-sm font-bold text-gray-700 mb-2">{t('clients.client')}</h2>
          {client ? (
            <div>
              <p className="font-bold text-gray-900">{client.name}</p>
              {client.email && <p className="text-gray-700 text-sm mt-1 font-medium">{client.email}</p>}
              {client.phone && <p className="text-gray-700 text-sm font-medium">{client.phone}</p>}
              {client.address && <p className="text-gray-700 text-sm font-medium">{client.address}</p>}
            </div>
          ) : estimate.clientName ? (
            <div>
              <p className="font-bold text-gray-900">{estimate.clientName}</p>
            </div>
          ) : (
            <p className="text-gray-500 italic">No client selected</p>
          )}
        </div>

        <div className="border-2 border-gray-300 rounded-lg p-3 sm:p-4">
          <h2 className="text-xs sm:text-sm font-bold text-gray-700 mb-2">PROJECT</h2>
          {project ? (
            <div>
              <p className="font-bold text-gray-900">{project.name}</p>
              {project.address && <p className="text-gray-700 text-sm mt-1 font-medium">{project.address}</p>}
            </div>
          ) : estimate.projectName ? (
            <div>
              <p className="font-bold text-gray-900">{estimate.projectName}</p>
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
            <div className="border-2 border-gray-300 rounded-lg p-4">
              <h2 className="text-sm font-bold text-gray-700 mb-2">{estimate.customFields.field1Name.toUpperCase()}</h2>
              <p className="font-bold text-gray-900">{estimate.customFields.field1Value || 'N/A'}</p>
            </div>
          )}

          {estimate.customFields?.field2Name && (
            <div className="border-2 border-gray-300 rounded-lg p-4">
              <h2 className="text-sm font-bold text-gray-700 mb-2">{estimate.customFields.field2Name.toUpperCase()}</h2>
              <p className="font-bold text-gray-900">{estimate.customFields.field2Value || 'N/A'}</p>
            </div>
          )}
        </div>
      )}
      
      {/* Line Items */}
      <div className="mb-6 sm:mb-8">
        {/* Desktop Table View */}
        <div className="hidden sm:block overflow-x-auto">
          <table className="min-w-full divide-y-2 divide-gray-300 border-2 border-gray-300">
            <thead>
              <tr style={{ backgroundColor: (estimate.branding?.primaryColor || '#3B82F6') + '20' }}>
                <th scope="col" className="px-6 py-3 text-left text-xs font-bold uppercase tracking-wider" style={{ color: estimate.branding?.primaryColor || '#3B82F6' }}>
                  Description
                </th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-bold uppercase tracking-wider" style={{ color: estimate.branding?.primaryColor || '#3B82F6' }}>
                  Quantity
                </th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-bold uppercase tracking-wider" style={{ color: estimate.branding?.primaryColor || '#3B82F6' }}>
                  Unit
                </th>
                <th scope="col" className="px-6 py-3 text-right text-xs font-bold uppercase tracking-wider" style={{ color: estimate.branding?.primaryColor || '#3B82F6' }}>
                  Unit Price
                </th>
                <th scope="col" className="px-6 py-3 text-right text-xs font-bold uppercase tracking-wider" style={{ color: estimate.branding?.primaryColor || '#3B82F6' }}>
                  Total
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y-2 divide-gray-200">
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
                        <h3 className="font-bold text-base" style={{ color: estimate.branding?.secondaryColor || '#6B7280' }}>
                          {item.description}
                        </h3>
                      ) : (
                        <div className="text-sm text-gray-900 font-medium">{item.description}</div>
                      )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-700 font-semibold">
                      {item.type !== 'section' ? item.quantity : ''}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-700 font-semibold">
                      {item.type !== 'section' ? item.unit : ''}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 text-right font-semibold">
                      {item.type !== 'section' && item.unitPrice != null ? `$${item.unitPrice.toFixed(2)}` : item.type !== 'section' ? '$0.00' : ''}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 text-right font-bold">
                      {item.type !== 'section' ? `$${((item.totalPrice != null ? item.totalPrice : (item.unitPrice ?? 0) * (item.quantity ?? 0))).toFixed(2)}` : ''}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
            <tfoot>
              <tr className="border-t-2 border-gray-300">
                <td colSpan={4} className="px-6 py-4 text-right text-sm font-bold text-gray-900">
                  Subtotal
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm font-bold text-gray-900 text-right">
                  ${(estimate.subtotal ?? 0).toFixed(2)}
                </td>
              </tr>
              <tr className="border-t border-gray-200">
                <td colSpan={4} className="px-6 py-4 text-right text-sm font-bold text-gray-900">
                  Tax ({estimate.taxRate ?? 0}%)
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm font-bold text-gray-900 text-right">
                  ${(estimate.taxAmount ?? 0).toFixed(2)}
                </td>
              </tr>
              <tr className="border-t-2 border-gray-300 bg-gray-50">
                <td colSpan={4} className="px-6 py-4 text-right text-base font-extrabold text-gray-900">
                  TOTAL
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-xl font-extrabold text-right" style={{ color: estimate.branding?.primaryColor || '#3B82F6' }}>
                  ${(estimate.total ?? 0).toFixed(2)}
                </td>
              </tr>
            </tfoot>
          </table>
        </div>

        {/* Mobile Card View */}
        <div className="sm:hidden space-y-3">
          <div className="bg-blue-50 border-2 border-blue-200 rounded-lg p-3 mb-4">
            <h3 className="text-xs font-bold uppercase text-blue-700 mb-1">Line Items</h3>
          </div>

          {estimate.items.length === 0 ? (
            <div className="text-center text-sm text-gray-500 py-8">
              No items added to this estimate
            </div>
          ) : (
            estimate.items.map((item) => (
              <div key={item.id} className={`border-2 rounded-lg p-3 ${item.type === 'section' ? 'border-gray-400 bg-gray-50' : 'border-gray-300 bg-white'}`}>
                {item.type === 'section' ? (
                  <h3 className="font-bold text-sm" style={{ color: estimate.branding?.secondaryColor || '#6B7280' }}>
                    {item.description}
                  </h3>
                ) : (
                  <>
                    <div className="font-semibold text-sm text-gray-900 mb-2">{item.description}</div>
                    <div className="grid grid-cols-2 gap-2 text-xs">
                      <div>
                        <span className="text-gray-500">Qty:</span>
                        <span className="ml-1 font-semibold text-gray-700">{item.quantity} {item.unit}</span>
                      </div>
                      <div className="text-right">
                        <span className="text-gray-500">Unit Price:</span>
                        <span className="ml-1 font-semibold text-gray-900">
                          ${item.unitPrice != null ? item.unitPrice.toFixed(2) : '0.00'}
                        </span>
                      </div>
                    </div>
                    <div className="mt-2 pt-2 border-t border-gray-200 text-right">
                      <span className="text-xs text-gray-500">Item Total: </span>
                      <span className="font-bold text-base" style={{ color: estimate.branding?.primaryColor || '#3B82F6' }}>
                        ${((item.totalPrice != null ? item.totalPrice : (item.unitPrice ?? 0) * (item.quantity ?? 0))).toFixed(2)}
                      </span>
                    </div>
                  </>
                )}
              </div>
            ))
          )}

          {/* Mobile Totals */}
          <div className="border-2 border-gray-300 rounded-lg overflow-hidden mt-4">
            <div className="bg-gray-50 px-3 py-2 flex justify-between items-center border-b border-gray-300">
              <span className="text-xs font-semibold text-gray-700">Subtotal</span>
              <span className="text-sm font-bold text-gray-900">${(estimate.subtotal ?? 0).toFixed(2)}</span>
            </div>
            <div className="bg-white px-3 py-2 flex justify-between items-center border-b border-gray-300">
              <span className="text-xs font-semibold text-gray-700">Tax ({estimate.taxRate ?? 0}%)</span>
              <span className="text-sm font-bold text-gray-900">${(estimate.taxAmount ?? 0).toFixed(2)}</span>
            </div>
            <div className="bg-blue-50 px-3 py-3 flex justify-between items-center">
              <span className="text-sm font-extrabold text-gray-900">TOTAL</span>
              <span className="text-xl font-extrabold" style={{ color: estimate.branding?.primaryColor || '#3B82F6' }}>
                ${(estimate.total ?? 0).toFixed(2)}
              </span>
            </div>
          </div>
        </div>
      </div>
      
      {/* Notes & Terms */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-8 mb-6 sm:mb-8">
        {estimate.notes && (
          <div className="border-2 border-gray-300 rounded-lg p-3 sm:p-4">
            <h2 className="text-xs sm:text-sm font-bold mb-2 text-gray-700">NOTES</h2>
            <p className="text-xs sm:text-sm text-gray-800 font-medium">{estimate.notes}</p>
          </div>
        )}

        {estimate.terms && (
          <div className="border-2 border-gray-300 rounded-lg p-3 sm:p-4">
            <h2 className="text-xs sm:text-sm font-bold mb-2 text-gray-700">TERMS & CONDITIONS</h2>
            <p className="text-xs sm:text-sm text-gray-800 font-medium">{estimate.terms}</p>
          </div>
        )}
      </div>

      {/* Signature */}
      <div className="border-t border-gray-200 pt-6 sm:pt-8 mt-6 sm:mt-8">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 sm:gap-8">
          <div>
            <h2 className="text-xs sm:text-sm font-medium text-gray-500 mb-2">CUSTOMER ACCEPTANCE</h2>
            <div className="border-b border-gray-300 pb-6 sm:pb-8 mb-2"></div>
            <p className="text-xs text-gray-500">Signature</p>
          </div>

          <div>
            <h2 className="text-xs sm:text-sm font-medium text-gray-500 mb-2">DATE</h2>
            <div className="border-b border-gray-300 pb-6 sm:pb-8 mb-2"></div>
            <p className="text-xs text-gray-500">MM/DD/YYYY</p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default EstimatePreview;