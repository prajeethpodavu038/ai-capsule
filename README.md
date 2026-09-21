# AI Capsule — Cloud-Deployed AI Prompt Manager

A small full-stack CRUD application for saving and reviewing AI prompts, built for
Assignment 3 (CSE3CWA / CSE5006). React frontend, Node/Express backend, SQLite storage,
GitHub OAuth login, and an application JWT stored in a Secure, HttpOnly cookie.
---

## 1. Deployed application

| | |
|---|---|
| **Public URL** | `https://ai-capsule-f4j4.onrender.com` |

| **Cloud platform** | Render (free Web Service plan) |
| **Repository** | `https://github.com/prajeethpodavu038/ai-capsule` |

---

## 2. Tech stack

| Component | Choice |
|---|---|
| Frontend | React 18 (Vite) |
| Backend | Node.js + Express 4 |
| Auth | GitHub OAuth (web application flow) |
| Session | Application JWT, signed by Express, stored in a `Secure`, `HttpOnly` cookie named `token` |
| Database | SQLite (`better-sqlite3`) |
| Deployment | Render, single web service serving both the API and the built React app |

The frontend and backend are deployed as **one service on one origin**. Express serves
the built React app (`client/dist`) as static files *and* exposes the `/api/*` JSON
API from the same process and the same public URL. This is the approach the assignment
brief recommends (Section 8) specifically because it avoids CORS and cross-origin
cookie configuration — the browser, the API, and the `token` cookie are always on the
same origin, in both local development and production.

---

## 3. Installation and run instructions (local)

Requirements: Node.js 18+ and npm.

```bash
# 1. Install backend dependencies (repo root)
npm install

# 2. Install frontend dependencies and build the React app into client/dist
npm run build

# 3. Copy the env template and fill in real values (see Section 6 for what each one means)
cp .env.example .env

# 4. Start the server (serves the API AND the built frontend on one port)
npm start
# -> AI Capsule server listening on port 4000
```

Open `http://localhost:4000`. `GET /login` will redirect to GitHub, so GitHub OAuth
credentials in `.env` must be valid for login to work locally (Section 9 explains how
to create them). `GET /api/health` and the two required cURL checks work immediately,
without any OAuth app configured.

**Optional — frontend hot-reload during development:** `npm run dev:client` starts a
Vite dev server on port 5173 that proxies `/api`, `/login`, `/logout`, `/auth` and
`/dashboard` to the Express server on port 4000 (see `client/vite.config.js`), so you
can edit React components with instant refresh while the backend keeps running via
`npm run dev:server`. This is purely a development convenience; the deployed app always
runs the single-service setup in Section 2.

**Automated tests:** `npm test` runs `server/test/api.test.js` against a running server
(`BASE_URL` env var, default `http://localhost:4000`). It signs real application JWTs
with the same helper the OAuth callback uses, for two different simulated users, and
checks the full CRUD cycle, both required 401 cases, and cross-user ownership
isolation. See Section 10 for how this was actually run and what it found.

---

## 4. Required pages & API routes

| Route | Access | Purpose |
|---|---|---|
| `GET /` | Public | Landing page explaining AI Capsule |
| `GET /login` | Public | Starts GitHub OAuth login (redirects to GitHub) |
| `GET /dashboard` | Protected | Shows the authenticated user's records (server-side gated — see Section 9) |
| `GET /api/health` | Public | Returns `{ "status": "ok" }` |
| `GET /api/capsules` | Protected | Read the caller's own records |
| `POST /api/capsules` | Protected | Create a record owned by the caller |
| `PUT /api/capsules/:id` | Protected | Update a record — only if owned by the caller |
| `DELETE /api/capsules/:id` | Protected | Delete a record — only if owned by the caller |
| `GET /auth/github/callback` | Public | GitHub OAuth callback (exchanges code, issues the app JWT) |
| `GET /logout` | Public | Clears the `token` cookie |
| `GET /api/me` | Protected | Returns the caller's `{ id, username, avatarUrl }` (used by the dashboard header, not required by the spec) |

None of the required paths (`/api/health`, `/api/capsules`, `/api/capsules/:id`) are
renamed or placed under a different prefix.

**How the React frontend talks to Express:** the frontend is a single-page app
(`client/src`) that calls the JSON API with `fetch(..., { credentials: 'include' })`
(see `client/src/lib/api.js`) so the browser automatically attaches the `token` cookie
on every request. Because both are served from the same origin in production, no CORS
headers or cross-site cookie flags are needed. `Landing.jsx` calls `GET /api/health` to
show a live backend status. `Dashboard.jsx` calls `GET /api/me` and
`GET /api/capsules` on load, and `POST` / `PUT` / `DELETE /api/capsules` for create,
update and delete.

---

## 5. Database

SQLite via `better-sqlite3`, initialised automatically on server start
(`server/db.js` runs `CREATE TABLE IF NOT EXISTS ...` on boot — no separate migration
step is needed). Schema (matches the assignment spec exactly, Section 6):

```sql
CREATE TABLE capsules (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id TEXT NOT NULL,
  project_name TEXT NOT NULL,
  prompt_title TEXT NOT NULL,
  prompt_version TEXT,
  prompt_text TEXT NOT NULL,
  response_summary TEXT,
  category TEXT,
  usefulness TEXT,
  reviewed INTEGER DEFAULT 0,
  improved INTEGER DEFAULT 0,
  screenshot_url TEXT,
  notes TEXT,
  created_at TEXT DEFAULT CURRENT_TIMESTAMP
);
```

A second table, `users` (id, username, avatar_url, last_login_at), is *not* required by
the spec — it just lets the dashboard greet the signed-in user by name/avatar without
re-calling the GitHub API on every page load.

**User ownership:** `capsules.user_id` stores the GitHub numeric user id (as text).
It is written only from `req.user.id`, which `requireAuth` middleware sets from the
**verified JWT payload** — never from anything in the request body or query string
(see `server/routes/capsules.js`, the `POST` handler uses `user_id: req.user.id`).
`GET`, `PUT` and `DELETE` all filter/check `WHERE user_id = req.user.id` before
touching a row, so one user can never read, edit or delete another user's capsule.

**Persistent or ephemeral storage:** **ephemeral.** This app is deployed on Render's
free Web Service plan, which only provides local disk to the running instance — the
assignment brief flags this directly (Section 8: *"SQLite works normally, but its data
may be lost after a restart or redeployment because the local filesystem is
temporary"*). The SQLite file lives at `DB_PATH` (default `./data/ai_capsule.sqlite3`)
inside the deployed instance's own filesystem, so a redeploy, a manual restart, or the
free instance spinning down after inactivity and back up can wipe existing records. The
schema recreates itself automatically either way (`CREATE TABLE IF NOT EXISTS`), so the
app never crashes — you just start from an empty `capsules` table. This is disclosed
again as the one honest limitation in Section 12.

---

## 6. Environment variables

Set in `.env` locally (never committed — see `.gitignore`) and in the Render
dashboard's Environment tab for the deployed instance. No real values are included in
this repository or this README.

| Variable | Purpose |
|---|---|
| `PORT` | Port Express listens on (Render sets this itself in production) |
| `NODE_ENV` | `production` on Render — controls whether the `token` cookie is marked `Secure` |
| `JWT_SECRET` | Secret used to sign/verify the application JWT |
| `GITHUB_CLIENT_ID` | GitHub OAuth App client ID |
| `GITHUB_CLIENT_SECRET` | GitHub OAuth App client secret |
| `GITHUB_CALLBACK_URL` | Must exactly match the OAuth App's "Authorization callback URL" |
| `APP_BASE_URL` | This app's own public base URL |
| `DB_PATH` | Path to the SQLite file |

See `.env.example` for the local-dev template with placeholder (non-secret) values.

---

## 7. OAuth, JWT & backend protection

**Provider used: GitHub OAuth** (the assignment's recommended option — no fallback to
Google was needed).

**Flow** (`server/routes/auth.js`):

1. `GET /login` generates a random `state` value, stores it in a short-lived cookie,
   and redirects the browser to GitHub's `/login/oauth/authorize` with that `state`.
2. The user approves access on GitHub's own page.
3. GitHub redirects back to `GET /auth/github/callback?code=...&state=...`. The server
   checks `state` matches the cookie (CSRF protection), then makes a **server-to-server**
   POST to `https://github.com/login/oauth/access_token` to exchange `code` for a
   GitHub access token.
4. The server calls `https://api.github.com/user` with that GitHub access token to get
   the user's GitHub id, username and avatar.
5. **The GitHub access token is discarded here.** It is never sent to the browser and
   never stored. Instead, the server signs its **own application JWT**
   (`server/lib/jwt.js`, using `jsonwebtoken`) containing `{ sub: githubUserId,
   username, avatarUrl }`, signed with `JWT_SECRET`.
6. That JWT is set as the `token` cookie: `httpOnly: true`, `secure: true` in
   production (requires HTTPS — satisfied on Render), `sameSite: 'lax'`, 7-day
   `maxAge`. It is **not** stored in `localStorage` and never sent as an
   `Authorization: Bearer` header.
7. The browser is redirected to `/dashboard`.

**Server-side verification** (`server/middleware/requireAuth.js`): every route under
`/api/capsules` (`GET`, `POST`, `PUT`, `DELETE`) is mounted behind this middleware in
`server/index.js` (`app.use('/api/capsules', requireAuth, capsulesRoutes)`). It reads
the `token` cookie, calls `jwt.verify()` against `JWT_SECRET`, and:
- if there is no cookie at all → `401 Unauthorized`
- if the cookie's value doesn't verify (wrong signature, malformed, expired) → `401 Unauthorized`
- otherwise sets `req.user = { id, username, avatarUrl }` from the **verified token
  payload** and calls `next()`.

The `GET /dashboard` **page** route (not an API route) does the same verification
directly in `server/index.js` before deciding whether to serve the React app shell or
redirect to `/?login_required=1` — so an unauthenticated browser is bounced before it
even receives the dashboard page, not just before it can fetch data.

---

## 8. Required cURL checks

Run against `GET /api/capsules` before submission, exactly as specified in the brief.

```bash
# Test 1 - no authentication
curl -i https://YOUR-APP/api/capsules
# Required: 401 Unauthorized

# Test 2 - fake / invalid JWT
curl -i -H "Cookie: token=fake-token-123" https://YOUR-APP/api/capsules
# Required: 401 Unauthorized
```

**Results obtained locally** **Results obtained against the deployed Render URL**

Test 1 — no authentication:

    curl.exe -i https://ai-capsule-f4j4.onrender.com/api/capsules

    HTTP/1.1 401 Unauthorized

    {"error":"Unauthorized: no session token"}

Test 2 — fake / invalid JWT:

    curl.exe -i -H "Cookie: token=fake-token-123" https://ai-capsule-f4j4.onrender.com/api/capsules

    HTTP/1.1 401 Unauthorized

    {"error":"Unauthorized: invalid or expired session token"}

Both deployed tests returned 401 Unauthorized as required. Test 1 confirms that authentication is required, while Test 2 confirms that an invalid JWT is rejected rather than merely accepting the presence of a cookie.

## 9. Required application behaviour — how it was verified

- **CREATE / READ / UPDATE / DELETE:** `server/test/api.test.js` is an automated test
  script (`npm test`) that signs two real, correctly-signed application JWTs for two
  different simulated GitHub users (using the exact same `signUserToken()` helper the
  real OAuth callback calls — not a mock), and drives the full CRUD cycle through
  actual HTTP requests against a running server: create a capsule as user A, list it
  back as user A, confirm user B's `GET /api/capsules` does **not** include it, attempt
  to `PUT`/`DELETE` user A's record as user B (both correctly return `404`, proving
  ownership is enforced), then update and delete it as the real owner (both succeed),
  and confirm the delete actually removed it.
- **Protected dashboard / no-auth rejection:** the same script asserts `GET`, `POST`,
  `PUT` and `DELETE` on `/api/capsules` all return `401` with no cookie, and `401`
  again with `Cookie: token=fake-token-123` — the two required cURL checks, run as
  code so they're checked on every test run, not just once by hand.
- **Real browser / UI verification:** beyond the API-level test above, the actual
  React UI was driven end-to-end in a headless browser (landing page → blocked
  `/dashboard` visit while logged out → authenticated dashboard → create a capsule
  through the real form → edit it → delete it with the confirm dialog → sign out →
  confirmed `/dashboard` is blocked again). This exercised the real click/submit/fetch
  path a marker would use, not just direct API calls.
 OAuth login itself was verified manually through the deployed Render application using the configured GitHub OAuth App. The deployed application successfully redirected to GitHub, returned to the application, established the authenticated session, and opened the protected dashboard. The two required deployed cURL security tests were also run manually and both returned 401 Unauthorized. These results will be demonstrated in the submitted video.

Running `npm test` locally (after `npm install`, `npm start` in one terminal, `npm
test` in another) reproduces all of the above except the live GitHub redirect.

---

## 10. AI-assisted development

**AI tool used:** Claude (Anthropic), used to design and write the backend, frontend,
tests, and this documentation.

**A problem found and corrected in AI-generated code:** the first version of the
`PUT`/`DELETE /api/capsules/:id` ownership check returned `403 Forbidden` when a
caller tried to modify a record they didn't own. On review this was changed to `404
Not Found` instead (see `server/routes/capsules.js`): returning `403` confirms to a
caller that a record with that `id` *exists*, just belongs to someone else, which is a
minor information leak about other users' data. Returning `404` for "not yours" and
"doesn't exist" alike avoids leaking that. The automated test suite (`api.test.js`)
locks this in — the cross-user `PUT`/`DELETE` assertions specifically check for `404`.
A real deployment configuration problem was also found and corrected during cloud deployment. Render initially used Node.js 26, and better-sqlite3 failed to install because a compatible prebuilt binary was unavailable and the native build failed. The deployment was corrected by explicitly setting NODE_VERSION=22.22.0 in Render. A second deployment configuration issue occurred when the SQLite database path was set to /var/data on the Render Free Web Service, which does not provide a persistent disk. The DB_PATH was changed to ./data/ai_capsule.sqlite3, allowing the application to deploy on the free service. The assignment brief permits this approach and requires the temporary-storage limitation to be documented.
**One implementation decision I can explain independently:** Express **4.19** was
pinned deliberately rather than using Express 5. The SPA fallback route (serving
`index.html` for any non-`/api` `GET`, so React Router can handle client-side
navigation) is written as `app.get(/^(?!\/api\/).*/, ...)`. Express 5 upgraded its
underlying router to `path-to-regexp@8`, which removed support for the classic
`app.get('*', ...)` wildcard entirely and changed splat-parameter syntax
(`/*splat` instead of a bare `*`); mixing that with a hand-written negative-lookahead
regex route is easy to get subtly wrong and hard to unit-test quickly under deadline.
Express 4's router still supports both plain string wildcards and full regex routes
predictably, so the same fallback logic is one line and behaves exactly as tested.
This also matches Section 8's advice to keep the deployment as simple as possible
rather than adding complexity that doesn't earn marks.

---

## 11. One honest limitation

**Storage is ephemeral on the deployed instance.** As explained in Section 5, the
SQLite database lives on Render's free-tier local disk, which is not persisted across
restarts, redeploys, or the free instance spinning down after inactivity. In practice
this means: capsules created during one grading session could be gone if the service
restarts before or during a later viewing. The schema always recreates itself
automatically, so the app never errors — it just starts from zero records. A
production version of this app would move to Render's managed Postgres (or another
persistent database) instead of local SQLite; that swap only touches `server/db.js`
and the SQL in `server/routes/capsules.js`, since nothing else references the storage
engine directly.

*(A second, smaller limitation: the application JWT is long-lived — 7 days — with no
refresh-token rotation, so a signed-in user simply stays signed in until the cookie
expires or they hit "Sign out"; there is no server-side session revocation list.)*

---