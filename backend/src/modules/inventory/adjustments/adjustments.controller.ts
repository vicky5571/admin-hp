import {
  Body,
  Controller,
  Get,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { JwtAuthGuard } from '../../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../../common/guards/roles.guard';
import { Roles } from '../../../common/decorators/roles.decorator';
import { CurrentUser } from '../../../common/decorators/current-user.decorator';
import { RoleName } from '../../../common/enums/role.enum';
import { User } from '../../users/entities/user.entity';
import { AdjustmentsService } from './adjustments.service';
import { CreateStockAdjustmentDto } from './dto/create-stock-adjustment.dto';
import { ListAdjustmentsQueryDto } from './dto/list-adjustments.query.dto';

@Controller('inventory/adjustments')
@UseGuards(JwtAuthGuard, RolesGuard)
export class AdjustmentsController {
  constructor(private readonly adjustmentsService: AdjustmentsService) {}

  @Post()
  @Roles(RoleName.OWNER, RoleName.ADMIN, RoleName.INVENTORY, RoleName.SUPERVISOR)
  create(
    @Body() dto: CreateStockAdjustmentDto,
    @CurrentUser() user: User,
  ) {
    return this.adjustmentsService.create(dto, user.id);
  }

  @Get()
  @Roles(RoleName.OWNER, RoleName.ADMIN, RoleName.INVENTORY, RoleName.SUPERVISOR)
  findAll(@Query() query: ListAdjustmentsQueryDto) {
    return this.adjustmentsService.findAll(query);
  }
}
