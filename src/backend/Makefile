# Application
APP_NAME=gytrak
MAIN_PATH=./cmd/api

# Database
DB_NAME=gytrak
DB_USER=postgres
DB_HOST=localhost
DB_PORT=5432
DB_SSLMODE=disable

# Load DATABASE_URL from environment if defined.
DATABASE_URL ?= postgres://$(DB_USER):$(DB_PASSWORD)@$(DB_HOST):$(DB_PORT)/$(DB_NAME)?sslmode=$(DB_SSLMODE)

# Migration directory
MIGRATIONS_PATH=./db/migrations

.PHONY: help run build test clean tidy migrate-up migrate-down migrate-create sqlc

help:
	@echo "Available commands:"
	@echo "  make run             - Run the Go API"
	@echo "  make build           - Build the Go application"
	@echo "  make test            - Run Go tests"
	@echo "  make clean           - Remove the built application"
	@echo "  make tidy            - Clean up Go dependencies"
	@echo "  make migrate-up      - Apply database migrations"
	@echo "  make migrate-down    - Roll back one migration"
	@echo "  make migrate-create  - Create a new migration"
	@echo "  make sqlc            - Generate Go code using sqlc"

run:
	go run $(MAIN_PATH)

build:
	go build -o bin/$(APP_NAME) $(MAIN_PATH)

test:
	go test ./...

clean:
	rm -rf bin/

tidy:
	go mod tidy

createdb:
	docker exec -it GyTrak psql -U $(DB_USER) -d postgres -c "CREATE DATABASE $(DB_NAME);"

dropdb:
	docker exec -it GyTrak psql -U $(DB_USER) -d postgres -c "DROP DATABASE $(DB_NAME);"

migrate-up:
	steve-0s@Chiggas-MacBook-Pro backend % migrate -path db/migration -database "postgresql://postgres:myNotSoSecretPass234@localhost:5432/postgres?sslmode=disable" -verbose up

migrate-down:
	steve-0s@Chiggas-MacBook-Pro backend % migrate -path db/migration -database "postgresql://postgres:myNotSoSecretPass234@localhost:5432/postgres?sslmode=disable" -verbose down

migrate-create:
	@read -p "Migration name: " name; 
	migrate create -ext sql -dir $(MIGRATIONS_PATH) -seq $$name

.PHONY: createdb dropdb migrate-up migrate-down

sqlc:
	sqlc generate