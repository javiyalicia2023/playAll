import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { ThrottlerGuard, ThrottlerModule, ThrottlerModuleOptions } from '@nestjs/throttler';
import { APP_GUARD } from '@nestjs/core';
import { PrismaModule } from './prisma/prisma.module.js';
import { AuthModule } from './auth/auth.module.js';
import { RoomsModule } from './rooms/rooms.module.js';
import { QueueModule } from './queue/queue.module.js';
import { PlaybackModule } from './playback/playback.module.js';
import { SettingsModule } from './settings/settings.module.js';
import { SocketsModule } from './sockets/sockets.module.js';
import { SearchModule } from './search/search.module.js';
import Redis from 'ioredis';
import { RedisThrottlerStorage } from './common/redis-throttler.storage.js';

function createThrottlerOptions(): ThrottlerModuleOptions {
  const redisUrl = process.env.REDIS_URL;
  const options: ThrottlerModuleOptions = {
    throttlers: [
      {
        ttl: 60,
        limit: 120
      }
    ]
  };
  if (redisUrl) {
    const redis = new Redis(redisUrl, { lazyConnect: true });
    options.storage = new RedisThrottlerStorage(redis);
  }
  return options;
}

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    ThrottlerModule.forRoot(createThrottlerOptions()),
    PrismaModule,
    AuthModule,
    RoomsModule,
    QueueModule,
    PlaybackModule,
    SettingsModule,
    SocketsModule,
    SearchModule
  ],
  providers: [
    {
      provide: APP_GUARD,
      useClass: ThrottlerGuard
    }
  ]
})
export class AppModule {}
