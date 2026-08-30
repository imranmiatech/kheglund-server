import {
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import {
  AdminReplyTicketDto,
  AdminTicketQueryDto,
  CreateFaqItemDto,
  UpdateFaqItemDto,
  UpdateSupportTicketDto,
} from './dto/admin-support.dto';

const DEFAULT_FAQS = [
  {
    question: 'What is Community Hub',
    answer:
      'A community hub is a centralized, multi-purpose public space designed to bring local residents, neighborhood groups, and public agencies together under one roof.',
    page: 'MEMBERSHIP' as const,
    sortOrder: 1,
  },
  {
    question: 'Can I cancel my membership anytime?',
    answer:
      'Yes, you can cancel your membership at any time from your account settings page without cancellation fees.',
    page: 'MEMBERSHIP' as const,
    sortOrder: 2,
  },
  {
    question: 'How much does membership cost?',
    answer:
      'We offer multiple tiers starting from Free membership up to Premium access. Details are available on the billing page.',
    page: 'MEMBERSHIP' as const,
    sortOrder: 3,
  },
  {
    question: 'Is there a free trial available?',
    answer:
      'Yes, new members receive a 7-day free trial on selected subscription plans.',
    page: 'MEMBERSHIP' as const,
    sortOrder: 4,
  },
  {
    question: 'What content is available to members?',
    answer:
      'Members get access to research guides, downloadable resources, community challenges, and live event announcements.',
    page: 'MEMBERSHIP' as const,
    sortOrder: 5,
  },
];

@Injectable()
export class AdminSupportService {
  constructor(private readonly prisma: PrismaService) {}

  private normalizeStatus(status?: string): 'OPEN' | 'IN_PROGRESS' | 'RESOLVED' | 'CLOSED' {
    if (!status) return 'OPEN';
    const norm = String(status).toUpperCase().replace(/\s+/g, '_');
    if (norm === 'OPENED' || norm === 'OPEN') return 'OPEN';
    if (norm === 'IN_PROGRESS' || norm === 'INPROGRESS' || norm === 'IN_PROGRESS') return 'IN_PROGRESS';
    if (norm === 'RESOLVED') return 'RESOLVED';
    if (norm === 'CLOSED') return 'CLOSED';
    return 'OPEN';
  }

  private normalizePriority(priority?: string): 'LOW' | 'MEDIUM' | 'HIGH' | 'URGENT' {
    if (!priority) return 'MEDIUM';
    const norm = String(priority).toUpperCase();
    if (['LOW', 'MEDIUM', 'HIGH', 'URGENT'].includes(norm)) {
      return norm as any;
    }
    return 'MEDIUM';
  }

  private formatStatusBadge(status: string): string {
    if (status === 'OPEN') return 'Opened';
    if (status === 'IN_PROGRESS') return 'In progress';
    if (status === 'RESOLVED') return 'Resolved';
    return 'Closed';
  }

  // --- SUPPORT TICKETS ---

  async getTickets(query: AdminTicketQueryDto) {
    const page = query.page || 1;
    const limit = query.limit || 10;
    const skip = (page - 1) * limit;

    const baseWhere: any = {};

    if (query.search && query.search.trim() !== '') {
      const s = query.search.trim();
      baseWhere.OR = [
        { ticketNumber: { contains: s, mode: 'insensitive' } },
        { subject: { contains: s, mode: 'insensitive' } },
        { user: { name: { contains: s, mode: 'insensitive' } } },
        { user: { email: { contains: s, mode: 'insensitive' } } },
      ];
    }

    const statusUpper = String(query.status || 'ALL').toUpperCase();
    if (statusUpper === 'OPEN' || statusUpper === 'OPENED') {
      baseWhere.status = 'OPEN';
    } else if (statusUpper === 'IN_PROGRESS') {
      baseWhere.status = 'IN_PROGRESS';
    } else if (statusUpper === 'RESOLVED') {
      baseWhere.status = 'RESOLVED';
    }

    const [allCount, openCount, inProgressCount, resolvedCount] = await Promise.all([
      this.prisma.supportTicket.count(),
      this.prisma.supportTicket.count({ where: { status: 'OPEN' } }),
      this.prisma.supportTicket.count({ where: { status: 'IN_PROGRESS' } }),
      this.prisma.supportTicket.count({ where: { status: 'RESOLVED' } }),
    ]);

    const [items, total] = await Promise.all([
      this.prisma.supportTicket.findMany({
        where: baseWhere,
        skip,
        take: limit,
        orderBy: { updatedAt: 'desc' },
        include: {
          user: {
            select: {
              id: true,
              name: true,
              email: true,
              avatarPath: true,
            },
          },
        },
      }),
      this.prisma.supportTicket.count({ where: baseWhere }),
    ]);

    const formattedData = items.map((t) => {
      const lastUpdatedDate = t.updatedAt.toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
        year: 'numeric',
      });

      return {
        id: t.id,
        ticket: t.ticketNumber,
        ticketNumber: t.ticketNumber,
        member: {
          id: t.user.id,
          name: t.user.name,
          email: t.user.email,
          avatar: t.user.avatarPath || null,
        },
        startDate: t.subject,
        subject: t.subject,
        description: t.description,
        status: this.formatStatusBadge(t.status),
        rawStatus: t.status,
        priority: t.priority,
        lastUpdated: lastUpdatedDate,
        updatedAt: t.updatedAt,
        createdAt: t.createdAt,
      };
    });

    return {
      summary: {
        allCount,
        openCount,
        inProgressCount,
        resolvedCount,
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

  async getTicketById(id: string) {
    const t = await this.prisma.supportTicket.findUnique({
      where: { id },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true,
            avatarPath: true,
          },
        },
        messages: {
          orderBy: { createdAt: 'asc' },
          include: {
            sender: {
              select: {
                id: true,
                name: true,
                email: true,
                avatarPath: true,
                role: true,
              },
            },
          },
        },
      },
    });

    if (!t) {
      throw new NotFoundException(`Support ticket with ID ${id} not found.`);
    }

    const createdFormatted = t.createdAt.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });

    return {
      id: t.id,
      ticket: t.ticketNumber,
      ticketNumber: t.ticketNumber,
      subject: t.subject,
      description: t.description,
      status: this.formatStatusBadge(t.status),
      rawStatus: t.status,
      priority: t.priority,
      requestedBy: t.user.name,
      customer: t.user,
      created: createdFormatted,
      createdAt: t.createdAt,
      updatedAt: t.updatedAt,
      messages: t.messages,
    };
  }

  async updateTicket(id: string, dto: UpdateSupportTicketDto) {
    const payload: UpdateSupportTicketDto = (dto as any).data || dto;
    const existing = await this.prisma.supportTicket.findUnique({ where: { id } });
    if (!existing) {
      throw new NotFoundException(`Support ticket with ID ${id} not found.`);
    }

    const updated = await this.prisma.supportTicket.update({
      where: { id },
      data: {
        status: payload.status ? this.normalizeStatus(payload.status) : existing.status,
        priority: payload.priority ? this.normalizePriority(payload.priority) : existing.priority,
        subject: payload.subject ?? existing.subject,
        description: payload.description ?? existing.description,
      },
    });

    return this.getTicketById(updated.id);
  }

  async replyTicket(adminUserId: string, ticketId: string, dto: AdminReplyTicketDto) {
    const payload: AdminReplyTicketDto = (dto as any).data || dto;
    const existing = await this.prisma.supportTicket.findUnique({ where: { id: ticketId } });
    if (!existing) {
      throw new NotFoundException(`Support ticket with ID ${ticketId} not found.`);
    }

    const newMsg = await this.prisma.supportTicketMessage.create({
      data: {
        ticketId,
        senderId: adminUserId,
        senderRole: 'ADMIN',
        message: payload.message,
      },
    });

    await this.prisma.supportTicket.update({
      where: { id: ticketId },
      data: { updatedAt: new Date() },
    });

    return newMsg;
  }

  async deleteTicket(id: string) {
    const existing = await this.prisma.supportTicket.findUnique({ where: { id } });
    if (!existing) {
      throw new NotFoundException(`Support ticket with ID ${id} not found.`);
    }

    await this.prisma.supportTicket.delete({ where: { id } });
    return {
      message: `Support ticket ${existing.ticketNumber} deleted successfully.`,
      id,
    };
  }

  // --- FAQS ---

  async getFaqs() {
    let items = await this.prisma.faqItem.findMany({
      orderBy: { sortOrder: 'asc' },
    });

    if (items.length === 0) {
      await this.prisma.faqItem.createMany({
        data: DEFAULT_FAQS,
      });

      items = await this.prisma.faqItem.findMany({
        orderBy: { sortOrder: 'asc' },
      });
    }

    return items;
  }

  async createFaq(dto: CreateFaqItemDto) {
    const payload: CreateFaqItemDto = (dto as any).data || dto;
    const faq = await this.prisma.faqItem.create({
      data: {
        question: payload.question,
        answer: payload.answer,
        page: (payload.page || 'MEMBERSHIP') as any,
        sortOrder: payload.sortOrder || 0,
      },
    });

    return faq;
  }

  async updateFaq(id: string, dto: UpdateFaqItemDto) {
    const payload: UpdateFaqItemDto = (dto as any).data || dto;
    const existing = await this.prisma.faqItem.findUnique({ where: { id } });
    if (!existing) {
      throw new NotFoundException(`FAQ with ID ${id} not found.`);
    }

    const updated = await this.prisma.faqItem.update({
      where: { id },
      data: {
        question: payload.question ?? existing.question,
        answer: payload.answer ?? existing.answer,
        page: payload.page ? (payload.page as any) : existing.page,
        sortOrder: payload.sortOrder ?? existing.sortOrder,
      },
    });

    return updated;
  }

  async deleteFaq(id: string) {
    const existing = await this.prisma.faqItem.findUnique({ where: { id } });
    if (!existing) {
      throw new NotFoundException(`FAQ with ID ${id} not found.`);
    }

    await this.prisma.faqItem.delete({ where: { id } });
    return {
      message: `FAQ deleted successfully.`,
      id,
    };
  }
}
