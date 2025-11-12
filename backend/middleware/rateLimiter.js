/**
 * Rate limiting middleware to prevent API abuse
 */

const requestCounts = new Map();
const WINDOW_MS = 60 * 1000; // 1 minute
const MAX_REQUESTS = 60; // 60 requests per minute

/**
 * Simple in-memory rate limiter
 * For production, use Redis-backed rate limiter
 */
export function rateLimiter(req, res, next) {
  const identifier = req.ip || req.connection.remoteAddress;
  const now = Date.now();
  
  // Get or create request log for this IP
  if (!requestCounts.has(identifier)) {
    requestCounts.set(identifier, []);
  }
  
  const requests = requestCounts.get(identifier);
  
  // Remove old requests outside the time window
  const recentRequests = requests.filter(timestamp => now - timestamp < WINDOW_MS);
  
  // Check if limit exceeded
  if (recentRequests.length >= MAX_REQUESTS) {
    return res.status(429).json({
      error: 'Too many requests',
      message: `Rate limit exceeded. Maximum ${MAX_REQUESTS} requests per minute.`,
      retryAfter: Math.ceil(WINDOW_MS / 1000)
    });
  }
  
  // Add current request
  recentRequests.push(now);
  requestCounts.set(identifier, recentRequests);
  
  // Add rate limit headers
  res.setHeader('X-RateLimit-Limit', MAX_REQUESTS);
  res.setHeader('X-RateLimit-Remaining', MAX_REQUESTS - recentRequests.length);
  res.setHeader('X-RateLimit-Reset', new Date(now + WINDOW_MS).toISOString());
  
  next();
}

/**
 * Stricter rate limiter for expensive AI operations
 */
export function aiRateLimiter(req, res, next) {
  const identifier = req.ip || req.connection.remoteAddress;
  const now = Date.now();
  const AI_WINDOW_MS = 60 * 1000; // 1 minute
  const AI_MAX_REQUESTS = 10; // 10 AI requests per minute
  
  const key = `ai_${identifier}`;
  
  if (!requestCounts.has(key)) {
    requestCounts.set(key, []);
  }
  
  const requests = requestCounts.get(key);
  const recentRequests = requests.filter(timestamp => now - timestamp < AI_WINDOW_MS);
  
  if (recentRequests.length >= AI_MAX_REQUESTS) {
    return res.status(429).json({
      error: 'AI rate limit exceeded',
      message: `Maximum ${AI_MAX_REQUESTS} AI requests per minute. Please wait before trying again.`,
      retryAfter: Math.ceil(AI_WINDOW_MS / 1000)
    });
  }
  
  recentRequests.push(now);
  requestCounts.set(key, recentRequests);
  
  res.setHeader('X-AI-RateLimit-Limit', AI_MAX_REQUESTS);
  res.setHeader('X-AI-RateLimit-Remaining', AI_MAX_REQUESTS - recentRequests.length);
  
  next();
}

/**
 * Clean up old entries periodically
 */
setInterval(() => {
  const now = Date.now();
  for (const [key, requests] of requestCounts.entries()) {
    const recentRequests = requests.filter(timestamp => now - timestamp < WINDOW_MS);
    if (recentRequests.length === 0) {
      requestCounts.delete(key);
    } else {
      requestCounts.set(key, recentRequests);
    }
  }
}, WINDOW_MS);
