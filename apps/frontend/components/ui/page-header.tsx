import React from 'react';

/* ──────────────────────────────────────────────────────────────────
   PageHeader — premium dark hero banner used across all dashboard
   pages. Provides consistent visual identity.
   ────────────────────────────────────────────────────────────────── */

interface PageHeaderProps {
  /** Small eyebrow label above the title */
  eyebrow?: string;
  /** Main page title */
  title: string;
  /** Subtitle / description */
  subtitle?: string;
  /** Right-side content (buttons, badges, etc.) */
  actions?: React.ReactNode;
  /** Additional stat/badge chips shown below title */
  chips?: Array<{ label: string; color?: string; bg?: string }>;
  /** Override gradient — defaults to deep violet */
  gradient?: string;
  /** Accent orb color override */
  accentColor?: string;
}

export function PageHeader({
  eyebrow,
  title,
  subtitle,
  actions,
  chips,
  gradient = 'linear-gradient(135deg, #07041a 0%, #110828 60%, #080510 100%)',
  accentColor = '#7c3aed',
}: PageHeaderProps) {
  return (
    <div
      className="relative rounded-3xl overflow-hidden px-6 sm:px-8 py-8 sm:py-10"
      style={{ background: gradient }}
    >
      {/* Primary ambient orb */}
      <div
        className="absolute top-0 left-0 w-80 h-80 rounded-full pointer-events-none"
        style={{
          background: `radial-gradient(circle, ${accentColor}33, transparent 70%)`,
          transform: 'translate(-35%, -35%)',
          opacity: 0.8,
        }}
        aria-hidden="true"
      />
      {/* Rose orb */}
      <div
        className="absolute bottom-0 right-0 w-56 h-56 rounded-full pointer-events-none"
        style={{
          background: 'radial-gradient(circle, #db277722, transparent 70%)',
          transform: 'translate(30%, 30%)',
        }}
        aria-hidden="true"
      />
      {/* Grid mesh */}
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          backgroundImage:
            'linear-gradient(rgba(255,255,255,0.035) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.035) 1px, transparent 1px)',
          backgroundSize: '40px 40px',
        }}
        aria-hidden="true"
      />

      <div className="relative flex flex-col sm:flex-row sm:items-center sm:justify-between gap-5">
        <div>
          {eyebrow && (
            <p
              className="text-[11px] font-bold uppercase tracking-[0.2em] mb-2"
              style={{ color: `${accentColor}bb` }}
            >
              {eyebrow}
            </p>
          )}
          <h1
            className="text-2xl sm:text-3xl font-black tracking-tight leading-tight"
            style={{
              background: 'linear-gradient(135deg, #fff 0%, #e2d9f3 100%)',
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
              fontFamily: 'var(--font-heading)',
            }}
          >
            {title}
          </h1>
          {subtitle && (
            <p className="mt-1.5 text-sm leading-relaxed" style={{ color: 'rgba(167,139,250,0.65)' }}>
              {subtitle}
            </p>
          )}
          {chips && chips.length > 0 && (
            <div className="flex flex-wrap gap-2 mt-3">
              {chips.map((chip) => (
                <span
                  key={chip.label}
                  className="inline-flex items-center px-3 py-1 rounded-full text-xs font-bold"
                  style={{
                    background: chip.bg ?? `${accentColor}22`,
                    border: `1px solid ${chip.color ?? accentColor}44`,
                    color: chip.color ?? '#a78bfa',
                  }}
                >
                  {chip.label}
                </span>
              ))}
            </div>
          )}
        </div>

        {actions && (
          <div className="flex items-center gap-2.5 flex-wrap shrink-0">
            {actions}
          </div>
        )}
      </div>
    </div>
  );
}
