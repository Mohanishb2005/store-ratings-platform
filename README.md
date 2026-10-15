# Store Ratings Platform

Full-stack role-based store ratings application built with React + Vite, Express, PostgreSQL, and JWT authentication.

## Roles
- **System Administrator**: dashboard totals; create stores/users/admins; browse/filter/sort stores and users; inspect user details.
- **Normal User**: register/login, browse/search stores, submit or update a 1–5 rating, change password.
- **Store Owner**: dashboard average rating and rating submissions for owned stores; change password.

## Requirements
- Node.js 20+
- PostgreSQL 14+
- npm

## Quick start

### 1. Database
Create a database and user (or use an existing local PostgreSQL user):
```sql
CREATE USER ratings_app WITH PASSWORD 'change_this_password';
CREATE DATABASE store_ratings OWNER ratings_app;
```
Then:
```bash
psql "postgres://ratings_app:change_this_password@localhost:5432/store_ratings" -f server/db/schema.sql
```

### 2. Configure and start API
```bash
cd server
cp .env.example .env
# Edit DATABASE_URL and JWT_SECRET in .env
npm install
npm run seed
npm run dev
```
API runs at http://localhost:4000. `npm run seed` creates a development admin account:
- Email: `admin@example.com`
- Password: `AdminPass!123`
Change/remove this account before any public deployment.

### 3. Configure and start frontend
In a second terminal:
```bash
cd client
cp .env.example .env
npm install
npm run dev
```
Open http://localhost:5173.

## Testing
```bash
cd server
npm test
```
Tests cover validation helpers and rating constraints. For API integration tests, run a test PostgreSQL database and set `TEST_DATABASE_URL`; do not point tests at production.

## Environment
See `server/.env.example` and `client/.env.example`.

## API overview
- `POST /api/auth/register` — public normal-user registration
- `POST /api/auth/login`
- `GET /api/auth/me`
- `PATCH /api/auth/password`
- `GET /api/stores` — all authenticated roles; user search via `search`, `name`, `address`; admin filters/sorting
- `POST /api/stores` — admin only
- `GET /api/admin/stats` — admin only
- `GET /api/admin/users`, `POST /api/admin/users`, `GET /api/admin/users/:id` — admin only
- `GET /api/owner/dashboard` — store owner only

## Design / security notes
- Passwords are hashed with bcrypt.
- JWT is stored in `localStorage` in this starter for simplicity. For a production deployment, prefer secure, HttpOnly, SameSite cookies plus CSRF protection, TLS, and a refresh/revocation strategy.
- API uses parameterized SQL, centralized validation/error handling, helmet, rate limiting, and explicit role middleware.
- Users can only edit their own rating. The unique `(user_id, store_id)` key prevents duplicate ratings.
- Store owners are scoped to stores linked by `stores.owner_id`.
- Frontend checks improve UX, but the API remains the source of authorization truth.
- Run migrations/backups and replace the development seed credentials before deployment.
