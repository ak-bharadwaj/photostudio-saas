import {
  IsString,
  IsEmail,
  IsOptional,
  IsNotEmpty,
  IsDateString,
  IsNumber,
  IsEnum,
  Min,
  Validate,
  ValidatorConstraint,
  ValidatorConstraintInterface,
} from "class-validator";
import { Transform } from "class-transformer";
import { BookingStatus } from "@prisma/client";

@ValidatorConstraint({ name: "isFutureDate", async: false })
class IsFutureDateConstraint implements ValidatorConstraintInterface {
  validate(value: string): boolean {
    return new Date(value) > new Date();
  }
  defaultMessage(): string {
    return "Scheduled date must be in the future";
  }
}

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
  @Validate(IsFutureDateConstraint)
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

  @IsString()
  @IsOptional()
  serviceId?: string;

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

export class CreateInternalBookingDto {
  @IsString()
  @IsNotEmpty()
  customerId: string;

  @IsString()
  @IsNotEmpty()
  serviceId: string;

  @IsDateString()
  @IsNotEmpty()
  @Validate(IsFutureDateConstraint)
  scheduledDate: string;

  @IsString()
  @IsOptional()
  @Transform(({ value }) => value?.trim())
  notes?: string;
}
export class SendQuoteDto {
  @IsNumber()
  @Min(0.01)
  amount: number;

  @IsString()
  @IsOptional()
  notes?: string;
}

export class AcceptQuoteDto {
  @IsString()
  @IsOptional()
  notes?: string;
}

export class RejectQuoteDto {
  @IsString()
  @IsNotEmpty()
  notes: string; // Required for bargaining/feedback
}
