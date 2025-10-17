import React, { useState } from 'react';
import { CalculatorProps, CalculationResult } from '../../types';
import { Grid } from 'lucide-react';
import { useTranslation } from 'react-i18next';

type DeckingType = {
  id: string;
  name: string;
  width: number;
  spacing: number;
  price: {
    '12': number;
    '16': number;
    '20': number;
  };
};

const fasciaTypes = {
  'pt': {
    name: 'Pressure Treated',
    price: {
      '2x6': 12.98,
      '2x8': 17.98,
      '2x10': 24.98,
      '2x12': 32.98
    }
  },
  'azek': {
    name: 'Azek PVC',
    price: {
      '2x6': 45.98,
      '2x8': 59.98,
      '2x10': 79.98,
      '2x12': 99.98
    }
  },
  'metal': {
    name: 'Metal Stock',
    price: {
      '2x6': 29.98,
      '2x8': 39.98,
      '2x10': 49.98,
      '2x12': 59.98
    }
  }
};

const deckingTypes: DeckingType[] = [
  { 
    id: '5/4-deck', 
    name: '5/4" Deck Board', 
    width: 5.5, 
    spacing: 0.125, 
    price: {
      '12': 15.98,
      '16': 21.98,
      '20': 27.98
    }
  },
  { 
    id: '2x6-pt', 
    name: '2x6 PT Lumber', 
    width: 5.5, 
    spacing: 0.25, 
    price: {
      '12': 12.98,
      '16': 17.98,
      '20': 22.98
    }
  },
  {
    id: 'trex-enhance-basic',
    name: 'Trex Enhance Basic',
    width: 5.5,
    spacing: 0.25,
    price: {
      '12': 29.28,
      '16': 39.04,
      '20': 48.80
    }
  },
  {
    id: 'trex-enhance-natural',
    name: 'Trex Enhance Natural',
    width: 5.5,
    spacing: 0.25,
    price: {
      '12': 40.92,
      '16': 54.56,
      '20': 68.20
    }
  },
  {
    id: 'trex-select',
    name: 'Trex Select',
    width: 5.5,
    spacing: 0.25,
    price: {
      '12': 54.24,
      '16': 72.32,
      '20': 90.40
    }
  },
  {
    id: 'trex-transcend',
    name: 'Trex Transcend',
    width: 5.5,
    spacing: 0.25,
    price: {
      '12': 81.60,
      '16': 108.80,
      '20': 136.00
    }
  },
  {
    id: 'trex-lineage',
    name: 'Trex Lineage',
    width: 5.5,
    spacing: 0.25,
    price: {
      '12': 93.84,
      '16': 125.12,
      '20': 156.40
    }
  },
  { 
    id: 'custom', 
    name: 'Custom Size', 
    width: 5.5, 
    spacing: 0.125, 
    price: {
      '12': 15.98,
      '16': 21.98,
      '20': 27.98
    }
  }
];

const railingPrices = {
  'pt': 12.98,
  'trex': 45.98
};

const materialPrices = {
  '2x6': {
    '12': 12.98,
    '16': 17.98,
    '20': 22.98
  },
  '2x8': {
    '12': 17.98,
    '16': 23.98,
    '20': 29.98
  },
  '2x10': {
    '12': 24.98,
    '16': 32.98,
    '20': 41.98
  },
  '2x12': {
    '12': 32.98,
    '16': 43.98,
    '20': 54.98
  },
  'joist_hanger': 1.98,
  'hurricane_tie': 1.25,
  'deck_screws': 39.98,
  'concrete': 6.98,
  'post_base': 12.98,
};

interface BoardOption {
  length: number;
  boardsNeeded: number;
  totalCost: number;
  wasteLength: number;
  reusablePieces: number;
  effectiveCost: number;
}

const DeckCalculator: React.FC<CalculatorProps> = ({ onCalculate }) => {
  const { t } = useTranslation();
  const [inputType, setInputType] = useState<'dimensions' | 'area'>('dimensions');
  const [length, setLength] = useState<number | ''>('');
  const [width, setWidth] = useState<number | ''>('');
  const [area, setArea] = useState<number | ''>('');
  const [joistsSpacing, setJoistsSpacing] = useState<12 | 16>(16);
  const [joistSize, setJoistSize] = useState<'2x6' | '2x8' | '2x10' | '2x12'>('2x10');
  const [beamSpan, setBeamSpan] = useState<number | ''>('');
  const [includeStairs, setIncludeStairs] = useState(false);
  const [numberOfStaircases, setNumberOfStaircases] = useState<number>(1);
  const [staircases, setStaircases] = useState<Array<{
    width: number;
    heightAboveGrade: number;
    stairRun: 10 | 12;
  }>>([{ width: 36, heightAboveGrade: 0, stairRun: 10 }]);
  const [includeCantilever, setIncludeCantilever] = useState(false);
  const [cantileverLength, setCantileverLength] = useState<number | ''>('');
  const [deckingType, setDeckingType] = useState<string>('5/4-deck');
  const [customDeckingWidth, setCustomDeckingWidth] = useState<number | ''>('');
  const [customDeckingSpacing, setCustomDeckingSpacing] = useState<number | ''>('');
  const [includeRailing, setIncludeRailing] = useState(false);
  const [railingType, setRailingType] = useState<'pt' | 'trex'>('pt');
  const [railingLength, setRailingLength] = useState<number | ''>('');
  const [includeFascia, setIncludeFascia] = useState(false);
  const [fasciaType, setFasciaType] = useState<'pt' | 'azek' | 'metal'>('pt');
  const [fasciaLength, setFasciaLength] = useState<number | ''>('');
  const [includeTripleBeam, setIncludeTripleBeam] = useState(false);
  const [tripleBeamLength, setTripleBeamLength] = useState<number | ''>('');
  const [includeFreestandingPosts, setIncludeFreestandingPosts] = useState(false);
  const [numFreestandingPosts, setNumFreestandingPosts] = useState<number | ''>('');
  const [includeLedgerBoard, setIncludeLedgerBoard] = useState(false);
  const [ledgerBoardLength, setLedgerBoardLength] = useState<number | ''>('');

  const calculateOptimalBoardLength = (deckWidth: number) => {
    const availableLengths = [12, 16, 20];
    const selectedDecking = deckingTypes.find(d => d.id === deckingType)!;
    const isComposite = deckingType.includes('trex');
    
    const options: BoardOption[] = availableLengths.map(length => {
      const piecesPerBoard = Math.floor(length / deckWidth);
      const boardsNeeded = Math.ceil(deckWidth / length);
      const totalLength = boardsNeeded * length;
      const wasteLength = totalLength - deckWidth;
      
      const reusablePieces = Math.floor(wasteLength / deckWidth);
      
      const initialBoardsNeeded = Math.ceil(deckWidth / length);
      const totalCost = initialBoardsNeeded * selectedDecking.price[length.toString() as keyof typeof selectedDecking.price];
      
      const effectiveBoardsNeeded = Math.ceil(boardsNeeded / (piecesPerBoard > 0 ? piecesPerBoard : 1));
      const effectiveCost = effectiveBoardsNeeded * selectedDecking.price[length.toString() as keyof typeof selectedDecking.price];
      
      return {
        length,
        boardsNeeded: effectiveBoardsNeeded,
        totalCost,
        wasteLength,
        reusablePieces,
        effectiveCost
      };
    });

    options.sort((a, b) => {
      if (Math.abs(a.effectiveCost - b.effectiveCost) < 0.01) {
        return a.wasteLength - b.wasteLength;
      }
      return a.effectiveCost - b.effectiveCost;
    });

    if (isComposite) {
      const optionsWithGoodUtilization = options.filter(opt => 
        opt.length / deckWidth >= 1.8 && opt.length / deckWidth <= 2.2
      );
      if (optionsWithGoodUtilization.length > 0) {
        return optionsWithGoodUtilization[0].length;
      }
    }

    return options[0].length;
  };

  const handleCalculate = () => {
    let deckLength: number;
    let deckWidth: number;
    let calculatedArea: number;
    
    if (inputType === 'dimensions' && typeof length === 'number' && typeof width === 'number') {
      deckLength = length;
      deckWidth = width;
      calculatedArea = deckLength * deckWidth;
    } else if (inputType === 'area' && typeof area === 'number') {
      calculatedArea = area;
      deckLength = Math.sqrt(calculatedArea);
      deckWidth = Math.sqrt(calculatedArea);
    } else {
      return;
    }

    const results: CalculationResult[] = [
      {
        label: 'Total Deck Area',
        value: Number(calculatedArea.toFixed(2)),
        unit: 'square feet'
      }
    ];

    let deckingWidth: number;
    let deckingSpacing: number;
    let deckingPrice: { [key: string]: number };

    if (deckingType === 'custom' && typeof customDeckingWidth === 'number' && typeof customDeckingSpacing === 'number') {
      deckingWidth = customDeckingWidth;
      deckingSpacing = customDeckingSpacing;
      deckingPrice = deckingTypes.find(d => d.id === 'custom')!.price;
    } else {
      const selectedDecking = deckingTypes.find(d => d.id === deckingType)!;
      deckingWidth = selectedDecking.width;
      deckingSpacing = selectedDecking.spacing;
      deckingPrice = selectedDecking.price;
    }

    const optimalBoardLength = calculateOptimalBoardLength(deckWidth);
    const boardsAcrossWidth = Math.ceil(deckWidth * 12 / (deckingWidth + deckingSpacing));
    const piecesPerBoard = Math.floor(optimalBoardLength / deckWidth);
    const totalBoardsNeeded = Math.ceil(boardsAcrossWidth / (piecesPerBoard > 0 ? piecesPerBoard : 1));

    let totalCost = 0;

    const deckingCost = totalBoardsNeeded * deckingPrice[optimalBoardLength.toString()];
    totalCost += deckingCost;

    results.push({
      label: `${deckingType === 'custom' ? 'Decking Boards' : deckingTypes.find(d => d.id === deckingType)?.name} (${optimalBoardLength}ft)`,
      value: totalBoardsNeeded,
      unit: `${optimalBoardLength}ft boards`,
      cost: deckingCost
    });

    const joistsNeeded = Math.ceil(deckWidth * 12 / joistsSpacing) + 1;
    const optimalJoistLength = calculateOptimalBoardLength(deckLength);
    const joistCost = joistsNeeded * materialPrices[joistSize][optimalJoistLength.toString()];
    totalCost += joistCost;

    results.push({
      label: `${joistSize} Joists (${optimalJoistLength}ft)`,
      value: joistsNeeded,
      unit: 'pieces',
      cost: joistCost
    });

    const joistsHangers = joistsNeeded;
    const hangerCost = joistsHangers * materialPrices.joist_hanger;
    totalCost += hangerCost;

    results.push({
      label: 'Joist Hangers',
      value: joistsHangers,
      unit: 'pieces',
      cost: hangerCost
    });

    if (includeCantilever && typeof cantileverLength === 'number') {
      const hurricaneTieCost = joistsNeeded * materialPrices.hurricane_tie;
      totalCost += hurricaneTieCost;

      results.push({
        label: 'Hurricane Ties (required for cantilever)',
        value: joistsNeeded,
        unit: 'pieces',
        cost: hurricaneTieCost
      });
    }

    const screwsNeeded = totalBoardsNeeded * joistsNeeded * 2;
    const screwBoxesNeeded = Math.ceil(screwsNeeded / 1000);
    const screwCost = screwBoxesNeeded * materialPrices.deck_screws;
    totalCost += screwCost;

    results.push({
      label: 'Deck Screws',
      value: screwsNeeded,
      unit: 'pieces',
      cost: screwCost
    });

    if (includeCantilever && typeof cantileverLength === 'number') {
      const maxCantilever = 24;
      if (cantileverLength > maxCantilever) {
        results.push({
          label: 'WARNING',
          value: maxCantilever,
          unit: 'inches maximum cantilever exceeded'
        });
      }
      results.push({
        label: 'Cantilever Length',
        value: cantileverLength,
        unit: 'inches'
      });
    }

    if (includeStairs) {
      // Loop through all staircases
      staircases.forEach((staircase, index) => {
        const { width: stairWidth, heightAboveGrade, stairRun } = staircase;

        // Validate that all required fields are filled
        if (heightAboveGrade > 0 && stairWidth > 0) {
          const totalRise = heightAboveGrade;
          const riserHeight = 7.5;
          const numRisers = Math.ceil(totalRise / riserHeight);
          const actualRiserHeight = totalRise / numRisers;
          const numTreads = numRisers - 1;
          const totalRun = numTreads * stairRun;
          const numStringers = Math.max(3, Math.ceil(stairWidth / joistsSpacing));
          const stringerLength = Math.sqrt(Math.pow(totalRun, 2) + Math.pow(totalRise, 2)) / 12;
          const optimalStringerLength = calculateOptimalBoardLength(stringerLength);

          const stringerCost = numStringers * materialPrices['2x12'][optimalStringerLength.toString()];
          totalCost += stringerCost;

          const staircaseLabel = numberOfStaircases > 1 ? ` (Staircase ${index + 1})` : '';

          results.push(
            {
              label: `Number of Steps${staircaseLabel}`,
              value: numTreads,
              unit: 'steps'
            },
            {
              label: `Riser Height${staircaseLabel}`,
              value: Number(actualRiserHeight.toFixed(2)),
              unit: 'inches'
            },
            {
              label: `Total Stair Run${staircaseLabel}`,
              value: Number(totalRun.toFixed(2)),
              unit: 'inches'
            },
            {
              label: `Stair Width${staircaseLabel}`,
              value: stairWidth,
              unit: 'inches'
            },
            {
              label: `Stringers Needed (${joistsSpacing}" o.c.)${staircaseLabel}`,
              value: numStringers,
              unit: 'pieces'
            },
            {
              label: `2x12 Stringer Boards (${optimalStringerLength}ft)${staircaseLabel}`,
              value: numStringers,
              unit: `${optimalStringerLength}ft boards`,
              cost: stringerCost
            }
          );
        }
      });
    }

    if (includeRailing && typeof railingLength === 'number') {
      const railingCost = railingLength * railingPrices[railingType];
      totalCost += railingCost;
      
      results.push({
        label: `${railingType.toUpperCase()} Railing`,
        value: railingLength,
        unit: 'linear feet',
        cost: railingCost
      });
      
      const postsNeeded = Math.ceil(railingLength / 6) + 1;
      const postCost = postsNeeded * (railingType === 'pt' ? 24.98 : 89.98);
      totalCost += postCost;
      
      results.push({
        label: `${railingType.toUpperCase()} Railing Posts`,
        value: postsNeeded,
        unit: 'posts',
        cost: postCost
      });
    }

    if (includeFascia && typeof fasciaLength === 'number') {
      const boardsNeeded = Math.ceil(fasciaLength / 16);
      const fasciaPrice = fasciaTypes[fasciaType].price[joistSize];
      const fasciaCost = boardsNeeded * fasciaPrice;
      totalCost += fasciaCost;

      results.push({
        label: `${fasciaTypes[fasciaType].name} Fascia (${joistSize})`,
        value: boardsNeeded,
        unit: '16ft boards',
        cost: fasciaCost
      });
    }

    if (includeTripleBeam && typeof tripleBeamLength === 'number') {
      // Triple beam = 3 stacked 2x12 boards
      const beamBoardsNeeded = Math.ceil(tripleBeamLength / 16) * 3; // 3 boards per 16ft section
      const tripleBeamCost = beamBoardsNeeded * materialPrices['2x12']['16'];
      totalCost += tripleBeamCost;

      results.push({
        label: 'Triple Beam (3x 2x12 @ 16ft)',
        value: beamBoardsNeeded,
        unit: '16ft boards',
        cost: tripleBeamCost
      });
    }

    if (includeFreestandingPosts && typeof numFreestandingPosts === 'number') {
      const postPrice = 85;
      const freestandingPostCost = numFreestandingPosts * postPrice;
      totalCost += freestandingPostCost;

      results.push({
        label: 'Freestanding Posts (6x6)',
        value: numFreestandingPosts,
        unit: 'posts',
        cost: freestandingPostCost
      });
    }

    if (includeLedgerBoard && typeof ledgerBoardLength === 'number') {
      const ledgerPricePerFt = 15;
      const ledgerBoardCost = ledgerBoardLength * ledgerPricePerFt;
      totalCost += ledgerBoardCost;

      results.push({
        label: 'Ledger Board (2x12)',
        value: ledgerBoardLength,
        unit: 'linear feet',
        cost: ledgerBoardCost
      });
    }

    onCalculate(results);
  };

  const isFormValid =
    ((inputType === 'dimensions' && typeof length === 'number' && typeof width === 'number') ||
    (inputType === 'area' && typeof area === 'number')) &&
    (!includeStairs || staircases.every(s => s.heightAboveGrade > 0 && s.width > 0)) &&
    (!includeCantilever || typeof cantileverLength === 'number') &&
    (deckingType !== 'custom' || (typeof customDeckingWidth === 'number' && typeof customDeckingSpacing === 'number')) &&
    (!includeRailing || typeof railingLength === 'number') &&
    (!includeFascia || typeof fasciaLength === 'number') &&
    (!includeTripleBeam || typeof tripleBeamLength === 'number') &&
    (!includeFreestandingPosts || typeof numFreestandingPosts === 'number') &&
    (!includeLedgerBoard || typeof ledgerBoardLength === 'number');

  return (
    <div className="bg-white p-6 rounded-lg shadow-md animate-fade-in">
      <div className="flex items-center mb-6">
        <Grid className="h-6 w-6 text-orange-500 mr-2" />
        <h2 className="text-xl font-bold text-slate-800">{t('calculators.deck.title')}</h2>
      </div>
      
      <div className="mb-4">
        <div className="flex justify-start mb-4">
          <div className="inline-flex rounded-md shadow-sm">
            <button
              type="button"
              className={`px-4 py-2 text-sm font-medium rounded-l-lg ${
                inputType === 'dimensions'
                  ? 'bg-orange-500 text-white'
                  : 'bg-white text-slate-700 hover:bg-slate-100'
              } border border-slate-300`}
              onClick={() => setInputType('dimensions')}
            >
              {t('calculators.deck.useDimensions')}
            </button>
            <button
              type="button"
              className={`px-4 py-2 text-sm font-medium rounded-r-lg ${
                inputType === 'area'
                  ? 'bg-orange-500 text-white'
                  : 'bg-white text-slate-700 hover:bg-slate-100'
              } border border-slate-300`}
              onClick={() => setInputType('area')}
            >
              {t('calculators.deck.useSquareFootage')}
            </button>
          </div>
        </div>

        {inputType === 'dimensions' ? (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label htmlFor="length" className="block text-sm font-medium text-slate-700 mb-1">
                {t('calculators.deck.length')}
              </label>
              <input
                type="number"
                id="length"
                min="0"
                step="0.1"
                value={length}
                onChange={(e) => setLength(e.target.value ? Number(e.target.value) : '')}
                className="w-full p-2 border border-slate-300 rounded-md focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                placeholder={t('calculators.deck.lengthPlaceholder')}
              />
            </div>

            <div>
              <label htmlFor="width" className="block text-sm font-medium text-slate-700 mb-1">
                {t('calculators.deck.width')}
              </label>
              <input
                type="number"
                id="width"
                min="0"
                step="0.1"
                value={width}
                onChange={(e) => setWidth(e.target.value ? Number(e.target.value) : '')}
                className="w-full p-2 border border-slate-300 rounded-md focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                placeholder={t('calculators.deck.widthPlaceholder')}
              />
            </div>
          </div>
        ) : (
          <div>
            <label htmlFor="area" className="block text-sm font-medium text-slate-700 mb-1">
              {t('calculators.deck.totalArea')}
            </label>
            <input
              type="number"
              id="area"
              min="0"
              step="0.1"
              value={area}
              onChange={(e) => setArea(e.target.value ? Number(e.target.value) : '')}
              className="w-full p-2 border border-slate-300 rounded-md focus:ring-2 focus:ring-orange-500 focus:border-transparent"
              placeholder={t('calculators.deck.totalAreaPlaceholder')}
            />
          </div>
        )}

        <div className="mb-6">
          <label htmlFor="deckingType" className="block text-sm font-medium text-slate-700 mb-1">
            {t('calculators.deck.deckingType')}
          </label>
          <select
            id="deckingType"
            value={deckingType}
            onChange={(e) => setDeckingType(e.target.value)}
            className="w-full p-2 border border-slate-300 rounded-md focus:ring-2 focus:ring-orange-500 focus:border-transparent"
          >
            {deckingTypes.map(type => (
              <option key={type.id} value={type.id}>{type.name}</option>
            ))}
          </select>
        </div>

        {deckingType === 'custom' && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
            <div>
              <label htmlFor="customDeckingWidth" className="block text-sm font-medium text-slate-700 mb-1">
                {t('calculators.deck.customBoardWidth')}
              </label>
              <input
                type="number"
                id="customDeckingWidth"
                min="0"
                step="0.1"
                value={customDeckingWidth}
                onChange={(e) => setCustomDeckingWidth(e.target.value ? Number(e.target.value) : '')}
                className="w-full p-2 border border-slate-300 rounded-md focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                placeholder={t('calculators.deck.enterBoardWidth')}
              />
            </div>
            <div>
              <label htmlFor="customDeckingSpacing" className="block text-sm font-medium text-slate-700 mb-1">
                {t('calculators.deck.boardSpacing')}
              </label>
              <input
                type="number"
                id="customDeckingSpacing"
                min="0"
                step="0.01"
                value={customDeckingSpacing}
                onChange={(e) => setCustomDeckingSpacing(e.target.value ? Number(e.target.value) : '')}
                className="w-full p-2 border border-slate-300 rounded-md focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                placeholder={t('calculators.deck.enterSpacing')}
              />
            </div>
          </div>
        )}

        <div className="border-t border-slate-200 pt-6 mb-6">
          <h3 className="text-lg font-medium text-slate-800 mb-4">{t('calculators.deck.framingDetails')}</h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
            <div>
              <label htmlFor="joistsSpacing" className="block text-sm font-medium text-slate-700 mb-1">
                {t('calculators.deck.joistSpacing')}
              </label>
              <select
                id="joistsSpacing"
                value={joistsSpacing}
                onChange={(e) => setJoistsSpacing(Number(e.target.value) as 12 | 16)}
                className="w-full p-2 border border-slate-300 rounded-md focus:ring-2 focus:ring-orange-500 focus:border-transparent"
              >
                <option value={12}>{t('calculators.deck.joistSpacing12')}</option>
                <option value={16}>{t('calculators.deck.joistSpacing16')}</option>
              </select>
            </div>
            <div>
              <label htmlFor="joistSize" className="block text-sm font-medium text-slate-700 mb-1">
                {t('calculators.deck.joistSize')}
              </label>
              <select
                id="joistSize"
                value={joistSize}
                onChange={(e) => setJoistSize(e.target.value as typeof joistSize)}
                className="w-full p-2 border border-slate-300 rounded-md focus:ring-2 focus:ring-orange-500 focus:border-transparent"
              >
                <option value="2x6">{t('calculators.deck.joists2x6')}</option>
                <option value="2x8">{t('calculators.deck.joists2x8')}</option>
                <option value="2x10">{t('calculators.deck.joists2x10')}</option>
                <option value="2x12">{t('calculators.deck.joists2x12')}</option>
              </select>
            </div>
            <div>
              <label htmlFor="beamSpan" className="block text-sm font-medium text-slate-700 mb-1">
                {t('calculators.deck.beamSpan')}
              </label>
              <input
                type="number"
                id="beamSpan"
                min="0"
                step="0.1"
                value={beamSpan}
                onChange={(e) => setBeamSpan(e.target.value ? Number(e.target.value) : '')}
                className="w-full p-2 border border-slate-300 rounded-md focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                placeholder={t('calculators.deck.enterBeamSpan')}
              />
            </div>
          </div>
        </div>

        <div className="border-t border-slate-200 pt-6">
          <div className="flex items-center mb-4">
            <input
              type="checkbox"
              id="includeCantilever"
              checked={includeCantilever}
              onChange={(e) => {
                setIncludeCantilever(e.target.checked);
                if (!e.target.checked) {
                  setCantileverLength('');
                }
              }}
              className="h-4 w-4 text-orange-500 focus:ring-orange-500 border-slate-300 rounded"
            />
            <label htmlFor="includeCantilever" className="ml-2 block text-sm font-medium text-slate-700">
              {t('calculators.deck.includeCantilever')}
            </label>
          </div>

          {includeCantilever && (
            <div className="mb-6">
              <label htmlFor="cantileverLength" className="block text-sm font-medium text-slate-700 mb-1">
                {t('calculators.deck.cantileverLength')}
              </label>
              <input
                type="number"
                id="cantileverLength"
                min="0"
                max={24}
                step="1"
                value={cantileverLength}
                onChange={(e) => setCantileverLength(e.target.value ? Number(e.target.value) : '')}
                className="w-full p-2 border border-slate-300 rounded-md focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                placeholder={t('calculators.deck.enterCantilever')}
              />
              {typeof cantileverLength === 'number' && cantileverLength > 24 && (
                <p className="mt-1 text-sm text-red-600">
                  {t('calculators.deck.cantileverWarning')}
                </p>
              )}
            </div>
          )}

          <div className="flex items-center mb-4">
            <input
              type="checkbox"
              id="includeStairs"
              checked={includeStairs}
              onChange={(e) => setIncludeStairs(e.target.checked)}
              className="h-4 w-4 text-orange-500 focus:ring-orange-500 border-slate-300 rounded"
            />
            <label htmlFor="includeStairs" className="ml-2 block text-sm font-medium text-slate-700">
              {t('calculators.deck.includeStairs')}
            </label>
          </div>

          {includeStairs && (
            <div className="space-y-4">
              <div>
                <label htmlFor="numberOfStaircases" className="block text-sm font-medium text-slate-700 mb-1">
                  Number of Staircases
                </label>
                <select
                  id="numberOfStaircases"
                  value={numberOfStaircases}
                  onChange={(e) => {
                    const num = Number(e.target.value);
                    setNumberOfStaircases(num);
                    // Adjust staircases array
                    const newStaircases = Array.from({length: num}, (_, i) =>
                      staircases[i] || { width: 36, heightAboveGrade: 0, stairRun: 10 }
                    );
                    setStaircases(newStaircases);
                  }}
                  className="w-full p-2 border border-slate-300 rounded-md focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                >
                  <option value={1}>1 Staircase</option>
                  <option value={2}>2 Staircases</option>
                  <option value={3}>3 Staircases</option>
                  <option value={4}>4 Staircases</option>
                </select>
              </div>

              {staircases.map((staircase, index) => (
                <div key={index} className="border border-slate-200 rounded-md p-4 space-y-4">
                  <h4 className="font-medium text-slate-800">
                    {numberOfStaircases > 1 ? `Staircase ${index + 1}` : 'Staircase Details'}
                  </h4>

                  <div>
                    <label htmlFor={`heightAboveGrade-${index}`} className="block text-sm font-medium text-slate-700 mb-1">
                      {t('calculators.deck.heightAboveGrade')}
                    </label>
                    <input
                      type="number"
                      id={`heightAboveGrade-${index}`}
                      min="0"
                      step="1"
                      value={staircase.heightAboveGrade}
                      onChange={(e) => {
                        const newStaircases = [...staircases];
                        newStaircases[index].heightAboveGrade = e.target.value ? Number(e.target.value) : 0;
                        setStaircases(newStaircases);
                      }}
                      className="w-full p-2 border border-slate-300 rounded-md focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                      placeholder={t('calculators.deck.enterHeightInches')}
                    />
                  </div>

                  <div>
                    <label htmlFor={`stairWidth-${index}`} className="block text-sm font-medium text-slate-700 mb-1">
                      {t('calculators.deck.stairWidth')}
                    </label>
                    <input
                      type="number"
                      id={`stairWidth-${index}`}
                      min="36"
                      step="1"
                      value={staircase.width}
                      onChange={(e) => {
                        const newStaircases = [...staircases];
                        newStaircases[index].width = e.target.value ? Number(e.target.value) : 0;
                        setStaircases(newStaircases);
                      }}
                      className="w-full p-2 border border-slate-300 rounded-md focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                      placeholder={t('calculators.deck.enterStairWidth')}
                    />
                    {staircase.width < 36 && staircase.width > 0 && (
                      <p className="mt-1 text-sm text-red-600">
                        {t('calculators.deck.stairWidthWarning')}
                      </p>
                    )}
                  </div>

                  <div>
                    <label htmlFor={`stairRun-${index}`} className="block text-sm font-medium text-slate-700 mb-1">
                      {t('calculators.deck.stairRun')}
                    </label>
                    <select
                      id={`stairRun-${index}`}
                      value={staircase.stairRun}
                      onChange={(e) => {
                        const newStaircases = [...staircases];
                        newStaircases[index].stairRun = Number(e.target.value) as 10 | 12;
                        setStaircases(newStaircases);
                      }}
                      className="w-full p-2 border border-slate-300 rounded-md focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                    >
                      <option value={10}>{t('calculators.deck.stairRun10')}</option>
                      <option value={12}>{t('calculators.deck.stairRun12')}</option>
                    </select>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="border-t border-slate-200 pt-6">
          <div className="flex items-center mb-4">
            <input
              type="checkbox"
              id="includeRailing"
              checked={includeRailing}
              onChange={(e) => {
                setIncludeRailing(e.target.checked);
                if (!e.target.checked) {
                  setRailingLength('');
                }
              }}
              className="h-4 w-4 text-orange-500 focus:ring-orange-500 border-slate-300 rounded"
            />
            <label htmlFor="includeRailing" className="ml-2 block text-sm font-medium text-slate-700">
              {t('calculators.deck.includeRailing')}
            </label>
          </div>

          {includeRailing && (
            <div className="space-y-4">
              <div>
                <label htmlFor="railingType" className="block text-sm font-medium text-slate-700 mb-1">
                  {t('calculators.deck.railingType')}
                </label>
                <select
                  id="railingType"
                  value={railingType}
                  onChange={(e) => setRailingType(e.target.value as 'pt' | 'trex')}
                  className="w-full p-2 border border-slate-300 rounded-md focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                >
                  <option value="pt">{t('calculators.deck.pressureTreated')}</option>
                  <option value="trex">{t('calculators.deck.trexComposite')}</option>
                </select>
              </div>

              <div>
                <label htmlFor="railingLength" className="block text-sm font-medium text-slate-700 mb-1">
                  {t('calculators.deck.railingLength')}
                </label>
                <input
                  type="number"
                  id="railingLength"
                  min="0"
                  step="0.1"
                  value={railingLength}
                  onChange={(e) => setRailingLength(e.target.value ? Number(e.target.value) : '')}
                  className="w-full p-2 border border-slate-300 rounded-md focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                  placeholder={t('calculators.deck.enterRailingLength')}
                />
              </div>
            </div>
          )}
        </div>

        <div className="border-t border-slate-200 pt-6">
          <div className="flex items-center mb-4">
            <input
              type="checkbox"
              id="includeFascia"
              checked={includeFascia}
              onChange={(e) => {
                setIncludeFascia(e.target.checked);
                if (!e.target.checked) {
                  setFasciaLength('');
                }
              }}
              className="h-4 w-4 text-orange-500 focus:ring-orange-500 border-slate-300 rounded"
            />
            <label htmlFor="includeFascia" className="ml-2 block text-sm font-medium text-slate-700">
              {t('calculators.deck.includeFascia')}
            </label>
          </div>

          {includeFascia && (
            <div className="space-y-4">
              <div>
                <label htmlFor="fasciaType" className="block text-sm font-medium text-slate-700 mb-1">
                  {t('calculators.deck.fasciaMaterial')}
                </label>
                <select
                  id="fasciaType"
                  value={fasciaType}
                  onChange={(e) => setFasciaType(e.target.value as 'pt' | 'azek' | 'metal')}
                  className="w-full p-2 border border-slate-300 rounded-md focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                >
                  <option value="pt">{t('calculators.deck.pressureTreated')}</option>
                  <option value="azek">{t('calculators.deck.azekPVC')}</option>
                  <option value="metal">{t('calculators.deck.metalStock')}</option>
                </select>
              </div>

              <div>
                <label htmlFor="fasciaLength" className="block text-sm font-medium text-slate-700 mb-1">
                  {t('calculators.deck.fasciaLength')}
                </label>
                <input
                  type="number"
                  id="fasciaLength"
                  min="0"
                  step="0.1"
                  value={fasciaLength}
                  onChange={(e) => setFasciaLength(e.target.value ? Number(e.target.value) : '')}
                  className="w-full p-2 border border-slate-300 rounded-md focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                  placeholder={t('calculators.deck.enterFasciaLength')}
                />
              </div>
            </div>
          )}
        </div>

        <div className="border-t border-slate-200 pt-6">
          <div className="flex items-center mb-4">
            <input
              type="checkbox"
              id="includeTripleBeam"
              checked={includeTripleBeam}
              onChange={(e) => {
                setIncludeTripleBeam(e.target.checked);
                if (!e.target.checked) {
                  setTripleBeamLength('');
                }
              }}
              className="h-4 w-4 text-orange-500 focus:ring-orange-500 border-slate-300 rounded"
            />
            <label htmlFor="includeTripleBeam" className="ml-2 block text-sm font-medium text-slate-700">
              Include Triple Beam (Cantilever Support)
            </label>
          </div>

          {includeTripleBeam && (
            <div>
              <label htmlFor="tripleBeamLength" className="block text-sm font-medium text-slate-700 mb-1">
                Triple Beam Length (feet)
              </label>
              <input
                type="number"
                id="tripleBeamLength"
                min="0"
                step="0.1"
                value={tripleBeamLength}
                onChange={(e) => setTripleBeamLength(e.target.value ? Number(e.target.value) : '')}
                className="w-full p-2 border border-slate-300 rounded-md focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                placeholder="Enter triple beam length"
              />
              <p className="mt-1 text-sm text-slate-500">
                2x12 triple beam @ $45/linear foot for cantilever deck support
              </p>
            </div>
          )}
        </div>

        <div className="border-t border-slate-200 pt-6">
          <div className="flex items-center mb-4">
            <input
              type="checkbox"
              id="includeFreestandingPosts"
              checked={includeFreestandingPosts}
              onChange={(e) => {
                setIncludeFreestandingPosts(e.target.checked);
                if (!e.target.checked) {
                  setNumFreestandingPosts('');
                }
              }}
              className="h-4 w-4 text-orange-500 focus:ring-orange-500 border-slate-300 rounded"
            />
            <label htmlFor="includeFreestandingPosts" className="ml-2 block text-sm font-medium text-slate-700">
              Freestanding Deck Posts
            </label>
          </div>

          {includeFreestandingPosts && (
            <div>
              <label htmlFor="numFreestandingPosts" className="block text-sm font-medium text-slate-700 mb-1">
                Number of Posts
              </label>
              <input
                type="number"
                id="numFreestandingPosts"
                min="0"
                step="1"
                value={numFreestandingPosts}
                onChange={(e) => setNumFreestandingPosts(e.target.value ? Number(e.target.value) : '')}
                className="w-full p-2 border border-slate-300 rounded-md focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                placeholder="Enter number of posts"
              />
              <p className="mt-1 text-sm text-slate-500">
                6x6 posts @ $85/post for freestanding deck without ledger board
              </p>
            </div>
          )}
        </div>

        <div className="border-t border-slate-200 pt-6">
          <div className="flex items-center mb-4">
            <input
              type="checkbox"
              id="includeLedgerBoard"
              checked={includeLedgerBoard}
              onChange={(e) => {
                setIncludeLedgerBoard(e.target.checked);
                if (!e.target.checked) {
                  setLedgerBoardLength('');
                }
              }}
              className="h-4 w-4 text-orange-500 focus:ring-orange-500 border-slate-300 rounded"
            />
            <label htmlFor="includeLedgerBoard" className="ml-2 block text-sm font-medium text-slate-700">
              Include Ledger Board
            </label>
          </div>

          {includeLedgerBoard && (
            <div>
              <label htmlFor="ledgerBoardLength" className="block text-sm font-medium text-slate-700 mb-1">
                Ledger Board Length (feet)
              </label>
              <input
                type="number"
                id="ledgerBoardLength"
                min="0"
                step="0.1"
                value={ledgerBoardLength}
                onChange={(e) => setLedgerBoardLength(e.target.value ? Number(e.target.value) : '')}
                className="w-full p-2 border border-slate-300 rounded-md focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                placeholder="Enter ledger board length"
              />
              <p className="mt-1 text-sm text-slate-500">
                2x12 ledger board @ $15/linear foot attached to house
              </p>
            </div>
          )}
        </div>
      </div>
      
      <button
        onClick={handleCalculate}
        disabled={!isFormValid}
        className={`w-full py-3 px-4 rounded-md font-medium text-white ${
          isFormValid
            ? 'bg-orange-500 hover:bg-orange-600 transition-colors'
            : 'bg-slate-300 cursor-not-allowed'
        }`}
      >
        {t('calculators.calculateMaterials')}
      </button>
    </div>
  );
};

export default DeckCalculator;