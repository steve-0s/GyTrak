DROP TRIGGER IF EXISTS trg_enforce_payment_allocation_total ON payment_allocations;
DROP TRIGGER IF EXISTS trg_enforce_payment_allocation_matches_payment_transaction ON payment_allocations;
DROP FUNCTION IF EXISTS enforce_payment_allocation_total();
DROP FUNCTION IF EXISTS enforce_payment_allocation_matches_payment_transaction();

DROP INDEX IF EXISTS idx_membership_periods_billing_window;
DROP INDEX IF EXISTS idx_memberships_renewal_of_membership;
DROP INDEX IF EXISTS idx_membership_plan_prices_effective;
DROP INDEX IF EXISTS idx_membership_plans_duration;
DROP INDEX IF EXISTS idx_membership_policies_active_branch;

DROP TABLE IF EXISTS membership_policies;

ALTER TABLE transaction_adjustments
    DROP CONSTRAINT IF EXISTS ck_transaction_adjustments_adjustment_type;

ALTER TABLE transaction_adjustments
    DROP CONSTRAINT IF EXISTS transaction_adjustments_adjustment_type_check;

ALTER TABLE membership_periods
    DROP CONSTRAINT IF EXISTS ck_membership_periods_discount_amount;
ALTER TABLE membership_periods
    DROP CONSTRAINT IF EXISTS ck_membership_periods_waived_amount;
ALTER TABLE membership_periods
    DROP COLUMN IF EXISTS free_intro_month;
ALTER TABLE membership_periods
    DROP COLUMN IF EXISTS discount_amount;
ALTER TABLE membership_periods
    DROP COLUMN IF EXISTS waived_amount;

ALTER TABLE memberships
    DROP CONSTRAINT IF EXISTS fk_memberships_renewal_of_membership;
ALTER TABLE memberships
    DROP CONSTRAINT IF EXISTS ck_memberships_renewal_cycle;
ALTER TABLE memberships
    DROP COLUMN IF EXISTS renewal_of_membership_id;

ALTER TABLE membership_plan_prices
    DROP CONSTRAINT IF EXISTS ck_membership_plan_prices_monthly_dues;
ALTER TABLE membership_plan_prices
    DROP CONSTRAINT IF EXISTS ck_membership_plan_prices_initiation_fee;
ALTER TABLE membership_plan_prices
    DROP CONSTRAINT IF EXISTS ck_membership_plan_prices_free_intro_months;
ALTER TABLE membership_plan_prices
    DROP CONSTRAINT IF EXISTS ck_membership_plan_prices_renewal_pricing_override;
ALTER TABLE membership_plan_prices
    DROP COLUMN IF EXISTS monthly_dues;
ALTER TABLE membership_plan_prices
    DROP COLUMN IF EXISTS initiation_fee;
ALTER TABLE membership_plan_prices
    DROP COLUMN IF EXISTS free_intro_months;
ALTER TABLE membership_plan_prices
    DROP COLUMN IF EXISTS promotion_eligible;
ALTER TABLE membership_plan_prices
    DROP COLUMN IF EXISTS renewal_pricing_override;
ALTER TABLE membership_plan_prices
    DROP COLUMN IF EXISTS is_active;

ALTER TABLE membership_plans
    DROP CONSTRAINT IF EXISTS ck_membership_plans_duration_unit;
ALTER TABLE membership_plans
    DROP CONSTRAINT IF EXISTS ck_membership_plans_monthly_dues;
ALTER TABLE membership_plans
    DROP CONSTRAINT IF EXISTS ck_membership_plans_initiation_fee;
ALTER TABLE membership_plans
    DROP CONSTRAINT IF EXISTS ck_membership_plans_free_intro_months;
ALTER TABLE membership_plans
    DROP COLUMN IF EXISTS duration_unit;
ALTER TABLE membership_plans
    DROP COLUMN IF EXISTS monthly_dues;
ALTER TABLE membership_plans
    DROP COLUMN IF EXISTS initiation_fee;
ALTER TABLE membership_plans
    DROP COLUMN IF EXISTS free_intro_months;
ALTER TABLE membership_plans
    DROP COLUMN IF EXISTS promotion_eligible;
