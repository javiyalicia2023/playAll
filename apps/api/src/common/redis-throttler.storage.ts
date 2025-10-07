import type { ThrottlerStorage, ThrottlerStorageRecord } from '@nestjs/throttler';
import type Redis from 'ioredis';

const DEFAULT_TTL_SECONDS = 60;

export class RedisThrottlerStorage implements ThrottlerStorage {
  private readonly keyPrefix = 'throttler:';

  constructor(private readonly redis: Redis) {
    void this.redis.connect().catch((error) => {
      // eslint-disable-next-line no-console
      console.error('Failed to connect Redis throttler storage', error);
    });
  }

  private buildKey(key: string): string {
    return `${this.keyPrefix}${key}`;
  }

  async getRecord(key: string): Promise<ThrottlerStorageRecord[]> {
    const raw = await this.redis.get(this.buildKey(key));
    if (!raw) {
      return [];
    }
    try {
      const parsed = JSON.parse(raw) as ThrottlerStorageRecord[];
      return Array.isArray(parsed) ? parsed : [];
    } catch (error) {
      // eslint-disable-next-line no-console
      console.error('Failed to parse throttler record', error);
      return [];
    }
  }

  async addRecord(key: string, ttl: number, record: ThrottlerStorageRecord): Promise<void> {
    const existing = await this.getRecord(key);
    existing.push(record);
    const ttlSeconds = Math.max(Math.ceil(ttl), DEFAULT_TTL_SECONDS);
    await this.redis.set(this.buildKey(key), JSON.stringify(existing), 'EX', ttlSeconds);
  }

  async removeRecord(key: string, record: ThrottlerStorageRecord): Promise<void> {
    const existing = await this.getRecord(key);
    const filtered = existing.filter((entry) => entry.ttl !== record.ttl);
    if (filtered.length === 0) {
      await this.redis.del(this.buildKey(key));
      return;
    }
    await this.redis.set(this.buildKey(key), JSON.stringify(filtered));
  }
}
