import {
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { MailService } from '../../mail/mail.service';
import {
  AdminReplyTicketDto,
  AdminTicketQueryDto,
  CreateFaqItemDto,
  UpdateFaqItemDto,
  UpdateSupportTicketDto,
} from './dto/admin-support.dto';


@Injectable()
export class AdminSupportService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly mailService: MailService,
  ) {}

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
        { name: { contains: s, mode: 'insensitive' } },
        { email: { contains: s, mode: 'insensitive' } },
        { phoneNumber: { contains: s, mode: 'insensitive' } },
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

      const memberName = t.name || t.user?.name || 'Guest User';
      const memberEmail = t.email || t.user?.email || null;

      return {
        id: t.id,
        ticket: t.ticketNumber,
        ticketNumber: t.ticketNumber,
        member: {
          id: t.user?.id || null,
          name: memberName,
          email: memberEmail,
          phoneNumber: t.phoneNumber || null,
          avatar: t.user?.avatarPath || null,
        },
        name: memberName,
        email: memberEmail,
        phoneNumber: t.phoneNumber || null,
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

    const memberName = t.name || t.user?.name || 'Guest User';
    const memberEmail = t.email || t.user?.email || null;

    return {
      id: t.id,
      ticket: t.ticketNumber,
      ticketNumber: t.ticketNumber,
      name: memberName,
      email: memberEmail,
      phoneNumber: t.phoneNumber || null,
      subject: t.subject,
      description: t.description,
      status: this.formatStatusBadge(t.status),
      rawStatus: t.status,
      priority: t.priority,
      requestedBy: memberName,
      customer: t.user || {
        id: null,
        name: memberName,
        email: memberEmail,
        phoneNumber: t.phoneNumber || null,
        avatarPath: null,
      },
      created: createdFormatted,
      messages: t.messages.map((m) => ({
        id: m.id,
        senderId: m.senderId,
        senderName: m.sender?.name || (m.senderRole === 'ADMIN' ? 'Admin Support' : memberName),
        senderRole: m.senderRole,
        message: m.message,
        createdAt: m.createdAt,
      })),
    };
  }

  async updateTicket(id: string, dto: UpdateSupportTicketDto) {
    const payload: UpdateSupportTicketDto = (dto as any).data || dto;
    const existing = await this.prisma.supportTicket.findUnique({
      where: { id },
      include: { user: true },
    });
    if (!existing) {
      throw new NotFoundException(`Support ticket with ID ${id} not found.`);
    }

    const newStatus = payload.status ? this.normalizeStatus(payload.status) : existing.status;
    const newPriority = payload.priority ? this.normalizePriority(payload.priority) : existing.priority;

    const updated = await this.prisma.supportTicket.update({
      where: { id },
      data: {
        status: newStatus,
        priority: newPriority,
      },
      include: { user: true },
    });

    const recipientEmail =
      (payload as any).email ||
      existing.email ||
      existing.user?.email;

    const recipientName =
      existing.name ||
      existing.user?.name ||
      'Valued Customer';

    const formattedStatus = this.formatStatusBadge(updated.status);

    if (recipientEmail) {
      this.mailService
        .sendSupportStatusUpdateEmail(
          recipientEmail,
          recipientName,
          updated.ticketNumber,
          formattedStatus,
          updated.subject,
        )
        .catch(() => {});
    }

    // Dynamic DB Notification creation
    await this.prisma.notification.create({
      data: {
        userId: existing.userId || null,
        title: `Ticket Updated: ${updated.ticketNumber}`,
        message: `Status set to ${formattedStatus} for subject "${updated.subject}".`,
        type: 'TICKET',
        link: existing.userId ? '/dashboard' : '/admin/support',
        isRead: false,
      },
    }).catch(() => {});

    return this.getTicketById(updated.id);
  }

  async replyTicket(adminUserId: string, ticketId: string, dto: AdminReplyTicketDto) {
    const payload: AdminReplyTicketDto = (dto as any).data || dto;
    const existing = await this.prisma.supportTicket.findUnique({
      where: { id: ticketId },
      include: { user: true },
    });
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

    const recipientEmail =
      (payload as any).email ||
      existing.email ||
      existing.user?.email;

    const recipientName =
      existing.name ||
      existing.user?.name ||
      'Valued Customer';

    if (recipientEmail) {
      this.mailService
        .sendSupportReplyEmail(
          recipientEmail,
          recipientName,
          existing.ticketNumber,
          payload.message,
          existing.subject,
        )
        .catch(() => {});
    }

    // Dynamic DB Notification creation
    await this.prisma.notification.create({
      data: {
        userId: existing.userId || null,
        title: `New Reply on Ticket: ${existing.ticketNumber}`,
        message: `Response: "${payload.message.slice(0, 80)}"`,
        type: 'TICKET',
        link: existing.userId ? '/dashboard' : '/admin/support',
        isRead: false,
      },
    }).catch(() => {});

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
    return this.prisma.faqItem.findMany({
      orderBy: { sortOrder: 'asc' },
    });
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
