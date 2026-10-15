import jwt from 'jsonwebtoken';

export function authenticate(req, res, next) {
  const header = req.headers.authorization || '';
  const token = header.startsWith('Bearer ') ? header.slice(7) : null;
  if (!token) return res.status(401).json({ error: 'Authentication required.' });
  try {
    req.user = jwt.verify(token, process.env.JWT_SECRET);
    return next();
  } catch {
    return res.status(401).json({ error: 'Invalid or expired session. Please log in again.' });
  }
}
export const allowRoles = (...roles) => (req, res, next) => {
  if (!req.user || !roles.includes(req.user.role)) return res.status(403).json({ error: 'You do not have permission to perform this action.' });
  next();
};
export function notFound(req, res) {
  res.status(404).json({ error: 'Endpoint not found.' });
}
export function errorHandler(err, req, res, next) {
  console.error(err);
  if (err.code === '23505') return res.status(409).json({ error: 'A record with this unique value already exists.' });
  if (err.code === '23514' || err.code === '23502' || err.code === '22P02') return res.status(400).json({ error: 'Invalid data supplied.' });
  res.status(500).json({ error: 'Unexpected server error.' });
}
