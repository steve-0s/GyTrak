-- Archived branches become inactive during rollback so existing branch records
-- remain available after the archived status is removed.
UPDATE branches
SET status = 'inactive',
    archived_at = NULL,
    archived_by = NULL
WHERE status = 'archived';

DROP INDEX IF EXISTS idx_branches_status;

ALTER TABLE branches
    DROP CONSTRAINT IF EXISTS ck_branches_archive_metadata,
    DROP CONSTRAINT IF EXISTS fk_branches_archived_by,
    DROP CONSTRAINT IF EXISTS ck_branches_status;

ALTER TABLE branches
    DROP COLUMN IF EXISTS archived_at,
    DROP COLUMN IF EXISTS archived_by,
    ADD CONSTRAINT branches_status_check
        CHECK (status IN ('active', 'inactive'));
