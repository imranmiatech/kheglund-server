import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class NotificationsService {
  constructor(private readonly prisma: PrismaService) {}

  async getUserNotifications(userId?: string, userRole?: string) {
    let role = userRole ? String(userRole).toUpperCase() : null;
    if (userId && !role) {
      const dbUser = await this.prisma.user.findUnique({
        where: { id: userId },
        select: { role: true },
      });
      role = dbUser?.role ? String(dbUser.role).toUpperCase() : 'MEMBER';
    }

    const isAdmin = role === 'ADMIN';

    const adminOnlyTypes = ['USER_JOIN', 'COMMENT', 'CONTACT_SUBMISSION', 'ADMIN_ALERT', 'ADMIN_TICKET'];
    const memberBroadcastTypes = ['ANNOUNCEMENT', 'INFO', 'SYSTEM', 'RESOURCE', 'ARTICLE'];
    const adminBroadcastTypes = ['USER_JOIN', 'PAYMENT', 'TICKET', 'ADMIN_TICKET', 'COMMENT', 'CONTACT_SUBMISSION', 'ADMIN_ALERT', 'SYSTEM'];

    let where: any = {};
    if (isAdmin) {
      if (userId) {
        where = {
          OR: [
            { userId },
            {
              userId: null,
              type: { in: adminBroadcastTypes },
            },
          ],
        };
      } else {
        where = {
          userId: null,
          type: { in: adminBroadcastTypes },
        };
      }
    } else if (userId) {
      where = {
        OR: [
          { userId },
          {
            userId: null,
            type: { in: memberBroadcastTypes },
          },
        ],
        NOT: {
          type: { in: adminOnlyTypes },
        },
      };
    } else {
      where = {
        userId: null,
        type: { in: memberBroadcastTypes },
      };
    }

    let notifications = await this.prisma.notification.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      take: 30,
    });

    if (notifications.length === 0) {
      const seedItems = isAdmin
        ? [
            {
              userId: userId || null,
              title: 'Admin Control Center Active',
              message: 'You have full administrative access to manage members, content, and system alerts.',
              type: 'ADMIN_ALERT',
              link: '/admin',
              isRead: false,
            },
            {
              userId: null,
              title: 'Member Registrations Monitored',
              message: 'New user signups and plan upgrades will appear in this feed.',
              type: 'USER_JOIN',
              link: '/admin/member',
              isRead: false,
            },
            {
              userId: null,
              title: 'Support Queue Ready',
              message: 'Support tickets submitted by users are logged here for quick resolution.',
              type: 'ADMIN_TICKET',
              link: '/admin/support',
              isRead: false,
            },
          ]
        : [
            {
              userId: userId || null,
              title: 'Welcome to Kheglund Platform',
              message: 'Explore our latest research resources, announcements, and masterclasses.',
              type: 'INFO',
              link: '/dashboard',
              isRead: false,
            },
            {
              userId: userId || null,
              title: 'Support System Active',
              message: 'You can submit support requests directly from our contact page.',
              type: 'SYSTEM',
              link: '/contact',
              isRead: false,
            },
            {
              userId: userId || null,
              title: 'New Announcement Published',
              message: 'Check out community updates in the announcement section.',
              type: 'ANNOUNCEMENT',
              link: '/dashboard/announcement-blogs',
              isRead: false,
            },
          ];

      await this.prisma.notification.createMany({
        data: seedItems,
      });

      notifications = await this.prisma.notification.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        take: 30,
      });
    }

    const unreadCount = notifications.filter((n) => !n.isRead).length;

    return {
      unreadCount,
      data: notifications,
    };
  }

  async getUnreadCount(userId?: string, userRole?: string) {
    let role = userRole ? String(userRole).toUpperCase() : null;
    if (userId && !role) {
      const dbUser = await this.prisma.user.findUnique({
        where: { id: userId },
        select: { role: true },
      });
      role = dbUser?.role ? String(dbUser.role).toUpperCase() : 'MEMBER';
    }

    const isAdmin = role === 'ADMIN';
    const adminOnlyTypes = ['USER_JOIN', 'COMMENT', 'CONTACT_SUBMISSION', 'ADMIN_ALERT', 'ADMIN_TICKET'];
    const memberBroadcastTypes = ['ANNOUNCEMENT', 'INFO', 'SYSTEM', 'RESOURCE', 'ARTICLE'];
    const adminBroadcastTypes = ['USER_JOIN', 'PAYMENT', 'TICKET', 'ADMIN_TICKET', 'COMMENT', 'CONTACT_SUBMISSION', 'ADMIN_ALERT', 'SYSTEM'];

    let where: any = { isRead: false };
    if (isAdmin) {
      if (userId) {
        where = {
          isRead: false,
          OR: [
            { userId },
            {
              userId: null,
              type: { in: adminBroadcastTypes },
            },
          ],
        };
      } else {
        where = {
          isRead: false,
          userId: null,
          type: { in: adminBroadcastTypes },
        };
      }
    } else if (userId) {
      where = {
        isRead: false,
        OR: [
          { userId },
          {
            userId: null,
            type: { in: memberBroadcastTypes },
          },
        ],
        NOT: {
          type: { in: adminOnlyTypes },
        },
      };
    } else {
      where = {
        isRead: false,
        userId: null,
        type: { in: memberBroadcastTypes },
      };
    }

    const unreadCount = await this.prisma.notification.count({ where });
    return { unreadCount };
  }

  async markAsRead(id: string, _userId?: string) {
    const existing = await this.prisma.notification.findUnique({ where: { id } });
    if (!existing) {
      throw new NotFoundException(`Notification with ID ${id} not found.`);
    }

    return this.prisma.notification.update({
      where: { id },
      data: { isRead: true },
    });
  }

  async markAllAsRead(userId?: string, userRole?: string) {
    let role = userRole ? String(userRole).toUpperCase() : null;
    if (userId && !role) {
      const dbUser = await this.prisma.user.findUnique({
        where: { id: userId },
        select: { role: true },
      });
      role = dbUser?.role ? String(dbUser.role).toUpperCase() : 'MEMBER';
    }

    const isAdmin = role === 'ADMIN';
    const adminOnlyTypes = ['USER_JOIN', 'COMMENT', 'CONTACT_SUBMISSION', 'ADMIN_ALERT', 'ADMIN_TICKET'];
    const memberBroadcastTypes = ['ANNOUNCEMENT', 'INFO', 'SYSTEM', 'RESOURCE', 'ARTICLE'];
    const adminBroadcastTypes = ['USER_JOIN', 'PAYMENT', 'TICKET', 'ADMIN_TICKET', 'COMMENT', 'CONTACT_SUBMISSION', 'ADMIN_ALERT', 'SYSTEM'];

    let where: any = {};
    if (isAdmin) {
      if (userId) {
        where = {
          OR: [
            { userId },
            {
              userId: null,
              type: { in: adminBroadcastTypes },
            },
          ],
        };
      } else {
        where = {
          userId: null,
          type: { in: adminBroadcastTypes },
        };
      }
    } else if (userId) {
      where = {
        OR: [
          { userId },
          {
            userId: null,
            type: { in: memberBroadcastTypes },
          },
        ],
        NOT: {
          type: { in: adminOnlyTypes },
        },
      };
    } else {
      where = {
        userId: null,
        type: { in: memberBroadcastTypes },
      };
    }

    await this.prisma.notification.updateMany({
      where,
      data: { isRead: true },
    });

    return { success: true, message: 'All notifications marked as read.' };
  }

  async deleteNotification(id: string, _userId?: string) {
    const existing = await this.prisma.notification.findUnique({ where: { id } });
    if (!existing) {
      throw new NotFoundException(`Notification with ID ${id} not found.`);
    }

    await this.prisma.notification.delete({
      where: { id },
    });

    return { success: true, message: 'Notification deleted successfully.' };
  }

  async clearAllNotifications(userId?: string, userRole?: string) {
    let role = userRole ? String(userRole).toUpperCase() : null;
    if (userId && !role) {
      const dbUser = await this.prisma.user.findUnique({
        where: { id: userId },
        select: { role: true },
      });
      role = dbUser?.role ? String(dbUser.role).toUpperCase() : 'MEMBER';
    }

    const isAdmin = role === 'ADMIN';
    const adminOnlyTypes = ['USER_JOIN', 'COMMENT', 'CONTACT_SUBMISSION', 'ADMIN_ALERT', 'ADMIN_TICKET'];
    const memberBroadcastTypes = ['ANNOUNCEMENT', 'INFO', 'SYSTEM', 'RESOURCE', 'ARTICLE'];
    const adminBroadcastTypes = ['USER_JOIN', 'PAYMENT', 'TICKET', 'ADMIN_TICKET', 'COMMENT', 'CONTACT_SUBMISSION', 'ADMIN_ALERT', 'SYSTEM'];

    let where: any = {};
    if (isAdmin) {
      if (userId) {
        where = {
          OR: [
            { userId },
            {
              userId: null,
              type: { in: adminBroadcastTypes },
            },
          ],
        };
      } else {
        where = {
          userId: null,
          type: { in: adminBroadcastTypes },
        };
      }
    } else if (userId) {
      where = {
        OR: [
          { userId },
          {
            userId: null,
            type: { in: memberBroadcastTypes },
          },
        ],
        NOT: {
          type: { in: adminOnlyTypes },
        },
      };
    } else {
      where = {
        userId: null,
        type: { in: memberBroadcastTypes },
      };
    }

    await this.prisma.notification.deleteMany({
      where,
    });

    return { success: true, message: 'All notifications cleared successfully.' };
  }
}
