ALTER TABLE membership_plans
    ADD COLUMN duration_unit TEXT NOT NULL DEFAULT 'months',
    ADD COLUMN monthly_dues NUMERIC(12, 2) NOT NULL DEFAULT 0,
    ADD COLUMN initiation_fee NUMERIC(12, 2) NOT NULL DEFAULT 0,
    ADD COLUMN free_intro_months INTEGER NOT NULL DEFAULT 0,
    ADD COLUMN promotion_eligible BOOLEAN NOT NULL DEFAULT TRUE;

ALTER TABLE membership_plans
    ADD CONSTRAINT ck_membership_plans_duration_unit
        CHECK (duration_unit IN ('days', 'months')),
    ADD CONSTRAINT ck_membership_plans_monthly_dues
        CHECK (monthly_dues >= 0),
    ADD CONSTRAINT ck_membership_plans_initiation_fee
        CHECK (initiation_fee >= 0),
    ADD CONSTRAINT ck_membership_plans_free_intro_months
        CHECK (free_intro_months >= 0);

ALTER TABLE membership_plan_prices
    ADD COLUMN monthly_dues NUMERIC(12, 2) NOT NULL DEFAULT 0,
    ADD COLUMN initiation_fee NUMERIC(12, 2) NOT NULL DEFAULT 0,
    ADD COLUMN free_intro_months INTEGER NOT NULL DEFAULT 0,
    ADD COLUMN promotion_eligible BOOLEAN NOT NULL DEFAULT TRUE,
    ADD COLUMN renewal_pricing_override NUMERIC(12, 2),
    ADD COLUMN is_active BOOLEAN NOT NULL DEFAULT TRUE;

ALTER TABLE membership_plan_prices
    ADD CONSTRAINT ck_membership_plan_prices_monthly_dues
        CHECK (monthly_dues >= 0),
    ADD CONSTRAINT ck_membership_plan_prices_initiation_fee
        CHECK (initiation_fee >= 0),
    ADD CONSTRAINT ck_membership_plan_prices_free_intro_months
        CHECK (free_intro_months >= 0),
    ADD CONSTRAINT ck_membership_plan_prices_renewal_pricing_override
        CHECK (renewal_pricing_override IS NULL OR renewal_pricing_override >= 0);

ALTER TABLE memberships
    ADD COLUMN renewal_of_membership_id UUID;

ALTER TABLE memberships
    ADD CONSTRAINT fk_memberships_renewal_of_membership
        FOREIGN KEY (renewal_of_membership_id) REFERENCES memberships(id),
    ADD CONSTRAINT ck_memberships_renewal_cycle
        CHECK (renewal_of_membership_id IS NULL OR renewal_of_membership_id <> id);

ALTER TABLE membership_periods
    ADD COLUMN free_intro_month BOOLEAN NOT NULL DEFAULT FALSE,
    ADD COLUMN discount_amount NUMERIC(12, 2) NOT NULL DEFAULT 0,
    ADD COLUMN waived_amount NUMERIC(12, 2) NOT NULL DEFAULT 0;

ALTER TABLE membership_periods
    ADD CONSTRAINT ck_membership_periods_discount_amount
        CHECK (discount_amount >= 0),
    ADD CONSTRAINT ck_membership_periods_waived_amount
        CHECK (waived_amount >= 0);

ALTER TABLE transaction_adjustments
    DROP CONSTRAINT IF EXISTS transaction_adjustments_adjustment_type_check;

ALTER TABLE transaction_adjustments
    ADD CONSTRAINT ck_transaction_adjustments_adjustment_type
        CHECK (adjustment_type IN ('discount', 'refund', 'correction', 'waiver'));

CREATE TABLE membership_policies (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    branch_id UUID,
    default_duration_months INTEGER NOT NULL DEFAULT 12,
    duration_unit TEXT NOT NULL DEFAULT 'months',
    billing_frequency TEXT NOT NULL DEFAULT 'monthly',
    initiation_fee_policy TEXT NOT NULL DEFAULT 'standard',
    free_intro_months INTEGER NOT NULL DEFAULT 1,
    promotion_discount_cap NUMERIC(5, 2) NOT NULL DEFAULT 0,
    renewal_window_days INTEGER NOT NULL DEFAULT 14,
    overdue_access_policy TEXT NOT NULL DEFAULT 'allow_with_manager_review',
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    FOREIGN KEY (branch_id) REFERENCES branches(id),

    CHECK (default_duration_months > 0),
    CHECK (duration_unit IN ('days', 'months')),
    CHECK (billing_frequency IN ('weekly', 'monthly', 'quarterly', 'annual')),
    CHECK (initiation_fee_policy IN ('standard', 'waive_first_month', 'campaign_waiver')),
    CHECK (free_intro_months >= 0),
    CHECK (promotion_discount_cap >= 0 AND promotion_discount_cap <= 100),
    CHECK (renewal_window_days >= 0),
    CHECK (overdue_access_policy IN ('restrict_access', 'allow_with_manager_review', 'allow_with_warning'))
);

CREATE UNIQUE INDEX idx_membership_policies_active_branch
    ON membership_policies(branch_id)
    WHERE is_active = TRUE;

CREATE INDEX idx_membership_plans_duration
    ON membership_plans(duration_months, duration_unit);

CREATE INDEX idx_membership_plan_prices_effective
    ON membership_plan_prices(plan_id, customer_type, branch_id, effective_from DESC, effective_to);

CREATE INDEX idx_memberships_renewal_of_membership
    ON memberships(renewal_of_membership_id);

CREATE INDEX idx_membership_periods_billing_window
    ON membership_periods(membership_id, start_date, end_date);

CREATE OR REPLACE FUNCTION enforce_payment_allocation_matches_payment_transaction()
RETURNS trigger AS $$
BEGIN
    IF EXISTS (
        SELECT 1
        FROM payments p
        WHERE p.id = NEW.payment_id
          AND p.transaction_id <> NEW.transaction_id
    ) THEN
        RAISE EXCEPTION 'payment allocation must match the payment''s transaction';
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_enforce_payment_allocation_matches_payment_transaction
BEFORE INSERT OR UPDATE ON payment_allocations
FOR EACH ROW
EXECUTE FUNCTION enforce_payment_allocation_matches_payment_transaction();

CREATE OR REPLACE FUNCTION enforce_payment_allocation_total()
RETURNS trigger AS $$
DECLARE
    payment_total NUMERIC(12, 2);
    current_total NUMERIC(12, 2);
BEGIN
    SELECT amount INTO payment_total
    FROM payments
    WHERE id = NEW.payment_id;

    SELECT COALESCE(SUM(pa.amount), 0) INTO current_total
    FROM payment_allocations pa
    WHERE pa.payment_id = NEW.payment_id
      AND pa.id <> COALESCE(NEW.id, '00000000-0000-0000-0000-000000000000'::uuid);

    IF payment_total < (current_total + NEW.amount) THEN
        RAISE EXCEPTION 'payment allocations cannot exceed the payment amount';
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_enforce_payment_allocation_total
BEFORE INSERT OR UPDATE ON payment_allocations
FOR EACH ROW
EXECUTE FUNCTION enforce_payment_allocation_total();
