'use client';

import React, { useState, useEffect, useRef } from 'react';
import { useAuthStore } from '@/lib/auth-store';
import { studiosApi } from '@/lib/api';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { useToast } from '@/components/ui/toast';
import { LoadingSpinner } from '@/components/ui/loading';
import { cn } from '@/lib/utils';
import {
  Link as LinkIcon,
  Copy,
  Check,
  QrCode,
  ExternalLink,
  Download,
  Share2,
  Mail,
  MessageSquare,
  Smartphone,
} from 'lucide-react';

/* -------------------------------------------------------------------------- */
/*  QR Code component (uses Google Charts API)                                 */
/* -------------------------------------------------------------------------- */

function QRCodeDisplay({
  url,
  size = 200,
  className,
}: {
  url: string;
  size?: number;
  className?: string;
}) {
  const qrSrc = `https://api.qrserver.com/v1/create-qr-code/?size=${size}x${size}&data=${encodeURIComponent(url)}&margin=8`;

  return (
    <div className={cn('inline-block', className)}>
      <img
        src={qrSrc}
        alt="QR Code"
        width={size}
        height={size}
        className="rounded-[var(--radius-md)]"
      />
    </div>
  );
}

/* -------------------------------------------------------------------------- */
/*  Copy button                                                               */
/* -------------------------------------------------------------------------- */

function CopyButton({ text, label }: { text: string; label?: string }) {
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Fallback
      const textarea = document.createElement('textarea');
      textarea.value = text;
      document.body.appendChild(textarea);
      textarea.select();
      document.execCommand('copy');
      document.body.removeChild(textarea);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  return (
    <Button
      variant={copied ? 'success' : 'outline'}
      size="sm"
      onClick={handleCopy}
      leftIcon={copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
    >
      {copied ? 'Copied!' : label || 'Copy'}
    </Button>
  );
}

/* -------------------------------------------------------------------------- */
/*  Main Share Links Page                                                     */
/* -------------------------------------------------------------------------- */

export default function ShareLinksPage() {
  const { user } = useAuthStore();
  const { addToast } = useToast();
  const [loading, setLoading] = useState(true);
  const [studioSlug, setStudioSlug] = useState('');
  const [studioName, setStudioName] = useState('');
  const qrRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    async function load() {
      if (!user?.studioId) return;
      try {
        setLoading(true);
        const res = await studiosApi.getOne(user.studioId);
        setStudioSlug(res.data.slug);
        setStudioName(res.data.name);
      } catch {
        addToast('error', 'Failed to load studio data');
      } finally {
        setLoading(false);
      }
    }
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.studioId]);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <LoadingSpinner />
      </div>
    );
  }

  const origin = typeof window !== 'undefined' ? window.location.origin : '';
  const bookingUrl = `${origin}/studio/${studioSlug}`;
  const qrSize = 280;

  const handleDownloadQR = async () => {
    try {
      const qrSrc = `https://api.qrserver.com/v1/create-qr-code/?size=600x600&data=${encodeURIComponent(bookingUrl)}&margin=16`;
      const response = await fetch(qrSrc);
      const blob = await response.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${studioSlug}-qr-code.png`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      addToast('success', 'QR code downloaded');
    } catch {
      addToast('error', 'Failed to download QR code');
    }
  };

  const handleShareNative = async () => {
    if (navigator.share) {
      try {
        await navigator.share({
          title: `Book with ${studioName}`,
          text: `Book your photography session with ${studioName}`,
          url: bookingUrl,
        });
      } catch {
        // User cancelled
      }
    } else {
      // Fallback: copy
      await navigator.clipboard.writeText(bookingUrl);
      addToast('success', 'Link copied to clipboard');
    }
  };

  const shareLinks = [
    {
      name: 'WhatsApp',
      icon: MessageSquare,
      color: '#25D366',
      url: `https://wa.me/?text=${encodeURIComponent(`Book your photography session with ${studioName}: ${bookingUrl}`)}`,
    },
    {
      name: 'Email',
      icon: Mail,
      color: '#EA4335',
      url: `mailto:?subject=${encodeURIComponent(`Book with ${studioName}`)}&body=${encodeURIComponent(`Book your photography session here: ${bookingUrl}`)}`,
    },
    {
      name: 'SMS',
      icon: Smartphone,
      color: '#1a73e8',
      url: `sms:?body=${encodeURIComponent(`Book your photography session with ${studioName}: ${bookingUrl}`)}`,
    },
  ];

  return (
    <div className="space-y-6 page-enter">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-[var(--foreground)]">
          Share Links & QR Code
        </h1>
        <p className="text-sm text-[var(--foreground-secondary)] mt-1">
          Share your public booking page with customers via links, QR codes, or
          social media.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Left: Booking Link */}
        <div className="space-y-6">
          {/* Public Booking Link */}
          <Card>
            <CardHeader>
              <div className="flex items-center gap-2">
                <LinkIcon className="h-5 w-5 text-[var(--primary)]" />
                <CardTitle>Public Booking Link</CardTitle>
              </div>
              <CardDescription>
                Share this link with your customers so they can book sessions
                directly.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex items-center gap-2">
                <div className="flex-1 px-3 py-2.5 bg-[var(--surface-1)] rounded-[var(--radius-md)] border border-[var(--border)] font-mono text-sm text-[var(--foreground)] truncate">
                  {bookingUrl}
                </div>
                <CopyButton text={bookingUrl} label="Copy Link" />
              </div>

              <div className="flex items-center gap-2 mt-4">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => window.open(bookingUrl, '_blank')}
                  leftIcon={<ExternalLink className="h-4 w-4" />}
                >
                  Preview
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleShareNative}
                  leftIcon={<Share2 className="h-4 w-4" />}
                >
                  Share
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Quick Share */}
          <Card>
            <CardHeader>
              <div className="flex items-center gap-2">
                <Share2 className="h-5 w-5 text-[var(--primary)]" />
                <CardTitle>Quick Share</CardTitle>
              </div>
              <CardDescription>
                Send your booking link via popular channels.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                {shareLinks.map((link) => {
                  const Icon = link.icon;
                  return (
                    <a
                      key={link.name}
                      href={link.url}
                      target="_blank"
                      rel="noreferrer"
                      className={cn(
                        'flex items-center gap-3 px-4 py-3 rounded-[var(--radius-md)]',
                        'border border-[var(--border)] bg-[var(--surface-0)]',
                        'hover:shadow-[var(--shadow-md)] hover:-translate-y-0.5',
                        'transition-all duration-[var(--transition-fast)]',
                      )}
                    >
                      <div
                        className="h-9 w-9 rounded-[var(--radius-md)] flex items-center justify-center shrink-0"
                        style={{ backgroundColor: link.color + '15' }}
                      >
                        <Icon
                          className="h-5 w-5"
                          style={{ color: link.color }}
                        />
                      </div>
                      <span className="text-sm font-medium text-[var(--foreground)]">
                        {link.name}
                      </span>
                    </a>
                  );
                })}
              </div>
            </CardContent>
          </Card>

          {/* Embed Code */}
          <Card>
            <CardHeader>
              <CardTitle>Embed on Website</CardTitle>
              <CardDescription>
                Add a booking button to your existing website.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                <div>
                  <label className="block text-xs font-medium text-[var(--foreground-secondary)] mb-1">
                    HTML Button
                  </label>
                  <div className="relative">
                    <pre className="px-3 py-2.5 bg-[var(--surface-1)] rounded-[var(--radius-md)] border border-[var(--border)] font-mono text-xs text-[var(--foreground-secondary)] overflow-x-auto whitespace-pre">
{`<a href="${bookingUrl}" target="_blank"
  style="display:inline-block;padding:12px 24px;
  background:#1a73e8;color:#fff;border-radius:8px;
  text-decoration:none;font-weight:600;">
  Book a Session
</a>`}
                    </pre>
                    <div className="absolute top-2 right-2">
                      <CopyButton
                        text={`<a href="${bookingUrl}" target="_blank" style="display:inline-block;padding:12px 24px;background:#1a73e8;color:#fff;border-radius:8px;text-decoration:none;font-weight:600;">Book a Session</a>`}
                      />
                    </div>
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-medium text-[var(--foreground-secondary)] mb-1">
                    iFrame
                  </label>
                  <div className="relative">
                    <pre className="px-3 py-2.5 bg-[var(--surface-1)] rounded-[var(--radius-md)] border border-[var(--border)] font-mono text-xs text-[var(--foreground-secondary)] overflow-x-auto whitespace-pre">
{`<iframe src="${bookingUrl}"
  width="100%" height="800"
  frameborder="0"></iframe>`}
                    </pre>
                    <div className="absolute top-2 right-2">
                      <CopyButton
                        text={`<iframe src="${bookingUrl}" width="100%" height="800" frameborder="0"></iframe>`}
                      />
                    </div>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Right: QR Code */}
        <div>
          <Card>
            <CardHeader>
              <div className="flex items-center gap-2">
                <QrCode className="h-5 w-5 text-[var(--primary)]" />
                <CardTitle>QR Code</CardTitle>
              </div>
              <CardDescription>
                Print this QR code on business cards, flyers, or display it in
                your studio. Customers can scan it to open your booking page
                instantly.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex flex-col items-center" ref={qrRef}>
                {/* QR with studio branding */}
                <div className="bg-white p-6 rounded-2xl shadow-[var(--shadow-md)] border border-[var(--border-light)]">
                  <QRCodeDisplay url={bookingUrl} size={qrSize} />
                  <div className="text-center mt-4">
                    <p className="font-bold text-[var(--foreground)] text-lg">
                      {studioName}
                    </p>
                    <p className="text-xs text-[var(--foreground-tertiary)] mt-1">
                      Scan to book a session
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-2 mt-6">
                  <Button
                    size="sm"
                    onClick={handleDownloadQR}
                    leftIcon={<Download className="h-4 w-4" />}
                  >
                    Download PNG
                  </Button>
                  <CopyButton text={bookingUrl} label="Copy URL" />
                </div>

                <p className="text-xs text-[var(--foreground-tertiary)] text-center mt-4 max-w-xs">
                  Tip: Print this QR code at 2&quot; x 2&quot; or larger for best
                  scanning results. Works with any smartphone camera.
                </p>
              </div>
            </CardContent>
          </Card>

          {/* Usage Tips */}
          <Card className="mt-6">
            <CardHeader>
              <CardTitle>Usage Ideas</CardTitle>
            </CardHeader>
            <CardContent>
              <ul className="space-y-3 text-sm text-[var(--foreground-secondary)]">
                <li className="flex items-start gap-2">
                  <div className="h-5 w-5 rounded-full bg-[var(--primary-light)] flex items-center justify-center shrink-0 mt-0.5">
                    <span className="text-xs font-bold text-[var(--primary)]">1</span>
                  </div>
                  <span>
                    <strong className="text-[var(--foreground)]">Business Cards</strong> — Add the QR code to the back of your business cards
                  </span>
                </li>
                <li className="flex items-start gap-2">
                  <div className="h-5 w-5 rounded-full bg-[var(--primary-light)] flex items-center justify-center shrink-0 mt-0.5">
                    <span className="text-xs font-bold text-[var(--primary)]">2</span>
                  </div>
                  <span>
                    <strong className="text-[var(--foreground)]">Studio Display</strong> — Print and frame it at your reception desk
                  </span>
                </li>
                <li className="flex items-start gap-2">
                  <div className="h-5 w-5 rounded-full bg-[var(--primary-light)] flex items-center justify-center shrink-0 mt-0.5">
                    <span className="text-xs font-bold text-[var(--primary)]">3</span>
                  </div>
                  <span>
                    <strong className="text-[var(--foreground)]">Social Media</strong> — Share the link in your Instagram bio or Facebook page
                  </span>
                </li>
                <li className="flex items-start gap-2">
                  <div className="h-5 w-5 rounded-full bg-[var(--primary-light)] flex items-center justify-center shrink-0 mt-0.5">
                    <span className="text-xs font-bold text-[var(--primary)]">4</span>
                  </div>
                  <span>
                    <strong className="text-[var(--foreground)]">Event Flyers</strong> — Include the booking link on promotional materials
                  </span>
                </li>
              </ul>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
