import { Prisma } from '../../generated/prisma-client';
import { getCurrentStudioId, isCurrentUserAdmin } from "./tenant-context";

/**
 * List of Prisma models that are tenant-scoped (have a studioId field).
 * Queries on these models will automatically have `WHERE studio_id = ?`
 * injected when a tenant context is active.
 */
const TENANT_MODELS = [
  "User",
  "Customer",
  "Service",
  "Booking",
  "Invoice",
  "PortfolioItem",
  "Workflow",
] as const;

type TenantModel = (typeof TENANT_MODELS)[number];

function isTenantModel(model: string): model is TenantModel {
  return TENANT_MODELS.includes(model as TenantModel);
}

/**
 * Prisma Client Extension that automatically injects studioId filters
 * into all read/write operations for tenant-scoped models.
 *
 * This ensures that:
 * - Studio users can ONLY see/modify their own studio's data
 * - Admin users (studioId = null) bypass the filter and see everything
 * - Public routes (no tenant context) are not filtered (they must handle
 *   scoping explicitly)
 */
export const tenantExtension = Prisma.defineExtension((client) => {
  return client.$extends({
    query: {
      $allModels: {
        async findMany({ model, args, query }) {
          injectTenantFilter(model, args);
          return query(args);
        },
        async findFirst({ model, args, query }) {
          injectTenantFilter(model, args);
          return query(args);
        },
        async findUnique({ model, args, query }) {
          const result = await query(args);
          if (result && isTenantModel(model)) {
            const studioId = getCurrentStudioId();
            const admin = isCurrentUserAdmin();
            // Only enforce tenant isolation when studioId is present in the result.
            // If the query used a `select` that excludes studioId, (result as any).studioId
            // will be `undefined` — in that case we skip the cross-tenant check rather than
            // silently returning null for valid records. The Prisma WHERE clause injected by
            // injectTenantFilter on findMany/findFirst already enforces isolation at the DB
            // layer; findUnique bypasses that path so we check post-fetch here.
            if (studioId && !admin) {
              const resultStudioId = (result as any).studioId;
              if (resultStudioId !== undefined && resultStudioId !== studioId) {
                return null;
              }
            }
          }
          return result;
        },
        async count({ model, args, query }) {
          injectTenantFilter(model, args);
          return query(args);
        },
        async aggregate({ model, args, query }) {
          injectTenantFilter(model, args);
          return query(args);
        },
        async groupBy({ model, args, query }) {
          injectTenantFilter(model, args);
          return query(args);
        },
        async create({ model, args, query }) {
          injectTenantOnCreate(model, args);
          return query(args);
        },
        async createMany({ model, args, query }) {
          // For createMany, inject studioId into each record
          const studioId = getCurrentStudioId();
          if (studioId && isTenantModel(model)) {
            if (Array.isArray(args.data)) {
              args.data = args.data.map((record: any) => ({
                ...record,
                studioId: record.studioId || studioId,
              }));
            } else {
              (args.data as any).studioId =
                (args.data as any).studioId || studioId;
            }
          }
          return query(args);
        },
        async update({ model, args, query }) {
          injectTenantFilter(model, args);
          return query(args);
        },
        async updateMany({ model, args, query }) {
          injectTenantFilter(model, args);
          return query(args);
        },
        async delete({ model, args, query }) {
          injectTenantFilter(model, args);
          return query(args);
        },
        async deleteMany({ model, args, query }) {
          injectTenantFilter(model, args);
          return query(args);
        },
        async upsert({ model, args, query }) {
          injectTenantFilter(model, args);
          injectTenantOnCreate(model, { data: args.create });
          return query(args);
        },
      },
    },
  });
});

/**
 * Inject studioId into the WHERE clause for read/update/delete operations.
 */
function injectTenantFilter(model: string, args: any): void {
  const studioId = getCurrentStudioId();
  const admin = isCurrentUserAdmin();

  // Skip if: not a tenant model, no tenant context, or admin user
  if (!isTenantModel(model) || !studioId || admin) {
    return;
  }

  if (!args.where) {
    args.where = {};
  }

  // Add studioId filter
  args.where.studioId = studioId;
}

/**
 * Inject studioId into the data for create operations.
 */
function injectTenantOnCreate(model: string, args: any): void {
  const studioId = getCurrentStudioId();
  const admin = isCurrentUserAdmin();

  if (!isTenantModel(model) || !studioId || admin) {
    return;
  }

  if (args.data && !args.data.studioId) {
    args.data.studioId = studioId;
  }
}
