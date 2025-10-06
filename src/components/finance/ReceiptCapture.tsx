import { useState, useRef } from 'react';
import { Camera, Upload, X, Check, Edit, Tag, FileText, Loader } from 'lucide-react';
import { supabase } from '../../lib/supabase';

interface ReceiptData {
  id: string;
  vendor: string;
  date: string;
  amount: number;
  category: string;
  projectId?: string;
  notes?: string;
  imageUrl?: string;
  status: 'pending' | 'processed' | 'verified';

  // Enhanced fields
  receiptNumber?: string;
  taxAmount?: number;
  subtotal?: number;
  supplierAddress?: string;
  supplierPhone?: string;
}

interface LineItem {
  description: string;
  quantity: number;
  unitPrice: number;
  totalAmount: number;
}

interface ReceiptCaptureProps {
  onSave: (receipt: ReceiptData) => void;
  projects: { id: string; name: string }[];
}

const ReceiptCapture: React.FC<ReceiptCaptureProps> = ({ onSave, projects }) => {
  const [captureMode, setCaptureMode] = useState<'camera' | 'upload' | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [ocrStatus, setOcrStatus] = useState<'idle' | 'processing' | 'complete' | 'error'>('idle');
  const [lineItems, setLineItems] = useState<LineItem[]>([]);
  const [receiptData, setReceiptData] = useState<Partial<ReceiptData>>({
    vendor: '',
    date: new Date().toISOString().split('T')[0],
    amount: 0,
    category: '',
    projectId: '',
    notes: '',
    status: 'pending',
    receiptNumber: '',
    taxAmount: 0,
    subtotal: 0,
    supplierAddress: '',
    supplierPhone: ''
  });
  
  const fileInputRef = useRef<HTMLInputElement>(null);
  const cameraInputRef = useRef<HTMLInputElement>(null);

  const categories = [
    'Materials', 'Labor', 'Subcontractors', 'Equipment Rental', 
    'Tools', 'Permits', 'Office Supplies', 'Travel', 'Other'
  ];

  const handleCameraCapture = () => {
    setCaptureMode('camera');
    setTimeout(() => {
      if (cameraInputRef.current) {
        cameraInputRef.current.click();
      }
    }, 100);
  };

  const handleFileUpload = () => {
    setCaptureMode('upload');
    setTimeout(() => {
      if (fileInputRef.current) {
        fileInputRef.current.click();
      }
    }, 100);
  };

  const processImage = async (file: File) => {
    // Create a preview URL immediately
    const url = URL.createObjectURL(file);
    setPreviewUrl(url);

    // Let user start editing right away!
    setIsEditing(true);
    setOcrStatus('processing');

    // Process OCR in the background
    processOCRInBackground(file);
  };

  const processOCRInBackground = async (file: File) => {
    try {
      // Get current user ID for folder structure
      const { data: { user } } = await supabase.auth.getUser();
      const userId = user?.id || '00000000-0000-0000-0000-000000000000'; // Fallback for dev

      // 1. Upload image to user-specific folder
      // Sanitize filename - remove spaces and special characters
      const sanitizedFileName = file.name
        .replace(/\s+/g, '_')  // Replace spaces with underscores
        .replace(/[^a-zA-Z0-9._-]/g, '');  // Remove special characters

      const fileName = `${userId}/${Date.now()}_${sanitizedFileName}`;

      console.log('📤 Uploading to Supabase Storage...');
      console.log('User ID:', userId);
      console.log('File path:', fileName);

      const { data: uploadData, error: uploadError } = await supabase.storage
        .from('receipt-images')
        .upload(fileName, file);

      if (uploadError) {
        console.error('❌ Upload error:', uploadError);
        console.error('Full error details:', JSON.stringify(uploadError, null, 2));

        // Show user-friendly error
        if (uploadError.message?.includes('not found')) {
          alert('⚠️ Storage bucket not set up. Please create the "receipt-images" bucket in Supabase Dashboard.');
        } else if (uploadError.message?.includes('policy')) {
          alert('⚠️ Permission error. Please check storage bucket policies.');
        } else {
          alert(`Upload failed: ${uploadError.message}`);
        }

        throw uploadError;
      }

      console.log('✅ Upload successful:', uploadData);

      // 2. Get public URL
      const { data: { publicUrl } } = supabase.storage
        .from('receipt-images')
        .getPublicUrl(fileName);

      console.log('Image uploaded to:', publicUrl);

      // Save imageUrl immediately
      setReceiptData(prev => ({ ...prev, imageUrl: publicUrl }));

      // 3. Call Edge Function to process receipt with OCR (runs in background)
      const { data: ocrData, error: ocrError } = await supabase.functions.invoke('process-receipt', {
        body: {
          imageUrl: publicUrl,
          useAPI: true
        }
      });

      if (ocrError) {
        console.error('OCR error:', ocrError);
        setOcrStatus('error');
        return;
      }

      console.log('OCR Result:', ocrData);

      // Store line items if available
      if (ocrData.lineItems && ocrData.lineItems.length > 0) {
        setLineItems(ocrData.lineItems);
      }

      // 4. Auto-fill form with ALL OCR results (updates form in background)
      setReceiptData(prev => ({
        ...prev,
        vendor: ocrData.vendor || prev.vendor,
        date: ocrData.date || prev.date,
        amount: ocrData.amount || prev.amount,
        notes: ocrData.confidence?.overall
          ? `Auto-extracted (${Math.round(ocrData.confidence.overall * 100)}% confidence)${ocrData.receiptNumber ? `\nReceipt #: ${ocrData.receiptNumber}` : ''}`
          : prev.notes,
        imageUrl: publicUrl,

        // Enhanced fields
        receiptNumber: ocrData.receiptNumber || prev.receiptNumber,
        taxAmount: ocrData.taxAmount || prev.taxAmount,
        subtotal: ocrData.subtotal || prev.subtotal,
        supplierAddress: ocrData.supplierAddress || prev.supplierAddress,
        supplierPhone: ocrData.supplierPhone || prev.supplierPhone
      }));

      setOcrStatus('complete');

    } catch (error) {
      console.error('Error processing receipt:', error);
      setOcrStatus('error');
      console.log('OCR failed - user can enter data manually');
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      processImage(file);
    }
  };

  const handleSave = () => {
    if (receiptData.vendor && receiptData.date && receiptData.amount && receiptData.category) {
      onSave({
        id: Date.now().toString(),
        vendor: receiptData.vendor!,
        date: receiptData.date!,
        amount: receiptData.amount!,
        category: receiptData.category!,
        projectId: receiptData.projectId,
        notes: receiptData.notes,
        imageUrl: receiptData.imageUrl || undefined,
        status: 'verified',
        metadata: {
          receiptNumber: receiptData.receiptNumber,
          taxAmount: receiptData.taxAmount,
          subtotal: receiptData.subtotal,
          supplierAddress: receiptData.supplierAddress,
          supplierPhone: receiptData.supplierPhone,
          lineItems: lineItems
        }
      });
      
      // Reset state
      setPreviewUrl(null);
      setCaptureMode(null);
      setIsEditing(false);
      setReceiptData({
        vendor: '',
        date: new Date().toISOString().split('T')[0],
        amount: 0,
        category: '',
        projectId: '',
        notes: '',
        status: 'pending'
      });
    }
  };

  const handleCancel = () => {
    if (previewUrl) {
      URL.revokeObjectURL(previewUrl);
    }
    setPreviewUrl(null);
    setCaptureMode(null);
    setIsEditing(false);
  };

  return (
    <div className="bg-white rounded-lg shadow-md p-6">
      <h3 className="text-lg font-medium text-gray-900 mb-4">Receipt Capture</h3>
      
      {!previewUrl ? (
        <div className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <button
              onClick={handleCameraCapture}
              className="flex items-center justify-center p-6 border-2 border-dashed border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
            >
              <div className="text-center">
                <Camera className="mx-auto h-12 w-12 text-gray-400" />
                <span className="mt-2 block text-sm font-medium text-gray-900">Take Photo</span>
                <span className="mt-1 block text-xs text-gray-500">Use your camera to capture a receipt</span>
              </div>
            </button>
            
            <button
              onClick={handleFileUpload}
              className="flex items-center justify-center p-6 border-2 border-dashed border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
            >
              <div className="text-center">
                <Upload className="mx-auto h-12 w-12 text-gray-400" />
                <span className="mt-2 block text-sm font-medium text-gray-900">Upload Image</span>
                <span className="mt-1 block text-xs text-gray-500">Select a receipt image from your device</span>
              </div>
            </button>
          </div>
          
          <input
            type="file"
            ref={fileInputRef}
            accept="image/*"
            onChange={handleFileChange}
            className="hidden"
          />
          
          <input
            type="file"
            ref={cameraInputRef}
            accept="image/*"
            capture="environment"
            onChange={handleFileChange}
            className="hidden"
          />
        </div>
      ) : (
        <div className="space-y-6">
          <div className="flex items-start space-x-4">
            <div className="relative flex-shrink-0 w-32 h-40 bg-gray-100 rounded-md overflow-hidden">
              <img 
                src={previewUrl} 
                alt="Receipt preview" 
                className="w-full h-full object-cover"
              />
              {isProcessing && (
                <div className="absolute inset-0 bg-black bg-opacity-50 flex items-center justify-center">
                  <Loader className="w-8 h-8 text-white animate-spin" />
                </div>
              )}
            </div>
            
            <div className="flex-1">
              <div className="space-y-4">
                {/* OCR Status Banner */}
                {ocrStatus !== 'idle' && (
                  <div className={`rounded-md p-3 ${
                    ocrStatus === 'processing' ? 'bg-blue-50 border border-blue-200' :
                    ocrStatus === 'complete' ? 'bg-green-50 border border-green-200' :
                    'bg-yellow-50 border border-yellow-200'
                  }`}>
                    <div className="flex items-center">
                      {ocrStatus === 'processing' && (
                        <>
                          <Loader className="w-4 h-4 text-blue-500 animate-spin mr-2" />
                          <span className="text-sm text-blue-700">
                            🤖 AI is extracting data... You can start entering info now!
                          </span>
                        </>
                      )}
                      {ocrStatus === 'complete' && (
                        <>
                          <Check className="w-4 h-4 text-green-500 mr-2" />
                          <span className="text-sm text-green-700">
                            ✅ Receipt data extracted! Fields auto-filled below.
                          </span>
                        </>
                      )}
                      {ocrStatus === 'error' && (
                        <span className="text-sm text-yellow-700">
                          ⚠️ OCR couldn't process - please enter manually
                        </span>
                      )}
                    </div>
                  </div>
                )}

                {/* Form Fields */}
                <div className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700">Vendor</label>
                      <div className="mt-1 relative rounded-md shadow-sm">
                        <input
                          type="text"
                          value={receiptData.vendor}
                          onChange={(e) => setReceiptData({...receiptData, vendor: e.target.value})}
                          disabled={!isEditing}
                          className="block w-full pr-10 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm border-gray-300 rounded-md disabled:bg-gray-50 disabled:text-gray-500"
                        />
                        {!isEditing && <Edit className="absolute right-3 top-2 h-4 w-4 text-gray-400" />}
                      </div>
                    </div>
                    
                    <div>
                      <label className="block text-sm font-medium text-gray-700">Date</label>
                      <div className="mt-1 relative rounded-md shadow-sm">
                        <input
                          type="date"
                          value={receiptData.date}
                          onChange={(e) => setReceiptData({...receiptData, date: e.target.value})}
                          disabled={!isEditing}
                          className="block w-full pr-10 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm border-gray-300 rounded-md disabled:bg-gray-50 disabled:text-gray-500"
                        />
                        {!isEditing && <Edit className="absolute right-3 top-2 h-4 w-4 text-gray-400" />}
                      </div>
                    </div>
                    
                    <div>
                      <label className="block text-sm font-medium text-gray-700">Amount ($)</label>
                      <div className="mt-1 relative rounded-md shadow-sm">
                        <input
                          type="number"
                          step="0.01"
                          value={receiptData.amount}
                          onChange={(e) => setReceiptData({...receiptData, amount: parseFloat(e.target.value)})}
                          disabled={!isEditing}
                          className="block w-full pr-10 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm border-gray-300 rounded-md disabled:bg-gray-50 disabled:text-gray-500"
                        />
                        {!isEditing && <Edit className="absolute right-3 top-2 h-4 w-4 text-gray-400" />}
                      </div>
                    </div>
                    
                    <div>
                      <label className="block text-sm font-medium text-gray-700">Category</label>
                      <div className="mt-1 relative rounded-md shadow-sm">
                        <select
                          value={receiptData.category}
                          onChange={(e) => setReceiptData({...receiptData, category: e.target.value})}
                          disabled={!isEditing}
                          className="block w-full pr-10 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm border-gray-300 rounded-md disabled:bg-gray-50 disabled:text-gray-500"
                        >
                          <option value="">Select category</option>
                          {categories.map(category => (
                            <option key={category} value={category}>{category}</option>
                          ))}
                        </select>
                        {!isEditing && <Edit className="absolute right-3 top-2 h-4 w-4 text-gray-400" />}
                      </div>
                    </div>
                  </div>

                  {/* Enhanced Fields - Phase 1 & 2 */}
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4 border-t pt-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700">Receipt #</label>
                      <input
                        type="text"
                        value={receiptData.receiptNumber || ''}
                        onChange={(e) => setReceiptData({...receiptData, receiptNumber: e.target.value})}
                        disabled={!isEditing}
                        className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 sm:text-sm disabled:bg-gray-50"
                        placeholder="Auto-filled"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700">Tax Amount</label>
                      <input
                        type="number"
                        step="0.01"
                        value={receiptData.taxAmount || 0}
                        onChange={(e) => setReceiptData({...receiptData, taxAmount: parseFloat(e.target.value)})}
                        disabled={!isEditing}
                        className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 sm:text-sm disabled:bg-gray-50"
                      />
                      <p className="text-xs text-gray-500 mt-1">Auto-calculated</p>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700">Subtotal</label>
                      <input
                        type="number"
                        step="0.01"
                        value={receiptData.subtotal || 0}
                        onChange={(e) => setReceiptData({...receiptData, subtotal: parseFloat(e.target.value)})}
                        disabled={!isEditing}
                        className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 sm:text-sm disabled:bg-gray-50"
                      />
                      <p className="text-xs text-gray-500 mt-1">Pre-tax amount</p>
                    </div>
                  </div>

                  {/* Supplier Details - Collapsible */}
                  {(receiptData.supplierAddress || receiptData.supplierPhone) && (
                    <details className="border-t pt-4">
                      <summary className="cursor-pointer text-sm font-medium text-gray-700 hover:text-gray-900">
                        📍 Supplier Details
                      </summary>
                      <div className="mt-3 space-y-3 pl-4">
                        {receiptData.supplierAddress && (
                          <div>
                            <label className="block text-xs font-medium text-gray-500">Address</label>
                            <p className="text-sm text-gray-700">{receiptData.supplierAddress}</p>
                          </div>
                        )}
                        {receiptData.supplierPhone && (
                          <div>
                            <label className="block text-xs font-medium text-gray-500">Phone</label>
                            <p className="text-sm text-gray-700">{receiptData.supplierPhone}</p>
                          </div>
                        )}
                      </div>
                    </details>
                  )}

                  {/* Line Items Display */}
                  {lineItems.length > 0 && (
                    <div className="border-t pt-4">
                      <h4 className="text-sm font-medium text-gray-700 mb-3">📦 Line Items ({lineItems.length})</h4>
                      <div className="bg-gray-50 rounded-md p-3 max-h-48 overflow-y-auto">
                        <div className="overflow-x-auto">
                          <table className="min-w-full text-xs">
                          <thead className="sticky top-0 bg-gray-100">
                            <tr>
                              <th className="text-left py-2 px-2 font-medium">Item</th>
                              <th className="text-right py-2 px-2 font-medium">Qty</th>
                              <th className="text-right py-2 px-2 font-medium">Price</th>
                              <th className="text-right py-2 px-2 font-medium">Total</th>
                            </tr>
                          </thead>
                          <tbody className="bg-white divide-y divide-gray-200">
                            {lineItems.map((item, idx) => (
                              <tr key={idx}>
                                <td className="py-2 px-2">{item.description}</td>
                                <td className="text-right py-2 px-2">{item.quantity}</td>
                                <td className="text-right py-2 px-2">${item.unitPrice.toFixed(2)}</td>
                                <td className="text-right py-2 px-2 font-medium">${item.totalAmount.toFixed(2)}</td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                        </div>
                      </div>
                      <p className="text-xs text-gray-500 mt-2">Individual items extracted from receipt</p>
                    </div>
                  )}

                  <div>
                    <label className="block text-sm font-medium text-gray-700">Project</label>
                    <div className="mt-1 relative rounded-md shadow-sm">
                      <select
                        value={receiptData.projectId || ''}
                        onChange={(e) => setReceiptData({...receiptData, projectId: e.target.value})}
                        disabled={!isEditing}
                        className="block w-full pr-10 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm border-gray-300 rounded-md disabled:bg-gray-50 disabled:text-gray-500"
                      >
                        <option value="">Select project (optional)</option>
                        <option value="revenue-tracker">📊 Revenue Tracker (General Business)</option>
                        {projects.filter(p => p.name !== 'Revenue Tracker').map(project => (
                          <option key={project.id} value={project.id}>{project.name}</option>
                        ))}
                      </select>
                      {!isEditing && <Edit className="absolute right-3 top-2 h-4 w-4 text-gray-400" />}
                    </div>
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Notes</label>
                    <div className="mt-1 relative rounded-md shadow-sm">
                      <textarea
                        value={receiptData.notes || ''}
                        onChange={(e) => setReceiptData({...receiptData, notes: e.target.value})}
                        disabled={!isEditing}
                        rows={2}
                        className="block w-full focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm border-gray-300 rounded-md disabled:bg-gray-50 disabled:text-gray-500"
                      />
                      {!isEditing && <Edit className="absolute right-3 top-2 h-4 w-4 text-gray-400" />}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
          
          <div className="flex justify-end space-x-3">
            <button
              type="button"
              onClick={handleCancel}
              className="inline-flex items-center px-4 py-2 border border-gray-300 shadow-sm text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
            >
              <X className="mr-2 h-4 w-4" />
              Cancel
            </button>
            
            {isEditing ? (
              <button
                type="button"
                onClick={handleSave}
                disabled={!receiptData.vendor || !receiptData.date || !receiptData.amount || !receiptData.category}
                className="inline-flex items-center px-4 py-2 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:bg-blue-300 disabled:cursor-not-allowed"
              >
                <Check className="mr-2 h-4 w-4" />
                Save Receipt
              </button>
            ) : (
              <button
                type="button"
                onClick={() => setIsEditing(true)}
                className="inline-flex items-center px-4 py-2 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
              >
                <Edit className="mr-2 h-4 w-4" />
                Edit Details
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default ReceiptCapture;