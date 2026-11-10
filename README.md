# Vehicle Rental Management System

Group 79 · University of Ruhuna, Faculty of Engineering

React 19 + Vite + Tailwind, Express 5, MySQL/mysql2, bcrypt and JWT. Existing React components and the centralized fetch client are retained. Public signup creates customers only. Accounts can sign in, open a role-specific dashboard, refresh with their session intact, and sign out.

## Phase 1: homepage and navigation

The public homepage is at `/`. It includes responsive navigation, a local vehicle photograph, search entry point, category links, featured inventory states, the rental process, and footer navigation. Login and registration remain at `/login` and `/register`; `/dashboard` preserves the existing customer/owner/admin landing pages. `/bookings` requires a valid session and preserves its destination through login. Unknown URLs show a recovery link.

`/vehicles` and `/vehicles/:id` are explicitly marked as upcoming Phase 2 destinations; search text and category are preserved in query parameters. Reservation functionality is not implemented in this phase. No database or backend changes were needed.

Featured vehicles request the real `/api/vehicles` endpoint through the shared fetch client, deriving the API root from the existing `VITE_API_URL` ending in `/auth`. The endpoint currently returns 404, so the homepage explains that the catalog is not connected yet. Loading, empty inventory, malformed responses, and network errors are handled separately, with retry. When the API exists, an array or `{ "vehicles": [...] }` is accepted and up to three records are displayed with database prices in LKR. No sample listings are presented as inventory. Contact details are omitted until verified information is configured.

Local commands (use the existing configured environment files):

```sh
npm ci --prefix frontend
npm start --prefix Backend
# In a second terminal:
npm run dev --prefix frontend
```

Open http://localhost:5173. Ensure `VITE_API_URL` points to the running backend auth URL and `FRONTEND_URL` matches the Vite origin; restart Vite after editing environment variables. The existing Docker files are unchanged; to display the new frontend with the existing Compose setup, rebuild it with `docker compose up -d --build frontend` and open http://localhost:8080.

Verification commands:

```sh
npm run lint --prefix frontend
npm test --prefix frontend
npm run build --prefix frontend
```

Phase 1 checks passed: frontend lint, production build, 28 frontend tests, 25 backend tests including real isolated MySQL, and both desktop/mobile authentication browser tests. The existing isolated-database authentication browser tests now start at `/login`. See the testing section below for their environment setup. Homepage desktop/mobile browser checks covered real API-unavailable feedback, category/search navigation, registration/login destinations, mobile menu state, contact scrolling, and horizontal overflow. Hero photograph: [Unsplash image source](https://images.unsplash.com/photo-1503376780353-7e6692767b70), stored locally in `frontend/src/assets/home-hero.jpg` as illustrative imagery, not listed inventory. The previous `hero.png` is a Vite starter graphic and is preserved.

Git: no local or remote develop branch existed after fetching, so local `develop` was initialized at the existing completed baseline (`0e96984`). `feature/homepage` shares that base. Push develop before opening the homepage PR, then merge the PR into develop yourself. Phase 2 begins only after explicit instruction.

## Phase 2: vehicle catalog and details

The vehicle catalog is live at `/vehicles`, backed by the MySQL `vehicles` table and `GET /api/vehicles`. It supports category filtering (`car`, `van`, `motorcycle`), text search query parameters (`q`), price range boundaries (`minPrice`, `maxPrice`), and availability status. The vehicle details page is at `/vehicles/:id`, displaying full vehicle specifications (capacity, transmission, fuel type), daily rates in LKR, descriptions, and reservation actions routing to `/bookings?vehicleId=:id`.

Backend additions:
- MySQL schema: `vehicles` table with indexes on `type`, `location`, and `available`, plus idempotent seed fixtures in `Backend/database/int.sql`.
- REST endpoints: `GET /api/vehicles` (query filters) and `GET /api/vehicles/:id` (individual vehicle details).

## Phase 3: vehicle reservation system

The reservation system is live at `/bookings`, protected by authenticated customer sessions. It provides an interactive booking interface with live vehicle selection or pre-selected vehicle information, rental start/end date pickers, rental duration calculation, and real-time total price computation using the backend database daily rates. It features immediate confirmation feedback with reference IDs, conflict/overlap prevention, and complete customer booking history with cancellation support.

Backend additions:
- MySQL schema: `reservations` table (`id`, `vehicle_id`, `customer_id`, `start_date`, `end_date`, `status`, `total_price`) with foreign keys to `vehicles` and `users`.
- Transactional reservation creation preventing double-bookings and date overlaps using database row-level locking (`FOR UPDATE`).
- Endpoints: `POST /api/reservations`, `GET /api/reservations/my`, `GET /api/reservations/:id`, and `PATCH /api/reservations/:id/cancel` with strict customer ownership and permission enforcement.



## Docker Desktop: frontend, backend and MySQL

Start Docker Desktop, then run these commands from the repository root:

```sh
node scripts/docker-setup.js
docker compose up -d --build --wait
docker compose ps
docker compose images
```

Open **http://localhost:8080**. Three local images are built:

| Image | Contents | Access |
| --- | --- | --- |
| `vehicle-rental-frontend:local` | React production build served by Nginx | http://localhost:8080 |
| `vehicle-rental-backend:local` | Node 24/Express API, running as the node user | Internal port 5000; exposed through frontend `/api/` |
| `vehicle-rental-database:local` | MySQL 8.4 plus the existing users initialization SQL | 127.0.0.1:3307 from your laptop |

The setup script creates a **root `.env`** with fresh random Docker database passwords and a signing secret, preserving it on subsequent runs. This file is ignored by Git and excluded from image build contexts. It is separate from `Backend/.env` and `frontend/.env`, which continue to configure direct local development. Containers use service DNS (`database`, `backend`), never your laptop's `localhost` for inter-container connections.

The browser uses `/api/auth` on the website origin; Nginx proxies it to Express. MySQL must be healthy with a ready users table before the backend starts, and the backend must be healthy before Nginx starts. No host Node or host MySQL installation is required to run the containers; Node is only used by the optional credential generator. Alternatively, copy root `.env.example` to `.env` and replace all password/secret placeholders yourself.

The container database starts empty and is independent from the laptop database. Existing laptop accounts are **not imported automatically**. Data persists in the project-scoped `mysql_data` named volume across restarts, rebuilds, and `docker compose down`. Never delete the volume if you want to keep those records. MySQL initialization SQL and credential environment variables take effect on the first initialization of an empty volume. Changing `.env` passwords later does not change existing MySQL users; perform a reviewed database password change instead of deleting data.

To inspect container data in Workbench, create a separate connection with hostname `127.0.0.1`, port `3307`, username `vehicle_app`, and the `DB_PASSWORD` from the **root** `.env`. Select the `vehicle_rental` schema. Or open a MySQL prompt and enter that password:

```sh
docker compose exec database mysql -u vehicle_app -p vehicle_rental
```

Useful commands:

```sh
# Inspect status/logs (do not share logs containing private account data)
docker compose ps
docker compose logs --tail=50 backend database frontend
# Run an HTTP authentication smoke test and clean up its synthetic account
node scripts/docker-smoke.js
# Optional: also recreate this project’s containers to verify data/session persistence
SMOKE_RESTART=1 node scripts/docker-smoke.js
# Stop containers; keep database records
docker compose down
# Start again using existing images and records
docker compose up -d --wait
# Apply the additive users initialization to an existing container database
docker compose exec backend npm run migrate
# Promote a registered container account through the trusted local command
docker compose exec backend npm run provision -- person@example.com owner
```

To change the website port, update both `FRONTEND_PORT` and `FRONTEND_URL` in root `.env`, then run `docker compose up -d --wait`. `DB_PUBLISHED_PORT` controls only Workbench access; the backend always uses the database container's port 3306. `docker compose build` builds all three images without starting containers. `.dockerignore` allowlists prevent local credentials, dependencies, tests, and build artifacts from entering build contexts.

This Compose configuration serves local HTTP and uses `NODE_ENV=development` so browser session cookies work. The frontend still uses a production static build. Before public deployment, add HTTPS and set `NODE_ENV=production`, the real `FRONTEND_URL`, and appropriate proxy/rate-limit configuration. The backend image itself defaults to production; Compose explicitly overrides it for localhost. MySQL is bound only to laptop loopback; the backend has no published host port. Images are built locally, without pushing to a registry. See the official [Compose startup ordering](https://docs.docker.com/compose/how-tos/startup-order/) and [MySQL image initialization](https://hub.docker.com/_/mysql/) references.

Verified: all three images built for Docker Desktop on Apple Silicon; all containers became healthy; the HTTP smoke test passed, including database/session persistence across container removal and recreation. Desktop (1440px) and mobile (390px) Chrome flows passed registration, login, refresh, role checks, and logout. Synthetic test accounts were removed.

## Run on macOS

Use Node.js 24+, npm and MySQL 8+ (verified with MySQL 9.6). From the repository root:

```sh
npm ci --prefix Backend
npm ci --prefix frontend
cp Backend/.env.example Backend/.env
cp frontend/.env.example frontend/.env
# If MySQL is not installed: brew install mysql
brew services start mysql
mysql -u root -p
```

In the MySQL prompt, initialize an application database and a dedicated local account. Replace the example password with your own; use the same value in the ignored `Backend/.env` file.

```sql
CREATE DATABASE IF NOT EXISTS vehicle_rental CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
CREATE USER IF NOT EXISTS 'vehicle_app'@'localhost' IDENTIFIED BY 'replace-with-database-password';
GRANT SELECT, INSERT, UPDATE, CREATE ON vehicle_rental.* TO 'vehicle_app'@'localhost';
EXIT;
```

Edit `Backend/.env` with your database settings. Generate a JWT secret with `openssl rand -hex 32` and paste it into that ignored file. Do not use the placeholder secret. Then:

```sh
npm run setup:db --prefix Backend
npm run dev --prefix Backend
```

In a second terminal at the repository root:

```sh
npm run dev --prefix frontend
```

Open **http://localhost:5173**. Choose **Create an account**, supply your name, email and a password containing at least 8 characters, a letter and a number (maximum 72 UTF-8 bytes). Sign in with that account. No seeded credentials or simulated authentication are provided.

`npm start --prefix Backend` runs the backend without watch mode. `npm run build --prefix frontend` builds the frontend. A production static host must serve `frontend/dist` and forward SPA paths to `index.html`.

`setup:db` safely creates the configured database and users table when absent. It requires a valid MySQL login with CREATE permission; it does not reset passwords or delete data. Run it again after fixing database settings if setup fails. Use `npm run migrate --prefix Backend` when the database already exists and only table initialization is needed.

If startup fails, the backend now identifies missing configuration, rejected MySQL credentials, unavailable MySQL, missing schema, or an occupied port. Configure the existing MySQL password in `Backend/.env`; the application cannot infer or reset it.

## Configuration

| Location | Variable | Purpose/default |
| --- | --- | --- |
| Backend | `PORT` | API port, 5000 |
| Backend | `DB_HOST`, `DB_PORT` | MySQL host and port, 127.0.0.1:3306 |
| Backend | `DB_USER`, `DB_PASSWORD`, `DB_NAME` | Database credentials and schema |
| Backend | `JWT_SECRET` | Required random secret, at least 32 characters |
| Backend | `JWT_EXPIRES_IN` | JWT/cookie lifetime, e.g. `1h` |
| Backend | `FRONTEND_URL` | Exact allowed browser origin, http://localhost:5173 |
| Backend | `NODE_ENV` | `production` enables Secure cookies; HTTPS required |
| frontend | `VITE_API_URL` | Auth API base, http://localhost:5000/api/auth |

Keep the same hostname on both sides (use localhost consistently). Production requires HTTPS and same-site frontend/API origins, for example `app.example.com` and `api.example.com`, or a reverse proxy under one origin. Cross-site hosting is intentionally unsupported with SameSite=Lax. Vite variables are public build inputs; never put secrets in them. Backend dotenv resolves relative to Backend regardless of the working directory. Shell environment values take precedence.

## Database and privileged accounts

`Backend/database/int.sql` creates `users` with an unsigned ID, name, unique email, bcrypt password hash, customer/owner/admin role and creation timestamp. Initialization is repeatable and never drops tables or records. Since the original SQL file was empty, no legacy schema transformation is needed. An incompatible preexisting users table requires a reviewed additive migration; initialization will not alter it silently. Startup checks the required columns.

Public registration ignores any supplied role. Only a trusted operator with local shell and database access can promote an existing registered account:

```sh
npm run provision --prefix Backend -- person@example.com owner
npm run provision --prefix Backend -- person@example.com admin
# Revoke privileges:
npm run provision --prefix Backend -- person@example.com customer
```

Protect shell and database access. There is no public role-management endpoint. Middleware re-reads the current database role on every authenticated request, so role changes take effect immediately.

## Architecture and API

The cookie contains an HS256 JWT with user ID, role, issuer, audience and configured expiry. It is HttpOnly, SameSite=Lax, scoped to `/api`, and Secure in production. React stores the safe user profile in memory and calls `/me` on mount. Tokens never enter localStorage or responses. Passwords use bcrypt cost 12; all user SQL values are bound parameters. Authentication middleware is reusable; `authorize(...roles)` enforces role access using the database profile. JSON errors are centralized, authentication responses are not cached, and signup/login are rate limited to 30 combined attempts per IP per 15 minutes.

Mutating requests require `X-Requested-With: VehicleRental`. If an Origin header is present it must match `FRONTEND_URL`; CORS allows only that origin with credentials. This header cannot be submitted by a cross-site HTML form, and cross-origin script requests require an allowed preflight. The shared client always includes credentials and the required header.

| Method | Endpoint | Behavior |
| --- | --- | --- |
| POST | `/api/auth/register` | `{name,email,password}` → 201 safe customer profile; 400 invalid data; 409 duplicate |
| POST | `/api/auth/login` | `{email,password}` → 200 safe profile and session cookie; 401 invalid credentials |
| GET | `/api/auth/me` | 200 current database profile; 401 missing, expired or invalid session |
| POST | `/api/auth/logout` | Clears browser session cookie; idempotent |
| GET | `/api/auth/dashboard/customer` | Customer-only authenticated landing data |
| GET | `/api/auth/dashboard/owner` | Owner-only authenticated landing data |
| GET | `/api/auth/dashboard/admin` | Admin-only authenticated landing data |

Role mismatch returns 403. The frontend renders the appropriate dashboard after login and refresh; privileged data remains protected by the API.

## Tests

```sh
npm test --prefix Backend
npm test --prefix frontend
npm run lint --prefix frontend
npm run build --prefix frontend
```

Backend's default tests use an isolated in-memory repository for the real HTTP application; MySQL tests are explicitly skipped without `TEST_DB_NAME`. For actual database and browser integration, create a **separate** test database with an administrative MySQL account:

```sql
CREATE DATABASE test_auth_local CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
CREATE USER IF NOT EXISTS 'vehicle_test'@'localhost' IDENTIFIED BY 'replace-with-test-password';
GRANT SELECT, INSERT, UPDATE, DELETE, CREATE ON test_auth_local.* TO 'vehicle_test'@'localhost';
```

Then, from the repository root, using zsh:

```sh
export TEST_DB_HOST=127.0.0.1 TEST_DB_PORT=3306 TEST_DB_USER=vehicle_test TEST_DB_NAME=test_auth_local
read -s 'TEST_DB_PASSWORD?Test database password: '
export TEST_DB_PASSWORD
npm test --prefix Backend
# Backend integration initializes the test schema before browser tests.
cd frontend
npx playwright install chromium
npm run test:e2e
# Alternatively use installed Google Chrome:
# PLAYWRIGHT_CHANNEL=chrome npm run test:e2e
cd ..
unset TEST_DB_PASSWORD
```

Only databases named `test_auth_*` are accepted. Tests delete only their randomly named synthetic accounts, never development accounts. Browser tests start isolated servers on ports 5001/5174, use a fresh random signing secret, and check desktop and mobile Chromium layouts. Ports must be free. MySQL must be accessible and its test schema initialized first. Never point tests at the development database.

Verified in this implementation: 25 backend checks passed (11 HTTP contract, 11 real MySQL integration, and 3 configuration/error checks); 15 frontend tests passed; lint and production build passed. Both desktop and mobile browser flows passed against the real Express API and isolated MySQL database.

## Limitations and manual browser checklist

JWT sessions are stateless: logout clears the browser cookie, but a separately copied token remains valid until expiry. Immediate token revocation, password recovery, account email verification, and multi-instance shared rate limiting are not implemented. Rate limiting currently uses process memory. Configure proxy trust deliberately before deployment behind a proxy. No booking/fleet functionality is added. The migration account can have CREATE permission removed after setup; trusted provisioning requires UPDATE access.

The frontend development toolchain reports six moderate advisory entries rooted in the existing ESLint/minimatch dependency tree. Production dependency audit reports zero vulnerabilities. No forced breaking dependency upgrade was applied.

Manual checks on http://localhost:5173:

- Register a unique account; verify duplicate-email, weak-password, and mismatched confirmation feedback.
- Sign in with an incorrect password, then the correct one; inspect the customer name and role.
- Refresh; confirm the dashboard persists and the cookie is HttpOnly. Confirm no token in localStorage.
- Sign out; refresh and confirm the login screen; `/api/auth/me` must return 401 without the cookie.
- Promote a test account through the local provisioning command, refresh, and verify owner/admin landing pages. Customers must receive 403 from the admin API.
- Check keyboard focus, password visibility, and forms at a narrow mobile width. Stop the API and verify the network error message.
