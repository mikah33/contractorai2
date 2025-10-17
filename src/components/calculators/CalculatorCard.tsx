import React from 'react';
import { Check } from 'lucide-react';
import { CalculatorInfo } from '../../data/calculatorRegistry';
import { useTranslation } from 'react-i18next';

interface CalculatorCardProps {
  calculator: CalculatorInfo;
  isSelected: boolean;
  onToggle: (calculatorId: string) => void;
}

const CalculatorCard: React.FC<CalculatorCardProps> = ({
  calculator,
  isSelected,
  onToggle
}) => {
  const { t } = useTranslation();
  const Icon = calculator.icon;

  return (
    <button
      onClick={() => onToggle(calculator.id)}
      className={`relative p-4 rounded-lg border-2 transition-all duration-200 text-left w-full ${
        isSelected
          ? 'border-blue-500 bg-blue-50 shadow-md'
          : 'border-gray-200 bg-white hover:border-blue-300 hover:shadow-sm'
      }`}
    >
      {/* Selection Indicator */}
      <div
        className={`absolute top-2 right-2 w-6 h-6 rounded-full flex items-center justify-center transition-all ${
          isSelected
            ? 'bg-blue-600 scale-100'
            : 'bg-gray-200 scale-0'
        }`}
      >
        <Check className="w-4 h-4 text-white" />
      </div>

      {/* Icon */}
      <div
        className={`w-12 h-12 rounded-lg flex items-center justify-center mb-3 ${
          isSelected ? 'bg-blue-600' : 'bg-gray-100'
        }`}
      >
        <Icon
          className={`w-6 h-6 ${
            isSelected ? 'text-white' : 'text-gray-600'
          }`}
        />
      </div>

      {/* Title */}
      <h3
        className={`font-semibold mb-1 text-sm ${
          isSelected ? 'text-blue-900' : 'text-gray-900'
        }`}
      >
        {t(calculator.translationKey)}
      </h3>

      {/* Description */}
      <p className="text-xs text-gray-600 line-clamp-2">
        {calculator.description}
      </p>

      {/* Category Badge */}
      <span
        className={`inline-block mt-2 px-2 py-0.5 rounded-full text-xs font-medium ${
          isSelected
            ? 'bg-blue-600 text-white'
            : 'bg-gray-200 text-gray-700'
        }`}
      >
        {calculator.category}
      </span>
    </button>
  );
};

export default CalculatorCard;
