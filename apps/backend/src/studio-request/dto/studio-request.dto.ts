import {
  IsEmail,
  IsNotEmpty,
  IsOptional,
  IsString,
  IsPhoneNumber,
} from "class-validator";

export class CreateStudioRequestDto {
  @IsString()
  @IsNotEmpty()
  studioName: string;

  @IsString()
  @IsNotEmpty()
  ownerName: string;

  @IsEmail()
  @IsNotEmpty()
  email: string;

  @IsString()
  @IsOptional()
  phone?: string;

  @IsString()
  @IsOptional()
  city?: string;

  @IsString()
  @IsOptional()
  notes?: string;
}

export class UpdateStudioRequestStatusDto {
  @IsString()
  @IsNotEmpty()
  status: "PENDING" | "REVIEWED" | "ACCEPTED" | "REJECTED";
}
