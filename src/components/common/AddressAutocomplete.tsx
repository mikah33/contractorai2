import React, { useState, useRef, useEffect, useCallback } from 'react';
import { MapPin, Loader2, X } from 'lucide-react';

interface AddressAutocompleteProps {
  value: string;
  onChange: (address: string) => void;
  placeholder?: string;
  className?: string;
  theme?: 'light' | 'dark';
}

interface NominatimResult {
  place_id: number;
  display_name: string;
  lat: string;
  lon: string;
}

const AddressAutocomplete: React.FC<AddressAutocompleteProps> = ({
  value,
  onChange,
  placeholder = 'Start typing an address...',
  className = '',
  theme = 'dark'
}) => {
  const [suggestions, setSuggestions] = useState<NominatimResult[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [showDropdown, setShowDropdown] = useState(false);
  const [inputValue, setInputValue] = useState(value);
  const debounceRef = useRef<NodeJS.Timeout | null>(null);
  const wrapperRef = useRef<HTMLDivElement>(null);

  // Sync external value changes
  useEffect(() => {
    setInputValue(value);
  }, [value]);

  // Close dropdown on outside click
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (wrapperRef.current && !wrapperRef.current.contains(e.target as Node)) {
        setShowDropdown(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const searchAddress = useCallback(async (query: string) => {
    if (query.length < 3) {
      setSuggestions([]);
      setShowDropdown(false);
      return;
    }

    setIsSearching(true);
    try {
      const response = await fetch(
        `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(query)}&limit=5&countrycodes=us&addressdetails=1`,
        { headers: { 'User-Agent': 'ContractorAI-App' } }
      );
      const data: NominatimResult[] = await response.json();
      setSuggestions(data);
      setShowDropdown(data.length > 0);
    } catch (error) {
      console.error('Address search error:', error);
      setSuggestions([]);
    } finally {
      setIsSearching(false);
    }
  }, []);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    setInputValue(val);
    onChange(val);

    // Debounce search
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      searchAddress(val);
    }, 400);
  };

  const handleSelect = (result: NominatimResult) => {
    setInputValue(result.display_name);
    onChange(result.display_name);
    setShowDropdown(false);
    setSuggestions([]);
  };

  const handleClear = () => {
    setInputValue('');
    onChange('');
    setSuggestions([]);
    setShowDropdown(false);
  };

  const isDark = theme === 'dark';

  return (
    <div ref={wrapperRef} className="relative">
      <div className="relative">
        <MapPin className={`absolute left-3 top-1/2 -translate-y-1/2 w-4.5 h-4.5 ${isDark ? 'text-zinc-500' : 'text-gray-400'}`} />
        <input
          type="text"
          value={inputValue}
          onChange={handleInputChange}
          onFocus={() => { if (suggestions.length > 0) setShowDropdown(true); }}
          placeholder={placeholder}
          className={`${className} pl-10 pr-10`}
        />
        {isSearching && (
          <Loader2 className={`absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 animate-spin ${isDark ? 'text-zinc-500' : 'text-gray-400'}`} />
        )}
        {!isSearching && inputValue && (
          <button
            onClick={handleClear}
            className={`absolute right-3 top-1/2 -translate-y-1/2 w-5 h-5 rounded-full flex items-center justify-center ${isDark ? 'bg-zinc-600 text-zinc-300' : 'bg-gray-300 text-gray-600'}`}
          >
            <X className="w-3 h-3" />
          </button>
        )}
      </div>

      {/* Dropdown suggestions */}
      {showDropdown && suggestions.length > 0 && (
        <div className={`absolute z-50 left-0 right-0 mt-1 rounded-xl border shadow-lg overflow-hidden ${isDark ? 'bg-[#262626] border-zinc-700' : 'bg-white border-gray-200'}`}>
          {suggestions.map((result) => (
            <button
              key={result.place_id}
              onClick={() => handleSelect(result)}
              className={`w-full flex items-start gap-3 px-4 py-3 text-left transition-colors ${isDark ? 'hover:bg-zinc-700 active:bg-zinc-600' : 'hover:bg-gray-50 active:bg-gray-100'} border-b last:border-b-0 ${isDark ? 'border-zinc-700' : 'border-gray-100'}`}
            >
              <MapPin className={`w-4 h-4 mt-0.5 flex-shrink-0 ${isDark ? 'text-zinc-400' : 'text-gray-400'}`} />
              <span className={`text-sm leading-snug ${isDark ? 'text-zinc-200' : 'text-gray-800'}`}>
                {result.display_name}
              </span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
};

export default AddressAutocomplete;
