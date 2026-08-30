import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Query,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { Roles } from '../../common/decorators/roles.decorator';
import { Role } from '../../common/enums/role.enum';
import { AdminMemberService } from './admin-member.service';
import {
  AdminMemberQueryDto,
  CreateMemberDto,
  UpdateMemberDto,
  UpdateMemberStatusDto,
} from './dto/admin-member.dto';

@ApiTags('Admin Members')
@ApiBearerAuth()
@Roles(Role.ADMIN)
@Controller('admin/members')
export class AdminMemberController {
  constructor(private readonly adminMemberService: AdminMemberService) {}

  @Get()
  @ApiOperation({
    summary:
      'Get paginated member list with status counts, search filter, and sorting',
  })
  getMembers(@Query() query: AdminMemberQueryDto) {
    return this.adminMemberService.getMembers(query);
  }

  @Get(':id')
  @ApiOperation({
    summary:
      'Get detailed profile, stats, membership info, recent downloads, and comments for a member',
  })
  getMemberById(@Param('id') id: string) {
    return this.adminMemberService.getMemberById(id);
  }

  @Post()
  @ApiOperation({ summary: 'Create or add a new community member user' })
  createMember(@Body() dto: CreateMemberDto) {
    return this.adminMemberService.createMember(dto);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Update member profile details' })
  updateMember(@Param('id') id: string, @Body() dto: UpdateMemberDto) {
    return this.adminMemberService.updateMember(id, dto);
  }

  @Patch(':id/status')
  @ApiOperation({ summary: 'Suspend or reactivate a member status' })
  updateMemberStatus(
    @Param('id') id: string,
    @Body() dto: UpdateMemberStatusDto,
  ) {
    return this.adminMemberService.updateMemberStatus(id, dto);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Permanently delete a member account' })
  deleteMember(@Param('id') id: string) {
    return this.adminMemberService.deleteMember(id);
  }
}
