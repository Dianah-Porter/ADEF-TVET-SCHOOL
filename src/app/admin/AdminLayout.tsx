import { useState } from 'react';
import { NavLink, Outlet, useNavigate } from 'react-router';
import { Images, LayoutDashboard, LogOut, Megaphone, Menu, ExternalLink, X } from 'lucide-react';
import { useAuth } from './admin-context';
import { Toaster, focusRing } from './ui';

const navigation = [
  { to: '/admin', label: 'Overview', icon: LayoutDashboard, end: true },
  { to: '/admin/gallery', label: 'Gallery', icon: Images, end: false },
  { to: '/admin/announcements', label: 'Announcements', icon: Megaphone, end: false },
];

export function AdminLayout() {
  const { user, signOut } = useAuth();
  const navigate = useNavigate();
  const [mobileOpen, setMobileOpen] = useState(false);

  const handleSignOut = async () => {
    await signOut();
    navigate('/admin/login', { replace: true });
  };

  return (
    <div className="min-h-screen bg-slate-50">
      <a
        href="#admin-main"
        className="sr-only focus:not-sr-only focus:absolute focus:left-4 focus:top-4 focus:z-[70] focus:rounded-lg focus:bg-[var(--navy)] focus:px-4 focus:py-2 focus:text-sm focus:text-white"
      >
        Skip to content
      </a>

      {/* Mobile top bar */}
      <header className="sticky top-0 z-40 flex items-center justify-between border-b border-slate-800 bg-[var(--navy)] px-4 py-3 lg:hidden">
        <Brand />
        <button
          type="button"
          onClick={() => setMobileOpen(true)}
          aria-label="Open menu"
          className={`rounded-lg p-2 text-white/80 hover:bg-white/10 hover:text-white ${focusRing} focus-visible:ring-offset-[var(--navy)]`}
        >
          <Menu className="h-5 w-5" aria-hidden />
        </button>
      </header>

      {/* Mobile drawer */}
      {mobileOpen && (
        <div className="fixed inset-0 z-50 lg:hidden">
          <button
            type="button"
            aria-label="Close menu"
            onClick={() => setMobileOpen(false)}
            className="absolute inset-0 cursor-default bg-slate-900/60 backdrop-blur-sm"
          />
          <nav className="relative flex h-full w-72 max-w-[85vw] flex-col bg-[var(--navy)] px-4 py-5">
            <div className="mb-6 flex items-center justify-between">
              <Brand />
              <button
                type="button"
                onClick={() => setMobileOpen(false)}
                aria-label="Close menu"
                className={`rounded-lg p-2 text-white/80 hover:bg-white/10 ${focusRing} focus-visible:ring-offset-[var(--navy)]`}
              >
                <X className="h-5 w-5" aria-hidden />
              </button>
            </div>
            <NavLinks onNavigate={() => setMobileOpen(false)} />
            <SidebarFooter user={user} onSignOut={handleSignOut} />
          </nav>
        </div>
      )}

      <div className="lg:flex">
        {/* Desktop sidebar */}
        <nav className="sticky top-0 hidden h-screen w-64 shrink-0 flex-col bg-[var(--navy)] px-4 py-6 lg:flex">
          <div className="mb-8 px-2">
            <Brand />
          </div>
          <NavLinks />
          <SidebarFooter user={user} onSignOut={handleSignOut} />
        </nav>

        <main id="admin-main" className="min-w-0 flex-1 px-4 py-6 sm:px-6 lg:px-10 lg:py-10">
          <div className="mx-auto max-w-6xl">
            <Outlet />
          </div>
        </main>
      </div>

      <Toaster />
    </div>
  );
}

function Brand() {
  return (
    <div className="flex flex-col leading-none">
      <span className="text-xl font-bold tracking-tight text-white">ADEF</span>
      <span className="mt-0.5 text-[10px] font-medium uppercase tracking-[0.18em] text-[var(--gold)]">
        Admin
      </span>
    </div>
  );
}

function NavLinks({ onNavigate }: { onNavigate?: () => void }) {
  return (
    <ul className="flex flex-1 flex-col gap-1">
      {navigation.map((item) => (
        <li key={item.to}>
          <NavLink
            to={item.to}
            end={item.end}
            onClick={onNavigate}
            className={({ isActive }) =>
              `flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors ${focusRing} focus-visible:ring-offset-[var(--navy)] ${
                isActive
                  ? 'bg-white/10 text-white'
                  : 'text-white/65 hover:bg-white/5 hover:text-white'
              }`
            }
          >
            {({ isActive }) => (
              <>
                <item.icon
                  className={`h-4 w-4 ${isActive ? 'text-[var(--gold)]' : ''}`}
                  aria-hidden
                />
                {item.label}
              </>
            )}
          </NavLink>
        </li>
      ))}
    </ul>
  );
}

function SidebarFooter({
  user,
  onSignOut,
}: {
  user: { name: string; email: string; role: string } | null;
  onSignOut: () => void;
}) {
  return (
    <div className="mt-auto space-y-1 border-t border-white/10 pt-4">
      <a
        href="/"
        target="_blank"
        rel="noopener noreferrer"
        className={`flex items-center gap-3 rounded-lg px-3 py-2 text-sm text-white/65 transition-colors hover:bg-white/5 hover:text-white ${focusRing} focus-visible:ring-offset-[var(--navy)]`}
      >
        <ExternalLink className="h-4 w-4" aria-hidden />
        View the website
      </a>

      {user && (
        <div className="px-3 pb-1 pt-3">
          <p className="truncate text-sm font-medium text-white">{user.name}</p>
          <p className="truncate text-xs text-white/50">{user.email}</p>
        </div>
      )}

      <button
        type="button"
        onClick={onSignOut}
        className={`flex w-full items-center gap-3 rounded-lg px-3 py-2 text-sm text-white/65 transition-colors hover:bg-white/5 hover:text-white ${focusRing} focus-visible:ring-offset-[var(--navy)]`}
      >
        <LogOut className="h-4 w-4" aria-hidden />
        Sign out
      </button>
    </div>
  );
}

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
    <div className="mb-6 flex flex-col gap-3 sm:mb-8 sm:flex-row sm:items-start sm:justify-between">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-[var(--navy)] sm:text-3xl">
          {title}
        </h1>
        {description && <p className="mt-1 text-sm text-slate-600">{description}</p>}
      </div>
      {action && <div className="shrink-0">{action}</div>}
    </div>
  );
}
