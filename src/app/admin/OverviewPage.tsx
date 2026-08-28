import { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router';
import { FileText, HardDrive, Images, Megaphone, PencilLine } from 'lucide-react';
import { api, ApiError, type DashboardStats } from '../lib/api';
import { PageHeader } from './AdminLayout';
import { useAuth } from './admin-context';
import { Button, ErrorState, Spinner, formatBytes } from './ui';

export function OverviewPage() {
  const { user } = useAuth();
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      setStats(await api.stats());
    } catch (caught) {
      setError(
        caught instanceof ApiError ? caught.message : 'Could not reach the server.',
      );
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    document.title = 'Overview · ADEF Admin';
    void load();
  }, [load]);

  return (
    <>
      <PageHeader
        title={`Welcome back, ${user?.name.split(' ')[0] ?? 'there'}`}
        description="Everything published on the ADEF website is managed from here."
      />

      {loading && <Spinner label="Loading your dashboard" />}
      {error && !loading && <ErrorState message={error} onRetry={load} />}

      {stats && !loading && !error && (
        <>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <StatCard
              icon={<Images className="h-4 w-4" />}
              label="Gallery photos"
              value={stats.galleryImages}
              to="/admin/gallery"
            />
            <StatCard
              icon={<Megaphone className="h-4 w-4" />}
              label="Published"
              value={stats.publishedAnnouncements}
              to="/admin/announcements?status=PUBLISHED"
            />
            <StatCard
              icon={<PencilLine className="h-4 w-4" />}
              label="Drafts"
              value={stats.draftAnnouncements}
              // Drafts are the one number that usually needs acting on, so it
              // is the only card that draws attention to itself.
              highlight={stats.draftAnnouncements > 0}
              to="/admin/announcements?status=DRAFT"
            />
            <StatCard
              icon={<HardDrive className="h-4 w-4" />}
              label="Storage used"
              value={formatBytes(stats.storageBytes)}
            />
          </div>

          <div className="mt-6 grid gap-6 lg:grid-cols-3">
            <section className="lg:col-span-2">
              <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-slate-500">
                Recent activity
              </h2>

              {stats.recentActivity.length === 0 ? (
                <p className="rounded-xl border border-dashed border-slate-300 bg-white px-4 py-8 text-center text-sm text-slate-500">
                  Nothing has been changed yet.
                </p>
              ) : (
                <ul className="divide-y divide-slate-200 overflow-hidden rounded-xl border border-slate-200 bg-white">
                  {stats.recentActivity.map((entry) => (
                    <li key={entry.id} className="flex items-center gap-3 px-4 py-3">
                      <ActionDot action={entry.action} />
                      <span className="min-w-0 flex-1 text-sm text-slate-700">
                        <span className="font-medium text-[var(--navy)]">{entry.actor}</span>{' '}
                        {verbFor(entry.action)}{' '}
                        <span className="text-slate-500">{labelFor(entry.entity)}</span>
                      </span>
                      <time
                        dateTime={entry.at}
                        className="shrink-0 text-xs tabular-nums text-slate-400"
                      >
                        {relativeTime(entry.at)}
                      </time>
                    </li>
                  ))}
                </ul>
              )}
            </section>

            <section>
              <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-slate-500">
                Quick actions
              </h2>
              <div className="space-y-2.5">
                <Link to="/admin/gallery" className="block">
                  <Button variant="secondary" className="w-full justify-start">
                    <Images className="h-4 w-4" aria-hidden />
                    Add photos to the gallery
                  </Button>
                </Link>
                <Link to="/admin/announcements?new=1" className="block">
                  <Button variant="secondary" className="w-full justify-start">
                    <FileText className="h-4 w-4" aria-hidden />
                    Write an announcement
                  </Button>
                </Link>
              </div>

              {stats.draftAnnouncements > 0 && (
                <p className="mt-4 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2.5 text-xs text-amber-900">
                  {stats.draftAnnouncements === 1
                    ? '1 announcement is still a draft and is not visible on the website.'
                    : `${stats.draftAnnouncements} announcements are still drafts and are not visible on the website.`}
                </p>
              )}
            </section>
          </div>
        </>
      )}
    </>
  );
}

function StatCard({
  icon,
  label,
  value,
  to,
  highlight = false,
}: {
  icon: React.ReactNode;
  label: string;
  value: number | string;
  to?: string;
  highlight?: boolean;
}) {
  const content = (
    <div
      className={`h-full rounded-xl border bg-white p-4 transition-shadow ${
        highlight ? 'border-amber-300 ring-1 ring-amber-200' : 'border-slate-200'
      } ${to ? 'hover:shadow-md' : ''}`}
    >
      <div className="flex items-center gap-2 text-slate-500">
        <span className={highlight ? 'text-amber-600' : 'text-[var(--gold)]'} aria-hidden>
          {icon}
        </span>
        <span className="text-xs font-medium uppercase tracking-wide">{label}</span>
      </div>
      <p className="mt-2 text-2xl font-bold tabular-nums text-[var(--navy)]">{value}</p>
    </div>
  );

  return to ? (
    <Link to={to} className="block rounded-xl focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--gold)]">
      {content}
    </Link>
  ) : (
    content
  );
}

function ActionDot({ action }: { action: string }) {
  const colour =
    action === 'CREATE'
      ? 'bg-emerald-500'
      : action === 'DELETE'
        ? 'bg-red-500'
        : action === 'LOGIN_FAILED'
          ? 'bg-amber-500'
          : 'bg-slate-400';

  return <span className={`h-1.5 w-1.5 shrink-0 rounded-full ${colour}`} aria-hidden />;
}

function verbFor(action: string): string {
  switch (action) {
    case 'CREATE':
      return 'added';
    case 'UPDATE':
      return 'updated';
    case 'DELETE':
      return 'removed';
    case 'LOGIN':
      return 'signed in';
    case 'LOGIN_FAILED':
      return 'failed to sign in';
    default:
      return 'changed';
  }
}

function labelFor(entity: string): string {
  switch (entity) {
    case 'GalleryImage':
      return 'a gallery photo';
    case 'Announcement':
      return 'an announcement';
    case 'AdminUser':
      return '';
    default:
      return entity;
  }
}

function relativeTime(iso: string): string {
  const seconds = Math.round((Date.now() - new Date(iso).getTime()) / 1000);

  if (seconds < 60) return 'just now';
  if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`;
  if (seconds < 86400) return `${Math.floor(seconds / 3600)}h ago`;
  if (seconds < 604800) return `${Math.floor(seconds / 86400)}d ago`;

  return new Date(iso).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' });
}
