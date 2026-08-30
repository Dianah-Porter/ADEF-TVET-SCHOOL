import { Link } from 'react-router';
import { Lock, Mail, Phone } from 'lucide-react';
import { useApi } from '../../hooks/useApi';
import { api } from '../../lib/api';
import { STATIC_SETTINGS } from '../../lib/staticData';

/**
 * The slim utility strip above the main navigation.
 *
 * It exists to give staff a way into the dashboard, but a bar holding nothing
 * but a login link is wasted space on a school website — so the school's phone
 * number and email sit on the left, where a parent looking for them will find
 * them without scrolling to the footer.
 *
 * Fixed, and the navbar is offset by exactly its height (`top-9`). Changing
 * one without the other leaves a gap or an overlap.
 */
export function StaffBar() {
  const { data: settings } = useApi(api.settings.get, STATIC_SETTINGS);

  return (
    <div className="fixed inset-x-0 top-0 z-[60] h-9 bg-[var(--charcoal)] text-white/85">
      <div className="mx-auto flex h-full max-w-7xl items-center justify-between gap-4 px-4 sm:px-6 lg:px-8">
        <div className="flex min-w-0 items-center gap-4 text-xs">
          <a
            href={`tel:${settings.phone.replace(/\s/g, '')}`}
            className="inline-flex items-center gap-1.5 transition-colors hover:text-[var(--gold)]"
          >
            <Phone className="h-3 w-3 shrink-0" aria-hidden />
            <span className="truncate">{settings.phone}</span>
          </a>

          {/* Below `sm` there is only room for one, and a phone number is the
              more useful of the two on a device that can dial it. */}
          <a
            href={`mailto:${settings.email}`}
            className="hidden items-center gap-1.5 transition-colors hover:text-[var(--gold)] sm:inline-flex"
          >
            <Mail className="h-3 w-3 shrink-0" aria-hidden />
            <span className="truncate">{settings.email}</span>
          </a>
        </div>

        <Link
          to="/admin/login"
          className="inline-flex shrink-0 items-center gap-1.5 rounded px-2 py-1 text-xs font-semibold
                     tracking-wide transition-colors hover:bg-white/10 hover:text-white
                     focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--gold)]"
        >
          <Lock className="h-3 w-3" aria-hidden />
          Staff Login
        </Link>
      </div>
    </div>
  );
}
