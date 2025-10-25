import { useState } from 'react';
import { X, Link, Search } from 'lucide-react';

interface Client {
  id: string;
  name: string;
  email: string;
  phone: string;
  company?: string;
}

interface Project {
  id: string;
  name: string;
  client?: string;
  client_id?: string;
}

interface LinkClientModalProps {
  project: Project;
  clients: Client[];
  onLink: (projectId: string, clientId: string) => Promise<void>;
  onClose: () => void;
}

const LinkClientModal: React.FC<LinkClientModalProps> = ({
  project,
  clients,
  onLink,
  onClose
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedClientId, setSelectedClientId] = useState<string>(project.client_id || '');
  const [isLinking, setIsLinking] = useState(false);

  const filteredClients = clients.filter(client =>
    client.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    client.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
    client.company?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const handleLink = async () => {
    if (!selectedClientId) {
      alert('Please select a client');
      return;
    }

    setIsLinking(true);
    try {
      await onLink(project.id, selectedClientId);
      onClose();
    } catch (error) {
      console.error('Error linking client:', error);
      alert('Failed to link client');
    } finally {
      setIsLinking(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-[80vh] overflow-hidden">
        <div className="bg-blue-600 text-white px-6 py-4 flex items-center justify-between">
          <div className="flex items-center">
            <Link className="h-6 w-6 mr-3" />
            <div>
              <h2 className="text-xl font-semibold">Link Client to Project</h2>
              <p className="text-blue-100 text-sm mt-1">Project: {project.name}</p>
            </div>
          </div>
          <button onClick={onClose} className="text-white hover:text-blue-100">
            <X className="h-6 w-6" />
          </button>
        </div>

        <div className="p-6">
          {/* Search */}
          <div className="mb-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
              <input
                type="text"
                placeholder="Search clients..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
              />
            </div>
          </div>

          {/* Client List */}
          <div className="max-h-96 overflow-y-auto border border-gray-200 rounded-md">
            {filteredClients.length === 0 ? (
              <div className="p-8 text-center text-gray-500">
                <p>No clients found</p>
                <p className="text-sm mt-2">Try adjusting your search or create a new client</p>
              </div>
            ) : (
              <div className="divide-y divide-gray-200">
                {filteredClients.map((client) => (
                  <label
                    key={client.id}
                    className={`flex items-center p-4 cursor-pointer hover:bg-gray-50 transition-colors ${
                      selectedClientId === client.id ? 'bg-blue-50 border-l-4 border-blue-500' : ''
                    }`}
                  >
                    <input
                      type="radio"
                      name="client"
                      value={client.id}
                      checked={selectedClientId === client.id}
                      onChange={(e) => setSelectedClientId(e.target.value)}
                      className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300"
                    />
                    <div className="ml-3 flex-1">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="text-sm font-medium text-gray-900">{client.name}</p>
                          {client.company && (
                            <p className="text-sm text-gray-500">{client.company}</p>
                          )}
                        </div>
                        <div className="text-right">
                          <p className="text-sm text-gray-600">{client.email}</p>
                          <p className="text-sm text-gray-500">{client.phone}</p>
                        </div>
                      </div>
                    </div>
                  </label>
                ))}
              </div>
            )}
          </div>

          {/* Current Link Info */}
          {project.client_id && (
            <div className="mt-4 p-3 bg-yellow-50 border border-yellow-200 rounded-md">
              <p className="text-sm text-yellow-800">
                ⚠️ This project is currently linked to another client. Selecting a new client will replace the existing link.
              </p>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="bg-gray-50 px-6 py-4 flex justify-end space-x-3 border-t border-gray-200">
          <button
            onClick={onClose}
            className="px-4 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
          >
            Cancel
          </button>
          <button
            onClick={handleLink}
            disabled={!selectedClientId || isLinking}
            className="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:bg-blue-300 disabled:cursor-not-allowed"
          >
            <Link className="h-4 w-4 mr-2" />
            {isLinking ? 'Linking...' : 'Link Client'}
          </button>
        </div>
      </div>
    </div>
  );
};

export default LinkClientModal;
