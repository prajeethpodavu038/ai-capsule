// server/lib/jwt.js
//
// Thin wrapper around jsonwebtoken for the *application* JWT.
// This is intentionally separate from the GitHub OAuth access token:
// once we have confirmed the user's GitHub identity, we throw the GitHub
// token away and issue our own short-lived, HS256-signed JWT that only
// our backend can create and verify.

const jwt = require('jsonwebtoken');

const JWT_SECRET = process.env.JWT_SECRET;
const JWT_EXPIRES_IN = '7d';

if (!JWT_SECRET) {
  // Fail loudly and early rather than silently signing tokens with `undefined`.
  console.error('FATAL: JWT_SECRET is not set. Copy .env.example to .env and set a real secret.');
  process.exit(1);
}

/**
 * Sign an application JWT for an authenticated user.
 * @param {{ id: string, username: string, avatarUrl?: string }} user
 */
function signUserToken(user) {
  return jwt.sign(
    { sub: user.id, username: user.username, avatarUrl: user.avatarUrl || null },
    JWT_SECRET,
    { expiresIn: JWT_EXPIRES_IN, issuer: 'ai-capsule' }
  );
}

/**
 * Verify an application JWT. Throws if missing/invalid/expired.
 */
function verifyUserToken(token) {
  return jwt.verify(token, JWT_SECRET, { issuer: 'ai-capsule' });
}

module.exports = { signUserToken, verifyUserToken };
