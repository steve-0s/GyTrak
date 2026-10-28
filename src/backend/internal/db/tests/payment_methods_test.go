package tests

import (
	"context"
	db "gytrak/backend/internal/db"
	"testing"
)

func TestPaymentMethodQueriesFilterByBranchAndStatus(t *testing.T) {
	d := NewTestDatabase(t)
	seedCoreRecords(t, d)
	ctx := context.Background()
	_, err := d.Pool.Exec(ctx, `INSERT INTO payment_methods (id, code, name, branch_id, created_by) VALUES ('00000000-0000-0000-0000-000000000701','cash-test','Cash Test','00000000-0000-0000-0000-000000000101','00000000-0000-0000-0000-000000000001')`)
	if err != nil {
		t.Fatal(err)
	}
	rows, err := d.Queries.ListPaymentMethods(ctx, db.ListPaymentMethodsParams{Column1: testUUID("00000000-0000-0000-0000-000000000101"), Column2: true})
	if err != nil || len(rows) != 1 {
		t.Fatalf("methods=%d err=%v", len(rows), err)
	}
	if _, err = d.Queries.SetPaymentMethodStatus(ctx, db.SetPaymentMethodStatusParams{ID: rows[0].ID, IsActive: false}); err != nil {
		t.Fatal(err)
	}
}
