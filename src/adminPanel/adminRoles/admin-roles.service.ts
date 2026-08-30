import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import {
  UpdatePermissionMatrixDto,
  UpdateRolePermissionDto,
} from './dto/admin-roles.dto';

const DEFAULT_PERMISSIONS = [
  {
    key: 'view_free_content',
    name: 'View Free content',
    publicVisitor: false,
    freeMember: true,
    premiumMember: true,
    sortOrder: 1,
  },
  {
    key: 'view_research_library',
    name: 'View Research Library',
    publicVisitor: false,
    freeMember: false,
    premiumMember: true,
    sortOrder: 2,
  },
  {
    key: 'post_comments',
    name: 'Post Comments',
    publicVisitor: false,
    freeMember: true,
    premiumMember: true,
    sortOrder: 3,
  },
  {
    key: 'download_free_resources',
    name: 'Download Free Resources',
    publicVisitor: false,
    freeMember: true,
    premiumMember: true,
    sortOrder: 4,
  },
  {
    key: 'download_premium_resources',
    name: 'Download Premium Resources',
    publicVisitor: false,
    freeMember: false,
    premiumMember: true,
    sortOrder: 5,
  },
];

@Injectable()
export class AdminRolesService {
  constructor(private readonly prisma: PrismaService) {}

  async getPermissions() {
    let items = await this.prisma.rolePermission.findMany({
      orderBy: { sortOrder: 'asc' },
    });

    if (items.length === 0) {
      // Seed default permission matrix matching the UI design
      await this.prisma.rolePermission.createMany({
        data: DEFAULT_PERMISSIONS,
      });

      items = await this.prisma.rolePermission.findMany({
        orderBy: { sortOrder: 'asc' },
      });
    }

    return items.map((p) => ({
      id: p.id,
      key: p.key,
      permission: p.name,
      name: p.name,
      publicVisitor: p.publicVisitor,
      freeMember: p.freeMember,
      premiumMember: p.premiumMember,
    }));
  }

  async updatePermission(idOrKey: string, dto: UpdateRolePermissionDto) {
    await this.getPermissions(); // Ensure seeded

    const payload: UpdateRolePermissionDto = (dto as any).data || dto;

    const permission = await this.prisma.rolePermission.findFirst({
      where: {
        OR: [{ id: idOrKey }, { key: idOrKey }],
      },
    });

    if (!permission) {
      throw new NotFoundException(`Permission entry ${idOrKey} not found.`);
    }

    const updated = await this.prisma.rolePermission.update({
      where: { id: permission.id },
      data: {
        publicVisitor:
          payload.publicVisitor !== undefined
            ? payload.publicVisitor
            : permission.publicVisitor,
        freeMember:
          payload.freeMember !== undefined
            ? payload.freeMember
            : permission.freeMember,
        premiumMember:
          payload.premiumMember !== undefined
            ? payload.premiumMember
            : permission.premiumMember,
      },
    });

    return {
      id: updated.id,
      key: updated.key,
      permission: updated.name,
      name: updated.name,
      publicVisitor: updated.publicVisitor,
      freeMember: updated.freeMember,
      premiumMember: updated.premiumMember,
    };
  }

  async updatePermissionMatrix(dto: UpdatePermissionMatrixDto) {
    await this.getPermissions(); // Ensure seeded

    const payload = (dto as any).permissions || (dto as any).data || dto;
    const items = Array.isArray(payload) ? payload : (payload.permissions || []);

    const updatedResults: any[] = [];
    for (const item of items) {
      const existing = await this.prisma.rolePermission.findFirst({
        where: {
          OR: [{ id: item.id || '' }, { key: item.key }],
        },
      });

      if (existing) {
        const res = await this.prisma.rolePermission.update({
          where: { id: existing.id },
          data: {
            publicVisitor: item.publicVisitor ?? existing.publicVisitor,
            freeMember: item.freeMember ?? existing.freeMember,
            premiumMember: item.premiumMember ?? existing.premiumMember,
          },
        });
        updatedResults.push(res);
      }
    }

    return this.getPermissions();
  }
}
