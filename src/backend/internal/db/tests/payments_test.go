package tests

import (
	"context"
	"testing"
)

func TestPaymentQueriesReturnEmptyForUnknownTransaction(t *testing.T) {
	d := NewTestDatabase(t)
	rows, err := d.Queries.ListPaymentAllocations(context.Background(), testUUID("00000000-0000-0000-0000-000000009003"))
	if err != nil {
		t.Fatal(err)
	}
	if len(rows) != 0 {
		t.Fatalf("allocations=%d, want 0", len(rows))
	}
}
