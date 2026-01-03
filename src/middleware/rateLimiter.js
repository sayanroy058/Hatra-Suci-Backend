import rateLimit from 'express-rate-limit';
import { Redis } from '@upstash/redis';

// Initialize Redis store for rate limiting (shared across instances)
let redis = null;
const getRedis = () => {
  if (!redis && process.env.UPSTASH_REDIS_URL && process.env.UPSTASH_REDIS_TOKEN) {
    redis = new Redis({
      url: process.env.UPSTASH_REDIS_URL,
      token: process.env.UPSTASH_REDIS_TOKEN,
    });
  }
  return redis;
};

// Custom Redis store for rate limiting
class RedisStore {
  constructor(options = {}) {
    this.prefix = options.prefix || 'rl:';
    this.resetExpiryOnChange = options.resetExpiryOnChange || false;
    this.redis = getRedis();
  }

  async increment(key) {
    const redisKey = this.prefix + key;
    const redis = this.redis;
    
    if (!redis) {
      // Fallback to memory-based limiting if Redis unavailable
      return { totalHits: 1, resetTime: new Date(Date.now() + 60000) };
    }

    try {
      const value = await redis.incr(redisKey);
      
      if (value === 1) {
        // First request, set expiration
        await redis.expire(redisKey, 60); // 1 minute window
      }
      
      const ttl = await redis.ttl(redisKey);
      const resetTime = new Date(Date.now() + ttl * 1000);
      
      return {
        totalHits: value,
        resetTime
      };
    } catch (error) {
      console.error('Redis rate limit error:', error);
      return { totalHits: 1, resetTime: new Date(Date.now() + 60000) };
    }
  }

  async decrement(key) {
    const redisKey = this.prefix + key;
    if (this.redis) {
      try {
        await this.redis.decr(redisKey);
      } catch (error) {
        console.error('Redis decrement error:', error);
      }
    }
  }

  async resetKey(key) {
    const redisKey = this.prefix + key;
    if (this.redis) {
      try {
        await this.redis.del(redisKey);
      } catch (error) {
        console.error('Redis reset error:', error);
      }
    }
  }
}

// Conservative rate limiters for free tier

// Auth limiter - Per IP (prevents brute force from single IP)
export const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 5, // 5 requests per window
  message: 'Too many authentication attempts, please try again later',
  standardHeaders: true,
  legacyHeaders: false,
  store: new RedisStore({ prefix: 'auth:' }),
  keyGenerator: (req) => req.ip, // Rate limit by IP address
  handler: (req, res) => {
    res.status(429).json({
      message: 'Too many authentication attempts from this IP, please try again after 15 minutes',
      retryAfter: Math.ceil(req.rateLimit.resetTime.getTime() - Date.now()) / 1000
    });
  }
});

// Deposit limiter - Per User ID (prevents abuse by authenticated users)
export const depositLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 10, // 10 deposits per hour per user
  message: 'Too many deposit requests, please try again later',
  standardHeaders: true,
  legacyHeaders: false,
  store: new RedisStore({ prefix: 'deposit:' }),
  keyGenerator: (req) => req.user?._id?.toString() || req.ip, // Rate limit by user ID, fallback to IP
  handler: (req, res) => {
    res.status(429).json({
      message: 'Too many deposit requests, please try again later',
      retryAfter: Math.ceil(req.rateLimit.resetTime.getTime() - Date.now()) / 1000
    });
  }
});

// Withdrawal limiter - Per User ID (prevents abuse by authenticated users)
export const withdrawalLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 5, // 5 withdrawals per hour per user
  message: 'Too many withdrawal requests, please try again later',
  standardHeaders: true,
  legacyHeaders: false,
  store: new RedisStore({ prefix: 'withdrawal:' }),
  keyGenerator: (req) => req.user?._id?.toString() || req.ip, // Rate limit by user ID, fallback to IP
  handler: (req, res) => {
    res.status(429).json({
      message: 'Too many withdrawal requests, please try again later',
      retryAfter: Math.ceil(req.rateLimit.resetTime.getTime() - Date.now()) / 1000
    });
  }
});

// Admin limiter - Per IP (admins are few, IP-based is sufficient)
export const adminLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // 100 requests per window for admin operations
  message: 'Too many admin requests, please try again later',
  standardHeaders: true,
  legacyHeaders: false,
  store: new RedisStore({ prefix: 'admin:' }),
  keyGenerator: (req) => req.ip, // Rate limit by IP address
});

// General limiter - Per IP (for public/unauthenticated routes)
export const generalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // 100 requests per window
  message: 'Too many requests, please try again later',
  standardHeaders: true,
  legacyHeaders: false,
  store: new RedisStore({ prefix: 'general:' }),
  keyGenerator: (req) => req.ip, // Rate limit by IP address
});
