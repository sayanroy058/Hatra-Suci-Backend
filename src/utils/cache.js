import { Redis } from '@upstash/redis';

// L1: In-memory cache per instance
const memoryCache = new Map();
const MEMORY_TTL = 60 * 1000; // 1 minute

// L2: Shared Redis cache
let redis = null;
const REDIS_TTL = 300; // 5 minutes in seconds

// Initialize Redis connection
const getRedis = () => {
  if (!redis && process.env.UPSTASH_REDIS_URL && process.env.UPSTASH_REDIS_TOKEN) {
    try {
      redis = new Redis({
        url: process.env.UPSTASH_REDIS_URL,
        token: process.env.UPSTASH_REDIS_TOKEN,
      });
      console.log('✓ Upstash Redis cache initialized');
    } catch (error) {
      console.error('Redis initialization failed:', error.message);
    }
  }
  return redis;
};

// Two-level cache for settings
class SettingsCache {
  constructor() {
    this.redis = getRedis();
  }

  async set(key, value) {
    const cacheKey = `settings:${key}`;
    
    // Set in L1 memory cache
    memoryCache.set(cacheKey, {
      value,
      timestamp: Date.now()
    });
    
    // Set in L2 Redis cache if available
    if (this.redis) {
      try {
        await this.redis.setex(cacheKey, REDIS_TTL, JSON.stringify(value));
      } catch (error) {
        console.error('Redis set error:', error.message);
      }
    }
  }

  async get(key) {
    const cacheKey = `settings:${key}`;
    
    // Try L1 memory cache first
    const memItem = memoryCache.get(cacheKey);
    if (memItem && (Date.now() - memItem.timestamp) < MEMORY_TTL) {
      return memItem.value;
    }
    
    // Try L2 Redis cache
    if (this.redis) {
      try {
        const redisValue = await this.redis.get(cacheKey);
        if (redisValue) {
          const parsed = typeof redisValue === 'string' ? JSON.parse(redisValue) : redisValue;
          // Populate L1 cache
          memoryCache.set(cacheKey, {
            value: parsed,
            timestamp: Date.now()
          });
          return parsed;
        }
      } catch (error) {
        console.error('Redis get error:', error.message);
      }
    }
    
    return null;
  }

  async clear() {
    memoryCache.clear();
    if (this.redis) {
      try {
        const keys = await this.redis.keys('settings:*');
        if (keys.length > 0) {
          await this.redis.del(...keys);
        }
      } catch (error) {
        console.error('Redis clear error:', error.message);
      }
    }
  }

  async delete(key) {
    const cacheKey = `settings:${key}`;
    memoryCache.delete(cacheKey);
    if (this.redis) {
      try {
        await this.redis.del(cacheKey);
      } catch (error) {
        console.error('Redis delete error:', error.message);
      }
    }
  }
}

export const settingsCache = new SettingsCache();
