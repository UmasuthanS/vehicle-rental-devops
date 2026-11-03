# Vehicle Rental — Full-stack Authentication

Group 79 · University of Ruhuna, Faculty of Engineering

React 19 + Vite + Tailwind, Express 5, MySQL/mysql2, bcrypt and JWT. Existing React components and the centralized fetch client are retained. Public signup creates customers only. Accounts can sign in, open a role-specific dashboard, refresh with their session intact, and sign out.

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
