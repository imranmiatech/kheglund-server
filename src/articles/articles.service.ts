import { Injectable, NotFoundException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { ArticleQueryDto, TrackArticleReadDto } from './dto/articles.dto';

@Injectable()
export class ArticlesService {
  constructor(private readonly prisma: PrismaService) {}

  listArticles(query: ArticleQueryDto) {
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

    return this.prisma.article.findMany({
      where,
      include: {
        tags: { include: { tag: true } },
      },
      orderBy: { publishedAt: 'desc' },
    });
  }

  async getArticle(id: string) {
    const article = await this.prisma.article.findUnique({
      where: { id },
      include: { tags: { include: { tag: true } } },
    });

    if (!article || !article.isPublished) {
      throw new NotFoundException('Article not found.');
    }

    return article;
  }

  async trackRead(userId: string, articleId: string, dto: TrackArticleReadDto) {
    const article = await this.prisma.article.findUnique({
      where: { id: articleId },
    });

    if (!article) {
      throw new NotFoundException('Article not found.');
    }

    const progressPercent = dto.progressPercent ?? 100;
    await this.prisma.articleRead.upsert({
      where: {
        userId_articleId: {
          userId,
          articleId,
        },
      },
      update: {
        progressPercent,
        lastReadAt: new Date(),
        completedAt: progressPercent >= 100 ? new Date() : null,
      },
      create: {
        userId,
        articleId,
        progressPercent,
        completedAt: progressPercent >= 100 ? new Date() : null,
      },
    });

    await this.prisma.dashboardActivity.create({
      data: {
        userId,
        articleId,
        type: 'ARTICLE_READ',
        title: 'Article read',
        description: article.title,
      },
    });

    return { message: 'Article progress saved successfully.' };
  }
}
