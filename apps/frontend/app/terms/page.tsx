import React from 'react';
import Link from 'next/link';

export default function TermsPage() {
  return (
    <div className="min-h-screen bg-background text-foreground pt-32 pb-20 px-5 max-w-4xl mx-auto">
      <Link href="/" className="text-sm font-bold uppercase tracking-widest opacity-50 hover:opacity-100 mb-10 inline-block">
        ← Back to Home
      </Link>
      <h1 className="text-4xl font-light tracking-tighter mb-8" style={{ fontFamily: 'var(--font-serif)' }}>
        Terms of Service
      </h1>
      <div className="prose prose-invert max-w-none opacity-80 space-y-6">
        <p>Last updated: January 2026</p>
        <p>
          Welcome to ReviewsFeedback. By accessing or using our platform, you agree to comply with and be bound by the following terms and conditions.
        </p>
        <h2 className="text-2xl font-semibold mt-8 mb-4">1. Acceptance of Terms</h2>
        <p>
          By creating an account, booking a service, or listing a business on ReviewsFeedback, you confirm that you have read, understood, and agreed to these terms.
        </p>
        <h2 className="text-2xl font-semibold mt-8 mb-4">2. Professional Conduct</h2>
        <p>
          All users (both partners and customers) are expected to conduct themselves professionally. Harassment, scams, or malicious activity will result in account termination.
        </p>
        <h2 className="text-2xl font-semibold mt-8 mb-4">3. Bookings and Payments</h2>
        <p>
          Bookings are confirmed only when payment is cleared or the partner explicitly accepts the terms. Cancellation policies apply as agreed upon listing or booking a service.
        </p>
      </div>
    </div>
  );
}
