import { Type } from 'class-transformer';
import {
  IsArray,
  IsDateString,
  IsInt,
  IsNumber,
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
  @IsNumber()
  @Min(0)
  unitCost: number;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  actualUnitCost?: number;

  @IsOptional()
  @IsString()
  conditionStatus?: string;

  @IsOptional()
  @IsString()
  conditionNotes?: string;

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

  @IsOptional()
  @IsString()
  supplierDoNumber?: string;

  @IsOptional()
  @IsString()
  carrierName?: string;

  @IsOptional()
  @IsString()
  trackingNumber?: string;

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => ReceiveGrItemDto)
  items: ReceiveGrItemDto[];
}
