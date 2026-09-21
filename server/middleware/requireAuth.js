// server/middleware/requireAuth.js
//
// JWT authentication middleware for all protected /api/capsules routes
// (and any other protected route that needs it).
//
// Contract required by the assignment spec:
//  - No cookie at all              -> 401 Unauthorized
//  - Cookie present but NOT a valid, correctly-signed JWT -> 401 Unauthorized
//  - Valid JWT                     -> req.user is set from the VERIFIED token
//                                      payload; the frontend/body can never
//                                      override who the caller is.

const { verifyUserToken } = require('../lib/jwt');

function requireAuth(req, res, next) {
  const token = req.cookies && req.cookies.token;

  if (!token) {
    return res.status(401).json({ error: 'Unauthorized: no session token' });
  }

  try {
    const payload = verifyUserToken(token);
    // The verified JWT is the ONLY source of identity for CRUD ownership.
    req.user = {
      id: payload.sub,
      username: payload.username,
      avatarUrl: payload.avatarUrl,
    };
    return next();
  } catch (err) {
    return res.status(401).json({ error: 'Unauthorized: invalid or expired session token' });
  }
}

module.exports = { requireAuth };
