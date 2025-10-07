import { createZodDto } from 'nestjs-zod';
import { settingsUpdateSchema } from '@playall/types';

export class UpdateSettingsDto extends createZodDto(settingsUpdateSchema.omit({ roomId: true })) {}
