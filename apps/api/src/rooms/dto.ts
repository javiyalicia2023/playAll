import { createZodDto } from 'nestjs-zod';
import {
  createRoomRequestSchema,
  joinRoomRequestSchema,
  roomDetailSchema
} from '@playall/types';

export class CreateRoomRequestDto extends createZodDto(createRoomRequestSchema) {}
export class JoinRoomRequestDto extends createZodDto(joinRoomRequestSchema) {}
export class RoomDetailDto extends createZodDto(roomDetailSchema) {}
