package tests

import (
	"context"
	db "gytrak/backend/internal/db"
	"testing"
)

func TestBranchQueriesCreateListUpdateAndArchive(t *testing.T) {
	d := NewTestDatabase(t)
	ctx := context.Background()
	branch, err := d.Queries.CreateBranch(ctx, db.CreateBranchParams{Name: "Branch Test"})
	if err != nil {
		t.Fatal(err)
	}
	if _, err = d.Queries.GetBranch(ctx, branch.ID); err != nil {
		t.Fatal(err)
	}
	if _, err = d.Queries.UpdateBranch(ctx, db.UpdateBranchParams{ID: branch.ID, Name: "Branch Updated"}); err != nil {
		t.Fatal(err)
	}
	if _, err = d.Queries.ArchiveBranch(ctx, db.ArchiveBranchParams{ID: branch.ID, ArchivedBy: testUUID("00000000-0000-0000-0000-000000000001")}); err == nil {
		t.Fatal("archive without actor FK should fail")
	}
}
