-- name: CreateCoach :one
INSERT INTO coaches (coach_code, first_name, last_name, phone, email, photo_key)
VALUES ($1, $2, $3, $4, $5, $6)
RETURNING *;

-- name: GetCoach :one
SELECT * FROM coaches WHERE id = $1;

-- name: ListCoachesByBranch :many
SELECT c.*, cba.branch_id, cba.start_date, cba.end_date
FROM coaches c
JOIN coach_branch_assignments cba ON cba.coach_id = c.id
WHERE cba.branch_id = $1
  AND c.status <> 'archived'
  AND (cba.end_date IS NULL OR cba.end_date >= CURRENT_DATE)
ORDER BY c.last_name, c.first_name
LIMIT $2 OFFSET $3;

-- name: CountCoachesByBranch :one
SELECT COUNT(DISTINCT c.id)::bigint AS count
FROM coaches c
JOIN coach_branch_assignments cba ON cba.coach_id = c.id
WHERE cba.branch_id = $1
  AND c.status <> 'archived'
  AND (cba.end_date IS NULL OR cba.end_date >= CURRENT_DATE);

-- name: ArchiveCoach :one
UPDATE coaches
SET status = 'archived', archived_at = CURRENT_TIMESTAMP, archived_by = $2, archive_reason = $3, updated_at = CURRENT_TIMESTAMP
WHERE id = $1 AND status <> 'archived'
RETURNING *;

-- name: RestoreCoach :one
UPDATE coaches
SET status = $2, archived_at = NULL, archived_by = NULL, archive_reason = NULL, updated_at = CURRENT_TIMESTAMP
WHERE id = $1 AND status = 'archived'
RETURNING *;

-- name: ListArchivedCoaches :many
SELECT c.*, cba.branch_id, cba.start_date, cba.end_date
FROM coaches c
LEFT JOIN LATERAL (
    SELECT a.branch_id, a.start_date, a.end_date
    FROM coach_branch_assignments a
    WHERE a.coach_id = c.id AND a.end_date IS NULL
    ORDER BY a.start_date DESC
    LIMIT 1
) cba ON TRUE
WHERE c.status = 'archived'
  AND ($1::uuid IS NULL OR EXISTS (
      SELECT 1
      FROM coach_branch_assignments historical_assignment
      WHERE historical_assignment.coach_id = c.id
        AND historical_assignment.branch_id = $1
  ))
ORDER BY c.archived_at DESC NULLS LAST, c.last_name, c.first_name
LIMIT $2 OFFSET $3;

-- name: CountArchivedCoaches :one
SELECT COUNT(*)::bigint AS count
FROM coaches c
WHERE c.status = 'archived'
  AND ($1::uuid IS NULL OR EXISTS (
      SELECT 1
      FROM coach_branch_assignments a
      WHERE a.coach_id = c.id AND a.branch_id = $1
  ));

-- name: AssignCoachBranch :one
INSERT INTO coach_branch_assignments (coach_id, branch_id, start_date)
VALUES ($1, $2, $3)
RETURNING *;

-- name: EndCoachBranchAssignment :one
UPDATE coach_branch_assignments
SET end_date = $2
WHERE id = $1 AND (end_date IS NULL OR end_date >= $2)
RETURNING *;

-- Foreign keys reject deletion when assignments or transaction history exist.
-- name: DeleteCoach :one
DELETE FROM coaches WHERE id = $1 RETURNING *;
