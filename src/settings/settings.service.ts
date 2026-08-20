import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { UsersService } from '../users/users.service';
import {
  SettingsSecurityDto,
  UpdateNotificationPreferencesDto,
} from './dto/settings.dto';

@Injectable()
export class SettingsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly usersService: UsersService,
  ) {}

  getNotificationPreferences(userId: string) {
    return this.prisma.notificationPreference.upsert({
      where: { userId },
      update: {},
      create: {
        userId,
      },
    });
  }

  updateNotificationPreferences(
    userId: string,
    dto: UpdateNotificationPreferencesDto,
  ) {
    return this.prisma.notificationPreference.upsert({
      where: { userId },
      update: dto,
      create: {
        userId,
        ...dto,
      },
    });
  }

  getPrivacyPolicy() {
    return this.prisma.contentPage.findUnique({
      where: { slug: 'privacy-policy' },
    });
  }

  changePassword(userId: string, dto: SettingsSecurityDto) {
    return this.usersService.changePassword(userId, dto);
  }
}
