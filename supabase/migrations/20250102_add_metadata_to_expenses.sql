-- Add metadata column to finance_expenses table to store additional receipt data
ALTER TABLE finance_expenses
ADD COLUMN IF NOT EXISTS metadata JSONB DEFAULT '{}'::jsonb;

-- Add index for metadata queries
CREATE INDEX IF NOT EXISTS idx_finance_expenses_metadata ON finance_expenses USING gin(metadata);

-- Add comment to explain the metadata column
COMMENT ON COLUMN finance_expenses.metadata IS 'Stores additional receipt data including line items, supplier details, and OCR confidence scores from n8n webhook';
