-- name: CreateBranch :one
INSERT INTO branches (name, address, phone)
VALUES ($1, $2, $3)
RETURNING *;

-- name: GetBranch :one
SELECT * FROM branches WHERE id = $1;

-- name: ListBranches :many
SELECT * FROM branches
WHERE ($1::text = '' OR name ILIKE '%' || $1 || '%')
  AND ($2::text = '' OR status = $2)
ORDER BY name
LIMIT $3 OFFSET $4;

-- name: CountBranches :one
SELECT COUNT(*)::bigint AS count
FROM branches
WHERE ($1::text = '' OR name ILIKE '%' || $1 || '%')
  AND ($2::text = '' OR status = $2);

-- name: UpdateBranch :one
UPDATE branches
SET name = $2, address = $3, phone = $4
WHERE id = $1
RETURNING *;

-- name: ArchiveBranch :one
UPDATE branches
SET status = 'archived', archived_at = CURRENT_TIMESTAMP, archived_by = $2
WHERE id = $1 AND status <> 'archived'
RETURNING *;

-- name: RestoreBranch :one
UPDATE branches
SET status = 'active', archived_at = NULL, archived_by = NULL
WHERE id = $1 AND status = 'archived'
RETURNING *;

-- Foreign keys reject deletion when branch history or operational records exist.
-- Prefer ArchiveBranch for any branch with historical data.
-- name: DeleteBranch :one
DELETE FROM branches WHERE id = $1 RETURNING *;
