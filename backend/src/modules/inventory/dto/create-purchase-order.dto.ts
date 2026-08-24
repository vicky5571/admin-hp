import { Type } from 'class-transformer';
import {
  IsArray,
  IsDateString,
  IsInt,
  IsOptional,
  IsString,
  Min,
  ValidateNested,
} from 'class-validator';

export class CreatePoItemDto {
  @Type(() => Number)
  @IsInt()
  productId: number;

  @Type(() => Number)
  @IsInt()
  @Min(1)
  orderedQty: number;

  @Type(() => Number)
  @IsInt()
  @Min(0)
  unitCost: number;
}

export class CreatePurchaseOrderDto {
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  supplierId?: number;

  @IsDateString()
  orderDate: string;

  @IsOptional()
  @IsDateString()
  expectedDate?: string;

  @IsOptional()
  @IsDateString()
  paymentDueDate?: string;

  @IsOptional()
  @IsString()
  paymentStatus?: string;

  @IsOptional()
  @Type(() => Number)
  @Min(0)
  paidAmount?: number;

  @IsOptional()
  @IsString()
  notes?: string;

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CreatePoItemDto)
  items: CreatePoItemDto[];
}
