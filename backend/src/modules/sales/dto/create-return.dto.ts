import { Type } from 'class-transformer';
import {
  IsArray,
  IsEnum,
  IsInt,
  IsNumber,
  IsOptional,
  IsString,
  Min,
  ValidateNested,
} from 'class-validator';
import { RefundMethod } from '../../../common/enums/refund-method.enum';
import { RestockType } from '../../../common/enums/restock-type.enum';

export class CreateReturnItemDto {
  @Type(() => Number)
  @IsInt()
  saleItemId: number;

  @Type(() => Number)
  @IsInt()
  productId: number;

  @Type(() => Number)
  @IsInt()
  @Min(1)
  qty: number;

  @Type(() => Number)
  @IsNumber()
  @Min(0)
  unitRefund: number;

  @Type(() => Number)
  @IsNumber()
  @Min(0)
  lineRefundTotal: number;

  @IsEnum(RestockType)
  restockType: RestockType;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  imeis?: string[];
}

export class CreateReturnDto {
  @Type(() => Number)
  @IsInt()
  saleId: number;

  @IsString()
  reason: string;

  @IsEnum(RefundMethod)
  refundMethod: RefundMethod;

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CreateReturnItemDto)
  items: CreateReturnItemDto[];
}
