import { forwardRef, Module } from '@nestjs/common';
import { QueueService } from './queue.service.js';
import { QueueController } from './queue.controller.js';
import { RoomsModule } from '../rooms/rooms.module.js';
import { SocketsModule } from '../sockets/sockets.module.js';

@Module({
  imports: [RoomsModule, forwardRef(() => SocketsModule)],
  providers: [QueueService],
  controllers: [QueueController],
  exports: [QueueService]
})
export class QueueModule {}
