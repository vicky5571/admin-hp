import { Type } from 'class-transformer';
import {
  IsBoolean,
  IsEmail,
  IsInt,
  IsOptional,
  IsString,
  MaxLength,
  MinLength,
} from 'class-validator';

export class CreateUserDto {
  @IsString()
  @MaxLength(120)
  fullName: string;

  @IsString()
  @MaxLength(60)
  @MinLength(3)
  username: string;

  @IsOptional()
  @IsEmail()
  @MaxLength(120)
  email?: string;

  @IsString()
  @MinLength(6)
  password: string;

  @Type(() => Number)
  @IsInt()
  roleId: number;
}

export class UpdateUserDto {
  @IsOptional()
  @IsString()
  @MaxLength(120)
  fullName?: string;

  @IsOptional()
  @IsString()
  @MaxLength(60)
  @MinLength(3)
  username?: string;

  @IsOptional()
  @IsEmail()
  @MaxLength(120)
  email?: string;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  roleId?: number;

  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}

export class ChangePasswordDto {
  @IsString()
  currentPassword: string;

  @IsString()
  @MinLength(6)
  newPassword: string;
}

export class ResetPasswordDto {
  @IsString()
  @MinLength(6)
  newPassword: string;
}
