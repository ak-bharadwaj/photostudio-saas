import React from 'react';
import Link from 'next/link';

export default function PrivacyPage() {
  return (
    <div className="min-h-screen bg-background text-foreground pt-32 pb-20 px-5 max-w-4xl mx-auto">
      <Link href="/" className="text-sm font-bold uppercase tracking-widest opacity-50 hover:opacity-100 mb-10 inline-block">
        ← Back to Home
      </Link>
      <h1 className="text-4xl font-light tracking-tighter mb-8" style={{ fontFamily: 'var(--font-serif)' }}>
        Privacy Policy
      </h1>
      <div className="prose prose-invert max-w-none opacity-80 space-y-6">
        <p>Last updated: January 2026</p>
        <p>
          At ReviewsFeedback, we take your privacy seriously. This document outlines how we collect, use, and protect your personal information when you use our platform.
        </p>
        <h2 className="text-2xl font-semibold mt-8 mb-4">1. Information We Collect</h2>
        <p>
          When you register for an account, book a studio, or list a service on ReviewsFeedback, we ask for personal information such as your name, email address, phone number, and payment details.
        </p>
        <h2 className="text-2xl font-semibold mt-8 mb-4">2. How We Use Information</h2>
        <p>
          We use your information to facilitate bookings, communicate important platform updates, process payments securely through our providers, and improve the overall user experience.
        </p>
        <h2 className="text-2xl font-semibold mt-8 mb-4">3. Data Sharing</h2>
        <p>
          We do not sell your personal data. We only share necessary details with the studio you book (or with the customer booking your studio) to ensure the service can be completed smoothly.
        </p>
      </div>
    </div>
  );
}
