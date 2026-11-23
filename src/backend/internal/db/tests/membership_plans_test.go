package tests

import (
	"context"
	"errors"
	"math/big"
	"testing"

	"github.com/jackc/pgx/v5/pgconn"
	"github.com/jackc/pgx/v5/pgtype"
	db "gytrak/backend/internal/db"
)

func TestMembershipPlanQueriesIncludeHistoricalPlanRows(t *testing.T) {
	d := NewTestDatabase(t)
	seedCoreRecords(t, d)
	ctx := context.Background()
	id := testUUID("00000000-0000-0000-0000-000000000301")
	if _, err := d.Queries.GetMembershipPlan(ctx, id); err != nil {
		t.Fatal(err)
	}
	if _, err := d.Queries.ListPlanPrices(ctx, id); err != nil {
		t.Fatal(err)
	}
}

func TestMembershipPlanCanBeEditedAndStatusChanged(t *testing.T) {
	d := NewTestDatabase(t)
	seedCoreRecords(t, d)
	ctx := context.Background()
	id := testUUID("00000000-0000-0000-0000-000000000301")

	inactive, err := d.Queries.UpdateMembershipPlan(ctx, updateMembershipPlanParams(id, "Updated DB Test Plan", "inactive"))
	if err != nil {
		t.Fatalf("update plan and set inactive: %v", err)
	}
	if inactive.Name != "Updated DB Test Plan" || inactive.Status != "inactive" || inactive.DurationValue != 3 {
		t.Fatalf("updated plan = %+v; want renamed inactive plan with a three-month term", inactive)
	}
	if !inactive.UpdatedAt.Valid || inactive.UpdatedAt.Time.Before(inactive.CreatedAt.Time) {
		t.Fatalf("updated_at = %+v; want a timestamp at or after created_at", inactive.UpdatedAt)
	}

	active, err := d.Queries.UpdateMembershipPlan(ctx, updateMembershipPlanParams(id, "Updated DB Test Plan", "active"))
	if err != nil {
		t.Fatalf("reactivate plan: %v", err)
	}
	if active.Status != "active" {
		t.Fatalf("reactivated plan status = %q; want active", active.Status)
	}
	if _, err := d.Queries.UpdateMembershipPlan(ctx, updateMembershipPlanParams(id, "Updated DB Test Plan", "archived")); err == nil {
		t.Fatal("UpdateMembershipPlan allowed the edit path to archive a plan")
	}

	_, err = d.Queries.ArchiveMembershipPlan(ctx, db.ArchiveMembershipPlanParams{
		ID: id, ArchivedBy: testUUID("00000000-0000-0000-0000-000000000001"),
		ArchiveReason: stringPtr("test archive"),
	})
	if err != nil {
		t.Fatalf("archive plan: %v", err)
	}
	if _, err := d.Queries.UpdateMembershipPlan(ctx, updateMembershipPlanParams(id, "Should Not Update", "active")); err == nil {
		t.Fatal("UpdateMembershipPlan succeeded for an archived plan")
	}
}

func TestMembershipPlanUpdateRejectsDuplicateName(t *testing.T) {
	d := NewTestDatabase(t)
	seedCoreRecords(t, d)
	ctx := context.Background()
	_, err := d.Pool.Exec(ctx, `
INSERT INTO membership_plans (name, duration_value, duration_unit)
VALUES ('Another DB Plan', 1, 'months')`)
	if err != nil {
		t.Fatalf("insert second plan: %v", err)
	}

	id := testUUID("00000000-0000-0000-0000-000000000301")
	if _, err := d.Queries.UpdateMembershipPlan(ctx, updateMembershipPlanParams(id, " another db plan ", "active")); err == nil {
		t.Fatal("UpdateMembershipPlan accepted a case- and whitespace-equivalent name")
	} else {
		var pgErr *pgconn.PgError
		if !errors.As(err, &pgErr) || pgErr.Code != "23505" {
			t.Fatalf("UpdateMembershipPlan error = %v; want unique constraint violation", err)
		}
	}
}

func updateMembershipPlanParams(id pgtype.UUID, name, status string) db.UpdateMembershipPlanParams {
	return db.UpdateMembershipPlanParams{
		ID:                       id,
		Name:                     name,
		DurationValue:            3,
		DurationUnit:             "months",
		PromotionEligible:        true,
		PromotionDiscountPercent: pgtype.Numeric{Int: big.NewInt(0), Valid: true},
		BillingStartMode:         "after_intro",
		Status:                   status,
	}
}
