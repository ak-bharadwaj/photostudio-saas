'use client';

/**
 * /auth/callback
 *
 * Landing page for the Google OAuth redirect.
 * The backend sends tokens in the URL *fragment* (hash) so they are never
 * logged by servers or stored in browser history.
 *
 * This page:
 *  1. Reads tokens from window.location.hash
 *  2. Stores them safely
 *  3. Clears the hash (replaceState) so tokens don't linger in the URL bar
 *  4. Redirects to the returnTo path (or /portal by default)
 */

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { LoadingPage } from '@/components/ui/loading';

function storageSet(key: string, value: string) {
  try { localStorage.setItem(key, value); } catch { /* quota / private mode */ }
}

export default function AuthCallbackPage() {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    // Parse the URL fragment: #token=...&refreshToken=...
    const hash = window.location.hash.slice(1); // strip leading '#'
    const params = new URLSearchParams(hash);

    const token = params.get('token');
    const refreshToken = params.get('refreshToken');

    // Read returnTo from query string (set by backend redirect)
    const searchParams = new URLSearchParams(window.location.search);
    const returnTo = searchParams.get('returnTo') || '/portal';
    const safeReturnTo = returnTo.startsWith('/') ? returnTo : '/portal';

    if (!token || !refreshToken) {
      setError('Authentication failed. Tokens not received.');
      return;
    }

    // Store tokens
    storageSet('accessToken', token);
    storageSet('refreshToken', refreshToken);

    // Immediately clear the hash so tokens are removed from the URL bar
    window.history.replaceState(null, '', window.location.pathname + window.location.search);

    // Navigate to destination
    router.replace(safeReturnTo);
  }, [router]);

  if (error) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="text-center">
          <h2 className="text-xl font-semibold text-[var(--danger)]">Sign-in failed</h2>
          <p className="mt-2 text-sm text-[var(--foreground-secondary)]">{error}</p>
          <a href="/login" className="mt-4 inline-block text-sm text-[var(--primary)] underline">
            Back to login
          </a>
        </div>
      </div>
    );
  }

  return <LoadingPage message="Completing sign-in..." />;
}
