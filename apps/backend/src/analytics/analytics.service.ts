import { Injectable } from "@nestjs/common";
import { PrismaService } from "../prisma/prisma.service";
import { startOfDay, endOfDay, subDays, format } from "date-fns";

@Injectable()
export class AnalyticsService {
  constructor(private prisma: PrismaService) {}

  /**
   * Get revenue over time (daily breakdown)
   */
  async getRevenueOverTime(studioId: string, startDate: Date, endDate: Date) {
    // Get all paid invoices in the date range
    const invoices = await this.prisma.invoice.findMany({
      where: {
        studioId,
        status: {
          in: ["PAID", "PARTIALLY_PAID"],
        },
        createdAt: {
          gte: startDate,
          lte: endDate,
        },
      },
      include: {
        payments: true,
      },
      orderBy: {
        createdAt: "asc",
      },
    });

    // Group by date
    const revenueByDate = new Map<string, number>();

    // Initialize all dates in range with 0
    let currentDate = new Date(startDate);
    while (currentDate <= endDate) {
      const dateStr = format(currentDate, "yyyy-MM-dd");
      revenueByDate.set(dateStr, 0);
      currentDate = new Date(currentDate.setDate(currentDate.getDate() + 1));
    }

    // Sum payments by date
    invoices.forEach((invoice) => {
      invoice.payments.forEach((payment) => {
        const dateStr = format(payment.paidAt, "yyyy-MM-dd");
        const currentRevenue = revenueByDate.get(dateStr) || 0;
        revenueByDate.set(dateStr, currentRevenue + Number(payment.amount));
      });
    });

    // Convert to array format for chart
    return Array.from(revenueByDate.entries())
      .map(([date, revenue]) => ({
        date,
        revenue: Number(revenue.toFixed(2)),
      }))
      .sort((a, b) => a.date.localeCompare(b.date));
  }

  /**
   * Get bookings by status
   */
  async getBookingsByStatus(studioId: string, startDate: Date, endDate: Date) {
    const bookings = await this.prisma.booking.groupBy({
      by: ["status"],
      where: {
        studioId,
        createdAt: {
          gte: startDate,
          lte: endDate,
        },
      },
      _count: {
        status: true,
      },
    });

    return bookings.map((item) => ({
      status: item.status,
      count: item._count.status,
    }));
  }

  /**
   * Get service performance (bookings and revenue per service)
   */
  async getServicePerformance(
    studioId: string,
    startDate: Date,
    endDate: Date,
  ) {
    const bookings = await this.prisma.booking.findMany({
      where: {
        studioId,
        createdAt: {
          gte: startDate,
          lte: endDate,
        },
      },
      include: {
        service: true,
        invoices: {
          include: {
            payments: true,
          },
        },
      },
    });

    // Group by service
    const serviceMap = new Map<
      string,
      { name: string; bookings: number; revenue: number }
    >();

    bookings.forEach((booking) => {
      const serviceName = booking.service.name;

      if (!serviceMap.has(serviceName)) {
        serviceMap.set(serviceName, {
          name: serviceName,
          bookings: 0,
          revenue: 0,
        });
      }

      const serviceData = serviceMap.get(serviceName);
      if (serviceData) {
        serviceData.bookings += 1;

        // Sum revenue from all payments for this booking
        booking.invoices.forEach((invoice) => {
          invoice.payments.forEach((payment) => {
            serviceData.revenue += Number(payment.amount);
          });
        });
      }
    });

    return Array.from(serviceMap.values()).map((item) => ({
      ...item,
      revenue: Number(item.revenue.toFixed(2)),
    }));
  }

  /**
   * Get customer insights
   */
  async getCustomerInsights(studioId: string, startDate: Date, endDate: Date) {
    // Total customers
    const totalCustomers = await this.prisma.customer.count({
      where: {
        studioId,
        createdAt: {
          lte: endDate,
        },
      },
    });

    // New customers in date range
    const newCustomers = await this.prisma.customer.count({
      where: {
        studioId,
        createdAt: {
          gte: startDate,
          lte: endDate,
        },
      },
    });

    // Returning customers (customers with 2+ bookings)
    const customersWithBookings = await this.prisma.customer.findMany({
      where: {
        studioId,
        bookings: {
          some: {
            createdAt: {
              gte: startDate,
              lte: endDate,
            },
          },
        },
      },
      include: {
        bookings: {
          where: {
            createdAt: {
              lte: endDate,
            },
          },
        },
      },
    });

    const returningCustomers = customersWithBookings.filter(
      (customer) => customer.bookings.length >= 2,
    ).length;

    // Total revenue in period
    const payments = await this.prisma.payment.findMany({
      where: {
        invoice: {
          studioId,
        },
        paidAt: {
          gte: startDate,
          lte: endDate,
        },
      },
    });

    const totalRevenue = payments.reduce(
      (sum, payment) => sum + Number(payment.amount),
      0,
    );

    // Average revenue per customer
    const averageRevenuePerCustomer =
      totalCustomers > 0 ? totalRevenue / totalCustomers : 0;

    return {
      totalCustomers,
      newCustomers,
      returningCustomers,
      totalRevenue: Number(totalRevenue.toFixed(2)),
      averageRevenuePerCustomer: Number(averageRevenuePerCustomer.toFixed(2)),
    };
  }

  /**
   * Get overview stats
   */
  async getOverviewStats(studioId: string, startDate: Date, endDate: Date) {
    const [totalBookings, totalRevenue, pendingInvoices, completedBookings] =
      await Promise.all([
        // Total bookings
        this.prisma.booking.count({
          where: {
            studioId,
            createdAt: {
              gte: startDate,
              lte: endDate,
            },
          },
        }),

        // Total revenue (sum of payments)
        this.prisma.payment.aggregate({
          where: {
            invoice: {
              studioId,
            },
            paidAt: {
              gte: startDate,
              lte: endDate,
            },
          },
          _sum: {
            amount: true,
          },
        }),

        // Pending invoices
        this.prisma.invoice.count({
          where: {
            studioId,
            status: {
              in: ["SENT", "OVERDUE"],
            },
            createdAt: {
              gte: startDate,
              lte: endDate,
            },
          },
        }),

        // Completed bookings
        this.prisma.booking.count({
          where: {
            studioId,
            status: "COMPLETED",
            createdAt: {
              gte: startDate,
              lte: endDate,
            },
          },
        }),
      ]);

    return {
      totalBookings,
      totalRevenue: Number((totalRevenue._sum.amount || 0).toString()),
      pendingInvoices,
      completedBookings,
    };
  }
}
