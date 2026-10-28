-- Payment methods remain interpretable through payment_method_code_snapshot.
-- Deactivate methods rather than deleting them once they are used.
-- name: SetPaymentMethodStatus :one
UPDATE payment_methods
SET is_active = $2, updated_at = CURRENT_TIMESTAMP
WHERE id = $1
RETURNING *;

-- name: ListPaymentMethods :many
SELECT * FROM payment_methods
WHERE ($1::uuid IS NULL OR branch_id = $1 OR branch_id IS NULL)
  AND ($2::boolean IS NULL OR is_active = $2)
ORDER BY name, id;
