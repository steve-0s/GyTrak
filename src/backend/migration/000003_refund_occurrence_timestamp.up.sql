-- Refund occurrence is distinct from the time the adjustment row was inserted.
-- Existing rows use created_at as their historical best-known occurrence time.
ALTER TABLE transaction_adjustments
    ADD COLUMN IF NOT EXISTS occurred_at TIMESTAMPTZ;

UPDATE transaction_adjustments
SET occurred_at = created_at
WHERE occurred_at IS NULL;

ALTER TABLE transaction_adjustments
    ALTER COLUMN occurred_at SET DEFAULT CURRENT_TIMESTAMP,
    ALTER COLUMN occurred_at SET NOT NULL;

CREATE INDEX IF NOT EXISTS idx_transaction_adjustments_refund_occurred
    ON transaction_adjustments(adjustment_type, occurred_at)
    WHERE adjustment_type = 'refund';
