import { FileDown, DollarSign, Package, Hammer, Info, Truck, Clock, FileText } from 'lucide-react';
import { Trade, CalculationResult } from '../../types';
import { usePricing } from '../../contexts/PricingContext';
import { useNavigate } from 'react-router-dom';

interface PricingResultsProps {
  trade: Trade;
  specifications: Record<string, any>;
  calculationResults?: CalculationResult[];
}

const PricingResults = ({ trade, specifications, calculationResults }: PricingResultsProps) => {
  const { saveCalculatorResults } = usePricing();
  const navigate = useNavigate();

  const handleImportToEstimate = () => {
    if (calculationResults) {
      saveCalculatorResults(trade.name, calculationResults);
      navigate('/estimates');
    }
  };

  // In a real app, this would come from an API
  // We're using mock data for the demo
  const pricingData = {
    totalPrice: 14250,
    materials: {
      total: 8650,
      items: [
        { name: 'Pressure Treated Lumber', quantity: '350 sq ft', price: 3850 },
        { name: 'Concrete for Footings', quantity: '1.5 cubic yards', price: 750 },
        { name: 'Railing System', quantity: '42 linear ft', price: 2100 },
        { name: 'Hardware & Fasteners', quantity: '1 set', price: 450 },
        { name: 'Stain & Sealant', quantity: '4 gallons', price: 320 },
        { name: 'Misc Materials', quantity: '1 lot', price: 1180 },
      ],
    },
    labor: {
      total: 5600,
      items: [
        { name: 'Site Preparation', hours: 6, price: 450 },
        { name: 'Footing Installation', hours: 8, price: 640 },
        { name: 'Framing & Structure', hours: 24, price: 1920 },
        { name: 'Decking Installation', hours: 16, price: 1280 },
        { name: 'Railing Installation', hours: 8, price: 640 },
        { name: 'Finishing & Cleanup', hours: 8, price: 670 },
      ],
    },
    recommendations: [
      {
        title: 'Material Supplier Options',
        items: [
          { name: 'Home Depot', note: 'Best price on pressure-treated lumber', link: '#' },
          { name: 'Lowe\'s', note: 'Quality railing systems in stock', link: '#' },
          { name: 'Local Lumber Co.', note: 'Premium material, 10% contractor discount', link: '#' },
        ],
      },
      {
        title: 'Potential Cost Savings',
        items: [
          { description: 'Composite decking would increase durability but add $3,200 to material costs' },
          { description: 'Simplified railing design could save $800 in materials and labor' },
          { description: 'DIY staining could save $450 in labor costs' },
        ],
      },
    ],
    timeEstimate: '2-3 weeks',
    permitRequired: true,
  };

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-xl font-bold text-gray-900">Pricing Results: {trade.name}</h2>
        <div className="flex gap-2">
          {calculationResults && (
            <button
              onClick={handleImportToEstimate}
              className="flex items-center px-3 py-2 text-sm font-medium text-white bg-green-600 rounded-md hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-green-500"
            >
              <FileText className="w-4 h-4 mr-2" />
              Import to New Estimate
            </button>
          )}
          <button className="flex items-center px-3 py-2 text-sm font-medium text-white bg-blue-600 rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500">
            <FileDown className="w-4 h-4 mr-2" />
            Export Report
          </button>
        </div>
      </div>

      <div className="bg-blue-50 border border-blue-100 rounded-lg p-4 mb-6 flex justify-between items-center">
        <div>
          <p className="text-blue-800 font-medium">Total Estimated Price</p>
          <p className="text-3xl font-bold text-blue-900">${pricingData.totalPrice.toLocaleString()}</p>
        </div>
        <div className="text-right">
          <p className="text-sm text-blue-700">Project Specifications:</p>
          <p className="text-sm text-blue-600">
            {specifications.size || 'Custom'} {trade.name} | {specifications.quality || 'Standard'} Quality
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="bg-white border border-gray-200 rounded-lg overflow-hidden">
          <div className="bg-gray-50 px-4 py-3 border-b border-gray-200">
            <h3 className="flex items-center text-lg font-medium text-gray-900">
              <Package className="w-5 h-5 mr-2 text-blue-600" />
              Materials Breakdown
            </h3>
          </div>
          <div className="p-4">
            <table className="min-w-full divide-y divide-gray-200">
              <thead>
                <tr>
                  <th className="px-2 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Item</th>
                  <th className="px-2 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Quantity</th>
                  <th className="px-2 py-2 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Price</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {pricingData.materials.items.map((item, index) => (
                  <tr key={index}>
                    <td className="px-2 py-2 text-sm text-gray-900">{item.name}</td>
                    <td className="px-2 py-2 text-sm text-gray-500">{item.quantity}</td>
                    <td className="px-2 py-2 text-sm text-gray-900 text-right">${item.price}</td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr className="bg-gray-50">
                  <td colSpan={2} className="px-2 py-2 text-sm font-medium text-gray-900">Materials Subtotal</td>
                  <td className="px-2 py-2 text-sm font-medium text-gray-900 text-right">${pricingData.materials.total}</td>
                </tr>
              </tfoot>
            </table>
          </div>
        </div>

        <div className="bg-white border border-gray-200 rounded-lg overflow-hidden">
          <div className="bg-gray-50 px-4 py-3 border-b border-gray-200">
            <h3 className="flex items-center text-lg font-medium text-gray-900">
              <Hammer className="w-5 h-5 mr-2 text-blue-600" />
              Labor Breakdown
            </h3>
          </div>
          <div className="p-4">
            <table className="min-w-full divide-y divide-gray-200">
              <thead>
                <tr>
                  <th className="px-2 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Service</th>
                  <th className="px-2 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Hours</th>
                  <th className="px-2 py-2 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Price</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {pricingData.labor.items.map((item, index) => (
                  <tr key={index}>
                    <td className="px-2 py-2 text-sm text-gray-900">{item.name}</td>
                    <td className="px-2 py-2 text-sm text-gray-500">{item.hours}</td>
                    <td className="px-2 py-2 text-sm text-gray-900 text-right">${item.price}</td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr className="bg-gray-50">
                  <td colSpan={2} className="px-2 py-2 text-sm font-medium text-gray-900">Labor Subtotal</td>
                  <td className="px-2 py-2 text-sm font-medium text-gray-900 text-right">${pricingData.labor.total}</td>
                </tr>
              </tfoot>
            </table>
          </div>
        </div>
      </div>

      <div className="mt-6 bg-white border border-gray-200 rounded-lg overflow-hidden">
        <div className="bg-gray-50 px-4 py-3 border-b border-gray-200">
          <h3 className="flex items-center text-lg font-medium text-gray-900">
            <Info className="w-5 h-5 mr-2 text-blue-600" />
            Additional Information
          </h3>
        </div>
        <div className="p-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
            <div className="p-3 border border-gray-200 rounded-md">
              <div className="flex items-center text-gray-700 mb-1">
                <Clock className="w-4 h-4 mr-2 text-gray-500" />
                <span className="text-sm font-medium">Time Estimate</span>
              </div>
              <p className="text-gray-900 font-medium ml-6">{pricingData.timeEstimate}</p>
            </div>
            <div className="p-3 border border-gray-200 rounded-md">
              <div className="flex items-center text-gray-700 mb-1">
                <DollarSign className="w-4 h-4 mr-2 text-gray-500" />
                <span className="text-sm font-medium">Price Confidence</span>
              </div>
              <div className="flex items-center ml-6">
                <div className="w-full h-2 bg-gray-200 rounded-full">
                  <div className="h-2 bg-green-500 rounded-full" style={{ width: '85%' }}></div>
                </div>
                <span className="ml-2 text-sm font-medium text-green-600">85%</span>
              </div>
            </div>
            <div className="p-3 border border-gray-200 rounded-md">
              <div className="flex items-center text-gray-700 mb-1">
                <Truck className="w-4 h-4 mr-2 text-gray-500" />
                <span className="text-sm font-medium">Material Availability</span>
              </div>
              <p className="text-green-600 font-medium ml-6">All materials in stock</p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-6">
            {pricingData.recommendations.map((section, index) => (
              <div key={index}>
                <h4 className="text-sm font-medium text-gray-900 mb-2">{section.title}</h4>
                <ul className="space-y-2">
                  {section.items.map((item, itemIndex) => (
                    <li key={itemIndex} className="text-sm pl-5 relative">
                      <span className="absolute left-0 top-1.5 w-1.5 h-1.5 rounded-full bg-blue-500"></span>
                      {'name' in item ? (
                        <div>
                          <span className="font-medium">{item.name}</span>
                          {item.note && <span className="text-gray-600"> - {item.note}</span>}
                        </div>
                      ) : (
                        <span className="text-gray-700">{item.description}</span>
                      )}
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>

          {pricingData.permitRequired && (
            <div className="mt-6 p-3 bg-amber-50 border border-amber-200 rounded-md">
              <div className="flex items-start">
                <Info className="w-5 h-5 mr-2 text-amber-500 mt-0.5" />
                <div>
                  <p className="text-amber-800 font-medium">Permit Required</p>
                  <p className="text-sm text-amber-700">This project will likely require a building permit. Check with your local building department for specific requirements.</p>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default PricingResults;