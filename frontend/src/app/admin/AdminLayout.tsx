import { useState } from 'react';
import { Link, NavLink, Outlet, useLocation, useNavigate } from 'react-router';
import {
  ChevronDown,
  ExternalLink,
  GalleryHorizontalEnd,
  Images,
  Inbox,
  LayoutDashboard,
  ListChecks,
  LogOut,
  Megaphone,
  Menu,
  MessageSquareQuote,
  Settings,
  Sparkles,
  UserCircle,
  X,
} from 'lucide-react';
import { useAuth } from './admin-context';
import {
  DropdownMenu,
  MenuItem,
  MenuLabel,
  MenuSeparator,
  Toaster,
  focusRing,
  hairline,
  initialsOf,
} from './ui';

/**
 * The navigation, grouped by what a task is about rather than listed flat.
 *
 * Once the dashboard grew past three screens a single list stopped being
 * scannable — "Working hours" and "Site settings" are both configuration, and
 * putting them under one heading means someone looking for either only has to
 * read one group.
 */
const NAVIGATION: {
  heading: string;
  items: { to: string; label: string; icon: typeof Images; end?: boolean }[];
}[] = [
  {
    heading: 'Overview',
    items: [{ to: '/admin', label: 'Dashboard', icon: LayoutDashboard, end: true }],
  },
  {
    heading: 'Content',
    items: [
      { to: '/admin/hero', label: 'Hero slides', icon: GalleryHorizontalEnd },
      { to: '/admin/courses', label: 'Courses', icon: ListChecks },
      { to: '/admin/gallery', label: 'Gallery', icon: Images },
      { to: '/admin/announcements', label: 'Announcements', icon: Megaphone },
      { to: '/admin/testimonials', label: 'Testimonials', icon: MessageSquareQuote },
      { to: '/admin/features', label: 'Why choose us', icon: Sparkles },
    ],
  },
  {
    heading: 'Enquiries',
    items: [{ to: '/admin/inbox', label: 'Inbox', icon: Inbox }],
  },
  {
    heading: 'Configuration',
    items: [{ to: '/admin/settings', label: 'Site settings', icon: Settings }],
  },
];

/** Route → the name shown in the top bar. */
const PAGE_TITLES: Record<string, string> = {
  '/admin': 'Dashboard',
  '/admin/hero': 'Hero slides',
  '/admin/courses': 'Courses',
  '/admin/gallery': 'Gallery',
  '/admin/announcements': 'Announcements',
  '/admin/testimonials': 'Testimonials',
  '/admin/features': 'Why choose us',
  '/admin/inbox': 'Inbox',
  '/admin/settings': 'Site settings',
  '/admin/profile': 'Your profile',
};

export function AdminLayout() {
  const { user, signOut } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [mobileOpen, setMobileOpen] = useState(false);

  const handleSignOut = async () => {
    await signOut();
    navigate('/admin/login', { replace: true });
  };

  const title = PAGE_TITLES[location.pathname] ?? 'Dashboard';

  return (
    <div className="min-h-screen bg-slate-50">
      <a
        href="#admin-main"
        className="sr-only focus:not-sr-only focus:absolute focus:left-4 focus:top-4 focus:z-[70] focus:rounded-md focus:bg-[var(--navy)] focus:px-4 focus:py-2 focus:text-sm focus:text-white"
      >
        Skip to content
      </a>

      {/* Mobile drawer */}
      {mobileOpen && (
        <div className="fixed inset-0 z-50 lg:hidden">
          <button
            type="button"
            aria-label="Close menu"
            onClick={() => setMobileOpen(false)}
            className="absolute inset-0 cursor-default bg-slate-900/50 backdrop-blur-[2px]"
          />
          <nav className="relative flex h-full w-64 max-w-[85vw] flex-col bg-[var(--navy)] px-3 py-4">
            <div className="mb-5 flex items-center justify-between px-1">
              <Brand />
              <button
                type="button"
                onClick={() => setMobileOpen(false)}
                aria-label="Close menu"
                className={`rounded-md p-1.5 text-white/70 hover:bg-white/10 ${focusRing} focus-visible:ring-offset-[var(--navy)]`}
              >
                <X className="h-4 w-4" aria-hidden />
              </button>
            </div>
            <NavGroups onNavigate={() => setMobileOpen(false)} />
            <SidebarFooter />
          </nav>
        </div>
      )}

      <div className="lg:flex">
        {/* Desktop sidebar */}
        <nav className="sticky top-0 hidden h-screen w-60 shrink-0 flex-col bg-[var(--navy)] px-3 py-4 lg:flex">
          <div className="mb-6 px-2">
            <Brand />
          </div>
          <NavGroups />
          <SidebarFooter />
        </nav>

        <div className="flex min-w-0 flex-1 flex-col">
          {/*
            The horizontal top bar. It carries the page name on the left and
            the account on the right — the two things that stay true on every
            screen, so neither has to move as you navigate.
          */}
          <header
            className={`sticky top-0 z-40 flex h-14 items-center gap-3 border-b ${hairline} bg-white/90 px-4 backdrop-blur sm:px-6`}
          >
            <button
              type="button"
              onClick={() => setMobileOpen(true)}
              aria-label="Open menu"
              className={`-ml-1 rounded-md p-1.5 text-slate-500 hover:bg-slate-100 hover:text-slate-900 lg:hidden ${focusRing}`}
            >
              <Menu className="h-4.5 w-4.5" aria-hidden />
            </button>

            <h1 className="min-w-0 flex-1 truncate text-[15px] font-semibold text-slate-900">
              {title}
            </h1>

            <a
              href="/"
              target="_blank"
              rel="noopener noreferrer"
              className={`hidden items-center gap-1.5 rounded-md px-2 py-1.5 text-[12px] font-medium text-slate-600 transition-colors hover:bg-slate-100 hover:text-slate-900 sm:inline-flex ${focusRing}`}
            >
              <ExternalLink className="h-3.5 w-3.5" aria-hidden />
              View site
            </a>

            <ProfileMenu user={user} onSignOut={handleSignOut} />
          </header>

          <main id="admin-main" className="min-w-0 flex-1 px-4 py-5 sm:px-6 lg:px-8">
            <div className="mx-auto max-w-6xl">
              <Outlet />
            </div>
          </main>
        </div>
      </div>

      <Toaster />
    </div>
  );
}

function Brand() {
  return (
    <Link to="/admin" className={`flex flex-col leading-none rounded ${focusRing} focus-visible:ring-offset-[var(--navy)]`}>
      <span className="text-lg font-bold tracking-tight text-white">ADEF</span>
      <span className="mt-1 text-[10px] font-medium uppercase tracking-[0.18em] text-[var(--gold)]">
        Admin
      </span>
    </Link>
  );
}

function NavGroups({ onNavigate }: { onNavigate?: () => void }) {
  return (
    <div className="flex flex-1 flex-col gap-5 overflow-y-auto">
      {NAVIGATION.map((group) => (
        <div key={group.heading}>
          <p className="mb-1.5 px-2 text-[10px] font-semibold uppercase tracking-wider text-white/35">
            {group.heading}
          </p>
          <ul className="flex flex-col gap-px">
            {group.items.map((item) => (
              <li key={item.to}>
                <NavLink
                  to={item.to}
                  end={item.end}
                  onClick={onNavigate}
                  className={({ isActive }) =>
                    `flex items-center gap-2.5 rounded-md px-2 py-1.5 text-[13px] font-medium transition-colors ${focusRing} focus-visible:ring-offset-[var(--navy)] ${
                      isActive
                        ? 'bg-white/12 text-white'
                        : 'text-white/60 hover:bg-white/6 hover:text-white'
                    }`
                  }
                >
                  {({ isActive }) => (
                    <>
                      <item.icon
                        className={`h-4 w-4 shrink-0 ${isActive ? 'text-[var(--gold)]' : ''}`}
                        aria-hidden
                      />
                      <span className="truncate">{item.label}</span>
                    </>
                  )}
                </NavLink>
              </li>
            ))}
          </ul>
        </div>
      ))}
    </div>
  );
}

function SidebarFooter() {
  return (
    <div className="mt-auto border-t border-white/10 pt-3">
      <a
        href="/"
        target="_blank"
        rel="noopener noreferrer"
        className={`flex items-center gap-2.5 rounded-md px-2 py-1.5 text-[12px] text-white/55 transition-colors hover:bg-white/5 hover:text-white ${focusRing} focus-visible:ring-offset-[var(--navy)]`}
      >
        <ExternalLink className="h-3.5 w-3.5" aria-hidden />
        View the website
      </a>
    </div>
  );
}

/**
 * The account menu in the top-right.
 *
 * The signed-in address is shown inside the menu rather than only the name:
 * on a shared office machine "which account am I in?" is a real question, and
 * two staff members can easily share a first name.
 */
function ProfileMenu({
  user,
  onSignOut,
}: {
  user: { name: string; email: string; role: string } | null;
  onSignOut: () => void;
}) {
  const navigate = useNavigate();

  if (!user) return null;

  return (
    <DropdownMenu
      label="Account menu"
      trigger={({ open }) => (
        <span
          className={`flex items-center gap-1.5 rounded-md py-1 pl-1 pr-1.5 transition-colors ${
            open ? 'bg-slate-100' : 'hover:bg-slate-100'
          }`}
        >
          <span
            className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-[var(--navy)] text-[11px] font-semibold text-white"
            aria-hidden
          >
            {initialsOf(user.name)}
          </span>
          <ChevronDown className="h-3.5 w-3.5 text-slate-400" aria-hidden />
        </span>
      )}
    >
      <div className="px-3 py-2">
        <p className="truncate text-[13px] font-medium text-slate-900">{user.name}</p>
        <p className="truncate text-[11px] text-slate-500">{user.email}</p>
      </div>

      <MenuLabel>
        {user.role === 'SUPER_ADMIN' ? 'Super administrator' : 'Editor'}
      </MenuLabel>

      <MenuSeparator />

      <MenuItem icon={<UserCircle className="h-4 w-4" />} onSelect={() => navigate('/admin/profile')}>
        Profile & password
      </MenuItem>

      <MenuSeparator />

      <MenuItem tone="danger" icon={<LogOut className="h-4 w-4" />} onSelect={onSignOut}>
        Sign out
      </MenuItem>
    </DropdownMenu>
  );
}

/**
 * The heading block at the top of a page's content.
 *
 * Separate from the top bar: that shows where you are, this explains what the
 * screen is for and holds its primary action.
 */
export function PageHeader({
  title,
  description,
  action,
}: {
  title: string;
  description?: string;
  action?: React.ReactNode;
}) {
  return (
    <div className="mb-4 flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
      <div className="min-w-0">
        <h2 className="text-[17px] font-semibold tracking-tight text-slate-900">{title}</h2>
        {description && <p className="mt-0.5 text-[13px] text-slate-500">{description}</p>}
      </div>
      {action && <div className="shrink-0">{action}</div>}
    </div>
  );
}
