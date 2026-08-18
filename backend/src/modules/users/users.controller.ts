import {
  Body,
  Controller,
  Get,
  Param,
  ParseIntPipe,
  Patch,
  Post,
  UseGuards,
} from '@nestjs/common';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { Roles } from '../../common/decorators/roles.decorator';
import { RoleName } from '../../common/enums/role.enum';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { AuthUser } from '../../common/types/auth-user.type';
import {
  ChangePasswordDto,
  CreateUserDto,
  ResetPasswordDto,
  UpdateUserDto,
} from './dto/user.dto';
import { UsersService } from './users.service';

@Controller('users')
@UseGuards(JwtAuthGuard, RolesGuard)
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @Get()
  @Roles(RoleName.OWNER, RoleName.ADMIN)
  findAll() {
    return this.usersService.findAll();
  }

  @Get('roles')
  @Roles(RoleName.OWNER, RoleName.ADMIN)
  getRoles() {
    return this.usersService.getRoles();
  }

  @Get(':id')
  @Roles(RoleName.OWNER, RoleName.ADMIN)
  findOne(@Param('id', ParseIntPipe) id: number) {
    return this.usersService.findOne(id);
  }

  @Post()
  @Roles(RoleName.OWNER, RoleName.ADMIN)
  create(@Body() dto: CreateUserDto) {
    return this.usersService.create(dto);
  }

  @Patch(':id')
  @Roles(RoleName.OWNER, RoleName.ADMIN)
  update(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateUserDto,
  ) {
    return this.usersService.update(id, dto);
  }

  @Post(':id/change-password')
  @Roles(RoleName.OWNER, RoleName.ADMIN, RoleName.CASHIER, RoleName.INVENTORY, RoleName.SUPERVISOR)
  changePassword(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: ChangePasswordDto,
    @CurrentUser() user: AuthUser,
  ) {
    if (user.id !== id && user.role !== RoleName.OWNER && user.role !== RoleName.ADMIN) {
      throw new Error('You can only change your own password');
    }
    return this.usersService.changePassword(id, dto.currentPassword, dto.newPassword);
  }

  @Post(':id/reset-password')
  @Roles(RoleName.OWNER, RoleName.ADMIN)
  resetPassword(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: ResetPasswordDto,
  ) {
    return this.usersService.resetPassword(id, dto.newPassword);
  }
}
