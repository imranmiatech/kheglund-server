import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class AnnouncementsService {
  constructor(private readonly prisma: PrismaService) {}

  async listAnnouncements(query?: { search?: string }, userId?: string) {
    const where: any = {
      isPublished: true,
      isBlog: false,
    };

    if (query?.search && query.search.trim() !== '') {
      const s = query.search.trim();
      where.OR = [
        { title: { contains: s, mode: 'insensitive' } },
        { summary: { contains: s, mode: 'insensitive' } },
        { content: { contains: s, mode: 'insensitive' } },
      ];
    }

    const items = await this.prisma.announcement.findMany({
      where,
      orderBy: [{ isPinned: 'desc' }, { publishedAt: 'desc' }, { createdAt: 'desc' }],
    });

    let savedIdsSet = new Set<string>();
    if (userId) {
      const saved = await this.prisma.savedAnnouncement.findMany({
        where: { userId },
        select: { announcementId: true },
      });
      savedIdsSet = new Set(saved.map((s) => s.announcementId));
    }

    return items.map((a) => ({
      ...a,
      isSaved: savedIdsSet.has(a.id),
      coverPhoto: a.coverImagePath || null,
      coverImage: a.coverImagePath || null,
    }));
  }

  async listBlogs(query?: { search?: string }, userId?: string) {
    const where: any = {
      isPublished: true,
      isBlog: true,
    };

    if (query?.search && query.search.trim() !== '') {
      const s = query.search.trim();
      where.OR = [
        { title: { contains: s, mode: 'insensitive' } },
        { summary: { contains: s, mode: 'insensitive' } },
        { content: { contains: s, mode: 'insensitive' } },
      ];
    }

    const items = await this.prisma.announcement.findMany({
      where,
      orderBy: [{ publishedAt: 'desc' }, { createdAt: 'desc' }],
    });

    let savedIdsSet = new Set<string>();
    if (userId) {
      const saved = await this.prisma.savedAnnouncement.findMany({
        where: { userId },
        select: { announcementId: true },
      });
      savedIdsSet = new Set(saved.map((s) => s.announcementId));
    }

    return items.map((a) => ({
      ...a,
      isSaved: savedIdsSet.has(a.id),
      coverPhoto: a.coverImagePath || null,
      coverImage: a.coverImagePath || null,
    }));
  }

  async getAnnouncement(id: string, userId?: string) {
    const announcement = await this.prisma.announcement.findUnique({
      where: { id },
    });

    if (!announcement || !announcement.isPublished) {
      throw new NotFoundException('Announcement or Blog post not found.');
    }

    let isSaved = false;
    if (userId) {
      const saved = await this.prisma.savedAnnouncement.findFirst({
        where: { userId, announcementId: id },
      });
      isSaved = !!saved;
    }

    return {
      ...announcement,
      isSaved,
      coverPhoto: announcement.coverImagePath || null,
      coverImage: announcement.coverImagePath || null,
    };
  }

  async saveAnnouncement(userId: string, announcementId: string) {
    const announcement = await this.prisma.announcement.findFirst({
      where: { id: announcementId, isPublished: true },
      select: { id: true },
    });

    if (!announcement) {
      throw new NotFoundException('Announcement or Blog not found.');
    }

    await this.prisma.savedAnnouncement.upsert({
      where: {
        userId_announcementId: { userId, announcementId },
      },
      update: {},
      create: { userId, announcementId },
    });

    return { message: 'Item saved successfully.' };
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
      coverPhoto: announcement.coverImagePath || null,
      coverImage: announcement.coverImagePath || null,
    }));
  }

  async unsaveAnnouncement(userId: string, announcementId: string) {
    await this.prisma.savedAnnouncement.deleteMany({
      where: { userId, announcementId },
    });

    return { message: 'Item removed from saved list.' };
  }
}
