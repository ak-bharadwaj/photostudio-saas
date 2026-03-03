import { Injectable } from "@nestjs/common";
import { PrismaService } from "../prisma/prisma.service";
import { subDays, format } from "date-fns";

@Injectable()
export class AnalyticsService {
  constructor(private prisma: PrismaService) {}

  /**
   * Get revenue over time (daily breakdown)
   */
  async getRevenueOverTime(studioId: string, startDate: Date, endDate: Date) {
    // Query Payment records directly filtered by paidAt — this gives accurate
    // revenue attribution by actual payment date, not invoice creation date.
    const payments = await this.prisma.payment.findMany({
      where: {
        invoice: { studioId },
        paidAt: {
          gte: startDate,
          lte: endDate,
        },
      },
      select: {
        amount: true,
        paidAt: true,
      },
      orderBy: { paidAt: "asc" },
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
    payments.forEach((payment: { amount: unknown; paidAt: Date | null }) => {
      if (!payment.paidAt) return;
      const dateStr = format(payment.paidAt, "yyyy-MM-dd");
      const currentRevenue = revenueByDate.get(dateStr) || 0;
      revenueByDate.set(dateStr, currentRevenue + Number(payment.amount));
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

    return bookings.map((item: { status: string; _count: { status: number } }) => ({
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

    bookings.forEach((booking: {
      service: { name: string } | null;
      invoices: Array<{ payments: Array<{ amount: unknown }> }>;
    }) => {
      if (!booking.service) return;
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
        booking.invoices.forEach((invoice: { payments: Array<{ amount: unknown }> }) => {
          invoice.payments.forEach((payment: { amount: unknown }) => {
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

    // Returning customers (customers with 2+ bookings) — DB-level groupBy avoids loading all records
    const returningCustomerRows = await this.prisma.booking.groupBy({
      by: ["customerId"],
      where: {
        studioId,
        createdAt: { lte: endDate },
      },
      _count: { customerId: true },
      having: {
        customerId: { _count: { gte: 2 } },
      },
    });

    const returningCustomers = returningCustomerRows.length;

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
      (sum: number, payment: { amount: unknown }) => sum + Number(payment.amount),
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
    const [
      totalBookings,
      totalRevenue,
      pendingInvoices,
      completedBookings,
      inquiryCount,
      upcomingShoots,
    ] = await Promise.all([
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
            in: ["SENT", "OVERDUE", "PARTIALLY_PAID"],
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

      // Inquiry count
      this.prisma.booking.count({
        where: {
          studioId,
          status: "INQUIRY",
          createdAt: {
            gte: startDate,
            lte: endDate,
          },
        },
      }),

      // Upcoming shoots count
      this.prisma.booking.count({
        where: {
          studioId,
          scheduledAt: {
            gte: new Date(),
          },
          status: {
            in: ["CONFIRMED", "IN_PROGRESS"],
          },
        },
      }),
    ]);

    // Calculate conversion rate
    const conversionRate =
      totalBookings > 0
        ? ((completedBookings + upcomingShoots) / totalBookings) * 100
        : 0;

    return {
      totalBookings,
      totalRevenue: Number(totalRevenue._sum.amount ?? 0),
      pendingInvoices,
      completedBookings,
      inquiryCount,
      upcomingShoots,
      conversionRate: Number(conversionRate.toFixed(2)),
    };
  }
}
