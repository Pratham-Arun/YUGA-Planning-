/**
 * Authentication middleware (JWT-based)
 * TODO: Implement full authentication system
 */

/**
 * Verify JWT token
 */
export function authenticateToken(req, res, next) {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1]; // Bearer TOKEN
  
  if (!token) {
    return res.status(401).json({ error: 'Access token required' });
  }
  
  // TODO: Implement JWT verification
  // For now, allow all requests (development mode)
  
  // jwt.verify(token, process.env.JWT_SECRET, (err, user) => {
  //   if (err) {
  //     return res.status(403).json({ error: 'Invalid or expired token' });
  //   }
  //   req.user = user;
  //   next();
  // });
  
  // Development: Skip authentication
  req.user = { id: 'dev-user', email: 'dev@yuga.local' };
  next();
}

/**
 * Optional authentication - adds user if token present
 */
export function optionalAuth(req, res, next) {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];
  
  if (token) {
    // TODO: Verify token and attach user
    req.user = { id: 'dev-user', email: 'dev@yuga.local' };
  }
  
  next();
}

/**
 * Check if user has required role
 */
export function requireRole(role) {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({ error: 'Authentication required' });
    }
    
    if (req.user.role !== role && req.user.role !== 'admin') {
      return res.status(403).json({ error: 'Insufficient permissions' });
    }
    
    next();
  };
}

/**
 * API key authentication (for Unity plugin)
 */
export function authenticateApiKey(req, res, next) {
  const apiKey = req.headers['x-api-key'];
  
  if (!apiKey) {
    return res.status(401).json({ error: 'API key required' });
  }
  
  // TODO: Validate API key against database
  // For now, accept any key in development
  
  req.apiKey = apiKey;
  next();
}
