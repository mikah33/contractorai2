import { useState, useEffect } from 'react';
import { X, Save, Plus, Trash2 } from 'lucide-react';
import { useFinanceStore } from '../../stores/financeStoreSupabase';
import type { Invoice, LineItem } from '../../stores/financeStoreSupabase';
import { useTheme, getThemeClasses } from '../../contexts/ThemeContext';

interface EditInvoiceModalProps {
  invoice: Invoice;
  onClose: () => void;
}

const EditInvoiceModal: React.FC<EditInvoiceModalProps> = ({ invoice, onClose }) => {
  const { theme } = useTheme();
  const themeClasses = getThemeClasses(theme);
  const { updateInvoice, clients } = useFinanceStore();

  const [editedInvoice, setEditedInvoice] = useState<Invoice>(invoice);
  const [lineItems, setLineItems] = useState<LineItem[]>(invoice.lineItems || []);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    setEditedInvoice(invoice);
    setLineItems(invoice.lineItems || []);
  }, [invoice]);

  // Recalculate total from line items whenever they change
  useEffect(() => {
    const total = lineItems.reduce((sum, item) => sum + item.totalAmount, 0);
    setEditedInvoice(prev => ({
      ...prev,
      totalAmount: total,
      balance: total - prev.paidAmount
    }));
  }, [lineItems]);

  const updateLineItem = (index: number, field: keyof LineItem, value: string | number) => {
    const updated = [...lineItems];
    updated[index] = {
      ...updated[index],
      [field]: field === 'description' ? value : parseFloat(value as string) || 0
    };

    // Recalculate line total when quantity or rate changes
    if (field === 'quantity' || field === 'unitPrice') {
      updated[index].totalAmount = updated[index].quantity * updated[index].unitPrice;
    }

    setLineItems(updated);
  };

  const addLineItem = () => {
    setLineItems([
      ...lineItems,
      { description: '', quantity: 1, unitPrice: 0, totalAmount: 0 }
    ]);
  };

  const removeLineItem = (index: number) => {
    setLineItems(lineItems.filter((_, i) => i !== index));
  };

  const handleSave = async () => {
    setIsSaving(true);
    try {
      await updateInvoice({
        ...editedInvoice,
        lineItems,
        totalAmount: lineItems.reduce((sum, item) => sum + item.totalAmount, 0),
        balance: lineItems.reduce((sum, item) => sum + item.totalAmount, 0) - editedInvoice.paidAmount
      });
      onClose();
    } catch (error) {
      console.error('Error saving invoice:', error);
    } finally {
      setIsSaving(false);
    }
  };

  const clientName = clients.find(c => c.id === editedInvoice.clientId)?.name || '';

  const isDark = theme === 'dark';

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className={`rounded-lg shadow-xl max-w-4xl w-full max-h-[90vh] overflow-y-auto ${isDark ? 'bg-gray-800' : 'bg-white'}`}>
        {/* Header */}
        <div className={`sticky top-0 border-b px-6 py-4 flex items-center justify-between ${isDark ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'}`}>
          <h2 className={`text-xl font-semibold ${isDark ? 'text-white' : 'text-gray-900'}`}>Edit Invoice</h2>
          <button onClick={onClose} className={`${isDark ? 'text-gray-400 hover:text-gray-200' : 'text-gray-400 hover:text-gray-600'}`}>
            <X className="h-6 w-6" />
          </button>
        </div>

        <div className="p-6 space-y-6">
          {/* Basic Info */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className={`block text-sm font-medium mb-1 ${isDark ? 'text-gray-300' : 'text-gray-700'}`}>Client Name</label>
              <input
                type="text"
                value={clientName}
                disabled
                className={`w-full px-3 py-2 border rounded-md text-sm ${isDark ? 'bg-gray-700 border-gray-600 text-gray-300' : 'bg-gray-50 border-gray-300 text-gray-600'}`}
              />
            </div>

            <div>
              <label className={`block text-sm font-medium mb-1 ${isDark ? 'text-gray-300' : 'text-gray-700'}`}>Invoice Number</label>
              <input
                type="text"
                value={editedInvoice.invoiceNumber || ''}
                onChange={(e) => setEditedInvoice({ ...editedInvoice, invoiceNumber: e.target.value })}
                className={`w-full px-3 py-2 border rounded-md focus:ring-theme focus:border-theme ${isDark ? 'bg-gray-700 border-gray-600 text-white' : 'bg-white border-gray-300 text-gray-900'}`}
              />
            </div>

            <div>
              <label className={`block text-sm font-medium mb-1 ${isDark ? 'text-gray-300' : 'text-gray-700'}`}>Due Date</label>
              <input
                type="date"
                value={editedInvoice.dueDate?.split('T')[0] || ''}
                onChange={(e) => setEditedInvoice({ ...editedInvoice, dueDate: e.target.value })}
                className={`w-full px-3 py-2 border rounded-md focus:ring-theme focus:border-theme ${isDark ? 'bg-gray-700 border-gray-600 text-white' : 'bg-white border-gray-300 text-gray-900'}`}
              />
            </div>

            <div>
              <label className={`block text-sm font-medium mb-1 ${isDark ? 'text-gray-300' : 'text-gray-700'}`}>Status</label>
              <select
                value={editedInvoice.status}
                onChange={(e) => setEditedInvoice({ ...editedInvoice, status: e.target.value as Invoice['status'] })}
                className={`w-full px-3 py-2 border rounded-md focus:ring-theme focus:border-theme ${isDark ? 'bg-gray-700 border-gray-600 text-white' : 'bg-white border-gray-300 text-gray-900'}`}
              >
                <option value="draft">Draft</option>
                <option value="sent">Sent</option>
                <option value="outstanding">Outstanding</option>
                <option value="partial">Partial</option>
                <option value="paid">Paid</option>
                <option value="overdue">Overdue</option>
              </select>
            </div>
          </div>

          {/* Line Items */}
          <div className={`border-t pt-6 ${isDark ? 'border-gray-700' : 'border-gray-200'}`}>
            <div className="flex items-center justify-between mb-4">
              <h3 className={`text-lg font-medium ${isDark ? 'text-white' : 'text-gray-900'}`}>Line Items</h3>
              <button
                onClick={addLineItem}
                className="inline-flex items-center text-sm font-medium hover:opacity-80"
                style={{ color: 'var(--color-theme)' }}
              >
                <Plus className="h-4 w-4 mr-1" />
                Add Item
              </button>
            </div>

            {lineItems.length === 0 ? (
              <div className={`text-center py-8 rounded-lg border-2 border-dashed ${isDark ? 'border-gray-600 text-gray-400' : 'border-gray-300 text-gray-500'}`}>
                <p className="text-sm">No line items yet. Click "Add Item" to get started.</p>
              </div>
            ) : (
              <div className="space-y-3">
                {/* Header row */}
                <div className="hidden md:grid grid-cols-12 gap-2 px-1">
                  <span className={`col-span-5 text-xs font-medium uppercase ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>Description</span>
                  <span className={`col-span-2 text-xs font-medium uppercase ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>Qty</span>
                  <span className={`col-span-2 text-xs font-medium uppercase ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>Rate</span>
                  <span className={`col-span-2 text-xs font-medium uppercase ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>Amount</span>
                  <span className="col-span-1"></span>
                </div>

                {lineItems.map((item, index) => (
                  <div key={index} className="grid grid-cols-12 gap-2 items-start">
                    <div className="col-span-12 md:col-span-5">
                      <input
                        type="text"
                        value={item.description}
                        onChange={(e) => updateLineItem(index, 'description', e.target.value)}
                        placeholder="Description"
                        className={`w-full px-3 py-2 border rounded-md text-sm focus:ring-theme focus:border-theme ${isDark ? 'bg-gray-700 border-gray-600 text-white placeholder-gray-400' : 'bg-white border-gray-300 text-gray-900'}`}
                      />
                    </div>
                    <div className="col-span-4 md:col-span-2">
                      <input
                        type="number"
                        value={item.quantity}
                        onChange={(e) => updateLineItem(index, 'quantity', e.target.value)}
                        placeholder="Qty"
                        min="0"
                        className={`w-full px-3 py-2 border rounded-md text-sm focus:ring-theme focus:border-theme ${isDark ? 'bg-gray-700 border-gray-600 text-white placeholder-gray-400' : 'bg-white border-gray-300 text-gray-900'}`}
                      />
                    </div>
                    <div className="col-span-4 md:col-span-2">
                      <input
                        type="number"
                        step="0.01"
                        value={item.unitPrice}
                        onChange={(e) => updateLineItem(index, 'unitPrice', e.target.value)}
                        placeholder="Rate"
                        min="0"
                        className={`w-full px-3 py-2 border rounded-md text-sm focus:ring-theme focus:border-theme ${isDark ? 'bg-gray-700 border-gray-600 text-white placeholder-gray-400' : 'bg-white border-gray-300 text-gray-900'}`}
                      />
                    </div>
                    <div className="col-span-3 md:col-span-2">
                      <input
                        type="text"
                        value={`$${item.totalAmount.toFixed(2)}`}
                        disabled
                        className={`w-full px-3 py-2 border rounded-md text-sm ${isDark ? 'bg-gray-600 border-gray-500 text-gray-300' : 'bg-gray-50 border-gray-300 text-gray-600'}`}
                      />
                    </div>
                    <div className="col-span-1 flex justify-end">
                      <button
                        onClick={() => removeLineItem(index)}
                        className="text-red-500 hover:text-red-700 p-2"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* Total */}
            {lineItems.length > 0 && (
              <div className={`mt-4 flex justify-end border-t pt-4 ${isDark ? 'border-gray-700' : 'border-gray-200'}`}>
                <div className="text-right">
                  <span className={`text-sm font-medium ${isDark ? 'text-gray-300' : 'text-gray-700'}`}>Total: </span>
                  <span className={`text-lg font-semibold ${isDark ? 'text-white' : 'text-gray-900'}`}>
                    ${lineItems.reduce((sum, item) => sum + item.totalAmount, 0).toFixed(2)}
                  </span>
                </div>
              </div>
            )}
          </div>

          {/* Notes */}
          <div>
            <label className={`block text-sm font-medium mb-1 ${isDark ? 'text-gray-300' : 'text-gray-700'}`}>Notes</label>
            <textarea
              value={editedInvoice.notes || ''}
              onChange={(e) => setEditedInvoice({ ...editedInvoice, notes: e.target.value })}
              rows={3}
              className={`w-full px-3 py-2 border rounded-md focus:ring-theme focus:border-theme ${isDark ? 'bg-gray-700 border-gray-600 text-white placeholder-gray-400' : 'bg-white border-gray-300 text-gray-900'}`}
              placeholder="Additional notes..."
            />
          </div>
        </div>

        {/* Footer */}
        <div className={`sticky bottom-0 border-t px-6 py-4 flex justify-end space-x-3 ${isDark ? 'bg-gray-800 border-gray-700' : 'bg-gray-50 border-gray-200'}`}>
          <button
            onClick={onClose}
            className={`px-4 py-2 border rounded-md text-sm font-medium focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-theme ${isDark ? 'border-gray-600 text-gray-300 bg-gray-700 hover:bg-gray-600' : 'border-gray-300 text-gray-700 bg-white hover:bg-gray-50'}`}
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            disabled={isSaving}
            className="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-theme disabled:opacity-50"
            style={{ backgroundColor: 'var(--color-theme)' }}
          >
            <Save className="h-4 w-4 mr-2" />
            {isSaving ? 'Saving...' : 'Save Changes'}
          </button>
        </div>
      </div>
    </div>
  );
};

export default EditInvoiceModal;
