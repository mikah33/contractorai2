import { CheckCircle, Clock, AlertCircle } from 'lucide-react';
import useEstimateStore from '../../stores/estimateStore';
import { useEffect } from 'react';

const RecentEstimatesTable = () => {
  const { estimates, fetchEstimates } = useEstimateStore();

  useEffect(() => {
    fetchEstimates();
  }, [fetchEstimates]);

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'approved':
        return <CheckCircle className="w-4 h-4 text-green-600" />;
      case 'draft':
      case 'sent':
        return <Clock className="w-4 h-4 text-amber-500" />;
      case 'rejected':
        return <AlertCircle className="w-4 h-4 text-red-500" />;
      default:
        return null;
    }
  };

  const getStatusClass = (status: string) => {
    switch (status) {
      case 'approved':
        return 'text-green-600 bg-green-100';
      case 'draft':
      case 'sent':
        return 'text-amber-700 bg-amber-100';
      case 'rejected':
        return 'text-red-600 bg-red-100';
      default:
        return 'text-gray-600 bg-gray-100';
    }
  };

  const formatStatus = (status: string) => {
    switch (status) {
      case 'approved':
        return 'Approved';
      case 'draft':
        return 'Draft';
      case 'sent':
        return 'Sent';
      case 'rejected':
        return 'Rejected';
      default:
        return status;
    }
  };

  return (
    <div className="overflow-x-auto">
      <table className="min-w-full divide-y divide-gray-200">
        <thead className="bg-gray-50">
          <tr>
            <th scope="col" className="px-4 py-3 text-xs font-medium tracking-wider text-left text-gray-500 uppercase">
              Client
            </th>
            <th scope="col" className="px-4 py-3 text-xs font-medium tracking-wider text-left text-gray-500 uppercase">
              Type
            </th>
            <th scope="col" className="px-4 py-3 text-xs font-medium tracking-wider text-left text-gray-500 uppercase">
              Amount
            </th>
            <th scope="col" className="px-4 py-3 text-xs font-medium tracking-wider text-left text-gray-500 uppercase">
              Status
            </th>
            <th scope="col" className="px-4 py-3 text-xs font-medium tracking-wider text-left text-gray-500 uppercase">
              Date
            </th>
          </tr>
        </thead>
        <tbody className="bg-white divide-y divide-gray-200">
          {estimates.slice(0, 5).map((estimate) => (
            <tr key={estimate.id} className="hover:bg-gray-50">
              <td className="px-4 py-3 text-sm font-medium text-gray-900 whitespace-nowrap">
                {estimate.client_name || 'No Client'}
              </td>
              <td className="px-4 py-3 text-sm text-gray-700 whitespace-nowrap">
                {estimate.project_name || 'General Estimate'}
              </td>
              <td className="px-4 py-3 text-sm font-medium text-gray-900 whitespace-nowrap">
                ${estimate.total?.toLocaleString() || '0'}
              </td>
              <td className="px-4 py-3 text-sm whitespace-nowrap">
                <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${getStatusClass(estimate.status)}`}>
                  {getStatusIcon(estimate.status)}
                  <span className="ml-1">{formatStatus(estimate.status)}</span>
                </span>
              </td>
              <td className="px-4 py-3 text-sm text-gray-700 whitespace-nowrap">
                {estimate.created_at ? new Date(estimate.created_at).toLocaleDateString() : 'N/A'}
              </td>
            </tr>
          ))}
          {estimates.length === 0 && (
            <tr>
              <td colSpan={5} className="px-4 py-8 text-center text-gray-500">
                No estimates yet. Create your first estimate to get started!
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );
};

export default RecentEstimatesTable;