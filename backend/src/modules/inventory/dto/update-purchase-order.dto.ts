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
import { CreatePoItemDto } from './create-purchase-order.dto';

export class UpdatePurchaseOrderDto {
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

export class RejectPurchaseOrderDto {
  @IsOptional()
  @IsString()
  reason?: string;
}
