DROP INDEX IF EXISTS idx_transaction_adjustments_refund_occurred;
ALTER TABLE transaction_adjustments
    DROP COLUMN IF EXISTS occurred_at;
