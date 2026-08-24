import { IsDateString, IsEnum, IsInt, IsOptional, IsPositive } from 'class-validator';
import { Type } from 'class-transformer';
import { PaginationQueryDto } from '../../../../common/dto/pagination-query.dto';
import { AdjustmentType } from './create-stock-adjustment.dto';

export class ListAdjustmentsQueryDto extends PaginationQueryDto {
  @IsInt()
  @IsPositive()
  @IsOptional()
  @Type(() => Number)
  productId?: number;

  @IsEnum(AdjustmentType)
  @IsOptional()
  adjustmentType?: AdjustmentType;

  @IsDateString()
  @IsOptional()
  dateFrom?: string;

  @IsDateString()
  @IsOptional()
  dateTo?: string;
}
