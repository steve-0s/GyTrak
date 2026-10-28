package tests

import (
	"context"
	"github.com/jackc/pgx/v5/pgtype"
	db "gytrak/backend/internal/db"
	"testing"
	"time"
)

func TestReportQueriesRespectBranchAndDateFilters(t *testing.T) {
	d := NewTestDatabase(t)
	seedCoreRecords(t, d)
	rows, err := d.Queries.AttendanceSummaryByBranch(context.Background(), db.AttendanceSummaryByBranchParams{BusinessDate: pgtype.Date{Time: time.Now(), Valid: true}, BusinessDate_2: pgtype.Date{Time: time.Now().AddDate(0, 0, 1), Valid: true}, Column3: testUUID("00000000-0000-0000-0000-000000000101")})
	if err != nil {
		t.Fatal(err)
	}
	if len(rows) != 1 || rows[0].AttendanceCount != 0 {
		t.Fatalf("attendance report rows=%d", len(rows))
	}
}
