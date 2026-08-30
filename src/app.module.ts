import { Module } from '@nestjs/common';
import { APP_GUARD } from '@nestjs/core';
import { ConfigModule } from '@nestjs/config';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { envValidationSchema } from './config/env.validation';
import { JwtAuthGuard } from './common/guards/jwt-auth.guard';
import { RolesGuard } from './common/guards/roles.guard';
import { AuthModule } from './auth/auth.module';
import { PrismaModule } from './prisma/prisma.module';
import { BillingModule } from './billing/billing.module';
import { AnnouncementsModule } from './announcements/announcements.module';
import { AdminModule } from './admin/admin.module';
import { AdminDashboardModule } from './adminPanel/adminDashboard/admin-dashboard.module';
import { AdminMemberModule } from './adminPanel/adminMember/admin-member.module';
import { AdminContentModule } from './adminPanel/adminContent/admin-content.module';
import { AdminAnnouncementModule } from './adminPanel/adminAnnouncement/admin-announcement.module';
import { AdminRolesModule } from './adminPanel/adminRoles/admin-roles.module';
import { AdminSupportModule } from './adminPanel/adminSupport/admin-support.module';
import { AdminSettingsModule } from './adminPanel/adminSettings/admin-settings.module';
import { AdminMembershipModule } from './adminPanel/adminMembership/admin-membership.module';
import { MailModule } from './mail/mail.module';
import { SupportModule } from './support/support.module';
import { ArticlesModule } from './articles/articles.module';
import { ContactsModule } from './contacts/contacts.module';
import { DashboardModule } from './dashboard/dashboard.module';
import { MembershipsModule } from './memberships/memberships.module';
import { ResourcesModule } from './resources/resources.module';
import { SettingsModule } from './settings/settings.module';
import { UploadsModule } from './uploads/uploads.module';
import { UsersModule } from './users/users.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      validationSchema: envValidationSchema,
    }),
    PrismaModule,
    MailModule,
    AuthModule,
    UsersModule,
    MembershipsModule,
    BillingModule,
    ResourcesModule,
    ArticlesModule,
    AnnouncementsModule,
    DashboardModule,
    ContactsModule,
    SettingsModule,
    UploadsModule,
    SupportModule,
    AdminModule,
    AdminDashboardModule,
    AdminMemberModule,
    AdminContentModule,
    AdminAnnouncementModule,
    AdminRolesModule,
    AdminSupportModule,
    AdminSettingsModule,
    AdminMembershipModule,
  ],
  controllers: [AppController],
  providers: [
    AppService,
    {
      provide: APP_GUARD,
      useClass: JwtAuthGuard,
    },
    {
      provide: APP_GUARD,
      useClass: RolesGuard,
    },
  ],
})
export class AppModule {}
