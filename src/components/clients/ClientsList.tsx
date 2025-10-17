import { Phone, Mail, MapPin, Building, Edit, Trash, Users } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { Client } from '../../stores/clientsStore';
import MapLink from '../common/MapLink';

interface ClientsListProps {
  clients: Client[];
  onEdit: (client: Client) => void;
  onDelete: (id: string) => void;
  isLoading: boolean;
}

const ClientsList: React.FC<ClientsListProps> = ({ clients, onEdit, onDelete, isLoading }) => {
  const { t } = useTranslation();

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active':
        return 'bg-green-100 text-green-800';
      case 'inactive':
        return 'bg-gray-100 text-gray-800';
      case 'prospect':
        return 'bg-yellow-100 text-yellow-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  if (isLoading && clients.length === 0) {
    return (
      <div className="p-6 text-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
        <p className="mt-2 text-sm text-gray-500">Loading clients...</p>
      </div>
    );
  }

  if (clients.length === 0) {
    return (
      <div className="p-12 text-center">
        <Users className="mx-auto h-12 w-12 text-gray-400" />
        <h3 className="mt-2 text-sm font-medium text-gray-900">No clients found</h3>
        <p className="mt-1 text-sm text-gray-500">
          Get started by adding your first client.
        </p>
      </div>
    );
  }

  return (
    <div className="overflow-x-auto">
      <table className="min-w-full divide-y divide-gray-200">
        <thead className="bg-gray-50">
          <tr>
            <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
              {t('clients.client')}
            </th>
            <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
              {t('clients.contact')}
            </th>
            <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
              {t('common.company')}
            </th>
            <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
              {t('clients.location')}
            </th>
            <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
              {t('common.status')}
            </th>
            <th scope="col" className="relative px-6 py-3">
              <span className="sr-only">{t('estimates.actions')}</span>
            </th>
          </tr>
        </thead>
        <tbody className="bg-white divide-y divide-gray-200">
          {clients.map((client) => (
            <tr key={client.id} className="hover:bg-gray-50">
              <td className="px-6 py-4 whitespace-nowrap">
                <div>
                  <div className="text-sm font-medium text-gray-900">{client.name}</div>
                  {client.notes && (
                    <div className="text-xs text-gray-500 truncate max-w-xs">{client.notes}</div>
                  )}
                </div>
              </td>
              <td className="px-6 py-4 whitespace-nowrap">
                <div className="text-sm text-gray-900">
                  <div className="flex items-center">
                    <Mail className="h-3 w-3 mr-1 text-gray-400" />
                    <a href={`mailto:${client.email}`} className="hover:text-blue-600">
                      {client.email}
                    </a>
                  </div>
                  <div className="flex items-center mt-1">
                    <Phone className="h-3 w-3 mr-1 text-gray-400" />
                    <a href={`tel:${client.phone}`} className="hover:text-blue-600">
                      {client.phone}
                    </a>
                  </div>
                </div>
              </td>
              <td className="px-6 py-4 whitespace-nowrap">
                {client.company ? (
                  <div className="flex items-center text-sm text-gray-900">
                    <Building className="h-3 w-3 mr-1 text-gray-400" />
                    {client.company}
                  </div>
                ) : (
                  <span className="text-sm text-gray-400">—</span>
                )}
              </td>
              <td className="px-6 py-4 whitespace-nowrap">
                {(() => {
                  const fullAddress = [client.address, client.city, client.state, client.zip].filter(Boolean).join(', ');
                  return fullAddress ? (
                    <MapLink address={fullAddress} className="text-sm" />
                  ) : (
                    <span className="text-sm text-gray-400">—</span>
                  );
                })()}
              </td>
              <td className="px-6 py-4 whitespace-nowrap">
                <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getStatusColor(client.status)}`}>
                  {client.status.charAt(0).toUpperCase() + client.status.slice(1)}
                </span>
              </td>
              <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                <button
                  onClick={() => onEdit(client)}
                  className="text-blue-600 hover:text-blue-900 mr-4"
                >
                  <Edit className="h-4 w-4" />
                </button>
                <button
                  onClick={() => onDelete(client.id)}
                  className="text-red-600 hover:text-red-900"
                >
                  <Trash className="h-4 w-4" />
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};

export default ClientsList;