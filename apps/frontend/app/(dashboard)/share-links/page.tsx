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
  Instagram,
  Facebook,
  Layout,
  Sparkles,
  Palette,
  Camera,
} from 'lucide-react';

/* -------------------------------------------------------------------------- */
/*  CMG Template Components                                                   */
/* -------------------------------------------------------------------------- */

function MarketingAsset({
  type,
  studioName,
  logoUrl,
  bookingUrl,
  colors,
}: {
  type: 'story' | 'post';
  studioName: string;
  logoUrl: string | null;
  bookingUrl: string;
  colors: { primary: string; accent: string };
}) {
  const isStory = type === 'story';

  return (
    <div
      className={cn(
        "relative overflow-hidden shadow-2xl transition-all duration-500 ring-1 ring-white/20",
        isStory ? "aspect-[9/16] w-[240px]" : "aspect-square w-[300px]"
      )}
      style={{
        background: `radial-gradient(at 0% 0%, ${colors.primary} 0px, transparent 50%),
                     radial-gradient(at 100% 0%, ${colors.accent} 0px, transparent 50%),
                     radial-gradient(at 0% 100%, ${colors.accent} 0px, transparent 50%),
                     radial-gradient(at 100% 100%, ${colors.primary} 0px, transparent 50%),
                     #000`
      }}
    >
      {/* Decorative patterns */}
      <div className="absolute inset-0 opacity-20 mix-blend-overlay" style={{ backgroundImage: 'radial-gradient(circle, #fff 1px, transparent 1px)', backgroundSize: '20px 20px' }} />

      {/* Dynamic Content */}
      <div className="absolute inset-0 p-8 flex flex-col items-center justify-between text-center">
        {/* Top: Logo & Name */}
        <div className="space-y-4">
          {logoUrl ? (
            <img src={logoUrl} alt="Logo" className="h-16 w-16 mx-auto rounded-2xl bg-white/20 p-2 backdrop-blur-md shadow-xl border border-white/30" />
          ) : (
            <div className="h-16 w-16 mx-auto rounded-2xl bg-white/20 flex items-center justify-center backdrop-blur-md shadow-xl border border-white/30">
              <Camera className="h-8 w-8 text-white" />
            </div>
          )}
          <h3 className="text-white font-black text-2xl tracking-tighter italic drop-shadow-lg leading-tight uppercase">
            {studioName}
          </h3>
        </div>

        {/* Center: Call to Action */}
        <div className="space-y-2">
          <div className="inline-block px-4 py-1.5 rounded-full bg-white text-black font-black text-xs uppercase tracking-widest shadow-xl">
            Book Now
          </div>
          <p className="text-white font-bold text-lg drop-shadow-md">
            {isStory ? "Link in Bio" : "Scan to Schedule"}
          </p>
        </div>

        {/* Bottom: QR Code */}
        <div className="bg-white p-3 rounded-2xl shadow-2xl border-4 border-white/10">
          <QRCodeDisplay url={bookingUrl} size={isStory ? 100 : 120} />
        </div>
      </div>
    </div>
  );
}

/* -------------------------------------------------------------------------- */
/*  Copy button                                                               */
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
  const [services, setServices] = useState<any[]>([]);
  const [branding, setBranding] = useState<any>(null);
  const qrRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    async function load() {
      if (!user?.studioId) return;
      try {
        setLoading(true);
        const res = await studiosApi.getOne(user.studioId);
        setStudioSlug(res.data.slug);
        setStudioName(res.data.name);
        setServices(res.data.services || []);
        setBranding(res.data.brandingConfig);
      } catch {
        addToast('error', 'Failed to load studio data');
      } finally {
        setLoading(false);
      }
    }
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.studioId]);

  const [cmgType, setCmgType] = useState<'story' | 'post'>('story');

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <LoadingSpinner />
      </div>
    );
  }

  const origin = typeof window !== 'undefined' ? window.location.origin : '';
  const bookingUrl = `${origin}/studio/${studioSlug}`;
  const primaryColor = branding?.primaryColor || '#1a73e8';
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
      color: 'var(--primary)',
      url: `sms:?body=${encodeURIComponent(`Book your photography session with ${studioName}: ${bookingUrl}`)}`,
    },
  ];

  return (
    <div className="space-y-6 page-enter relative min-h-screen">
      {/* Luxury Background Layer */}
      {branding && (
        <div
          className="fixed inset-0 -z-10 opacity-[0.03] pointer-events-none"
          style={{
            background: `radial-gradient(at 0% 0%, ${primaryColor} 0px, transparent 50%),
                         radial-gradient(at 100% 0%, ${branding?.accentColor || primaryColor} 0px, transparent 50%),
                         radial-gradient(at 0% 100%, ${branding?.accentColor || primaryColor} 0px, transparent 50%),
                         radial-gradient(at 100% 100%, ${primaryColor} 0px, transparent 50%)`
          }}
        />
      )}

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

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 pb-8">
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
                  {studioSlug ? bookingUrl : 'Loading link...'}
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
  background:${primaryColor};color:#fff;border-radius:8px;
  text-decoration:none;font-weight:600;">
  Book a Session
</a>`}
                    </pre>
                    <div className="absolute top-2 right-2">
                      <CopyButton
                        text={`<a href="${bookingUrl}" target="_blank" style="display:inline-block;padding:12px 24px;background:${primaryColor};color:#fff;border-radius:8px;text-decoration:none;font-weight:600;">Book a Session</a>`}
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
          {/* Deep Links Section */}
          <Card>
            <CardHeader>
              <div className="flex items-center gap-2">
                <LinkIcon className="h-5 w-5 text-[var(--primary)]" />
                <CardTitle>Direct Service Links</CardTitle>
              </div>
              <CardDescription>
                Share direct links to a specific service or occasion.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {/* Services */}
                <div className="space-y-2">
                  <h4 className="text-xs font-semibold text-[var(--foreground-tertiary)] uppercase tracking-wider">
                    By Service
                  </h4>
                  <div className="space-y-2">
                    {services.length > 0 ? (
                      services.map((s) => (
                        <div key={s.id} className="flex items-center justify-between p-2 rounded-lg border border-[var(--border)] bg-[var(--surface-0)] hover:bg-[var(--surface-1)] transition-colors">
                          <div className="min-w-0 flex-1">
                            <div className="text-sm font-medium text-[var(--foreground)] truncate">{s.name}</div>
                            <div className="text-xs text-[var(--foreground-tertiary)] font-mono truncate">?service={s.id}</div>
                          </div>
                          <div className="flex items-center gap-2">
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => window.open(`${bookingUrl}?service=${s.id}`, '_blank')}
                              leftIcon={<ExternalLink className="h-3.5 w-3.5" />}
                              className="h-9 px-3"
                            >
                              Test
                            </Button>
                            <CopyButton
                              text={`${bookingUrl}?service=${s.id}`}
                              label="Link"
                            />
                          </div>
                        </div>
                      ))
                    ) : (
                      <p className="text-sm text-[var(--foreground-tertiary)] italic">No services created yet.</p>
                    )}
                  </div>
                </div>

                {/* Occasions */}
                {Array.from(new Set(services.map(s => s.occasion).filter(Boolean))).length > 0 && (
                  <div className="space-y-2 pt-2 border-t border-[var(--border)]">
                    <h4 className="text-xs font-semibold text-[var(--foreground-tertiary)] uppercase tracking-wider">
                      By Category
                    </h4>
                    <div className="flex flex-wrap gap-2">
                      {Array.from(new Set(services.map(s => s.occasion).filter(Boolean))).map((occasion: any) => (
                        <div key={occasion} className="flex items-center gap-2 px-3 py-1.5 rounded-full border border-[var(--border)] bg-[var(--surface-0)]">
                          <span className="text-sm font-medium text-[var(--foreground)]">{occasion}</span>
                          <div className="flex items-center">
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => window.open(`${bookingUrl}?occasion=${encodeURIComponent(occasion)}`, '_blank')}
                              className="h-7 w-7 p-0 text-[var(--foreground-tertiary)] hover:text-[var(--primary)]"
                            >
                              <ExternalLink className="h-3.5 w-3.5" />
                            </Button>
                            <CopyButton
                              text={`${bookingUrl}?occasion=${encodeURIComponent(occasion)}`}
                            />
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
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

      {/* Marketing Graphics (CMG) Section */}
      <Card className="border-2 border-[var(--primary)]/10 shadow-xl overflow-hidden mb-12 relative">
        <div className="absolute top-0 right-0 p-4 opacity-5 pointer-events-none">
          <Sparkles className="h-48 w-48 text-[var(--primary)]" />
        </div>
        <CardHeader className="relative z-10 border-b border-[var(--border)]/50 bg-[var(--surface-0)]/50 backdrop-blur-sm">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-xl bg-[var(--primary)]/10 flex items-center justify-center shadow-inner">
                <Palette className="h-5 w-5 text-[var(--primary)]" />
              </div>
              <div>
                <CardTitle className="text-xl">Custom Marketing Graphics (CMG)</CardTitle>
                <CardDescription>
                  Generate stunning social media assets with your brand identity.
                </CardDescription>
              </div>
            </div>
            <div className="flex items-center gap-1 bg-[var(--surface-1)] p-1 rounded-xl border border-[var(--border)] shadow-sm">
              <Button
                size="sm"
                variant={cmgType === 'story' ? 'primary' : 'ghost'}
                onClick={() => setCmgType('story')}
                className="rounded-lg"
                leftIcon={<Smartphone className="h-4 w-4" />}
              >
                Story
              </Button>
              <Button
                size="sm"
                variant={cmgType === 'post' ? 'primary' : 'ghost'}
                onClick={() => setCmgType('post')}
                className="rounded-lg"
                leftIcon={<Layout className="h-4 w-4" />}
              >
                Post
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent className="p-8 relative z-10">
          <div className="flex flex-col lg:flex-row items-center gap-12">
            <div className="shrink-0 scale-90 sm:scale-100 origin-center transition-all duration-500 hover:scale-[1.02]">
              <MarketingAsset
                type={cmgType}
                studioName={studioName}
                logoUrl={branding?.logoUrl || null}
                bookingUrl={bookingUrl}
                colors={{
                  primary: primaryColor,
                  accent: branding?.accentColor || '#7c3aed'
                }}
              />
            </div>
            <div className="flex-1 space-y-8 w-full">
              <div className="space-y-4">
                <div className="flex items-center gap-3">
                  <div className="h-8 w-8 rounded-full bg-gradient-to-tr from-[#f09433] via-[#e6683c] via-[#dc2743] via-[#cc2366] to-[#bc1888] flex items-center justify-center shadow-lg">
                    <Instagram className="h-4 w-4 text-white" />
                  </div>
                  <h4 className="font-bold text-xl text-[var(--foreground)] tracking-tight">
                    Instagram Ready Assets
                  </h4>
                </div>
                <p className="text-sm text-[var(--foreground-tertiary)] leading-relaxed max-w-2xl">
                  These graphics are precision-engineered for brand recognition and conversion.
                  Share them on your {cmgType === 'story' ? 'Link-in-Bio or WhatsApp Stories' : 'Instagram/Facebook Feed'}
                  to streamline your booking experience for new and returning clients.
                </p>
              </div>

              <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
                <div className="p-6 rounded-2xl border border-[var(--border)] bg-[var(--surface-1)]/50 backdrop-blur-sm shadow-inner">
                  <p className="text-xs font-black text-[var(--foreground-tertiary)] uppercase tracking-widest mb-4">Pro Implementation</p>
                  <ul className="space-y-3 text-sm text-[var(--foreground-secondary)]">
                    <li className="flex gap-3 items-center">
                      <span className="h-6 w-6 rounded-full bg-[var(--primary)] text-white text-[10px] font-bold flex items-center justify-center shrink-0">1</span>
                      Take a high-quality screenshot of the preview
                    </li>
                    <li className="flex gap-3 items-center">
                      <span className="h-6 w-6 rounded-full bg-[var(--primary)] text-white text-[10px] font-bold flex items-center justify-center shrink-0">2</span>
                      Upload to your Instagram {cmgType}
                    </li>
                    {cmgType === 'story' && (
                      <li className="flex gap-3 items-center">
                        <span className="h-6 w-6 rounded-full bg-[var(--primary)] text-white text-[10px] font-bold flex items-center justify-center shrink-0">3</span>
                        Add a &quot;Link&quot; sticker set to your Booking URL
                      </li>
                    )}
                  </ul>
                </div>

                <div className="flex flex-col gap-3 justify-center">
                  <div className="space-y-2">
                    <p className="text-xs font-bold text-[var(--foreground-tertiary)] mb-1">Quick Actions</p>
                    <Button
                      variant="outline"
                      className="w-full justify-start h-12 rounded-xl bg-white/50"
                      onClick={() => {
                        navigator.clipboard.writeText(bookingUrl);
                        addToast('success', 'URL copied for sticker');
                      }}
                      leftIcon={<Copy className="h-4 w-4" />}
                    >
                      Copy URL for Sticker
                    </Button>
                    <Button
                      className="w-full justify-start h-12 rounded-xl shadow-lg shadow-[var(--primary)]/20"
                      onClick={() => {
                        addToast('info', 'Advanced Generation: High-res PNG export coming in V9. For now, please screenshot the preview!');
                      }}
                      leftIcon={<Download className="h-4 w-4" />}
                    >
                      Download as Image (PNG)
                    </Button>
                  </div>
                </div>
              </div>

              <div className="pt-4 border-t border-[var(--border)] flex items-center gap-2 text-xs text-[var(--foreground-tertiary)] italic">
                <Sparkles className="h-3 w-3" />
                Your branding colors and logo have been automatically synced to these templates.
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
