# Mindee Receipt OCR → Finance Expenses Field Mapping
## Complete Analysis for ContractorAI

---

## 📊 Field Mapping Overview

### CRITICAL FIELDS (Must Have - 100% Match)

| Mindee Field | Current DB Column | Status | Notes |
|-------------|------------------|---------|-------|
| `supplier_name` | `vendor` | ✅ Mapped | Primary vendor identification |
| `date` | `date` | ✅ Mapped | Transaction date |
| `total_amount` | `amount` | ✅ Mapped | Total paid amount |
| `category` | `category` | ❌ **Override** | Mindee's category vs our contractor categories |

**Issue with Category:**
- Mindee returns generic categories (food, transportation, etc.)
- We need contractor-specific: Materials, Labor, Subcontractors, Equipment Rental, etc.
- **Solution:** Use Mindee's category as a hint, but let user select from our predefined list

---

### HIGH-VALUE FIELDS (Should Add - Contractor Focused)

| Mindee Field | New DB Column | Priority | Use Case |
|-------------|--------------|----------|----------|
| `receipt_number` | `receipt_number` | 🔥 HIGH | Track invoices, warranty claims, returns |
| `supplier_address` | `supplier_address` | 🔥 HIGH | Repeat vendor identification, tax records |
| `supplier_phone_number` | `supplier_phone` | 🟡 MEDIUM | Vendor contact for reorders, issues |
| `total_tax` | `tax_amount` | 🔥 HIGH | Tax deduction tracking (IRS requirement) |
| `total_net` | `subtotal` | 🟡 MEDIUM | Pre-tax amount calculation |
| `time` | `transaction_time` | 🟢 LOW | Timestamp for detailed tracking |
| `tip` | `tip_amount` | 🟢 LOW | Service-related expenses |

---

### LINE ITEMS (Game Changer for Contractors!)

**Mindee's `line_items` array contains:**
```json
{
  "description": "2x4 Lumber 8ft",
  "quantity": 10,
  "unit_price": 5.99,
  "total_amount": 59.90
}
```

**Why This is HUGE for Contractors:**
- ✅ Track individual materials per receipt
- ✅ Quantity tracking for inventory
- ✅ Unit price for cost analysis
- ✅ Better budget allocation to categories

**Database Solution:**
Create a separate `receipt_line_items` table:
```sql
CREATE TABLE receipt_line_items (
  id UUID PRIMARY KEY,
  receipt_id UUID REFERENCES receipts(id),
  description TEXT,
  quantity DECIMAL(10,2),
  unit_price DECIMAL(15,2),
  total_amount DECIMAL(15,2),
  category VARCHAR(100) -- Auto-categorize by description
)
```

---

### TAX BREAKDOWN (Critical for Accountants)

**Mindee's `taxes` array:**
```json
{
  "rate": 0.0825,  // 8.25% sales tax
  "base": 100.00,  // Taxable amount
  "value": 8.25,   // Tax amount
  "code": "STATE"  // Tax type
}
```

**Use Case:**
- Multi-state contractors need tax breakdown
- Different materials have different tax rates
- Resale certificates affect taxation

**Database Solution:**
Add JSONB column to store full tax breakdown:
```sql
ALTER TABLE receipts ADD COLUMN tax_details JSONB;
```

---

### METADATA FIELDS (Nice to Have)

| Mindee Field | Storage | Priority | Use Case |
|-------------|---------|----------|----------|
| `document_type` | `document_type` | 🟢 LOW | Differentiate receipt vs invoice |
| `locale.currency` | `currency` | 🟡 MEDIUM | International contractors |
| `subcategory` | `subcategory` | 🟢 LOW | Fine-grained categorization |
| `supplier_company_registrations` | `supplier_tax_id` | 🟡 MEDIUM | 1099 contractor tracking |

---

## 🗄️ Recommended Database Schema Updates

### Option 1: Enhanced Receipts Table (Recommended)

```sql
-- Add new columns to existing receipts table
ALTER TABLE receipts
  -- Supplier details
  ADD COLUMN receipt_number VARCHAR(100),
  ADD COLUMN supplier_address TEXT,
  ADD COLUMN supplier_phone VARCHAR(50),
  ADD COLUMN supplier_tax_id VARCHAR(50),

  -- Financial breakdown
  ADD COLUMN subtotal DECIMAL(15,2),
  ADD COLUMN tax_amount DECIMAL(15,2),
  ADD COLUMN tip_amount DECIMAL(15,2) DEFAULT 0,
  ADD COLUMN tax_details JSONB,

  -- Metadata
  ADD COLUMN transaction_time TIME,
  ADD COLUMN document_type VARCHAR(50),
  ADD COLUMN currency VARCHAR(10) DEFAULT 'USD',
  ADD COLUMN mindee_category VARCHAR(100),
  ADD COLUMN subcategory VARCHAR(100),

  -- OCR metadata
  ADD COLUMN ocr_confidence JSONB,
  ADD COLUMN ocr_raw_data JSONB,
  ADD COLUMN processed_at TIMESTAMP WITH TIME ZONE;

-- Add indexes for common queries
CREATE INDEX idx_receipts_receipt_number ON receipts(receipt_number);
CREATE INDEX idx_receipts_supplier_tax_id ON receipts(supplier_tax_id);
CREATE INDEX idx_receipts_date ON receipts(date);
CREATE INDEX idx_receipts_category ON receipts(category);
```

### Option 2: Separate Line Items Table

```sql
-- Create line items table for detailed tracking
CREATE TABLE receipt_line_items (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  receipt_id UUID NOT NULL REFERENCES receipts(id) ON DELETE CASCADE,

  -- Item details
  description TEXT NOT NULL,
  quantity DECIMAL(10,2),
  unit_price DECIMAL(15,2),
  total_amount DECIMAL(15,2) NOT NULL,

  -- Auto-categorization
  category VARCHAR(100),

  -- Metadata
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,

  -- Index for fast queries
  CONSTRAINT fk_receipt FOREIGN KEY (receipt_id) REFERENCES receipts(id)
);

CREATE INDEX idx_line_items_receipt_id ON receipt_line_items(receipt_id);
CREATE INDEX idx_line_items_category ON receipt_line_items(category);
```

---

## 🔄 Updated Edge Function Code

```typescript
// supabase/functions/process-receipt/index.ts

interface EnhancedOCRResult {
  // Core fields
  vendor: string;
  amount: number;
  date: string;

  // Enhanced fields
  receiptNumber?: string;
  supplierAddress?: string;
  supplierPhone?: string;
  supplierTaxId?: string;

  // Financial breakdown
  subtotal?: number;
  taxAmount?: number;
  tipAmount?: number;

  // Line items
  lineItems?: Array<{
    description: string;
    quantity: number;
    unitPrice: number;
    totalAmount: number;
  }>;

  // Tax details
  taxes?: Array<{
    rate: number;
    base: number;
    value: number;
    code: string;
  }>;

  // Metadata
  time?: string;
  documentType?: string;
  currency?: string;
  mindeeCategory?: string;
  subcategory?: string;

  // Confidence
  confidence: {
    vendor: number;
    amount: number;
    date: number;
    overall: number;
  };
}

async function processWithMindeeAPI(imageUrl: string): Promise<EnhancedOCRResult> {
  // ... existing fetch logic ...

  const prediction = data.document.inference.prediction;

  // Extract ALL useful fields
  return {
    // Core (already have these)
    vendor: prediction.supplier_name?.value || '',
    amount: prediction.total_amount?.value || 0,
    date: prediction.date?.value || '',

    // Enhanced supplier info
    receiptNumber: prediction.receipt_number?.value,
    supplierAddress: prediction.supplier_address?.value,
    supplierPhone: prediction.supplier_phone_number?.value,
    supplierTaxId: prediction.supplier_company_registrations?.[0]?.value,

    // Financial breakdown
    subtotal: prediction.total_net?.value,
    taxAmount: prediction.total_tax?.value,
    tipAmount: prediction.tip?.value,

    // Line items (if available)
    lineItems: prediction.line_items?.map((item: any) => ({
      description: item.description || '',
      quantity: item.quantity || 1,
      unitPrice: item.unit_price || 0,
      totalAmount: item.total_amount || 0
    })),

    // Tax breakdown
    taxes: prediction.taxes?.map((tax: any) => ({
      rate: tax.rate || 0,
      base: tax.base || 0,
      value: tax.value || 0,
      code: tax.code || ''
    })),

    // Metadata
    time: prediction.time?.value,
    documentType: prediction.document_type?.value,
    currency: prediction.locale?.currency,
    mindeeCategory: prediction.category?.value,
    subcategory: prediction.subcategory?.value,

    // Confidence scores
    confidence: {
      vendor: prediction.supplier_name?.confidence || 0,
      amount: prediction.total_amount?.confidence || 0,
      date: prediction.date?.confidence || 0,
      overall: calculateOverallConfidence(prediction)
    }
  };
}
```

---

## 🎨 Updated ReceiptCapture Component

```typescript
// src/components/finance/ReceiptCapture.tsx

interface ReceiptData {
  // Existing
  vendor: string;
  date: string;
  amount: number;
  category: string;
  projectId?: string;
  notes?: string;
  imageUrl?: string;
  status: 'pending' | 'processed' | 'verified';

  // NEW: Enhanced fields
  receiptNumber?: string;
  supplierAddress?: string;
  supplierPhone?: string;
  subtotal?: number;
  taxAmount?: number;
  tipAmount?: number;
  transactionTime?: string;

  // NEW: Store raw Mindee data for reference
  ocrRawData?: any;
}

const processImage = async (file: File) => {
  // ... upload logic ...

  // Call Edge Function
  const { data: ocrData } = await supabase.functions.invoke('process-receipt', {
    body: { imageUrl: publicUrl, useAPI: true }
  });

  // Auto-fill with ALL extracted data
  setReceiptData({
    // Core fields
    vendor: ocrData.vendor || '',
    date: ocrData.date || new Date().toISOString().split('T')[0],
    amount: ocrData.amount || 0,

    // Use our contractor categories, not Mindee's generic ones
    // Show Mindee's suggestion in notes
    category: '', // User must select from our dropdown

    // Enhanced fields
    receiptNumber: ocrData.receiptNumber,
    supplierAddress: ocrData.supplierAddress,
    supplierPhone: ocrData.supplierPhone,
    subtotal: ocrData.subtotal,
    taxAmount: ocrData.taxAmount,
    tipAmount: ocrData.tipAmount,
    transactionTime: ocrData.time,

    projectId: '',
    notes: `Auto-extracted (${Math.round(ocrData.confidence.overall * 100)}% confidence)
${ocrData.mindeeCategory ? `\nSuggested category: ${ocrData.mindeeCategory}` : ''}
${ocrData.receiptNumber ? `\nReceipt #: ${ocrData.receiptNumber}` : ''}`,

    status: 'pending',
    imageUrl: publicUrl,
    ocrRawData: ocrData
  });
};
```

---

## 📱 UI Updates for Enhanced Fields

### Add to ReceiptCapture Form:

```tsx
{/* Receipt Number Field */}
<div>
  <label className="block text-sm font-medium text-gray-700">Receipt #</label>
  <input
    type="text"
    value={receiptData.receiptNumber || ''}
    onChange={(e) => setReceiptData({...receiptData, receiptNumber: e.target.value})}
    className="mt-1 block w-full rounded-md border-gray-300 shadow-sm"
    placeholder="Optional"
  />
</div>

{/* Tax Amount (auto-filled, read-only) */}
<div>
  <label className="block text-sm font-medium text-gray-700">Tax Amount</label>
  <input
    type="number"
    value={receiptData.taxAmount || 0}
    readOnly
    className="mt-1 block w-full rounded-md border-gray-300 bg-gray-50"
  />
  <p className="text-xs text-gray-500 mt-1">Auto-calculated from receipt</p>
</div>

{/* Supplier Info (collapsible section) */}
<details className="mt-4">
  <summary className="text-sm font-medium text-gray-700 cursor-pointer">
    Supplier Details
  </summary>
  <div className="mt-2 space-y-2 pl-4">
    <div className="text-sm">
      <span className="font-medium">Address:</span>
      <p className="text-gray-600">{receiptData.supplierAddress || 'Not available'}</p>
    </div>
    <div className="text-sm">
      <span className="font-medium">Phone:</span>
      <p className="text-gray-600">{receiptData.supplierPhone || 'Not available'}</p>
    </div>
  </div>
</details>

{/* Line Items Display (if available) */}
{ocrData?.lineItems && ocrData.lineItems.length > 0 && (
  <div className="mt-4 border-t pt-4">
    <h4 className="text-sm font-medium text-gray-700 mb-2">Line Items</h4>
    <table className="min-w-full text-xs">
      <thead>
        <tr className="border-b">
          <th className="text-left py-1">Item</th>
          <th className="text-right py-1">Qty</th>
          <th className="text-right py-1">Price</th>
          <th className="text-right py-1">Total</th>
        </tr>
      </thead>
      <tbody>
        {ocrData.lineItems.map((item, idx) => (
          <tr key={idx} className="border-b">
            <td className="py-1">{item.description}</td>
            <td className="text-right">{item.quantity}</td>
            <td className="text-right">${item.unitPrice.toFixed(2)}</td>
            <td className="text-right">${item.totalAmount.toFixed(2)}</td>
          </tr>
        ))}
      </tbody>
    </table>
  </div>
)}
```

---

## 🎯 Priority Implementation Phases

### Phase 1: CRITICAL (Do First) ✅
```sql
ALTER TABLE receipts
  ADD COLUMN receipt_number VARCHAR(100),
  ADD COLUMN tax_amount DECIMAL(15,2),
  ADD COLUMN subtotal DECIMAL(15,2),
  ADD COLUMN ocr_confidence JSONB;
```
- Update Edge Function to extract: receipt_number, tax_amount, subtotal
- Update ReceiptCapture to show these fields
- **Value:** Tax deductions, invoice tracking

### Phase 2: HIGH VALUE (Do Next) 📊
```sql
ALTER TABLE receipts
  ADD COLUMN supplier_address TEXT,
  ADD COLUMN supplier_phone VARCHAR(50);

CREATE TABLE receipt_line_items (...);
```
- Extract line items from Mindee
- Show line items in UI
- **Value:** Detailed expense tracking, inventory management

### Phase 3: NICE TO HAVE (Later) 🎨
```sql
ALTER TABLE receipts
  ADD COLUMN transaction_time TIME,
  ADD COLUMN tip_amount DECIMAL(15,2),
  ADD COLUMN currency VARCHAR(10);
```
- Additional metadata fields
- **Value:** Detailed reporting, international support

---

## 📈 Expected Benefits

### For Contractors:
1. **Tax Time:** Automatic tax amount extraction = faster tax filing
2. **Material Tracking:** Line items = know exactly what was bought
3. **Vendor Management:** Address/phone = easy reordering
4. **Invoice Matching:** Receipt numbers = match to invoices

### For Accountants:
1. **Tax Compliance:** Full tax breakdown
2. **Audit Trail:** Receipt numbers, timestamps
3. **Categorization:** Better expense categorization
4. **Reporting:** Detailed line-item reports

---

## 🚀 Migration Script

```sql
-- Safe migration: Add all new columns
BEGIN;

-- Add new columns (all nullable for backward compatibility)
ALTER TABLE receipts
  ADD COLUMN IF NOT EXISTS receipt_number VARCHAR(100),
  ADD COLUMN IF NOT EXISTS supplier_address TEXT,
  ADD COLUMN IF NOT EXISTS supplier_phone VARCHAR(50),
  ADD COLUMN IF NOT EXISTS supplier_tax_id VARCHAR(50),
  ADD COLUMN IF NOT EXISTS subtotal DECIMAL(15,2),
  ADD COLUMN IF NOT EXISTS tax_amount DECIMAL(15,2),
  ADD COLUMN IF NOT EXISTS tip_amount DECIMAL(15,2) DEFAULT 0,
  ADD COLUMN IF NOT EXISTS tax_details JSONB,
  ADD COLUMN IF NOT EXISTS transaction_time TIME,
  ADD COLUMN IF NOT EXISTS document_type VARCHAR(50),
  ADD COLUMN IF NOT EXISTS currency VARCHAR(10) DEFAULT 'USD',
  ADD COLUMN IF NOT EXISTS mindee_category VARCHAR(100),
  ADD COLUMN IF NOT EXISTS subcategory VARCHAR(100),
  ADD COLUMN IF NOT EXISTS ocr_confidence JSONB,
  ADD COLUMN IF NOT EXISTS ocr_raw_data JSONB,
  ADD COLUMN IF NOT EXISTS processed_at TIMESTAMP WITH TIME ZONE;

-- Add indexes
CREATE INDEX IF NOT EXISTS idx_receipts_receipt_number ON receipts(receipt_number);
CREATE INDEX IF NOT EXISTS idx_receipts_date ON receipts(date);

COMMIT;

SELECT 'Receipt table migration completed successfully!' as status;
```

---

## ✅ Testing Checklist

- [ ] Run migration script on Supabase
- [ ] Update Edge Function with enhanced extraction
- [ ] Test with real Home Depot receipt (line items!)
- [ ] Test with restaurant receipt (tip extraction)
- [ ] Verify tax amount accuracy
- [ ] Check receipt number extraction
- [ ] Validate supplier address parsing
- [ ] Test confidence scores for all fields
- [ ] Verify backward compatibility (old receipts still work)
