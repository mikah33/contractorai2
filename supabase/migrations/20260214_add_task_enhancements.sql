-- Add enhanced fields to tasks table for full job management
-- client_id: Link task directly to a client
-- assigned_employees: Array of employee names assigned to task
-- estimate_id: Link to an estimate for the task
-- invoice_id: Link to an invoice for the task
-- send_invoice_on_complete: Flag to prompt invoice sending when task is done
-- line_items: Simple line items stored directly on task (alternative to full estimate)

ALTER TABLE tasks
ADD COLUMN IF NOT EXISTS client_id UUID REFERENCES clients(id) ON DELETE SET NULL,
ADD COLUMN IF NOT EXISTS assigned_employees TEXT[] DEFAULT '{}',
ADD COLUMN IF NOT EXISTS estimate_id UUID REFERENCES estimates(id) ON DELETE SET NULL,
ADD COLUMN IF NOT EXISTS invoice_id UUID REFERENCES invoices(id) ON DELETE SET NULL,
ADD COLUMN IF NOT EXISTS send_invoice_on_complete BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS line_items JSONB DEFAULT '[]';

-- Create indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_tasks_client_id ON tasks(client_id);
CREATE INDEX IF NOT EXISTS idx_tasks_estimate_id ON tasks(estimate_id);
CREATE INDEX IF NOT EXISTS idx_tasks_invoice_id ON tasks(invoice_id);

-- Comment on columns for documentation
COMMENT ON COLUMN tasks.client_id IS 'Direct link to client for this task';
COMMENT ON COLUMN tasks.assigned_employees IS 'Array of employee names assigned to this task';
COMMENT ON COLUMN tasks.estimate_id IS 'Link to associated estimate';
COMMENT ON COLUMN tasks.invoice_id IS 'Link to associated invoice';
COMMENT ON COLUMN tasks.send_invoice_on_complete IS 'Flag to prompt invoice sending when task marked complete';
COMMENT ON COLUMN tasks.line_items IS 'Simple line items stored directly (alternative to full estimate)';
