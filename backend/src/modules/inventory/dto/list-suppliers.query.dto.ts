import { PaginationQueryDto } from '../../../common/dto/pagination-query.dto';
import { IsBoolean, IsOptional, IsString } from 'class-validator';

export class ListSuppliersQueryDto extends PaginationQueryDto {
  @IsOptional()
  @IsString()
  q?: string;

  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}
