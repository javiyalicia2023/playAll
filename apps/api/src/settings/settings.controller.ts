import { Body, Controller, Param, Post, Req } from '@nestjs/common';
import type { Request } from 'express';
import { SettingsService } from './settings.service.js';
import { UpdateSettingsDto } from './dto.js';
import { roomSettingsSchema } from '@playall/types';
import { ForbiddenStructuredException } from '../common/errors.js';

@Controller('rooms/:roomId/settings')
export class SettingsController {
  constructor(private readonly settingsService: SettingsService) {}

  private getUserId(req: Request) {
    const userId = (req.signedCookies?.pa_session as string | undefined) ?? (req.body?.userId as string | undefined);
    if (!userId) {
      throw new ForbiddenStructuredException('SESSION_REQUIRED', 'User session is required.');
    }
    return userId;
  }

  @Post()
  async update(@Param('roomId') roomId: string, @Body() body: UpdateSettingsDto, @Req() req: Request) {
    const userId = this.getUserId(req);
    return roomSettingsSchema.parse(
      await this.settingsService.updateAllowGuestEnqueue(roomId, userId, body.allowGuestEnqueue)
    );
  }
}
