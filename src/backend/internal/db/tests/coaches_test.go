package tests

import (
	"context"
	db "gytrak/backend/internal/db"
	"testing"
)

func TestCoachQueriesUseGeneratedMethods(t *testing.T) {
	d := NewTestDatabase(t)
	coach, err := d.Queries.CreateCoach(context.Background(), db.CreateCoachParams{CoachCode: "COACH-Q", FirstName: "Query", LastName: "Coach"})
	if err != nil {
		t.Fatal(err)
	}
	if _, err = d.Queries.GetCoach(context.Background(), coach.ID); err != nil {
		t.Fatal(err)
	}
}
