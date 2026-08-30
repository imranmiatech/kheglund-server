import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class AnnouncementsService {
  constructor(private readonly prisma: PrismaService) {}

  listAnnouncements() {
    return this.prisma.announcement.findMany({
      where: { isPublished: true },
      orderBy: { publishedAt: 'desc' },
    });
  }

  async getAnnouncement(id: string) {
    const announcement = await this.prisma.announcement.findUnique({
      where: { id },
    });

    if (!announcement || !announcement.isPublished) {
      throw new NotFoundException('Announcement not found.');
    }

    return announcement;
  }

  async saveAnnouncement(userId: string, announcementId: string) {
    const announcement = await this.prisma.announcement.findFirst({
      where: { id: announcementId, isPublished: true },
      select: { id: true },
    });

    if (!announcement) {
      throw new NotFoundException('Announcement not found.');
    }

    await this.prisma.savedAnnouncement.upsert({
      where: {
        userId_announcementId: { userId, announcementId },
      },
      update: {},
      create: { userId, announcementId },
    });

    return { message: 'Announcement saved successfully.' };
  }

  async getSavedAnnouncements(userId: string) {
    const savedAnnouncements = await this.prisma.savedAnnouncement.findMany({
      where: { userId },
      include: { announcement: true },
      orderBy: { savedAt: 'desc' },
    });

    return savedAnnouncements.map(({ announcement, savedAt }) => ({
      ...announcement,
      savedAt,
      isSaved: true,
    }));
  }

  async unsaveAnnouncement(userId: string, announcementId: string) {
    await this.prisma.savedAnnouncement.deleteMany({
      where: { userId, announcementId },
    });

    return { message: 'Announcement removed from saved items.' };
  }
}
