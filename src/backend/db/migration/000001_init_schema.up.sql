CREATE EXTENSION IF NOT EXISTS pgcrypto;

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
    user_id UUID NOT NULL,
    role_id UUID NOT NULL,

    PRIMARY KEY (user_id, role_id),
    FOREIGN KEY (user_id) REFERENCES users(id),
    FOREIGN KEY (role_id) REFERENCES roles(id)
);

CREATE TABLE branches (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    address TEXT,
    phone TEXT,
    status TEXT NOT NULL DEFAULT 'active',
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CHECK (status IN ('active', 'inactive'))
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

CREATE TABLE customers (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    customer_code TEXT NOT NULL UNIQUE,
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
    duration_months INTEGER NOT NULL,
    includes_coaching BOOLEAN NOT NULL DEFAULT FALSE,
    status TEXT NOT NULL DEFAULT 'active',
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CHECK (duration_months > 0),
    CHECK (status IN ('active', 'inactive'))
);

CREATE TABLE membership_plan_prices (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    plan_id UUID NOT NULL,
    customer_type TEXT NOT NULL,
    branch_id UUID,
    price NUMERIC(12, 2) NOT NULL,
    currency CHAR(3) NOT NULL DEFAULT 'PHP',
    effective_from DATE NOT NULL,
    effective_to DATE,

    FOREIGN KEY (plan_id) REFERENCES membership_plans(id),
    FOREIGN KEY (branch_id) REFERENCES branches(id),

    CHECK (customer_type IN ('regular', 'student')),
    CHECK (price >= 0),
    CHECK (effective_to IS NULL OR effective_to >= effective_from)
);

CREATE TABLE memberships (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    customer_id UUID NOT NULL,
    branch_id UUID NOT NULL,
    plan_id UUID NOT NULL,
    status TEXT NOT NULL DEFAULT 'pending_payment',
    start_date DATE NOT NULL,
    end_date DATE NOT NULL,
    created_by UUID,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    FOREIGN KEY (customer_id) REFERENCES customers(id),
    FOREIGN KEY (branch_id) REFERENCES branches(id),
    FOREIGN KEY (plan_id) REFERENCES membership_plans(id),
    FOREIGN KEY (created_by) REFERENCES users(id),

    CHECK (end_date >= start_date),
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
    price_charged NUMERIC(12, 2) NOT NULL,
    status TEXT NOT NULL DEFAULT 'pending_payment',
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    FOREIGN KEY (membership_id) REFERENCES memberships(id),

    UNIQUE (membership_id, period_number),

    CHECK (period_number > 0),
    CHECK (end_date >= start_date),
    CHECK (price_charged >= 0),
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
    FOREIGN KEY (created_by) REFERENCES users(id),

    CHECK (transaction_type IN ('membership', 'walk_in')),
    CHECK (status IN ('pending', 'partially_paid', 'paid', 'cancelled', 'refunded')),
    CHECK (subtotal >= 0),
    CHECK (discount_amount >= 0),
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

    CHECK (quantity > 0),
    CHECK (unit_price >= 0),
    CHECK (line_total >= 0)
);

CREATE TABLE payments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    transaction_id UUID NOT NULL,
    amount NUMERIC(12, 2) NOT NULL,
    payment_method TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'pending',
    reference_number TEXT,
    received_by UUID,
    paid_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    FOREIGN KEY (transaction_id) REFERENCES transactions(id),
    FOREIGN KEY (received_by) REFERENCES users(id),

    CHECK (amount > 0),
    CHECK (payment_method IN (
        'cash',
        'gcash',
        'bank_transfer',
        'card',
        'other'
    )),
    CHECK (status IN ('pending', 'completed', 'failed', 'cancelled', 'refunded'))
);

CREATE TABLE payment_allocations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    payment_id UUID NOT NULL,
    transaction_id UUID NOT NULL,
    amount NUMERIC(12, 2) NOT NULL,

    FOREIGN KEY (payment_id) REFERENCES payments(id),
    FOREIGN KEY (transaction_id) REFERENCES transactions(id),

    CHECK (amount > 0)
);

CREATE TABLE transaction_adjustments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    transaction_id UUID NOT NULL,
    adjustment_type TEXT NOT NULL,
    amount NUMERIC(12, 2) NOT NULL,
    reason TEXT NOT NULL,
    created_by UUID,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    FOREIGN KEY (transaction_id) REFERENCES transactions(id),
    FOREIGN KEY (created_by) REFERENCES users(id),

    CHECK (adjustment_type IN ('discount', 'refund', 'correction')),
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
    assigned_by UUID,
    assigned_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    deactivated_by UUID,
    deactivated_at TIMESTAMPTZ,
    reason TEXT,

    FOREIGN KEY (keyfob_id) REFERENCES rfid_keyfobs(id),
    FOREIGN KEY (customer_id) REFERENCES customers(id),
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
    status TEXT NOT NULL DEFAULT 'pending',
    template_id UUID,
    created_by UUID,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    FOREIGN KEY (membership_id) REFERENCES memberships(id),
    FOREIGN KEY (customer_id) REFERENCES customers(id),
    FOREIGN KEY (template_id) REFERENCES reminder_templates(id),
    FOREIGN KEY (created_by) REFERENCES users(id),

    CHECK (status IN ('pending', 'sent', 'failed', 'cancelled', 'expired'))
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
    notification_type TEXT NOT NULL,
    title TEXT NOT NULL,
    message TEXT NOT NULL,
    entity_type TEXT,
    entity_id UUID,
    read_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    FOREIGN KEY (recipient_user_id) REFERENCES users(id)
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

CREATE INDEX idx_attendance_customer_date
    ON attendance_records(customer_id, business_date);

CREATE INDEX idx_attendance_branch_date
    ON attendance_records(branch_id, business_date);

CREATE UNIQUE INDEX idx_attendance_one_open_session
    ON attendance_records(customer_id)
    WHERE time_out IS NULL AND status = 'checked_in';

CREATE UNIQUE INDEX idx_rfid_one_active_assignment
    ON rfid_assignments(keyfob_id)
    WHERE deactivated_at IS NULL;

CREATE INDEX idx_notifications_recipient_created
    ON notifications(recipient_user_id, created_at DESC);

CREATE INDEX idx_audit_logs_entity
    ON audit_logs(entity_type, entity_id, occurred_at DESC);