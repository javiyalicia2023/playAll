import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { ThrottlerGuard, ThrottlerModule, ThrottlerModuleOptions, ThrottlerStorageRedisService } from '@nestjs/throttler';
import { APP_GUARD } from '@nestjs/core';
import { PrismaModule } from './prisma/prisma.module.js';
import { AuthModule } from './auth/auth.module.js';
import { RoomsModule } from './rooms/rooms.module.js';
import { QueueModule } from './queue/queue.module.js';
import { PlaybackModule } from './playback/playback.module.js';
import { SearchModule } from './search/search.module.js';
import { SettingsModule } from './settings/settings.module.js';
import { SocketsModule } from './sockets/sockets.module.js';
import Redis from 'ioredis';

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
    options.storage = new ThrottlerStorageRedisService(new Redis(redisUrl));
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
    SearchModule,
    SettingsModule,
    SocketsModule
  ],
  providers: [
    {
      provide: APP_GUARD,
      useClass: ThrottlerGuard
    }
  ]
})
export class AppModule {}
