import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  ParseIntPipe,
  Patch,
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
import { CreateBrandDto } from './dto/create-brand.dto';
import { CreateCategoryDto } from './dto/create-category.dto';
import { CreateProductDto } from './dto/create-product.dto';
import { ListProductsQueryDto } from './dto/list-products.query.dto';
import { UpdateProductDto } from './dto/update-product.dto';
import { ProductsService } from './products.service';

@Controller('products')
@UseGuards(JwtAuthGuard, RolesGuard)
export class ProductsController {
  constructor(private readonly productsService: ProductsService) {}

  @Get()
  @Roles(RoleName.OWNER, RoleName.ADMIN, RoleName.CASHIER, RoleName.INVENTORY)
  findAll(@Query() query: ListProductsQueryDto) {
    return this.productsService.findAll(query);
  }

  @Get('categories')
  @Roles(RoleName.OWNER, RoleName.ADMIN, RoleName.CASHIER, RoleName.INVENTORY)
  findCategories() {
    return this.productsService.findCategories();
  }

  @Post('categories')
  @Roles(RoleName.OWNER, RoleName.ADMIN)
  createCategory(
    @Body() dto: CreateCategoryDto,
    @CurrentUser() user: AuthUser,
  ) {
    return this.productsService.createCategory(dto.name, user.id);
  }

  @Get('brands')
  @Roles(RoleName.OWNER, RoleName.ADMIN, RoleName.CASHIER, RoleName.INVENTORY)
  findBrands() {
    return this.productsService.findBrands();
  }

  @Post('brands')
  @Roles(RoleName.OWNER, RoleName.ADMIN)
  createBrand(
    @Body() dto: CreateBrandDto,
    @CurrentUser() user: AuthUser,
  ) {
    return this.productsService.createBrand(dto.name, user.id);
  }

  @Get('tax-classes')
  @Roles(RoleName.OWNER, RoleName.ADMIN, RoleName.CASHIER, RoleName.INVENTORY)
  findTaxClasses() {
    return this.productsService.findTaxClasses();
  }

  @Post()
  @Roles(RoleName.OWNER, RoleName.ADMIN)
  create(
    @Body() dto: CreateProductDto,
    @CurrentUser() user: AuthUser,
  ) {
    return this.productsService.create(dto, user.id);
  }

  @Get(':id')
  @Roles(RoleName.OWNER, RoleName.ADMIN, RoleName.CASHIER, RoleName.INVENTORY)
  findOne(@Param('id', ParseIntPipe) id: number) {
    return this.productsService.findOne(id);
  }

  @Patch(':id')
  @Roles(RoleName.OWNER, RoleName.ADMIN)
  update(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateProductDto,
    @CurrentUser() user: AuthUser,
  ) {
    return this.productsService.update(id, dto, user.id);
  }

  @Delete(':id')
  @Roles(RoleName.OWNER, RoleName.ADMIN)
  delete(
    @Param('id', ParseIntPipe) id: number,
    @CurrentUser() user: AuthUser,
  ) {
    return this.productsService.delete(id, user.id);
  }
}
