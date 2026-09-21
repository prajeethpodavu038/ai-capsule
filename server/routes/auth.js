// server/routes/auth.js
//
// GitHub OAuth "web application flow" + application JWT issuance.
// See: https://docs.github.com/en/apps/oauth-apps/building-oauth-apps/authorizing-oauth-apps
//
// Flow:
//   1. GET /login
//        -> generate a random `state`, stash it in a short-lived cookie,
//           302 redirect the browser to GitHub's authorize URL.
//   2. User approves on GitHub.
//   3. GET /auth/github/callback?code=...&state=...
//        -> verify `state` matches the cookie (CSRF protection)
//        -> exchange `code` for a GitHub access token (server-to-server)
//        -> call GitHub's /user API with that access token
//        -> create/update a local `users` row
//        -> sign OUR OWN application JWT (not the GitHub token!) with the
//           GitHub user id as `sub`
//        -> set it as a Secure, HttpOnly cookie named `token`
//        -> redirect to /dashboard
//   4. GET /logout clears the cookie.
//   5. GET /api/me returns the signed-in user's basic profile (protected).

const crypto = require('node:crypto');
const express = require('express');
const db = require('../db');
const { signUserToken } = require('../lib/jwt');
const { requireAuth } = require('../middleware/requireAuth');

const router = express.Router();

const GITHUB_AUTHORIZE_URL = 'https://github.com/login/oauth/authorize';
const GITHUB_TOKEN_URL = 'https://github.com/login/oauth/access_token';
const GITHUB_USER_API_URL = 'https://api.github.com/user';

const isProd = process.env.NODE_ENV === 'production';

function requireEnv(name) {
  const value = process.env[name];
  if (!value) throw new Error(`Missing required environment variable: ${name}`);
  return value;
}

// GET /login (public) - starts GitHub OAuth login.
router.get('/login', (req, res) => {
  let clientId;
  try {
    clientId = requireEnv('GITHUB_CLIENT_ID');
    requireEnv('GITHUB_CALLBACK_URL');
  } catch (err) {
    return res
      .status(500)
      .send('OAuth is not configured on this server: ' + err.message);
  }

  const state = crypto.randomBytes(16).toString('hex');

  // Short-lived cookie just to survive the round trip to GitHub and back.
  // This is NOT the application session cookie (`token`).
  res.cookie('oauth_state', state, {
    httpOnly: true,
    secure: isProd,
    sameSite: 'lax',
    maxAge: 5 * 60 * 1000, // 5 minutes
  });

  const params = new URLSearchParams({
    client_id: clientId,
    redirect_uri: process.env.GITHUB_CALLBACK_URL,
    scope: 'read:user',
    state,
    allow_signup: 'true',
  });

  res.redirect(`${GITHUB_AUTHORIZE_URL}?${params.toString()}`);
});

// GET /auth/github/callback (public) - GitHub redirects here after approval.
router.get('/auth/github/callback', async (req, res) => {
  const { code, state } = req.query;
  const cookieState = req.cookies && req.cookies.oauth_state;

  res.clearCookie('oauth_state');

  if (!code || !state || !cookieState || state !== cookieState) {
    return res.status(401).send('OAuth login failed: invalid or expired state. Please try logging in again.');
  }

  try {
    const clientId = requireEnv('GITHUB_CLIENT_ID');
    const clientSecret = requireEnv('GITHUB_CLIENT_SECRET');
    const redirectUri = requireEnv('GITHUB_CALLBACK_URL');

    // 1) Exchange the temporary `code` for a GitHub access token.
    const tokenResp = await fetch(GITHUB_TOKEN_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Accept: 'application/json',
      },
      body: JSON.stringify({
        client_id: clientId,
        client_secret: clientSecret,
        code,
        redirect_uri: redirectUri,
      }),
    });
    const tokenData = await tokenResp.json();

    if (!tokenData.access_token) {
      console.error('GitHub token exchange failed:', tokenData);
      return res.status(401).send('OAuth login failed: could not obtain access token from GitHub.');
    }

    // 2) Use the GitHub access token to fetch the user's profile.
    //    This token is used once, here, on the server, and then discarded -
    //    it is never sent to the browser and never stored.
    const userResp = await fetch(GITHUB_USER_API_URL, {
      headers: {
        Authorization: `Bearer ${tokenData.access_token}`,
        Accept: 'application/vnd.github+json',
        'User-Agent': 'ai-capsule-app',
      },
    });
    const githubUser = await userResp.json();

    if (!githubUser || !githubUser.id) {
      console.error('GitHub user fetch failed:', githubUser);
      return res.status(401).send('OAuth login failed: could not fetch GitHub profile.');
    }

    const userId = String(githubUser.id); // stable GitHub numeric user id, as a string
    const username = githubUser.login;
    const avatarUrl = githubUser.avatar_url;

    // 3) Upsert a local user row (nice-to-have, not required by the spec).
    db.prepare(
      `INSERT INTO users (id, username, avatar_url, last_login_at)
       VALUES (?, ?, ?, CURRENT_TIMESTAMP)
       ON CONFLICT(id) DO UPDATE SET
         username = excluded.username,
         avatar_url = excluded.avatar_url,
         last_login_at = CURRENT_TIMESTAMP`
    ).run(userId, username, avatarUrl);

    // 4) Issue OUR OWN application JWT. This is the token the assignment
    //    requires - a GitHub access token is never used as the session.
    const appToken = signUserToken({ id: userId, username, avatarUrl });

    // 5) Store it in a Secure, HttpOnly cookie named `token`.
    res.cookie('token', appToken, {
      httpOnly: true,
      secure: isProd, // requires HTTPS in production; allowed over http in local dev
      sameSite: 'lax',
      maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days, matches JWT expiry
      path: '/',
    });

    return res.redirect('/dashboard');
  } catch (err) {
    console.error('OAuth callback error:', err);
    return res.status(500).send('OAuth login failed due to a server error.');
  }
});

// GET /logout (public) - clears the session cookie.
router.get('/logout', (req, res) => {
  res.clearCookie('token', { path: '/' });
  res.redirect('/');
});

// GET /api/me (protected) - basic profile for the signed-in user.
router.get('/api/me', requireAuth, (req, res) => {
  res.json({ id: req.user.id, username: req.user.username, avatarUrl: req.user.avatarUrl });
});

module.exports = router;
