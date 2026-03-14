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
 *  4. If a returnTo param was provided, honours it.
 *     Otherwise calls /auth/me to detect role:
 *       - STUDIO_OWNER / ADMIN → /dashboard
 *       - everyone else         → /portal
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
    const hash = window.location.hash.slice(1);
    const params = new URLSearchParams(hash);

    const token = params.get('token');
    const refreshToken = params.get('refreshToken');

    // Read returnTo from query string (optionally set by callers)
    const searchParams = new URLSearchParams(window.location.search);
    const returnTo = searchParams.get('returnTo');

    if (!token || !refreshToken) {
      setError('Authentication failed. Tokens not received.');
      return;
    }

    // Store tokens
    storageSet('accessToken', token);
    storageSet('refreshToken', refreshToken);

    // Clear the hash so tokens are removed from the URL bar
    window.history.replaceState(null, '', window.location.pathname + window.location.search);

    // If an explicit returnTo was provided, honour it
    if (returnTo && returnTo.startsWith('/')) {
      router.replace(returnTo);
      return;
    }

    // Otherwise detect user role and route accordingly
    const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';
    fetch(`${API_URL}/auth/me`, {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        const user = data?.user ?? data;
        const role: string = user?.role ?? '';
        
        // If the user is a platform admin, send them to the admin panel
        if (role === 'ADMIN' || user?.isAdmin) {
          router.replace('/admin');
        } else if (['OWNER', 'PHOTOGRAPHER', 'ASSISTANT'].includes(role)) {
          router.replace('/dashboard');
        } else {
          // Customers go to the public portal/home by default
          router.replace('/');
        }
      })
      .catch(() => {
        // If the /me call fails, fall back to home
        router.replace('/');
      });
  }, [router]);

  if (error) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="text-center">
          <h2 className="text-xl font-semibold text-[var(--danger)]">Sign-in failed</h2>
          <p className="mt-2 text-sm text-[var(--foreground-secondary)]">{error}</p>
          <a href="/portal/login" className="mt-4 inline-block text-sm text-[var(--primary)] underline">
            Back to login
          </a>
        </div>
      </div>
    );
  }

  return <LoadingPage message="Completing sign-in..." />;
}
