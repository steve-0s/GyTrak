-- name: CreateUser :one
INSERT INTO users (full_name, email, password_hash)
VALUES ($1, $2, $3)
RETURNING *;

-- name: GetUser :one
SELECT * FROM users WHERE id = $1;

-- name: GetUserByEmail :one
SELECT * FROM users WHERE lower(email) = lower($1);

-- name: ListUsers :many
SELECT u.*
FROM users u
WHERE ($1::text = '' OR u.full_name ILIKE '%' || $1 || '%' OR u.email ILIKE '%' || $1 || '%')
  AND ($2::text = '' OR u.status = $2)
ORDER BY u.full_name
LIMIT $3 OFFSET $4;

-- name: SetUserStatus :one
UPDATE users SET status = $2, updated_at = CURRENT_TIMESTAMP
WHERE id = $1
RETURNING *;

-- name: AssignUserBranch :one
INSERT INTO user_branch_assignments (user_id, branch_id, assigned_by)
VALUES ($1, $2, $3)
RETURNING *;

-- name: RevokeUserBranch :one
UPDATE user_branch_assignments
SET revoked_at = CURRENT_TIMESTAMP
WHERE id = $1 AND revoked_at IS NULL
RETURNING *;

-- name: ListUserBranches :many
SELECT uba.*, b.name AS branch_name, b.status AS branch_status
FROM user_branch_assignments uba
JOIN branches b ON b.id = uba.branch_id
WHERE uba.user_id = $1
ORDER BY uba.assigned_at DESC;
