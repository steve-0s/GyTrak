-- name: CreateCustomer :one
-- Execute CreateCustomer and CreateCustomerBranchHistory in one service-layer database transaction.
INSERT INTO customers (customer_code, branch_id, first_name, last_name, phone, email, birth_date, customer_type, photo_key)
VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
RETURNING *;

-- name: GetCustomer :one
SELECT c.* FROM customers c WHERE c.id = $1;

-- name: ListCustomers :many
SELECT c.*, b.name AS branch_name
FROM customers c
JOIN branches b ON b.id = c.branch_id
WHERE ($1::uuid IS NULL OR c.branch_id = $1)
  AND ($2::text = '' OR c.status = $2)
  AND ($3::text = '' OR c.first_name || ' ' || c.last_name ILIKE '%' || $3 || '%' OR c.phone ILIKE '%' || $3 || '%' OR c.customer_code ILIKE '%' || $3 || '%')
ORDER BY c.last_name, c.first_name
LIMIT $4 OFFSET $5;

-- name: UpdateCustomer :one
UPDATE customers
SET first_name = $2, last_name = $3, phone = $4, email = $5, birth_date = $6,
    customer_type = $7, photo_key = $8, updated_at = CURRENT_TIMESTAMP
WHERE id = $1
RETURNING *;

-- name: ArchiveCustomer :one
UPDATE customers
SET status = 'archived', archived_at = CURRENT_TIMESTAMP, archived_by = $2, archive_reason = $3, updated_at = CURRENT_TIMESTAMP
WHERE id = $1 AND status <> 'archived'
RETURNING *;

-- name: RestoreCustomer :one
UPDATE customers
SET status = $2, archived_at = NULL, archived_by = NULL, archive_reason = NULL, updated_at = CURRENT_TIMESTAMP
WHERE id = $1 AND status = 'archived'
RETURNING *;

-- name: ListArchivedCustomers :many
SELECT c.*, b.name AS branch_name
FROM customers c
JOIN branches b ON b.id = c.branch_id
WHERE c.status = 'archived'
  AND ($1::uuid IS NULL OR c.branch_id = $1)
ORDER BY c.archived_at DESC NULLS LAST, c.last_name, c.first_name
LIMIT $2 OFFSET $3;

-- name: ListCustomerBranchHistory :many
SELECT h.*, b.name AS branch_name
FROM customer_branch_history h
JOIN branches b ON b.id = h.branch_id
WHERE h.customer_id = $1
ORDER BY h.started_at DESC;

-- name: CreateCustomerBranchHistory :one
INSERT INTO customer_branch_history (customer_id, branch_id, started_at, assigned_by, reason)
VALUES ($1, $2, COALESCE($3, CURRENT_TIMESTAMP), $4, $5)
RETURNING *;

-- name: EndCustomerBranchHistory :one
-- Execute EndCustomerBranchHistory and CreateCustomerBranchHistory in one service-layer database transaction.
UPDATE customer_branch_history
SET ended_at = $2
WHERE id = $1 AND ended_at IS NULL
RETURNING *;

-- Execute this update with EndCustomerBranchHistory and CreateCustomerBranchHistory
-- in one service-layer database transaction.
-- name: ReassignCustomerBranch :one
UPDATE customers
SET branch_id = $2, updated_at = CURRENT_TIMESTAMP
WHERE id = $1
RETURNING *;

-- Database foreign keys reject this operation when historical or operational
-- records still reference the customer. The service layer should prefer archive.
-- name: DeleteCustomer :one
DELETE FROM customers WHERE id = $1 RETURNING *;

-- name: CountCustomers :one
SELECT COUNT(*)::bigint AS count
FROM customers
WHERE ($1::uuid IS NULL OR branch_id = $1)
  AND ($2::text = '' OR status = $2)
  AND ($3::text = '' OR first_name || ' ' || last_name ILIKE '%' || $3 || '%' OR phone ILIKE '%' || $3 || '%' OR customer_code ILIKE '%' || $3 || '%');
