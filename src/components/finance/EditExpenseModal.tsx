import { useState, useEffect } from 'react';
import { X, Save } from 'lucide-react';

interface LineItem {
  description: string;
  quantity: number;
  unitPrice: number;
  totalAmount: number;
}

interface ExpenseMetadata {
  receiptNumber?: string;
  taxAmount?: number;
  subtotal?: number;
  supplierAddress?: string;
  supplierPhone?: string;
  lineItems?: LineItem[];
  confidence?: {
    vendor?: number;
    amount?: number;
    date?: number;
    overall?: number;
  };
  source?: string;
}

interface Expense {
  id: string;
  vendor: string;
  date: string;
  amount: number;
  category: string;
  projectId?: string;
  notes?: string;
  imageUrl?: string;
  status: 'pending' | 'processed' | 'verified';
  metadata?: ExpenseMetadata;
}

interface EditExpenseModalProps {
  expense: Expense;
  projects: { id: string; name: string }[];
  onSave: (expense: Expense) => void;
  onClose: () => void;
}

const categories = [
  'Materials', 'Labor', 'Subcontractors', 'Equipment Rental',
  'Tools', 'Permits', 'Office Supplies', 'Travel', 'Other'
];

const EditExpenseModal: React.FC<EditExpenseModalProps> = ({ expense, projects, onSave, onClose }) => {
  const [editedExpense, setEditedExpense] = useState<Expense>(expense);

  useEffect(() => {
    setEditedExpense(expense);
  }, [expense]);

  const handleSave = () => {
    onSave(editedExpense);
    onClose();
  };

  const updateLineItem = (index: number, field: keyof LineItem, value: string | number) => {
    const newLineItems = [...(editedExpense.metadata?.lineItems || [])];
    newLineItems[index] = {
      ...newLineItems[index],
      [field]: field === 'description' ? value : parseFloat(value as string)
    };

    // Recalculate totalAmount
    if (field === 'quantity' || field === 'unitPrice') {
      newLineItems[index].totalAmount = newLineItems[index].quantity * newLineItems[index].unitPrice;
    }

    setEditedExpense({
      ...editedExpense,
      metadata: {
        ...editedExpense.metadata,
        lineItems: newLineItems
      }
    });
  };

  const addLineItem = () => {
    const newLineItems = [
      ...(editedExpense.metadata?.lineItems || []),
      { description: '', quantity: 1, unitPrice: 0, totalAmount: 0 }
    ];

    setEditedExpense({
      ...editedExpense,
      metadata: {
        ...editedExpense.metadata,
        lineItems: newLineItems
      }
    });
  };

  const removeLineItem = (index: number) => {
    const newLineItems = (editedExpense.metadata?.lineItems || []).filter((_, i) => i !== index);
    setEditedExpense({
      ...editedExpense,
      metadata: {
        ...editedExpense.metadata,
        lineItems: newLineItems
      }
    });
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl max-w-4xl w-full max-h-[90vh] overflow-y-auto">
        <div className="sticky top-0 bg-white border-b border-gray-200 px-6 py-4 flex items-center justify-between">
          <h2 className="text-xl font-semibold text-gray-900">Edit Expense</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
            <X className="h-6 w-6" />
          </button>
        </div>

        <div className="p-6 space-y-6">
          {/* Basic Info */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Vendor *</label>
              <input
                type="text"
                value={editedExpense.vendor}
                onChange={(e) => setEditedExpense({ ...editedExpense, vendor: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Date *</label>
              <input
                type="date"
                value={editedExpense.date}
                onChange={(e) => setEditedExpense({ ...editedExpense, date: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Amount *</label>
              <input
                type="number"
                step="0.01"
                value={editedExpense.amount}
                onChange={(e) => setEditedExpense({ ...editedExpense, amount: parseFloat(e.target.value) })}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Category *</label>
              <select
                value={editedExpense.category}
                onChange={(e) => setEditedExpense({ ...editedExpense, category: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
              >
                {categories.map(cat => (
                  <option key={cat} value={cat}>{cat}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Project</label>
              <select
                value={editedExpense.projectId || ''}
                onChange={(e) => setEditedExpense({ ...editedExpense, projectId: e.target.value || undefined })}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
              >
                <option value="">None</option>
                {projects.map(project => (
                  <option key={project.id} value={project.id}>{project.name}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Receipt Number</label>
              <input
                type="text"
                value={editedExpense.metadata?.receiptNumber || ''}
                onChange={(e) => setEditedExpense({
                  ...editedExpense,
                  metadata: { ...editedExpense.metadata, receiptNumber: e.target.value }
                })}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
              />
            </div>
          </div>

          {/* Tax Details */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Subtotal</label>
              <input
                type="number"
                step="0.01"
                value={editedExpense.metadata?.subtotal || ''}
                onChange={(e) => setEditedExpense({
                  ...editedExpense,
                  metadata: { ...editedExpense.metadata, subtotal: parseFloat(e.target.value) || 0 }
                })}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Tax Amount</label>
              <input
                type="number"
                step="0.01"
                value={editedExpense.metadata?.taxAmount || ''}
                onChange={(e) => setEditedExpense({
                  ...editedExpense,
                  metadata: { ...editedExpense.metadata, taxAmount: parseFloat(e.target.value) || 0 }
                })}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
              />
            </div>
          </div>

          {/* Supplier Details */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Supplier Address</label>
              <input
                type="text"
                value={editedExpense.metadata?.supplierAddress || ''}
                onChange={(e) => setEditedExpense({
                  ...editedExpense,
                  metadata: { ...editedExpense.metadata, supplierAddress: e.target.value }
                })}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Supplier Phone</label>
              <input
                type="text"
                value={editedExpense.metadata?.supplierPhone || ''}
                onChange={(e) => setEditedExpense({
                  ...editedExpense,
                  metadata: { ...editedExpense.metadata, supplierPhone: e.target.value }
                })}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
              />
            </div>
          </div>

          {/* Notes */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Notes</label>
            <textarea
              value={editedExpense.notes || ''}
              onChange={(e) => setEditedExpense({ ...editedExpense, notes: e.target.value })}
              rows={3}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
            />
          </div>

          {/* Line Items */}
          {editedExpense.metadata?.lineItems && editedExpense.metadata.lineItems.length > 0 && (
            <div className="border-t pt-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-medium text-gray-900">Line Items</h3>
                <button
                  onClick={addLineItem}
                  className="text-sm text-blue-600 hover:text-blue-800 font-medium"
                >
                  + Add Item
                </button>
              </div>

              <div className="space-y-3">
                {editedExpense.metadata.lineItems.map((item, index) => (
                  <div key={index} className="grid grid-cols-12 gap-2 items-start">
                    <div className="col-span-5">
                      <input
                        type="text"
                        value={item.description}
                        onChange={(e) => updateLineItem(index, 'description', e.target.value)}
                        placeholder="Description"
                        className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:ring-blue-500 focus:border-blue-500"
                      />
                    </div>
                    <div className="col-span-2">
                      <input
                        type="number"
                        value={item.quantity}
                        onChange={(e) => updateLineItem(index, 'quantity', e.target.value)}
                        placeholder="Qty"
                        className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:ring-blue-500 focus:border-blue-500"
                      />
                    </div>
                    <div className="col-span-2">
                      <input
                        type="number"
                        step="0.01"
                        value={item.unitPrice}
                        onChange={(e) => updateLineItem(index, 'unitPrice', e.target.value)}
                        placeholder="Price"
                        className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:ring-blue-500 focus:border-blue-500"
                      />
                    </div>
                    <div className="col-span-2">
                      <input
                        type="text"
                        value={`$${item.totalAmount.toFixed(2)}`}
                        disabled
                        className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm bg-gray-50 text-gray-600"
                      />
                    </div>
                    <div className="col-span-1 flex justify-end">
                      <button
                        onClick={() => removeLineItem(index)}
                        className="text-red-600 hover:text-red-800 p-2"
                      >
                        <X className="h-4 w-4" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="sticky bottom-0 bg-gray-50 border-t border-gray-200 px-6 py-4 flex justify-end space-x-3">
          <button
            onClick={onClose}
            className="px-4 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            className="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
          >
            <Save className="h-4 w-4 mr-2" />
            Save Changes
          </button>
        </div>
      </div>
    </div>
  );
};

export default EditExpenseModal;
