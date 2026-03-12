import { Injectable, OnModuleDestroy, Logger } from "@nestjs/common";
import { Redis } from "ioredis";

@Injectable()
export class CacheService implements OnModuleDestroy {
  private readonly logger = new Logger(CacheService.name);
  private redis: Redis | null;
  private memoryCache = new Map<string, { value: string; expiry: number }>();

  constructor() {
    const redisUrl = process.env.REDIS_URL || "redis://localhost:6379";

    // Check if it's a placeholder
    if (redisUrl.includes("********")) {
      this.logger.warn(
        "Redis URL contains placeholders. Using in-memory fallback.",
      );
      this.redis = null;
      return;
    }

    try {
      this.redis = new Redis(redisUrl, {
        retryStrategy: (times) => {
          if (times > 3) {
            this.logger.error(
              "Redis max retries reached. Switching to in-memory fallback.",
            );
            return null; // Stop retrying
          }
          return Math.min(times * 50, 2000);
        },
        maxRetriesPerRequest: 3,
      });

      this.redis.on("error", (error) => {
        this.logger.error(
          "Redis error, using in-memory fallback:",
          error.message,
        );
      });

      this.redis.on("connect", () => {
        this.logger.log("Redis connected successfully");
      });
    } catch (e) {
      this.logger.error("Failed to initialize Redis, using in-memory fallback");
      this.redis = null;
    }
  }

  async onModuleDestroy() {
    if (this.redis) {
      await this.redis.quit();
    }
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
    } catch (error: unknown) {
      this.logger.error(
        `Error getting cache key ${key}:`,
        error instanceof Error ? error.stack : String(error),
      );
      return null;
    }
  }

  /**
   * Set a value in cache with TTL
   */
  async set(key: string, value: unknown, ttlSeconds: number): Promise<void> {
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
    } catch (error: unknown) {
      this.logger.error(
        `Error setting cache key ${key}:`,
        error instanceof Error ? error.stack : String(error),
      );
    }
  }

  /**
   * Delete a specific key
   */
  async del(key: string): Promise<void> {
    try {
      if (!this.redis) {
        this.memoryCache.delete(key);
        return;
      }
      await this.redis.del(key);
    } catch (error: unknown) {
      this.logger.error(
        `Error deleting cache key ${key}:`,
        error instanceof Error ? error.stack : String(error),
      );
    }
  }

  /**
   * Invalidate cache keys by pattern
   */
  async invalidate(pattern: string): Promise<void> {
    try {
      if (!this.redis) {
        const regex = new RegExp("^" + pattern.replace(/\*/g, ".*") + "$");
        for (const key of this.memoryCache.keys()) {
          if (regex.test(key)) {
            this.memoryCache.delete(key);
          }
        }
        return;
      }
      const keys = await this.redis.keys(pattern);
      if (keys.length > 0) {
        await this.redis.del(...keys);
      }
    } catch (error: unknown) {
      this.logger.error(
        `Error invalidating cache pattern ${pattern}:`,
        error instanceof Error ? error.stack : String(error),
      );
    }
  }

  /**
   * Increment a counter
   */
  async incr(key: string): Promise<number> {
    try {
      if (!this.redis) {
        const current = (await this.get<number>(key)) || 0;
        const next = current + 1;
        await this.set(key, next, 3600);
        return next;
      }
      return await this.redis.incr(key);
    } catch (error: unknown) {
      this.logger.error(
        `Error incrementing cache key ${key}:`,
        error instanceof Error ? error.stack : String(error),
      );
      return 0;
    }
  }

  /**
   * Set expiration on a key
   */
  async expire(key: string, seconds: number): Promise<void> {
    try {
      if (!this.redis) {
        const item = this.memoryCache.get(key);
        if (item) {
          item.expiry = Date.now() + seconds * 1000;
        }
        return;
      }
      await this.redis.expire(key, seconds);
    } catch (error: unknown) {
      this.logger.error(
        `Error setting expiration on key ${key}:`,
        error instanceof Error ? error.stack : String(error),
      );
    }
  }

  /**
   * Check if key exists
   */
  async exists(key: string): Promise<boolean> {
    try {
      if (!this.redis) {
        const item = this.memoryCache.get(key);
        return !!(item && item.expiry > Date.now());
      }
      const result = await this.redis.exists(key);
      return result === 1;
    } catch (error: unknown) {
      this.logger.error(
        `Error checking existence of key ${key}:`,
        error instanceof Error ? error.stack : String(error),
      );
      return false;
    }
  }

  /**
   * Get TTL of a key
   */
  async ttl(key: string): Promise<number> {
    try {
      if (!this.redis) {
        const item = this.memoryCache.get(key);
        if (item && item.expiry > Date.now()) {
          return Math.floor((item.expiry - Date.now()) / 1000);
        }
        return -1;
      }
      return await this.redis.ttl(key);
    } catch (error: unknown) {
      this.logger.error(
        `Error getting TTL of key ${key}:`,
        error instanceof Error ? error.stack : String(error),
      );
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
