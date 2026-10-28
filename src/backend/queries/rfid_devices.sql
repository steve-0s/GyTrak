-- name: CreateRFIDDevice :one
INSERT INTO rfid_devices (branch_id, device_name, device_type, device_identifier)
VALUES ($1, $2, $3, $4)
RETURNING *;

-- name: GetRFIDDevice :one
SELECT * FROM rfid_devices WHERE id = $1;

-- name: ListRFIDDevicesByBranch :many
SELECT * FROM rfid_devices
WHERE branch_id = $1
  AND ($2::text = '' OR status = $2)
ORDER BY device_name, id
LIMIT $3 OFFSET $4;

-- name: CountRFIDDevicesByBranch :one
SELECT COUNT(*)::bigint
FROM rfid_devices
WHERE branch_id = $1
  AND ($2::text = '' OR status = $2);

-- name: UpdateRFIDDevice :one
UPDATE rfid_devices
SET device_name = $2, device_type = $3, device_identifier = $4
WHERE id = $1
RETURNING *;

-- name: SetRFIDDeviceStatus :one
UPDATE rfid_devices
SET status = $2
WHERE id = $1
RETURNING *;

-- Retiring and reactivating are represented by status changes because the schema
-- supports only active/inactive device states and has no retirement metadata.
