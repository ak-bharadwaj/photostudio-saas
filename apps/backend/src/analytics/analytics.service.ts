import { Injectable } from "@nestjs/common";
import { PrismaService } from "../prisma/prisma.service";
import { CacheService } from "../cache/cache.service";
import { subDays, format } from "date-fns";

@Injectable()
export class AnalyticsService {
  constructor(
    private prisma: PrismaService,
    private cacheService: CacheService,
  ) {}

  /**
   * Get revenue over time (daily breakdown)
   */
  async getRevenueOverTime(studioId: string, startDate: Date, endDate: Date) {
    // Query Payment records directly filtered by paidAt — this gives accurate
    // revenue attribution by actual payment date, not invoice creation date.
    // Query PAID invoices to calculate revenue
    const invoices = await this.prisma.invoice.findMany({
      where: {
        studioId,
        status: "PAID",
        updatedAt: {
          gte: startDate,
          lte: endDate,
        },
      },
      select: {
        total: true,
        updatedAt: true,
      },
      orderBy: { updatedAt: "asc" },
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

    // Sum invoices by date
    invoices.forEach((invoice: { total: unknown; updatedAt: Date }) => {
      const dateStr = format(invoice.updatedAt, "yyyy-MM-dd");
      const currentRevenue = revenueByDate.get(dateStr) || 0;
      revenueByDate.set(dateStr, currentRevenue + Number(invoice.total));
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

    return bookings.map(
      (item: { status: string; _count: { status: number } }) => ({
        status: item.status,
        count: item._count.status,
      }),
    );
  }

  /**
   * Get service performance (bookings and revenue per service)
   */
  async getServicePerformance(
    studioId: string,
    startDate: Date,
    endDate: Date,
  ) {
    const cacheKey = `analytics:service-perf:${studioId}:${startDate.toISOString()}:${endDate.toISOString()}`;
    const cached =
      await this.cacheService.get<
        Array<{ name: string; bookings: number; revenue: number }>
      >(cacheKey);
    if (cached) return cached;

    const bookings = await this.prisma.booking.findMany({
      where: {
        studioId,
        createdAt: {
          gte: startDate,
          lte: endDate,
        },
      },
      select: {
        service: {
          select: { name: true },
        },
        invoices: {
          select: {
            total: true,
            status: true,
            payments: {
              select: { amount: true },
            },
          },
        },
      },
    });

    const serviceMap = new Map<
      string,
      { name: string; bookings: number; revenue: number }
    >();

    bookings.forEach(
      (booking: {
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
          booking.invoices.forEach(
            (invoice: {
              total: unknown;
              status: string;
              payments: Array<{ amount: unknown }>;
            }) => {
              if (invoice.status === "PAID") {
                serviceData.revenue += Number(invoice.total || 0);
              } else {
                invoice.payments.forEach((payment: { amount: unknown }) => {
                  serviceData.revenue += Number(payment.amount || 0);
                });
              }
            },
          );
        }
      },
    );

    const result = Array.from(serviceMap.values()).map((item) => ({
      ...item,
      revenue: Number(item.revenue.toFixed(2)),
    }));

    await this.cacheService.set(cacheKey, result, 300);
    return result;
  }

  /**
   * Get customer insights
   */
  async getCustomerInsights(studioId: string, startDate: Date, endDate: Date) {
    const cacheKey = `analytics:customer-insights:${studioId}:${startDate.toISOString()}:${endDate.toISOString()}`;
    const cached = await this.cacheService.get<{
      totalCustomers: number;
      newCustomers: number;
      returningCustomers: number;
      totalRevenue: number;
      averageRevenuePerCustomer: number;
    }>(cacheKey);
    if (cached) return cached;

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

    // Total revenue in period — select only amount to avoid fetching full Payment model
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
      select: { amount: true },
    });

    const totalRevenue = payments.reduce(
      (sum: number, payment: { amount: unknown }) =>
        sum + Number(payment.amount || 0),
      0,
    );

    // Average revenue per customer
    const averageRevenuePerCustomer =
      totalCustomers > 0 ? totalRevenue / totalCustomers : 0;

    const result = {
      totalCustomers,
      newCustomers,
      returningCustomers,
      totalRevenue: Number(totalRevenue.toFixed(2)),
      averageRevenuePerCustomer: Number(averageRevenuePerCustomer.toFixed(2)),
    };

    await this.cacheService.set(cacheKey, result, 300);
    return result;
  }

  /**
   * Get overview stats
   */
  async getOverviewStats(studioId: string, startDate: Date, endDate: Date) {
    const cacheKey = `analytics:overview:${studioId}:${startDate.toISOString()}:${endDate.toISOString()}`;
    const cached = await this.cacheService.get<{
      totalBookings: number;
      totalRevenue: number;
      pendingInvoices: number;
      completedBookings: number;
      inquiryCount: number;
      upcomingShoots: number;
      conversionRate: number;
    }>(cacheKey);
    if (cached) return cached;

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

      // Total revenue (sum of PAID invoices)
      this.prisma.invoice.aggregate({
        where: {
          studioId,
          status: "PAID",
          updatedAt: {
            // Using updatedAt as a proxy for payment/completion date
            gte: startDate,
            lte: endDate,
          },
        },
        _sum: {
          total: true,
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

    const result = {
      totalBookings,
      totalRevenue: Number(totalRevenue._sum.total ?? 0),
      pendingInvoices,
      completedBookings,
      inquiryCount,
      upcomingShoots,
      conversionRate: Number(conversionRate.toFixed(2)),
    };

    await this.cacheService.set(cacheKey, result, 300);
    return result;
  }
}
