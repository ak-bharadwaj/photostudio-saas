import { AsyncLocalStorage } from "async_hooks";

export interface TenantContextData {
  studioId: string | null;
  isAdmin: boolean;
}

/**
 * AsyncLocalStorage-based tenant context.
 * Stores the current studio ID for the duration of a request.
 * The Prisma Extension reads from this to auto-inject WHERE studioId = ...
 */
export const tenantContext = new AsyncLocalStorage<TenantContextData>();

export function getCurrentTenant(): TenantContextData | undefined {
  return tenantContext.getStore();
}

export function getCurrentStudioId(): string | null {
  const ctx = tenantContext.getStore();
  return ctx?.studioId ?? null;
}

export function isCurrentUserAdmin(): boolean {
  const ctx = tenantContext.getStore();
  return ctx?.isAdmin ?? false;
}
