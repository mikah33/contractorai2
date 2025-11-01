import React, { useState, useEffect } from 'react';
import { X, Send, Loader2, CheckCircle2, AlertCircle } from 'lucide-react';

interface MaterialRequestModalProps {
  onClose: () => void;
}

const WEBHOOK_URL = 'https://contractorai.app.n8n.cloud/webhook/423c81ec-2d2b-497e-872d-8ade013f7c9a';

const CALCULATOR_OPTIONS = [
  'Roofing',
  'HVAC',
  'Plumbing',
  'Electrical',
  'Concrete',
  'Painting',
  'Flooring',
  'Drywall',
  'Framing',
  'Insulation',
  'Siding',
  'Windows & Doors',
  'Cabinets',
  'Countertops',
  'Tile',
  'Landscaping',
  'Fencing',
  'Decking',
  'Solar',
  'Excavation',
  'Foundation',
  'Gutter',
  'Junk Removal',
  'Pavers',
  'Retaining Walls',
  'Veneer',
  'Other'
];

const UNIT_OPTIONS = [
  'sqft',
  'sq',
  'feet',
  'inches',
  'yards',
  'meters',
  'unit',
  'linear feet',
  'other'
];

const MaterialRequestModal: React.FC<MaterialRequestModalProps> = ({ onClose }) => {
  const [calculatorType, setCalculatorType] = useState('');
  const [materialName, setMaterialName] = useState('');
  const [price, setPrice] = useState('');
  const [unit, setUnit] = useState('sqft');
  const [customUnit, setCustomUnit] = useState('');
  const [feedback, setFeedback] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitStatus, setSubmitStatus] = useState<'idle' | 'success' | 'error'>('idle');
  const [errorMessage, setErrorMessage] = useState('');

  // Form validation
  const [errors, setErrors] = useState({
    calculatorType: '',
    materialName: '',
    price: '',
    unit: '',
    customUnit: ''
  });

  // Close modal on ESC key
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleEscape);
    return () => window.removeEventListener('keydown', handleEscape);
  }, [onClose]);

  // Auto-close modal after success
  useEffect(() => {
    if (submitStatus === 'success') {
      const timer = setTimeout(() => {
        onClose();
      }, 2000);
      return () => clearTimeout(timer);
    }
  }, [submitStatus, onClose]);

  const validateForm = (): boolean => {
    const newErrors = {
      calculatorType: '',
      materialName: '',
      price: '',
      unit: '',
      customUnit: ''
    };

    if (!calculatorType) {
      newErrors.calculatorType = 'Calculator type is required';
    }

    if (!materialName.trim()) {
      newErrors.materialName = 'Material name is required';
    } else if (materialName.trim().length < 2) {
      newErrors.materialName = 'Material name must be at least 2 characters';
    }

    if (!price) {
      newErrors.price = 'Price is required';
    } else if (parseFloat(price) <= 0) {
      newErrors.price = 'Price must be greater than 0';
    }

    if (!unit) {
      newErrors.unit = 'Unit of measurement is required';
    }

    if (unit === 'other' && !customUnit.trim()) {
      newErrors.customUnit = 'Please specify the unit of measurement';
    }

    setErrors(newErrors);
    return !Object.values(newErrors).some(error => error !== '');
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!validateForm()) return;

    setIsSubmitting(true);
    setSubmitStatus('idle');
    setErrorMessage('');

    const payload = {
      calculatorType,
      materialName: materialName.trim(),
      price: parseFloat(price),
      unitOfMeasurement: unit === 'other' ? customUnit.trim() : unit,
      feedback: feedback.trim() || undefined,
      timestamp: new Date().toISOString(),
      userAgent: navigator.userAgent
    };

    try {
      const response = await fetch(WEBHOOK_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        if (response.status === 429) {
          throw new Error('Too many requests. Please try again later.');
        }
        if (response.status >= 500) {
          throw new Error('Server error. Please try again.');
        }
        throw new Error('Failed to submit request.');
      }

      setSubmitStatus('success');

      // Reset form
      setCalculatorType('');
      setMaterialName('');
      setPrice('');
      setUnit('sqft');
      setCustomUnit('');
      setFeedback('');
    } catch (error) {
      console.error('Error submitting material request:', error);
      setSubmitStatus('error');
      setErrorMessage(error instanceof Error ? error.message : 'Failed to submit request. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black bg-opacity-50 backdrop-blur-sm">
      <div
        className="bg-white rounded-lg shadow-xl max-w-md w-full max-h-[90vh] overflow-y-auto"
        role="dialog"
        aria-modal="true"
        aria-labelledby="modal-title"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <div>
            <h2 id="modal-title" className="text-xl font-bold text-gray-900">
              Request Material to be Added
            </h2>
            <p className="text-sm text-gray-500 mt-1">
              Tell us what material you need
            </p>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 transition-colors"
            aria-label="Close modal"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-6 space-y-5">
          {/* Calculator Type Dropdown */}
          <div>
            <label htmlFor="calculatorType" className="block text-sm font-medium text-gray-700 mb-2">
              Which Calculator? *
            </label>
            <select
              id="calculatorType"
              value={calculatorType}
              onChange={(e) => setCalculatorType(e.target.value)}
              className={`w-full px-4 py-2 border rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
                errors.calculatorType ? 'border-red-500' : 'border-gray-300'
              }`}
              aria-required="true"
              aria-invalid={!!errors.calculatorType}
              aria-describedby={errors.calculatorType ? 'calculator-error' : undefined}
            >
              <option value="">-- Select a calculator --</option>
              {CALCULATOR_OPTIONS.map(option => (
                <option key={option} value={option}>
                  {option}
                </option>
              ))}
            </select>
            {errors.calculatorType && (
              <p id="calculator-error" className="mt-1 text-sm text-red-600">
                {errors.calculatorType}
              </p>
            )}
          </div>

          {/* Material Name */}
          <div>
            <label htmlFor="materialName" className="block text-sm font-medium text-gray-700 mb-2">
              Material Name *
            </label>
            <input
              id="materialName"
              type="text"
              value={materialName}
              onChange={(e) => setMaterialName(e.target.value)}
              placeholder="e.g., Premium Grade Shingles"
              className={`w-full px-4 py-2 border rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
                errors.materialName ? 'border-red-500' : 'border-gray-300'
              }`}
              aria-required="true"
              aria-invalid={!!errors.materialName}
              aria-describedby={errors.materialName ? 'name-error' : undefined}
            />
            {errors.materialName && (
              <p id="name-error" className="mt-1 text-sm text-red-600">
                {errors.materialName}
              </p>
            )}
          </div>

          {/* Price and Unit */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label htmlFor="price" className="block text-sm font-medium text-gray-700 mb-2">
                Price *
              </label>
              <div className="relative">
                <span className="absolute left-3 top-2 text-gray-500">$</span>
                <input
                  id="price"
                  type="number"
                  value={price}
                  onChange={(e) => setPrice(e.target.value)}
                  placeholder="0.00"
                  min="0.01"
                  step="0.01"
                  className={`w-full pl-7 pr-4 py-2 border rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
                    errors.price ? 'border-red-500' : 'border-gray-300'
                  }`}
                  aria-required="true"
                  aria-invalid={!!errors.price}
                  aria-describedby={errors.price ? 'price-error' : undefined}
                />
              </div>
              {errors.price && (
                <p id="price-error" className="mt-1 text-sm text-red-600">
                  {errors.price}
                </p>
              )}
            </div>

            <div>
              <label htmlFor="unit" className="block text-sm font-medium text-gray-700 mb-2">
                Unit *
              </label>
              <select
                id="unit"
                value={unit}
                onChange={(e) => setUnit(e.target.value)}
                className={`w-full px-4 py-2 border rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
                  errors.unit ? 'border-red-500' : 'border-gray-300'
                }`}
                aria-required="true"
              >
                {UNIT_OPTIONS.map(option => (
                  <option key={option} value={option}>
                    {option}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Custom Unit Input - Shows when "other" is selected */}
          {unit === 'other' && (
            <div className="bg-blue-50 border border-blue-200 rounded-md p-4">
              <label htmlFor="customUnit" className="block text-sm font-medium text-gray-700 mb-2">
                Specify Unit of Measurement *
              </label>
              <input
                id="customUnit"
                type="text"
                value={customUnit}
                onChange={(e) => setCustomUnit(e.target.value)}
                placeholder="e.g., gallons, pounds, bundles"
                className={`w-full px-4 py-2 border rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
                  errors.customUnit ? 'border-red-500' : 'border-gray-300'
                }`}
                aria-required="true"
                aria-invalid={!!errors.customUnit}
                aria-describedby={errors.customUnit ? 'custom-unit-error' : undefined}
              />
              {errors.customUnit && (
                <p id="custom-unit-error" className="mt-1 text-sm text-red-600">
                  {errors.customUnit}
                </p>
              )}
            </div>
          )}

          {/* Feedback */}
          <div>
            <label htmlFor="feedback" className="block text-sm font-medium text-gray-700 mb-2">
              Feedback (optional)
            </label>
            <textarea
              id="feedback"
              value={feedback}
              onChange={(e) => setFeedback(e.target.value)}
              placeholder="Any additional details about this material..."
              rows={3}
              maxLength={500}
              className="w-full px-4 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
            />
            <p className="mt-1 text-xs text-gray-500 text-right">
              {feedback.length}/500 characters
            </p>
          </div>

          {/* Error Message */}
          {submitStatus === 'error' && errorMessage && (
            <div className="flex items-start gap-2 p-3 bg-red-50 border border-red-200 rounded-md">
              <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
              <p className="text-sm text-red-700">{errorMessage}</p>
            </div>
          )}

          {/* Success Message */}
          {submitStatus === 'success' && (
            <div className="flex items-center gap-2 p-3 bg-green-50 border border-green-200 rounded-md">
              <CheckCircle2 className="w-5 h-5 text-green-600" />
              <p className="text-sm text-green-700">Request submitted successfully!</p>
            </div>
          )}

          {/* Actions */}
          <div className="flex gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-md hover:bg-gray-50 transition-colors"
              disabled={isSubmitting}
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting || submitStatus === 'success'}
              className="flex-1 px-4 py-2 bg-gradient-to-r from-blue-600 to-purple-600 text-white rounded-md hover:from-blue-700 hover:to-purple-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all flex items-center justify-center gap-2"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Submitting...
                </>
              ) : submitStatus === 'success' ? (
                <>
                  <CheckCircle2 className="w-4 h-4" />
                  Submitted
                </>
              ) : (
                <>
                  <Send className="w-4 h-4" />
                  Submit Request
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default MaterialRequestModal;
