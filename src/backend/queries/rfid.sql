-- name: GetKeyfobByUID :one
SELECT * FROM rfid_keyfobs WHERE uid = $1;

-- name: ListRFIDKeyfobs :many
SELECT * FROM rfid_keyfobs
WHERE ($1::text = '' OR status = $1)
ORDER BY uid
LIMIT $2 OFFSET $3;

-- name: CountRFIDKeyfobs :one
SELECT COUNT(*)::bigint AS count
FROM rfid_keyfobs
WHERE ($1::text = '' OR status = $1);

-- name: ListKeyfobsByBranch :many
SELECT ra.*, k.uid, k.status AS keyfob_status, c.first_name, c.last_name, b.name AS branch_name
FROM rfid_assignments ra
JOIN rfid_keyfobs k ON k.id = ra.keyfob_id
JOIN customers c ON c.id = ra.customer_id
JOIN branches b ON b.id = ra.branch_id
WHERE ra.branch_id = $1
ORDER BY ra.assigned_at DESC
LIMIT $2 OFFSET $3;

-- name: CountKeyfobsByBranch :one
SELECT COUNT(*)::bigint
FROM rfid_assignments
WHERE branch_id = $1;

-- name: ListActiveKeyfobsByBranch :many
SELECT ra.*, k.uid, k.status AS keyfob_status, c.first_name, c.last_name, b.name AS branch_name
FROM rfid_assignments ra
JOIN rfid_keyfobs k ON k.id = ra.keyfob_id AND k.status = 'active'
JOIN customers c ON c.id = ra.customer_id
JOIN branches b ON b.id = ra.branch_id
WHERE ra.branch_id = $1 AND ra.deactivated_at IS NULL
ORDER BY ra.assigned_at DESC
LIMIT $2 OFFSET $3;

-- name: CountActiveKeyfobsByBranch :one
SELECT COUNT(*)::bigint
FROM rfid_assignments ra
JOIN rfid_keyfobs k ON k.id = ra.keyfob_id AND k.status = 'active'
WHERE ra.branch_id = $1 AND ra.deactivated_at IS NULL;

-- name: AssignKeyfob :one
-- Coordinate this insert with SetKeyfobStatus in one service-layer transaction.
INSERT INTO rfid_assignments (keyfob_id, customer_id, branch_id, assigned_by)
VALUES ($1, $2, $3, $4)
RETURNING *;

-- name: SetKeyfobStatus :one
UPDATE rfid_keyfobs SET status = $2
WHERE id = $1
RETURNING *;

-- name: DeactivateKeyfobAssignment :one
UPDATE rfid_assignments
SET deactivated_at = CURRENT_TIMESTAMP, deactivated_by = $2, reason = $3
WHERE id = $1 AND deactivated_at IS NULL
RETURNING *;

-- name: ListKeyfobHistory :many
SELECT ra.*, k.uid, b.name AS branch_name
FROM rfid_assignments ra
JOIN rfid_keyfobs k ON k.id = ra.keyfob_id
JOIN branches b ON b.id = ra.branch_id
WHERE ra.keyfob_id = $1
ORDER BY ra.assigned_at DESC;

-- name: ListRFIDEvents :many
SELECT * FROM rfid_events WHERE device_id = $1 ORDER BY occurred_at DESC LIMIT $2 OFFSET $3;

-- name: CreateRFIDEvent :one
INSERT INTO rfid_events (device_id, event_id, uid, event_type, occurred_at)
VALUES ($1, $2, $3, $4, $5)
RETURNING *;

-- name: UpdateRFIDEventProcessing :one
UPDATE rfid_events
SET processing_status = $2, processed_at = $3, attendance_id = $4
WHERE id = $1
RETURNING *;
