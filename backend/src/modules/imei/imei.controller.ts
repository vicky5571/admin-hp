import {
  Body,
  Controller,
  Get,
  Param,
  ParseIntPipe,
  Patch,
  Query,
  UseGuards,
} from '@nestjs/common';
import { Roles } from '../../common/decorators/roles.decorator';
import { RoleName } from '../../common/enums/role.enum';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { ListImeiQueryDto } from './dto/list-imei.query.dto';
import { UpdateImeiStatusDto } from './dto/update-imei-status.dto';
import { ImeiService } from './imei.service';

@Controller('imei')
@UseGuards(JwtAuthGuard, RolesGuard)
export class ImeiController {
  constructor(private readonly imeiService: ImeiService) {}

  @Get()
  @Roles(
    RoleName.OWNER,
    RoleName.ADMIN,
    RoleName.CASHIER,
    RoleName.INVENTORY,
  )
  findAll(@Query() query: ListImeiQueryDto) {
    return this.imeiService.findAll(query);
  }

  @Get('stats')
  @Roles(
    RoleName.OWNER,
    RoleName.ADMIN,
    RoleName.CASHIER,
    RoleName.INVENTORY,
  )
  stats() {
    return this.imeiService.stats();
  }

  @Get('available')
  @Roles(
    RoleName.OWNER,
    RoleName.ADMIN,
    RoleName.CASHIER,
    RoleName.INVENTORY,
  )
  findAvailable(@Query('productId', ParseIntPipe) productId: number) {
    return this.imeiService.findAvailable(productId);
  }

  @Get('lookup/:imei')
  @Roles(
    RoleName.OWNER,
    RoleName.ADMIN,
    RoleName.CASHIER,
    RoleName.INVENTORY,
  )
  findByImei(@Param('imei') imei: string) {
    return this.imeiService.findByImei(imei);
  }

  @Patch(':id/status')
  @Roles(RoleName.OWNER, RoleName.ADMIN, RoleName.INVENTORY)
  updateStatus(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateImeiStatusDto,
  ) {
    return this.imeiService.updateStatus(id, dto);
  }
}
