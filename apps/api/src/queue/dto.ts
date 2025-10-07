import { createZodDto } from 'nestjs-zod';
import { createQueueItemSchema } from '@playall/types';

export class CreateQueueItemDto extends createZodDto(createQueueItemSchema) {}
