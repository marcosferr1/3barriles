const jwt = require('jsonwebtoken');

function getAuthHeader(req) {
  const auth = req.headers.authorization;
  if (!auth) return null;
  const [scheme, token] = auth.split(' ');
  if (scheme !== 'Bearer' || !token) return null;
  return token;
}

function requireAuth(req, res, next) {
  try {
    const token = getAuthHeader(req);
    if (!token) return res.status(401).json({ error: 'No autorizado' });

    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.user = {
      id: decoded.sub,
      email: decoded.email,
      role: decoded.role,
    };
    return next();
  } catch (_err) {
    return res.status(401).json({ error: 'Token inválido o expirado' });
  }
}

module.exports = { requireAuth };
