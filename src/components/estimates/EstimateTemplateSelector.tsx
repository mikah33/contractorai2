import { useState } from 'react';
import { Layout, FileText, Check, Star } from 'lucide-react';
import { EstimateTemplate } from '../../types/estimates';

interface EstimateTemplateSelectorProps {
  onSelectTemplate: (template: EstimateTemplate) => void;
}

const EstimateTemplateSelector: React.FC<EstimateTemplateSelectorProps> = ({ onSelectTemplate }) => {
  const [selectedTemplateId, setSelectedTemplateId] = useState<string | null>(null);

  // Mock templates - in a real app, these would come from an API
  const templates: EstimateTemplate[] = [
    {
      id: 'template-1',
      name: 'Professional',
      description: 'Clean, modern design with detailed line items',
      previewImage: 'https://images.pexels.com/photos/6814581/pexels-photo-6814581.jpeg?auto=compress&cs=tinysrgb&w=1260&h=750&dpr=1',
      defaultPrimaryColor: '#3b82f6',
      defaultSecondaryColor: '#1e40af',
      defaultFontFamily: 'Inter, sans-serif',
      defaultTaxRate: 7.5,
      defaultTerms: 'This estimate is valid for 30 days from the date of issue. To accept this estimate, please sign below or contact us.',
      defaultNotes: 'All materials are guaranteed to be as specified. All work to be completed in a professional manner according to standard practices.',
      sections: ['header', 'clientInfo', 'lineItems', 'subtotal', 'tax', 'total', 'notes', 'terms', 'signature'],
      isPremium: false
    },
    {
      id: 'template-2',
      name: 'Detailed Contractor',
      description: 'Comprehensive template with project phases and materials breakdown',
      previewImage: 'https://images.pexels.com/photos/8961251/pexels-photo-8961251.jpeg?auto=compress&cs=tinysrgb&w=1260&h=750&dpr=1',
      defaultPrimaryColor: '#10b981',
      defaultSecondaryColor: '#065f46',
      defaultFontFamily: 'Roboto, sans-serif',
      defaultTaxRate: 7.5,
      defaultTerms: 'This estimate is valid for 30 days. A 50% deposit is required to begin work, with the balance due upon completion.',
      defaultNotes: 'All work to be completed according to local building codes. Any changes to the scope of work may result in additional charges.',
      sections: ['header', 'clientInfo', 'projectDetails', 'lineItems', 'materials', 'labor', 'subtotal', 'tax', 'total', 'notes', 'terms', 'signature'],
      isPremium: true
    },
    {
      id: 'template-3',
      name: 'Simple',
      description: 'Straightforward layout for quick estimates',
      previewImage: 'https://images.pexels.com/photos/8961252/pexels-photo-8961252.jpeg?auto=compress&cs=tinysrgb&w=1260&h=750&dpr=1',
      defaultPrimaryColor: '#6366f1',
      defaultSecondaryColor: '#4338ca',
      defaultFontFamily: 'Arial, sans-serif',
      defaultTaxRate: 7.5,
      defaultTerms: 'Valid for 30 days.',
      defaultNotes: '',
      sections: ['header', 'clientInfo', 'lineItems', 'subtotal', 'tax', 'total', 'terms'],
      isPremium: false
    },
    {
      id: 'template-4',
      name: 'Premium Proposal',
      description: 'High-end design with project timeline and detailed scope',
      previewImage: 'https://images.pexels.com/photos/8961253/pexels-photo-8961253.jpeg?auto=compress&cs=tinysrgb&w=1260&h=750&dpr=1',
      defaultPrimaryColor: '#f59e0b',
      defaultSecondaryColor: '#b45309',
      defaultFontFamily: 'Poppins, sans-serif',
      defaultTaxRate: 7.5,
      defaultTerms: 'This proposal is valid for 45 days. Payment schedule: 40% deposit, 30% at midpoint, 30% upon completion.',
      defaultNotes: 'All materials are subject to availability. Premium finishes may have extended lead times.',
      sections: ['header', 'clientInfo', 'projectDetails', 'scope', 'timeline', 'lineItems', 'materials', 'labor', 'subtotal', 'tax', 'total', 'notes', 'terms', 'signature'],
      isPremium: true
    }
  ];

  const handleSelectTemplate = (template: EstimateTemplate) => {
    setSelectedTemplateId(template.id);
    onSelectTemplate(template);
  };

  return (
    <div className="bg-white rounded-lg shadow">
      <div className="p-6 border-b border-gray-200">
        <h2 className="text-lg font-medium text-gray-900">Estimate Templates</h2>
      </div>
      <div className="p-6 space-y-4">
        {templates.map((template) => (
          <div
            key={template.id}
            onClick={() => handleSelectTemplate(template)}
            className={`cursor-pointer border rounded-lg transition-all ${
              selectedTemplateId === template.id
                ? 'border-blue-500 ring-2 ring-blue-200'
                : 'border-gray-200 hover:border-blue-300'
            }`}
          >
            <div className="relative">
              <div className="aspect-[16/9] w-full overflow-hidden rounded-t-lg bg-gray-100">
                {template.previewImage ? (
                  <img 
                    src={template.previewImage} 
                    alt={template.name} 
                    className="h-full w-full object-cover"
                  />
                ) : (
                  <div className="flex h-full items-center justify-center">
                    <Layout className="h-12 w-12 text-gray-400" />
                  </div>
                )}
              </div>
              
              {template.isPremium && (
                <div className="absolute top-2 right-2 bg-yellow-500 text-white text-xs font-bold px-2 py-1 rounded-full flex items-center">
                  <Star className="w-3 h-3 mr-1 fill-current" />
                  PREMIUM
                </div>
              )}
              
              {selectedTemplateId === template.id && (
                <div className="absolute top-2 left-2 bg-blue-500 text-white rounded-full p-1">
                  <Check className="w-4 h-4" />
                </div>
              )}
            </div>
            
            <div className="p-4">
              <h3 className="font-medium text-gray-900">{template.name}</h3>
              <p className="mt-1 text-sm text-gray-500">{template.description}</p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default EstimateTemplateSelector;