import React, { useState, useRef, useEffect } from 'react';
import {
  Send,
  Loader2,
  X,
  Sparkles,
  Trash2,
  DollarSign,
  Package,
  Hammer,
  ChevronDown,
  ChevronUp,
  Save,
  ShoppingCart
} from 'lucide-react';
import { FloorPlanResult } from '../../services/lidarScannerService';
import { supabase } from '../../lib/supabase';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || import.meta.env.NEXT_PUBLIC_SUPABASE_URL;

interface CustomizationItem {
  id: string;
  name: string;
  category: 'cabinets' | 'countertops' | 'fixtures' | 'appliances' | 'flooring' | 'electrical' | 'plumbing' | 'other';
  quantity: number;
  unit: string;
  unitPrice: number;
  laborPrice: number;
  totalPrice: number;
  description?: string;
  dimensions?: { width: number; length: number; height?: number };
}

interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
  items?: CustomizationItem[];
}

interface FloorPlanCustomizerProps {
  floorPlanData: FloorPlanResult;
  scanId?: string;
  onClose: () => void;
  onSaveEstimate?: (items: CustomizationItem[]) => void;
}

// Category colors and icons
const categoryConfig: Record<string, { color: string; icon: string }> = {
  cabinets: { color: 'amber', icon: '🗄️' },
  countertops: { color: 'stone', icon: '🪨' },
  fixtures: { color: 'blue', icon: '🚿' },
  appliances: { color: 'zinc', icon: '🔌' },
  flooring: { color: 'blue', icon: '🪵' },
  electrical: { color: 'yellow', icon: '⚡' },
  plumbing: { color: 'cyan', icon: '🔧' },
  other: { color: 'gray', icon: '📦' }
};

export const FloorPlanCustomizer: React.FC<FloorPlanCustomizerProps> = ({
  floorPlanData,
  onClose,
  onSaveEstimate
}) => {
  const [messages, setMessages] = useState<Message[]>([
    {
      id: '1',
      role: 'assistant',
      content: `I can help you customize this ${Math.round(floorPlanData.totalArea || 0)} sq ft space! Tell me what you'd like to add:\n\n• "Add kitchen cabinets with granite countertops"\n• "Install hardwood flooring"\n• "Add 6 recessed lights"\n• "Put in a bathroom vanity with double sinks"`,
      timestamp: new Date()
    }
  ]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [customizations, setCustomizations] = useState<CustomizationItem[]>([]);
  const [showEstimate, setShowEstimate] = useState(false);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Calculate totals
  const materialTotal = customizations.reduce((sum, item) => sum + (item.unitPrice * item.quantity), 0);
  const laborTotal = customizations.reduce((sum, item) => sum + item.laborPrice, 0);
  const grandTotal = customizations.reduce((sum, item) => sum + item.totalPrice, 0);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  const buildFloorPlanContext = () => {
    const rooms = floorPlanData.rooms || [];
    const roomInfo = rooms.length > 0
      ? rooms.map((r, i) => `${r.label || `Room ${i + 1}`}: ${Math.round(r.area)} sq ft`).join(', ')
      : `Single room: ${Math.round(floorPlanData.totalArea || 0)} sq ft`;

    return {
      totalArea: floorPlanData.totalArea || 0,
      ceilingHeight: floorPlanData.ceilingHeight || 8,
      wallCount: floorPlanData.wallCount || 4,
      doorCount: floorPlanData.doorCount || 1,
      windowCount: floorPlanData.windowCount || 1,
      rooms: roomInfo,
      existingCustomizations: customizations.map(c => `${c.name} (${c.quantity} ${c.unit})`).join(', ') || 'None yet'
    };
  };

  const handleSend = async () => {
    if (!input.trim() || isLoading) return;

    const userMessage: Message = {
      id: Date.now().toString(),
      role: 'user',
      content: input,
      timestamp: new Date()
    };

    setMessages(prev => [...prev, userMessage]);
    setInput('');
    setIsLoading(true);

    try {
      const context = buildFloorPlanContext();

      const response = await fetch(`${supabaseUrl}/functions/v1/floor-plan-customizer`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${(await supabase.auth.getSession()).data.session?.access_token}`
        },
        body: JSON.stringify({
          message: input,
          floorPlanContext: context,
          existingItems: customizations
        })
      });

      if (!response.ok) {
        throw new Error('Failed to process request');
      }

      const data = await response.json();

      // Add new items to customizations
      if (data.items && data.items.length > 0) {
        setCustomizations(prev => [...prev, ...data.items]);
      }

      const assistantMessage: Message = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: data.message,
        timestamp: new Date(),
        items: data.items
      };

      setMessages(prev => [...prev, assistantMessage]);

    } catch (error) {
      console.error('Error:', error);

      // Local fallback
      const newItems = parseCustomizationLocally(input, floorPlanData);
      if (newItems.length > 0) {
        setCustomizations(prev => [...prev, ...newItems]);
      }

      const fallbackMessage: Message = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: newItems.length > 0
          ? `I've added ${newItems.map(i => i.name).join(', ')} to your estimate. The breakdown is shown below.`
          : "I couldn't process that request. Try being more specific, like 'Add 10 linear feet of kitchen cabinets' or 'Install hardwood flooring throughout'.",
        timestamp: new Date(),
        items: newItems.length > 0 ? newItems : undefined
      };

      setMessages(prev => [...prev, fallbackMessage]);
    } finally {
      setIsLoading(false);
    }
  };

  // Local parsing fallback
  const parseCustomizationLocally = (text: string, floorPlan: FloorPlanResult): CustomizationItem[] => {
    const items: CustomizationItem[] = [];
    const lowerText = text.toLowerCase();
    const area = floorPlan.totalArea || 100;

    // Extract quantity if mentioned
    const qtyMatch = text.match(/(\d+)\s*(linear\s*f(?:ee)?t|sq(?:uare)?\s*f(?:ee)?t|units?|fixtures?|cabinets?)/i);
    const quantity = qtyMatch ? parseInt(qtyMatch[1]) : null;

    // Cabinets
    if (lowerText.includes('cabinet')) {
      const linearFt = quantity || Math.round(Math.sqrt(area) * 0.6);
      items.push({
        id: crypto.randomUUID(),
        name: 'Kitchen Cabinets',
        category: 'cabinets',
        quantity: linearFt,
        unit: 'linear ft',
        unitPrice: 225,
        laborPrice: linearFt * 70,
        totalPrice: (linearFt * 225) + (linearFt * 70)
      });
    }

    // Countertops
    if (lowerText.includes('counter') || lowerText.includes('granite') || lowerText.includes('quartz')) {
      const sqFt = quantity || Math.round(Math.sqrt(area) * 0.5 * 2);
      const pricePerSqFt = lowerText.includes('granite') ? 75 : lowerText.includes('quartz') ? 85 : 65;
      items.push({
        id: crypto.randomUUID(),
        name: lowerText.includes('granite') ? 'Granite Countertop' : lowerText.includes('quartz') ? 'Quartz Countertop' : 'Countertop',
        category: 'countertops',
        quantity: sqFt,
        unit: 'sq ft',
        unitPrice: pricePerSqFt,
        laborPrice: sqFt * 35,
        totalPrice: (sqFt * pricePerSqFt) + (sqFt * 35)
      });
    }

    // Sink
    if (lowerText.includes('sink')) {
      const isDouble = lowerText.includes('double');
      const isFarmhouse = lowerText.includes('farmhouse');
      items.push({
        id: crypto.randomUUID(),
        name: isFarmhouse ? 'Farmhouse Sink' : isDouble ? 'Double Sink' : 'Undermount Sink',
        category: 'fixtures',
        quantity: 1,
        unit: 'unit',
        unitPrice: isFarmhouse ? 450 : isDouble ? 500 : 350,
        laborPrice: isFarmhouse ? 200 : 175,
        totalPrice: (isFarmhouse ? 450 : isDouble ? 500 : 350) + (isFarmhouse ? 200 : 175)
      });
    }

    // Flooring
    if (lowerText.includes('floor') || lowerText.includes('hardwood') || lowerText.includes('tile') || lowerText.includes('vinyl')) {
      const sqFt = quantity || Math.round(area * 1.1);
      const isHardwood = lowerText.includes('hardwood');
      const isTile = lowerText.includes('tile');
      const isVinyl = lowerText.includes('vinyl');
      const pricePerSqFt = isHardwood ? 8 : isTile ? 6 : isVinyl ? 3 : 5;
      const laborPerSqFt = isHardwood ? 5 : isTile ? 8 : isVinyl ? 2 : 4;
      items.push({
        id: crypto.randomUUID(),
        name: isHardwood ? 'Hardwood Flooring' : isTile ? 'Tile Flooring' : isVinyl ? 'Vinyl Flooring' : 'Flooring',
        category: 'flooring',
        quantity: sqFt,
        unit: 'sq ft',
        unitPrice: pricePerSqFt,
        laborPrice: sqFt * laborPerSqFt,
        totalPrice: (sqFt * pricePerSqFt) + (sqFt * laborPerSqFt)
      });
    }

    // Lighting
    if (lowerText.includes('light') || lowerText.includes('recessed') || lowerText.includes('fixture')) {
      const count = quantity || 6;
      items.push({
        id: crypto.randomUUID(),
        name: 'Recessed Lighting',
        category: 'electrical',
        quantity: count,
        unit: 'fixtures',
        unitPrice: 35,
        laborPrice: count * 85,
        totalPrice: (count * 35) + (count * 85)
      });
    }

    // Appliances
    if (lowerText.includes('refrigerator') || lowerText.includes('fridge')) {
      items.push({
        id: crypto.randomUUID(),
        name: 'Refrigerator',
        category: 'appliances',
        quantity: 1,
        unit: 'unit',
        unitPrice: 1500,
        laborPrice: 100,
        totalPrice: 1600
      });
    }
    if (lowerText.includes('dishwasher')) {
      items.push({
        id: crypto.randomUUID(),
        name: 'Dishwasher',
        category: 'appliances',
        quantity: 1,
        unit: 'unit',
        unitPrice: 600,
        laborPrice: 175,
        totalPrice: 775
      });
    }
    if (lowerText.includes('stove') || lowerText.includes('range') || lowerText.includes('oven')) {
      items.push({
        id: crypto.randomUUID(),
        name: 'Range/Oven',
        category: 'appliances',
        quantity: 1,
        unit: 'unit',
        unitPrice: 800,
        laborPrice: 150,
        totalPrice: 950
      });
    }

    // Vanity
    if (lowerText.includes('vanity')) {
      const isDouble = lowerText.includes('double');
      items.push({
        id: crypto.randomUUID(),
        name: isDouble ? 'Double Vanity' : 'Bathroom Vanity',
        category: 'cabinets',
        quantity: 1,
        unit: 'unit',
        unitPrice: isDouble ? 800 : 450,
        laborPrice: isDouble ? 250 : 150,
        totalPrice: isDouble ? 1050 : 600
      });
    }

    return items;
  };

  const removeItem = (id: string) => {
    setCustomizations(prev => prev.filter(item => item.id !== id));
  };

  const updateItemQuantity = (id: string, newQuantity: number) => {
    setCustomizations(prev => prev.map(item => {
      if (item.id === id) {
        const newTotal = (item.unitPrice * newQuantity) + item.laborPrice;
        return { ...item, quantity: newQuantity, totalPrice: newTotal };
      }
      return item;
    }));
  };

  const handleSaveEstimate = () => {
    if (onSaveEstimate && customizations.length > 0) {
      onSaveEstimate(customizations);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-[#1C1C1E] flex flex-col">
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b border-white/10 safe-area-top">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-gradient-to-br from-violet-500 to-fuchsia-500 rounded-xl">
            <Sparkles className="w-5 h-5 text-white" />
          </div>
          <div>
            <h2 className="font-semibold text-white text-lg">AI Customizer</h2>
            <p className="text-xs text-zinc-400">
              {Math.round(floorPlanData.totalArea || 0)} sq ft • {(floorPlanData.ceilingHeight || 8).toFixed(1)}' ceiling
            </p>
          </div>
        </div>
        <button
          onClick={onClose}
          className="p-2 hover:bg-white/10 rounded-xl transition-colors"
        >
          <X className="w-6 h-6 text-zinc-400" />
        </button>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {messages.map((message) => (
          <div
            key={message.id}
            className={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}
          >
            <div
              className={`max-w-[85%] rounded-2xl px-4 py-3 ${
                message.role === 'user'
                  ? 'bg-violet-500 text-white'
                  : 'bg-[#2C2C2E] text-white'
              }`}
            >
              <p className="whitespace-pre-wrap text-[15px] leading-relaxed">{message.content}</p>

              {/* Show added items inline */}
              {message.items && message.items.length > 0 && (
                <div className="mt-3 pt-3 border-t border-white/20 space-y-2">
                  {message.items.map((item) => (
                    <div key={item.id} className="flex items-center justify-between text-sm bg-black/20 rounded-lg px-3 py-2">
                      <span className="flex items-center gap-2">
                        <span>{categoryConfig[item.category]?.icon}</span>
                        <span className="font-medium">{item.name}</span>
                      </span>
                      <span className="font-semibold text-green-400">${item.totalPrice.toLocaleString()}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        ))}

        {isLoading && (
          <div className="flex justify-start">
            <div className="bg-[#2C2C2E] rounded-2xl px-4 py-3 flex items-center gap-2">
              <Loader2 className="w-5 h-5 animate-spin text-violet-400" />
              <span className="text-sm text-zinc-400">Calculating...</span>
            </div>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Estimate Summary Bar (collapsed) */}
      {customizations.length > 0 && !showEstimate && (
        <button
          onClick={() => setShowEstimate(true)}
          className="mx-4 mb-2 flex items-center justify-between bg-[#2C2C2E] rounded-xl px-4 py-3 border border-white/10"
        >
          <div className="flex items-center gap-3">
            <div className="p-2 bg-green-500/20 rounded-lg">
              <ShoppingCart className="w-4 h-4 text-green-400" />
            </div>
            <div className="text-left">
              <p className="text-sm font-medium text-white">{customizations.length} items added</p>
              <p className="text-xs text-zinc-400">Tap to view breakdown</p>
            </div>
          </div>
          <div className="text-right">
            <p className="text-lg font-bold text-green-400">${grandTotal.toLocaleString()}</p>
            <ChevronUp className="w-4 h-4 text-zinc-400 ml-auto" />
          </div>
        </button>
      )}

      {/* Expanded Estimate Panel */}
      {showEstimate && (
        <div className="bg-[#2C2C2E] border-t border-white/10 max-h-[60vh] flex flex-col">
          {/* Panel Header */}
          <button
            onClick={() => setShowEstimate(false)}
            className="flex items-center justify-between p-4 border-b border-white/10"
          >
            <h3 className="font-semibold text-white flex items-center gap-2">
              <ShoppingCart className="w-5 h-5 text-green-400" />
              Estimate Breakdown
            </h3>
            <ChevronDown className="w-5 h-5 text-zinc-400" />
          </button>

          {/* Items List */}
          <div className="flex-1 overflow-y-auto p-4 space-y-3">
            {customizations.map((item) => (
              <div key={item.id} className="bg-[#1C1C1E] rounded-xl p-3">
                <div className="flex items-start justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <span className="text-lg">{categoryConfig[item.category]?.icon}</span>
                    <span className="font-medium text-white">{item.name}</span>
                  </div>
                  <button
                    onClick={() => removeItem(item.id)}
                    className="p-1.5 text-zinc-500 hover:text-red-400 hover:bg-red-500/10 rounded-lg transition-colors"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>

                <div className="flex items-center gap-3 mb-2">
                  <div className="flex items-center gap-2 bg-black/30 rounded-lg px-2 py-1">
                    <input
                      type="number"
                      value={item.quantity}
                      onChange={(e) => updateItemQuantity(item.id, parseInt(e.target.value) || 0)}
                      className="w-14 bg-transparent text-white text-sm focus:outline-none"
                      min="1"
                    />
                    <span className="text-xs text-zinc-400">{item.unit}</span>
                  </div>
                  <span className="text-xs text-zinc-500">@ ${item.unitPrice}/{item.unit}</span>
                </div>

                <div className="flex justify-between text-xs">
                  <span className="text-zinc-400">Materials: ${(item.unitPrice * item.quantity).toLocaleString()}</span>
                  <span className="text-zinc-400">Labor: ${item.laborPrice.toLocaleString()}</span>
                </div>

                <div className="mt-2 pt-2 border-t border-white/5 flex justify-end">
                  <span className="font-semibold text-white">${item.totalPrice.toLocaleString()}</span>
                </div>
              </div>
            ))}
          </div>

          {/* Totals & Save */}
          <div className="p-4 border-t border-white/10 space-y-3 bg-[#1C1C1E]">
            <div className="flex justify-between text-sm">
              <span className="text-zinc-400 flex items-center gap-2">
                <Package className="w-4 h-4" /> Materials
              </span>
              <span className="text-white">${materialTotal.toLocaleString()}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-zinc-400 flex items-center gap-2">
                <Hammer className="w-4 h-4" /> Labor
              </span>
              <span className="text-white">${laborTotal.toLocaleString()}</span>
            </div>
            <div className="flex justify-between text-xl font-bold pt-2 border-t border-white/10">
              <span className="text-white flex items-center gap-2">
                <DollarSign className="w-5 h-5" /> Total
              </span>
              <span className="text-green-400">${grandTotal.toLocaleString()}</span>
            </div>

            <button
              onClick={handleSaveEstimate}
              className="w-full flex items-center justify-center gap-2 py-4 bg-gradient-to-r from-green-500 to-emerald-600 text-white font-semibold rounded-xl active:scale-[0.98] transition-transform"
            >
              <Save className="w-5 h-5" />
              Save to Estimate
            </button>
          </div>
        </div>
      )}

      {/* Input */}
      {!showEstimate && (
        <div className="p-4 border-t border-white/10 safe-area-bottom">
          <div className="flex gap-3">
            <input
              ref={inputRef}
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyPress={(e) => e.key === 'Enter' && handleSend()}
              placeholder="Add cabinets, flooring, lighting..."
              className="flex-1 bg-[#2C2C2E] text-white rounded-xl px-4 py-3.5 focus:outline-none focus:ring-2 focus:ring-violet-500 placeholder-zinc-500"
            />
            <button
              onClick={handleSend}
              disabled={!input.trim() || isLoading}
              className="p-3.5 bg-violet-500 text-white rounded-xl disabled:opacity-50 active:scale-95 transition-transform"
            >
              <Send className="w-5 h-5" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default FloorPlanCustomizer;
