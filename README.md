# GyTrak — Gym Management System

GyTrak is an offline-first, multi-branch gym management system designed to simplify customer and membership management, coach records, RFID keyfob assignments, and attendance tracking. It supports QR code self-registration for walk-in visitors, manual attendance management, role-based access control, reporting, and automatic synchronization with a central database when an internet connection is restored.

## Features

### Customer and Membership Management

- **Customer Profiles** — Create, view, update, and manage customer information, including walk-in visitors and registered members.
- **Membership Management** — Manage membership plans, statuses, renewals, and membership history.
- **Walk-in Management** — Record one-time gym visits, visit fees, payments, and attendance for customers without an active membership.
- **Membership Conversion** — Convert an existing walk-in customer into a registered member without creating a duplicate profile.
- **Coach Management** — Maintain coach records and related information.

### QR Code Self-Registration

- **QR Code Registration** — Allow new visitors to scan a branch-specific QR code and fill out their own registration information using a mobile-friendly page.
- **Returning Visitor Check-in** — Allow returning walk-in visitors to verify their identity and use their existing customer profile.
- **Duplicate Prevention** — Check for existing profiles and flag potential duplicates for review instead of automatically creating another profile.
- **Branch Identification** — Associate registration and visit records with the appropriate gym branch.
- **Profile Reuse** — Keep customer details, visit history, and membership records linked to one customer profile.
- **Registration and Check-in Separation** — Prevent registration alone from automatically confirming physical attendance.

### RFID and Attendance Management

- **RFID Keyfob Assignment** — Assign, deactivate, and reassign RFID keyfobs while maintaining assignment history.
- **RFID Attendance Tracking** — Use dedicated scanners for time-in and time-out.
- **Manual Attendance Management** — Allow authorized front desk staff to create, view, update, and delete attendance records when necessary.
- **Walk-in Check-in** — Support manual check-in and check-out for walk-in visitors, with optional temporary RFID passes.
- **Attendance Monitoring** — View attendance records, customer visit history, and branch activity.
- **Audit Trail** — Track manual attendance changes, including the staff member responsible, timestamp, and reason for the change.

### Multi-Branch Management

- **Branch Management** — Create, update, and deactivate gym branches.
- **Branch-Specific Operations** — Manage customers, coaches, visits, attendance, and keyfob assignments by branch.
- **Front Desk Assignment** — Assign front desk accounts to specific branches and restrict their access accordingly.
- **Centralized Customer Profiles** — Support shared customer profiles across branches while keeping visits associated with the branch where they occurred.

### Offline Support and Synchronization

- **Offline Attendance** — Record attendance locally when the internet is unavailable.
- **Automatic Synchronization** — Upload pending attendance events to the central database when connectivity returns.
- **Duplicate Sync Prevention** — Use unique event identifiers and idempotent synchronization to prevent duplicate attendance records.
- **Sync Monitoring** — Monitor pending records, synchronization failures, and scanner connectivity.

### Reporting and Analytics

- **Attendance Reports** — Generate daily, weekly, monthly, yearly, and custom date-range reports.
- **Customer Activity** — Review customer attendance history, visit frequency, and membership activity.
- **Walk-in Reports** — Monitor walk-in visits, visit fees, and recorded revenue.
- **Branch Performance** — Compare attendance and customer activity across branches.
- **Payment Reports** — Review recorded membership and walk-in payments.
- **Audit Reports** — Review manual attendance changes and other important administrative actions.
- **Report Export** — Support CSV and PDF exports.
- **Role-Based Reporting** — Restrict reports and analytics according to the user's role and branch assignments.

## User Roles and Access Control

GyTrak uses role-based access control (RBAC) to manage permissions across multiple gym branches.

### Admin — Gym Owner

The Admin has system-wide access and oversees all branches.

- Create, update, and deactivate branches.
- Create and manage front desk accounts.
- Assign front desk staff to specific branches.
- View business-wide dashboards, statistics, and analytics.
- Access customer, membership, attendance, and visit records across branches.
- Compare branch performance and activity.
- View walk-in activity and recorded revenue.
- Access reports and audit logs across all branches.
- Manage system-wide settings and permissions.

### Front Desk — Branch Staff

Front Desk accounts manage day-to-day operations within their assigned branches.

- View branch-specific dashboards and attendance statistics.
- Manage customer profiles, membership information, and coach records.
- Review QR self-registration submissions and resolve potential duplicate profiles.
- Register walk-in visits and record payments.
- Convert walk-in customers into registered members.
- Assign and manage RFID keyfobs.
- Monitor RFID time-in and time-out records.
- Manually create, view, update, and delete attendance records.
- Generate and export branch-specific reports.
- Monitor scanner status and pending attendance synchronization.

### Security and Permissions

- Enforce permissions on the backend, not only in the user interface.
- Restrict front desk access to assigned branches.
- Validate access to customer, membership, payment, and attendance records.
- Record important administrative actions in audit logs.
- Protect customer information and prevent unauthorized profile access.

## RFID Attendance Workflow

GyTrak is designed to continue recording attendance even when the internet is unavailable.

1. A member or coach scans their RFID keyfob.
2. The local backend processes the scan and records the attendance event in SQLite.
3. Pending records remain stored locally while offline.
4. When connectivity returns, pending records are synchronized with the central PostgreSQL database.
5. Successfully synchronized records are marked as synced locally.

### Scanner Functions

- **Scanner 1:** Time-in
- **Scanner 2:** Time-out
- **Registration Reader:** Optional front desk RFID reader for assigning keyfobs to customer profiles.

## QR Code Registration Workflow

1. A visitor scans the QR code displayed at the gym branch.
2. The visitor fills out the required information through a mobile-friendly registration page.
3. GyTrak checks for an existing customer profile or potential duplicate.
4. A new customer profile is created, or the existing profile is retrieved after identity verification.
5. The visit is recorded separately from registration and confirmed when the visitor actually checks in at the gym.
6. Returning walk-in visitors can use their existing profiles for subsequent visits.
7. If a walk-in purchases a membership, front desk staff update the customer's membership information and assign an RFID keyfob without creating another profile.

## Tech Stack

- **Go** — Backend development
- **Gin** — HTTP routing and API development
- **SQLite** — Local storage and offline attendance records
- **PostgreSQL** — Central database
- **Supabase** — Managed PostgreSQL hosting
- **sqlc** — Type-safe database query generation
- **JWT or PASETO** — API authentication (to be determined)
- **Redis** — Optional caching and rate limiting

## Project Goals

- Simplify daily gym operations across multiple branches.
- Improve customer, membership, and attendance management.
- Reduce duplicate customer profiles and preserve visit history.
- Make walk-in registration faster through QR codes.
- Support reliable offline attendance recording and synchronization.
- Provide useful reports for attendance, revenue, and branch performance.
- Maintain data consistency, security, and accountability.

## Development Status

GyTrak is currently under development. Features, architecture, and implementation details may change as development progresses.

## License

No license has been selected yet.
