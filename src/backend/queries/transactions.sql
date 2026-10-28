-- name: CreateTransaction :one
INSERT INTO transactions (branch_id, customer_id, membership_id, transaction_type, status, subtotal, discount_amount, total_amount, currency, created_by)
VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
RETURNING *;

-- name: CreateTransactionItem :one
INSERT INTO transaction_items (transaction_id, item_type, description, quantity, unit_price, line_total, membership_period_id, coach_id)
VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
RETURNING *;

-- name: ListTransactionItems :many
SELECT * FROM transaction_items WHERE transaction_id = $1 ORDER BY id;

-- name: CreatePayment :one
-- Execute payment creation and transaction-status/allocation changes in one service-layer database transaction.
INSERT INTO payments (transaction_id, amount, payment_method_id, payment_method, payment_method_code_snapshot, status, reference_number, received_by, paid_at)
VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
RETURNING *;

-- name: ListPaymentsByTransaction :many
SELECT * FROM payments
WHERE transaction_id = $1
ORDER BY created_at, id;

-- name: CreatePaymentAllocation :one
INSERT INTO payment_allocations (payment_id, transaction_id, amount)
VALUES ($1, $2, $3)
RETURNING *;

-- name: CreateTransactionAdjustment :one
INSERT INTO transaction_adjustments (transaction_id, payment_id, adjustment_type, direction, amount, reason, created_by)
VALUES ($1, $2, $3, $4, $5, $6, $7)
RETURNING *;

-- name: CreateTransactionAdjustmentAt :one
INSERT INTO transaction_adjustments (transaction_id, payment_id, adjustment_type, direction, amount, reason, created_by, occurred_at)
VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
RETURNING *;

-- name: UpdateTransactionStatus :one
UPDATE transactions SET status = $2
WHERE id = $1
RETURNING *;

-- name: ListPaymentAllocationsByTransaction :many
SELECT * FROM payment_allocations
WHERE transaction_id = $1
ORDER BY id;
