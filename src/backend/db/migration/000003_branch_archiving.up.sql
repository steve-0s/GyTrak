ALTER TABLE branches
    DROP CONSTRAINT branches_status_check;

ALTER TABLE branches
    ADD CONSTRAINT ck_branches_status
        CHECK (status IN ('active', 'inactive', 'archived')),
    ADD COLUMN archived_at TIMESTAMPTZ,
    ADD COLUMN archived_by UUID;

ALTER TABLE branches
    ADD CONSTRAINT fk_branches_archived_by
        FOREIGN KEY (archived_by) REFERENCES users(id),
    ADD CONSTRAINT ck_branches_archive_metadata
        CHECK (
            (status = 'archived' AND archived_at IS NOT NULL)
            OR (status <> 'archived' AND archived_at IS NULL AND archived_by IS NULL)
        );

CREATE INDEX idx_branches_status
    ON branches(status);
