import { Controller, Post, Req, Res } from '@nestjs/common';
import type { Request, Response } from 'express';
import { AuthService } from './auth.service.js';
import { sessionResponseSchema } from '@playall/types';

@Controller('session')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Post()
  async createSession(@Req() req: Request, @Res({ passthrough: true }) res: Response) {
    const userId = (req.signedCookies?.pa_session as string | undefined) ?? undefined;
    const user = await this.authService.getOrCreateUser(userId);
    res.cookie('pa_session', user.id, {
      httpOnly: true,
      sameSite: 'lax',
      signed: true,
      maxAge: 1000 * 60 * 60 * 24 * 30
    });
    return sessionResponseSchema.parse({ userId: user.id, displayName: user.displayName });
  }
}
