-- name: CreateWalkIn :one
INSERT INTO walk_ins (customer_id, branch_id, service_name, time_in, time_out, fee, payment_status, status, payment_method_id, created_by)
VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
RETURNING *;

-- name: GetWalkIn :one
SELECT w.*, c.first_name, c.last_name, b.name AS branch_name
FROM walk_ins w
JOIN customers c ON c.id = w.customer_id
JOIN branches b ON b.id = w.branch_id
WHERE w.id = $1;

-- name: ListWalkIns :many
SELECT w.*, c.first_name, c.last_name, b.name AS branch_name
FROM walk_ins w
JOIN customers c ON c.id = w.customer_id
JOIN branches b ON b.id = w.branch_id
WHERE ($1::uuid IS NULL OR w.branch_id = $1)
  AND ($2::text = '' OR w.status = $2)
  AND ($3::date IS NULL OR w.created_at::date >= $3)
  AND ($4::date IS NULL OR w.created_at::date <= $4)
ORDER BY w.created_at DESC
LIMIT $5 OFFSET $6;

-- name: CountWalkIns :one
SELECT COUNT(*)::bigint AS count
FROM walk_ins
WHERE ($1::uuid IS NULL OR branch_id = $1)
  AND ($2::text = '' OR status = $2)
  AND ($3::date IS NULL OR created_at::date >= $3)
  AND ($4::date IS NULL OR created_at::date <= $4);

-- name: CancelWalkIn :one
-- Execute this query with VoidWalkInAttendance and CancelWalkInTransaction
-- in one service-layer database transaction.
UPDATE walk_ins SET status = 'cancelled', updated_at = CURRENT_TIMESTAMP
WHERE id = $1 AND status NOT IN ('cancelled', 'voided')
RETURNING *;

-- name: LinkWalkInTransaction :one
UPDATE walk_ins
SET transaction_id = $2, updated_at = CURRENT_TIMESTAMP
WHERE id = $1 AND transaction_id IS NULL AND status NOT IN ('cancelled', 'voided')
RETURNING *;

-- name: VoidWalkInAttendance :many
UPDATE attendance_records
SET status = 'voided', voided_at = CURRENT_TIMESTAMP, voided_by = $2, void_reason = $3, updated_at = CURRENT_TIMESTAMP
WHERE walk_in_id = $1 AND status <> 'voided'
RETURNING *;

-- name: CancelWalkInTransaction :one
UPDATE transactions
SET status = 'cancelled'
WHERE id = $1 AND transaction_type = 'walk_in' AND status NOT IN ('cancelled', 'refunded')
RETURNING *;

-- Cancellation preserves payment rows and marks the walk-in financial state.
-- Execute with CancelWalkIn, VoidWalkInAttendance, and CancelWalkInTransaction
-- in one service-layer database transaction.
-- name: MarkWalkInPaymentVoided :one
UPDATE walk_ins
SET payment_status = 'voided', status = 'cancelled', updated_at = CURRENT_TIMESTAMP
WHERE id = $1 AND status <> 'voided'
RETURNING *;

-- name: CompleteWalkIn :one
UPDATE walk_ins SET time_out = $2, status = 'completed', updated_at = CURRENT_TIMESTAMP
WHERE id = $1 AND status = 'checked_in' AND time_in IS NOT NULL AND $2 >= time_in
RETURNING *;
