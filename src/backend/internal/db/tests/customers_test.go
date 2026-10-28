package tests

import (
	"context"
	db "gytrak/backend/internal/db"
	"testing"
)

func TestCustomerQueriesPreserveBranchHistory(t *testing.T) {
	d := NewTestDatabase(t)
	seedCoreRecords(t, d)
	ctx := context.Background()
	id := testUUID("00000000-0000-0000-0000-000000000201")
	if _, err := d.Queries.GetCustomer(ctx, id); err != nil {
		t.Fatal(err)
	}
	if rows, err := d.Queries.ListCustomers(ctx, db.ListCustomersParams{Column1: testUUID("00000000-0000-0000-0000-000000000101"), Limit: 10, Offset: 0}); err != nil || len(rows) != 1 {
		t.Fatalf("customers=%d err=%v", len(rows), err)
	}
}
