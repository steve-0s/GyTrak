package tests

import (
	"context"
	db "gytrak/backend/internal/db"
	"testing"
)

func TestUserQueriesCreateSearchAndStatus(t *testing.T) {
	d := NewTestDatabase(t)
	ctx := context.Background()
	user, err := d.Queries.CreateUser(ctx, db.CreateUserParams{FullName: "Test User", Email: "query-user@example.com", PasswordHash: "test"})
	if err != nil {
		t.Fatal(err)
	}
	if _, err = d.Queries.GetUserByEmail(ctx, "QUERY-USER@EXAMPLE.COM"); err != nil {
		t.Fatal(err)
	}
	if _, err = d.Queries.SetUserStatus(ctx, db.SetUserStatusParams{ID: user.ID, Status: "inactive"}); err != nil {
		t.Fatal(err)
	}
}
