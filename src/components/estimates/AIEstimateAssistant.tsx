import { useState, useEffect } from 'react';
import { Sparkles, RefreshCw, Plus, Lightbulb, AlertCircle, Check, X } from 'lucide-react';
import { EstimateItem } from '../../types/estimates';

interface AIEstimateAssistantProps {
  projectType: string;
  onGenerateItems: (items: EstimateItem[]) => void;
  onClose: () => void;
}

const AIEstimateAssistant: React.FC<AIEstimateAssistantProps> = ({ 
  projectType, 
  onGenerateItems,
  onClose
}) => {
  const [isLoading, setIsLoading] = useState(false);
  const [generatedItems, setGeneratedItems] = useState<EstimateItem[]>([]);
  const [selectedItems, setSelectedItems] = useState<string[]>([]);
  const [projectDetails, setProjectDetails] = useState({
    type: projectType || '',
    size: '',
    quality: 'standard',
    location: '',
    additionalInfo: ''
  });
  const [suggestions, setSuggestions] = useState<string[]>([]);

  useEffect(() => {
    // Generate suggestions based on project type
    if (projectType) {
      if (projectType.toLowerCase().includes('deck')) {
        setSuggestions([
          'Include pressure-treated lumber for the framing',
          'Add composite decking for the surface',
          'Include railing system',
          'Add stairs (if applicable)',
          'Include concrete for footings'
        ]);
      } else if (projectType.toLowerCase().includes('kitchen')) {
        setSuggestions([
          'Include cabinets (specify grade)',
          'Add countertops (specify material)',
          'Include appliances',
          'Add backsplash',
          'Include plumbing fixtures'
        ]);
      } else if (projectType.toLowerCase().includes('bathroom')) {
        setSuggestions([
          'Include vanity and sink',
          'Add shower/tub',
          'Include toilet',
          'Add tile flooring',
          'Include plumbing fixtures'
        ]);
      } else {
        setSuggestions([
          'Include materials breakdown',
          'Add labor costs',
          'Include equipment rental',
          'Add permit fees',
          'Include cleanup and disposal'
        ]);
      }
    }
  }, [projectType]);

  const handleGenerateItems = () => {
    setIsLoading(true);
    
    // Simulate AI generation
    setTimeout(() => {
      const items: EstimateItem[] = [];
      
      if (projectDetails.type.toLowerCase().includes('deck')) {
        items.push(
          {
            id: `ai-item-${Date.now()}-1`,
            description: 'Pressure-treated lumber for framing (2x8, 2x10)',
            quantity: 120,
            unit: 'board feet',
            unitPrice: 3.75,
            totalPrice: 450,
            type: 'material'
          },
          {
            id: `ai-item-${Date.now()}-2`,
            description: 'Composite decking boards',
            quantity: 240,
            unit: 'sq ft',
            unitPrice: 8.50,
            totalPrice: 2040,
            type: 'material'
          },
          {
            id: `ai-item-${Date.now()}-3`,
            description: 'Railing system (posts, rails, balusters)',
            quantity: 40,
            unit: 'linear ft',
            unitPrice: 45,
            totalPrice: 1800,
            type: 'material'
          },
          {
            id: `ai-item-${Date.now()}-4`,
            description: 'Concrete for footings',
            quantity: 1.5,
            unit: 'cubic yards',
            unitPrice: 150,
            totalPrice: 225,
            type: 'material'
          },
          {
            id: `ai-item-${Date.now()}-5`,
            description: 'Hardware (joist hangers, screws, bolts)',
            quantity: 1,
            unit: 'lot',
            unitPrice: 350,
            totalPrice: 350,
            type: 'material'
          },
          {
            id: `ai-item-${Date.now()}-6`,
            description: 'Labor - Demolition and site prep',
            quantity: 8,
            unit: 'hours',
            unitPrice: 65,
            totalPrice: 520,
            type: 'labor'
          },
          {
            id: `ai-item-${Date.now()}-7`,
            description: 'Labor - Framing and construction',
            quantity: 24,
            unit: 'hours',
            unitPrice: 75,
            totalPrice: 1800,
            type: 'labor'
          },
          {
            id: `ai-item-${Date.now()}-8`,
            description: 'Labor - Finishing and cleanup',
            quantity: 8,
            unit: 'hours',
            unitPrice: 65,
            totalPrice: 520,
            type: 'labor'
          },
          {
            id: `ai-item-${Date.now()}-9`,
            description: 'Equipment rental',
            quantity: 2,
            unit: 'days',
            unitPrice: 125,
            totalPrice: 250,
            type: 'equipment'
          },
          {
            id: `ai-item-${Date.now()}-10`,
            description: 'Permit fees',
            quantity: 1,
            unit: 'each',
            unitPrice: 250,
            totalPrice: 250,
            type: 'other'
          }
        );
      } else if (projectDetails.type.toLowerCase().includes('kitchen')) {
        items.push(
          {
            id: `ai-item-${Date.now()}-1`,
            description: 'Kitchen cabinets (mid-grade)',
            quantity: 15,
            unit: 'linear ft',
            unitPrice: 350,
            totalPrice: 5250,
            type: 'material'
          },
          {
            id: `ai-item-${Date.now()}-2`,
            description: 'Quartz countertops',
            quantity: 30,
            unit: 'sq ft',
            unitPrice: 75,
            totalPrice: 2250,
            type: 'material'
          },
          {
            id: `ai-item-${Date.now()}-3`,
            description: 'Backsplash tile (ceramic)',
            quantity: 30,
            unit: 'sq ft',
            unitPrice: 15,
            totalPrice: 450,
            type: 'material'
          },
          {
            id: `ai-item-${Date.now()}-4`,
            description: 'Sink and faucet',
            quantity: 1,
            unit: 'set',
            unitPrice: 450,
            totalPrice: 450,
            type: 'material'
          },
          {
            id: `ai-item-${Date.now()}-5`,
            description: 'Appliance package (range, dishwasher, microwave)',
            quantity: 1,
            unit: 'set',
            unitPrice: 3500,
            totalPrice: 3500,
            type: 'material'
          },
          {
            id: `ai-item-${Date.now()}-6`,
            description: 'Labor - Cabinet installation',
            quantity: 16,
            unit: 'hours',
            unitPrice: 85,
            totalPrice: 1360,
            type: 'labor'
          },
          {
            id: `ai-item-${Date.now()}-7`,
            description: 'Labor - Countertop installation',
            quantity: 8,
            unit: 'hours',
            unitPrice: 85,
            totalPrice: 680,
            type: 'labor'
          },
          {
            id: `ai-item-${Date.now()}-8`,
            description: 'Labor - Backsplash installation',
            quantity: 6,
            unit: 'hours',
            unitPrice: 75,
            totalPrice: 450,
            type: 'labor'
          },
          {
            id: `ai-item-${Date.now()}-9`,
            description: 'Labor - Plumbing',
            quantity: 6,
            unit: 'hours',
            unitPrice: 95,
            totalPrice: 570,
            type: 'labor'
          },
          {
            id: `ai-item-${Date.now()}-10`,
            description: 'Labor - Electrical',
            quantity: 8,
            unit: 'hours',
            unitPrice: 95,
            totalPrice: 760,
            type: 'labor'
          },
          {
            id: `ai-item-${Date.now()}-11`,
            description: 'Permit fees',
            quantity: 1,
            unit: 'each',
            unitPrice: 350,
            totalPrice: 350,
            type: 'other'
          },
          {
            id: `ai-item-${Date.now()}-12`,
            description: 'Dumpster rental',
            quantity: 1,
            unit: 'week',
            unitPrice: 450,
            totalPrice: 450,
            type: 'equipment'
          }
        );
      } else if (projectDetails.type.toLowerCase().includes('bathroom')) {
        items.push(
          {
            id: `ai-item-${Date.now()}-1`,
            description: 'Vanity with sink',
            quantity: 1,
            unit: 'each',
            unitPrice: 850,
            totalPrice: 850,
            type: 'material'
          },
          {
            id: `ai-item-${Date.now()}-2`,
            description: 'Toilet',
            quantity: 1,
            unit: 'each',
            unitPrice: 350,
            totalPrice: 350,
            type: 'material'
          },
          {
            id: `ai-item-${Date.now()}-3`,
            description: 'Shower/tub unit',
            quantity: 1,
            unit: 'each',
            unitPrice: 1200,
            totalPrice: 1200,
            type: 'material'
          },
          {
            id: `ai-item-${Date.now()}-4`,
            description: 'Shower/tub faucet and trim',
            quantity: 1,
            unit: 'set',
            unitPrice: 450,
            totalPrice: 450,
            type: 'material'
          },
          {
            id: `ai-item-${Date.now()}-5`,
            description: 'Floor tile (porcelain)',
            quantity: 40,
            unit: 'sq ft',
            unitPrice: 12,
            totalPrice: 480,
            type: 'material'
          },
          {
            id: `ai-item-${Date.now()}-6`,
            description: 'Wall tile (ceramic)',
            quantity: 100,
            unit: 'sq ft',
            unitPrice: 10,
            totalPrice: 1000,
            type: 'material'
          },
          {
            id: `ai-item-${Date.now()}-7`,
            description: 'Labor - Demolition',
            quantity: 8,
            unit: 'hours',
            unitPrice: 65,
            totalPrice: 520,
            type: 'labor'
          },
          {
            id: `ai-item-${Date.now()}-8`,
            description: 'Labor - Plumbing',
            quantity: 12,
            unit: 'hours',
            unitPrice: 95,
            totalPrice: 1140,
            type: 'labor'
          },
          {
            id: `ai-item-${Date.now()}-9`,
            description: 'Labor - Tile installation',
            quantity: 16,
            unit: 'hours',
            unitPrice: 75,
            totalPrice: 1200,
            type: 'labor'
          },
          {
            id: `ai-item-${Date.now()}-10`,
            description: 'Labor - Fixture installation',
            quantity: 8,
            unit: 'hours',
            unitPrice: 85,
            totalPrice: 680,
            type: 'labor'
          },
          {
            id: `ai-item-${Date.now()}-11`,
            description: 'Permit fees',
            quantity: 1,
            unit: 'each',
            unitPrice: 250,
            totalPrice: 250,
            type: 'other'
          }
        );
      } else {
        // Generic items
        items.push(
          {
            id: `ai-item-${Date.now()}-1`,
            description: 'Materials',
            quantity: 1,
            unit: 'lot',
            unitPrice: 2500,
            totalPrice: 2500,
            type: 'material'
          },
          {
            id: `ai-item-${Date.now()}-2`,
            description: 'Labor',
            quantity: 40,
            unit: 'hours',
            unitPrice: 75,
            totalPrice: 3000,
            type: 'labor'
          },
          {
            id: `ai-item-${Date.now()}-3`,
            description: 'Equipment rental',
            quantity: 1,
            unit: 'week',
            unitPrice: 500,
            totalPrice: 500,
            type: 'equipment'
          },
          {
            id: `ai-item-${Date.now()}-4`,
            description: 'Permit fees',
            quantity: 1,
            unit: 'each',
            unitPrice: 250,
            totalPrice: 250,
            type: 'other'
          }
        );
      }
      
      setGeneratedItems(items);
      setSelectedItems(items.map(item => item.id));
      setIsLoading(false);
    }, 2000);
  };

  const handleToggleItem = (itemId: string) => {
    setSelectedItems(prev => 
      prev.includes(itemId)
        ? prev.filter(id => id !== itemId)
        : [...prev, itemId]
    );
  };

  const handleAddToEstimate = () => {
    const itemsToAdd = generatedItems.filter(item => selectedItems.includes(item.id));
    onGenerateItems(itemsToAdd);
  };

  const handleSelectAll = () => {
    setSelectedItems(generatedItems.map(item => item.id));
  };

  const handleDeselectAll = () => {
    setSelectedItems([]);
  };

  return (
    <div className="bg-white rounded-lg shadow-md">
      <div className="p-6 border-b border-gray-200 flex items-center justify-between">
        <div className="flex items-center">
          <Sparkles className="h-5 w-5 text-blue-500 mr-2" />
          <h3 className="text-lg font-medium text-gray-900">AI Estimate Assistant</h3>
        </div>
        <button
          onClick={onClose}
          className="text-gray-400 hover:text-gray-500"
        >
          <X className="h-5 w-5" />
        </button>
      </div>
      
      <div className="p-6">
        <div className="space-y-6">
          <div>
            <label className="block text-sm font-medium text-gray-700">Project Type</label>
            <input
              type="text"
              value={projectDetails.type}
              onChange={(e) => setProjectDetails({...projectDetails, type: e.target.value})}
              className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
              placeholder="e.g., Deck Installation, Kitchen Remodel"
            />
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700">Project Size</label>
              <input
                type="text"
                value={projectDetails.size}
                onChange={(e) => setProjectDetails({...projectDetails, size: e.target.value})}
                className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                placeholder="e.g., 200 sq ft, 10x12 ft"
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700">Quality Level</label>
              <select
                value={projectDetails.quality}
                onChange={(e) => setProjectDetails({...projectDetails, quality: e.target.value})}
                className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
              >
                <option value="economy">Economy</option>
                <option value="standard">Standard</option>
                <option value="premium">Premium</option>
                <option value="luxury">Luxury</option>
              </select>
            </div>
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700">Project Location</label>
            <input
              type="text"
              value={projectDetails.location}
              onChange={(e) => setProjectDetails({...projectDetails, location: e.target.value})}
              className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
              placeholder="e.g., New York, NY"
            />
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700">Additional Details</label>
            <textarea
              rows={3}
              value={projectDetails.additionalInfo}
              onChange={(e) => setProjectDetails({...projectDetails, additionalInfo: e.target.value})}
              className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
              placeholder="Any specific requirements or details about the project..."
            />
          </div>
          
          <button
            onClick={handleGenerateItems}
            disabled={isLoading || !projectDetails.type}
            className="w-full inline-flex items-center justify-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:bg-blue-300 disabled:cursor-not-allowed"
          >
            {isLoading ? (
              <>
                <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                Generating...
              </>
            ) : (
              <>
                <Sparkles className="h-4 w-4 mr-2" />
                Generate Line Items
              </>
            )}
          </button>
        </div>
        
        {suggestions.length > 0 && !generatedItems.length && (
          <div className="mt-6">
            <h4 className="text-sm font-medium text-gray-700 mb-2">Suggestions</h4>
            <div className="bg-blue-50 border border-blue-100 rounded-md p-4">
              <div className="flex items-start">
                <Lightbulb className="h-5 w-5 text-blue-500 mt-0.5 mr-2" />
                <div>
                  <p className="text-sm text-blue-800 mb-2">Consider including these items in your estimate:</p>
                  <ul className="text-sm text-blue-700 space-y-1 list-disc pl-5">
                    {suggestions.map((suggestion, index) => (
                      <li key={index}>{suggestion}</li>
                    ))}
                  </ul>
                </div>
              </div>
            </div>
          </div>
        )}
        
        {generatedItems.length > 0 && (
          <div className="mt-6">
            <div className="flex items-center justify-between mb-4">
              <h4 className="text-sm font-medium text-gray-700">AI Generated Items</h4>
              <div className="flex space-x-2">
                <button
                  onClick={handleSelectAll}
                  className="text-xs text-blue-600 hover:text-blue-800"
                >
                  Select All
                </button>
                <button
                  onClick={handleDeselectAll}
                  className="text-xs text-blue-600 hover:text-blue-800"
                >
                  Deselect All
                </button>
              </div>
            </div>
            
            <div className="border rounded-md divide-y divide-gray-200 max-h-96 overflow-y-auto">
              {generatedItems.map((item) => (
                <div 
                  key={item.id}
                  className={`p-3 flex items-start hover:bg-gray-50 ${
                    selectedItems.includes(item.id) ? 'bg-blue-50' : ''
                  }`}
                >
                  <input
                    type="checkbox"
                    checked={selectedItems.includes(item.id)}
                    onChange={() => handleToggleItem(item.id)}
                    className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded mt-1"
                  />
                  <div className="ml-3 flex-1">
                    <p className="text-sm font-medium text-gray-900">{item.description}</p>
                    <div className="mt-1 flex items-center text-xs text-gray-500">
                      <span className="mr-2">{item.quantity} {item.unit}</span>
                      <span className="mr-2">•</span>
                      <span>${item.unitPrice.toFixed(2)} per {item.unit}</span>
                    </div>
                  </div>
                  <div className="text-sm font-medium text-gray-900">
                    ${item.totalPrice.toFixed(2)}
                  </div>
                </div>
              ))}
            </div>
            
            <div className="mt-4 flex justify-between items-center">
              <div className="text-sm text-gray-500">
                {selectedItems.length} of {generatedItems.length} items selected
              </div>
              <button
                onClick={handleAddToEstimate}
                disabled={selectedItems.length === 0}
                className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:bg-blue-300 disabled:cursor-not-allowed"
              >
                <Plus className="h-4 w-4 mr-2" />
                Add to Estimate
              </button>
            </div>
            
            <div className="mt-4 bg-yellow-50 border border-yellow-100 rounded-md p-4">
              <div className="flex items-start">
                <AlertCircle className="h-5 w-5 text-yellow-500 mt-0.5 mr-2" />
                <div className="text-sm text-yellow-700">
                  <p className="font-medium text-yellow-800 mb-1">AI-Generated Content</p>
                  <p>These items are generated based on your project details and industry averages. Review and adjust quantities, prices, and descriptions as needed for your specific project.</p>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default AIEstimateAssistant;