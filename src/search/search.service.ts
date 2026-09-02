import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

export interface SearchResultItem {
  id: string;
  title: string;
  subtitle: string;
  type: 'RESOURCE' | 'ARTICLE' | 'ANNOUNCEMENT' | 'MEMBER' | 'SUPPORT_TICKET';
  category: string;
  url: string;
  createdAt?: Date;
}

@Injectable()
export class SearchService {
  constructor(private readonly prisma: PrismaService) {}

  async search(
    query: string,
    userRole?: string,
  ): Promise<{ query: string; total: number; results: SearchResultItem[] }> {
    const q = (query || '').trim();
    if (!q) {
      return { query: '', total: 0, results: [] };
    }

    const isAdmin = (userRole || '').toUpperCase() === 'ADMIN';
    const results: SearchResultItem[] = [];

    // 1. Search Resources
    const resources = await this.prisma.resource.findMany({
      where: {
        AND: [
          ...(isAdmin ? [] : [{ isPublished: true }]),
          {
            OR: [
              { title: { contains: q, mode: 'insensitive' } },
              { description: { contains: q, mode: 'insensitive' } },
              { summary: { contains: q, mode: 'insensitive' } },
              { slug: { contains: q, mode: 'insensitive' } },
            ],
          },
        ],
      },
      take: 10,
      orderBy: { createdAt: 'desc' },
      select: {
        id: true,
        title: true,
        summary: true,
        description: true,
        kind: true,
        targetModule: true,
        createdAt: true,
      },
    });

    for (const r of resources) {
      results.push({
        id: r.id,
        title: r.title,
        subtitle: r.summary || r.description?.slice(0, 100) || r.kind || 'Resource',
        type: 'RESOURCE',
        category: 'Resource',
        url: isAdmin ? `/admin/library` : `/dashboard/library?search=${encodeURIComponent(q)}`,
        createdAt: r.createdAt,
      });
    }

    // 2. Search Articles
    const articles = await this.prisma.article.findMany({
      where: {
        AND: [
          ...(isAdmin ? [] : [{ isPublished: true }]),
          {
            OR: [
              { title: { contains: q, mode: 'insensitive' } },
              { summary: { contains: q, mode: 'insensitive' } },
              { content: { contains: q, mode: 'insensitive' } },
            ],
          },
        ],
      },
      take: 10,
      orderBy: { createdAt: 'desc' },
      select: {
        id: true,
        title: true,
        summary: true,
        createdAt: true,
      },
    });

    for (const a of articles) {
      results.push({
        id: a.id,
        title: a.title,
        subtitle: a.summary || 'Article',
        type: 'ARTICLE',
        category: 'Article',
        url: isAdmin ? `/admin/content/${a.id}` : `/dashboard/announcement-blogs`,
        createdAt: a.createdAt,
      });
    }

    // 3. Search Announcements
    const announcements = await this.prisma.announcement.findMany({
      where: {
        AND: [
          ...(isAdmin ? [] : [{ isPublished: true }]),
          {
            OR: [
              { title: { contains: q, mode: 'insensitive' } },
              { summary: { contains: q, mode: 'insensitive' } },
              { content: { contains: q, mode: 'insensitive' } },
            ],
          },
        ],
      },
      take: 10,
      orderBy: { createdAt: 'desc' },
      select: {
        id: true,
        title: true,
        summary: true,
        createdAt: true,
      },
    });

    for (const ann of announcements) {
      results.push({
        id: ann.id,
        title: ann.title,
        subtitle: ann.summary || 'Announcement',
        type: 'ANNOUNCEMENT',
        category: 'Announcement',
        url: isAdmin ? `/admin/announcement/${ann.id}` : `/dashboard/announcement-blogs`,
        createdAt: ann.createdAt,
      });
    }

    // 4. Admin Only: Search Members/Users
    if (isAdmin) {
      const users = await this.prisma.user.findMany({
        where: {
          deletedAt: null,
          OR: [
            { name: { contains: q, mode: 'insensitive' } },
            { email: { contains: q, mode: 'insensitive' } },
          ],
        },
        take: 10,
        orderBy: { createdAt: 'desc' },
        select: {
          id: true,
          name: true,
          email: true,
          role: true,
          createdAt: true,
        },
      });

      for (const u of users) {
        results.push({
          id: u.id,
          title: u.name,
          subtitle: `${u.email} • ${u.role}`,
          type: 'MEMBER',
          category: 'Member',
          url: `/admin/member/${u.id}`,
          createdAt: u.createdAt,
        });
      }

      // 5. Admin Only: Search Support Tickets
      const tickets = await this.prisma.supportTicket.findMany({
        where: {
          OR: [
            { ticketNumber: { contains: q, mode: 'insensitive' } },
            { subject: { contains: q, mode: 'insensitive' } },
            { description: { contains: q, mode: 'insensitive' } },
            { email: { contains: q, mode: 'insensitive' } },
            { name: { contains: q, mode: 'insensitive' } },
          ],
        },
        take: 10,
        orderBy: { createdAt: 'desc' },
        select: {
          id: true,
          ticketNumber: true,
          subject: true,
          status: true,
          createdAt: true,
        },
      });

      for (const t of tickets) {
        results.push({
          id: t.id,
          title: `${t.ticketNumber}: ${t.subject}`,
          subtitle: `Status: ${t.status}`,
          type: 'SUPPORT_TICKET',
          category: 'Support Ticket',
          url: `/admin/support`,
          createdAt: t.createdAt,
        });
      }
    }

    return {
      query: q,
      total: results.length,
      results,
    };
  }
}
