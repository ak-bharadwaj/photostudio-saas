'use client';

import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { useToast } from '@/components/ui/toast';
import axios from 'axios';
import {
  Bell,
  Shield,
  Moon,
  Globe,
  Sun,
  Monitor,
  Mail,
  Megaphone,
  Eye,
  Lock,
  Info,
  CheckCircle2,
  Sparkles,
  Settings2,
  ChevronRight,
} from 'lucide-react';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';

function safeGetItem(key: string): string | null {
  if (typeof window === 'undefined') return null;
  try { return localStorage.getItem(key); } catch { return null; }
}
function safeSetItem(key: string, value: string) {
  if (typeof window === 'undefined') return;
  try { localStorage.setItem(key, value); } catch { /* ignore */ }
}

/* ── Premium toggle ── */
function PremiumToggle({
  label,
  description,
  icon: Icon,
  checked,
  onChange,
  accent = '#7c3aed',
}: {
  label: string;
  description: string;
  icon: React.ComponentType<{ className?: string; style?: React.CSSProperties }>;
  checked: boolean;
  onChange: (v: boolean) => void;
  accent?: string;
}) {
  return (
    <div
      className="group flex items-center justify-between gap-6 px-5 py-4 rounded-2xl transition-all duration-200 cursor-pointer"
      style={{
        background: checked ? `${accent}0d` : 'transparent',
        border: `1px solid ${checked ? `${accent}30` : 'var(--border-light)'}`,
      }}
      onClick={() => onChange(!checked)}
    >
      <div className="flex items-center gap-4 min-w-0">
        <div
          className="h-10 w-10 rounded-2xl flex items-center justify-center shrink-0 transition-all duration-200"
          style={{
            background: checked ? `${accent}20` : 'var(--surface-2)',
            border: `1px solid ${checked ? `${accent}40` : 'var(--border)'}`,
          }}
        >
          <Icon
            className="h-4.5 w-4.5 transition-colors duration-200"
            style={{ color: checked ? accent : 'var(--foreground-tertiary)' }}
          />
        </div>
        <div className="min-w-0">
          <p className="font-bold text-sm text-[var(--foreground)] truncate">{label}</p>
          <p className="text-xs text-[var(--foreground-tertiary)] mt-0.5 leading-relaxed">{description}</p>
        </div>
      </div>
      <button
        role="switch"
        aria-checked={checked}
        onClick={(e) => { e.stopPropagation(); onChange(!checked); }}
        className="relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-2"
        style={{
          background: checked ? accent : 'var(--surface-3)',
          focusVisibleRingColor: accent,
        } as React.CSSProperties}
      >
        <span
          className="pointer-events-none inline-block h-5 w-5 rounded-full bg-white shadow-lg ring-0 transition-transform duration-200"
          style={{ transform: checked ? 'translateX(20px)' : 'translateX(0px)' }}
        />
      </button>
    </div>
  );
}

/* ── Section card ── */
function SectionCard({
  icon: Icon,
  title,
  description,
  accentColor = '#7c3aed',
  children,
}: {
  icon: React.ComponentType<{ className?: string; style?: React.CSSProperties }>;
  title: string;
  description: string;
  accentColor?: string;
  children: React.ReactNode;
}) {
  return (
    <div
      className="rounded-3xl overflow-hidden"
      style={{
        background: 'var(--surface-1)',
        border: '1px solid var(--border)',
        boxShadow: 'var(--shadow-sm)',
      }}
    >
      {/* Header */}
      <div
        className="px-6 py-5 flex items-center gap-4"
        style={{
          background: 'var(--surface-2)',
          borderBottom: '1px solid var(--border-light)',
        }}
      >
        <div
          className="h-11 w-11 rounded-2xl flex items-center justify-center shrink-0"
          style={{ background: `${accentColor}18`, border: `1px solid ${accentColor}30` }}
        >
          <Icon className="h-5 w-5" style={{ color: accentColor }} />
        </div>
        <div>
          <h2 className="font-black text-[var(--foreground)] text-base tracking-tight">{title}</h2>
          <p className="text-xs text-[var(--foreground-tertiary)] mt-0.5">{description}</p>
        </div>
      </div>
      {/* Body */}
      <div className="p-5 space-y-3">{children}</div>
    </div>
  );
}

type ThemeOption = 'Light' | 'Dark' | 'System';
const THEME_OPTIONS: { label: ThemeOption; icon: React.ComponentType<{ className?: string }> }[] = [
  { label: 'Light', icon: Sun },
  { label: 'Dark', icon: Moon },
  { label: 'System', icon: Monitor },
];

export default function SettingsPage() {
  const { addToast } = useToast();
  const [emailNotifications, setEmailNotifications] = useState(true);
  const [marketingUpdates, setMarketingUpdates] = useState(false);
  const [publicIdentity, setPublicIdentity] = useState(true);
  const [selectedTheme, setSelectedTheme] = useState<ThemeOption>('Light');
  const [saving, setSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    const email = safeGetItem('pref_email_notifications');
    const marketing = safeGetItem('pref_marketing_updates');
    const identity = safeGetItem('pref_public_identity');
    const theme = safeGetItem('pref_theme') as ThemeOption | null;
    if (email !== null) setEmailNotifications(email === 'true');
    if (marketing !== null) setMarketingUpdates(marketing === 'true');
    if (identity !== null) setPublicIdentity(identity === 'true');
    if (theme && ['Light', 'Dark', 'System'].includes(theme)) setSelectedTheme(theme);
    setLoaded(true);
  }, []);

  const handleSave = async () => {
    setSaving(true);
    setSaveSuccess(false);
    try {
      const token = safeGetItem('accessToken');
      if (token) {
        await axios.patch(
          `${API_URL}/portal/me/preferences`,
          { emailNotifications, marketingUpdates, publicIdentity },
          { headers: { Authorization: `Bearer ${token}` } },
        );
      }
      safeSetItem('pref_email_notifications', String(emailNotifications));
      safeSetItem('pref_marketing_updates', String(marketingUpdates));
      safeSetItem('pref_public_identity', String(publicIdentity));
      safeSetItem('pref_theme', selectedTheme);
      setSaveSuccess(true);
      addToast('success', 'Preferences saved successfully.');
      setTimeout(() => setSaveSuccess(false), 3000);
    } catch {
      safeSetItem('pref_email_notifications', String(emailNotifications));
      safeSetItem('pref_marketing_updates', String(marketingUpdates));
      safeSetItem('pref_public_identity', String(publicIdentity));
      safeSetItem('pref_theme', selectedTheme);
      setSaveSuccess(true);
      addToast('success', 'Preferences saved locally.');
      setTimeout(() => setSaveSuccess(false), 3000);
    } finally {
      setSaving(false);
    }
  };

  if (!loaded) return null;

  return (
    <div className="max-w-2xl mx-auto space-y-8 animate-luxury-in">

      {/* ── Hero header ── */}
      <div
        className="relative rounded-3xl overflow-hidden px-8 py-10"
        style={{ background: 'linear-gradient(135deg, #07041a 0%, #110828 60%, #080510 100%)' }}
      >
        {/* Ambient orbs */}
        <div
          className="absolute top-0 left-0 w-64 h-64 rounded-full pointer-events-none opacity-20"
          style={{ background: 'radial-gradient(circle, #7c3aed, transparent 70%)', transform: 'translate(-40%, -40%)' }}
        />
        <div
          className="absolute bottom-0 right-0 w-48 h-48 rounded-full pointer-events-none opacity-15"
          style={{ background: 'radial-gradient(circle, #db2777, transparent 70%)', transform: 'translate(30%, 30%)' }}
        />
        {/* Grid mesh */}
        <div
          className="absolute inset-0 pointer-events-none opacity-[0.04]"
          style={{
            backgroundImage: 'linear-gradient(var(--foreground) 1px, transparent 1px), linear-gradient(90deg, var(--foreground) 1px, transparent 1px)',
            backgroundSize: '32px 32px',
          }}
        />

        <div className="relative flex items-start justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 mb-3">
              <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold" style={{ background: '#7c3aed22', border: '1px solid #7c3aed40', color: '#a78bfa' }}>
                <Settings2 className="h-3 w-3" />
                Preferences
              </div>
            </div>
            <h1
              className="text-3xl font-black tracking-tight"
              style={{ background: 'linear-gradient(135deg, #fff 0%, #e2d9f3 100%)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}
            >
              Settings
            </h1>
            <p className="text-sm mt-2 leading-relaxed" style={{ color: '#a78bfa99' }}>
              Personalize your portal experience, notifications, and privacy.
            </p>
          </div>
          <div
            className="h-14 w-14 rounded-2xl flex items-center justify-center shrink-0"
            style={{ background: '#7c3aed22', border: '1px solid #7c3aed40' }}
          >
            <Sparkles className="h-6 w-6" style={{ color: '#a78bfa' }} />
          </div>
        </div>
      </div>

      {/* ── Notifications ── */}
      <SectionCard
        icon={Bell}
        title="Notifications"
        description="Choose how and when you receive updates."
        accentColor="#7c3aed"
      >
        <PremiumToggle
          icon={Mail}
          label="Email Notifications"
          description="Booking confirmations, invoices and status updates to your inbox."
          checked={emailNotifications}
          onChange={setEmailNotifications}
          accent="#7c3aed"
        />
        <PremiumToggle
          icon={Megaphone}
          label="Marketing Updates"
          description="Curated news, promotions and offers from studios you've worked with."
          checked={marketingUpdates}
          onChange={setMarketingUpdates}
          accent="#db2777"
        />
      </SectionCard>

      {/* ── Security & Privacy ── */}
      <SectionCard
        icon={Shield}
        title="Security &amp; Privacy"
        description="Control how your data and identity are shared."
        accentColor="#10b981"
      >
        {/* Info banner */}
        <div
          className="flex items-start gap-3 px-4 py-3 rounded-2xl mb-1"
          style={{ background: '#0ea5e910', border: '1px solid #0ea5e930' }}
        >
          <Info className="h-4 w-4 shrink-0 mt-0.5" style={{ color: '#38bdf8' }} />
          <p className="text-xs leading-relaxed" style={{ color: '#7dd3fc' }}>
            Two-Factor Authentication is managed via your Google account. Sign in with Google to enable 2FA automatically.
          </p>
        </div>
        <PremiumToggle
          icon={Eye}
          label="Public Identity"
          description="Allow studios to find your profile by email for booking auto-fill."
          checked={publicIdentity}
          onChange={setPublicIdentity}
          accent="#10b981"
        />
        {/* Static lock row */}
        <div
          className="flex items-center justify-between px-5 py-4 rounded-2xl"
          style={{ background: 'var(--surface-2)', border: '1px solid var(--border-light)' }}
        >
          <div className="flex items-center gap-4">
            <div
              className="h-10 w-10 rounded-2xl flex items-center justify-center shrink-0"
              style={{ background: 'var(--surface-3)', border: '1px solid var(--border)' }}
            >
              <Lock className="h-4 w-4 text-[var(--foreground-tertiary)]" />
            </div>
            <div>
              <p className="font-bold text-sm text-[var(--foreground)]">Two-Factor Authentication</p>
              <p className="text-xs text-[var(--foreground-tertiary)] mt-0.5">Managed by Google</p>
            </div>
          </div>
          <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold" style={{ background: '#10b98115', border: '1px solid #10b98130', color: '#34d399' }}>
            <CheckCircle2 className="h-3 w-3" />
            Protected
          </div>
        </div>
      </SectionCard>

      {/* ── Appearance ── */}
      <SectionCard
        icon={Moon}
        title="Appearance"
        description="Control how the portal looks on your device."
        accentColor="#f59e0b"
      >
        <div className="grid grid-cols-3 gap-3">
          {THEME_OPTIONS.map(({ label, icon: ThemeIcon }) => {
            const isActive = selectedTheme === label;
            return (
              <button
                key={label}
                onClick={() => setSelectedTheme(label)}
                className="flex flex-col items-center gap-2.5 p-4 rounded-2xl transition-all duration-200 font-bold text-xs"
                style={{
                  background: isActive ? '#7c3aed18' : 'var(--surface-2)',
                  border: `2px solid ${isActive ? '#7c3aed' : 'var(--border)'}`,
                  color: isActive ? '#a78bfa' : 'var(--foreground-tertiary)',
                  boxShadow: isActive ? '0 0 16px #7c3aed20' : 'none',
                }}
              >
                <ThemeIcon className="h-5 w-5" />
                {label}
                {label === 'Dark' && (
                  <span className="text-[11px] font-semibold px-1.5 py-0.5 rounded-full" style={{ background: '#f59e0b20', color: '#fbbf24' }}>
                    Soon
                  </span>
                )}
              </button>
            );
          })}
        </div>
        <p className="text-xs text-[var(--foreground-tertiary)] px-1 mt-1">
          Dark mode and System theme are coming soon. Light is currently active for all users.
        </p>
      </SectionCard>

      {/* ── Save bar ── */}
      <div
        className="flex items-center justify-between gap-4 px-6 py-4 rounded-2xl sticky bottom-4"
        style={{
          background: 'var(--surface-1)',
          border: '1px solid var(--border)',
          backdropFilter: 'blur(12px)',
          boxShadow: 'var(--shadow-lg)',
        }}
      >
        <div className="flex items-center gap-2 text-sm text-[var(--foreground-tertiary)]">
          {saveSuccess ? (
            <>
              <CheckCircle2 className="h-4 w-4" style={{ color: '#34d399' }} />
              <span style={{ color: '#34d399' }} className="font-semibold">All changes saved</span>
            </>
          ) : (
            <>
              <ChevronRight className="h-4 w-4" />
              <span>Unsaved changes will be lost on exit</span>
            </>
          )}
        </div>
        <Button
          onClick={handleSave}
          isLoading={saving}
          disabled={saving}
          className="min-w-[140px] h-10 rounded-xl btn-shimmer"
          style={{ boxShadow: '0 4px 20px #7c3aed30' } as React.CSSProperties}
        >
          {!saving && 'Save Preferences'}
        </Button>
      </div>
    </div>
  );
}
