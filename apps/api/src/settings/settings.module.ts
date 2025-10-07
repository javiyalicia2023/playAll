import { forwardRef, Module } from '@nestjs/common';
import { SettingsService } from './settings.service.js';
import { SettingsController } from './settings.controller.js';
import { RoomsModule } from '../rooms/rooms.module.js';
import { SocketsModule } from '../sockets/sockets.module.js';

@Module({
  imports: [RoomsModule, forwardRef(() => SocketsModule)],
  providers: [SettingsService],
  controllers: [SettingsController],
  exports: [SettingsService]
})
export class SettingsModule {}
