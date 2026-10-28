-- Corrective migration for lifecycle, branch history, walk-ins, and integrity.
-- This migration is additive and does not delete or rewrite historical rows.

ALTER TABLE customers
    ADD COLUMN IF NOT EXISTS archived_at TIMESTAMPTZ,
    ADD COLUMN IF NOT EXISTS archived_by UUID,
    ADD COLUMN IF NOT EXISTS archive_reason TEXT;
ALTER TABLE customers
    DROP CONSTRAINT IF EXISTS customers_status_check;
ALTER TABLE customers
    ADD CONSTRAINT customers_status_lifecycle_check
    CHECK (status IN ('active', 'inactive', 'suspended', 'archived'));
ALTER TABLE customers
    ADD CONSTRAINT customers_archive_metadata_check
    CHECK ((status = 'archived') = (archived_at IS NOT NULL AND archived_by IS NOT NULL));
ALTER TABLE customers
    ADD CONSTRAINT customers_archived_by_fkey
    FOREIGN KEY (archived_by) REFERENCES users(id);

CREATE TABLE customer_branch_history (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    customer_id UUID NOT NULL REFERENCES customers(id),
    branch_id UUID NOT NULL REFERENCES branches(id),
    started_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    ended_at TIMESTAMPTZ,
    assigned_by UUID REFERENCES users(id),
    reason TEXT,
    CHECK (ended_at IS NULL OR ended_at >= started_at)
);
CREATE UNIQUE INDEX idx_customer_branch_history_one_active
    ON customer_branch_history(customer_id, branch_id)
    WHERE ended_at IS NULL;
CREATE INDEX idx_customer_branch_history_customer
    ON customer_branch_history(customer_id, started_at DESC);

-- Seed the initial assignment for existing customers. The NOT EXISTS guard
-- keeps this safe if the migration is resumed after the insert has succeeded.
INSERT INTO customer_branch_history (customer_id, branch_id, started_at, reason)
SELECT c.id, c.branch_id, c.created_at, 'Initial branch assignment'
FROM customers c
WHERE NOT EXISTS (
    SELECT 1
    FROM customer_branch_history h
    WHERE h.customer_id = c.id
      AND h.branch_id = c.branch_id
      AND h.ended_at IS NULL
);

ALTER TABLE membership_plans
    ADD COLUMN IF NOT EXISTS archived_at TIMESTAMPTZ,
    ADD COLUMN IF NOT EXISTS archived_by UUID,
    ADD COLUMN IF NOT EXISTS archive_reason TEXT,
    ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP;
ALTER TABLE membership_plans
    DROP CONSTRAINT IF EXISTS membership_plans_status_check;
ALTER TABLE membership_plans
    ADD CONSTRAINT membership_plans_status_lifecycle_check
    CHECK (status IN ('active', 'inactive', 'archived'));
ALTER TABLE membership_plans
    ADD CONSTRAINT membership_plans_archive_metadata_check
    CHECK ((status = 'archived') = (archived_at IS NOT NULL AND archived_by IS NOT NULL));
ALTER TABLE membership_plans
    ADD CONSTRAINT membership_plans_archived_by_fkey
    FOREIGN KEY (archived_by) REFERENCES users(id);

ALTER TABLE coaches
    ADD COLUMN IF NOT EXISTS archived_at TIMESTAMPTZ,
    ADD COLUMN IF NOT EXISTS archived_by UUID,
    ADD COLUMN IF NOT EXISTS archive_reason TEXT,
    ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP;
ALTER TABLE coaches
    DROP CONSTRAINT IF EXISTS coaches_status_check;
ALTER TABLE coaches
    ADD CONSTRAINT coaches_status_lifecycle_check
    CHECK (status IN ('active', 'inactive', 'archived'));
ALTER TABLE coaches
    ADD CONSTRAINT coaches_archive_metadata_check
    CHECK ((status = 'archived') = (archived_at IS NOT NULL AND archived_by IS NOT NULL));
ALTER TABLE coaches
    ADD CONSTRAINT coaches_archived_by_fkey
    FOREIGN KEY (archived_by) REFERENCES users(id);

CREATE UNIQUE INDEX idx_coach_branch_assignments_one_active
    ON coach_branch_assignments(coach_id, branch_id)
    WHERE end_date IS NULL;
CREATE INDEX idx_coach_branch_assignments_branch_dates
    ON coach_branch_assignments(branch_id, start_date, end_date);

CREATE TABLE walk_ins (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    customer_id UUID NOT NULL REFERENCES customers(id),
    branch_id UUID NOT NULL REFERENCES branches(id),
    transaction_id UUID REFERENCES transactions(id),
    service_name TEXT NOT NULL,
    time_in TIMESTAMPTZ,
    time_out TIMESTAMPTZ,
    fee NUMERIC(12, 2) NOT NULL DEFAULT 0,
    payment_status TEXT NOT NULL DEFAULT 'pending',
    status TEXT NOT NULL DEFAULT 'registered',
    payment_method_id UUID REFERENCES payment_methods(id) ON DELETE SET NULL,
    created_by UUID REFERENCES users(id),
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CHECK (fee >= 0),
    CHECK (time_out IS NULL OR time_in IS NOT NULL AND time_out >= time_in),
    CHECK (payment_status IN ('pending', 'paid', 'refunded', 'voided')),
    CHECK (status IN ('registered', 'checked_in', 'completed', 'cancelled', 'voided'))
);
CREATE INDEX idx_walk_ins_branch_created ON walk_ins(branch_id, created_at DESC);
CREATE INDEX idx_walk_ins_customer_created ON walk_ins(customer_id, created_at DESC);

ALTER TABLE walk_ins DROP CONSTRAINT IF EXISTS walk_ins_transaction_id_fkey;
ALTER TABLE transactions
    ADD CONSTRAINT transactions_id_customer_branch_key UNIQUE (id, customer_id, branch_id);
ALTER TABLE walk_ins
    ADD CONSTRAINT walk_ins_transaction_customer_branch_fkey
    FOREIGN KEY (transaction_id, customer_id, branch_id)
    REFERENCES transactions(id, customer_id, branch_id);
CREATE UNIQUE INDEX idx_walk_ins_one_transaction
    ON walk_ins(transaction_id)
    WHERE transaction_id IS NOT NULL;

CREATE FUNCTION enforce_walk_in_transaction_type()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
    IF NEW.transaction_id IS NOT NULL AND NOT EXISTS (
        SELECT 1 FROM transactions t
        WHERE t.id = NEW.transaction_id AND t.transaction_type = 'walk_in'
    ) THEN
        RAISE EXCEPTION 'walk-in % must reference a walk_in transaction', NEW.id;
    END IF;
    RETURN NEW;
END;
$$;
CREATE TRIGGER trg_enforce_walk_in_transaction_type
BEFORE INSERT OR UPDATE OF transaction_id ON walk_ins
FOR EACH ROW EXECUTE FUNCTION enforce_walk_in_transaction_type();

CREATE FUNCTION prevent_walk_in_transaction_reclassification()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
    IF NEW.transaction_type <> 'walk_in'
       AND EXISTS (SELECT 1 FROM walk_ins w WHERE w.transaction_id = NEW.id) THEN
        RAISE EXCEPTION 'a transaction linked to a walk-in cannot be reclassified';
    END IF;
    RETURN NEW;
END;
$$;
CREATE TRIGGER trg_prevent_walk_in_transaction_reclassification
BEFORE UPDATE OF transaction_type ON transactions
FOR EACH ROW EXECUTE FUNCTION prevent_walk_in_transaction_reclassification();

ALTER TABLE attendance_records
    ADD COLUMN IF NOT EXISTS walk_in_id UUID REFERENCES walk_ins(id);
ALTER TABLE attendance_records
    ADD CONSTRAINT attendance_records_device_id_fkey
    FOREIGN KEY (device_id) REFERENCES rfid_devices(id);
CREATE INDEX idx_attendance_walk_in ON attendance_records(walk_in_id) WHERE walk_in_id IS NOT NULL;
CREATE UNIQUE INDEX idx_walk_in_one_active_attendance
    ON attendance_records(walk_in_id)
    WHERE walk_in_id IS NOT NULL AND status <> 'voided';

ALTER TABLE rfid_assignments
    ADD CONSTRAINT rfid_assignments_deactivated_metadata_check
    CHECK ((deactivated_at IS NULL) = (deactivated_by IS NULL));
CREATE INDEX idx_rfid_assignments_customer_history
    ON rfid_assignments(customer_id, assigned_at DESC);
CREATE INDEX idx_rfid_events_status_time
    ON rfid_events(processing_status, occurred_at);

ALTER TABLE transactions
    ADD CONSTRAINT transactions_total_nonnegative_check
    CHECK (total_amount >= 0);
CREATE INDEX idx_payment_allocations_payment ON payment_allocations(payment_id);
CREATE INDEX idx_reminders_branch_status ON membership_reminders(status, eligible_at);

ALTER TABLE membership_reminders
    ADD CONSTRAINT membership_reminders_membership_customer_fkey
    FOREIGN KEY (membership_id, customer_id) REFERENCES memberships(id, customer_id);

ALTER TABLE membership_plan_prices
    DROP CONSTRAINT IF EXISTS ex_membership_plan_prices_global_effective_dates,
    DROP CONSTRAINT IF EXISTS ex_membership_plan_prices_branch_effective_dates;
ALTER TABLE membership_plan_prices
    ADD CONSTRAINT ex_membership_plan_prices_global_effective_dates
    EXCLUDE USING gist (
        plan_id WITH =,
        customer_type WITH =,
        daterange(effective_from, effective_to, '[)') WITH &&
    ) WHERE (is_active AND branch_id IS NULL),
    ADD CONSTRAINT ex_membership_plan_prices_branch_effective_dates
    EXCLUDE USING gist (
        plan_id WITH =,
        customer_type WITH =,
        branch_id WITH =,
        daterange(effective_from, effective_to, '[)') WITH &&
    ) WHERE (is_active AND branch_id IS NOT NULL);

CREATE INDEX idx_customers_active_branch
    ON customers(branch_id, updated_at DESC)
    WHERE status <> 'archived';
CREATE INDEX idx_membership_plans_active
    ON membership_plans(status, name)
    WHERE status <> 'archived';
