import jwt from 'jsonwebtoken';

const JWT_SECRET = process.env.JWT_SECRET || 'ebc2-judging-secret-key-2025';

export function signToken(payload) {
  return jwt.sign(payload, JWT_SECRET, { expiresIn: '24h' });
}

export function verifyToken(token) {
  try {
    return jwt.verify(token, JWT_SECRET);
  } catch {
    return null;
  }
}

export function getTokenFromRequest(request) {
  const authHeader = request.headers.get('authorization');
  if (authHeader?.startsWith('Bearer ')) {
    return authHeader.substring(7);
  }
  // Also check cookies
  const cookie = request.headers.get('cookie');
  if (cookie) {
    const match = cookie.match(/token=([^;]+)/);
    if (match) return match[1];
  }
  return null;
}

export function requireAuth(request) {
  const token = getTokenFromRequest(request);
  if (!token) return null;
  return verifyToken(token);
}

export function requireAdmin(request) {
  const user = requireAuth(request);
  if (!user || user.role !== 'admin') return null;
  return user;
}
