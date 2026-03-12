import {
  IsEmail,
  IsString,
  MinLength,
  MaxLength,
  Matches,
  IsEnum,
  IsOptional,
  IsObject,
  IsBoolean,
} from "class-validator";
import { Transform } from "class-transformer";

export enum AdminRole {
  SUPER_ADMIN = "SUPER_ADMIN",
  ADMIN = "ADMIN",
}

export class CreateAdminDto {
  @IsEmail()
  email: string;

  @IsString()
  @MinLength(8)
  @MaxLength(128)
  @Matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/, {
    message:
      "Password must contain at least one uppercase letter, one lowercase letter, and one number",
  })
  password: string;

  @IsEnum(AdminRole)
  @IsOptional()
  role?: AdminRole;
}

export class AdminLoginDto {
  @IsEmail()
  email: string;

  @IsString()
  password: string;
}

export class UpdateStudioDto {
  @IsString()
  @IsOptional()
  name?: string;

  @IsString()
  @IsOptional()
  @MinLength(3)
  @MaxLength(50)
  @Matches(/^[a-z0-9-]+$/, {
    message: "Slug can only contain lowercase letters, numbers, and hyphens",
  })
  @Transform(({ value }) =>
    typeof value === "string" ? value.toLowerCase() : value,
  )
  slug?: string;

  @IsString()
  @IsOptional()
  email?: string;

  @IsString()
  @IsOptional()
  phone?: string;

  @IsString()
  @IsOptional()
  status?: string;

  @IsString()
  @IsOptional()
  subscriptionTier?: string;

  @IsString()
  @IsOptional()
  defaultTerms?: string;

  @IsObject()
  @IsOptional()
  brandingConfig?: Record<string, any>;

  @IsString()
  @IsOptional()
  billingModel?: string;

  @IsOptional()
  commissionRate?: number;

  @IsString()
  @IsOptional()
  commissionType?: string;

  @IsString()
  @IsOptional()
  currency?: string;

  @IsString()
  @IsOptional()
  subscriptionExpiresAt?: string;

  @IsOptional()
  taxRate?: number;

  @IsBoolean()
  @IsOptional()
  isRecommended?: boolean;
}

export class CreateStudioWithOwnerDto {
  // Studio details
  @IsString()
  studioName: string;

  @IsString()
  slug: string;

  @IsEmail()
  studioEmail: string;

  @IsString()
  studioPhone: string;

  @IsString()
  @IsOptional()
  subscriptionTier?: string;

  @IsObject()
  @IsOptional()
  brandingConfig?: Record<string, any>;

  @IsString()
  @IsOptional()
  defaultTerms?: string;

  // Owner details
  @IsString()
  ownerName: string;

  @IsEmail()
  ownerEmail: string;

  @IsString()
  @MinLength(8)
  ownerPassword: string;

  @IsOptional()
  subscriptionDurationDays?: number;
}
