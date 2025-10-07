import { forwardRef, Module } from '@nestjs/common';
import { RoomsGateway } from './rooms.gateway.js';
import { RoomsModule } from '../rooms/rooms.module.js';
import { QueueModule } from '../queue/queue.module.js';
import { PlaybackModule } from '../playback/playback.module.js';
import { SettingsModule } from '../settings/settings.module.js';

@Module({
  imports: [RoomsModule, forwardRef(() => QueueModule), PlaybackModule, forwardRef(() => SettingsModule)],
  providers: [RoomsGateway],
  exports: [RoomsGateway]
})
export class SocketsModule {}
