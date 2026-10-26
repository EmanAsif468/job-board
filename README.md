# Job Board API (Backend)

REST API for a job board where companies post jobs and candidates apply. Built with Node.js, Express and PostgreSQL.

**Live API:** https://job-board-blush.vercel.app

**Live website:** https://job-board-frontend-weld.vercel.app

**Frontend repo:** https://github.com/EmanAsif468/job-board-frontend

## Tech stack

- Node.js, Express
- PostgreSQL (hosted on Neon)
- `pg` for database access
- `bcryptjs` for password hashing
- `jsonwebtoken` for login tokens (JWT)
- Deployed on Vercel

## Features

- Register and log in as a **company** or a **candidate**
- Passwords are hashed, never stored as plain text
- Role based access: only companies can post jobs, only candidates can apply
- Ownership checks: a company can only edit, delete or view applications for its own jobs
- Filter jobs by location and type
- Parameterized SQL queries to prevent SQL injection

## API endpoints

| Method | URL | Who | Description |
|---|---|---|---|
| GET | `/jobs` | Everyone | List jobs. Optional filters: `?location=karachi&type=Part-time` |
| GET | `/jobs/:id` | Everyone | Get one job |
| POST | `/register` | Everyone | Create an account (`company` or `candidate`) |
| POST | `/login` | Everyone | Log in and receive a JWT token |
| POST | `/jobs` | Company | Create a job |
| PUT | `/jobs/:id` | Job owner (company) | Update a job |
| DELETE | `/jobs/:id` | Job owner (company) | Delete a job |
| POST | `/jobs/:id/applications` | Candidate | Apply to a job |
| GET | `/jobs/:id/applications` | Job owner (company) | List applications for a job |

Protected routes expect this header:

```
Authorization: Bearer <token>
```

## Database

Three tables: `users`, `jobs` and `applications`. The full schema is in `schema.sql`.

```
users (company) 1 ---- many jobs 1 ---- many applications
```

## Run locally

1. Install packages: `npm install`
2. Create a PostgreSQL database and run the schema: `psql -d job_board -f schema.sql`
3. Create a `.env` file:

   ```
   DB_HOST=localhost
   DB_PORT=5432
   DB_USER=postgres
   DB_PASSWORD=your_password
   DB_NAME=job_board
   JWT_SECRET=a_long_random_string
   ```

   For a hosted database you can set `DATABASE_URL` instead of the `DB_*` values. `FRONTEND_URL` sets the allowed CORS origin and defaults to `http://localhost:3001`.

4. Start the server: `npm run dev`

## Author

Built by EmanAsif468 while learning full-stack development.