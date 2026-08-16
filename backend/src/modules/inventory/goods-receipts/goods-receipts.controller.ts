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
import { CurrentUser } from '../../../common/decorators/current-user.decorator';
import { Roles } from '../../../common/decorators/roles.decorator';
import { RoleName } from '../../../common/enums/role.enum';
import { JwtAuthGuard } from '../../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../../common/guards/roles.guard';
import { AuthUser } from '../../../common/types/auth-user.type';
import { CreateGoodsReceiptDto } from '../dto/create-goods-receipt.dto';
import { ListGoodsReceiptsQueryDto } from '../dto/list-goods-receipts.query.dto';
import { GoodsReceiptsService } from './goods-receipts.service';

@Controller('goods-receipts')
@UseGuards(JwtAuthGuard, RolesGuard)
export class GoodsReceiptsController {
  constructor(private readonly service: GoodsReceiptsService) {}

  @Get()
  @Roles(RoleName.OWNER, RoleName.ADMIN, RoleName.INVENTORY)
  findAll(@Query() query: ListGoodsReceiptsQueryDto) {
    return this.service.findAll(query);
  }

  @Get(':id')
  @Roles(RoleName.OWNER, RoleName.ADMIN, RoleName.INVENTORY)
  findOne(@Param('id', ParseIntPipe) id: number) {
    return this.service.findOne(id);
  }

  @Post()
  @Roles(RoleName.OWNER, RoleName.ADMIN, RoleName.INVENTORY)
  create(
    @Body() dto: CreateGoodsReceiptDto,
    @CurrentUser() user: AuthUser,
  ) {
    return this.service.create(dto, user.id);
  }
}
