'use client';

import { useEffect, useState, useCallback } from 'react';
import {
  Star,
  MessageSquare,
  Eye,
  EyeOff,
  Trash2,
  ChevronDown,
  ChevronUp,
  Check,
  X,
  Search,
  Filter,
  TrendingUp,
  AlertCircle,
  Clock,
} from 'lucide-react';
import { reviewsApi } from '@/lib/api';
import { Button } from '@/components/ui/button';
import { PageHeader } from '@/components/ui/page-header';
import { useToast } from '@/components/ui/toast';

// ── Types ────────────────────────────────────────────────────────────────────

interface Review {
  id: string;
  rating: number;
  comment: string | null;
  reply: string | null;
  isVisible: boolean;
  createdAt: string;
  customer: { id: string; name: string; email: string; phone: string };
  booking: {
    id: string;
    scheduledAt: string;
    service: { name: string };
  } | null;
}

interface ReviewStats {
  avgRating: number;
  totalReviews: number;
  distribution: { star: number; count: number }[];
  visibleCount: number;
  pendingReplyCount: number;
}

// ── Helpers ────────────────────────────────────────────────────────────────

function formatDate(dateStr: string, opts?: Intl.DateTimeFormatOptions) {
  try {
    return new Date(dateStr).toLocaleDateString('en-IN', opts ?? {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
    });
  } catch {
    return '—';
  }
}

function isRecent(dateStr: string) {
  return Date.now() - new Date(dateStr).getTime() < 7 * 24 * 60 * 60 * 1000;
}

function StarRow({ rating, size = 'sm' }: { rating: number; size?: 'sm' | 'md' | 'lg' }) {
  const cls = size === 'lg' ? 'h-6 w-6' : size === 'md' ? 'h-5 w-5' : 'h-4 w-4';
  return (
    <div className="flex items-center gap-0.5">
      {Array.from({ length: 5 }).map((_, i) => (
        <Star
          key={i}
          className={cls}
          style={{
            color: i < rating ? '#f59e0b' : '#d1d5db',
            fill: i < rating ? '#f59e0b' : 'none',
          }}
        />
      ))}
    </div>
  );
}

// ── Main Component ────────────────────────────────────────────────────────────

export default function ReviewsPage() {
  const { addToast } = useToast();

  const [reviews, setReviews] = useState<Review[]>([]);
  const [stats, setStats] = useState<ReviewStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [filterRating, setFilterRating] = useState<number | 'all'>('all');
  const [filterVisible, setFilterVisible] = useState<boolean | 'all'>('all');

  // Per-card state
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [replyingId, setReplyingId] = useState<string | null>(null);
  const [replyText, setReplyText] = useState('');
  const [submittingReply, setSubmittingReply] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [togglingId, setTogglingId] = useState<string | null>(null);

  // ── Fetch ── 
  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await reviewsApi.getAll();
      setReviews(res.data.reviews ?? []);
      setStats(res.data.stats ?? null);
    } catch {
      addToast('error', 'Failed to load reviews');
    } finally {
      setLoading(false);
    }
  }, [addToast]);

  useEffect(() => { load(); }, [load]);

  // ── Actions ──

  const handleReply = async (reviewId: string) => {
    if (!replyText.trim()) return;
    setSubmittingReply(true);
    try {
      await reviewsApi.reply(reviewId, replyText.trim());
      addToast('success', 'Reply posted successfully!');
      setReplyingId(null);
      setReplyText('');
      load();
    } catch {
      addToast('error', 'Failed to post reply');
    } finally {
      setSubmittingReply(false);
    }
  };

  const handleToggleVisibility = async (reviewId: string, currentlyVisible: boolean) => {
    setTogglingId(reviewId);
    try {
      await reviewsApi.toggleVisibility(reviewId);
      addToast('success', currentlyVisible ? 'Review hidden from public page.' : 'Review is now visible.');
      load();
    } catch {
      addToast('error', 'Failed to toggle visibility');
    } finally {
      setTogglingId(null);
    }
  };

  const handleDelete = async (reviewId: string) => {
    setDeletingId(reviewId);
    try {
      await reviewsApi.delete(reviewId);
      addToast('success', 'Review deleted.');
      load();
    } catch {
      addToast('error', 'Failed to delete review');
    } finally {
      setDeletingId(null);
    }
  };

  // ── Filtering ──

  const filtered = reviews.filter((r) => {
    const matchSearch =
      !search ||
      r.customer.name.toLowerCase().includes(search.toLowerCase()) ||
      (r.comment ?? '').toLowerCase().includes(search.toLowerCase());
    const matchRating = filterRating === 'all' || r.rating === filterRating;
    const matchVisible = filterVisible === 'all' || r.isVisible === filterVisible;
    return matchSearch && matchRating && matchVisible;
  });

  // ── Render helpers ──

  const StatCard = ({
    label,
    value,
    icon: Icon,
    color,
    sub,
  }: {
    label: string;
    value: string | number;
    icon: React.ElementType;
    color: string;
    sub?: string;
  }) => (
    <div className="bg-white border border-border rounded-xl p-5">
      <div className="flex items-start justify-between mb-3">
        <div className={`h-10 w-10 rounded-lg flex items-center justify-center`} style={{ backgroundColor: `${color}15` }}>
          <Icon className="h-5 w-5" style={{ color }} />
        </div>
      </div>
      <div className="text-2xl font-black text-foreground tabular-nums">{value}</div>
      <div className="text-xs font-semibold text-foreground-secondary mt-0.5">{label}</div>
      {sub && <div className="text-[10px] text-foreground-tertiary mt-1">{sub}</div>}
    </div>
  );

  if (loading) {
    return (
      <div className="flex items-center justify-center py-24">
        <div className="h-8 w-8 border-2 border-primary/20 border-t-primary rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 py-8 space-y-8">
      <PageHeader
        title="Reviews"
        subtitle={`${stats?.totalReviews ?? 0} total reviews · ${stats?.avgRating?.toFixed(1) ?? '—'} avg rating`}
      />

      {/* ── Stats Row ── */}
      {stats && (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <StatCard
            label="Average Rating"
            value={stats.avgRating.toFixed(1)}
            icon={Star}
            color="#f59e0b"
            sub="out of 5.0"
          />
          <StatCard
            label="Total Reviews"
            value={stats.totalReviews}
            icon={TrendingUp}
            color="#6366f1"
          />
          <StatCard
            label="Visible"
            value={stats.visibleCount}
            icon={Eye}
            color="#22c55e"
            sub={`${stats.totalReviews - stats.visibleCount} hidden`}
          />
          <StatCard
            label="Awaiting Reply"
            value={stats.pendingReplyCount}
            icon={MessageSquare}
            color="#f97316"
            sub="Need your response"
          />
        </div>
      )}

      {/* ── Rating Distribution ── */}
      {stats && stats.totalReviews > 0 && (
        <div className="bg-white border border-border rounded-xl p-6">
          <h3 className="text-sm font-black uppercase tracking-wider text-foreground-secondary mb-4">Rating Distribution</h3>
          <div className="space-y-2.5">
            {stats.distribution.map(({ star, count }) => {
              const pct = stats.totalReviews > 0 ? Math.round((count / stats.totalReviews) * 100) : 0;
              return (
                <div key={star} className="flex items-center gap-3">
                  <button
                    className="flex items-center gap-1.5 min-w-[60px] hover:opacity-70 transition-opacity"
                    onClick={() => setFilterRating(filterRating === star ? 'all' : star)}
                  >
                    <span className="text-sm font-black tabular-nums text-foreground">{star}</span>
                    <Star className="h-3.5 w-3.5 fill-amber-400 text-amber-400" />
                  </button>
                  <div className="flex-1 h-2.5 rounded-full bg-border overflow-hidden">
                    <div
                      className="h-full rounded-full transition-all duration-700"
                      style={{
                        width: `${pct}%`,
                        backgroundColor: star >= 4 ? '#22c55e' : star === 3 ? '#f59e0b' : '#ef4444',
                      }}
                    />
                  </div>
                  <span className="text-xs font-bold text-foreground-tertiary w-8 text-right tabular-nums">{count}</span>
                  <span className="text-[10px] text-foreground-tertiary w-8 text-right tabular-nums">{pct}%</span>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* ── Filters ── */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-foreground-tertiary" />
          <input
            type="text"
            placeholder="Search by name or comment…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-9 pr-4 py-2.5 border border-border rounded-lg text-sm bg-white focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
          />
        </div>
        <div className="flex gap-2">
          <select
            value={filterRating === 'all' ? 'all' : String(filterRating)}
            onChange={(e) => setFilterRating(e.target.value === 'all' ? 'all' : parseInt(e.target.value))}
            className="border border-border rounded-lg px-3 py-2.5 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-primary/20"
          >
            <option value="all">All Stars</option>
            {[5, 4, 3, 2, 1].map((s) => (
              <option key={s} value={s}>{s} Star{s !== 1 ? 's' : ''}</option>
            ))}
          </select>
          <select
            value={filterVisible === 'all' ? 'all' : filterVisible ? 'visible' : 'hidden'}
            onChange={(e) => {
              if (e.target.value === 'all') setFilterVisible('all');
              else setFilterVisible(e.target.value === 'visible');
            }}
            className="border border-border rounded-lg px-3 py-2.5 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-primary/20"
          >
            <option value="all">All</option>
            <option value="visible">Visible</option>
            <option value="hidden">Hidden</option>
          </select>
        </div>
      </div>

      {/* ── Review Cards ── */}
      {filtered.length === 0 ? (
        <div className="py-20 text-center border border-dashed border-border rounded-xl">
          <Star className="h-10 w-10 text-foreground-tertiary/30 mx-auto mb-3" />
          <h3 className="font-black text-foreground-secondary text-sm">No reviews yet</h3>
          <p className="text-xs text-foreground-tertiary mt-1">Reviews from completed bookings will appear here.</p>
        </div>
      ) : (
        <div className="space-y-4">
          {filtered.map((review) => {
            const isExpanded = expandedId === review.id;
            const isReplying = replyingId === review.id;
            const reviewIsNew = isRecent(review.createdAt);

            return (
              <div
                key={review.id}
                className={`bg-white border rounded-xl overflow-hidden transition-all duration-300 ${
                  review.isVisible ? 'border-border' : 'border-border/50 opacity-70'
                }`}
              >
                {/* Card Header */}
                <div className="p-5 flex items-start gap-4">
                  {/* Avatar */}
                  <div className="h-11 w-11 rounded-full bg-primary/10 flex items-center justify-center text-sm font-black text-primary shrink-0">
                    {(review.customer.name || '?').charAt(0).toUpperCase()}
                  </div>

                  {/* Content */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap mb-1">
                      <span className="text-sm font-black text-foreground">{review.customer.name}</span>
                      {reviewIsNew && (
                        <span className="px-2 py-0.5 text-[9px] font-black uppercase tracking-wider rounded-full bg-primary/10 text-primary border border-primary/20 animate-pulse">
                          New
                        </span>
                      )}
                      {!review.isVisible && (
                        <span className="px-2 py-0.5 text-[9px] font-black uppercase tracking-wider rounded-full bg-red-50 text-red-500 border border-red-200">
                          Hidden
                        </span>
                      )}
                      {review.reply && (
                        <span className="px-2 py-0.5 text-[9px] font-black uppercase tracking-wider rounded-full bg-green-50 text-green-600 border border-green-200">
                          Replied
                        </span>
                      )}
                    </div>

                    <div className="flex items-center gap-2 mb-2">
                      <StarRow rating={review.rating} />
                      <span className="text-[10px] font-bold text-foreground-tertiary flex items-center gap-1">
                        <Clock className="h-3 w-3" />
                        {formatDate(review.createdAt)}
                      </span>
                    </div>

                    <p className="text-sm text-foreground-secondary leading-relaxed line-clamp-3">
                      {review.comment || <span className="italic text-foreground-tertiary">No comment</span>}
                    </p>

                    {/* Booking link */}
                    {review.booking && (
                      <div className="mt-2 text-[10px] font-semibold text-foreground-tertiary flex items-center gap-1">
                        <span className="text-primary/60">Session:</span>
                        {review.booking.service.name} · {formatDate(review.booking.scheduledAt, { month: 'short', day: 'numeric', year: 'numeric' })}
                      </div>
                    )}

                    {/* Studio reply preview */}
                    {review.reply && !isExpanded && (
                      <div className="mt-3 p-3 bg-muted/50 border-l-2 border-primary/40 rounded-r text-xs text-foreground-secondary">
                        <span className="block text-[9px] font-black uppercase tracking-widest text-primary mb-0.5">Your Reply</span>
                        <span className="line-clamp-2">{review.reply}</span>
                      </div>
                    )}
                  </div>

                  {/* Actions */}
                  <div className="flex items-center gap-1 shrink-0">
                    <button
                      onClick={() =>
                        handleToggleVisibility(review.id, review.isVisible)
                      }
                      disabled={togglingId === review.id}
                      title={review.isVisible ? 'Hide review' : 'Show review'}
                      className="p-2 rounded-lg hover:bg-muted transition-colors text-foreground-tertiary hover:text-foreground disabled:opacity-40"
                    >
                      {review.isVisible ? <Eye className="h-4 w-4" /> : <EyeOff className="h-4 w-4" />}
                    </button>
                    <button
                      onClick={() => setExpandedId(isExpanded ? null : review.id)}
                      className="p-2 rounded-lg hover:bg-muted transition-colors text-foreground-tertiary hover:text-foreground"
                      title="Expand"
                    >
                      {isExpanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                    </button>
                  </div>
                </div>

                {/* Expanded panel */}
                {isExpanded && (
                  <div className="border-t border-border bg-muted/30 p-5 space-y-4">
                    {/* Full comment */}
                    {review.comment && (
                      <div>
                        <div className="text-[10px] font-black uppercase tracking-widest text-foreground-tertiary mb-2">Customer Comment</div>
                        <p className="text-sm text-foreground-secondary leading-relaxed">&ldquo;{review.comment}&rdquo;</p>
                      </div>
                    )}

                    {/* Full reply */}
                    {review.reply && (
                      <div>
                        <div className="text-[10px] font-black uppercase tracking-widest text-primary mb-2">Your Reply</div>
                        <div className="p-3 bg-white border-l-2 border-primary rounded-r text-sm text-foreground-secondary">
                          {review.reply}
                        </div>
                      </div>
                    )}

                    {/* Reply form */}
                    {isReplying ? (
                      <div className="space-y-3">
                        <div className="text-[10px] font-black uppercase tracking-widest text-foreground-secondary">
                          {review.reply ? 'Update Reply' : 'Write a Reply'}
                        </div>
                        <textarea
                          rows={3}
                          className="w-full border border-border rounded-lg px-4 py-3 text-sm text-foreground resize-none focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary bg-white"
                          placeholder="Write a thoughtful, professional response..."
                          value={replyText}
                          onChange={(e) => setReplyText(e.target.value)}
                          autoFocus
                        />
                        <div className="flex gap-2">
                          <Button
                            onClick={() => handleReply(review.id)}
                            isLoading={submittingReply}
                            disabled={submittingReply || !replyText.trim()}
                            className="gap-2"
                          >
                            <Check className="h-4 w-4" />
                            {review.reply ? 'Update Reply' : 'Post Reply'}
                          </Button>
                          <Button
                            variant="outline"
                            onClick={() => { setReplyingId(null); setReplyText(''); }}
                          >
                            <X className="h-4 w-4 mr-1" /> Cancel
                          </Button>
                        </div>
                      </div>
                    ) : (
                      <div className="flex items-center gap-2">
                        <Button
                          variant="outline"
                          className="gap-2 text-xs"
                          onClick={() => {
                            setReplyingId(review.id);
                            setReplyText(review.reply ?? '');
                          }}
                        >
                          <MessageSquare className="h-3.5 w-3.5" />
                          {review.reply ? 'Edit Reply' : 'Reply'}
                        </Button>
                        <Button
                          variant="outline"
                          className="gap-2 text-xs text-red-500 border-red-200 hover:bg-red-50"
                          onClick={() => handleDelete(review.id)}
                          isLoading={deletingId === review.id}
                          disabled={deletingId === review.id}
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                          Delete
                        </Button>
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* ── Empty search result ── */}
      {filtered.length === 0 && reviews.length > 0 && (
        <div className="py-12 text-center">
          <AlertCircle className="h-8 w-8 text-foreground-tertiary/30 mx-auto mb-3" />
          <p className="text-sm font-bold text-foreground-secondary">No reviews match your filters</p>
          <button
            onClick={() => { setSearch(''); setFilterRating('all'); setFilterVisible('all'); }}
            className="text-xs text-primary mt-2 hover:underline"
          >
            Clear filters
          </button>
        </div>
      )}
    </div>
  );
}
