import { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router';
import {
  FileText,
  HardDrive,
  Images,
  Inbox,
  Megaphone,
  PencilLine,
  Plus,
  Settings,
} from 'lucide-react';
import { api, ApiError, type DashboardStats, type InboxCounts } from '../lib/api';
import { PageHeader } from './AdminLayout';
import { useAuth } from './admin-context';
import {
  Badge,
  Button,
  ErrorState,
  Panel,
  PanelHeader,
  Spinner,
  StatCard,
  formatBytes,
  relativeTime,
} from './ui';

export function OverviewPage() {
  const { user } = useAuth();

  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [inbox, setInbox] = useState<InboxCounts | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      // Fetched together: the dashboard is not useful with half its numbers,
      // and two sequential round trips would double the time to first paint.
      const [dashboard, messages] = await Promise.all([
        api.stats(),
        api.contact.list('?limit=1').catch(() => null),
      ]);

      setStats(dashboard);
      setInbox(messages?.meta.counts ?? null);
    } catch (caught) {
      setError(caught instanceof ApiError ? caught.message : 'Could not reach the server.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    document.title = 'Dashboard · ADEF Admin';
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
        <div className="space-y-4">
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <StatCard
              label="Gallery photos"
              value={stats.galleryImages}
              icon={<Images className="h-4 w-4" />}
              hint="Shown in the campus gallery"
              href={
                <Link to="/admin/gallery" className="text-[12px] font-medium text-[var(--orange)] hover:underline">
                  Manage gallery →
                </Link>
              }
            />

            <StatCard
              label="Published"
              value={stats.publishedAnnouncements}
              icon={<Megaphone className="h-4 w-4" />}
              hint="Announcements live on the site"
              href={
                <Link
                  to="/admin/announcements?status=PUBLISHED"
                  className="text-[12px] font-medium text-[var(--orange)] hover:underline"
                >
                  View published →
                </Link>
              }
            />

            {/* Drafts are the one number that usually needs acting on, so it is
                the only card that draws attention to itself. */}
            <StatCard
              label="Drafts"
              value={stats.draftAnnouncements}
              icon={<PencilLine className="h-4 w-4" />}
              tone={stats.draftAnnouncements > 0 ? 'attention' : 'neutral'}
              hint={
                stats.draftAnnouncements > 0
                  ? `${stats.draftAnnouncements === 1 ? 'One is' : 'These are'} not visible on the website`
                  : 'Nothing waiting to be published'
              }
              href={
                <Link
                  to="/admin/announcements?status=DRAFT"
                  className="text-[12px] font-medium text-[var(--orange)] hover:underline"
                >
                  Review drafts →
                </Link>
              }
            />

            <StatCard
              label="New enquiries"
              value={inbox?.NEW ?? 0}
              icon={<Inbox className="h-4 w-4" />}
              tone={(inbox?.NEW ?? 0) > 0 ? 'attention' : 'neutral'}
              hint={
                (inbox?.NEW ?? 0) > 0
                  ? 'Unread messages from the contact form'
                  : 'Everything has been read'
              }
              href={
                <Link to="/admin/inbox" className="text-[12px] font-medium text-[var(--orange)] hover:underline">
                  Open inbox →
                </Link>
              }
            />
          </div>

          <div className="grid gap-4 lg:grid-cols-3">
            <Panel className="lg:col-span-2">
              <PanelHeader
                title="Recent activity"
                description="Who changed what, most recent first."
              />

              {stats.recentActivity.length === 0 ? (
                <p className="px-4 py-10 text-center text-[13px] text-slate-500">
                  Nothing has been changed yet.
                </p>
              ) : (
                <ul className="divide-y divide-slate-100">
                  {stats.recentActivity.map((entry) => (
                    <li key={entry.id} className="flex items-center gap-3 px-4 py-2.5">
                      <ActionDot action={entry.action} />
                      <span className="min-w-0 flex-1 text-[13px] text-slate-700">
                        <span className="font-medium text-slate-900">{entry.actor}</span>{' '}
                        {verbFor(entry.action)}{' '}
                        <span className="text-slate-500">{labelFor(entry.entity)}</span>
                      </span>
                      <time
                        dateTime={entry.at}
                        className="shrink-0 text-[11px] tabular-nums text-slate-400"
                      >
                        {relativeTime(entry.at)}
                      </time>
                    </li>
                  ))}
                </ul>
              )}
            </Panel>

            <div className="space-y-4">
              <Panel>
                <PanelHeader title="Quick actions" />
                <div className="space-y-2 p-3">
                  <Link to="/admin/announcements?new=1" className="block">
                    <Button variant="secondary" className="w-full justify-start">
                      <FileText className="h-3.5 w-3.5" aria-hidden />
                      Write an announcement
                    </Button>
                  </Link>
                  <Link to="/admin/gallery" className="block">
                    <Button variant="secondary" className="w-full justify-start">
                      <Images className="h-3.5 w-3.5" aria-hidden />
                      Add photos to the gallery
                    </Button>
                  </Link>
                  <Link to="/admin/courses" className="block">
                    <Button variant="secondary" className="w-full justify-start">
                      <Plus className="h-3.5 w-3.5" aria-hidden />
                      Add a course
                    </Button>
                  </Link>
                  <Link to="/admin/settings" className="block">
                    <Button variant="secondary" className="w-full justify-start">
                      <Settings className="h-3.5 w-3.5" aria-hidden />
                      Edit site details
                    </Button>
                  </Link>
                </div>
              </Panel>

              <Panel padded>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2 text-slate-500">
                    <HardDrive className="h-4 w-4" aria-hidden />
                    <span className="text-[12px] font-medium">Storage used</span>
                  </div>
                  <span className="text-[13px] font-semibold tabular-nums text-slate-900">
                    {formatBytes(stats.storageBytes)}
                  </span>
                </div>
                <p className="mt-1.5 text-[11px] text-slate-500">
                  Photos and documents uploaded through the dashboard.
                </p>
              </Panel>

              {stats.draftAnnouncements > 0 && (
                <Panel padded className="border-amber-300 bg-amber-50/50">
                  <Badge tone="warning">Needs attention</Badge>
                  <p className="mt-2 text-[12px] leading-relaxed text-amber-900">
                    {stats.draftAnnouncements === 1
                      ? '1 announcement is still a draft and is not visible on the website.'
                      : `${stats.draftAnnouncements} announcements are still drafts and are not visible on the website.`}
                  </p>
                </Panel>
              )}
            </div>
          </div>
        </div>
      )}
    </>
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
          : action.startsWith('PASSWORD_RESET')
            ? 'bg-blue-500'
            : 'bg-slate-300';

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
    case 'PASSWORD_RESET_REQUESTED':
      return 'requested a password reset for';
    case 'PASSWORD_RESET':
      return 'changed the password for';
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
    case 'Course':
      return 'a course';
    case 'Testimonial':
      return 'a testimonial';
    case 'HeroSlide':
      return 'a hero slide';
    case 'Feature':
      return 'a why-choose-us point';
    case 'WorkingHours':
      return 'the opening hours';
    case 'SiteSettings':
      return 'the site settings';
    case 'ContactMessage':
      return 'an enquiry';
    case 'AdminUser':
      return 'a staff account';
    default:
      return entity;
  }
}
