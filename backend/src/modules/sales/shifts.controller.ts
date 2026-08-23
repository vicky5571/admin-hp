import {
  Body,
  Controller,
  Get,
  Param,
  ParseIntPipe,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { Roles } from '../../common/decorators/roles.decorator';
import { RoleName } from '../../common/enums/role.enum';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { AuthUser } from '../../common/types/auth-user.type';
import {
  CashMovementDto,
  CloseShiftDto,
  ListShiftsQueryDto,
  OpenShiftDto,
} from './dto/shift.dto';
import { ShiftsService } from './shifts.service';

@Controller('sales/shifts')
@UseGuards(JwtAuthGuard, RolesGuard)
export class ShiftsController {
  constructor(private readonly shiftsService: ShiftsService) {}

  @Get('current')
  @Roles(RoleName.OWNER, RoleName.ADMIN, RoleName.CASHIER)
  getCurrentShift(@CurrentUser() user: AuthUser) {
    return this.shiftsService.getActiveShift(user.id);
  }

  @Post('open')
  @Roles(RoleName.OWNER, RoleName.ADMIN, RoleName.CASHIER)
  openShift(@CurrentUser() user: AuthUser, @Body() dto: OpenShiftDto) {
    return this.shiftsService.openShift(user, dto);
  }

  @Post('cash-movement')
  @Roles(RoleName.OWNER, RoleName.ADMIN, RoleName.CASHIER)
  recordCashMovement(
    @CurrentUser() user: AuthUser,
    @Body() dto: CashMovementDto,
  ) {
    return this.shiftsService.recordCashMovement(user, dto);
  }

  @Post('close')
  @Roles(RoleName.OWNER, RoleName.ADMIN, RoleName.CASHIER)
  closeShift(@CurrentUser() user: AuthUser, @Body() dto: CloseShiftDto) {
    return this.shiftsService.closeShift(user, dto);
  }

  @Get(':id/report')
  @Roles(RoleName.OWNER, RoleName.ADMIN, RoleName.CASHIER)
  getShiftReport(@Param('id', ParseIntPipe) id: number) {
    return this.shiftsService.generateShiftReport(id);
  }

  @Get()
  @Roles(RoleName.OWNER, RoleName.ADMIN, RoleName.CASHIER)
  findAll(@Query() query: ListShiftsQueryDto) {
    return this.shiftsService.findAll(query);
  }
}
