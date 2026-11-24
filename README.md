# Sweety — Blood Glucose Monitoring & Reporting Application

Sweety is a full-stack health application designed to help individuals track daily blood glucose readings, monitor daily control, and analyze glycemic patterns through structured daily, month-to-date, and previous-month statistical reports.

---

## Table of Contents

- [Features](#features)
- [Tech Stack](#tech-stack)
- [Project Structure](#project-structure)
- [Prerequisites](#prerequisites)
- [Database Setup](#database-setup)
- [Environment Configuration](#environment-configuration)
- [Installation & Running Locally](#installation--running-locally)
  - [1. Backend Setup](#1-backend-setup)
  - [2. Frontend Setup](#2-frontend-setup)
- [Database Seeding & Demo Account](#database-seeding--demo-account)
- [Automated Backend Testing](#automated-backend-testing)
- [API Reference](#api-reference)
- [Business Logic & Validation Rules](#business-logic--validation-rules)
- [Design Decisions & Assumptions](#design-decisions--assumptions)
- [Future Improvements](#future-improvements)

---

## Features

* **Authentication & Authorization**: Secure signup and login with JWT and salted bcrypt password hashing (`cost = 12`).
* **Daily Glucose Tracking**: Record blood glucose levels across 4 designated meal slots (`Morning`, `After breakfast`, `After lunch`, `After dinner`).
* **Strict Daily Limits**: Enforces a strict limit of at most 4 readings per day (`"You can add only 4 readings per day."`) and prevents duplicate slots for the same calendar date.
* **Full CRUD Operations**: Create, view, filter by date, update, and delete readings with strict user data isolation.
* **Interactive Dashboard**: Real-time overview displaying today's progress, slot-by-slot status cards, quick logging modals, and instant summary metrics.
* **Comprehensive Reporting**:
  * **Daily Report**: Summary statistics (highest, lowest, average, count) and slot-ordered individual readings.
  * **Month-to-Date (MTD) Report**: Aggregated statistics from the 1st of the active month up to the selected date.
  * **Monthly Report**: Comprehensive retrospective analysis covering the entire **previous calendar month**.
* **Zero Timezone Drift**: Configured PostgreSQL type parsing preventing UTC midnight shifts across date filters.

---

## Tech Stack

### Backend
* **Runtime**: Node.js (CommonJS)
* **Framework**: Express 5
* **Database**: PostgreSQL 14+
* **Driver**: `node-postgres` (`pg`) with custom type parsers for zero-shift dates
* **Authentication**: JSON Web Tokens (`jsonwebtoken`) & `bcrypt`
* **Validation**: Custom Express validation middleware with structured error responses
* **Testing**: Jest 30 & Supertest 7

### Frontend
* **Framework**: React 19 (Vite)
* **Routing**: React Router DOM 7 (with `ProtectedRoute` & `PublicRoute` guards)
* **Styling**: Tailwind CSS 4
* **HTTP Client**: Axios with centralized request/response interceptors

---

## Project Structure

```text
Sweety/
├── client/                       # React 19 + Vite frontend
│   ├── src/
│   │   ├── api/                  # Axios API clients (auth, readings, reports)
│   │   ├── components/           # UI components (dashboard, readings, layout)
│   │   ├── context/              # React Context (AuthContext)
│   │   ├── hooks/                # Custom hooks (useAuth)
│   │   ├── pages/                # Page views (Dashboard, Readings, Reports, Login, Register)
│   │   └── utils/                # Date formatting and normalization utilities
│   ├── eslint.config.js          # ESLint configuration
│   └── package.json
│
├── database/
│   └── schema.sql                # PostgreSQL DDL schema (tables, constraints, indexes)
│
├── server/                       # Express 5 backend
│   ├── scripts/
│   │   └── seed.js               # Idempotent development seed script
│   ├── src/
│   │   ├── config/
│   │   │   └── database.js       # PostgreSQL Pool configuration & DATE type parser
│   │   ├── controllers/          # Business logic (auth, readings, reports)
│   │   ├── middleware/           # JWT auth middleware
│   │   ├── routes/               # Express routers (/api/auth, /api/readings, /api/reports)
│   │   ├── validators/           # Request input validators
│   │   └── app.js                # Express app configuration & middleware pipeline
│   ├── tests/                    # Automated integration test suite
│   │   ├── helpers/              # Test authentication and DB cleanup helpers
│   │   ├── setup.js              # Test database safety guard & pool teardown
│   │   ├── auth.test.js          # Authentication endpoint tests
│   │   ├── readings.test.js      # Reading CRUD, constraint, and isolation tests
│   │   └── reports.test.js       # Daily, MTD, and Monthly report tests
│   ├── .env                      # Local development environment configuration
│   ├── .env.example              # Environment variables template
│   ├── .env.test                 # Isolated test database environment configuration
│   ├── jest.config.js            # Jest test configuration
│   ├── package.json
│   └── server.js                 # Server entry point
│
└── README.md                     # Project documentation
```

---

## Prerequisites

Before setting up the project, ensure you have installed:

* **Node.js**: `v18.0.0` or higher (verified on Node.js v24)
* **npm**: `v9.0.0` or higher
* **PostgreSQL**: `v14` or higher running locally on port `5432`

---

## Database Setup

1. Open your terminal or `psql` shell as the `postgres` superuser:

```sql
-- 1. Create the application user (if not already created)
CREATE USER sweety_app WITH PASSWORD 'postgres';

-- 2. Create the development database
CREATE DATABASE sweety OWNER sweety_app;

-- 3. Create the dedicated testing database
CREATE DATABASE sweety_test OWNER sweety_app;
```

2. Apply the schema to the development database:

```powershell
# Using psql
psql -U sweety_app -h localhost -p 5432 -d sweety -f "database/schema.sql"
```

3. Apply the schema to the test database:

```powershell
# Using psql
psql -U sweety_app -h localhost -p 5432 -d sweety_test -f "database/schema.sql"
```

---

## Environment Configuration

The backend reads configuration settings from `server/.env`. Copy the provided template:

```powershell
cd server
copy .env.example .env
```

Verify your `server/.env` parameters:

```env
PORT=5000

DB_HOST=localhost
DB_PORT=5432
DB_NAME=sweety
DB_USER=sweety_app
DB_PASSWORD=postgres

CLIENT_URL=http://localhost:5173

JWT_SECRET=your_jwt_secret_key_here
JWT_EXPIRES_IN=1d

APP_TIME_ZONE=Asia/Kolkata
```

---

## Installation & Running Locally

### 1. Backend Setup

```powershell
cd server

# Install backend dependencies
npm install

# Start development server with nodemon
npm run dev

# Or start standard production server
npm start
```
The server will start listening at `http://localhost:5000`. You can verify API health at `http://localhost:5000/api/health`.

### 2. Frontend Setup

In a separate terminal window:

```powershell
cd client

# Install frontend dependencies
npm install

# Start Vite development server
npm run dev
```
The frontend interface will open at `http://localhost:5173`.

---

## Database Seeding & Demo Account

The project includes an **idempotent seed script** that populates the development database (`sweety`) with sample readings covering multiple historical days, all 4 meal slots, and entries in the previous month to demonstrate all dashboard features and reports immediately.

```powershell
cd server
npm run seed
```

### Safety Guard
The seed script includes an explicit database guard: it checks `SELECT current_database()` and will immediately abort if executed against `sweety_test` or any non-development database.

### Demo Login Credentials
* **Email:** `demo@sweety.app`
* **Password:** `Password123!`

---

## Automated Backend Testing

Sweety includes a comprehensive automated integration test suite written with **Jest 30** and **Supertest 7**.

### Safety Guarantees
* All tests are strictly sandboxed in the dedicated `sweety_test` database.
* [setup.js](file:///d:/All%20Dev%20Projects%20Kenpath-Assignment-Webapp/Sweety/server/tests/setup.js) validates that the connected database name is strictly `sweety_test`. If any connection to `sweety` is detected, the run aborts immediately.
* Cleanup routines only remove test-generated records (`@test.sweety`).
* Database connections are cleanly closed upon completion with no hanging handles.

### Running Tests

```powershell
cd server
npm test
```

### Test Coverage Highlights
* **45 passing integration tests**:
  * **Authentication (`tests/auth.test.js`)**: Registration, email collision (`409`), missing fields (`400`), length/format bounds, password constraints (8-72 bytes), login authentication (`200`/`401`), profile retrieval (`/me`), and token verification.
  * **Readings (`tests/readings.test.js`)**: Full CRUD lifecycle, slot constraints, glucose boundary checks (40-600 mg/dL), future date rejection, duplicate slot prevention (`409`), explicit daily limit enforcement (`"You can add only 4 readings per day."`), and multi-user data isolation.
  * **Reports (`tests/reports.test.js`)**: Daily slot sorting, month-to-date range aggregation, previous-month aggregation, null/empty period summaries, and cross-user isolation.

---

## API Reference

All protected endpoints require an `Authorization: Bearer <token>` header.

### Authentication (`/api/auth`)
| Method | Endpoint | Access | Description |
| :--- | :--- | :---: | :--- |
| `POST` | `/api/auth/register` | Public | Register a new user (`name`, `email`, `password`) |
| `POST` | `/api/auth/login` | Public | Authenticate user credentials and receive JWT |
| `GET` | `/api/auth/me` | Protected | Fetch current authenticated user profile |

### Readings (`/api/readings`)
| Method | Endpoint | Access | Description |
| :--- | :--- | :---: | :--- |
| `GET` | `/api/readings` | Protected | List user readings (optional `?date=YYYY-MM-DD` filter) |
| `GET` | `/api/readings/:id` | Protected | Fetch specific reading by ID |
| `POST` | `/api/readings` | Protected | Create new reading (`date`, `slot`, `value`) |
| `PUT` | `/api/readings/:id` | Protected | Update existing reading (`date`, `slot`, `value`) |
| `DELETE` | `/api/readings/:id` | Protected | Delete reading by ID |

### Reports (`/api/reports`)
| Method | Endpoint | Access | Description |
| :--- | :--- | :---: | :--- |
| `GET` | `/api/reports/daily` | Protected | Day statistics and slot-ordered readings (`?date=YYYY-MM-DD`) |
| `GET` | `/api/reports/month-to-date` | Protected | Aggregated statistics from 1st of month to anchor date |
| `GET` | `/api/reports/monthly` | Protected | Complete retrospective statistics for the **previous month** |

### System Health
| Method | Endpoint | Access | Description |
| :--- | :--- | :---: | :--- |
| `GET` | `/api/health` | Public | Check server uptime status |
| `GET` | `/api/health/db` | Public | Verify live PostgreSQL database connection |

---

## Business Logic & Validation Rules

1. **Slots**: Allowed values are strictly:
   * `'Morning'`
   * `'After breakfast'`
   * `'After lunch'`
   * `'After dinner'`
2. **Daily Limit**:
   * A user can have at most **4 readings per day** (one for each designated slot).
   * Attempting to create a 5th reading on the same day returns HTTP `400` with:
     ```json
     {
       "success": false,
       "message": "You can add only 4 readings per day."
     }
     ```
   * Attempting to move an existing reading to a date that already has 4 readings also triggers this limit.
3. **Duplicate Slot Constraint**:
   * Attempting to insert a reading for an existing slot on the same day returns HTTP `409 Conflict`:
     ```json
     {
       "success": false,
       "message": "A reading already exists for this slot and date."
     }
     ```
4. **Glucose Range**:
   * Must be a positive integer between **40 mg/dL** and **600 mg/dL**. Decimals and non-integers are rejected.
5. **Date Restraints**:
   * Must be in `YYYY-MM-DD` format.
   * Future dates are strictly rejected based on the configured application timezone (`APP_TIME_ZONE`).
6. **Reporting Window Definitions**:
   * **Daily**: `[selectedDate, selectedDate]`.
   * **Month-to-Date**: `[1st of selectedDate's month, selectedDate]`.
   * **Monthly**: Covers the entire preceding calendar month (e.g., if querying with a date in November 2026, the report aggregates October 1 to October 31, 2026).

---

## Design Decisions & Assumptions

* **Zero-Shift Date Handling**: In Node.js, `pg` by default converts PostgreSQL `DATE` types to JavaScript `Date` instances at local midnight. When serialized to JSON, UTC conversion shifts the date back by the timezone offset (turning `2026-11-24` into `2026-11-23T18:30:00.000Z` in IST). We registered a type parser (`types.setTypeParser(1082, val => val)`) to return pure `YYYY-MM-DD` strings directly from PostgreSQL.
* **Strict BigSerial ID Validation**: Reading IDs are validated as PostgreSQL 64-bit integer strings (`/^[1-9]\d*$/`) before query execution to avoid SQL cast errors.
* **Password Security**: Passwords are limited to 72 bytes to respect bcrypt's internal truncation boundary and require a minimum length of 8 characters.

---

## Future Improvements

* **Email Verification & Password Reset**: Support transactional email verification tokens and forgotten password reset workflows.
* **Continuous Glucose Monitor (CGM) Integration**: Support automated bulk CSV/API imports from popular CGM providers (e.g., Dexcom, FreeStyle Libre).
* **Exporting Reports**: Export monthly and daily reports as downloadable PDF charts or clinical CSV files for healthcare providers.
* **Custom Alert Thresholds**: Allow users to set personalized low (hypoglycemia) and high (hyperglycemia) targets based on physician recommendations.
