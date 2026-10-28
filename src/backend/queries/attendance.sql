-- name: CreateAttendanceRecord :one
INSERT INTO attendance_records (customer_id, branch_id, business_date, time_in, time_out, source, status, sync_status, device_id, created_by, walk_in_id)
VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
RETURNING *;

-- name: GetAttendanceRecord :one
SELECT a.*, c.first_name, c.last_name, b.name AS branch_name
FROM attendance_records a
JOIN customers c ON c.id = a.customer_id
JOIN branches b ON b.id = a.branch_id
WHERE a.id = $1;

-- name: ListAttendance :many
SELECT a.*, c.first_name, c.last_name, b.name AS branch_name
FROM attendance_records a
JOIN customers c ON c.id = a.customer_id
JOIN branches b ON b.id = a.branch_id
WHERE ($1::uuid IS NULL OR a.branch_id = $1)
  AND ($2::date IS NULL OR a.business_date >= $2)
  AND ($3::date IS NULL OR a.business_date <= $3)
  AND ($4::text = '' OR a.status = $4)
ORDER BY a.business_date DESC, a.time_in DESC
LIMIT $5 OFFSET $6;

-- name: CorrectAttendance :one
-- Execute CreateAttendanceCorrection and CorrectAttendance in one service-layer database transaction.
UPDATE attendance_records
SET time_in = $2, time_out = $3, business_date = $4, updated_at = CURRENT_TIMESTAMP
WHERE id = $1 AND status <> 'voided'
RETURNING *;

-- name: CountAttendance :one
SELECT COUNT(*)::bigint AS count
FROM attendance_records
WHERE ($1::uuid IS NULL OR branch_id = $1)
  AND ($2::date IS NULL OR business_date >= $2)
  AND ($3::date IS NULL OR business_date <= $3)
  AND ($4::text = '' OR status = $4);

-- name: VoidAttendance :one
UPDATE attendance_records
SET status = 'voided', voided_at = CURRENT_TIMESTAMP, voided_by = $2, void_reason = $3, updated_at = CURRENT_TIMESTAMP
WHERE id = $1 AND status <> 'voided'
RETURNING *;

-- name: ListAttendanceCorrections :many
SELECT * FROM attendance_corrections WHERE attendance_id = $1 ORDER BY created_at DESC;

-- name: CreateAttendanceCorrection :one
INSERT INTO attendance_corrections (attendance_id, changed_by, reason, old_values, new_values)
VALUES ($1, $2, $3, $4, $5)
RETURNING *;
