import { Module } from '@nestjs/common';
import { PrismaModule } from '../../prisma/prisma.module';
import { UploadsModule } from '../../uploads/uploads.module';
import { AdminAnnouncementController } from './admin-announcement.controller';
import { AdminAnnouncementService } from './admin-announcement.service';

@Module({
  imports: [PrismaModule, UploadsModule],
  controllers: [AdminAnnouncementController],
  providers: [AdminAnnouncementService],
  exports: [AdminAnnouncementService],
})
export class AdminAnnouncementModule {}
