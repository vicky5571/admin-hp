import { Type } from 'class-transformer';
import { IsArray, IsInt, IsString, ValidateNested } from 'class-validator';

export class ValidateReturnItemDto {
  @Type(() => Number)
  @IsInt()
  saleItemId: number;

  @Type(() => Number)
  @IsInt()
  qty: number;

  @IsString({ each: true })
  imeis: string[];
}

export class ValidateReturnDto {
  @IsString()
  invoiceNumber: string;

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => ValidateReturnItemDto)
  items: ValidateReturnItemDto[];
}
