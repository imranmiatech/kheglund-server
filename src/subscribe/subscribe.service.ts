import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateSubscribeDto, SubscribeQueryDto } from './dto/subscribe.dto';

@Injectable()
export class SubscribeService {
  constructor(private readonly prisma: PrismaService) {}

  async createSubscriber(dto: CreateSubscribeDto) {
    const email = dto.email.toLowerCase().trim();

    const existing = await this.prisma.newsletterSubscriber.findUnique({
      where: { email },
    });

    if (existing) {
      return {
        success: true,
        message: 'You are already subscribed to our newsletter!',
        data: existing,
      };
    }

    const newSubscriber = await this.prisma.newsletterSubscriber.create({
      data: { email },
    });

    return {
      success: true,
      message: 'Thank you for subscribing to our newsletter!',
      data: newSubscriber,
    };
  }

  async getSubscribers(query: SubscribeQueryDto) {
    const page = Math.max(1, Number(query.page) || 1);
    const limit = Math.max(1, Number(query.limit) || 10);
    const skip = (page - 1) * limit;

    const where: any = {};
    if (query.search && query.search.trim() !== '') {
      where.email = {
        contains: query.search.trim(),
        mode: 'insensitive',
      };
    }

    const [items, total] = await Promise.all([
      this.prisma.newsletterSubscriber.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
      }),
      this.prisma.newsletterSubscriber.count({ where }),
    ]);

    const totalPages = Math.ceil(total / limit) || 1;

    return {
      success: true,
      data: items,
      meta: {
        total,
        page,
        limit,
        totalPages,
      },
    };
  }

  async deleteSubscriber(id: string) {
    const subscriber = await this.prisma.newsletterSubscriber.findUnique({
      where: { id },
    });

    if (!subscriber) {
      throw new NotFoundException(`Subscriber with ID "${id}" not found.`);
    }

    await this.prisma.newsletterSubscriber.delete({
      where: { id },
    });

    return {
      success: true,
      message: 'Subscriber removed successfully.',
    };
  }
}
