-- name: GetTransaction :one
SELECT * FROM transactions WHERE id = $1;

-- name: ListCustomerTransactions :many
SELECT t.* FROM transactions t
WHERE t.customer_id = $1
  AND ($2::uuid IS NULL OR t.branch_id = $2)
ORDER BY t.created_at DESC
LIMIT $3 OFFSET $4;

-- name: ListMembershipPayments :many
SELECT p.*, t.transaction_type, t.status AS transaction_status
FROM payments p
JOIN transactions t ON t.id = p.transaction_id
WHERE t.membership_id = $1
ORDER BY COALESCE(p.paid_at, p.created_at) DESC;

-- name: ListWalkInPayments :many
SELECT p.*, t.transaction_type, t.status AS transaction_status
FROM payments p
JOIN transactions t ON t.id = p.transaction_id
JOIN walk_ins w ON w.transaction_id = t.id
WHERE w.id = $1
ORDER BY COALESCE(p.paid_at, p.created_at) DESC;

-- name: ListPaymentAllocations :many
SELECT * FROM payment_allocations WHERE payment_id = $1 ORDER BY id;

-- name: ListTransactionAdjustments :many
SELECT * FROM transaction_adjustments WHERE transaction_id = $1 ORDER BY created_at DESC;
