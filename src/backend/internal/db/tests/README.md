# Database integration tests

These tests use the shared setup in `setup_test.go`. They require an explicit
`GYTRAK_TEST_DATABASE_URL`; no database is selected by default.

The database name must contain a `test` segment, for example
`gytrak_test`. The setup applies the repository migrations to a clean database
when needed, truncates application tables before each test, and closes the
connection pool through `testing.T` cleanup.

Example:

```sh
GYTRAK_TEST_DATABASE_URL='postgres://user@localhost:5432/gytrak_test?sslmode=disable' go test ./...
```

Use a disposable PostgreSQL database. The harness refuses production-style
database names and does not create, drop, or reset databases itself.
