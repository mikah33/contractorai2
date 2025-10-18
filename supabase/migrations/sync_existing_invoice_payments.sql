-- One-time migration to sync existing invoice_payments to finance_payments
-- This creates revenue records for payments that were recorded before the integration

INSERT INTO finance_payments (
    client_name,
    amount,
    date,
    method,
    reference,
    notes,
    user_id,
    created_at
)
SELECT
    COALESCE(i.client_id, 'Invoice Payment'),
    ip.amount,
    ip.payment_date,
    COALESCE(ip.payment_method, 'other'),
    COALESCE(ip.reference_number, ''),
    COALESCE(ip.notes, 'Payment for invoice ' || i.invoice_number),
    ip.user_id,
    ip.created_at
FROM invoice_payments ip
JOIN invoices i ON i.id = ip.invoice_id
WHERE NOT EXISTS (
    -- Don't duplicate if a payment already exists with same details
    SELECT 1 FROM finance_payments fp
    WHERE fp.amount = ip.amount
    AND fp.date = ip.payment_date
    AND fp.user_id = ip.user_id
    AND fp.notes LIKE '%' || i.invoice_number || '%'
);
