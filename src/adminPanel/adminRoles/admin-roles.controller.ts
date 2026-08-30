import {
  Body,
  Controller,
  Get,
  Param,
  Patch,
  Put,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { Public } from '../../common/decorators/public.decorator';
import { Roles } from '../../common/decorators/roles.decorator';
import { Role } from '../../common/enums/role.enum';
import { AdminRolesService } from './admin-roles.service';
import {
  UpdatePermissionMatrixDto,
  UpdateRolePermissionDto,
} from './dto/admin-roles.dto';

@ApiTags('Admin Roles & Permissions')
@ApiBearerAuth()
@Roles(Role.ADMIN)
@Controller('admin')
export class AdminRolesController {
  constructor(private readonly adminRolesService: AdminRolesService) {}

  @Public()
  @Get(['roles-permissions/public', 'roles/public'])
  @ApiOperation({
    summary: 'Public endpoint to read current role permissions',
  })
  getPublicPermissions() {
    return this.adminRolesService.getPermissions();
  }

  @Get(['roles-permissions', 'roles', 'permissions'])
  @ApiOperation({
    summary:
      'Get complete role and permissions access matrix (Public Visitor, Free Member, Premium Member)',
  })
  getPermissions() {
    return this.adminRolesService.getPermissions();
  }

  @Patch(['roles-permissions/:idOrKey', 'roles/:idOrKey'])
  @ApiOperation({
    summary: 'Update single permission row toggle state',
  })
  updatePermission(
    @Param('idOrKey') idOrKey: string,
    @Body() dto: UpdateRolePermissionDto,
  ) {
    return this.adminRolesService.updatePermission(idOrKey, dto);
  }

  @Patch(['roles-permissions', 'roles'])
  @Put(['roles-permissions', 'roles'])
  @ApiOperation({
    summary: 'Update entire role permission matrix',
  })
  updatePermissionMatrix(@Body() dto: UpdatePermissionMatrixDto) {
    return this.adminRolesService.updatePermissionMatrix(dto);
  }
}
