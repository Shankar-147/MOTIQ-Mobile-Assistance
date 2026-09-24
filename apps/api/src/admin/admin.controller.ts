import { Body, Controller, Get, Param, Patch } from '@nestjs/common';
import { AdminUsersService } from './admin-users.service';
import { UpdateUserStatusDto } from './dto/update-user-status.dto';

// TODO: guard this whole controller behind an admin-role check once
// roles exist on the JWT payload — right now anyone with a valid
// session token can hit these routes.
@Controller('admin/users')
export class AdminController {
  constructor(private readonly adminUsersService: AdminUsersService) {}

  @Get()
  findAll() {
    return this.adminUsersService.findAll();
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.adminUsersService.findOne(id);
  }

  @Patch(':id/status')
  updateStatus(@Param('id') id: string, @Body() dto: UpdateUserStatusDto) {
    return this.adminUsersService.updateStatus(id, dto.status);
  }
}
