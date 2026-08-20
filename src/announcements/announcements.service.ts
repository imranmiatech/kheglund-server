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
}
