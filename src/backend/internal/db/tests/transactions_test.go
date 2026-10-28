package tests

import (
	"context"
	"testing"
)

func TestTransactionQueriesReturnEmptyAllocationsForUnknownTransaction(t *testing.T) {
	d := NewTestDatabase(t)
	rows, err := d.Queries.ListPaymentAllocationsByTransaction(context.Background(), testUUID("00000000-0000-0000-0000-000000009005"))
	if err != nil {
		t.Fatal(err)
	}
	if len(rows) != 0 {
		t.Fatalf("allocations=%d, want 0", len(rows))
	}
}
