import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import * as bcrypt from 'bcrypt';
import { PrismaService } from '../prisma/prisma.service';
import { UploadsService } from '../uploads/uploads.service';
import { ChangePasswordDto, UpdateProfileDto } from './dto/users.dto';

@Injectable()
export class UsersService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly uploadsService: UploadsService,
  ) {}

  getProfile(userId: string) {
    return this.prisma.user.findFirstOrThrow({
      where: { id: userId, deletedAt: null },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        avatarPath: true,
        avatarMimeType: true,
        avatarFileSizeBytes: true,
        createdAt: true,
      },
    });
  }

  async updateProfile(userId: string, dto: UpdateProfileDto) {
    const existingUser = await this.prisma.user.findFirst({
      where: {
        email: dto.email.toLowerCase(),
        id: { not: userId },
        deletedAt: null,
      },
    });

    if (existingUser) {
      throw new BadRequestException('Email is already in use.');
    }

    const user = await this.prisma.user.update({
      where: { id: userId },
      data: {
        name: dto.name,
        email: dto.email.toLowerCase(),
      },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        avatarPath: true,
      },
    });

    await this.prisma.dashboardActivity.create({
      data: {
        userId,
        type: 'PROFILE_UPDATED',
        title: 'Profile updated',
        description: 'Profile information was updated.',
      },
    });

    return user;
  }

  async uploadAvatar(userId: string, file: Express.Multer.File) {
    if (!file) {
      throw new BadRequestException('Avatar file is required.');
    }

    const uploadedFile = await this.uploadsService.saveFile(
      file,
      'AVATAR',
      userId,
    );

    return this.prisma.user.update({
      where: { id: userId },
      data: {
        avatarPath: uploadedFile.storagePath,
        avatarMimeType: uploadedFile.mimeType,
        avatarFileSizeBytes: uploadedFile.sizeBytes,
      },
      select: {
        id: true,
        name: true,
        email: true,
        avatarPath: true,
        avatarMimeType: true,
        avatarFileSizeBytes: true,
      },
    });
  }

  async changePassword(userId: string, dto: ChangePasswordDto) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
    });

    if (!user) {
      throw new NotFoundException('User not found.');
    }

    const passwordMatches = await bcrypt.compare(
      dto.currentPassword,
      user.passwordHash,
    );

    if (!passwordMatches) {
      throw new BadRequestException('Current password is incorrect.');
    }

    const passwordHash = await bcrypt.hash(dto.newPassword, 10);

    await this.prisma.user.update({
      where: { id: userId },
      data: { passwordHash },
    });

    await this.prisma.session.updateMany({
      where: { userId, revokedAt: null },
      data: { revokedAt: new Date() },
    });

    return { message: 'Password updated successfully.' };
  }

  async deleteAccount(userId: string, reason?: string) {
    await this.prisma.$transaction([
      this.prisma.dashboardActivity.create({
        data: {
          userId,
          type: 'PROFILE_UPDATED',
          title: 'Account deletion requested',
          description: reason ?? 'User requested account deletion.',
        },
      }),
      this.prisma.user.update({
        where: { id: userId },
        data: {
          isActive: false,
          deletedAt: new Date(),
        },
      }),
      this.prisma.session.updateMany({
        where: { userId, revokedAt: null },
        data: { revokedAt: new Date() },
      }),
    ]);

    return { message: 'Account deleted successfully.' };
  }
}
