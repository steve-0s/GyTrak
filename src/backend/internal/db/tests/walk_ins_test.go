package tests

import (
	"context"
	db "gytrak/backend/internal/db"
	"testing"
)

func TestWalkInQueriesReturnEmptyForUnknownWalkIn(t *testing.T) {
	d := NewTestDatabase(t)
	rows, err := d.Queries.ListWalkIns(context.Background(), db.ListWalkInsParams{Column1: testUUID("00000000-0000-0000-0000-000000009006"), Limit: 10})
	if err != nil {
		t.Fatal(err)
	}
	if len(rows) != 0 {
		t.Fatalf("walk-ins=%d, want 0", len(rows))
	}
}
