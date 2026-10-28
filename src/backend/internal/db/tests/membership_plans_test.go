package tests

import (
	"context"
	"testing"
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
