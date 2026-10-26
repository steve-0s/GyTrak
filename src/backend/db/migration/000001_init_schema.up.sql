CREATE EXTENSION IF NOT EXISTS pgcrypto;
CREATE EXTENSION IF NOT EXISTS btree_gist;

CREATE TABLE users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    full_name TEXT NOT NULL,
    email TEXT NOT NULL UNIQUE,
    password_hash TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'active',
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CHECK (status IN ('active', 'inactive', 'suspended'))
);

CREATE TABLE roles (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL UNIQUE,
    description TEXT
);

CREATE TABLE user_roles (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL,
    role_id UUID NOT NULL,
    assigned_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    revoked_at TIMESTAMPTZ,

    FOREIGN KEY (user_id) REFERENCES users(id),
    FOREIGN KEY (role_id) REFERENCES roles(id),
    CHECK (revoked_at IS NULL OR revoked_at >= assigned_at)
);

CREATE UNIQUE INDEX idx_user_roles_one_active_assignment
    ON user_roles(user_id, role_id)
    WHERE revoked_at IS NULL;

CREATE TABLE branches (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    address TEXT,
    phone TEXT,
    status TEXT NOT NULL DEFAULT 'active',
    archived_at TIMESTAMPTZ,
    archived_by UUID,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    FOREIGN KEY (archived_by) REFERENCES users(id),

    CHECK (status IN ('active', 'inactive', 'archived')),
    CHECK (
        (status = 'archived' AND archived_at IS NOT NULL AND archived_by IS NOT NULL)
        OR (status <> 'archived' AND archived_at IS NULL AND archived_by IS NULL)
    )
);

CREATE TABLE user_branch_assignments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL,
    branch_id UUID NOT NULL,
    assigned_by UUID,
    assigned_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    revoked_at TIMESTAMPTZ,

    FOREIGN KEY (user_id) REFERENCES users(id),
    FOREIGN KEY (branch_id) REFERENCES branches(id),
    FOREIGN KEY (assigned_by) REFERENCES users(id),

    CHECK (revoked_at IS NULL OR revoked_at >= assigned_at)
);

CREATE UNIQUE INDEX idx_user_branch_assignments_one_active
    ON user_branch_assignments(user_id, branch_id)
    WHERE revoked_at IS NULL;

CREATE INDEX idx_user_branch_assignments_branch_active
    ON user_branch_assignments(branch_id, user_id)
    WHERE revoked_at IS NULL;

CREATE TABLE customers (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    customer_code TEXT NOT NULL UNIQUE,
    branch_id UUID NOT NULL,
    first_name TEXT NOT NULL,
    last_name TEXT NOT NULL,
    phone TEXT,
    email TEXT,
    birth_date DATE,
    customer_type TEXT NOT NULL DEFAULT 'regular',
    photo_key TEXT,
    status TEXT NOT NULL DEFAULT 'active',
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    FOREIGN KEY (branch_id) REFERENCES branches(id),

    CHECK (customer_type IN ('regular', 'student')),
    CHECK (status IN ('active', 'inactive', 'suspended'))
);

CREATE TABLE coaches (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    coach_code TEXT NOT NULL UNIQUE,
    first_name TEXT NOT NULL,
    last_name TEXT NOT NULL,
    phone TEXT,
    email TEXT,
    photo_key TEXT,
    status TEXT NOT NULL DEFAULT 'active',
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CHECK (status IN ('active', 'inactive'))
);

CREATE TABLE coach_branch_assignments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    coach_id UUID NOT NULL,
    branch_id UUID NOT NULL,
    start_date DATE NOT NULL DEFAULT CURRENT_DATE,
    end_date DATE,

    FOREIGN KEY (coach_id) REFERENCES coaches(id),
    FOREIGN KEY (branch_id) REFERENCES branches(id),

    CHECK (end_date IS NULL OR end_date >= start_date)
);

CREATE TABLE membership_plans (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    duration_value INTEGER NOT NULL,
    duration_unit TEXT NOT NULL DEFAULT 'months',
    includes_coaching BOOLEAN NOT NULL DEFAULT FALSE,
    promotion_eligible BOOLEAN NOT NULL DEFAULT TRUE,
    promotion_name TEXT,
    promotion_code TEXT,
    promotion_discount_percent NUMERIC(5, 2) NOT NULL DEFAULT 0,
    free_intro_months INTEGER NOT NULL DEFAULT 0,
    billing_start_mode TEXT NOT NULL DEFAULT 'after_intro',
    custom_first_billing_date DATE,
    status TEXT NOT NULL DEFAULT 'active',
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CHECK (duration_value > 0),
    CHECK (duration_unit IN ('days', 'months')),
    CHECK (promotion_discount_percent BETWEEN 0 AND 100),
    CHECK (free_intro_months BETWEEN 0 AND 12),
    CHECK (billing_start_mode IN ('immediate', 'after_intro', 'custom_date')),
    CHECK ((billing_start_mode = 'custom_date') = (custom_first_billing_date IS NOT NULL)),
    CHECK (status IN ('active', 'inactive'))
);

CREATE UNIQUE INDEX idx_membership_plans_normalized_name
    ON membership_plans(lower(trim(name)));

CREATE TABLE membership_plan_prices (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    plan_id UUID NOT NULL,
    customer_type TEXT NOT NULL,
    branch_id UUID,
    monthly_dues NUMERIC(12, 2) NOT NULL,
    initiation_fee NUMERIC(12, 2) NOT NULL DEFAULT 0,
    renewal_monthly_dues NUMERIC(12, 2),
    renewal_initiation_fee NUMERIC(12, 2),
    currency CHAR(3) NOT NULL DEFAULT 'PHP',
    effective_from DATE NOT NULL,
    effective_to DATE,
    is_active BOOLEAN NOT NULL DEFAULT TRUE,

    FOREIGN KEY (plan_id) REFERENCES membership_plans(id),
    FOREIGN KEY (branch_id) REFERENCES branches(id),

    CHECK (customer_type IN ('regular', 'student')),
    CHECK (monthly_dues >= 0),
    CHECK (initiation_fee >= 0),
    CHECK (renewal_monthly_dues IS NULL OR renewal_monthly_dues >= 0),
    CHECK (renewal_initiation_fee IS NULL OR renewal_initiation_fee >= 0),
    CHECK (effective_to IS NULL OR effective_to >= effective_from)
);

ALTER TABLE membership_plan_prices
    ADD CONSTRAINT ex_membership_plan_prices_global_effective_dates
        EXCLUDE USING gist (
            plan_id WITH =,
            customer_type WITH =,
            daterange(effective_from, effective_to, '[]') WITH &&
        )
        WHERE (is_active AND branch_id IS NULL),
    ADD CONSTRAINT ex_membership_plan_prices_branch_effective_dates
        EXCLUDE USING gist (
            plan_id WITH =,
            customer_type WITH =,
            branch_id WITH =,
            daterange(effective_from, effective_to, '[]') WITH &&
        )
        WHERE (is_active AND branch_id IS NOT NULL);

CREATE TABLE membership_policies (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    branch_id UUID,
    default_duration_value INTEGER NOT NULL DEFAULT 1,
    duration_unit TEXT NOT NULL DEFAULT 'months',
    billing_frequency TEXT NOT NULL DEFAULT 'monthly',
    initiation_fee_policy TEXT NOT NULL DEFAULT 'standard',
    free_intro_months_cap INTEGER NOT NULL DEFAULT 2,
    max_promotion_discount_percent NUMERIC(5, 2) NOT NULL DEFAULT 15,
    renewal_window_days INTEGER NOT NULL DEFAULT 7,
    overdue_access_policy TEXT NOT NULL DEFAULT 'allow_with_manager_review',
    front_desk_can_pause_billing BOOLEAN NOT NULL DEFAULT FALSE,
    allow_custom_billing_start_dates BOOLEAN NOT NULL DEFAULT FALSE,
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    FOREIGN KEY (branch_id) REFERENCES branches(id),

    CHECK (default_duration_value > 0),
    CHECK (duration_unit IN ('days', 'months')),
    CHECK (billing_frequency IN ('weekly', 'monthly', 'quarterly', 'annual')),
    CHECK (initiation_fee_policy IN ('standard', 'waive_first_month', 'campaign_waiver')),
    CHECK (free_intro_months_cap BETWEEN 0 AND 12),
    CHECK (max_promotion_discount_percent BETWEEN 0 AND 100),
    CHECK (renewal_window_days BETWEEN 1 AND 30),
    CHECK (overdue_access_policy IN (
        'restrict_access',
        'allow_with_manager_review',
        'allow_with_warning'
    ))
);

CREATE UNIQUE INDEX idx_membership_policies_active_branch
    ON membership_policies(branch_id)
    WHERE is_active AND branch_id IS NOT NULL;

CREATE UNIQUE INDEX idx_membership_policies_active_global
    ON membership_policies((branch_id IS NULL))
    WHERE is_active AND branch_id IS NULL;

CREATE TABLE memberships (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    customer_id UUID NOT NULL,
    branch_id UUID NOT NULL,
    plan_id UUID NOT NULL,
    renewal_of_membership_id UUID,
    customer_type TEXT NOT NULL,
    duration_value INTEGER NOT NULL,
    duration_unit TEXT NOT NULL DEFAULT 'months',
    monthly_dues NUMERIC(12, 2) NOT NULL,
    initiation_fee NUMERIC(12, 2) NOT NULL DEFAULT 0,
    initiation_fee_waived_amount NUMERIC(12, 2) NOT NULL DEFAULT 0,
    promotion_name TEXT,
    promotion_code TEXT,
    promotion_discount_percent NUMERIC(5, 2) NOT NULL DEFAULT 0,
    free_intro_months INTEGER NOT NULL DEFAULT 0,
    billing_start_mode TEXT NOT NULL DEFAULT 'after_intro',
    first_billing_date DATE,
    initial_amount_due NUMERIC(12, 2) NOT NULL DEFAULT 0,
    outstanding_balance NUMERIC(12, 2) NOT NULL DEFAULT 0,
    initiation_fee_outstanding NUMERIC(12, 2) NOT NULL DEFAULT 0,
    monthly_dues_outstanding NUMERIC(12, 2) NOT NULL DEFAULT 0,
    billing_paused BOOLEAN NOT NULL DEFAULT FALSE,
    payment_status TEXT NOT NULL DEFAULT 'pending',
    next_payment_due_date DATE,
    renewal_eligible BOOLEAN NOT NULL DEFAULT FALSE,
    status TEXT NOT NULL DEFAULT 'pending_payment',
    start_date DATE NOT NULL,
    end_date DATE NOT NULL,
    created_by UUID,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    FOREIGN KEY (customer_id) REFERENCES customers(id),
    FOREIGN KEY (branch_id) REFERENCES branches(id),
    FOREIGN KEY (plan_id) REFERENCES membership_plans(id),
    FOREIGN KEY (renewal_of_membership_id, customer_id)
        REFERENCES memberships(id, customer_id),
    FOREIGN KEY (created_by) REFERENCES users(id),

    UNIQUE (id, customer_id),
    UNIQUE (id, customer_id, branch_id),
    CHECK (customer_type IN ('regular', 'student')),
    CHECK (duration_value > 0),
    CHECK (duration_unit IN ('days', 'months')),
    CHECK (monthly_dues >= 0),
    CHECK (initiation_fee >= 0),
    CHECK (initiation_fee_waived_amount BETWEEN 0 AND initiation_fee),
    CHECK (promotion_discount_percent BETWEEN 0 AND 100),
    CHECK (free_intro_months BETWEEN 0 AND 12),
    CHECK (billing_start_mode IN ('immediate', 'after_intro', 'custom_date')),
    CHECK (initial_amount_due >= 0),
    CHECK (outstanding_balance >= 0),
    CHECK (initiation_fee_outstanding >= 0),
    CHECK (monthly_dues_outstanding >= 0),
    CHECK (initiation_fee_outstanding + monthly_dues_outstanding = outstanding_balance),
    CHECK (billing_start_mode <> 'custom_date' OR first_billing_date IS NOT NULL),
    CHECK (payment_status IN ('pending', 'partially_paid', 'paid', 'overdue', 'refunded')),
    CHECK (end_date >= start_date),
    CHECK (renewal_of_membership_id IS NULL OR renewal_of_membership_id <> id),
    CHECK (status IN (
        'pending_payment',
        'active',
        'expired',
        'cancelled',
        'suspended'
    ))
);

CREATE TABLE membership_periods (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    membership_id UUID NOT NULL,
    period_number INTEGER NOT NULL,
    start_date DATE NOT NULL,
    end_date DATE NOT NULL,
    due_date DATE,
    list_price NUMERIC(12, 2) NOT NULL,
    price_charged NUMERIC(12, 2) NOT NULL,
    discount_amount NUMERIC(12, 2) NOT NULL DEFAULT 0,
    waived_amount NUMERIC(12, 2) NOT NULL DEFAULT 0,
    is_free_intro BOOLEAN NOT NULL DEFAULT FALSE,
    billing_status TEXT NOT NULL DEFAULT 'pending',
    status TEXT NOT NULL DEFAULT 'pending_payment',
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    FOREIGN KEY (membership_id) REFERENCES memberships(id),

    UNIQUE (membership_id, period_number),

    CHECK (period_number > 0),
    CHECK (end_date >= start_date),
    CHECK (list_price >= 0),
    CHECK (price_charged >= 0),
    CHECK (discount_amount >= 0),
    CHECK (waived_amount >= 0),
    CHECK (price_charged + discount_amount + waived_amount = list_price),
    CHECK (NOT is_free_intro OR (price_charged = 0 AND waived_amount = list_price)),
    CHECK (billing_status IN ('pending', 'partially_paid', 'paid', 'waived', 'overdue')),
    CHECK (status IN (
        'pending_payment',
        'active',
        'expired',
        'cancelled'
    ))
);

CREATE TABLE transactions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    branch_id UUID NOT NULL,
    customer_id UUID NOT NULL,
    membership_id UUID,
    transaction_type TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'pending',
    subtotal NUMERIC(12, 2) NOT NULL,
    discount_amount NUMERIC(12, 2) NOT NULL DEFAULT 0,
    total_amount NUMERIC(12, 2) NOT NULL,
    currency CHAR(3) NOT NULL DEFAULT 'PHP',
    created_by UUID,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    FOREIGN KEY (branch_id) REFERENCES branches(id),
    FOREIGN KEY (customer_id) REFERENCES customers(id),
    FOREIGN KEY (membership_id, customer_id, branch_id)
        REFERENCES memberships(id, customer_id, branch_id),
    FOREIGN KEY (created_by) REFERENCES users(id),

    CHECK (transaction_type IN ('membership', 'walk_in')),
    CHECK (
        (transaction_type = 'membership' AND membership_id IS NOT NULL)
        OR (transaction_type = 'walk_in' AND membership_id IS NULL)
    ),
    CHECK (status IN ('pending', 'partially_paid', 'paid', 'cancelled', 'refunded')),
    CHECK (subtotal >= 0),
    CHECK (discount_amount >= 0),
    CHECK (discount_amount <= subtotal),
    CHECK (total_amount >= 0)
);

CREATE TABLE transaction_items (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    transaction_id UUID NOT NULL,
    item_type TEXT NOT NULL,
    description TEXT NOT NULL,
    quantity NUMERIC(10, 2) NOT NULL DEFAULT 1,
    unit_price NUMERIC(12, 2) NOT NULL,
    line_total NUMERIC(12, 2) NOT NULL,
    membership_period_id UUID,
    coach_id UUID,

    FOREIGN KEY (transaction_id) REFERENCES transactions(id),
    FOREIGN KEY (membership_period_id) REFERENCES membership_periods(id),
    FOREIGN KEY (coach_id) REFERENCES coaches(id),

    CHECK (item_type IN (
        'monthly_dues',
        'initiation_fee',
        'renewal_fee',
        'walk_in',
        'coaching',
        'other_service'
    )),
    CHECK (quantity > 0),
    CHECK (unit_price >= 0),
    CHECK (line_total >= 0)
);

CREATE TABLE payment_methods (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    code TEXT NOT NULL UNIQUE,
    name TEXT NOT NULL,
    description TEXT,
    branch_id UUID,
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    created_by UUID,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    FOREIGN KEY (branch_id) REFERENCES branches(id),
    FOREIGN KEY (created_by) REFERENCES users(id),

    CHECK (length(trim(code)) > 0),
    CHECK (length(trim(name)) > 0)
);

CREATE UNIQUE INDEX idx_payment_methods_global_name
    ON payment_methods(lower(name))
    WHERE branch_id IS NULL AND is_active;

CREATE UNIQUE INDEX idx_payment_methods_branch_name
    ON payment_methods(branch_id, lower(name))
    WHERE branch_id IS NOT NULL AND is_active;

CREATE TABLE payments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    transaction_id UUID NOT NULL,
    amount NUMERIC(12, 2) NOT NULL,
    payment_method_id UUID,
    payment_method TEXT NOT NULL,
    payment_method_code_snapshot TEXT,
    status TEXT NOT NULL DEFAULT 'pending',
    reference_number TEXT,
    received_by UUID,
    paid_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    FOREIGN KEY (transaction_id) REFERENCES transactions(id),
    FOREIGN KEY (payment_method_id) REFERENCES payment_methods(id) ON DELETE SET NULL,
    FOREIGN KEY (received_by) REFERENCES users(id),

    UNIQUE (id, transaction_id),
    CHECK (amount > 0),
    CHECK (length(trim(payment_method)) > 0),
    CHECK (status IN ('pending', 'completed', 'failed', 'cancelled', 'refunded'))
);

CREATE INDEX idx_payments_payment_method_id ON payments(payment_method_id);

CREATE TABLE membership_billing_pauses (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    membership_id UUID NOT NULL,
    start_date DATE NOT NULL,
    expected_resume_date DATE,
    resumed_at DATE,
    reason TEXT NOT NULL,
    recorded_by UUID,
    resumed_by UUID,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    FOREIGN KEY (membership_id) REFERENCES memberships(id),
    FOREIGN KEY (recorded_by) REFERENCES users(id),
    FOREIGN KEY (resumed_by) REFERENCES users(id),

    CHECK (length(trim(reason)) > 0),
    CHECK (expected_resume_date IS NULL OR expected_resume_date >= start_date),
    CHECK (resumed_at IS NULL OR resumed_at >= start_date),
    CHECK ((resumed_at IS NULL) = (resumed_by IS NULL))
);

CREATE UNIQUE INDEX idx_membership_billing_pauses_one_open
    ON membership_billing_pauses(membership_id)
    WHERE resumed_at IS NULL;

CREATE INDEX idx_membership_billing_pauses_membership_start
    ON membership_billing_pauses(membership_id, start_date DESC);

CREATE TABLE payment_allocations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    payment_id UUID NOT NULL,
    transaction_id UUID NOT NULL,
    amount NUMERIC(12, 2) NOT NULL,

    FOREIGN KEY (payment_id, transaction_id)
        REFERENCES payments(id, transaction_id),
    FOREIGN KEY (transaction_id) REFERENCES transactions(id),

    UNIQUE (payment_id, transaction_id),
    CHECK (amount > 0)
);

CREATE FUNCTION enforce_payment_allocation_amount()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
DECLARE
    payment_amount NUMERIC(12, 2);
    allocated_amount NUMERIC(12, 2);
BEGIN
    PERFORM p.id
    FROM payments p
    WHERE p.id = NEW.payment_id
       OR (TG_OP = 'UPDATE' AND p.id = OLD.payment_id)
    ORDER BY p.id
    FOR UPDATE;

    SELECT p.amount
    INTO payment_amount
    FROM payments p
    WHERE p.id = NEW.payment_id;

    IF NOT FOUND THEN
        RAISE EXCEPTION 'payment % does not exist', NEW.payment_id;
    END IF;

    SELECT COALESCE(SUM(pa.amount), 0)
    INTO allocated_amount
    FROM payment_allocations pa
    WHERE pa.payment_id = NEW.payment_id
      AND (TG_OP = 'INSERT' OR pa.id <> NEW.id);

    IF allocated_amount + NEW.amount > payment_amount THEN
        RAISE EXCEPTION 'payment allocations cannot exceed the payment amount';
    END IF;

    RETURN NEW;
END;
$$;

CREATE TRIGGER trg_enforce_payment_allocation_amount
BEFORE INSERT OR UPDATE ON payment_allocations
FOR EACH ROW
EXECUTE FUNCTION enforce_payment_allocation_amount();

CREATE FUNCTION enforce_payment_amount_not_below_allocations()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
DECLARE
    allocated_amount NUMERIC(12, 2);
BEGIN
    SELECT COALESCE(SUM(pa.amount), 0)
    INTO allocated_amount
    FROM payment_allocations pa
    WHERE pa.payment_id = NEW.id;

    IF allocated_amount > NEW.amount THEN
        RAISE EXCEPTION 'payment amount cannot be less than its allocated amount';
    END IF;

    RETURN NEW;
END;
$$;

CREATE TRIGGER trg_enforce_payment_amount_not_below_allocations
BEFORE UPDATE OF amount ON payments
FOR EACH ROW
EXECUTE FUNCTION enforce_payment_amount_not_below_allocations();

CREATE TABLE transaction_adjustments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    transaction_id UUID NOT NULL,
    payment_id UUID,
    adjustment_type TEXT NOT NULL,
    direction TEXT NOT NULL DEFAULT 'decrease',
    amount NUMERIC(12, 2) NOT NULL,
    reason TEXT NOT NULL,
    created_by UUID,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    FOREIGN KEY (transaction_id) REFERENCES transactions(id),
    FOREIGN KEY (payment_id, transaction_id)
        REFERENCES payment_allocations(payment_id, transaction_id),
    FOREIGN KEY (created_by) REFERENCES users(id),

    CHECK (adjustment_type IN ('discount', 'refund', 'correction', 'waiver')),
    CHECK (direction IN ('increase', 'decrease')),
    CHECK (adjustment_type <> 'refund' OR payment_id IS NOT NULL),
    CHECK (adjustment_type = 'correction' OR direction = 'decrease'),
    CHECK (amount > 0)
);

CREATE TABLE attendance_records (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    customer_id UUID NOT NULL,
    branch_id UUID NOT NULL,
    business_date DATE NOT NULL,
    time_in TIMESTAMPTZ NOT NULL,
    time_out TIMESTAMPTZ,
    source TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'checked_in',
    sync_status TEXT NOT NULL DEFAULT 'synced',
    device_id UUID,
    created_by UUID,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    voided_at TIMESTAMPTZ,
    voided_by UUID,
    void_reason TEXT,

    FOREIGN KEY (customer_id) REFERENCES customers(id),
    FOREIGN KEY (branch_id) REFERENCES branches(id),
    FOREIGN KEY (created_by) REFERENCES users(id),
    FOREIGN KEY (voided_by) REFERENCES users(id),

    CHECK (time_out IS NULL OR time_out >= time_in),
    CHECK (source IN ('rfid', 'manual')),
    CHECK (status IN ('checked_in', 'completed', 'voided')),
    CHECK (sync_status IN ('synced', 'pending', 'failed')),
    CHECK (
        (status <> 'voided')
        OR (voided_at IS NOT NULL AND void_reason IS NOT NULL)
    )
);

CREATE TABLE attendance_corrections (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    attendance_id UUID NOT NULL,
    changed_by UUID NOT NULL,
    reason TEXT NOT NULL,
    old_values JSONB NOT NULL,
    new_values JSONB NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    FOREIGN KEY (attendance_id) REFERENCES attendance_records(id),
    FOREIGN KEY (changed_by) REFERENCES users(id)
);

CREATE TABLE rfid_keyfobs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    uid TEXT NOT NULL UNIQUE,
    status TEXT NOT NULL DEFAULT 'active',
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CHECK (status IN ('active', 'inactive'))
);

CREATE TABLE rfid_assignments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    keyfob_id UUID NOT NULL,
    customer_id UUID NOT NULL,
    branch_id UUID NOT NULL,
    assigned_by UUID,
    assigned_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    deactivated_by UUID,
    deactivated_at TIMESTAMPTZ,
    reason TEXT,

    FOREIGN KEY (keyfob_id) REFERENCES rfid_keyfobs(id),
    FOREIGN KEY (customer_id) REFERENCES customers(id),
    FOREIGN KEY (branch_id) REFERENCES branches(id),
    FOREIGN KEY (assigned_by) REFERENCES users(id),
    FOREIGN KEY (deactivated_by) REFERENCES users(id),

    CHECK (deactivated_at IS NULL OR deactivated_at >= assigned_at)
);

CREATE TABLE rfid_devices (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    branch_id UUID NOT NULL,
    device_name TEXT NOT NULL,
    device_type TEXT NOT NULL,
    device_identifier TEXT NOT NULL UNIQUE,
    status TEXT NOT NULL DEFAULT 'active',
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    FOREIGN KEY (branch_id) REFERENCES branches(id),

    CHECK (device_type IN ('attendance_scanner', 'assignment_scanner')),
    CHECK (status IN ('active', 'inactive'))
);

CREATE TABLE rfid_events (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    device_id UUID NOT NULL,
    event_id TEXT NOT NULL,
    uid TEXT NOT NULL,
    event_type TEXT NOT NULL,
    occurred_at TIMESTAMPTZ NOT NULL,
    processed_at TIMESTAMPTZ,
    processing_status TEXT NOT NULL DEFAULT 'pending',
    attendance_id UUID,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    FOREIGN KEY (device_id) REFERENCES rfid_devices(id),
    FOREIGN KEY (attendance_id) REFERENCES attendance_records(id),

    UNIQUE (device_id, event_id),

    CHECK (event_type IN ('attendance_scan', 'assignment_scan')),
    CHECK (processing_status IN ('pending', 'processed', 'failed', 'ignored'))
);

CREATE TABLE reminder_templates (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    channel TEXT NOT NULL,
    subject_template TEXT,
    body_template TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'active',

    CHECK (channel IN ('in_app', 'email', 'sms')),
    CHECK (status IN ('active', 'inactive'))
);

CREATE TABLE membership_reminders (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    membership_id UUID NOT NULL,
    customer_id UUID NOT NULL,
    scheduled_at TIMESTAMPTZ,
    stage TEXT NOT NULL DEFAULT 'due_today',
    source TEXT NOT NULL DEFAULT 'manual',
    channel TEXT NOT NULL DEFAULT 'in_app',
    eligible_at TIMESTAMPTZ,
    message TEXT NOT NULL DEFAULT '',
    reason TEXT,
    note TEXT,
    status TEXT NOT NULL DEFAULT 'pending',
    template_id UUID,
    created_by UUID,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    FOREIGN KEY (membership_id) REFERENCES memberships(id),
    FOREIGN KEY (customer_id) REFERENCES customers(id),
    FOREIGN KEY (template_id) REFERENCES reminder_templates(id),
    FOREIGN KEY (created_by) REFERENCES users(id),

    CHECK (stage IN (
        'seven_days_before',
        'three_days_before',
        'due_today',
        'one_day_overdue',
        'three_days_overdue'
    )),
    CHECK (source IN ('manual', 'simulated_automatic')),
    CHECK (channel IN ('in_app', 'email', 'sms')),
    CHECK (status IN (
        'scheduled',
        'simulated',
        'failed',
        'skipped',
        'cancelled',
        'pending',
        'sent',
        'expired'
    ))
);

CREATE TABLE reminder_attempts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    reminder_id UUID NOT NULL,
    channel TEXT NOT NULL,
    status TEXT NOT NULL,
    attempted_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    result_details JSONB,

    FOREIGN KEY (reminder_id) REFERENCES membership_reminders(id),

    CHECK (channel IN ('in_app', 'email', 'sms')),
    CHECK (status IN ('pending', 'sent', 'failed'))
);

CREATE TABLE notifications (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    recipient_user_id UUID NOT NULL,
    branch_id UUID,
    notification_type TEXT NOT NULL,
    title TEXT NOT NULL,
    message TEXT NOT NULL,
    entity_type TEXT,
    entity_id UUID,
    read_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    FOREIGN KEY (recipient_user_id) REFERENCES users(id),
    FOREIGN KEY (branch_id) REFERENCES branches(id),

    CHECK (notification_type IN (
        'membership',
        'payment',
        'walk-in',
        'attendance',
        'rfid',
        'scanner',
        'reminder'
    ))
);

CREATE TABLE audit_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    actor_user_id UUID,
    actor_type TEXT NOT NULL DEFAULT 'user',
    action TEXT NOT NULL,
    entity_type TEXT NOT NULL,
    entity_id UUID,
    old_values JSONB,
    new_values JSONB,
    reason TEXT,
    branch_id UUID,
    request_id UUID,
    occurred_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    FOREIGN KEY (actor_user_id) REFERENCES users(id),
    FOREIGN KEY (branch_id) REFERENCES branches(id),

    CHECK (actor_type IN ('user', 'system', 'public'))
);

CREATE INDEX idx_memberships_customer
    ON memberships(customer_id);

CREATE INDEX idx_memberships_branch_status
    ON memberships(branch_id, status);

CREATE INDEX idx_memberships_end_date
    ON memberships(end_date);

CREATE INDEX idx_transactions_branch_created
    ON transactions(branch_id, created_at);

CREATE INDEX idx_payments_transaction_status
    ON payments(transaction_id, status);

CREATE INDEX idx_transactions_membership_created
    ON transactions(membership_id, created_at DESC)
    WHERE membership_id IS NOT NULL;

CREATE INDEX idx_payment_allocations_transaction
    ON payment_allocations(transaction_id);

CREATE INDEX idx_membership_plan_prices_effective
    ON membership_plan_prices(plan_id, customer_type, branch_id, effective_from DESC)
    WHERE is_active;

CREATE UNIQUE INDEX idx_memberships_one_renewal
    ON memberships(renewal_of_membership_id)
    WHERE renewal_of_membership_id IS NOT NULL;

CREATE INDEX idx_membership_periods_billing
    ON membership_periods(membership_id, due_date, billing_status);

CREATE INDEX idx_branches_status
    ON branches(status);

CREATE INDEX idx_customers_branch
    ON customers(branch_id);

CREATE INDEX idx_audit_logs_branch_occurred
    ON audit_logs(branch_id, occurred_at DESC);

CREATE INDEX idx_attendance_customer_date
    ON attendance_records(customer_id, business_date);

CREATE INDEX idx_attendance_branch_date
    ON attendance_records(branch_id, business_date);

CREATE UNIQUE INDEX idx_attendance_one_open_session
    ON attendance_records(customer_id, branch_id)
    WHERE time_out IS NULL AND status = 'checked_in';

CREATE UNIQUE INDEX idx_rfid_one_active_assignment
    ON rfid_assignments(keyfob_id)
    WHERE deactivated_at IS NULL;

CREATE INDEX idx_notifications_recipient_created
    ON notifications(recipient_user_id, created_at DESC);

CREATE INDEX idx_audit_logs_entity
    ON audit_logs(entity_type, entity_id, occurred_at DESC);