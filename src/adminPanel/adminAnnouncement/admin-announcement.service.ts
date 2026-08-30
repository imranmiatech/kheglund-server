import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { UploadsService } from '../../uploads/uploads.service';
import {
  AdminAnnouncementQueryDto,
  CreateAnnouncementItemDto,
  TogglePinDto,
  UpdateAnnouncementItemDto,
} from './dto/admin-announcement.dto';

@Injectable()
export class AdminAnnouncementService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly uploadsService: UploadsService,
  ) {}

  private slugify(text: string): string {
    return text
      .toLowerCase()
      .trim()
      .replace(/[^a-z0-9 -]/g, '')
      .replace(/\s+/g, '-')
      .replace(/-+/g, '-');
  }

  private mapAccessToVisibility(access: string): 'PUBLIC' | 'MEMBERS_ONLY' {
    const norm = String(access || '').toUpperCase();
    if (norm === 'PUBLIC' || norm === 'ALL') return 'PUBLIC';
    return 'MEMBERS_ONLY';
  }

  private mapVisibilityToAccess(visibility: string): string {
    if (visibility === 'PUBLIC') return 'Public';
    return 'Free';
  }

  async getAnnouncements(query: AdminAnnouncementQueryDto) {
    const page = query.page || 1;
    const limit = query.limit || 10;
    const skip = (page - 1) * limit;

    const baseWhere: any = {};

    // Filter by Announcement vs News/Blog kind
    const kindNorm = String(query.kind || 'ANNOUNCEMENT').toUpperCase();
    const isBlogQuery = kindNorm === 'NEWS_BLOG' || kindNorm === 'BLOG' || kindNorm === 'NEWS';
    baseWhere.isBlog = isBlogQuery;

    if (query.search && query.search.trim() !== '') {
      const s = query.search.trim();
      baseWhere.OR = [
        { title: { contains: s, mode: 'insensitive' } },
        { summary: { contains: s, mode: 'insensitive' } },
        { content: { contains: s, mode: 'insensitive' } },
      ];
    }

    const filterUpper = String(query.filter || 'ALL').toUpperCase();
    if (filterUpper === 'PUBLISHED') {
      baseWhere.isPublished = true;
    } else if (filterUpper === 'DRAFT') {
      baseWhere.isPublished = false;
    }

    // Counts for tabs summary
    const [allCount, publishedCount, draftCount] = await Promise.all([
      this.prisma.announcement.count({ where: { isBlog: isBlogQuery } }),
      this.prisma.announcement.count({ where: { isBlog: isBlogQuery, isPublished: true } }),
      this.prisma.announcement.count({ where: { isBlog: isBlogQuery, isPublished: false } }),
    ]);

    const [items, total] = await Promise.all([
      this.prisma.announcement.findMany({
        where: baseWhere,
        skip,
        take: limit,
        orderBy: [{ isPinned: 'desc' }, { createdAt: 'desc' }],
      }),
      this.prisma.announcement.count({ where: baseWhere }),
    ]);

    const formattedData = items.map((a) => {
      const access = a.visibility === 'PUBLIC' ? 'Public' : 'Free';
      const status = a.isPublished ? 'Published' : 'Draft';
      const publishedDate = (a.publishedAt || a.createdAt).toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
        year: 'numeric',
      });

      return {
        id: a.id,
        title: a.title,
        slug: a.slug,
        summary: a.summary,
        content: a.content,
        kind: a.isBlog ? 'NEWS_BLOG' : 'ANNOUNCEMENT',
        access,
        accessLevel: access,
        status,
        isPublished: a.isPublished,
        isPinned: a.isPinned,
        shareWithAnyone: a.shareWithAnyone,
        coverPhoto: a.coverImagePath || null,
        coverImagePath: a.coverImagePath || null,
        fileUrl: a.coverImagePath || null,
        published: publishedDate,
        publishedAt: a.publishedAt || a.createdAt,
        createdAt: a.createdAt,
      };
    });

    return {
      summary: {
        allCount,
        publishedCount,
        draftCount,
      },
      data: formattedData,
      meta: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  async getAnnouncementById(id: string) {
    const item = await this.prisma.announcement.findUnique({
      where: { id },
    });

    if (!item) {
      throw new NotFoundException(`Announcement or Blog with ID ${id} not found.`);
    }

    const accessLevel = item.visibility === 'PUBLIC' ? 'Public' : 'Free';
    const publishedDate = (item.publishedAt || item.createdAt).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });

    return {
      id: item.id,
      title: item.title,
      slug: item.slug,
      summary: item.summary,
      content: item.content,
      kind: item.isBlog ? 'NEWS_BLOG' : 'ANNOUNCEMENT',
      accessLevel,
      access: accessLevel,
      isPublished: item.isPublished,
      status: item.isPublished ? 'Published' : 'Draft',
      isPinned: item.isPinned,
      shareWithAnyone: item.shareWithAnyone,
      coverPhoto: item.coverImagePath || null,
      coverImagePath: item.coverImagePath || null,
      fileUrl: item.coverImagePath || null,
      published: publishedDate,
      publishedAt: item.publishedAt || item.createdAt,
      createdAt: item.createdAt,
    };
  }

  async createAnnouncement(userId: string, dto: CreateAnnouncementItemDto) {
    const payload: CreateAnnouncementItemDto = (dto as any).data || dto;
    let slug = this.slugify(payload.title);
    const existing = await this.prisma.announcement.findUnique({ where: { slug } });
    if (existing) {
      slug = `${slug}-${Date.now()}`;
    }

    const kindNorm = String(payload.kind || 'ANNOUNCEMENT').toUpperCase();
    const isBlog = kindNorm === 'NEWS_BLOG' || kindNorm === 'BLOG' || kindNorm === 'NEWS';
    const visibility = this.mapAccessToVisibility(payload.accessLevel || 'Public');

    let coverImagePath = payload.coverImagePath || null;
    if (payload.fileUploadId) {
      const fileUpload = await this.prisma.fileUpload.findUnique({
        where: { id: payload.fileUploadId },
      });
      if (fileUpload) {
        coverImagePath = fileUpload.storagePath;
      }
    }

    const item = await this.prisma.announcement.create({
      data: {
        title: payload.title,
        slug,
        summary: payload.summary || payload.title,
        content: payload.content || payload.summary || payload.title,
        visibility,
        isPublished: payload.isPublished ?? true,
        isPinned: payload.isPinned ?? false,
        isBlog,
        shareWithAnyone: payload.shareWithAnyone ?? false,
        coverImagePath,
        createdById: userId,
        publishedAt: payload.isPublished ? new Date() : null,
      },
    });

    return this.getAnnouncementById(item.id);
  }

  async updateAnnouncement(id: string, dto: UpdateAnnouncementItemDto) {
    const payload: UpdateAnnouncementItemDto = (dto as any).data || dto;
    const existing = await this.prisma.announcement.findUnique({ where: { id } });
    if (!existing) {
      throw new NotFoundException(`Announcement or Blog with ID ${id} not found.`);
    }

    let isBlog = existing.isBlog;
    if (payload.kind) {
      const kindNorm = String(payload.kind).toUpperCase();
      isBlog = kindNorm === 'NEWS_BLOG' || kindNorm === 'BLOG' || kindNorm === 'NEWS';
    }

    let visibility = existing.visibility;
    if (payload.accessLevel) {
      visibility = this.mapAccessToVisibility(payload.accessLevel);
    }

    let coverImagePath = payload.coverImagePath ?? existing.coverImagePath;
    if (payload.fileUploadId) {
      const fileUpload = await this.prisma.fileUpload.findUnique({
        where: { id: payload.fileUploadId },
      });
      if (fileUpload) {
        coverImagePath = fileUpload.storagePath;
      }
    }

    const updated = await this.prisma.announcement.update({
      where: { id },
      data: {
        title: payload.title,
        slug: payload.title ? this.slugify(payload.title) : undefined,
        summary: payload.summary,
        content: payload.content,
        visibility,
        isPublished: payload.isPublished,
        isPinned: payload.isPinned,
        isBlog,
        shareWithAnyone: payload.shareWithAnyone,
        coverImagePath,
        publishedAt: payload.isPublished ? new Date() : existing.publishedAt,
      },
    });

    return this.getAnnouncementById(updated.id);
  }

  async togglePin(id: string, dto?: TogglePinDto) {
    const existing = await this.prisma.announcement.findUnique({ where: { id } });
    if (!existing) {
      throw new NotFoundException(`Announcement with ID ${id} not found.`);
    }

    const isPinned = dto?.isPinned !== undefined ? dto.isPinned : !existing.isPinned;
    const updated = await this.prisma.announcement.update({
      where: { id },
      data: { isPinned },
    });

    return {
      id: updated.id,
      title: updated.title,
      isPinned: updated.isPinned,
    };
  }

  async deleteAnnouncement(id: string) {
    const existing = await this.prisma.announcement.findUnique({ where: { id } });
    if (!existing) {
      throw new NotFoundException(`Announcement or Blog with ID ${id} not found.`);
    }

    await this.prisma.announcement.delete({ where: { id } });
    return {
      message: `Announcement "${existing.title}" permanently deleted.`,
      id,
    };
  }

  async uploadFile(file: Express.Multer.File, userId: string) {
    if (!file) {
      throw new BadRequestException('No file uploaded.');
    }

    const fileUpload = await this.uploadsService.saveFile(
      file,
      'ANNOUNCEMENT_COVER',
      userId,
    );

    return {
      id: fileUpload.id,
      originalName: fileUpload.originalName,
      storagePath: fileUpload.storagePath,
      fileUrl: fileUpload.storagePath,
      mimeType: fileUpload.mimeType,
      sizeBytes: fileUpload.sizeBytes,
    };
  }
}
