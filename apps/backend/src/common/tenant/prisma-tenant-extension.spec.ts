import { tenantExtension } from "./prisma-tenant.extension";
import { tenantContext } from "./tenant-context";

describe("PrismaTenantExtension", () => {
  let mockQuery: jest.Mock;
  let extensionHandlers: any;

  beforeAll(() => {
    // We need to extract the handlers from the extension.
    // Since Prisma.defineExtension returns a function that expects a client,
    // we can pass a mock client and see what it returns.
    const mockClient = {
      $extends: jest.fn().mockImplementation((ext) => ext),
    };

    // In our implementation, tenantExtension is:
    // Prisma.defineExtension((client) => client.$extends({ query: { $allModels: { ... } } }))
    // So calling it with mockClient will return what client.$extends returns.
    const result = (tenantExtension as any)(mockClient);
    extensionHandlers = result.query.$allModels;
  });

  beforeEach(() => {
    mockQuery = jest.fn().mockImplementation((args) => Promise.resolve(args));
  });

  const runTestQuery = async (
    operation: string,
    model: string,
    args: any,
    studioId: string | null,
    isAdmin: boolean,
  ) => {
    const handler = extensionHandlers[operation];
    return await tenantContext.run({ studioId, isAdmin }, async () => {
      const queryParams = {
        model,
        operation,
        args,
        query: mockQuery,
      };
      return await handler(queryParams);
    });
  };

  it("should filter findMany by studioId when tenant context is active", async () => {
    const studioId = "studio-123";
    const args = { where: { active: true } };

    await runTestQuery("findMany", "User", args, studioId, false);

    expect(mockQuery).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          active: true,
          studioId: studioId,
        }),
      }),
    );
  });

  it("should NOT filter findMany when isAdmin is true", async () => {
    const studioId = "studio-123";
    const args = { where: { active: true } };

    await runTestQuery("findMany", "User", args, studioId, true);

    expect(mockQuery).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { active: true },
      }),
    );
    expect(mockQuery.mock.calls[0][0].where.studioId).toBeUndefined();
  });

  it("should filter update operations", async () => {
    const studioId = "studio-123";
    const args = { where: { id: "user-1" }, data: { name: "New Name" } };

    await runTestQuery("update", "User", args, studioId, false);

    expect(mockQuery).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          id: "user-1",
          studioId: studioId,
        }),
      }),
    );
  });

  it("should NOT filter non-tenant models", async () => {
    const studioId = "studio-123";
    const args = { where: { id: "admin-1" } };

    await runTestQuery("findMany", "Admin", args, studioId, false);

    expect(mockQuery).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: "admin-1" },
      }),
    );
  });

  it("should security check findUnique and return null if mismatch", async () => {
    const studioId = "studio-123";
    const otherStudioId = "studio-456";
    const args = { where: { id: "user-1" } };

    // Mock the query to return a record from a different studio
    mockQuery.mockResolvedValue({ id: "user-1", studioId: otherStudioId });

    const result = await runTestQuery(
      "findUnique",
      "User",
      args,
      studioId,
      false,
    );

    expect(result).toBeNull();
  });

  it("should return record in findUnique if studioId matches", async () => {
    const studioId = "studio-123";
    const args = { where: { id: "user-1" } };
    const mockRecord = { id: "user-1", studioId };

    mockQuery.mockResolvedValue(mockRecord);

    const result = await runTestQuery(
      "findUnique",
      "User",
      args,
      studioId,
      false,
    );

    expect(result).toEqual(mockRecord);
  });

  it("should inject studioId on create", async () => {
    const studioId = "studio-123";
    const args = { data: { name: "New User" } };

    await runTestQuery("create", "User", args, studioId, false);

    expect(mockQuery).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          name: "New User",
          studioId: studioId,
        }),
      }),
    );
  });
});
