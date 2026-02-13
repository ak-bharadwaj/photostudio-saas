import {
  IsString,
  IsEmail,
  IsOptional,
  IsNotEmpty,
  IsDateString,
  IsNumber,
  IsEnum,
} from "class-validator";
import { Transform } from "class-transformer";
import { BookingStatus } from "@prisma/client";

export class CreateBookingDto {
  @IsString()
  @IsNotEmpty()
  @Transform(({ value }) => value?.trim())
  studioSlug: string;

  @IsString()
  @IsNotEmpty()
  serviceId: string;

  @IsDateString()
  @IsNotEmpty()
  scheduledDate: string;

  @IsString()
  @IsNotEmpty()
  @Transform(({ value }) => value?.trim())
  customerName: string;

  @IsEmail()
  @IsNotEmpty()
  @Transform(({ value }) => value?.trim().toLowerCase())
  customerEmail: string;

  @IsString()
  @IsNotEmpty()
  @Transform(({ value }) => value?.trim())
  customerPhone: string;

  @IsString()
  @IsOptional()
  @Transform(({ value }) => value?.trim())
  notes?: string;
}

export class UpdateBookingDto {
  @IsEnum(BookingStatus)
  @IsOptional()
  status?: BookingStatus;

  @IsDateString()
  @IsOptional()
  scheduledDate?: string;

  @IsString()
  @IsOptional()
  assignedTo?: string;

  @IsNumber()
  @IsOptional()
  deposit?: number;

  @IsString()
  @IsOptional()
  @Transform(({ value }) => value?.trim())
  notes?: string;
}

export class UpdateBookingStatusDto {
  @IsEnum(BookingStatus)
  @IsNotEmpty()
  status: BookingStatus;

  @IsString()
  @IsOptional()
  @Transform(({ value }) => value?.trim())
  notes?: string;
}
