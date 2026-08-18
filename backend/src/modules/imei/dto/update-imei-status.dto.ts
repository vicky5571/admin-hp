import { IsEnum, IsOptional, IsString, MaxLength } from 'class-validator';
import { ImeiStatus } from '../../../common/enums/imei-status.enum';

export class UpdateImeiStatusDto {
  @IsEnum(ImeiStatus)
  status: ImeiStatus;

  @IsOptional()
  @IsString()
  @MaxLength(30)
  location?: string;
}
