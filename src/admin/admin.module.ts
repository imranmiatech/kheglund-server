import { Module } from '@nestjs/common';
import { AdminController } from './admin.controller';
import { AdminService } from './admin.service';
import { PrismaModule } from '../prisma/prisma.module';
import { UploadsModule } from '../uploads/uploads.module';
import { MembershipsModule } from '../memberships/memberships.module';
import { ContactsModule } from '../contacts/contacts.module';

@Module({
  imports: [
    PrismaModule,
    UploadsModule,
    MembershipsModule,
    ContactsModule,
  ],
  controllers: [AdminController],
  providers: [AdminService],
})
export class AdminModule {}
