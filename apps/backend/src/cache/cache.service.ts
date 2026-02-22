import { Injectable, OnModuleDestroy, Logger } from "@nestjs/common";
import { Redis } from "ioredis";

@Injectable()
export class CacheService implements OnModuleDestroy {
  private readonly logger = new Logger(CacheService.name);
  private redis: Redis;
  private memoryCache = new Map<string, { value: string; expiry: number }>();

  constructor() {
    const redisUrl = process.env.REDIS_URL || "redis://localhost:6379";

    // Check if it's a placeholder
    if (redisUrl.includes("********")) {
      this.logger.warn("Redis URL contains placeholders. Using in-memory fallback.");
      this.redis = null as any;
      return;
    }

    try {
      this.redis = new Redis(redisUrl, {
        retryStrategy: (times) => {
          if (times > 3) {
            this.logger.error("Redis max retries reached. Switching to in-memory fallback.");
            return null; // Stop retrying
          }
          return Math.min(times * 50, 2000);
        },
        maxRetriesPerRequest: 3,
      });

      this.redis.on("error", (error) => {
        this.logger.error("Redis error, using in-memory fallback:", error.message);
      });

      this.redis.on("connect", () => {
        this.logger.log("Redis connected successfully");
      });
    } catch (e) {
      this.logger.error("Failed to initialize Redis, using in-memory fallback");
      this.redis = null as any;
    }
  }

  async onModuleDestroy() {
    await this.redis.quit();
  }

  /**
   * Get a value from cache
   */
  async get<T>(key: string): Promise<T | null> {
    try {
      if (!this.redis) {
        const item = this.memoryCache.get(key);
        if (item && item.expiry > Date.now()) {
          return JSON.parse(item.value);
        }
        return null;
      }
      const data = await this.redis.get(key);
      return data ? JSON.parse(data) : null;
    } catch (error: any) {
      this.logger.error(`Error getting cache key ${key}:`, error.stack);
      return null;
    }
  }

  /**
   * Set a value in cache with TTL
   */
  async set(key: string, value: any, ttlSeconds: number): Promise<void> {
    try {
      const stringifiedValue = JSON.stringify(value);
      if (!this.redis) {
        this.memoryCache.set(key, {
          value: stringifiedValue,
          expiry: Date.now() + ttlSeconds * 1000,
        });
        return;
      }
      await this.redis.setex(key, ttlSeconds, stringifiedValue);
    } catch (error: any) {
      this.logger.error(`Error setting cache key ${key}:`, error.stack);
    }
  }

  /**
   * Delete a specific key
   */
  async del(key: string): Promise<void> {
    try {
      await this.redis.del(key);
    } catch (error: any) {
      this.logger.error(`Error deleting cache key ${key}:`, error.stack);
    }
  }

  /**
   * Invalidate cache keys by pattern
   */
  async invalidate(pattern: string): Promise<void> {
    try {
      const keys = await this.redis.keys(pattern);
      if (keys.length > 0) {
        await this.redis.del(...keys);
      }
    } catch (error: any) {
      this.logger.error(
        `Error invalidating cache pattern ${pattern}:`,
        error.stack,
      );
    }
  }

  /**
   * Increment a counter
   */
  async incr(key: string): Promise<number> {
    try {
      return await this.redis.incr(key);
    } catch (error: any) {
      this.logger.error(`Error incrementing cache key ${key}:`, error.stack);
      return 0;
    }
  }

  /**
   * Set expiration on a key
   */
  async expire(key: string, seconds: number): Promise<void> {
    try {
      await this.redis.expire(key, seconds);
    } catch (error: any) {
      this.logger.error(`Error setting expiration on key ${key}:`, error.stack);
    }
  }

  /**
   * Check if key exists
   */
  async exists(key: string): Promise<boolean> {
    try {
      const result = await this.redis.exists(key);
      return result === 1;
    } catch (error: any) {
      this.logger.error(`Error checking existence of key ${key}:`, error.stack);
      return false;
    }
  }

  /**
   * Get TTL of a key
   */
  async ttl(key: string): Promise<number> {
    try {
      return await this.redis.ttl(key);
    } catch (error: any) {
      this.logger.error(`Error getting TTL of key ${key}:`, error.stack);
      return -1;
    }
  }

  /**
   * Cache wrapper - get or compute and cache
   */
  async getOrSet<T>(
    key: string,
    factory: () => Promise<T>,
    ttlSeconds: number,
  ): Promise<T> {
    const cached = await this.get<T>(key);
    if (cached !== null) {
      return cached;
    }

    const value = await factory();
    await this.set(key, value, ttlSeconds);
    return value;
  }
}
