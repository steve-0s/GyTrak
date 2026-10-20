
# GyTrak — Gym Management System

GyTrak is an offline-first gym management system designed to simplify member management, coach records, RFID keyfob assignments, and attendance tracking. It features dedicated RFID scanners for time-in and time-out, with automatic synchronization to a central database when an internet connection is restored.

## Features

- **Member Management** — Create, view, update, and manage member profiles.
- **Coach Management** — Maintain coach records and related information.
- **RFID Keyfob Assignment** — Assign, deactivate, and reassign RFID keyfobs to members.
- **RFID Attendance Tracking** — Dedicated scanners for time-in and time-out.
- **Manual Attendance Management** — Allow authorized helpdesk staff to manually create, view, update, and delete attendance records when needed.
- **Offline Support** — Record attendance locally when the internet is unavailable.
- **Automatic Synchronization** — Upload pending attendance records when connectivity returns.
- **Attendance Monitoring** — View and manage attendance records.
- **Data Integrity** — Prevent duplicate synchronization and maintain consistent attendance records.
- **Role-Based Access Control** — Restrict manual attendance changes and other administrative actions to authorized staff.

## Tech Stack

- **Go** — Backend development
- **Gin** — HTTP routing and API development
- **SQLite** — Local storage and offline attendance records
- **PostgreSQL** — Central database
- **Supabase** — Managed PostgreSQL hosting
- **sqlc** — Type-safe database query generation
- **JWT / PASETO** — API authentication (to be determined)
- **Redis** — Optional caching and rate limiting

## RFID Attendance Workflow

GyTrak is designed to continue recording attendance even when the internet is unavailable.

1. A member or coach scans their RFID keyfob.
2. The backend processes the scan and records the attendance event in SQLite.
3. Pending records remain stored locally while offline.
4. When the internet connection returns, pending records are synchronized with PostgreSQL.
5. Successfully synchronized records are marked as synced locally.

### Scanner Functions

- **Scanner 1:** Time-in
- **Scanner 2:** Time-out

## Project Goals

- Simplify daily gym operations.
- Improve attendance tracking accuracy.
- Support reliable offline attendance recording.
- Maintain consistency between local and central databases.
- Provide a foundation for future gym management features.

## Development Status

GyTrak is currently under development. Features, architecture, and implementation details may change as development progresses.

## License

No license has been selected yet.
