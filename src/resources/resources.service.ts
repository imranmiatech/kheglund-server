import { Injectable, NotFoundException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { ResourceQueryDto } from './dto/resources.dto';

@Injectable()
export class ResourcesService {
  constructor(private readonly prisma: PrismaService) {}

  async listResources(userId: string, query: ResourceQueryDto) {
    const selectedKind = this.getSelectedKind(query);
    const selectedQuery = { ...query, kind: selectedKind };

    if (query.savedOnly) {
      return this.getSavedResources(userId, query);
    }

    if (selectedKind === 'ARTICLE') {
      return this.listArticles(query);
    }

    if (!selectedKind) {
      return this.listAllContent(userId, query);
    }

    return this.listResourcePage(userId, selectedQuery);
  }

  private async listResourcePage(userId: string, query: ResourceQueryDto) {
    const page = Number(query.page ?? 1);
    const limit = Number(query.limit ?? 12);
    const targetModuleVal = query.targetModule || query.module;
    const targetModuleUpper = targetModuleVal ? String(targetModuleVal).toUpperCase() : undefined;

    const where: Prisma.ResourceWhereInput = {
      isPublished: true,
      AND: [
        targetModuleUpper ? { targetModule: targetModuleUpper } : {},
        query.search
          ? {
              OR: [
                { title: { contains: query.search, mode: 'insensitive' } },
                {
                  description: { contains: query.search, mode: 'insensitive' },
                },
              ],
            }
          : {},
        query.kind ? { kind: query.kind as never } : {},
        query.category ? { category: { slug: query.category } } : {},
        query.tag ? { tags: { some: { tag: { slug: query.tag } } } } : {},
        query.savedOnly ? { savedByUsers: { some: { userId } } } : {},
      ],
    };

    const [items, total] = await Promise.all([
      this.prisma.resource.findMany({
        where,
        include: {
          category: true,
          tags: { include: { tag: true } },
          files: { include: { fileUpload: true } },
          savedByUsers: {
            where: { userId },
          },
        },
        skip: (page - 1) * limit,
        take: limit,
        orderBy: { publishedAt: 'desc' },
      }),
      this.prisma.resource.count({ where }),
    ]);

    return {
      items: items.map((item) => ({
        ...item,
        isSaved: item.savedByUsers.length > 0,
        contentType: 'RESOURCE' as const,
        type: item.kind,
      })),
      page,
      limit,
      total,
    };
  }

  async getResourceById(userId: string, id: string) {
    const resource = await this.prisma.resource.findUnique({
      where: { id },
      include: {
        category: true,
        tags: { include: { tag: true } },
        files: { include: { fileUpload: true } },
        savedByUsers: { where: { userId } },
        dashboardEvents: {
          include: { user: true },
          orderBy: { createdAt: 'desc' },
        },
      },
    });

    if (!resource || !resource.isPublished) {
      throw new NotFoundException('Resource not found.');
    }

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

    return {
      ...resource,
      isSaved: resource.savedByUsers.length > 0,
      recentComments,
      commentsCount: recentComments.length,
    };
  }

  async addComment(userId: string, resourceId: string, text: string) {
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    const resource = await this.prisma.resource.findUnique({ where: { id: resourceId } });
    if (!resource) {
      throw new NotFoundException('Resource not found.');
    }

    const activity = await this.prisma.dashboardActivity.create({
      data: {
        userId,
        resourceId,
        type: 'RESOURCE_COMMENTED',
        title: user?.name || 'Community Member',
        description: text,
      },
    });

    return {
      id: activity.id,
      userName: user?.name || 'Community Member',
      userAvatar: user?.avatarPath || null,
      date: activity.createdAt.toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
        year: 'numeric',
      }),
      text: activity.description,
    };
  }

  async saveResource(userId: string, resourceId: string) {
    const resource = await this.prisma.resource.findFirst({
      where: { id: resourceId, isPublished: true },
      select: { id: true },
    });

    if (!resource) {
      throw new NotFoundException('Resource not found.');
    }

    await this.prisma.savedResource.upsert({
      where: {
        userId_resourceId: {
          userId,
          resourceId,
        },
      },
      update: {},
      create: { userId, resourceId },
    });

    await this.prisma.dashboardActivity.create({
      data: {
        userId,
        resourceId,
        type: 'RESOURCE_SAVED',
        title: 'Resource saved',
        description: 'A member saved a resource.',
      },
    });

    return { message: 'Resource saved successfully.' };
  }

  async unsaveResource(userId: string, resourceId: string) {
    await this.prisma.savedResource.delete({
      where: {
        userId_resourceId: {
          userId,
          resourceId,
        },
      },
    });

    return { message: 'Resource removed from saved items.' };
  }

  async markDownloaded(userId: string, resourceId: string) {
    const resource = await this.prisma.resource.findUnique({
      where: { id: resourceId },
      include: {
        files: {
          include: { fileUpload: true },
        },
      },
    });

    if (!resource || resource.files.length === 0) {
      throw new NotFoundException(
        'Downloadable file not found for this resource.',
      );
    }

    await this.prisma.resourceDownload.create({
      data: { userId, resourceId },
    });
    await this.prisma.dashboardActivity.create({
      data: {
        userId,
        resourceId,
        type: 'RESOURCE_DOWNLOADED',
        title: 'Resource downloaded',
        description: resource.title,
      },
    });

    const file = resource.files[0].fileUpload;
    return {
      message: 'Download tracked successfully.',
      downloadUrl: file.storagePath,
      file,
    };
  }

  async markRead(userId: string, resourceId: string) {
    const resource = await this.prisma.resource.findUnique({
      where: { id: resourceId },
    });

    if (!resource) {
      throw new NotFoundException('Resource not found.');
    }

    await this.prisma.dashboardActivity.create({
      data: {
        userId,
        resourceId,
        type: 'RESOURCE_VIEWED',
        title: 'Resource viewed',
        description: resource.title,
      },
    });

    return { message: 'Resource activity tracked successfully.' };
  }

  async getLibraryFeed(userId: string, query: ResourceQueryDto = {}) {
    const isSavedOnly = Boolean(query.savedOnly);

    const [resources, articles] = await Promise.all([
      this.listResourcePage(userId, { ...query, kind: undefined }),
      isSavedOnly
        ? Promise.resolve({
            items: [],
            page: Number(query.page ?? 1),
            limit: Number(query.limit ?? 12),
            total: 0,
          })
        : this.listArticles(query),
    ]);

    return {
      resources,
      articles,
    };
  }

  async getSavedResources(userId: string, query: ResourceQueryDto = {}) {
    const selectedKind = this.getSelectedKind(query);
    const page = Number(query.page ?? 1);
    const limit = query.limit !== undefined ? Number(query.limit) : undefined;

    const where: Prisma.ResourceWhereInput = {
      isPublished: true,
      AND: [
        query.search
          ? {
              OR: [
                { title: { contains: query.search, mode: 'insensitive' } },
                {
                  description: { contains: query.search, mode: 'insensitive' },
                },
              ],
            }
          : {},
        selectedKind ? { kind: selectedKind as never } : {},
        query.category ? { category: { slug: query.category } } : {},
        query.tag ? { tags: { some: { tag: { slug: query.tag } } } } : {},
        { savedByUsers: { some: { userId } } },
      ],
    };

    const [items, total] = await Promise.all([
      this.prisma.resource.findMany({
        where,
        include: {
          category: true,
          tags: { include: { tag: true } },
          files: { include: { fileUpload: true } },
          savedByUsers: {
            where: { userId },
          },
        },
        ...(limit ? { skip: (page - 1) * limit, take: limit } : {}),
        orderBy: { publishedAt: 'desc' },
      }),
      this.prisma.resource.count({ where }),
    ]);

    return {
      items: items.map((item) => ({
        ...item,
        isSaved: true,
        contentType: 'RESOURCE' as const,
        type: item.kind,
      })),
      page,
      limit: limit ?? total,
      total,
    };
  }

  async getDownloadedResources(userId: string) {
    const downloads = await this.prisma.resourceDownload.findMany({
      where: { userId },
      include: {
        resource: {
          include: {
            category: true,
            tags: { include: { tag: true } },
            files: { include: { fileUpload: true } },
          },
        },
      },
      orderBy: { downloadedAt: 'desc' },
    });

    return downloads;
  }

  private async listArticles(query: ResourceQueryDto) {
    const page = Number(query.page ?? 1);
    const limit = Number(query.limit ?? 12);
    const where: Prisma.ArticleWhereInput = {
      isPublished: true,
      AND: [
        query.search
          ? {
              OR: [
                { title: { contains: query.search, mode: 'insensitive' } },
                { summary: { contains: query.search, mode: 'insensitive' } },
              ],
            }
          : {},
        query.tag ? { tags: { some: { tag: { slug: query.tag } } } } : {},
      ],
    };

    const [items, total] = await Promise.all([
      this.prisma.article.findMany({
        where,
        include: { tags: { include: { tag: true } } },
        skip: (page - 1) * limit,
        take: limit,
        orderBy: { publishedAt: 'desc' },
      }),
      this.prisma.article.count({ where }),
    ]);

    return {
      items: items.map((item) => ({
        ...item,
        contentType: 'ARTICLE' as const,
        type: 'ARTICLE' as const,
      })),
      page,
      limit,
      total,
    };
  }

  private async listAllContent(userId: string, query: ResourceQueryDto) {
    const page = Number(query.page ?? 1);
    const limit = Number(query.limit ?? 12);
    const take = page * limit;
    const resourceWhere = this.createResourceWhere(userId, query);
    const articleWhere = this.createArticleWhere(query);

    const [resources, articles, resourceTotal, articleTotal] =
      await Promise.all([
        this.prisma.resource.findMany({
          where: resourceWhere,
          include: {
            category: true,
            tags: { include: { tag: true } },
            files: { include: { fileUpload: true } },
            savedByUsers: { where: { userId } },
          },
          orderBy: { publishedAt: 'desc' },
          take,
        }),
        this.prisma.article.findMany({
          where: articleWhere,
          include: { tags: { include: { tag: true } } },
          orderBy: { publishedAt: 'desc' },
          take,
        }),
        this.prisma.resource.count({ where: resourceWhere }),
        this.prisma.article.count({ where: articleWhere }),
      ]);

    const items = [
      ...resources.map((item) => ({
        ...item,
        isSaved: item.savedByUsers.length > 0,
        contentType: 'RESOURCE' as const,
        type: item.kind,
      })),
      ...articles.map((item) => ({
        ...item,
        contentType: 'ARTICLE' as const,
        type: 'ARTICLE' as const,
      })),
    ]
      .sort(
        (left, right) =>
          (right.publishedAt?.getTime() ?? 0) -
          (left.publishedAt?.getTime() ?? 0),
      )
      .slice((page - 1) * limit, page * limit);

    return {
      items,
      page,
      limit,
      total: resourceTotal + articleTotal,
    };
  }

  private createResourceWhere(userId: string, query: ResourceQueryDto) {
    const targetModuleVal = query.targetModule || query.module;
    const targetModuleUpper = targetModuleVal ? String(targetModuleVal).toUpperCase() : undefined;

    return {
      isPublished: true,
      AND: [
        targetModuleUpper ? { targetModule: targetModuleUpper } : {},
        query.search
          ? {
              OR: [
                { title: { contains: query.search, mode: 'insensitive' } },
                {
                  description: { contains: query.search, mode: 'insensitive' },
                },
              ],
            }
          : {},
        query.kind ? { kind: query.kind as never } : {},
        query.category ? { category: { slug: query.category } } : {},
        query.tag ? { tags: { some: { tag: { slug: query.tag } } } } : {},
        query.savedOnly ? { savedByUsers: { some: { userId } } } : {},
      ],
    } satisfies Prisma.ResourceWhereInput;
  }

  private createArticleWhere(query: ResourceQueryDto) {
    return {
      isPublished: true,
      AND: [
        query.search
          ? {
              OR: [
                { title: { contains: query.search, mode: 'insensitive' } },
                { summary: { contains: query.search, mode: 'insensitive' } },
              ],
            }
          : {},
        query.tag ? { tags: { some: { tag: { slug: query.tag } } } } : {},
      ],
    } satisfies Prisma.ArticleWhereInput;
  }

  private getSelectedKind(query: ResourceQueryDto) {
    if (query.type === 'ALL_RESOURCE') {
      return undefined;
    }

    return query.type ?? query.kind;
  }
}
