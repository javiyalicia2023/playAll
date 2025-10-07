import type { ThrottlerStorage } from '@nestjs/throttler';
import type Redis from 'ioredis';

const KEY_PREFIX = 'throttler:';

export type RedisThrottlerRecord = {
  totalHits: number;
  timeToExpire: number;
};

export class RedisThrottlerStorage implements ThrottlerStorage {
  constructor(private readonly redis: Redis) {
    void this.redis.connect().catch((error) => {
      // eslint-disable-next-line no-console
      console.error('Failed to connect Redis throttler storage', error);
    });
  }

  private buildKey(key: string): string {
    return `${KEY_PREFIX}${key}`;
  }

  async increment(key: string, ttlSeconds: number): Promise<RedisThrottlerRecord> {
    const redisKey = this.buildKey(key);
    const totalHits = await this.redis.incr(redisKey);
    if (totalHits === 1) {
      await this.redis.pexpire(redisKey, ttlSeconds * 1000);
    }

    let ttl = await this.redis.pttl(redisKey);
    if (ttl < 0) {
      // If key has no TTL (e.g. Redis older than 2.6 returns -1), ensure it expires.
      await this.redis.pexpire(redisKey, ttlSeconds * 1000);
      ttl = ttlSeconds * 1000;
    }

    return {
      totalHits,
      timeToExpire: ttl
    };
  }

  async resetKey(key: string): Promise<void> {
    await this.redis.del(this.buildKey(key));
  }
}
