import { Type } from 'class-transformer';
import {
  IsEnum,
  IsInt,
  IsOptional,
  IsString,
  Max,
  MaxLength,
  Min,
} from 'class-validator';
import { ImeiStatus } from '../../../common/enums/imei-status.enum';

export class UpdateImeiStatusDto {
  @IsOptional()
  @IsEnum(ImeiStatus)
  status?: ImeiStatus;

  @IsOptional()
  @IsString()
  @MaxLength(30)
  location?: string;

  @IsOptional()
  @IsString()
  @MaxLength(20)
  conditionGrade?: string;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  @Max(100)
  batteryHealth?: number;
}
