import {
  IsString,
  IsNotEmpty,
  IsEmail,
  IsOptional,
  IsEnum,
  IsUrl,
  Matches,
  MinLength,
  MaxLength,
} from "class-validator";
import { Transform } from "class-transformer";
import { SubscriptionTier, StudioStatus } from "@prisma/client";

export class CreateStudioDto {
  @IsString()
  @IsNotEmpty()
  @MinLength(2)
  @MaxLength(100)
  @Transform(({ value }) => value?.trim())
  name: string;

  @IsString()
  @IsNotEmpty()
  @Matches(/^[a-z0-9-]+$/, {
    message: "Slug must contain only lowercase letters, numbers, and hyphens",
  })
  @MinLength(3)
  @MaxLength(50)
  @Transform(({ value }) => value?.trim().toLowerCase())
  slug: string;

  @IsEmail()
  @IsNotEmpty()
  @Transform(({ value }) => value?.trim().toLowerCase())
  email: string;

  @IsString()
  @IsNotEmpty()
  @Transform(({ value }) => value?.trim())
  phone: string;

  @IsUrl()
  @IsOptional()
  logoUrl?: string;

  @IsOptional()
  brandingConfig?: any;

  @IsEnum(SubscriptionTier)
  @IsOptional()
  subscriptionTier?: SubscriptionTier;

  @IsEnum(StudioStatus)
  @IsOptional()
  status?: StudioStatus;

  // Owner details
  @IsString()
  @IsNotEmpty()
  @Transform(({ value }) => value?.trim())
  ownerName: string;

  @IsEmail()
  @IsNotEmpty()
  @Transform(({ value }) => value?.trim().toLowerCase())
  ownerEmail: string;

  @IsString()
  @IsNotEmpty()
  @MinLength(8)
  ownerPassword: string;
}

export class UpdateStudioDto {
  @IsString()
  @IsOptional()
  @MinLength(2)
  @MaxLength(100)
  @Transform(({ value }) => value?.trim())
  name?: string;

  @IsEmail()
  @IsOptional()
  @Transform(({ value }) => value?.trim().toLowerCase())
  email?: string;

  @IsString()
  @IsOptional()
  @Transform(({ value }) => value?.trim())
  phone?: string;

  @IsUrl()
  @IsOptional()
  logoUrl?: string;

  @IsOptional()
  brandingConfig?: any;

  @IsEnum(SubscriptionTier)
  @IsOptional()
  subscriptionTier?: SubscriptionTier;

  @IsEnum(StudioStatus)
  @IsOptional()
  status?: StudioStatus;
}
