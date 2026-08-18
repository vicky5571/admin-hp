import { Type } from 'class-transformer';
import { IsEnum, IsInt, IsOptional, IsString } from 'class-validator';
import { PaginationQueryDto } from '../../../common/dto/pagination-query.dto';
import { ImeiStatus } from '../../../common/enums/imei-status.enum';

export class ListImeiQueryDto extends PaginationQueryDto {
  @IsOptional()
  @IsString()
  q?: string;

  @IsOptional()
  @IsEnum(ImeiStatus)
  status?: ImeiStatus;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  productId?: number;
}
