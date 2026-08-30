import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateSupportTicketDto } from './dto/support.dto';

@Injectable()
export class SupportService {
  constructor(private readonly prisma: PrismaService) {}

  private generateTicketNumber(): string {
    const random = Math.floor(1000 + Math.random() * 9000);
    return `T-${random}`;
  }

  async createTicket(userId: string, dto: CreateSupportTicketDto) {
    const ticketNumber = this.generateTicketNumber();
    const priorityNorm = String(dto.priority || 'MEDIUM').toUpperCase();

    let validPriority: 'LOW' | 'MEDIUM' | 'HIGH' | 'URGENT' = 'MEDIUM';
    if (['LOW', 'MEDIUM', 'HIGH', 'URGENT'].includes(priorityNorm)) {
      validPriority = priorityNorm as any;
    }

    const ticket = await this.prisma.supportTicket.create({
      data: {
        ticketNumber,
        subject: dto.subject,
        description: dto.description,
        priority: validPriority,
        status: 'OPEN',
        userId,
      },
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
    });

    return ticket;
  }

  async getUserTickets(userId: string) {
    const tickets = await this.prisma.supportTicket.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
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
        },
      },
    });

    return tickets.map((t) => ({
      id: t.id,
      ticket: t.ticketNumber,
      ticketNumber: t.ticketNumber,
      subject: t.subject,
      description: t.description,
      status: t.status === 'OPEN' ? 'Opened' : t.status === 'IN_PROGRESS' ? 'In progress' : 'Resolved',
      priority: t.priority,
      createdAt: t.createdAt,
      lastUpdated: t.updatedAt,
      user: t.user,
      messageCount: t.messages.length,
    }));
  }

  async getTicketById(userId: string, ticketId: string) {
    const ticket = await this.prisma.supportTicket.findFirst({
      where: {
        id: ticketId,
        userId,
      },
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

    if (!ticket) {
      throw new NotFoundException(`Support ticket with ID ${ticketId} not found.`);
    }

    return ticket;
  }

  async addTicketMessage(userId: string, ticketId: string, message: string) {
    const ticket = await this.prisma.supportTicket.findFirst({
      where: {
        id: ticketId,
        userId,
      },
    });

    if (!ticket) {
      throw new NotFoundException(`Support ticket with ID ${ticketId} not found.`);
    }

    const user = await this.prisma.user.findUnique({ where: { id: userId } });

    const newMsg = await this.prisma.supportTicketMessage.create({
      data: {
        ticketId,
        senderId: userId,
        senderRole: user?.role || 'MEMBER',
        message,
      },
    });

    await this.prisma.supportTicket.update({
      where: { id: ticketId },
      data: { updatedAt: new Date() },
    });

    return newMsg;
  }
}
