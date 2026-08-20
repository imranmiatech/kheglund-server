import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class DashboardService {
  constructor(private readonly prisma: PrismaService) {}

  async getOverview(userId: string) {
    const [
      subscription,
      savedResourcesCount,
      articleReadsCount,
      downloadsCount,
      resources,
      announcements,
      activities,
    ] = await Promise.all([
      this.prisma.subscription.findUnique({
        where: { userId },
        include: { plan: true },
      }),
      this.prisma.savedResource.count({ where: { userId } }),
      this.prisma.articleRead.count({ where: { userId } }),
      this.prisma.resourceDownload.count({ where: { userId } }),
      this.prisma.resource.findMany({
        where: { isPublished: true },
        include: {
          tags: { include: { tag: true } },
          files: { include: { fileUpload: true } },
        },
        take: 3,
        orderBy: { publishedAt: 'desc' },
      }),
      this.prisma.announcement.findMany({
        where: { isPublished: true },
        take: 3,
        orderBy: { publishedAt: 'desc' },
      }),
      this.prisma.dashboardActivity.findMany({
        where: { userId },
        orderBy: { createdAt: 'desc' },
        take: 5,
      }),
    ]);

    return {
      subscription,
      stats: {
        savedResourcesCount,
        articleReadsCount,
        downloadsCount,
      },
      quickActions: [
        { label: 'Browse Saved', path: '/resources?saved=true' },
        { label: 'Read Latest Article', path: '/articles' },
        { label: 'View Announcements', path: '/announcements' },
      ],
      featuredResources: resources,
      recentAnnouncements: announcements,
      recentActivity: activities,
    };
  }
}
