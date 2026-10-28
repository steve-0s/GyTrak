package tests

import (
	"context"
	"testing"
)

func TestMembershipQueriesReturnEmptyForUnknownMembership(t *testing.T) {
	d := NewTestDatabase(t)
	_, err := d.Queries.GetMembership(context.Background(), testUUID("00000000-0000-0000-0000-000000009002"))
	if err == nil {
		t.Fatal("GetMembership returned unknown membership")
	}
}
