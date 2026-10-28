package tests

import (
	"context"
	"fmt"
	"net/url"
	"os"
	"path/filepath"
	"runtime"
	"sort"
	"strings"
	"sync"
	"testing"
	"time"

	"github.com/jackc/pgx/v5/pgxpool"
	db "gytrak/backend/internal/db"
)

var migrationMu sync.Mutex

// TestDatabase is the shared integration-test database harness. Tests should
// use NewTestDatabase rather than opening their own connections or applying
// migrations.
type TestDatabase struct {
	Pool    *pgxpool.Pool
	Queries *db.Queries
}

func NewTestDatabase(t *testing.T) *TestDatabase {
	t.Helper()

	databaseURL := os.Getenv("GYTRAK_TEST_DATABASE_URL")
	if databaseURL == "" {
		t.Skip("GYTRAK_TEST_DATABASE_URL is not set; database integration tests require an explicitly configured disposable database")
	}

	parsed, err := url.Parse(databaseURL)
	if err != nil {
		t.Fatalf("parse GYTRAK_TEST_DATABASE_URL: %v", err)
	}
	databaseName := strings.TrimPrefix(parsed.Path, "/")
	if !isTestDatabaseName(databaseName) {
		t.Fatalf("refusing database %q: GYTRAK_TEST_DATABASE_URL must target a database whose name contains a test segment", databaseName)
	}

	ctx, cancel := context.WithTimeout(context.Background(), 15*time.Second)
	defer cancel()
	pool, err := pgxpool.New(ctx, databaseURL)
	if err != nil {
		t.Fatalf("connect to test database: %v", err)
	}
	if err := pool.Ping(ctx); err != nil {
		pool.Close()
		t.Fatalf("ping test database: %v", err)
	}

	migrationMu.Lock()
	err = ensureMigrations(ctx, pool)
	migrationMu.Unlock()
	if err != nil {
		pool.Close()
		t.Fatalf("prepare test database migrations: %v", err)
	}

	testDB := &TestDatabase{Pool: pool, Queries: db.New(pool)}
	testDB.Reset(t)
	t.Cleanup(pool.Close)
	return testDB
}

func isTestDatabaseName(name string) bool {
	if name == "" {
		return false
	}
	for _, part := range strings.FieldsFunc(strings.ToLower(name), func(r rune) bool {
		return r == '_' || r == '-'
	}) {
		if part == "test" || strings.HasSuffix(part, "test") {
			return true
		}
	}
	return false
}

func ensureMigrations(ctx context.Context, pool *pgxpool.Pool) error {
	var usersTable *string
	if err := pool.QueryRow(ctx, "SELECT to_regclass('public.users')::text").Scan(&usersTable); err != nil {
		return err
	}
	if usersTable != nil {
		return nil
	}

	_, thisFile, _, ok := runtimeCaller()
	if !ok {
		return fmt.Errorf("locate database test package")
	}
	migrationFiles, err := filepath.Glob(filepath.Join(filepath.Dir(thisFile), "../../../migration/*.up.sql"))
	if err != nil {
		return err
	}
	sort.Strings(migrationFiles)
	if len(migrationFiles) == 0 {
		return fmt.Errorf("no migration files found")
	}
	for _, migrationFile := range migrationFiles {
		sql, err := os.ReadFile(migrationFile)
		if err != nil {
			return fmt.Errorf("read %s: %w", migrationFile, err)
		}
		if _, err := pool.Exec(ctx, string(sql)); err != nil {
			return fmt.Errorf("apply %s: %w", filepath.Base(migrationFile), err)
		}
	}
	return nil
}

// runtimeCaller is kept as a variable so setup remains easy to test without
// adding another runtime dependency to production code.
var runtimeCaller = func() (uintptr, string, int, bool) {
	return runtime.Caller(0)
}

// Reset is intentionally destructive, but only after NewTestDatabase has
// verified the explicitly supplied database name is a test database.
func (dbTest *TestDatabase) Reset(t *testing.T) {
	t.Helper()
	ctx, cancel := context.WithTimeout(context.Background(), 15*time.Second)
	defer cancel()
	var tables *string
	err := dbTest.Pool.QueryRow(ctx, `
		SELECT string_agg(format('%I.%I', table_schema, table_name), ', ' ORDER BY table_name)
		FROM information_schema.tables
		WHERE table_schema = 'public'
		  AND table_type = 'BASE TABLE'
		  AND table_name <> 'schema_migrations'
	`).Scan(&tables)
	if err != nil {
		t.Fatalf("list test tables: %v", err)
	}
	if tables != nil && *tables != "" {
		if _, err := dbTest.Pool.Exec(ctx, "TRUNCATE TABLE "+*tables+" RESTART IDENTITY CASCADE"); err != nil {
			t.Fatalf("reset test database: %v", err)
		}
	}
}
