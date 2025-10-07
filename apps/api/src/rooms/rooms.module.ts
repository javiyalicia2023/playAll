import { Module } from '@nestjs/common';
import { RoomsService } from './rooms.service.js';
import { RoomsController } from './rooms.controller.js';

@Module({
  providers: [RoomsService],
  controllers: [RoomsController],
  exports: [RoomsService]
})
export class RoomsModule {}
