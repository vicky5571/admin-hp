import {
  IsArray,
  IsEnum,
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsPositive,
  IsString,
  MaxLength,
} from 'class-validator';

export enum AdjustmentType {
  DAMAGE = 'DAMAGE',
  SHRINKAGE = 'SHRINKAGE',
  COUNT_VARIANCE_IN = 'COUNT_VARIANCE_IN',
  COUNT_VARIANCE_OUT = 'COUNT_VARIANCE_OUT',
  PROMO_SAMPLE = 'PROMO_SAMPLE',
  FOUND_STOCK = 'FOUND_STOCK',
  CORRECTION_IN = 'CORRECTION_IN',
  CORRECTION_OUT = 'CORRECTION_OUT',
}

export class CreateStockAdjustmentDto {
  @IsInt()
  @IsPositive()
  @IsNotEmpty()
  productId: number;

  @IsEnum(AdjustmentType)
  @IsNotEmpty()
  adjustmentType: AdjustmentType;

  @IsInt()
  @IsPositive()
  @IsNotEmpty()
  qty: number;

  @IsString()
  @IsNotEmpty()
  @MaxLength(100)
  reason: string;

  @IsString()
  @IsOptional()
  notes?: string;

  @IsArray()
  @IsOptional()
  imeiUnitIds?: number[];
}
