import { Body, Controller, Get, Param, Post } from '@nestjs/common';
import { RoomsService } from './rooms.service.js';
import { CreateRoomRequestDto, JoinRoomRequestDto } from './dto.js';
import {
  createRoomResponseSchema,
  joinRoomResponseSchema,
  roomDetailSchema
} from '@playall/types';

@Controller('rooms')
export class RoomsController {
  constructor(private readonly roomsService: RoomsService) {}

  @Post()
  async createRoom(@Body() body: CreateRoomRequestDto) {
    return createRoomResponseSchema.parse(await this.roomsService.createRoom(body.hostUserId));
  }

  @Post('join')
  async join(@Body() body: JoinRoomRequestDto) {
    return joinRoomResponseSchema.parse(await this.roomsService.joinRoom(body.code, body.userId));
  }

  @Get(':roomId')
  async getRoom(@Param('roomId') roomId: string) {
    return roomDetailSchema.parse(await this.roomsService.getRoomDetails(roomId));
  }
}
