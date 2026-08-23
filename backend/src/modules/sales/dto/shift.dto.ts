import { Type } from 'class-transformer';
import {
  IsEnum,
  IsNumber,
  IsOptional,
  IsPositive,
  IsString,
  Min,
} from 'class-validator';
import { CashMovementType } from '../entities/cash-movement.entity';
import { ShiftStatus } from '../entities/cashier-shift.entity';

export class OpenShiftDto {
  @IsOptional()
  @IsString()
  registerName?: string;

  @Type(() => Number)
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0)
  openingBalance: number;

  @IsOptional()
  @IsString()
  notes?: string;
}

export class CashMovementDto {
  @IsEnum(CashMovementType)
  movementType: CashMovementType;

  @Type(() => Number)
  @IsNumber({ maxDecimalPlaces: 2 })
  @IsPositive()
  amount: number;

  @IsString()
  reason: string;
}

export class CloseShiftDto {
  @Type(() => Number)
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0)
  actualEndingCash: number;

  @IsOptional()
  @IsString()
  notes?: string;
}

export class ListShiftsQueryDto {
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  page?: number = 1;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  limit?: number = 20;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  userId?: number;

  @IsOptional()
  @IsEnum(ShiftStatus)
  status?: ShiftStatus;
}
