import rateLimit from 'express-rate-limit';
import RedisStore from 'rate-limit-redis';
import Redis from 'ioredis';

// Create Redis client (if configured)
let redisClient: Redis | null = null;
if (process.env.REDIS_URL) {
  redisClient = new Redis(process.env.REDIS_URL);
}

// Rate limit options
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 5, // 5 attempts per IP
  standardHeaders: true,
  legacyHeaders: false,
  skipSuccessfulRequests: true, // Don't count successful attempts
  store: redisClient ? new RedisStore({
    sendCommand: (...args: string[]) => redisClient!.call(...args),
    prefix: 'rl:auth:'
  }) : undefined,
  handler: (req, res) => {
    res.status(429).json({
      error: 'Too many login attempts, please try again later',
      retryAfter: Math.ceil(res.getHeader('Retry-After') as number / 60), // minutes
    });
  }
});

// Less strict rate limit for general endpoints
const standardLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: 30, // 30 requests per minute
  standardHeaders: true,
  legacyHeaders: false,
  store: redisClient ? new RedisStore({
    sendCommand: (...args: string[]) => redisClient!.call(...args),
    prefix: 'rl:std:'
  }) : undefined
});

export { authLimiter, standardLimiter };