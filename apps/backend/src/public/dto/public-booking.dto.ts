import {
  IsNotEmpty,
  IsString,
  IsDateString,
  IsOptional,
  IsEmail,
} from "class-validator";

export class CreatePublicBookingDto {
  @IsNotEmpty()
  @IsString()
  customerName: string;

  @IsOptional()
  @IsEmail()
  customerEmail?: string;

  @IsNotEmpty()
  @IsString()
  customerPhone: string;

  @IsNotEmpty()
  @IsString()
  serviceId: string;

  @IsNotEmpty()
  @IsDateString()
  scheduledAt: string;

  @IsOptional()
  @IsString()
  customerNotes?: string;
}
