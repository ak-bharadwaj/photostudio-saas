import { Test, TestingModule } from "@nestjs/testing";
import { AuthService } from "./auth.service";
import { JwtService } from "@nestjs/jwt";
import { ConfigService } from "@nestjs/config";
import { PrismaService } from "../prisma/prisma.service";
import { CacheService } from "../cache/cache.service";
import { UnauthorizedException, ConflictException } from "@nestjs/common";
import * as bcrypt from "bcrypt";

// Mock bcrypt
jest.mock("bcrypt");

describe("AuthService", () => {
  let service: AuthService;
  let prismaService: PrismaService;
  let jwtService: JwtService;
  let cacheService: CacheService;

  const mockPrismaService: any = {
    admin: {
      findUnique: jest.fn(),
      create: jest.fn(),
    },
    user: {
      findUnique: jest.fn(),
      create: jest.fn(),
    },
    studio: {
      findUnique: jest.fn(),
    },
  };

  const mockJwtService = {
    sign: jest.fn(),
    signAsync: jest.fn(),
    verify: jest.fn(),
  };

  const mockConfigService = {
    get: jest.fn((key: string) => {
      const config: Record<string, any> = {
        JWT_SECRET: "test-secret",
        JWT_EXPIRES_IN: "1h",
        JWT_REFRESH_EXPIRES_IN: "7d",
      };
      return config[key];
    }),
  };

  const mockCacheService = {
    get: jest.fn(),
    set: jest.fn(),
    del: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuthService,
        {
          provide: PrismaService,
          useValue: mockPrismaService,
        },
        {
          provide: JwtService,
          useValue: mockJwtService,
        },
        {
          provide: ConfigService,
          useValue: mockConfigService,
        },
        {
          provide: CacheService,
          useValue: mockCacheService,
        },
      ],
    }).compile();

    service = module.get<AuthService>(AuthService);
    prismaService = module.get<PrismaService>(PrismaService);
    jwtService = module.get<JwtService>(JwtService);
    cacheService = module.get<CacheService>(CacheService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe("Admin Authentication", () => {
    describe("adminLogin", () => {
      it("should successfully login with valid credentials", async () => {
        const loginDto = {
          email: "admin@example.com",
          password: "password123",
        };

        const mockAdmin = {
          id: "admin-1",
          email: "admin@example.com",
          name: "Test Admin",
          passwordHash: "hashed_password",
        };

        mockPrismaService.admin.findUnique.mockResolvedValue(mockAdmin);
        (bcrypt.compare as jest.Mock).mockResolvedValue(true);
        mockJwtService.signAsync.mockResolvedValue("mock-token");

        const result = await service.adminLogin(loginDto);

        expect(result).toHaveProperty("admin");
        expect(result.admin.email).toBe(loginDto.email);
        expect(result).toHaveProperty("accessToken");
        expect(result).toHaveProperty("refreshToken");
        expect(mockPrismaService.admin.findUnique).toHaveBeenCalledWith({
          where: { email: loginDto.email },
        });
      });

      it("should throw UnauthorizedException with invalid email", async () => {
        const loginDto = {
          email: "invalid@example.com",
          password: "password123",
        };

        mockPrismaService.admin.findUnique.mockResolvedValue(null);

        await expect(service.adminLogin(loginDto)).rejects.toThrow(
          UnauthorizedException,
        );
        expect(mockPrismaService.admin.findUnique).toHaveBeenCalledWith({
          where: { email: loginDto.email },
        });
      });

      it("should throw UnauthorizedException with invalid password", async () => {
        const loginDto = {
          email: "admin@example.com",
          password: "wrongpassword",
        };

        const mockAdmin = {
          id: "admin-1",
          email: "admin@example.com",
          passwordHash: "hashed_password",
        };

        mockPrismaService.admin.findUnique.mockResolvedValue(mockAdmin);
        (bcrypt.compare as jest.Mock).mockResolvedValue(false);

        await expect(service.adminLogin(loginDto)).rejects.toThrow(
          UnauthorizedException,
        );
      });
    });

    describe("adminCreate", () => {
      it("should create a new admin successfully", async () => {
        const createDto = {
          email: "newadmin@example.com",
          name: "New Admin",
          password: "password123",
        };

        const mockAdmin = {
          id: "admin-2",
          email: createDto.email,
          name: createDto.name,
          passwordHash: "hashed_password",
        };

        mockPrismaService.admin.findUnique.mockResolvedValue(null);
        (bcrypt.hash as jest.Mock).mockResolvedValue("hashed_password");
        mockPrismaService.admin.create.mockResolvedValue(mockAdmin);
        mockJwtService.signAsync.mockResolvedValue("mock-token");

        const result = await service.adminCreate(createDto);

        expect(result).toHaveProperty("id");
        expect(result.email).toBe(createDto.email);
        expect(mockPrismaService.admin.create).toHaveBeenCalled();
      });

      it("should throw ConflictException if admin already exists", async () => {
        const createDto = {
          email: "existing@example.com",
          name: "Existing Admin",
          password: "password123",
        };

        const existingAdmin = {
          id: "admin-1",
          email: createDto.email,
        };

        mockPrismaService.admin.findUnique.mockResolvedValue(existingAdmin);

        await expect(service.adminCreate(createDto)).rejects.toThrow(
          ConflictException,
        );
        expect(mockPrismaService.admin.create).not.toHaveBeenCalled();
      });
    });
  });

  describe("User Authentication", () => {
    describe("userLogin", () => {
      it("should successfully login user with valid credentials", async () => {
        const loginDto = {
          email: "user@example.com",
          password: "password123",
        };

        const mockUser = {
          id: "user-1",
          email: "user@example.com",
          name: "Test User",
          passwordHash: "hashed_password",
          studioId: "studio-1",
          role: "OWNER",
          isActive: true,
          studio: {
            id: "studio-1",
            slug: "test-studio",
            status: "ACTIVE",
          },
        };

        mockPrismaService.user.findUnique.mockResolvedValue(mockUser);
        (bcrypt.compare as jest.Mock).mockResolvedValue(true);
        mockJwtService.signAsync.mockResolvedValue("mock-token");

        const result = await service.userLogin(loginDto);

        expect(result).toHaveProperty("user");
        expect(result.user).toHaveProperty("email");
        expect(result.user.email).toBe(loginDto.email);
        expect(result).toHaveProperty("accessToken");
        expect(result).toHaveProperty("refreshToken");
      });

      it("should throw UnauthorizedException if user is inactive", async () => {
        const loginDto = {
          email: "user@example.com",
          password: "password123",
        };

        const mockUser = {
          id: "user-1",
          email: "user@example.com",
          isActive: false,
        };

        mockPrismaService.user.findUnique.mockResolvedValue(mockUser);

        await expect(service.userLogin(loginDto)).rejects.toThrow(
          UnauthorizedException,
        );
      });

      it("should throw UnauthorizedException if studio is not active", async () => {
        const loginDto = {
          email: "user@example.com",
          password: "password123",
        };

        const mockUser = {
          id: "user-1",
          email: "user@example.com",
          passwordHash: "hashed_password",
          isActive: true,
          studio: {
            id: "studio-1",
            status: "SUSPENDED",
          },
        };

        mockPrismaService.user.findUnique.mockResolvedValue(mockUser);
        (bcrypt.compare as jest.Mock).mockResolvedValue(true);

        await expect(service.userLogin(loginDto)).rejects.toThrow(
          UnauthorizedException,
        );
      });
    });

    describe("userRegister", () => {
      it("should register a new user successfully", async () => {
        const registerDto = {
          email: "newuser@example.com",
          name: "New User",
          password: "password123",
        };

        const studioId = "studio-1";

        const mockUser = {
          id: "user-2",
          email: registerDto.email,
          name: registerDto.name,
          studioId: "studio-1",
          role: "OWNER",
          isActive: true,
        };

        mockPrismaService.user.findUnique.mockResolvedValue(null);
        (bcrypt.hash as jest.Mock).mockResolvedValue("hashed_password");
        mockPrismaService.user.create.mockResolvedValue(mockUser);

        const result = await service.userRegister(registerDto, studioId);

        expect(result).toHaveProperty("id");
        expect(result.email).toBe(registerDto.email);
        expect(mockPrismaService.user.create).toHaveBeenCalled();
      });

      it("should throw ConflictException if user already exists", async () => {
        const registerDto = {
          email: "existing@example.com",
          name: "Existing User",
          password: "password123",
        };

        const studioId = "studio-1";

        const existingUser = {
          id: "user-1",
          email: registerDto.email,
        };

        mockPrismaService.user.findUnique.mockResolvedValue(existingUser);

        await expect(
          service.userRegister(registerDto, studioId),
        ).rejects.toThrow(ConflictException);
        expect(mockPrismaService.user.create).not.toHaveBeenCalled();
      });
    });
  });
});
