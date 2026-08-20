import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateContactSubmissionDto } from './dto/contacts.dto';

@Injectable()
export class ContactsService {
  constructor(private readonly prisma: PrismaService) {}

  createSubmission(dto: CreateContactSubmissionDto, userId?: string) {
    return this.prisma.contactSubmission.create({
      data: {
        userId,
        name: dto.name,
        email: dto.email.toLowerCase(),
        phone: dto.phone,
        subject: dto.subject,
        message: dto.message,
      },
    });
  }

  getChannels() {
    return this.prisma.contactChannel.findMany({
      where: { isPublished: true },
      orderBy: { sortOrder: 'asc' },
    });
  }

  getFaqs(page?: string) {
    return this.prisma.faqItem.findMany({
      where: {
        isPublished: true,
        ...(page ? { page: page as never } : {}),
      },
      orderBy: [{ page: 'asc' }, { sortOrder: 'asc' }],
    });
  }

  getContentPage(slug: string) {
    return this.prisma.contentPage.findUnique({
      where: { slug },
    });
  }

  listSubmissions() {
    return this.prisma.contactSubmission.findMany({
      orderBy: { createdAt: 'desc' },
    });
  }
}
