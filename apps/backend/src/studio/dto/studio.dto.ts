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
  ValidateNested,
} from "class-validator";
import { Transform, Type } from "class-transformer";
import { SubscriptionTier, StudioStatus } from '@prisma/client';

export class BrandingConfigDto {
  @IsString()
  @IsOptional()
  primaryColor?: string;

  @IsString()
  @IsOptional()
  secondaryColor?: string;

  @IsString()
  @IsOptional()
  accentColor?: string;

  @IsString()
  @IsOptional()
  fontFamily?: string;

  // Extended branding fields used by the portal & settings page
  @IsString()
  @IsOptional()
  heroStyle?: string;

  @IsString()
  @IsOptional()
  cardTheme?: string;

  @IsString()
  @IsOptional()
  buttonShape?: string;

  @IsString()
  @IsOptional()
  headerText?: string;

  @IsString()
  @IsOptional()
  tagline?: string;

  @IsString()
  @IsOptional()
  logoPosition?: string;

  @IsString()
  @IsOptional()
  bgType?: string;

  @IsString()
  @IsOptional()
  layoutMode?: string;

  @IsString()
  @IsOptional()
  themePreset?: string;
}

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

  @IsString()
  @IsOptional()
  logoUrl?: string;

  @ValidateNested()
  @Type(() => BrandingConfigDto)
  @IsOptional()
  brandingConfig?: BrandingConfigDto;

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

  @IsString()
  @IsOptional()
  @Matches(/^[a-z0-9-]+$/, {
    message: "Slug must contain only lowercase letters, numbers, and hyphens",
  })
  @MinLength(3)
  @MaxLength(50)
  @Transform(({ value }) => value?.trim().toLowerCase())
  slug?: string;

  @IsEmail()
  @IsOptional()
  @Transform(({ value }) => value?.trim().toLowerCase())
  email?: string;

  @IsString()
  @IsOptional()
  @Transform(({ value }) => value?.trim())
  phone?: string;

  @IsString()
  @IsOptional()
  @Transform(({ value }) => value?.trim())
  address?: string;

  @IsString()
  @IsOptional()
  @Transform(({ value }) => value?.trim())
  city?: string;

  @IsString()
  @IsOptional()
  @Transform(({ value }) => value?.trim())
  state?: string;

  @IsString()
  @IsOptional()
  @Transform(({ value }) => value?.trim())
  zipCode?: string;

  @IsString()
  @IsOptional()
  @Transform(({ value }) => value?.trim())
  @MaxLength(500)
  description?: string;

  // Allow empty string or valid URL
  @IsOptional()
  @Transform(({ value }) => (value === "" ? undefined : value?.trim()))
  @IsUrl({}, { message: "website must be a valid URL" })
  website?: string;

  @IsString()
  @IsOptional()
  logoUrl?: string;

  @ValidateNested()
  @Type(() => BrandingConfigDto)
  @IsOptional()
  brandingConfig?: BrandingConfigDto;

  @IsString()
  @IsOptional()
  defaultTerms?: string;

  @IsString()
  @IsOptional()
  hotDeal?: string;

  @IsEnum(SubscriptionTier)
  @IsOptional()
  subscriptionTier?: SubscriptionTier;

  @IsEnum(StudioStatus)
  @IsOptional()
  status?: StudioStatus;
}
