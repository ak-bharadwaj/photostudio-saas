import { QueryClient } from "@tanstack/react-query";

export function makeQueryClient() {
  return new QueryClient({
    defaultOptions: {
      queries: {
        // Data is fresh for 60 seconds — prevents redundant refetches on nav
        staleTime: 60_000,
        // Keep unused data in cache for 5 minutes
        gcTime: 5 * 60_000,
        // Don't retry on 4xx errors (auth failures, not-found, etc.)
        retry: (failureCount, error: unknown) => {
          if (
            error instanceof Error &&
            "status" in error &&
            typeof (error as { status: unknown }).status === "number" &&
            (error as { status: number }).status < 500
          ) {
            return false;
          }
          return failureCount < 2;
        },
        refetchOnWindowFocus: false,
      },
    },
  });
}

// Browser singleton — one QueryClient for the whole browser session
let browserQueryClient: QueryClient | undefined = undefined;

export function getQueryClient() {
  if (typeof window === "undefined") {
    // Server: always create a fresh client (no shared state between requests)
    return makeQueryClient();
  }
  if (!browserQueryClient) {
    browserQueryClient = makeQueryClient();
  }
  return browserQueryClient;
}
