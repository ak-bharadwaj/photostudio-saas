import {
  IsEmail,
  IsEnum,
  IsOptional,
  IsString,
  MinLength,
} from "class-validator";
import { ApiPropertyOptional } from "@nestjs/swagger";
import { UserRole } from "@prisma/client";

export class UpdateUserDto {
  @ApiPropertyOptional({ example: "john.doe@example.com" })
  @IsEmail({}, { message: "Please provide a valid email address" })
  @IsOptional()
  email?: string;

  @ApiPropertyOptional({ example: "John Doe" })
  @IsString()
  @IsOptional()
  name?: string;

  @ApiPropertyOptional({ enum: UserRole, example: UserRole.PHOTOGRAPHER })
  @IsEnum(UserRole, {
    message: "Role must be OWNER, PHOTOGRAPHER, or ASSISTANT",
  })
  @IsOptional()
  role?: UserRole;
}
