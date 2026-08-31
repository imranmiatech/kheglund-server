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

  private parseBoolean(val: any, defaultVal = false): boolean {
    if (val === undefined || val === null) return defaultVal;
    if (typeof val === 'boolean') return val;
    if (typeof val === 'string') {
      const s = val.trim().toLowerCase();
      if (s === 'true' || s === '1') return true;
      if (s === 'false' || s === '0') return false;
    }
    return Boolean(val);
  }

  // --- ANNOUNCEMENTS LIST & BLOGS LIST ---

  async getAnnouncementsOnly(query: AdminAnnouncementQueryDto) {
    return this.getAnnouncementsListByIsBlog(query, false);
  }

  async getBlogsOnly(query: AdminAnnouncementQueryDto) {
    return this.getAnnouncementsListByIsBlog(query, true);
  }

  private async getAnnouncementsListByIsBlog(query: AdminAnnouncementQueryDto, isBlogQuery: boolean) {
    const page = query.page || 1;
    const limit = query.limit || 10;
    const skip = (page - 1) * limit;

    const baseWhere: any = { isBlog: isBlogQuery };

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

  async getAnnouncements(query: AdminAnnouncementQueryDto) {
    const kindNorm = String(query.kind || 'ANNOUNCEMENT').toUpperCase();
    const isBlogQuery = kindNorm === 'NEWS_BLOG' || kindNorm === 'BLOG' || kindNorm === 'NEWS';
    return this.getAnnouncementsListByIsBlog(query, isBlogQuery);
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

  // --- CREATE ANNOUNCEMENT (NO FILE) ---

  async createAnnouncementOnly(userId: string, dto: CreateAnnouncementItemDto) {
    const payload: CreateAnnouncementItemDto = (dto as any).data || dto;
    let slug = this.slugify(payload.title);
    const existing = await this.prisma.announcement.findUnique({ where: { slug } });
    if (existing) {
      slug = `${slug}-${Date.now()}`;
    }

    const visibility = this.mapAccessToVisibility(payload.accessLevel || 'Public');
    const isPublished = this.parseBoolean(payload.isPublished, true);
    const isPinned = this.parseBoolean(payload.isPinned, false);
    const shareWithAnyone = this.parseBoolean(payload.shareWithAnyone, false);

    const item = await this.prisma.announcement.create({
      data: {
        title: payload.title,
        slug,
        summary: payload.summary || payload.title,
        content: payload.content || payload.summary || payload.title,
        visibility,
        isPublished,
        isPinned,
        isBlog: false,
        shareWithAnyone,
        createdById: userId,
        publishedAt: isPublished ? new Date() : null,
      },
    });

    return this.getAnnouncementById(item.id);
  }

  // --- CREATE NEWS & BLOG (WITH INLINE IMAGE FILE) ---

  async createBlogWithImage(
    userId: string,
    dto: CreateAnnouncementItemDto,
    file?: Express.Multer.File,
  ) {
    const payload: CreateAnnouncementItemDto = (dto as any).data || dto;
    let slug = this.slugify(payload.title);
    const existing = await this.prisma.announcement.findUnique({ where: { slug } });
    if (existing) {
      slug = `${slug}-${Date.now()}`;
    }

    const visibility = this.mapAccessToVisibility(payload.accessLevel || 'Public');
    const isPublished = this.parseBoolean(payload.isPublished, true);
    const shareWithAnyone = this.parseBoolean(payload.shareWithAnyone, false);

    let coverImagePath = payload.coverImagePath || null;
    if (file) {
      const uploaded = await this.uploadsService.saveFile(file, 'ANNOUNCEMENT_COVER', userId);
      if (uploaded) {
        coverImagePath = uploaded.storagePath;
      }
    } else if (payload.fileUploadId) {
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
        isPublished,
        isPinned: false,
        isBlog: true,
        shareWithAnyone,
        coverImagePath,
        createdById: userId,
        publishedAt: isPublished ? new Date() : null,
      },
    });

    return this.getAnnouncementById(item.id);
  }

  async createAnnouncement(userId: string, dto: CreateAnnouncementItemDto) {
    const payload: CreateAnnouncementItemDto = (dto as any).data || dto;
    const kindNorm = String(payload.kind || 'ANNOUNCEMENT').toUpperCase();
    const isBlog = kindNorm === 'NEWS_BLOG' || kindNorm === 'BLOG' || kindNorm === 'NEWS';

    if (isBlog) {
      return this.createBlogWithImage(userId, payload);
    }
    return this.createAnnouncementOnly(userId, payload);
  }

  // --- UPDATE ANNOUNCEMENT & BLOG ---

  async updateAnnouncementOnly(id: string, dto: UpdateAnnouncementItemDto) {
    const payload: UpdateAnnouncementItemDto = (dto as any).data || dto;
    const existing = await this.prisma.announcement.findUnique({ where: { id } });
    if (!existing) {
      throw new NotFoundException(`Announcement with ID ${id} not found.`);
    }

    let visibility = existing.visibility;
    if (payload.accessLevel) {
      visibility = this.mapAccessToVisibility(payload.accessLevel);
    }

    const isPublished = payload.isPublished !== undefined
      ? this.parseBoolean(payload.isPublished, existing.isPublished)
      : existing.isPublished;

    const isPinned = payload.isPinned !== undefined
      ? this.parseBoolean(payload.isPinned, existing.isPinned)
      : existing.isPinned;

    const shareWithAnyone = payload.shareWithAnyone !== undefined
      ? this.parseBoolean(payload.shareWithAnyone, existing.shareWithAnyone)
      : existing.shareWithAnyone;

    const updated = await this.prisma.announcement.update({
      where: { id },
      data: {
        title: payload.title ?? existing.title,
        slug: payload.title ? this.slugify(payload.title) : undefined,
        summary: payload.summary ?? existing.summary,
        content: payload.content ?? existing.content,
        visibility,
        isPublished,
        isPinned,
        shareWithAnyone,
        publishedAt: isPublished ? (existing.publishedAt || new Date()) : null,
      },
    });

    return this.getAnnouncementById(updated.id);
  }

  async updateBlogWithImage(
    id: string,
    dto: UpdateAnnouncementItemDto,
    file?: Express.Multer.File,
    userId?: string,
  ) {
    const payload: UpdateAnnouncementItemDto = (dto as any).data || dto;
    const existing = await this.prisma.announcement.findUnique({ where: { id } });
    if (!existing) {
      throw new NotFoundException(`News & Blog with ID ${id} not found.`);
    }

    let visibility = existing.visibility;
    if (payload.accessLevel) {
      visibility = this.mapAccessToVisibility(payload.accessLevel);
    }

    let coverImagePath = payload.coverImagePath ?? existing.coverImagePath;
    if (file) {
      const uploaded = await this.uploadsService.saveFile(file, 'ANNOUNCEMENT_COVER', userId || existing.createdById || undefined);
      if (uploaded) {
        coverImagePath = uploaded.storagePath;
      }
    } else if (payload.fileUploadId) {
      const fileUpload = await this.prisma.fileUpload.findUnique({
        where: { id: payload.fileUploadId },
      });
      if (fileUpload) {
        coverImagePath = fileUpload.storagePath;
      }
    }

    const isPublished = payload.isPublished !== undefined
      ? this.parseBoolean(payload.isPublished, existing.isPublished)
      : existing.isPublished;

    const shareWithAnyone = payload.shareWithAnyone !== undefined
      ? this.parseBoolean(payload.shareWithAnyone, existing.shareWithAnyone)
      : existing.shareWithAnyone;

    const updated = await this.prisma.announcement.update({
      where: { id },
      data: {
        title: payload.title ?? existing.title,
        slug: payload.title ? this.slugify(payload.title) : undefined,
        summary: payload.summary ?? existing.summary,
        content: payload.content ?? existing.content,
        visibility,
        isPublished,
        shareWithAnyone,
        coverImagePath,
        publishedAt: isPublished ? (existing.publishedAt || new Date()) : null,
      },
    });

    return this.getAnnouncementById(updated.id);
  }

  async updateAnnouncement(id: string, dto: UpdateAnnouncementItemDto) {
    return this.updateAnnouncementOnly(id, dto);
  }

  async togglePin(id: string, dto?: TogglePinDto) {
    const existing = await this.prisma.announcement.findUnique({ where: { id } });
    if (!existing) {
      throw new NotFoundException(`Announcement with ID ${id} not found.`);
    }

    const isPinned = dto?.isPinned !== undefined ? this.parseBoolean(dto.isPinned, !existing.isPinned) : !existing.isPinned;
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
