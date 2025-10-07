import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service.js';
import { generateDisplayName } from '../common/random-name.js';

@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name);

  constructor(private readonly prisma: PrismaService) {}

  async getOrCreateUser(userId?: string) {
    if (userId) {
      const existing = await this.prisma.appUser.findUnique({ where: { id: userId } });
      if (existing) {
        return existing;
      }
      this.logger.warn(`Signed cookie user not found ${userId}, creating new user`);
    }

    const displayName = generateDisplayName();
    return this.prisma.appUser.create({
      data: {
        displayName
      }
    });
  }
}
