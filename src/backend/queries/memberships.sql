-- name: CreateMembership :one
INSERT INTO memberships (customer_id, branch_id, plan_id, customer_type, duration_value, duration_unit, monthly_dues, initiation_fee, initiation_fee_waived_amount, promotion_name, promotion_code, promotion_discount_percent, free_intro_months, billing_start_mode, first_billing_date, initial_amount_due, outstanding_balance, initiation_fee_outstanding, monthly_dues_outstanding, next_payment_due_date, start_date, end_date, created_by)
VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, $20, $21, $22, $23)
RETURNING *;

-- name: GetMembership :one
SELECT m.*, c.first_name, c.last_name, b.name AS branch_name, p.name AS plan_name
FROM memberships m
JOIN customers c ON c.id = m.customer_id
JOIN branches b ON b.id = m.branch_id
JOIN membership_plans p ON p.id = m.plan_id
WHERE m.id = $1;

-- name: ListMemberships :many
SELECT m.*, c.first_name, c.last_name, b.name AS branch_name, p.name AS plan_name
FROM memberships m
JOIN customers c ON c.id = m.customer_id
JOIN branches b ON b.id = m.branch_id
JOIN membership_plans p ON p.id = m.plan_id
WHERE ($1::uuid IS NULL OR m.branch_id = $1)
  AND ($2::text = '' OR m.status = $2)
ORDER BY m.end_date, m.created_at DESC
LIMIT $3 OFFSET $4;

-- name: CountMemberships :one
SELECT COUNT(*)::bigint AS count
FROM memberships
WHERE ($1::uuid IS NULL OR branch_id = $1)
  AND ($2::text = '' OR status = $2);

-- name: UpdateMembershipStatus :one
UPDATE memberships SET status = $2, updated_at = CURRENT_TIMESTAMP
WHERE id = $1
RETURNING *;

-- name: ListMembershipPeriods :many
SELECT * FROM membership_periods WHERE membership_id = $1 ORDER BY period_number;

-- name: ListMembershipBillingPauses :many
SELECT * FROM membership_billing_pauses WHERE membership_id = $1 ORDER BY start_date DESC;

-- name: ListDueMemberships :many
SELECT m.*, c.first_name, c.last_name, b.name AS branch_name
FROM memberships m
JOIN customers c ON c.id = m.customer_id
JOIN branches b ON b.id = m.branch_id
WHERE ($1::uuid IS NULL OR m.branch_id = $1)
  AND m.status IN ('active', 'pending_payment', 'suspended')
  AND m.next_payment_due_date < CURRENT_DATE + $2::integer
  AND m.next_payment_due_date IS NOT NULL
ORDER BY m.next_payment_due_date, m.id;

-- name: ListUpcomingMemberships :many
SELECT m.*, c.first_name, c.last_name, b.name AS branch_name
FROM memberships m
JOIN customers c ON c.id = m.customer_id
JOIN branches b ON b.id = m.branch_id
WHERE ($1::uuid IS NULL OR m.branch_id = $1)
  AND m.status IN ('active', 'pending_payment', 'suspended')
  AND m.next_payment_due_date >= CURRENT_DATE
  AND m.next_payment_due_date < CURRENT_DATE + $2::integer
ORDER BY m.next_payment_due_date, m.id;

-- name: ListOverdueMemberships :many
SELECT m.*, c.first_name, c.last_name, b.name AS branch_name
FROM memberships m
JOIN customers c ON c.id = m.customer_id
JOIN branches b ON b.id = m.branch_id
WHERE ($1::uuid IS NULL OR m.branch_id = $1)
  AND m.status IN ('active', 'pending_payment', 'suspended')
  AND m.next_payment_due_date < CURRENT_DATE
ORDER BY m.next_payment_due_date, m.id;

-- name: CreateMembershipPeriod :one
INSERT INTO membership_periods (membership_id, period_number, start_date, end_date, due_date, list_price, price_charged, discount_amount, waived_amount, is_free_intro, billing_status, status)
VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
RETURNING *;

-- name: RenewMembership :one
UPDATE memberships
SET end_date = $2, next_payment_due_date = $3, renewal_eligible = $4, status = $5, updated_at = CURRENT_TIMESTAMP
WHERE id = $1
RETURNING *;

-- name: StartMembershipBillingPause :one
-- Execute this insert with SetMembershipBillingPaused in one service-layer database transaction.
INSERT INTO membership_billing_pauses (membership_id, start_date, expected_resume_date, reason, recorded_by)
VALUES ($1, $2, $3, $4, $5)
RETURNING *;

-- name: ResumeMembershipBillingPause :one
-- Execute this update with SetMembershipBillingPaused in one service-layer database transaction.
UPDATE membership_billing_pauses
SET resumed_at = $2, resumed_by = $3
WHERE id = $1 AND resumed_at IS NULL
RETURNING *;

-- Cancellation is distinct from deletion; financial and period history remains.
-- name: CancelMembership :one
UPDATE memberships
SET status = 'cancelled', updated_at = CURRENT_TIMESTAMP
WHERE id = $1 AND status <> 'cancelled'
RETURNING *;

-- name: SetMembershipBillingPaused :one
UPDATE memberships
SET billing_paused = $2, updated_at = CURRENT_TIMESTAMP
WHERE id = $1
RETURNING *;
