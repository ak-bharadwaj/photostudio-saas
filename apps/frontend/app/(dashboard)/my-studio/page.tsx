'use client';

import React, { useEffect, useState, useCallback, useRef } from 'react';
import Link from 'next/link';
import { useAuthStore } from '@/lib/auth-store';
import { bookingsApi } from '@/lib/api';
import { formatCurrency, formatDate, getBookingStatusBadge } from '@/lib/utils';
import { useToast } from '@/components/ui/toast';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Link2,
  Copy,
  QrCode,
  ExternalLink,
  Palette,
  Share2,
  Sparkles,
  Check,
  Calendar,
  Clock,
  ChevronRight,
  MessageSquare,
  Globe,
  Smartphone,
  Code2,
  Twitter,
  Facebook,
  Instagram,
  Mail,
  Eye,
} from 'lucide-react';
import { PageHeader } from '@/components/ui/page-header';

/* -------------------------------------------------------------------------- */
/*  Types                                                                     */
/* -------------------------------------------------------------------------- */
interface Booking {
  id: string | number;
  scheduledAt: string;
  bookingDate?: string;
  status: string;
  notes?: string;
  quoteAmount?: number;
  quoteNotes?: string;
  customer: { name: string; email: string };
  service: { name: string; price: number };
}

/* -------------------------------------------------------------------------- */
/*  QR Code component (CSS-based placeholder that's actually useful)          */
/* -------------------------------------------------------------------------- */
function QRDisplay({ url }: { url: string }) {
  const [qrSrc, setQrSrc] = useState<string>('');

  useEffect(() => {
    // Use a public QR API — no key needed
    setQrSrc(`https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(url)}&bgcolor=ffffff&color=7c3aed&margin=12`);
  }, [url]);

  if (!qrSrc) return (
    <div className="h-[200px] w-[200px] rounded-2xl bg-[var(--surface-2)] animate-pulse flex items-center justify-center">
      <QrCode className="h-10 w-10 text-[var(--foreground-tertiary)]" />
    </div>
  );

  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={qrSrc}
      alt="QR Code for booking page"
      className="h-[200px] w-[200px] rounded-2xl border border-[var(--border-light)] shadow-md"
    />
  );
}

/* -------------------------------------------------------------------------- */
/*  Share Button                                                              */
/* -------------------------------------------------------------------------- */
function ShareBtn({ icon: Icon, label, onClick, color }: {
  icon: React.ComponentType<React.SVGProps<SVGSVGElement>>;
  label: string;
  onClick: () => void;
  color: string;
}) {
  return (
    <button
      onClick={onClick}
      className="flex flex-col items-center gap-2 p-3 rounded-[var(--radius-lg)] border border-[var(--border-light)] hover:border-[var(--border-strong)] hover:-translate-y-0.5 hover:shadow-md transition-all duration-200 bg-[var(--surface-0)] group min-w-[72px]"
    >
      <div className="h-9 w-9 rounded-xl flex items-center justify-center transition-transform group-hover:scale-110" style={{ background: color + '18' }}>
        <Icon className="h-4 w-4" style={{ color }} />
      </div>
      <span className="text-[10px] font-semibold text-[var(--foreground-tertiary)]">{label}</span>
    </button>
  );
}

/* -------------------------------------------------------------------------- */
/*  Quote Status Row                                                          */
/* -------------------------------------------------------------------------- */
function QuoteRow({ booking }: { booking: Booking }) {
  const { variant } = getBookingStatusBadge(booking.status);
  const date = booking.scheduledAt || booking.bookingDate || '';
  return (
    <Link
      href={`/bookings/${booking.id}`}
      className="flex items-center gap-3 p-3 rounded-[var(--radius-md)] hover:bg-[var(--overlay-light)] transition-colors duration-150 group"
    >
      <div className="h-9 w-9 rounded-xl flex items-center justify-center shrink-0 text-xs font-bold text-[var(--primary)]"
        style={{ background: 'color-mix(in srgb, var(--primary) 10%, transparent)' }}>
        {(booking.customer?.name || '?').charAt(0).toUpperCase()}
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-semibold text-[var(--foreground)] truncate">{booking.customer?.name || 'Unknown'}</p>
        <p className="text-xs text-[var(--foreground-tertiary)] flex items-center gap-1 mt-0.5 truncate">
          <Clock className="h-3 w-3 shrink-0" />
          {booking.service?.name} · {formatDate(date)}
        </p>
        {booking.quoteAmount && (
          <p className="text-xs text-[var(--primary)] font-semibold mt-0.5">
            Quote: {formatCurrency(booking.quoteAmount)}
            {booking.quoteNotes && <span className="text-[var(--foreground-tertiary)] font-normal"> · {booking.quoteNotes.slice(0, 40)}{booking.quoteNotes.length > 40 ? '…' : ''}</span>}
          </p>
        )}
      </div>
      <div className="flex items-center gap-2 shrink-0">
        <Badge variant={variant} dot>{booking.status}</Badge>
        <ChevronRight className="h-3.5 w-3.5 text-[var(--foreground-tertiary)] opacity-0 group-hover:opacity-100 transition-opacity" />
      </div>
    </Link>
  );
}

/* -------------------------------------------------------------------------- */
/*  Page                                                                      */
/* -------------------------------------------------------------------------- */
export default function MyStudioPage() {
  const { user } = useAuthStore();
  const { addToast } = useToast();
  const [copied, setCopied] = useState(false);
  const [embedCopied, setEmbedCopied] = useState(false);
  const [pendingBookings, setPendingBookings] = useState<Booking[]>([]);
  const [quotedBookings, setQuotedBookings] = useState<Booking[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const abortRef = useRef<AbortController | null>(null);

  const slug = user?.studio?.slug || '';
  const studioName = user?.studio?.name || 'Your Business';
  const origin = typeof window !== 'undefined' ? window.location.origin : 'https://yourdomain.com';
  const bookingUrl = slug ? `${origin}/studio/${slug}` : '';

  const embedCode = `<iframe
  src="${bookingUrl}"
  width="100%"
  height="700"
  frameborder="0"
  allow="camera; microphone"
  style="border-radius:16px; border:1px solid #e5e7eb;"
></iframe>`;

  const loadBookings = useCallback(async () => {
    abortRef.current?.abort();
    const ctrl = new AbortController();
    abortRef.current = ctrl;
    try {
      setIsLoading(true);
      const res = await bookingsApi.getAll({ limit: 50 });
      if (ctrl.signal.aborted) return;
      const all: Booking[] = res.data?.data || [];
      setPendingBookings(all.filter((b) => b.status === 'INQUIRY' || b.status === 'PENDING'));
      setQuotedBookings(all.filter((b) => b.status === 'QUOTED'));
    } catch {
      if (abortRef.current?.signal.aborted) return;
      addToast('error', 'Failed to load bookings');
    } finally {
      if (!abortRef.current?.signal.aborted) setIsLoading(false);
    }
  }, [addToast]);

  useEffect(() => {
    loadBookings();
    return () => abortRef.current?.abort();
  }, [loadBookings]);

  const copyUrl = () => {
    if (!bookingUrl) return;
    navigator.clipboard.writeText(bookingUrl).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  };

  const copyEmbed = () => {
    navigator.clipboard.writeText(embedCode).then(() => {
      setEmbedCopied(true);
      setTimeout(() => setEmbedCopied(false), 2000);
    });
  };

  const shareVia = (platform: string) => {
    if (!bookingUrl) return;
    const text = `Book an appointment with ${studioName}`;
    const urls: Record<string, string> = {
      twitter: `https://twitter.com/intent/tweet?text=${encodeURIComponent(text)}&url=${encodeURIComponent(bookingUrl)}`,
      facebook: `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(bookingUrl)}`,
      whatsapp: `https://wa.me/?text=${encodeURIComponent(text + ' ' + bookingUrl)}`,
      email: `mailto:?subject=${encodeURIComponent('Book a Session with ' + studioName)}&body=${encodeURIComponent(text + '\n\n' + bookingUrl)}`,
    };
    if (urls[platform]) window.open(urls[platform], '_blank');
  };

  return (
    <div className="space-y-8 animate-fade-in">

      <PageHeader
        eyebrow="My Business"
        title="Your Public Booking Page"
        subtitle="Everything in one place — your shareable link, QR code, social sharing, branding, and pending quote requests."
        accentColor="violet"
        actions={
          <>
            {slug && (
              <a
                href={`/studio/${slug}`}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1.5 px-4 py-2 rounded-[var(--radius-md)] bg-white text-[#3b1278] text-sm font-bold hover:bg-white/90 transition-all duration-200 shadow-lg"
              >
                <ExternalLink className="h-4 w-4" />
                View Live Page
              </a>
            )}
            <Link
              href="/branding"
              className="inline-flex items-center gap-1.5 px-4 py-2 rounded-[var(--radius-md)] bg-white/15 border border-white/20 text-white text-sm font-semibold hover:bg-white/25 transition-all duration-200 backdrop-blur-sm"
            >
              <Palette className="h-4 w-4" />
              Edit Branding
            </Link>
          </>
        }
      />

      {/* ── Main grid ── */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

        {/* Left: Link + QR + Share */}
        <div className="lg:col-span-2 space-y-6">

          {/* Shareable Link */}
          <Card glass>
            <CardHeader>
              <div className="flex items-center gap-2.5">
                <div className="h-8 w-8 rounded-xl flex items-center justify-center shrink-0" style={{ background: 'linear-gradient(135deg,#7c3aed,#db2777)' }}>
                  <Link2 className="h-4 w-4 text-white" />
                </div>
                <div>
                  <CardTitle className="text-sm font-bold">Shareable Booking Link</CardTitle>
                  <p className="text-xs text-[var(--foreground-tertiary)]">Clients can book directly without logging in</p>
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              {slug ? (
                <>
                  {/* URL row */}
                  <div className="flex items-center gap-2 bg-[var(--surface-1)] border border-[var(--border-light)] rounded-[var(--radius-lg)] px-4 py-3">
                    <Globe className="h-4 w-4 text-[var(--foreground-tertiary)] shrink-0" />
                    <span className="flex-1 text-sm font-mono text-[var(--foreground-secondary)] truncate">{bookingUrl}</span>
                    <button
                      onClick={copyUrl}
                      className="shrink-0 flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded-lg transition-all duration-200"
                      style={{
                        color: copied ? '#10b981' : 'var(--primary)',
                        background: copied ? 'rgba(16,185,129,0.1)' : 'rgba(124,58,237,0.1)',
                      }}
                    >
                      {copied ? <Check className="h-3 w-3" /> : <Copy className="h-3 w-3" />}
                      {copied ? 'Copied!' : 'Copy'}
                    </button>
                  </div>

                  {/* Deep links */}
                  <div>
                    <p className="text-xs font-semibold text-[var(--foreground-tertiary)] uppercase tracking-wide mb-2">Deep Links</p>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                      {[
                        { label: 'Weddings', param: '?occasion=wedding' },
                        { label: 'Portraits', param: '?service=portrait' },
                        { label: 'Events', param: '?occasion=event' },
                        { label: 'Commercial', param: '?service=commercial' },
                      ].map(({ label, param }) => (
                        <div key={label} className="flex items-center gap-2 bg-[var(--surface-1)] rounded-[var(--radius-md)] px-3 py-2 text-xs">
                          <span className="flex-1 font-mono text-[var(--foreground-tertiary)] truncate">/studio/{slug}{param}</span>
                          <button
                            onClick={() => navigator.clipboard.writeText(`${origin}/studio/${slug}${param}`).then(() => addToast('success', `${label} link copied!`))}
                            className="shrink-0 text-[var(--primary)] hover:underline font-semibold"
                          >
                            Copy
                          </button>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Embed code */}
                  <div>
                    <p className="text-xs font-semibold text-[var(--foreground-tertiary)] uppercase tracking-wide mb-2">Embed on Your Website</p>
                    <div className="relative bg-[var(--surface-1)] border border-[var(--border-light)] rounded-[var(--radius-lg)] p-3 font-mono text-xs text-[var(--foreground-secondary)] leading-relaxed overflow-x-auto">
                      <pre className="whitespace-pre-wrap break-all">{embedCode}</pre>
                      <button
                        onClick={copyEmbed}
                        className="absolute top-2 right-2 flex items-center gap-1 text-[10px] font-semibold px-2 py-1 rounded-md transition-all duration-200"
                        style={{
                          color: embedCopied ? '#10b981' : 'var(--primary)',
                          background: embedCopied ? 'rgba(16,185,129,0.1)' : 'rgba(124,58,237,0.1)',
                        }}
                      >
                        {embedCopied ? <Check className="h-3 w-3" /> : <Code2 className="h-3 w-3" />}
                        {embedCopied ? 'Copied!' : 'Copy'}
                      </button>
                    </div>
                  </div>
                </>
              ) : (
                <div className="flex flex-col items-center justify-center py-10 text-center">
                  <Sparkles className="h-10 w-10 text-[var(--foreground-tertiary)] mb-3" />
                  <p className="text-sm font-semibold text-[var(--foreground-secondary)]">No studio slug configured</p>
                  <p className="text-xs text-[var(--foreground-tertiary)] mt-1 mb-4">Set up your partner slug to get a shareable booking link.</p>
                  <Link href="/settings" className="text-xs font-semibold text-[var(--primary)] hover:underline">Go to Settings →</Link>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Social Share */}
          <Card glass>
            <CardHeader>
              <div className="flex items-center gap-2.5">
                <div className="h-8 w-8 rounded-xl flex items-center justify-center shrink-0" style={{ background: 'linear-gradient(135deg,#0891b2,#6366f1)' }}>
                  <Share2 className="h-4 w-4 text-white" />
                </div>
                <div>
                  <CardTitle className="text-sm font-bold">Share Your Page</CardTitle>
                  <p className="text-xs text-[var(--foreground-tertiary)]">Send it everywhere your clients are</p>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <div className="flex flex-wrap gap-3">
                <ShareBtn icon={Twitter} label="Twitter / X" onClick={() => shareVia('twitter')} color="#1DA1F2" />
                <ShareBtn icon={Facebook} label="Facebook" onClick={() => shareVia('facebook')} color="#1877F2" />
                <ShareBtn icon={Instagram} label="Instagram" onClick={() => shareVia('instagram')} color="#E4405F" />
                <ShareBtn icon={Mail} label="Email" onClick={() => shareVia('email')} color="#10b981" />
                <ShareBtn icon={Smartphone} label="WhatsApp" onClick={() => shareVia('whatsapp')} color="#25D366" />
              </div>

              {/* Marketing tip */}
              <div className="mt-4 flex gap-3 p-3 rounded-[var(--radius-md)] bg-violet-500/5 border border-violet-500/15">
                <Sparkles className="h-4 w-4 text-violet-500 shrink-0 mt-0.5" />
                <p className="text-xs text-[var(--foreground-secondary)] leading-relaxed">
                  <strong className="text-[var(--foreground)]">Pro tip:</strong> Add your booking link to your Instagram bio, email signature, and Google Business profile for maximum bookings.
                </p>
              </div>
            </CardContent>
          </Card>

          {/* Pending Quotes */}
          <Card glass>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                  <div className="h-8 w-8 rounded-xl flex items-center justify-center shrink-0" style={{ background: 'linear-gradient(135deg,#f59e0b,#ef4444)' }}>
                    <MessageSquare className="h-4 w-4 text-white" />
                  </div>
                  <div>
                    <CardTitle className="text-sm font-bold">Pending Inquiries</CardTitle>
                    <p className="text-xs text-[var(--foreground-tertiary)]">Clients awaiting your quote</p>
                  </div>
                </div>
                <Link href="/bookings" className="flex items-center gap-1 text-xs font-semibold text-[var(--primary)] hover:underline">
                  All Bookings <ChevronRight className="h-3.5 w-3.5" />
                </Link>
              </div>
            </CardHeader>
            <CardContent>
              {isLoading ? (
                <div className="space-y-2">
                  {[1, 2].map((i) => <div key={i} className="h-14 rounded-lg bg-[var(--surface-2)] animate-pulse" />)}
                </div>
              ) : pendingBookings.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-8 text-center">
                  <Calendar className="h-9 w-9 text-[var(--foreground-tertiary)] mb-2" />
                  <p className="text-sm font-semibold text-[var(--foreground-secondary)]">No pending inquiries</p>
                  <p className="text-xs text-[var(--foreground-tertiary)] mt-1">New bookings from your public page will appear here.</p>
                </div>
              ) : (
                <div className="space-y-0.5">
                  {pendingBookings.map((b) => <QuoteRow key={b.id} booking={b} />)}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Quoted (awaiting customer response) */}
          <Card glass>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                  <div className="h-8 w-8 rounded-xl flex items-center justify-center shrink-0" style={{ background: 'linear-gradient(135deg,#7c3aed,#db2777)' }}>
                    <Eye className="h-4 w-4 text-white" />
                  </div>
                  <div>
                    <CardTitle className="text-sm font-bold">Awaiting Client Response</CardTitle>
                    <p className="text-xs text-[var(--foreground-tertiary)]">Quotes you&apos;ve sent — pending accept or reject</p>
                  </div>
                </div>
                {quotedBookings.length > 0 && (
                  <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold bg-violet-500/15 text-violet-500 border border-violet-500/20">
                    {quotedBookings.length} open
                  </span>
                )}
              </div>
            </CardHeader>
            <CardContent>
              {isLoading ? (
                <div className="space-y-2">
                  {[1, 2].map((i) => <div key={i} className="h-14 rounded-lg bg-[var(--surface-2)] animate-pulse" />)}
                </div>
              ) : quotedBookings.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-8 text-center">
                  <Eye className="h-9 w-9 text-[var(--foreground-tertiary)] mb-2" />
                  <p className="text-sm font-semibold text-[var(--foreground-secondary)]">No quotes awaiting response</p>
                  <p className="text-xs text-[var(--foreground-tertiary)] mt-1">Send quotes from the Bookings page.</p>
                </div>
              ) : (
                <div className="space-y-0.5">
                  {quotedBookings.map((b) => <QuoteRow key={b.id} booking={b} />)}
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Right sidebar: QR + branding quick-links */}
        <div className="space-y-6">

          {/* QR Code */}
          <Card glass>
            <CardHeader>
              <div className="flex items-center gap-2.5">
                <div className="h-8 w-8 rounded-xl flex items-center justify-center shrink-0" style={{ background: 'linear-gradient(135deg,#7c3aed,#6366f1)' }}>
                  <QrCode className="h-4 w-4 text-white" />
                </div>
                <div>
                  <CardTitle className="text-sm font-bold">QR Code</CardTitle>
                  <p className="text-xs text-[var(--foreground-tertiary)]">Print or share anywhere</p>
                </div>
              </div>
            </CardHeader>
            <CardContent className="flex flex-col items-center gap-4">
              {slug ? (
                <>
                  <QRDisplay url={bookingUrl} />
                  <div className="text-center">
                    <p className="text-xs font-semibold text-[var(--foreground-secondary)]">{studioName}</p>
                    <p className="text-[10px] text-[var(--foreground-tertiary)] mt-0.5">Scan to book an appointment</p>
                  </div>
                  <a
                    href={`https://api.qrserver.com/v1/create-qr-code/?size=600x600&data=${encodeURIComponent(bookingUrl)}&bgcolor=ffffff&color=7c3aed&margin=20`}
                    download={`${slug}-qr.png`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="w-full text-center text-xs font-semibold px-3 py-2 rounded-[var(--radius-md)] border border-[var(--border-light)] text-[var(--foreground-secondary)] hover:border-[var(--primary)] hover:text-[var(--primary)] transition-all duration-200"
                  >
                    Download QR
                  </a>
                </>
              ) : (
                <div className="flex flex-col items-center justify-center py-6 text-center">
                  <QrCode className="h-10 w-10 text-[var(--foreground-tertiary)] mb-2" />
                  <p className="text-xs text-[var(--foreground-tertiary)]">Set up a slug to generate your QR code</p>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Quick links */}
          <Card glass>
            <CardHeader>
              <CardTitle className="text-sm font-bold">Partner Settings</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              {[
                { href: '/branding', icon: Palette, label: 'Branding & Colors', desc: 'Logo, fonts, theme', color: '#db2777' },
                { href: '/share-links', icon: Share2, label: 'Share Links', desc: 'Social & marketing links', color: '#6366f1' },
                { href: '/services', icon: Calendar, label: 'Services', desc: 'Prices & durations', color: '#0891b2' },
                { href: '/portfolio', icon: Eye, label: 'Portfolio', desc: 'Showcase your work', color: '#7c3aed' },
                { href: '/settings', icon: Globe, label: 'Partner Settings', desc: 'Slug, contact, timezone', color: '#10b981' },
              ].map(({ href, icon: Icon, label, desc, color }) => (
                <Link
                  key={href}
                  href={href}
                  className="flex items-center gap-3 p-3 rounded-[var(--radius-md)] hover:bg-[var(--overlay-light)] transition-colors duration-150 group"
                >
                  <div className="h-8 w-8 rounded-lg flex items-center justify-center shrink-0 transition-transform group-hover:scale-110" style={{ background: color + '18' }}>
                    <Icon className="h-4 w-4" style={{ color }} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-[var(--foreground)]">{label}</p>
                    <p className="text-xs text-[var(--foreground-tertiary)]">{desc}</p>
                  </div>
                  <ChevronRight className="h-3.5 w-3.5 text-[var(--foreground-tertiary)] opacity-0 group-hover:opacity-100 transition-opacity" />
                </Link>
              ))}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
