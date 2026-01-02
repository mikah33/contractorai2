import React, { useState, useEffect } from 'react';
import { useFinanceStore } from '../../stores/financeStoreSupabase';
import { FileText, DollarSign, Calendar, CheckCircle, Clock, AlertCircle, History, Trash2 } from 'lucide-react';
import type { InvoicePayment } from '../../stores/financeStoreSupabase';

export default function InvoiceManager() {
  const { invoices, fetchInvoices, recordInvoicePayment, fetchInvoicePayments, deleteInvoice, isLoading } = useFinanceStore();
  const [selectedInvoice, setSelectedInvoice] = useState<string | null>(null);
  const [paymentAmount, setPaymentAmount] = useState<string>('');
  const [paymentDate, setPaymentDate] = useState<string>(new Date().toISOString().split('T')[0]);
  const [paymentMethod, setPaymentMethod] = useState<'cash' | 'check' | 'credit_card' | 'bank_transfer' | 'other'>('cash');
  const [referenceNumber, setReferenceNumber] = useState<string>('');
  const [paymentNotes, setPaymentNotes] = useState<string>('');
  const [paymentHistory, setPaymentHistory] = useState<InvoicePayment[]>([]);
  const [showHistory, setShowHistory] = useState<string | null>(null);

  useEffect(() => {
    fetchInvoices();
  }, [fetchInvoices]);

  const handlePayment = async (invoiceId: string) => {
    const amount = parseFloat(paymentAmount);
    if (isNaN(amount) || amount <= 0) {
      alert('Please enter a valid payment amount');
      return;
    }

    await recordInvoicePayment(invoiceId, {
      amount,
      paymentDate,
      paymentMethod,
      referenceNumber: referenceNumber || undefined,
      notes: paymentNotes || undefined
    });

    setSelectedInvoice(null);
    setPaymentAmount('');
    setPaymentDate(new Date().toISOString().split('T')[0]);
    setPaymentMethod('cash');
    setReferenceNumber('');
    setPaymentNotes('');
  };

  const handleViewHistory = async (invoiceId: string) => {
    const history = await fetchInvoicePayments(invoiceId);
    setPaymentHistory(history);
    setShowHistory(invoiceId);
  };

  const handleDeleteInvoice = async (invoiceId: string) => {
    if (window.confirm('Are you sure you want to delete this invoice? This action cannot be undone.')) {
      await deleteInvoice(invoiceId);
    }
  };

  const getStatusBadge = (status: string) => {
    const statusConfig = {
      draft: { color: 'bg-gray-100 text-gray-800', icon: FileText },
      sent: { color: 'bg-blue-100 text-blue-800', icon: Clock },
      outstanding: { color: 'bg-yellow-100 text-yellow-800', icon: AlertCircle },
      partial: { color: 'bg-orange-100 text-orange-800', icon: DollarSign },
      paid: { color: 'bg-green-100 text-green-800', icon: CheckCircle },
      overdue: { color: 'bg-red-100 text-red-800', icon: AlertCircle }
    };

    const config = statusConfig[status as keyof typeof statusConfig] || statusConfig.draft;
    const Icon = config.icon;

    return (
      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${config.color}`}>
        <Icon className="w-3 h-3 mr-1" />
        {status.charAt(0).toUpperCase() + status.slice(1)}
      </span>
    );
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold text-gray-900">Invoice Management</h2>
      </div>

      {isLoading ? (
        <div className="flex justify-center items-center h-64">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
        </div>
      ) : invoices.length === 0 ? (
        <div className="text-center py-12 bg-white rounded-lg shadow">
          <FileText className="mx-auto h-12 w-12 text-gray-400" />
          <h3 className="mt-2 text-sm font-medium text-gray-900">No invoices</h3>
          <p className="mt-1 text-sm text-gray-500">
            Convert an approved estimate to an invoice to get started.
          </p>
        </div>
      ) : (
        <div className="bg-white shadow overflow-hidden sm:rounded-lg overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                  Invoice #
                </th>
                <th className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                  Status
                </th>
                <th className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                  Total
                </th>
                <th className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                  Balance
                </th>
                <th className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {invoices.map((invoice) => (
                <tr key={invoice.id} className="hover:bg-gray-50">
                  <td className="px-3 py-4 text-sm font-medium text-gray-900">
                    {invoice.invoiceNumber || invoice.id.slice(0, 8)}
                  </td>
                  <td className="px-3 py-4">
                    {getStatusBadge(invoice.status)}
                  </td>
                  <td className="px-3 py-4 text-sm text-gray-900">
                    ${invoice.totalAmount.toLocaleString()}
                  </td>
                  <td className="px-3 py-4 text-sm font-medium text-orange-600">
                    ${invoice.balance.toLocaleString()}
                  </td>
                  <td className="px-2 py-3 text-sm">
                    <div className="flex flex-col gap-1.5 min-w-[140px]">
                      {invoice.status !== 'paid' && (
                        <button
                          onClick={() => setSelectedInvoice(invoice.id)}
                          className="w-full px-2 py-1 text-xs bg-blue-600 text-white rounded hover:bg-blue-700 font-medium"
                        >
                          Pay
                        </button>
                      )}
                      {invoice.paidAmount > 0 && (
                        <button
                          onClick={() => handleViewHistory(invoice.id)}
                          className="w-full px-2 py-1 text-xs bg-green-600 text-white rounded hover:bg-green-700"
                        >
                          History
                        </button>
                      )}
                      <button
                        onClick={() => handleDeleteInvoice(invoice.id)}
                        className="w-full px-2 py-1 text-xs bg-red-600 text-white rounded hover:bg-red-700"
                      >
                        Delete
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Payment Modal */}
      {selectedInvoice && (
        <div className="fixed inset-0 bg-gray-500 bg-opacity-75 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-md w-full">
            <h3 className="text-lg font-medium text-gray-900 mb-4">Record Payment</h3>

            {(() => {
              const invoice = invoices.find(inv => inv.id === selectedInvoice);
              return invoice ? (
                <div className="space-y-4">
                  <div>
                    <p className="text-sm text-gray-500">Invoice: {invoice.invoiceNumber}</p>
                    <p className="text-sm text-gray-500">Total: ${invoice.totalAmount.toLocaleString()}</p>
                    <p className="text-sm text-gray-500">Paid: ${invoice.paidAmount.toLocaleString()}</p>
                    <p className="text-sm font-medium text-orange-600">Balance: ${invoice.balance.toLocaleString()}</p>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Payment Amount
                    </label>
                    <div className="relative">
                      <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                        <DollarSign className="h-5 w-5 text-gray-400" />
                      </div>
                      <input
                        type="number"
                        step="0.01"
                        value={paymentAmount}
                        onChange={(e) => setPaymentAmount(e.target.value)}
                        className="block w-full pl-10 pr-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                        placeholder="0.00"
                        max={invoice.balance}
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Payment Date
                    </label>
                    <div className="relative">
                      <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                        <Calendar className="h-5 w-5 text-gray-400" />
                      </div>
                      <input
                        type="date"
                        value={paymentDate}
                        onChange={(e) => setPaymentDate(e.target.value)}
                        className="block w-full pl-10 pr-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Payment Method
                    </label>
                    <select
                      value={paymentMethod}
                      onChange={(e) => setPaymentMethod(e.target.value as any)}
                      className="block w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                    >
                      <option value="cash">Cash</option>
                      <option value="check">Check</option>
                      <option value="credit_card">Credit Card</option>
                      <option value="bank_transfer">Bank Transfer</option>
                      <option value="other">Other</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Reference Number (Optional)
                    </label>
                    <input
                      type="text"
                      value={referenceNumber}
                      onChange={(e) => setReferenceNumber(e.target.value)}
                      className="block w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                      placeholder="Check #, Transaction ID, etc."
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Notes (Optional)
                    </label>
                    <textarea
                      value={paymentNotes}
                      onChange={(e) => setPaymentNotes(e.target.value)}
                      rows={2}
                      className="block w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                      placeholder="Payment notes..."
                    />
                  </div>

                  <div className="flex justify-end space-x-3">
                    <button
                      onClick={() => {
                        setSelectedInvoice(null);
                        setPaymentAmount('');
                        setPaymentDate(new Date().toISOString().split('T')[0]);
                        setPaymentMethod('cash');
                        setReferenceNumber('');
                        setPaymentNotes('');
                      }}
                      className="px-4 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 hover:bg-gray-50"
                    >
                      Cancel
                    </button>
                    <button
                      onClick={() => handlePayment(selectedInvoice)}
                      className="px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700"
                    >
                      Record Payment
                    </button>
                  </div>
                </div>
              ) : null;
            })()}
          </div>
        </div>
      )}

      {/* Payment History Modal */}
      {showHistory && (
        <div className="fixed inset-0 bg-gray-500 bg-opacity-75 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-2xl w-full max-h-[80vh] overflow-y-auto">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-medium text-gray-900">Payment History</h3>
              <button
                onClick={() => setShowHistory(null)}
                className="text-gray-400 hover:text-gray-600"
              >
                ×
              </button>
            </div>

            {(() => {
              const invoice = invoices.find(inv => inv.id === showHistory);
              return invoice ? (
                <div className="space-y-4">
                  <div className="bg-gray-50 p-4 rounded-md">
                    <p className="text-sm font-medium text-gray-700">Invoice: {invoice.invoiceNumber}</p>
                    <p className="text-sm text-gray-600">Total: ${invoice.totalAmount.toLocaleString()}</p>
                    <p className="text-sm text-green-600">Total Paid: ${invoice.paidAmount.toLocaleString()}</p>
                    <p className="text-sm text-orange-600">Balance: ${invoice.balance.toLocaleString()}</p>
                  </div>

                  {paymentHistory.length > 0 ? (
                    <div className="overflow-x-auto">
                      <table className="min-w-full divide-y divide-gray-200">
                        <thead className="bg-gray-50">
                          <tr>
                            <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Date</th>
                            <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Amount</th>
                            <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Method</th>
                            <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Reference</th>
                            <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Notes</th>
                          </tr>
                        </thead>
                        <tbody className="bg-white divide-y divide-gray-200">
                          {paymentHistory.map((payment) => (
                            <tr key={payment.id}>
                              <td className="px-4 py-3 text-sm text-gray-900">
                                {new Date(payment.paymentDate).toLocaleDateString()}
                              </td>
                              <td className="px-4 py-3 text-sm font-medium text-green-600">
                                ${payment.amount.toLocaleString()}
                              </td>
                              <td className="px-4 py-3 text-sm text-gray-600 capitalize">
                                {payment.paymentMethod?.replace('_', ' ') || '-'}
                              </td>
                              <td className="px-4 py-3 text-sm text-gray-600">
                                {payment.referenceNumber || '-'}
                              </td>
                              <td className="px-4 py-3 text-sm text-gray-600">
                                {payment.notes || '-'}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  ) : (
                    <p className="text-center text-gray-500 py-4">No payment history found</p>
                  )}

                  <div className="flex justify-end">
                    <button
                      onClick={() => setShowHistory(null)}
                      className="px-4 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 hover:bg-gray-50"
                    >
                      Close
                    </button>
                  </div>
                </div>
              ) : null
            })()}
          </div>
        </div>
      )}
    </div>
  );
}
