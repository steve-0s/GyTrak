-- Roll back only the additive corrective migration.
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM customers WHERE status = 'archived')
       OR EXISTS (SELECT 1 FROM membership_plans WHERE status = 'archived')
       OR EXISTS (SELECT 1 FROM coaches WHERE status = 'archived') THEN
        RAISE EXCEPTION 'cannot roll back lifecycle migration while archived records exist; restore or migrate them first';
    END IF;
    IF EXISTS (
        SELECT 1
        FROM membership_plan_prices a
        JOIN membership_plan_prices b
          ON a.id < b.id
         AND a.plan_id = b.plan_id
         AND a.customer_type = b.customer_type
         AND a.branch_id IS NOT DISTINCT FROM b.branch_id
         AND daterange(a.effective_from, a.effective_to, '[]') && daterange(b.effective_from, b.effective_to, '[]')
        WHERE a.is_active AND b.is_active
    ) THEN
        RAISE EXCEPTION 'cannot restore inclusive pricing ranges because existing rows overlap at a boundary';
    END IF;
END $$;

DROP INDEX IF EXISTS idx_membership_plans_active;
DROP INDEX IF EXISTS idx_customers_active_branch;
ALTER TABLE membership_plan_prices
    DROP CONSTRAINT IF EXISTS ex_membership_plan_prices_global_effective_dates,
    DROP CONSTRAINT IF EXISTS ex_membership_plan_prices_branch_effective_dates;
ALTER TABLE membership_plan_prices
    ADD CONSTRAINT ex_membership_plan_prices_global_effective_dates
    EXCLUDE USING gist (plan_id WITH =, customer_type WITH =, daterange(effective_from, effective_to, '[]') WITH &&)
    WHERE (is_active AND branch_id IS NULL),
    ADD CONSTRAINT ex_membership_plan_prices_branch_effective_dates
    EXCLUDE USING gist (plan_id WITH =, customer_type WITH =, branch_id WITH =, daterange(effective_from, effective_to, '[]') WITH &&)
    WHERE (is_active AND branch_id IS NOT NULL);
ALTER TABLE customers DROP CONSTRAINT IF EXISTS customers_status_lifecycle_check;
ALTER TABLE customers ADD CONSTRAINT customers_status_check CHECK (status IN ('active', 'inactive', 'suspended'));
ALTER TABLE membership_plans DROP CONSTRAINT IF EXISTS membership_plans_status_lifecycle_check;
ALTER TABLE membership_plans ADD CONSTRAINT membership_plans_status_check CHECK (status IN ('active', 'inactive'));
ALTER TABLE coaches DROP CONSTRAINT IF EXISTS coaches_status_lifecycle_check;
ALTER TABLE coaches ADD CONSTRAINT coaches_status_check CHECK (status IN ('active', 'inactive'));
ALTER TABLE membership_reminders DROP CONSTRAINT IF EXISTS membership_reminders_membership_customer_fkey;
DROP INDEX IF EXISTS idx_reminders_branch_status;
DROP INDEX IF EXISTS idx_payment_allocations_payment;
ALTER TABLE transactions DROP CONSTRAINT IF EXISTS transactions_total_nonnegative_check;
DROP INDEX IF EXISTS idx_rfid_events_status_time;
DROP INDEX IF EXISTS idx_rfid_assignments_customer_history;
ALTER TABLE rfid_assignments DROP CONSTRAINT IF EXISTS rfid_assignments_deactivated_metadata_check;
DROP INDEX IF EXISTS idx_attendance_walk_in;
ALTER TABLE attendance_records DROP CONSTRAINT IF EXISTS attendance_records_device_id_fkey;
ALTER TABLE attendance_records DROP COLUMN IF EXISTS walk_in_id;
DROP INDEX IF EXISTS idx_walk_in_one_active_attendance;
DROP TRIGGER IF EXISTS trg_prevent_walk_in_transaction_reclassification ON transactions;
DROP TRIGGER IF EXISTS trg_enforce_walk_in_transaction_type ON walk_ins;
DROP FUNCTION IF EXISTS prevent_walk_in_transaction_reclassification();
DROP FUNCTION IF EXISTS enforce_walk_in_transaction_type();
ALTER TABLE walk_ins DROP CONSTRAINT IF EXISTS walk_ins_transaction_customer_branch_fkey;
DROP INDEX IF EXISTS idx_walk_ins_one_transaction;
ALTER TABLE transactions DROP CONSTRAINT IF EXISTS transactions_id_customer_branch_key;
DROP TABLE IF EXISTS walk_ins;
DROP INDEX IF EXISTS idx_coach_branch_assignments_branch_dates;
DROP INDEX IF EXISTS idx_coach_branch_assignments_one_active;
ALTER TABLE coaches DROP CONSTRAINT IF EXISTS coaches_archived_by_fkey, DROP CONSTRAINT IF EXISTS coaches_archive_metadata_check, DROP CONSTRAINT IF EXISTS coaches_status_lifecycle_check;
ALTER TABLE coaches DROP COLUMN IF EXISTS archive_reason, DROP COLUMN IF EXISTS archived_by, DROP COLUMN IF EXISTS archived_at, DROP COLUMN IF EXISTS updated_at;
ALTER TABLE membership_plans DROP CONSTRAINT IF EXISTS membership_plans_archived_by_fkey, DROP CONSTRAINT IF EXISTS membership_plans_archive_metadata_check, DROP CONSTRAINT IF EXISTS membership_plans_status_lifecycle_check;
ALTER TABLE membership_plans DROP COLUMN IF EXISTS archive_reason, DROP COLUMN IF EXISTS archived_by, DROP COLUMN IF EXISTS archived_at, DROP COLUMN IF EXISTS updated_at;
DROP INDEX IF EXISTS idx_customer_branch_history_customer;
DROP INDEX IF EXISTS idx_customer_branch_history_one_active;
DROP TABLE IF EXISTS customer_branch_history;
ALTER TABLE customers DROP CONSTRAINT IF EXISTS customers_archived_by_fkey, DROP CONSTRAINT IF EXISTS customers_archive_metadata_check, DROP CONSTRAINT IF EXISTS customers_status_lifecycle_check;
ALTER TABLE customers DROP COLUMN IF EXISTS archive_reason, DROP COLUMN IF EXISTS archived_by, DROP COLUMN IF EXISTS archived_at;
