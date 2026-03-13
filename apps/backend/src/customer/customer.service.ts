import {
  Injectable,
  NotFoundException,
  ConflictException,
} from "@nestjs/common";
import { PrismaService } from "../prisma/prisma.service";
import { Prisma } from '../../prisma/generated-client';
import { CreateCustomerDto, UpdateCustomerDto } from "./dto/customer.dto";

@Injectable()
export class CustomerService {
  constructor(private prisma: PrismaService) {}

  async create(dto: CreateCustomerDto, studioId: string) {
    // Check if customer with same phone exists in this studio
    const existingCustomer = await this.prisma.customer.findFirst({
      where: {
        phone: dto.phone,
        studioId,
      },
    });

    if (existingCustomer) {
      throw new ConflictException(
        "Customer with this phone number already exists",
      );
    }

    // Check if customer with same email exists in this studio
    if (dto.email) {
      const existingEmail = await this.prisma.customer.findFirst({
        where: {
          email: dto.email,
          studioId,
        },
      });

      if (existingEmail) {
        throw new ConflictException(
          "Customer with this email address already exists",
        );
      }
    }

    return this.prisma.customer.create({
      data: {
        ...dto,
        studioId,
      },
    });
  }

  async findAll(
    studioId: string,
    page: number = 1,
    limit: number = 10,
    search?: string,
  ) {
    const skip = (page - 1) * limit;

    const where: Prisma.CustomerWhereInput = { studioId };
    if (search) {
      where.OR = [
        { name: { contains: search, mode: "insensitive" } },
        { email: { contains: search, mode: "insensitive" } },
        { phone: { contains: search } },
      ];
    }

    const [customers, total] = await Promise.all([
      this.prisma.customer.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: "desc" },
        include: {
          _count: {
            select: {
              bookings: true,
              invoices: true,
            },
          },
        },
      }),
      this.prisma.customer.count({ where }),
    ]);

    return {
      data: customers,
      meta: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  async findOne(id: string, studioId: string) {
    const customer = await this.prisma.customer.findFirst({
      where: {
        id,
        studioId,
      },
      include: {
        bookings: {
          include: {
            service: true,
          },
          orderBy: { scheduledAt: "desc" },
          take: 10,
        },
        invoices: {
          orderBy: { createdAt: "desc" },
          take: 10,
        },
        _count: {
          select: {
            bookings: true,
            invoices: true,
          },
        },
      },
    });

    if (!customer) {
      throw new NotFoundException("Customer not found");
    }

    return customer;
  }

  async update(id: string, dto: UpdateCustomerDto, studioId: string) {
    const customer = await this.prisma.customer.findFirst({
      where: {
        id,
        studioId,
      },
    });

    if (!customer) {
      throw new NotFoundException("Customer not found");
    }

    // If updating phone, check for conflicts
    if (dto.phone && dto.phone !== customer.phone) {
      const existingCustomer = await this.prisma.customer.findFirst({
        where: {
          phone: dto.phone,
          studioId,
          id: { not: id },
        },
      });

      if (existingCustomer) {
        throw new ConflictException(
          "Another customer with this phone number already exists",
        );
      }
    }

    // If updating email, check for conflicts
    if (dto.email && dto.email !== customer.email) {
      const existingEmail = await this.prisma.customer.findFirst({
        where: {
          email: dto.email,
          studioId,
          id: { not: id },
        },
      });

      if (existingEmail) {
        throw new ConflictException(
          "Another customer with this email address already exists",
        );
      }
    }

    return this.prisma.customer.update({
      where: { id },
      data: dto,
    });
  }

  async remove(id: string, studioId: string) {
    const customer = await this.prisma.customer.findFirst({
      where: {
        id,
        studioId,
      },
      include: {
        _count: {
          select: {
            bookings: true,
            invoices: true,
          },
        },
      },
    });

    if (!customer) {
      throw new NotFoundException("Customer not found");
    }

    // Check if customer has any bookings or invoices
    if (customer._count.bookings > 0 || customer._count.invoices > 0) {
      throw new ConflictException(
        "Cannot delete customer with existing bookings or invoices",
      );
    }

    await this.prisma.customer.delete({
      where: { id },
    });

    return { message: "Customer deleted successfully" };
  }

  async getStats(id: string, studioId: string) {
    const customer = await this.prisma.customer.findFirst({
      where: {
        id,
        studioId,
      },
    });

    if (!customer) {
      throw new NotFoundException("Customer not found");
    }

    const [totalBookings, pendingInvoices, totalSpent, lastBooking] =
      await Promise.all([
        this.prisma.booking.count({
          where: {
            customerId: id,
            studioId,
          },
        }),
        this.prisma.invoice.count({
          where: {
            customerId: id,
            studioId,
            status: { in: ["DRAFT", "SENT", "PARTIALLY_PAID", "OVERDUE"] },
          },
        }),
        this.prisma.invoice.aggregate({
          where: {
            customerId: id,
            studioId,
            status: "PAID",
          },
          _sum: {
            total: true,
          },
        }),
        this.prisma.booking.findFirst({
          where: {
            customerId: id,
            studioId,
          },
          orderBy: { scheduledAt: "desc" },
          include: {
            service: true,
          },
        }),
      ]);

    return {
      totalBookings,
      pendingInvoices,
      totalRevenue: totalSpent._sum.total ? Number(totalSpent._sum.total) : 0,
      lastBooking,
    };
  }
}
