package tests

import (
	"context"
	db "gytrak/backend/internal/db"
	"testing"
)

func TestAttendanceQueriesHandleMissingRecords(t *testing.T) {
	d := NewTestDatabase(t)
	_, err := d.Queries.GetAttendanceRecord(context.Background(), testUUID("00000000-0000-0000-0000-000000009001"))
	if err == nil {
		t.Fatal("GetAttendanceRecord returned a nonexistent record")
	}
	_ = db.AttendanceRecord{}
}
