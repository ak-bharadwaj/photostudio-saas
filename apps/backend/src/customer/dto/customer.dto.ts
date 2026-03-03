import {
  IsString,
  IsEmail,
  IsOptional,
  IsNotEmpty,
  IsObject,
  Matches,
} from "class-validator";
import { Transform } from "class-transformer";

export class CreateCustomerDto {
  @IsString()
  @IsNotEmpty()
  @Transform(({ value }) => value?.trim())
  name: string;

  @IsEmail()
  @IsOptional()
  @Transform(({ value }) => value?.trim().toLowerCase())
  email?: string;

  @IsString()
  @IsNotEmpty()
  @Matches(/^\+?[\d\s\-().]{7,20}$/, { message: "Invalid phone number format" })
  @Transform(({ value }) => value?.trim())
  phone: string;

  @IsObject()
  @IsOptional()
  metadata?: Record<string, any>;
}

export class UpdateCustomerDto {
  @IsString()
  @IsOptional()
  @Transform(({ value }) => value?.trim())
  name?: string;

  @IsEmail()
  @IsOptional()
  @Transform(({ value }) => value?.trim().toLowerCase())
  email?: string;

  @IsString()
  @IsOptional()
  @Matches(/^\+?[\d\s\-().]{7,20}$/, { message: "Invalid phone number format" })
  @Transform(({ value }) => value?.trim())
  phone?: string;

  @IsObject()
  @IsOptional()
  metadata?: Record<string, any>;
}
