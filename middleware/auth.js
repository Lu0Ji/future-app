const jwt = require('jsonwebtoken');

const JWT_SECRET = process.env.JWT_SECRET || 'dev-secret-change-later';

function auth(req, res, next) {
  const authHeader = req.headers['authorization'] || req.headers.authorization;

  if (!authHeader) {
    return res.status(401).json({ error: 'Authorization header is missing.' });
  }

  const parts = authHeader.split(' ');
  if (parts.length !== 2 || parts[0] !== 'Bearer') {
    return res.status(401).json({ error: 'Invalid authorization format.' });
  }

  const token = parts[1];

  try {
    const payload = jwt.verify(token, JWT_SECRET);
    req.user = {
      id: payload.userId,
      username: payload.username,
    };
    next();
  } catch (err) {
    return res.status(401).json({ error: 'Invalid or expired token.' });
  }
}

module.exports = auth;

