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

export class ReceiveGrItemDto {
  @Type(() => Number)
  @IsInt()
  poItemId: number;

  @Type(() => Number)
  @IsInt()
  productId: number;

  @Type(() => Number)
  @IsInt()
  @Min(1)
  receivedQty: number;

  @Type(() => Number)
  @IsInt()
  @Min(0)
  unitCost: number;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  imeis?: string[];
}

export class CreateGoodsReceiptDto {
  @Type(() => Number)
  @IsInt()
  purchaseOrderId: number;

  @IsDateString()
  receiveDate: string;

  @IsOptional()
  @IsString()
  notes?: string;

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => ReceiveGrItemDto)
  items: ReceiveGrItemDto[];
}
