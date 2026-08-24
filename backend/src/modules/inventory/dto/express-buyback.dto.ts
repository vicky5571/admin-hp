import { Type } from 'class-transformer';
import {
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsString,
  Max,
  Min,
} from 'class-validator';

export class ExpressBuybackDto {
  @Type(() => Number)
  @IsInt()
  @IsNotEmpty()
  productId: number;

  @Type(() => Number)
  @Min(0)
  @IsNotEmpty()
  unitCost: number;

  @IsString()
  @IsNotEmpty()
  imei: string;

  @IsOptional()
  @IsString()
  conditionGrade?: string;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  @Max(100)
  batteryHealth?: number;

  @IsOptional()
  @Type(() => Number)
  @Min(0)
  sellingPrice?: number;

  @IsOptional()
  @IsString()
  notes?: string;
}
