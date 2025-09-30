import { useState } from 'react';
import { Info } from 'lucide-react';
import { Trade, Field } from '../../types';

interface ProjectSpecificationsProps {
  trade: Trade;
  specifications: Record<string, any>;
  onChange: (key: string, value: any) => void;
}

const ProjectSpecifications = ({ trade, specifications, onChange }: ProjectSpecificationsProps) => {
  const [activeTooltip, setActiveTooltip] = useState<string | null>(null);
  
  const toggleTooltip = (fieldId: string) => {
    setActiveTooltip(activeTooltip === fieldId ? null : fieldId);
  };
  
  const renderField = (field: Field) => {
    const value = specifications[field.id] || '';
    
    switch (field.type) {
      case 'number':
        return (
          <div className="relative">
            <input
              type="number"
              id={field.id}
              value={value}
              onChange={(e) => onChange(field.id, e.target.value)}
              className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 text-sm"
              placeholder={field.placeholder}
              min={field.min}
              max={field.max}
              required={field.required}
            />
            {field.unit && (
              <div className="absolute inset-y-0 right-0 flex items-center pr-3 pointer-events-none">
                <span className="text-gray-500 text-sm">{field.unit}</span>
              </div>
            )}
          </div>
        );
        
      case 'select':
        return (
          <select
            id={field.id}
            value={value}
            onChange={(e) => onChange(field.id, e.target.value)}
            className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 text-sm"
            required={field.required}
          >
            <option value="">Select {field.label}</option>
            {field.options?.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        );
        
      case 'radio':
        return (
          <div className="space-y-2">
            {field.options?.map((option) => (
              <div key={option.value} className="flex items-center">
                <input
                  type="radio"
                  id={`${field.id}-${option.value}`}
                  name={field.id}
                  value={option.value}
                  checked={value === option.value}
                  onChange={() => onChange(field.id, option.value)}
                  className="h-4 w-4 text-blue-600 focus:ring-blue-500"
                />
                <label htmlFor={`${field.id}-${option.value}`} className="ml-2 text-sm text-gray-700">
                  {option.label}
                </label>
              </div>
            ))}
          </div>
        );
        
      case 'checkbox':
        return (
          <div className="flex items-center">
            <input
              type="checkbox"
              id={field.id}
              checked={!!value}
              onChange={(e) => onChange(field.id, e.target.checked)}
              className="h-4 w-4 text-blue-600 focus:ring-blue-500 rounded"
            />
            <label htmlFor={field.id} className="ml-2 text-sm text-gray-700">
              {field.checkboxLabel || field.label}
            </label>
          </div>
        );
        
      default:
        return (
          <input
            type="text"
            id={field.id}
            value={value}
            onChange={(e) => onChange(field.id, e.target.value)}
            className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 text-sm"
            placeholder={field.placeholder}
            required={field.required}
          />
        );
    }
  };
  
  return (
    <div className="space-y-4">
      {trade.requiredFields.map((field) => (
        <div key={field.id} className="space-y-1">
          <div className="flex items-center justify-between">
            <label htmlFor={field.id} className="block text-sm font-medium text-gray-700">
              {field.label} {field.required && <span className="text-red-600">*</span>}
            </label>
            {field.helpText && (
              <div className="relative">
                <button
                  type="button"
                  onClick={() => toggleTooltip(field.id)}
                  className="flex items-center text-gray-400 hover:text-gray-500"
                >
                  <Info className="h-4 w-4" />
                </button>
                {activeTooltip === field.id && (
                  <div className="absolute right-0 mt-2 w-48 p-2 bg-white rounded-md shadow-lg z-10 text-xs text-gray-600 border border-gray-200">
                    {field.helpText}
                  </div>
                )}
              </div>
            )}
          </div>
          {renderField(field)}
        </div>
      ))}
      
      {trade.optionalFields && trade.optionalFields.length > 0 && (
        <>
          <div className="pt-2 border-t border-gray-200 mt-4">
            <p className="text-sm font-medium text-gray-700 mb-3">Additional Options</p>
            {trade.optionalFields.map((field) => (
              <div key={field.id} className="space-y-1 mb-4">
                <div className="flex items-center justify-between">
                  <label htmlFor={field.id} className="block text-sm font-medium text-gray-700">
                    {field.label}
                  </label>
                  {field.helpText && (
                    <div className="relative">
                      <button
                        type="button"
                        onClick={() => toggleTooltip(field.id)}
                        className="flex items-center text-gray-400 hover:text-gray-500"
                      >
                        <Info className="h-4 w-4" />
                      </button>
                      {activeTooltip === field.id && (
                        <div className="absolute right-0 mt-2 w-48 p-2 bg-white rounded-md shadow-lg z-10 text-xs text-gray-600 border border-gray-200">
                          {field.helpText}
                        </div>
                      )}
                    </div>
                  )}
                </div>
                {renderField(field)}
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  );
};

export default ProjectSpecifications;