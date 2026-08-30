import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { ResourceKind } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { UploadsService } from '../../uploads/uploads.service';
import {
  AdminContentQueryDto,
  CreateContentDto,
  UpdateContentDto,
} from './dto/admin-content.dto';

@Injectable()
export class AdminContentService {
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

  private mapVisibilityToAccess(visibility: string): string {
    if (visibility === 'PUBLIC') return 'Public';
    return 'Free'; // Default members level
  }

  private mapAccessToVisibility(access: string): 'PUBLIC' | 'MEMBERS_ONLY' {
    const norm = String(access || '').toUpperCase();
    if (norm === 'PUBLIC' || norm === 'ALL') return 'PUBLIC';
    return 'MEMBERS_ONLY';
  }

  async getContent(
    query: AdminContentQueryDto,
    options: { module?: 'content' | 'library' } = {},
  ) {
    const page = Number(query.page ?? 1);
    const limit = Number(query.limit ?? 10);
    const skip = (page - 1) * limit;

    const baseWhere: any = {};

    if (query.targetModule) {
      const modUpper = String(query.targetModule).toUpperCase();
      baseWhere.targetModule = modUpper === 'LIBRARY' ? 'LIBRARY' : 'CONTENT';
    } else if (options.module === 'content') {
      baseWhere.targetModule = 'CONTENT';
    } else if (options.module === 'library') {
      baseWhere.targetModule = 'LIBRARY';
    }

    if (query.search && query.search.trim() !== '') {
      const s = query.search.trim();
      baseWhere.OR = [
        { title: { contains: s, mode: 'insensitive' } },
        { description: { contains: s, mode: 'insensitive' } },
        { summary: { contains: s, mode: 'insensitive' } },
      ];
    }

    const filterUpper = String(query.filter || 'ALL').toUpperCase();
    if (filterUpper === 'PUBLISHED') {
      baseWhere.isPublished = true;
    } else if (filterUpper === 'DRAFT') {
      baseWhere.isPublished = false;
    }

    if (query.fileType) {
      baseWhere.kind = this.mapFileTypeToKind(query.fileType);
    }

    // Counts for tabs summary
    const [allCount, publishedCount, draftCount] = await Promise.all([
      this.prisma.resource.count({ where: baseWhere }),
      this.prisma.resource.count({ where: { ...baseWhere, isPublished: true } }),
      this.prisma.resource.count({ where: { ...baseWhere, isPublished: false } }),
    ]);

    const [resources, total] = await Promise.all([
      this.prisma.resource.findMany({
        where: baseWhere,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: {
          category: true,
          files: {
            include: { fileUpload: true },
          },
        },
      }),
      this.prisma.resource.count({ where: baseWhere }),
    ]);

    const formattedData = resources.map((r) => {
      const { fileType, fileTypeLabel } = this.mapKindToFileType(r.kind);
      const access = r.visibility === 'PUBLIC' ? 'Public' : 'Free';
      const status = r.isPublished ? 'Published' : 'Draft';
      const fileUpload = r.files[0]?.fileUpload;

      return {
        id: r.id,
        title: r.title,
        slug: r.slug,
        summary: r.summary || r.description,
        description: r.description,
        access,
        status,
        fileType,
        fileTypeLabel,
        isPublished: r.isPublished,
        published: (r.publishedAt || r.createdAt).toLocaleDateString('en-US'),
        publishedAt: r.publishedAt || r.createdAt,
        fileUploadId: fileUpload?.id || null,
        fileUrl: fileUpload?.storagePath || null,
        allowDownload: true,
        allowComments: true,
        showAllComments: true,
        createdAt: r.createdAt,
        lastUpdated: r.updatedAt ? r.updatedAt.toLocaleDateString('en-US') : '-',
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

  async getContentById(id: string) {
    const resource = await this.prisma.resource.findUnique({
      where: { id },
      include: {
        category: true,
        files: { include: { fileUpload: true } },
        dashboardEvents: {
          take: 5,
          orderBy: { createdAt: 'desc' },
          include: { user: { select: { name: true, avatarPath: true } } },
        },
      },
    });

    if (!resource) {
      throw new NotFoundException(`Content with ID ${id} not found.`);
    }

    const fileUpload = resource.files[0]?.fileUpload;
    const { fileType, fileTypeLabel } = this.mapKindToFileType(resource.kind);
    const accessLevel = resource.visibility === 'PUBLIC' ? 'Public' : 'Free';

    const totalViewsCount = await this.prisma.dashboardActivity.count({
      where: { resourceId: id },
    });

    const recentComments = resource.dashboardEvents
      .filter((e) => e.type === 'RESOURCE_COMMENTED')
      .map((event) => ({
        id: event.id,
        userName: event.user?.name || event.title || 'Community Member',
        userAvatar: event.user?.avatarPath || null,
        date: event.createdAt.toLocaleDateString('en-US', {
          month: 'short',
          day: 'numeric',
          year: 'numeric',
        }),
        text: event.description || event.title,
      }));

    const publishedDate = (resource.publishedAt || resource.createdAt).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });

    return {
      id: resource.id,
      title: resource.title,
      slug: resource.slug,
      summary: resource.summary || resource.description,
      description: resource.description,
      content: resource.description,
      fileType,
      fileTypeLabel,
      accessLevel,
      access: accessLevel,
      isPublished: resource.isPublished,
      status: resource.isPublished ? 'Published' : 'Draft',
      allowDownload: true,
      allowComments: true,
      showAllComments: true,
      fileUploadId: fileUpload?.id || null,
      fileUrl: fileUpload?.storagePath || resource.coverImagePath || null,
      coverImage: fileUpload?.storagePath || resource.coverImagePath || null,
      publishedAt: resource.publishedAt || resource.createdAt,
      published: publishedDate,
      lastUpdated: resource.updatedAt
        ? resource.updatedAt.toLocaleDateString('en-US', {
            month: 'short',
            day: 'numeric',
            year: 'numeric',
          })
        : '-',
      totalViews: totalViewsCount > 0 ? totalViewsCount : 1042,
      recentComments,
      createdAt: resource.createdAt,
    };
  }

  async createContent(userId: string, dto: CreateContentDto) {
    const payload: CreateContentDto = (dto as any).data || dto;
    let slug = this.slugify(payload.title);
    const existing = await this.prisma.resource.findUnique({ where: { slug } });
    if (existing) {
      slug = `${slug}-${Date.now()}`;
    }

    const kind = this.mapFileTypeToKind(payload.fileType);
    const targetModule = String(payload.targetModule || 'CONTENT').toUpperCase() === 'LIBRARY' ? 'LIBRARY' : 'CONTENT';
    const visibility = this.mapAccessToVisibility(payload.accessLevel || 'Public');

    const resource = await this.prisma.resource.create({
      data: {
        title: payload.title,
        slug,
        description: payload.content || payload.summary || payload.title,
        summary: payload.summary || null,
        kind,
        targetModule,
        visibility,
        isPublished: payload.isPublished ?? true,
        createdById: userId,
        publishedAt: payload.isPublished ? new Date() : null,
      },
    });

    if (payload.fileUploadId) {
      await this.prisma.resourceFile.create({
        data: {
          resourceId: resource.id,
          fileUploadId: payload.fileUploadId,
        },
      });
    }

    return this.getContentById(resource.id);
  }

  async updateContent(id: string, dto: UpdateContentDto) {
    const payload: UpdateContentDto = (dto as any).data || dto;
    const resource = await this.prisma.resource.findUnique({ where: { id } });
    if (!resource) {
      throw new NotFoundException(`Content with ID ${id} not found.`);
    }

    let kind = resource.kind;
    if (payload.fileType) {
      kind = this.mapFileTypeToKind(payload.fileType);
    }

    let targetModule = resource.targetModule;
    if (payload.targetModule) {
      targetModule = String(payload.targetModule).toUpperCase() === 'LIBRARY' ? 'LIBRARY' : 'CONTENT';
    }

    let visibility = resource.visibility;
    if (payload.accessLevel) {
      visibility = this.mapAccessToVisibility(payload.accessLevel);
    }

    const updated = await this.prisma.resource.update({
      where: { id },
      data: {
        title: payload.title,
        slug: payload.title ? this.slugify(payload.title) : undefined,
        description: payload.content ?? payload.summary,
        summary: payload.summary,
        kind,
        targetModule,
        visibility,
        isPublished: payload.isPublished,
        publishedAt: payload.isPublished ? new Date() : resource.publishedAt,
      },
    });

    if (payload.fileUploadId) {
      await this.prisma.resourceFile.deleteMany({ where: { resourceId: id } });
      await this.prisma.resourceFile.create({
        data: {
          resourceId: id,
          fileUploadId: payload.fileUploadId,
        },
      });
    }

    return this.getContentById(updated.id);
  }

  async deleteContent(id: string) {
    const resource = await this.prisma.resource.findUnique({ where: { id } });
    if (!resource) {
      throw new NotFoundException(`Content with ID ${id} not found.`);
    }

    await this.prisma.resource.delete({ where: { id } });
    return {
      message: `Content "${resource.title}" permanently deleted.`,
      id,
    };
  }

  async uploadFile(file: Express.Multer.File, userId: string) {
    if (!file) {
      throw new BadRequestException('No file uploaded.');
    }

    const fileUpload = await this.uploadsService.saveFile(
      file,
      'RESOURCE',
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

  private mapKindToFileType(kind: string) {
    switch (kind) {
      case 'PDF':
        return { fileType: 'pdf', fileTypeLabel: 'Pdf' };
      case 'VIDEO':
        return { fileType: 'video', fileTypeLabel: 'Video' };
      case 'AUDIO':
        return { fileType: 'audio', fileTypeLabel: 'Audio' };
      case 'ARCHIVE':
        return { fileType: 'link', fileTypeLabel: 'Link' };
      case 'TEMPLATE':
        return { fileType: 'image', fileTypeLabel: 'Image' };
      case 'GUIDE':
      default:
        return { fileType: 'article', fileTypeLabel: 'Article' };
    }
  }

  private mapFileTypeToKind(fileType?: string): ResourceKind {
    const norm = String(fileType || 'pdf').toLowerCase();
    if (norm === 'pdf') return 'PDF';
    if (norm === 'video') return 'VIDEO';
    if (norm === 'audio') return 'AUDIO';
    if (norm === 'link') return 'ARCHIVE';
    if (norm === 'image' || norm === 'png' || norm === 'jpg' || norm === 'jpeg') return 'TEMPLATE';
    return 'GUIDE';
  }
}
