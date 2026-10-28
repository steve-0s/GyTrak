-- name: CreateMembershipPlan :one
INSERT INTO membership_plans (name, duration_value, duration_unit, includes_coaching, promotion_eligible, promotion_name, promotion_code, promotion_discount_percent, free_intro_months, billing_start_mode, custom_first_billing_date)
VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
RETURNING *;

-- name: GetMembershipPlan :one
SELECT * FROM membership_plans WHERE id = $1;

-- name: ListMembershipPlans :many
SELECT * FROM membership_plans
WHERE ($1::text = '' OR status = $1)
ORDER BY name
LIMIT $2 OFFSET $3;

-- name: CountMembershipPlans :one
SELECT COUNT(*)::bigint AS count
FROM membership_plans
WHERE ($1::text = '' OR status = $1);

-- name: ArchiveMembershipPlan :one
UPDATE membership_plans
SET status = 'archived', archived_at = CURRENT_TIMESTAMP, archived_by = $2, archive_reason = $3, updated_at = CURRENT_TIMESTAMP
WHERE id = $1 AND status <> 'archived'
RETURNING *;

-- name: RestoreMembershipPlan :one
UPDATE membership_plans
SET status = $2, archived_at = NULL, archived_by = NULL, archive_reason = NULL, updated_at = CURRENT_TIMESTAMP
WHERE id = $1 AND status = 'archived'
RETURNING *;

-- name: ListPlanPrices :many
SELECT * FROM membership_plan_prices
WHERE plan_id = $1
ORDER BY branch_id NULLS FIRST, customer_type, effective_from DESC;

-- name: CreateMembershipPlanPrice :one
INSERT INTO membership_plan_prices (plan_id, customer_type, branch_id, monthly_dues, initiation_fee, renewal_monthly_dues, renewal_initiation_fee, currency, effective_from, effective_to, is_active)
VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
RETURNING *;

-- Foreign keys reject deletion when memberships or historical prices exist.
-- name: DeleteMembershipPlan :one
DELETE FROM membership_plans WHERE id = $1 RETURNING *;
