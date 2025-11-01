# Receipt OCR Implementation Plan
## ContractorAI Finance Tracker - Receipt Capture Enhancement

---

## 📋 Executive Summary

**Goal:** Implement automated receipt parsing to extract vendor, amount, and date from uploaded receipt images.

**Current State:** ReceiptCapture.tsx component captures images but requires manual data entry.

**Proposed Solution:** Multi-tiered OCR approach with intelligent fallbacks and user verification.

---

## 🎯 OCR Solution Comparison

### Option 1: **Tesseract.js** (Client-Side)
**Pros:**
- ✅ Free and open-source
- ✅ Runs in browser (no API costs)
- ✅ No external dependencies
- ✅ Privacy-friendly (data stays local)
- ✅ Works offline

**Cons:**
- ❌ Lower accuracy (70-85% for receipts)
- ❌ Requires preprocessing
- ❌ Struggles with complex layouts
- ❌ Slower processing (3-8 seconds)
- ❌ Large bundle size (2-3MB)

**Cost:** $0/month
**Best For:** MVP/Testing, cost-conscious deployments

---

### Option 2: **Mindee Receipt OCR API** (⭐ RECOMMENDED)
**Pros:**
- ✅ Purpose-built for receipts
- ✅ Pre-trained models for vendor/date/total extraction
- ✅ 95%+ accuracy
- ✅ Structured JSON output
- ✅ Handles multiple currencies
- ✅ Confidence scores per field
- ✅ Easy integration (REST API)
- ✅ 250 free documents/month

**Cons:**
- ❌ Requires API key
- ❌ Internet connection needed
- ❌ Paid after free tier

**Pricing:**
- Free: 250 docs/month
- Starter: $49/mo (2,000 docs)
- Growth: $199/mo (10,000 docs)

**Cost Analysis for Contractors:**
- 10 receipts/day × 22 business days = 220/month → **FREE**
- 20 receipts/day = 440/month → **$49/mo**

**Best For:** Production use, high accuracy requirements

---

### Option 3: **Google Cloud Vision API**
**Pros:**
- ✅ Very high accuracy (90-95%)
- ✅ Good text detection
- ✅ Handles multiple languages
- ✅ 1,000 free requests/month

**Cons:**
- ❌ Generic OCR (not receipt-specific)
- ❌ Requires manual parsing of raw text
- ❌ Complex pricing model
- ❌ Requires Google Cloud setup

**Pricing:**
- 0-1,000 units/month: Free
- 1,001-5M units: $1.50/1,000
- Typical receipt = 1-3 units

**Best For:** High-volume operations with engineering resources

---

### Option 4: **AWS Textract**
**Pros:**
- ✅ Excellent accuracy (92-97%)
- ✅ Analyze Expense feature built for receipts
- ✅ Extracts key-value pairs automatically
- ✅ Handles tables well

**Cons:**
- ❌ More expensive than alternatives
- ❌ Complex AWS setup
- ❌ No free tier for Analyze Expense

**Pricing:**
- Detect Text: $1.50/1,000 pages
- Analyze Expense: $50/1,000 pages

**Best For:** Enterprise deployments with existing AWS infrastructure

---

### Option 5: **Hybrid Approach** (⭐ MOST COST-EFFECTIVE)
Use Tesseract.js first, fallback to Mindee API for low-confidence results.

**Benefits:**
- ✅ 60-70% of receipts processed free (client-side)
- ✅ High accuracy for difficult receipts
- ✅ Minimizes API costs
- ✅ User can choose quality vs speed

---

## 🏗️ Recommended Architecture: Hybrid Solution

### Phase 1: Client-Side Processing (Tesseract.js)
```
User uploads receipt
    ↓
Browser processes with Tesseract.js
    ↓
Extract text → Parse vendor/amount/date
    ↓
Calculate confidence score
    ↓
If confidence > 85% → Auto-fill fields
If confidence < 85% → Offer API enhancement
```

### Phase 2: API Enhancement (Mindee - Optional)
```
User clicks "Enhance with AI"
    ↓
Upload to Supabase Storage
    ↓
Call Mindee Receipt API
    ↓
Parse structured response
    ↓
Fill fields with high confidence
    ↓
Flag low-confidence fields for review
```

---

## 💻 Technical Implementation

### 1. Install Dependencies
```bash
npm install tesseract.js
npm install @mindee/mindee
```

### 2. Create OCR Service Layer
```typescript
// src/services/receiptOCRService.ts

import Tesseract from 'tesseract.js';
import * as mindee from '@mindee/mindee';

export interface OCRResult {
  vendor: string;
  amount: number;
  date: string;
  confidence: {
    vendor: number;
    amount: number;
    date: number;
    overall: number;
  };
  rawText?: string;
}

// Client-side OCR with Tesseract
export async function processReceiptLocal(imageFile: File): Promise<OCRResult> {
  const worker = await Tesseract.createWorker();
  await worker.loadLanguage('eng');
  await worker.initialize('eng');

  const { data: { text } } = await worker.recognize(imageFile);
  await worker.terminate();

  return parseReceiptText(text);
}

// API-based OCR with Mindee
export async function processReceiptAPI(imageUrl: string): Promise<OCRResult> {
  const mindeeClient = new mindee.Client({ apiKey: process.env.MINDEE_API_KEY });

  const input = mindeeClient.docFromUrl(imageUrl);
  const response = await input.parse(mindee.product.ReceiptV5);

  const receipt = response.document.inference.prediction;

  return {
    vendor: receipt.supplierName?.value || '',
    amount: receipt.totalAmount?.value || 0,
    date: receipt.date?.value || '',
    confidence: {
      vendor: receipt.supplierName?.confidence || 0,
      amount: receipt.totalAmount?.confidence || 0,
      date: receipt.date?.confidence || 0,
      overall: calculateOverallConfidence(receipt)
    }
  };
}

// Smart text parsing for Tesseract results
function parseReceiptText(text: string): OCRResult {
  const lines = text.split('\n').filter(line => line.trim());

  // Extract amount (look for currency symbols and decimal patterns)
  const amountPattern = /\$?\s*(\d+\.\d{2})/g;
  const amounts = [...text.matchAll(amountPattern)];
  const amount = amounts.length > 0
    ? parseFloat(amounts[amounts.length - 1][1]) // Last amount is usually total
    : 0;

  // Extract date (common formats: MM/DD/YYYY, DD-MM-YYYY, etc.)
  const datePattern = /(\d{1,2}[-\/]\d{1,2}[-\/]\d{2,4})/;
  const dateMatch = text.match(datePattern);
  const date = dateMatch ? normalizeDateFormat(dateMatch[1]) : '';

  // Extract vendor (usually first few lines)
  const vendor = lines.slice(0, 3)
    .find(line => line.length > 3 && !line.match(/^\d+$/))
    ?.trim() || '';

  // Calculate confidence based on successful extractions
  const confidence = {
    vendor: vendor ? 0.7 : 0.3,
    amount: amount > 0 ? 0.8 : 0.2,
    date: date ? 0.75 : 0.25,
    overall: 0
  };
  confidence.overall = (confidence.vendor + confidence.amount + confidence.date) / 3;

  return { vendor, amount, date, confidence, rawText: text };
}

function normalizeDateFormat(dateStr: string): string {
  // Convert various formats to YYYY-MM-DD
  const parts = dateStr.split(/[-\/]/);
  if (parts.length === 3) {
    const [a, b, c] = parts;
    // Assume MM/DD/YYYY or DD/MM/YYYY based on first number
    const month = parseInt(a) > 12 ? b : a;
    const day = parseInt(a) > 12 ? a : b;
    const year = c.length === 2 ? `20${c}` : c;
    return `${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`;
  }
  return dateStr;
}

function calculateOverallConfidence(receipt: any): number {
  const scores = [
    receipt.supplierName?.confidence || 0,
    receipt.totalAmount?.confidence || 0,
    receipt.date?.confidence || 0
  ];
  return scores.reduce((a, b) => a + b, 0) / scores.length;
}
```

### 3. Update ReceiptCapture Component
```typescript
// Modifications to ReceiptCapture.tsx

const [ocrMethod, setOcrMethod] = useState<'local' | 'api'>('local');
const [ocrResult, setOcrResult] = useState<OCRResult | null>(null);

const processImage = async (file: File) => {
  setIsProcessing(true);

  const url = URL.createObjectURL(file);
  setPreviewUrl(url);

  try {
    // Try local OCR first
    const result = await processReceiptLocal(file);
    setOcrResult(result);

    // Auto-fill if confidence is high
    if (result.confidence.overall > 0.75) {
      setReceiptData({
        vendor: result.vendor,
        amount: result.amount,
        date: result.date,
        category: '',
        projectId: '',
        notes: `Auto-extracted (${Math.round(result.confidence.overall * 100)}% confidence)`
      });
    } else {
      // Suggest API enhancement
      setShowApiSuggestion(true);
    }
  } catch (error) {
    console.error('OCR failed:', error);
  } finally {
    setIsProcessing(false);
    setIsEditing(true);
  }
};

const enhanceWithAPI = async () => {
  if (!previewUrl) return;

  setIsProcessing(true);
  try {
    // Upload to Supabase Storage first
    const fileUrl = await uploadToSupabase(previewUrl);

    // Process with Mindee API
    const result = await processReceiptAPI(fileUrl);
    setOcrResult(result);

    setReceiptData({
      vendor: result.vendor,
      amount: result.amount,
      date: result.date,
      category: receiptData.category,
      projectId: receiptData.projectId,
      notes: `API-extracted (${Math.round(result.confidence.overall * 100)}% confidence)`
    });
  } catch (error) {
    console.error('API OCR failed:', error);
  } finally {
    setIsProcessing(false);
  }
};
```

### 4. Supabase Storage Integration
```typescript
// Upload receipt images to Supabase Storage
async function uploadToSupabase(blobUrl: string): Promise<string> {
  const response = await fetch(blobUrl);
  const blob = await response.blob();

  const fileName = `receipts/${Date.now()}_${Math.random().toString(36).substr(2, 9)}.jpg`;

  const { data, error } = await supabase.storage
    .from('receipt-images')
    .upload(fileName, blob);

  if (error) throw error;

  const { data: { publicUrl } } = supabase.storage
    .from('receipt-images')
    .getPublicUrl(fileName);

  return publicUrl;
}
```

### 5. Database Schema Addition
```sql
-- Add confidence scores to receipts table
ALTER TABLE receipts
ADD COLUMN ocr_confidence JSONB,
ADD COLUMN ocr_method VARCHAR(20),
ADD COLUMN raw_ocr_text TEXT;

-- Store confidence scores
UPDATE receipts
SET ocr_confidence = '{"vendor": 0.95, "amount": 0.98, "date": 0.92, "overall": 0.95}'::jsonb
WHERE id = 'receipt_id';
```

---

## 🎨 UI/UX Enhancements

### Confidence Indicators
```tsx
{ocrResult && (
  <div className="bg-blue-50 border border-blue-200 rounded-md p-3 mb-4">
    <div className="flex items-center justify-between">
      <span className="text-sm font-medium">OCR Confidence</span>
      <span className={`text-sm ${
        ocrResult.confidence.overall > 0.8 ? 'text-green-600' : 'text-yellow-600'
      }`}>
        {Math.round(ocrResult.confidence.overall * 100)}%
      </span>
    </div>

    {ocrResult.confidence.overall < 0.75 && (
      <button
        onClick={enhanceWithAPI}
        className="mt-2 text-sm text-blue-600 hover:text-blue-800"
      >
        🚀 Enhance with AI for better accuracy
      </button>
    )}
  </div>
)}

{/* Field-level confidence */}
<input
  value={receiptData.vendor}
  className={ocrResult?.confidence.vendor < 0.7 ? 'border-yellow-400' : ''}
/>
{ocrResult?.confidence.vendor < 0.7 && (
  <span className="text-xs text-yellow-600">Low confidence - please verify</span>
)}
```

---

## 💰 Cost Projection

### Scenario 1: Small Contractor (10 receipts/day)
- **Local OCR Success Rate:** 70%
- **Receipts processed locally:** 7/day × 22 days = 154/month → **$0**
- **API fallback:** 3/day × 22 days = 66/month → **$0** (within Mindee free tier)
- **Total Monthly Cost:** **$0**

### Scenario 2: Medium Contractor (25 receipts/day)
- **Receipts processed locally:** 70% × 550 = 385/month → **$0**
- **API fallback:** 30% × 550 = 165/month → **$0** (within Mindee free tier)
- **Total Monthly Cost:** **$0**

### Scenario 3: Large Contractor (50 receipts/day)
- **Receipts processed locally:** 70% × 1,100 = 770/month → **$0**
- **API fallback:** 30% × 1,100 = 330/month → **$49/mo** (Mindee Starter plan)
- **Total Monthly Cost:** **$49/month**

---

## 🚀 Implementation Phases

### Phase 1: MVP (Week 1-2)
- ✅ Integrate Tesseract.js for client-side OCR
- ✅ Basic text parsing (vendor/amount/date)
- ✅ Confidence scoring
- ✅ User verification UI

### Phase 2: Enhancement (Week 3)
- ✅ Integrate Mindee API
- ✅ Hybrid approach with fallback
- ✅ Supabase Storage integration
- ✅ Confidence indicators

### Phase 3: Polish (Week 4)
- ✅ Image preprocessing (rotation, contrast)
- ✅ Batch processing
- ✅ Historical accuracy tracking
- ✅ User feedback loop

---

## 🧪 Testing Strategy

1. **Test Dataset:** Collect 50 sample receipts (various vendors, formats, qualities)
2. **Metrics:**
   - Extraction accuracy per field
   - Processing time
   - Confidence correlation
   - User correction frequency
3. **A/B Testing:** Local-only vs Hybrid approach

---

## 🔒 Security Considerations

1. **Image Storage:**
   - Store in private Supabase bucket
   - Row-level security policies
   - Auto-delete after 90 days (optional)

2. **API Keys:**
   - Store in environment variables
   - Use Edge Functions for API calls (hide keys from client)

3. **Data Privacy:**
   - Inform users about API processing
   - Option to use local-only mode

---

## 📊 Success Metrics

- **Accuracy:** >90% for vendor, >95% for amount, >85% for date
- **User Correction Rate:** <20%
- **Processing Time:** <5 seconds average
- **User Satisfaction:** NPS >8/10
- **Cost per Receipt:** <$0.10

---

## 🎯 Recommendation

**Implement the Hybrid Approach:**
1. Start with Tesseract.js for 70% of receipts (free)
2. Fallback to Mindee API for low-confidence results
3. Stay within free tier for most contractors
4. Scale to paid tier only when needed

**Benefits:**
- ✅ Zero cost for most users
- ✅ High accuracy when needed
- ✅ User control over quality vs cost
- ✅ Gradual cost scaling
- ✅ Works offline (local mode)

**Next Steps:**
1. Set up Mindee API account (free tier)
2. Create Supabase Storage bucket for receipts
3. Implement receiptOCRService.ts
4. Update ReceiptCapture.tsx component
5. Test with real receipts
6. Iterate based on accuracy metrics
