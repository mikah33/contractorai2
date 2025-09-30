import { useState, useRef } from 'react';
import { Camera, Upload, X, Check, Edit, Tag, FileText, Loader } from 'lucide-react';

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
  const [receiptData, setReceiptData] = useState<Partial<ReceiptData>>({
    vendor: '',
    date: new Date().toISOString().split('T')[0],
    amount: 0,
    category: '',
    projectId: '',
    notes: '',
    status: 'pending'
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
    setIsProcessing(true);
    
    // Create a preview URL
    const url = URL.createObjectURL(file);
    setPreviewUrl(url);
    
    // Just show the preview without auto-filling data
    // User will manually enter the receipt details
    setTimeout(() => {
      setIsProcessing(false);
      setIsEditing(true);
    }, 500); // Short delay just for UI feedback
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
        imageUrl: previewUrl || undefined,
        status: 'verified'
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
              {isProcessing ? (
                <div className="h-full flex flex-col items-center justify-center">
                  <Loader className="w-8 h-8 text-blue-500 animate-spin mb-2" />
                  <p className="text-sm text-gray-600">Processing receipt...</p>
                  <p className="text-xs text-gray-500">Extracting vendor, date, and amount</p>
                </div>
              ) : (
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
              )}
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