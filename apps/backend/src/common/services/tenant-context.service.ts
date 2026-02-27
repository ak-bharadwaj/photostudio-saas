import { Injectable, Scope } from "@nestjs/common";
import { AsyncLocalStorage } from "async_hooks";

@Injectable({ scope: Scope.DEFAULT })
export class TenantContextService {
  private static readonly storage = new AsyncLocalStorage<string>();

  setTenantId(tenantId: string) {
    return TenantContextService.storage.enterWith(tenantId);
  }

  getTenantId(): string | undefined {
    return TenantContextService.storage.getStore();
  }

  runWithTenantId<T>(tenantId: string, fn: () => T): T {
    return TenantContextService.storage.run(tenantId, fn);
  }
}
