import { Injectable, NotFoundException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { ResourceQueryDto } from './dto/resources.dto';

@Injectable()
export class ResourcesService {
  constructor(private readonly prisma: PrismaService) {}

  async listResources(userId: string, query: ResourceQueryDto) {
    const page = Number(query.page ?? 1);
    const limit = Number(query.limit ?? 12);
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
      },
    });

    if (!resource || !resource.isPublished) {
      throw new NotFoundException('Resource not found.');
    }

    return {
      ...resource,
      isSaved: resource.savedByUsers.length > 0,
    };
  }

  async saveResource(userId: string, resourceId: string) {
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

  async getLibraryFeed(userId: string, query: ResourceQueryDto) {
    const [resources, articles] = await Promise.all([
      this.listResources(userId, query),
      this.prisma.article.findMany({
        where: {
          isPublished: true,
          ...(query.search
            ? {
                OR: [
                  { title: { contains: query.search, mode: 'insensitive' } },
                  { summary: { contains: query.search, mode: 'insensitive' } },
                ],
              }
            : {}),
        },
        include: {
          tags: { include: { tag: true } },
        },
        orderBy: { publishedAt: 'desc' },
        take: 12,
      }),
    ]);

    return {
      resources,
      articles,
    };
  }

  getSavedResources(userId: string) {
    return this.listResources(userId, {
      savedOnly: true,
      page: 1,
      limit: 50,
    });
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
}
