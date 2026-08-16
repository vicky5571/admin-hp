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
import { CreateReturnDto } from './dto/create-return.dto';
import { ListReturnsQueryDto } from './dto/list-returns.query.dto';
import { ValidateReturnDto } from './dto/validate-return.dto';
import { ReturnsService } from './returns.service';

@Controller('returns')
@UseGuards(JwtAuthGuard, RolesGuard)
export class ReturnsController {
  constructor(private readonly service: ReturnsService) {}

  @Post('validate')
  @Roles(RoleName.OWNER, RoleName.ADMIN, RoleName.CASHIER, RoleName.SUPERVISOR)
  validate(@Body() dto: ValidateReturnDto) {
    return this.service.validate(dto);
  }

  @Post()
  @Roles(RoleName.OWNER, RoleName.ADMIN, RoleName.SUPERVISOR)
  create(@Body() dto: CreateReturnDto, @CurrentUser() user: AuthUser) {
    return this.service.create(dto, user);
  }

  @Get()
  @Roles(RoleName.OWNER, RoleName.ADMIN, RoleName.CASHIER)
  findAll(@Query() query: ListReturnsQueryDto) {
    return this.service.findAll(query);
  }

  @Get(':id')
  @Roles(RoleName.OWNER, RoleName.ADMIN, RoleName.CASHIER)
  findOne(@Param('id', ParseIntPipe) id: number) {
    return this.service.findOne(id);
  }
}
