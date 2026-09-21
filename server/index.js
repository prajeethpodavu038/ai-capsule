// server/index.js
//
// Single Express app that serves BOTH the built React frontend and the
// JSON API from one origin/port. This is the deployment shape the
// assignment recommends (Section 8) specifically because it avoids CORS
// and cross-origin cookie configuration: the browser, the API and the
// `token` cookie are all on the same origin.

require('dotenv').config();

const path = require('node:path');
const fs = require('node:fs');
const express = require('express');
const cookieParser = require('cookie-parser');

const { requireAuth } = require('./middleware/requireAuth');
const { verifyUserToken } = require('./lib/jwt');
const authRoutes = require('./routes/auth');
const capsulesRoutes = require('./routes/capsules');

const app = express();
const PORT = process.env.PORT || 4000;
const CLIENT_DIST = path.join(__dirname, '..', 'client', 'dist');

app.set('trust proxy', 1); // needed on Render/behind a proxy so `secure` cookies work correctly

app.use(express.json());
app.use(cookieParser());

// ---------------------------------------------------------------------
// Public health check - required by the spec, used to verify the deployed
// backend independently of the frontend.
// ---------------------------------------------------------------------
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok' });
});

// ---------------------------------------------------------------------
// Auth routes: /login, /auth/github/callback, /logout, /api/me
// ---------------------------------------------------------------------
app.use(authRoutes);

// ---------------------------------------------------------------------
// Server-side gate for the protected dashboard PAGE itself. Real data
// protection happens at the API layer (requireAuth below), but this stops
// an unauthenticated browser from even being served the dashboard shell.
// ---------------------------------------------------------------------
app.get('/dashboard', (req, res) => {
  const token = req.cookies && req.cookies.token;
  let authed = false;
  if (token) {
    try {
      verifyUserToken(token);
      authed = true;
    } catch {
      authed = false;
    }
  }

  if (!authed) {
    return res.redirect('/?login_required=1');
  }

  const indexPath = path.join(CLIENT_DIST, 'index.html');
  if (!fs.existsSync(indexPath)) {
    return res
      .status(500)
      .send('Frontend build not found. Run "npm run build" before starting the server.');
  }
  return res.sendFile(indexPath);
});

// ---------------------------------------------------------------------
// Protected capsule CRUD API - every verb goes through requireAuth.
// ---------------------------------------------------------------------
app.use('/api/capsules', requireAuth, capsulesRoutes);

// ---------------------------------------------------------------------
// Static frontend (built by `npm run build` -> client/dist)
// ---------------------------------------------------------------------
if (fs.existsSync(CLIENT_DIST)) {
  app.use(express.static(CLIENT_DIST));
}

// Any other GET that isn't an API route falls back to the SPA's index.html
// so React Router can render "/" (and any client-only paths).
app.get(/^(?!\/api\/).*/, (req, res, next) => {
  const indexPath = path.join(CLIENT_DIST, 'index.html');
  if (!fs.existsSync(indexPath)) {
    return res
      .status(500)
      .send('Frontend build not found. Run "npm run build" before starting the server.');
  }
  res.sendFile(indexPath);
});

// JSON 404 for unmatched /api/* routes.
app.use('/api', (req, res) => {
  res.status(404).json({ error: 'Not found' });
});

// Centralized error handler so unexpected errors return JSON, not an HTML stack trace.
// eslint-disable-next-line no-unused-vars
app.use((err, req, res, next) => {
  console.error(err);
  res.status(500).json({ error: 'Internal server error' });
});

app.listen(PORT, () => {
  console.log(`AI Capsule server listening on port ${PORT}`);
});

module.exports = app;
