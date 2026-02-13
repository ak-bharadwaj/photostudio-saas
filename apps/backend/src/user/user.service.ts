import {
  Injectable,
  NotFoundException,
  ConflictException,
  BadRequestException,
  Logger,
  ForbiddenException,
} from "@nestjs/common";
import { PrismaService } from "../prisma/prisma.service";
import { CreateUserDto } from "./dto/create-user.dto";
import { UpdateUserDto } from "./dto/update-user.dto";
import { ChangePasswordDto } from "./dto/change-password.dto";
import * as bcrypt from "bcrypt";
import { UserRole } from "@prisma/client";

@Injectable()
export class UserService {
  private readonly logger = new Logger(UserService.name);

  constructor(private prisma: PrismaService) {}

  /**
   * Create a new user in a studio
   * Only studio owner can create users
   */
  async create(
    createUserDto: CreateUserDto,
    studioId: string,
    creatorRole: UserRole,
  ) {
    // Only OWNER can create users
    if (creatorRole !== UserRole.OWNER) {
      throw new ForbiddenException("Only studio owners can create new users");
    }

    // Check if email already exists
    const existingUser = await this.prisma.user.findUnique({
      where: { email: createUserDto.email },
    });

    if (existingUser) {
      throw new ConflictException("A user with this email already exists");
    }

    // Verify studio exists
    const studio = await this.prisma.studio.findUnique({
      where: { id: studioId },
    });

    if (!studio) {
      throw new NotFoundException("Studio not found");
    }

    // Hash password
    const passwordHash = await bcrypt.hash(createUserDto.password, 12);

    // Create user
    const user = await this.prisma.user.create({
      data: {
        email: createUserDto.email,
        passwordHash,
        name: createUserDto.name,
        role: createUserDto.role,
        studioId,
      },
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
        isActive: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    this.logger.log(
      `User created: ${user.email} (${user.role}) in studio ${studioId}`,
    );
    return user;
  }

  /**
   * Get all users in a studio
   */
  async findAll(studioId: string) {
    const users = await this.prisma.user.findMany({
      where: { studioId },
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
        isActive: true,
        createdAt: true,
        updatedAt: true,
      },
      orderBy: [{ role: "asc" }, { name: "asc" }],
    });

    return users;
  }

  /**
   * Get a single user by ID
   */
  async findOne(id: string, studioId: string) {
    const user = await this.prisma.user.findFirst({
      where: {
        id,
        studioId,
      },
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
        isActive: true,
        createdAt: true,
        updatedAt: true,
        _count: {
          select: {
            bookings: true,
          },
        },
      },
    });

    if (!user) {
      throw new NotFoundException("User not found");
    }

    return user;
  }

  /**
   * Update user details
   * Only OWNER can update user roles
   */
  async update(
    id: string,
    updateUserDto: UpdateUserDto,
    studioId: string,
    updaterRole: UserRole,
    updaterId: string,
  ) {
    // Check if user exists
    const user = await this.prisma.user.findFirst({
      where: { id, studioId },
    });

    if (!user) {
      throw new NotFoundException("User not found");
    }

    // Only OWNER can update roles
    if (updateUserDto.role && updaterRole !== UserRole.OWNER) {
      throw new ForbiddenException("Only studio owners can change user roles");
    }

    // Users can only update themselves unless they're an OWNER
    if (id !== updaterId && updaterRole !== UserRole.OWNER) {
      throw new ForbiddenException("You can only update your own profile");
    }

    // Cannot change own role (prevents accidental lockout)
    if (id === updaterId && updateUserDto.role) {
      throw new BadRequestException("You cannot change your own role");
    }

    // Check if new email already exists
    if (updateUserDto.email && updateUserDto.email !== user.email) {
      const existingUser = await this.prisma.user.findUnique({
        where: { email: updateUserDto.email },
      });

      if (existingUser) {
        throw new ConflictException("A user with this email already exists");
      }
    }

    // Update user
    const updatedUser = await this.prisma.user.update({
      where: { id },
      data: updateUserDto,
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
        isActive: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    this.logger.log(`User updated: ${updatedUser.email} by user ${updaterId}`);
    return updatedUser;
  }

  /**
   * Toggle user active status (soft delete)
   * Only OWNER can toggle status
   */
  async toggleActive(
    id: string,
    studioId: string,
    requesterRole: UserRole,
    requesterId: string,
  ) {
    // Only OWNER can toggle status
    if (requesterRole !== UserRole.OWNER) {
      throw new ForbiddenException(
        "Only studio owners can activate/deactivate users",
      );
    }

    // Check if user exists
    const user = await this.prisma.user.findFirst({
      where: { id, studioId },
    });

    if (!user) {
      throw new NotFoundException("User not found");
    }

    // Cannot deactivate self (prevents lockout)
    if (id === requesterId) {
      throw new BadRequestException("You cannot deactivate your own account");
    }

    // Toggle active status
    const updatedUser = await this.prisma.user.update({
      where: { id },
      data: { isActive: !user.isActive },
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
        isActive: true,
      },
    });

    this.logger.log(
      `User ${updatedUser.isActive ? "activated" : "deactivated"}: ${updatedUser.email}`,
    );

    return {
      message: `User ${updatedUser.isActive ? "activated" : "deactivated"} successfully`,
      user: updatedUser,
    };
  }

  /**
   * Change user password
   */
  async changePassword(
    id: string,
    changePasswordDto: ChangePasswordDto,
    studioId: string,
    requesterId: string,
  ) {
    // Users can only change their own password
    if (id !== requesterId) {
      throw new ForbiddenException("You can only change your own password");
    }

    // Get user with password hash
    const user = await this.prisma.user.findFirst({
      where: { id, studioId },
    });

    if (!user) {
      throw new NotFoundException("User not found");
    }

    // Verify current password
    const isPasswordValid = await bcrypt.compare(
      changePasswordDto.currentPassword,
      user.passwordHash,
    );

    if (!isPasswordValid) {
      throw new BadRequestException("Current password is incorrect");
    }

    // Hash new password
    const newPasswordHash = await bcrypt.hash(
      changePasswordDto.newPassword,
      12,
    );

    // Update password
    await this.prisma.user.update({
      where: { id },
      data: { passwordHash: newPasswordHash },
    });

    this.logger.log(`Password changed for user: ${user.email}`);

    return { message: "Password changed successfully" };
  }

  /**
   * Delete user permanently
   * Only OWNER can delete users
   */
  async remove(
    id: string,
    studioId: string,
    requesterRole: UserRole,
    requesterId: string,
  ) {
    // Only OWNER can delete users
    if (requesterRole !== UserRole.OWNER) {
      throw new ForbiddenException("Only studio owners can delete users");
    }

    // Check if user exists
    const user = await this.prisma.user.findFirst({
      where: { id, studioId },
      include: {
        _count: {
          select: {
            bookings: true,
          },
        },
      },
    });

    if (!user) {
      throw new NotFoundException("User not found");
    }

    // Cannot delete self (prevents lockout)
    if (id === requesterId) {
      throw new BadRequestException("You cannot delete your own account");
    }

    // Check if user has assigned bookings
    if (user._count.bookings > 0) {
      throw new BadRequestException(
        `Cannot delete user with ${user._count.bookings} assigned bookings. Please reassign or complete them first.`,
      );
    }

    // Delete user
    await this.prisma.user.delete({
      where: { id },
    });

    this.logger.log(`User deleted: ${user.email} by user ${requesterId}`);

    return { message: "User deleted successfully" };
  }

  /**
   * Get user statistics
   */
  async getStatistics(studioId: string) {
    const [totalUsers, activeUsers, usersByRole] = await Promise.all([
      this.prisma.user.count({ where: { studioId } }),
      this.prisma.user.count({ where: { studioId, isActive: true } }),
      this.prisma.user.groupBy({
        by: ["role"],
        where: { studioId, isActive: true },
        _count: true,
      }),
    ]);

    return {
      totalUsers,
      activeUsers,
      inactiveUsers: totalUsers - activeUsers,
      usersByRole: usersByRole.map((item) => ({
        role: item.role,
        count: item._count,
      })),
    };
  }
}
