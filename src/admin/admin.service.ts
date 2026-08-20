import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { UploadsService } from '../uploads/uploads.service';
import {
  CreateAnnouncementDto,
  CreateArticleDto,
  CreateContactChannelDto,
  CreateContentPageDto,
  CreateFaqDto,
  CreateResourceDto,
  CreateResourceCategoryDto,
  CreateTagDto,
} from './dto/admin.dto';

@Injectable()
export class AdminService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly uploadsService: UploadsService,
  ) {}

  listResources() {
    return this.prisma.resource.findMany({
      include: {
        category: true,
        tags: { include: { tag: true } },
        files: { include: { fileUpload: true } },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async createResource(userId: string, dto: CreateResourceDto) {
    return this.prisma.resource.create({
      data: {
        title: dto.title,
        slug: dto.slug,
        description: dto.description,
        summary: dto.summary,
        kind: dto.kind as never,
        visibility: dto.visibility as never,
        isPublished: dto.isPublished,
        categoryId: dto.categoryId,
        createdById: userId,
        publishedAt: dto.isPublished ? new Date() : null,
        tags: dto.tagIds?.length
          ? {
              create: dto.tagIds.map((tagId) => ({
                tagId,
              })),
            }
          : undefined,
        files: dto.fileUploadId
          ? {
              create: {
                fileUploadId: dto.fileUploadId,
              },
            }
          : undefined,
      },
    });
  }

  listArticles() {
    return this.prisma.article.findMany({
      include: { tags: { include: { tag: true } } },
      orderBy: { createdAt: 'desc' },
    });
  }

  createArticle(userId: string, dto: CreateArticleDto) {
    return this.prisma.article.create({
      data: {
        title: dto.title,
        slug: dto.slug,
        summary: dto.summary,
        content: dto.content,
        visibility: dto.visibility as never,
        isPublished: dto.isPublished,
        createdById: userId,
        publishedAt: dto.isPublished ? new Date() : null,
        tags: dto.tagIds?.length
          ? {
              create: dto.tagIds.map((tagId) => ({
                tagId,
              })),
            }
          : undefined,
      },
    });
  }

  listAnnouncements() {
    return this.prisma.announcement.findMany({
      orderBy: { createdAt: 'desc' },
    });
  }

  createAnnouncement(userId: string, dto: CreateAnnouncementDto) {
    return this.prisma.announcement.create({
      data: {
        title: dto.title,
        slug: dto.slug,
        summary: dto.summary,
        content: dto.content,
        type: dto.type as never,
        visibility: dto.visibility as never,
        isPublished: dto.isPublished,
        createdById: userId,
        publishedAt: dto.isPublished ? new Date() : null,
      },
    });
  }

  listContentPages() {
    return this.prisma.contentPage.findMany({
      orderBy: { slug: 'asc' },
    });
  }

  createContentPage(dto: CreateContentPageDto) {
    return this.prisma.contentPage.upsert({
      where: { slug: dto.slug },
      update: {
        title: dto.title,
        summary: dto.summary,
        content: dto.content,
        visibility: dto.visibility as never,
        isPublished: dto.isPublished,
      },
      create: {
        slug: dto.slug,
        title: dto.title,
        summary: dto.summary,
        content: dto.content,
        visibility: dto.visibility as never,
        isPublished: dto.isPublished,
      },
    });
  }

  listFaqs() {
    return this.prisma.faqItem.findMany({
      orderBy: [{ page: 'asc' }, { sortOrder: 'asc' }],
    });
  }

  createFaq(dto: CreateFaqDto) {
    return this.prisma.faqItem.create({
      data: {
        page: dto.page as never,
        question: dto.question,
        answer: dto.answer,
        sortOrder: dto.sortOrder,
        isPublished: dto.isPublished,
      },
    });
  }

  listContactChannels() {
    return this.prisma.contactChannel.findMany({
      orderBy: [{ sortOrder: 'asc' }],
    });
  }

  createContactChannel(dto: CreateContactChannelDto) {
    return this.prisma.contactChannel.create({
      data: {
        type: dto.type as never,
        label: dto.label,
        value: dto.value,
        helperText: dto.helperText,
        sortOrder: dto.sortOrder,
        isPublished: dto.isPublished,
      },
    });
  }

  listContactSubmissions() {
    return this.prisma.contactSubmission.findMany({
      orderBy: { createdAt: 'desc' },
    });
  }

  listPlans() {
    return this.prisma.membershipPlan.findMany({
      orderBy: { createdAt: 'asc' },
    });
  }

  uploadFile(file: Express.Multer.File, userId: string) {
    return this.uploadsService.saveFile(file, 'RESOURCE', userId);
  }

  listResourceCategories() {
    return this.prisma.resourceCategory.findMany({
      orderBy: { name: 'asc' },
    });
  }

  createResourceCategory(dto: CreateResourceCategoryDto) {
    return this.prisma.resourceCategory.upsert({
      where: { slug: dto.slug },
      update: {
        name: dto.name,
        description: dto.description,
      },
      create: {
        name: dto.name,
        slug: dto.slug,
        description: dto.description,
      },
    });
  }

  listResourceTags() {
    return this.prisma.resourceTag.findMany({
      orderBy: { name: 'asc' },
    });
  }

  createResourceTag(dto: CreateTagDto) {
    return this.prisma.resourceTag.upsert({
      where: { slug: dto.slug },
      update: {
        name: dto.name,
      },
      create: {
        name: dto.name,
        slug: dto.slug,
      },
    });
  }

  listArticleTags() {
    return this.prisma.articleTag.findMany({
      orderBy: { name: 'asc' },
    });
  }

  createArticleTag(dto: CreateTagDto) {
    return this.prisma.articleTag.upsert({
      where: { slug: dto.slug },
      update: {
        name: dto.name,
      },
      create: {
        name: dto.name,
        slug: dto.slug,
      },
    });
  }
}
