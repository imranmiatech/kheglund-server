import { Module } from '@nestjs/common';
import { PrismaModule } from '../../prisma/prisma.module';
import { AdminMemberController } from './admin-member.controller';
import { AdminMemberService } from './admin-member.service';

@Module({
  imports: [PrismaModule],
  controllers: [AdminMemberController],
  providers: [AdminMemberService],
  exports: [AdminMemberService],
})
export class AdminMemberModule {}
