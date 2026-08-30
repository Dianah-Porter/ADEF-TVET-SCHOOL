import { type ReactNode } from 'react';
import { Link } from 'react-router';

/**
 * The frame shared by sign in, forgot password and reset password.
 *
 * All three are the same shape — brand, one card, one link back to the site —
 * so they live here rather than being pasted into three files that then drift
 * apart.
 */
export function AuthScreen({
  icon,
  title,
  subtitle,
  children,
  footer,
}: {
  icon: ReactNode;
  title: string;
  subtitle: string;
  children: ReactNode;
  footer?: ReactNode;
}) {
  return (
    <div className="flex min-h-screen items-center justify-center bg-[var(--navy)] px-4 py-10">
      <div className="w-full max-w-sm">
        <div className="mb-7 text-center">
          <Link to="/" className="inline-block rounded">
            <span className="block text-3xl font-bold tracking-tight text-white">ADEF</span>
            <span className="mt-1 block text-[11px] font-medium uppercase tracking-[0.2em] text-[var(--gold)]">
              TVET School · Admin
            </span>
          </Link>
        </div>

        <div className="rounded-xl bg-white p-6 shadow-2xl sm:p-7">
          <div className="mb-5 flex items-center gap-2.5">
            <span className="rounded-lg bg-[var(--orange)]/10 p-2 text-[var(--orange)]">{icon}</span>
            <div className="min-w-0">
              <h1 className="text-[15px] font-semibold text-slate-900">{title}</h1>
              <p className="text-[12px] text-slate-500">{subtitle}</p>
            </div>
          </div>

          {children}
        </div>

        {footer && <div className="mt-5 text-center text-[12px] text-white/50">{footer}</div>}
      </div>
    </div>
  );
}

export function FormBanner({
  tone,
  children,
}: {
  tone: 'error' | 'success' | 'info';
  children: ReactNode;
}) {
  const tones = {
    error: 'border-red-200 bg-red-50 text-red-800',
    success: 'border-emerald-200 bg-emerald-50 text-emerald-800',
    info: 'border-blue-200 bg-blue-50 text-blue-800',
  };

  return (
    <div role="alert" className={`mb-4 rounded-lg border px-3 py-2.5 text-[13px] ${tones[tone]}`}>
      {children}
    </div>
  );
}
