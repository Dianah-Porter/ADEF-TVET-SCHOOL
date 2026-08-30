import {
  createContext,
  useContext,
  useEffect,
  useId,
  useRef,
  useState,
  type ReactNode,
} from 'react';
import { AlertCircle, Check, CheckCircle2, ChevronDown, Info, Loader2, Search, X } from 'lucide-react';
import { useToast, type Toast } from './admin-context';

/**
 * The dashboard's design system.
 *
 * Two decisions run through all of it, both borrowed from the tools staff
 * already use to manage data (Supabase, Linear, Stripe):
 *
 *  - Density over decoration. A content list is a working surface, not a
 *    landing page: 13px type, 1px borders, small radii and tight padding fit
 *    more on screen and make scanning a column of rows easy.
 *
 *  - One accent. Orange marks the action you are meant to take on a screen and
 *    nothing else, so it never has to compete with itself.
 */

// ─── Shared fragments ───────────────────────────────────────────────────────

export const focusRing =
  'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--orange)]/50 focus-visible:ring-offset-1 focus-visible:ring-offset-white';

/** 1px hairline used by every panel, table and input. */
export const hairline = 'border-slate-200';

export const inputClass =
  'w-full rounded-md border border-slate-300 bg-white px-2.5 py-1.5 text-[13px] text-slate-900 ' +
  'placeholder:text-slate-400 transition-colors hover:border-slate-400 ' +
  'focus:border-[var(--orange)] focus:outline-none focus:ring-2 focus:ring-[var(--orange)]/20 ' +
  'disabled:cursor-not-allowed disabled:bg-slate-50 disabled:text-slate-500';

export const labelClass = 'text-[13px] font-medium text-slate-700';

/** Small, muted, upper-case — column headings and card labels. */
export const eyebrowClass =
  'text-[11px] font-semibold uppercase tracking-wider text-slate-500';

// ─── Button ─────────────────────────────────────────────────────────────────

export function Button({
  children,
  variant = 'primary',
  size = 'md',
  loading = false,
  className = '',
  ...props
}: {
  variant?: 'primary' | 'secondary' | 'ghost' | 'danger';
  size?: 'xs' | 'sm' | 'md';
  loading?: boolean;
} & React.ButtonHTMLAttributes<HTMLButtonElement>) {
  const variants = {
    primary: 'bg-[var(--orange)] text-white hover:bg-[#d96a1c] active:bg-[#c25f18] shadow-sm',
    secondary:
      'bg-white text-slate-700 border border-slate-300 hover:bg-slate-50 hover:border-slate-400',
    ghost: 'text-slate-600 hover:bg-slate-100 hover:text-slate-900',
    danger: 'bg-white text-red-700 border border-red-300 hover:bg-red-50 hover:border-red-400',
  };

  const sizes = {
    xs: 'h-6 px-2 text-[11px] gap-1',
    sm: 'h-7 px-2.5 text-[12px] gap-1.5',
    md: 'h-8 px-3 text-[13px] gap-1.5',
  };

  return (
    <button
      {...props}
      disabled={props.disabled || loading}
      className={`inline-flex items-center justify-center rounded-md font-medium transition-all
        disabled:cursor-not-allowed disabled:opacity-50 ${focusRing}
        ${variants[variant]} ${sizes[size]} ${className}`}
    >
      {loading && <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden />}
      {children}
    </button>
  );
}

export function IconButton({
  children,
  label,
  tone = 'default',
  ...props
}: {
  label: string;
  tone?: 'default' | 'danger';
} & React.ButtonHTMLAttributes<HTMLButtonElement>) {
  return (
    <button
      {...props}
      type="button"
      title={label}
      aria-label={label}
      className={`inline-flex h-7 w-7 items-center justify-center rounded-md transition-colors
        disabled:cursor-not-allowed disabled:opacity-30 ${focusRing} ${
          tone === 'danger'
            ? 'text-slate-500 hover:bg-red-50 hover:text-red-600'
            : 'text-slate-500 hover:bg-slate-100 hover:text-slate-900'
        }`}
    >
      {children}
    </button>
  );
}

// ─── Form controls ──────────────────────────────────────────────────────────

export function Field({
  label,
  hint,
  error,
  help,
  required,
  children,
}: {
  label: string;
  hint?: string;
  error?: string;
  /** Explanatory text under the control, for rules that are not obvious. */
  help?: string;
  required?: boolean;
  children: ReactNode;
}) {
  return (
    <label className="block">
      <span className={`mb-1.5 flex items-baseline gap-1.5 ${labelClass}`}>
        {label}
        {required && (
          <span className="text-[var(--orange)]" aria-label="required">
            *
          </span>
        )}
        {hint && <span className="ml-auto text-[11px] font-normal text-slate-400">{hint}</span>}
      </span>
      {children}
      {help && !error && <span className="mt-1 block text-[11px] text-slate-500">{help}</span>}
      {error && (
        <span role="alert" className="mt-1 flex items-start gap-1 text-[11px] text-red-600">
          <AlertCircle className="mt-px h-3 w-3 shrink-0" aria-hidden />
          {error}
        </span>
      )}
    </label>
  );
}

export function Select({
  children,
  className = '',
  ...props
}: React.SelectHTMLAttributes<HTMLSelectElement>) {
  return (
    <div className="relative">
      <select
        {...props}
        className={`${inputClass} cursor-pointer appearance-none pr-8 ${className}`}
      >
        {children}
      </select>
      <ChevronDown
        className="pointer-events-none absolute right-2 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-slate-400"
        aria-hidden
      />
    </div>
  );
}

export function SearchInput({
  value,
  onChange,
  placeholder = 'Search…',
  className = '',
}: {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  className?: string;
}) {
  return (
    <div className={`relative ${className}`}>
      <Search
        className="pointer-events-none absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-slate-400"
        aria-hidden
      />
      <input
        type="search"
        value={value}
        onChange={(event) => onChange(event.target.value)}
        placeholder={placeholder}
        aria-label={placeholder}
        className={`${inputClass} pl-8`}
      />
      {value && (
        <button
          type="button"
          onClick={() => onChange('')}
          aria-label="Clear search"
          className={`absolute right-1.5 top-1/2 -translate-y-1/2 rounded p-0.5 text-slate-400 hover:text-slate-700 ${focusRing}`}
        >
          <X className="h-3 w-3" aria-hidden />
        </button>
      )}
    </div>
  );
}

/**
 * A published/hidden toggle.
 *
 * A switch rather than a checkbox because the change is applied immediately —
 * there is no Save button to press afterwards, and a checkbox implies one.
 */
export function Switch({
  checked,
  onChange,
  label,
  disabled = false,
}: {
  checked: boolean;
  onChange: (next: boolean) => void;
  label: string;
  disabled?: boolean;
}) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label={label}
      title={label}
      disabled={disabled}
      onClick={() => onChange(!checked)}
      className={`relative inline-flex h-[18px] w-8 shrink-0 items-center rounded-full transition-colors
        disabled:cursor-not-allowed disabled:opacity-50 ${focusRing}
        ${checked ? 'bg-emerald-500' : 'bg-slate-300'}`}
    >
      <span
        className={`inline-block h-3.5 w-3.5 transform rounded-full bg-white shadow transition-transform
          ${checked ? 'translate-x-[15px]' : 'translate-x-[2px]'}`}
      />
    </button>
  );
}

// ─── Layout primitives ──────────────────────────────────────────────────────

/** A bordered white surface. Everything on a page sits in one of these. */
export function Panel({
  children,
  className = '',
  padded = false,
}: {
  children: ReactNode;
  className?: string;
  padded?: boolean;
}) {
  return (
    <section
      className={`overflow-hidden rounded-lg border ${hairline} bg-white ${padded ? 'p-4' : ''} ${className}`}
    >
      {children}
    </section>
  );
}

export function PanelHeader({
  title,
  description,
  action,
}: {
  title: string;
  description?: string;
  action?: ReactNode;
}) {
  return (
    <header
      className={`flex items-start justify-between gap-4 border-b ${hairline} bg-slate-50/60 px-4 py-3`}
    >
      <div className="min-w-0">
        <h2 className="text-[13px] font-semibold text-slate-900">{title}</h2>
        {description && <p className="mt-0.5 text-[12px] text-slate-500">{description}</p>}
      </div>
      {action && <div className="shrink-0">{action}</div>}
    </header>
  );
}

/**
 * The filter row that sits above every listing: search and filters on the
 * left, the primary action on the right. Always in that order, on every
 * screen, so the "+ New" button is never somewhere new.
 */
export function Toolbar({
  children,
  action,
}: {
  children?: ReactNode;
  action?: ReactNode;
}) {
  return (
    <div className="mb-3 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
      <div className="flex flex-1 flex-wrap items-center gap-2">{children}</div>
      {action && <div className="flex shrink-0 items-center gap-2">{action}</div>}
    </div>
  );
}

/**
 * Mutually exclusive filters, shown as one connected control.
 *
 * Counts sit in the tabs themselves: "Drafts 3" answers "is there anything to
 * deal with?" without the user having to click the tab to find out.
 */
export function SegmentedControl<T extends string>({
  value,
  onChange,
  options,
  label,
}: {
  value: T;
  onChange: (next: T) => void;
  options: { value: T; label: string; count?: number }[];
  label: string;
}) {
  return (
    <div
      role="group"
      aria-label={label}
      className={`inline-flex items-center gap-0.5 rounded-md border ${hairline} bg-slate-100/70 p-0.5`}
    >
      {options.map((option) => {
        const active = option.value === value;

        return (
          <button
            key={option.value}
            type="button"
            aria-pressed={active}
            onClick={() => onChange(option.value)}
            className={`inline-flex h-6 items-center gap-1.5 rounded px-2.5 text-[12px] font-medium transition-colors ${focusRing}
              ${active ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-600 hover:text-slate-900'}`}
          >
            {option.label}
            {option.count !== undefined && (
              <span
                className={`rounded px-1 text-[10px] font-semibold tabular-nums ${
                  active ? 'bg-slate-100 text-slate-600' : 'text-slate-400'
                }`}
              >
                {option.count}
              </span>
            )}
          </button>
        );
      })}
    </div>
  );
}

// ─── Table ──────────────────────────────────────────────────────────────────

export function Table({ children }: { children: ReactNode }) {
  // The wrapper scrolls rather than the page: a wide table on a narrow screen
  // must not push the whole layout sideways.
  return (
    <div className="overflow-x-auto">
      <table className="w-full border-collapse text-left text-[13px]">{children}</table>
    </div>
  );
}

export function THead({ children }: { children: ReactNode }) {
  return (
    <thead className={`border-b ${hairline} bg-slate-50/60`}>
      <tr>{children}</tr>
    </thead>
  );
}

export function TH({
  children,
  className = '',
  align = 'left',
}: {
  children?: ReactNode;
  className?: string;
  align?: 'left' | 'right' | 'center';
}) {
  return (
    <th
      scope="col"
      className={`px-3 py-2 ${eyebrowClass} ${
        align === 'right' ? 'text-right' : align === 'center' ? 'text-center' : 'text-left'
      } ${className}`}
    >
      {children}
    </th>
  );
}

export function TBody({ children }: { children: ReactNode }) {
  return <tbody className="divide-y divide-slate-100">{children}</tbody>;
}

export function TR({
  children,
  onClick,
  className = '',
}: {
  children: ReactNode;
  onClick?: () => void;
  className?: string;
}) {
  return (
    <tr
      onClick={onClick}
      className={`transition-colors hover:bg-slate-50/70 ${onClick ? 'cursor-pointer' : ''} ${className}`}
    >
      {children}
    </tr>
  );
}

export function TD({
  children,
  className = '',
  align = 'left',
}: {
  children?: ReactNode;
  className?: string;
  align?: 'left' | 'right' | 'center';
}) {
  return (
    <td
      className={`px-3 py-2.5 align-middle text-slate-700 ${
        align === 'right' ? 'text-right' : align === 'center' ? 'text-center' : 'text-left'
      } ${className}`}
    >
      {children}
    </td>
  );
}

/** The cell that holds row actions — revealed on hover, always keyboard-reachable. */
export function RowActions({ children }: { children: ReactNode }) {
  return (
    <div className="flex items-center justify-end gap-0.5 opacity-60 transition-opacity group-hover:opacity-100 focus-within:opacity-100">
      {children}
    </div>
  );
}

// ─── Status and badges ──────────────────────────────────────────────────────

type Tone = 'neutral' | 'success' | 'warning' | 'danger' | 'info';

const TONES: Record<Tone, string> = {
  neutral: 'bg-slate-100 text-slate-700 ring-slate-200',
  success: 'bg-emerald-50 text-emerald-700 ring-emerald-200',
  warning: 'bg-amber-50 text-amber-700 ring-amber-200',
  danger: 'bg-red-50 text-red-700 ring-red-200',
  info: 'bg-blue-50 text-blue-700 ring-blue-200',
};

export function Badge({
  children,
  tone = 'neutral',
  className = '',
}: {
  children: ReactNode;
  tone?: Tone;
  className?: string;
}) {
  return (
    <span
      className={`inline-flex items-center gap-1 whitespace-nowrap rounded px-1.5 py-0.5 text-[11px] font-medium ring-1 ring-inset ${TONES[tone]} ${className}`}
    >
      {children}
    </span>
  );
}

export function StatusPill({ status }: { status: 'DRAFT' | 'PUBLISHED' }) {
  return (
    <Badge tone={status === 'PUBLISHED' ? 'success' : 'warning'}>
      {status === 'PUBLISHED' ? 'Published' : 'Draft'}
    </Badge>
  );
}

/** Live/hidden, for the content types that have no draft stage. */
export function VisibilityBadge({ published }: { published: boolean }) {
  return (
    <Badge tone={published ? 'success' : 'neutral'}>{published ? 'Live' : 'Hidden'}</Badge>
  );
}

// ─── KPI card ───────────────────────────────────────────────────────────────

/**
 * One number, and what to do about it.
 *
 * `hint` carries the interpretation — "3 not yet on the website" — because a
 * bare figure on a dashboard rarely tells anyone whether it is good or bad.
 */
export function StatCard({
  label,
  value,
  icon,
  hint,
  tone = 'neutral',
  href,
}: {
  label: string;
  value: number | string;
  icon?: ReactNode;
  hint?: string;
  tone?: 'neutral' | 'attention';
  href?: ReactNode;
}) {
  return (
    <div
      className={`group relative flex h-full flex-col rounded-lg border bg-white p-3.5 transition-colors ${
        tone === 'attention' ? 'border-amber-300 bg-amber-50/40' : hairline
      }`}
    >
      <div className="flex items-center justify-between gap-2">
        <span className={eyebrowClass}>{label}</span>
        {icon && (
          <span
            className={tone === 'attention' ? 'text-amber-500' : 'text-slate-300'}
            aria-hidden
          >
            {icon}
          </span>
        )}
      </div>

      <p className="mt-1.5 text-2xl font-semibold tabular-nums leading-none text-slate-900">
        {value}
      </p>

      {hint && <p className="mt-1.5 text-[11px] leading-snug text-slate-500">{hint}</p>}
      {href && <div className="mt-auto pt-2.5">{href}</div>}
    </div>
  );
}

// ─── States ─────────────────────────────────────────────────────────────────

export function Spinner({ label = 'Loading' }: { label?: string }) {
  return (
    <div className="flex items-center justify-center gap-2 py-16 text-[13px] text-slate-500">
      <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
      <span>{label}…</span>
    </div>
  );
}

/** Placeholder rows, so a loading table does not collapse and jump. */
export function TableSkeleton({ rows = 5, columns = 4 }: { rows?: number; columns?: number }) {
  return (
    <TBody>
      {Array.from({ length: rows }).map((_, rowIndex) => (
        <tr key={rowIndex}>
          {Array.from({ length: columns }).map((__, colIndex) => (
            <td key={colIndex} className="px-3 py-3">
              <div
                className="h-3 animate-pulse rounded bg-slate-100"
                style={{ width: colIndex === 0 ? '60%' : '35%' }}
              />
            </td>
          ))}
        </tr>
      ))}
    </TBody>
  );
}

export function EmptyState({
  icon,
  title,
  description,
  action,
}: {
  icon: ReactNode;
  title: string;
  description: string;
  action?: ReactNode;
}) {
  return (
    <div className="flex flex-col items-center justify-center px-6 py-14 text-center">
      <div className="mb-3 text-slate-300" aria-hidden>
        {icon}
      </div>
      <h3 className="text-[14px] font-semibold text-slate-900">{title}</h3>
      <p className="mt-1 max-w-sm text-[13px] text-slate-500">{description}</p>
      {action && <div className="mt-4">{action}</div>}
    </div>
  );
}

export function ErrorState({ message, onRetry }: { message: string; onRetry?: () => void }) {
  return (
    <div className="flex flex-col items-center justify-center rounded-lg border border-red-200 bg-red-50/50 px-6 py-10 text-center">
      <AlertCircle className="mb-2.5 h-5 w-5 text-red-500" aria-hidden />
      <p className="max-w-md text-[13px] text-red-800">{message}</p>
      {onRetry && (
        <Button variant="secondary" size="sm" className="mt-3.5" onClick={onRetry}>
          Try again
        </Button>
      )}
    </div>
  );
}

// ─── Pagination ─────────────────────────────────────────────────────────────

export function Pagination({
  page,
  totalPages,
  total,
  onChange,
}: {
  page: number;
  totalPages: number;
  total: number;
  onChange: (page: number) => void;
}) {
  if (totalPages <= 1) return null;

  return (
    <nav
      className={`flex items-center justify-between gap-3 border-t ${hairline} px-3 py-2`}
      aria-label="Pagination"
    >
      <p className="text-[12px] tabular-nums text-slate-500">
        Page {page} of {totalPages} · {total} total
      </p>
      <div className="flex gap-1.5">
        <Button variant="secondary" size="sm" disabled={page === 1} onClick={() => onChange(page - 1)}>
          Previous
        </Button>
        <Button
          variant="secondary"
          size="sm"
          disabled={page === totalPages}
          onClick={() => onChange(page + 1)}
        >
          Next
        </Button>
      </div>
    </nav>
  );
}

// ─── Dialogs ────────────────────────────────────────────────────────────────

export function Modal({
  open,
  onClose,
  title,
  description,
  children,
  wide = false,
  footer,
}: {
  open: boolean;
  onClose: () => void;
  title: string;
  description?: string;
  children: ReactNode;
  wide?: boolean;
  /** Pinned to the bottom of the dialog, above the fold on short screens. */
  footer?: ReactNode;
}) {
  const panelRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose();
    };

    document.addEventListener('keydown', onKeyDown);
    panelRef.current?.focus();

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';

    return () => {
      document.removeEventListener('keydown', onKeyDown);
      document.body.style.overflow = previousOverflow;
    };
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-slate-900/40 p-0 backdrop-blur-[2px] sm:items-center sm:p-4">
      <button
        type="button"
        aria-label="Close dialog"
        className="absolute inset-0 cursor-default"
        onClick={onClose}
        tabIndex={-1}
      />
      <div
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-label={title}
        tabIndex={-1}
        className={`relative flex max-h-[92vh] w-full flex-col rounded-t-xl bg-white shadow-2xl outline-none sm:rounded-xl ${
          wide ? 'sm:max-w-2xl' : 'sm:max-w-md'
        }`}
      >
        <div className={`flex items-start justify-between gap-4 border-b ${hairline} px-4 py-3`}>
          <div className="min-w-0">
            <h2 className="text-[14px] font-semibold text-slate-900">{title}</h2>
            {description && <p className="mt-0.5 text-[12px] text-slate-500">{description}</p>}
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            className={`shrink-0 rounded-md p-1 text-slate-400 transition-colors hover:bg-slate-100 hover:text-slate-700 ${focusRing}`}
          >
            <X className="h-4 w-4" aria-hidden />
          </button>
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto px-4 py-4">{children}</div>

        {footer && (
          <div
            className={`flex flex-col-reverse gap-2 border-t ${hairline} bg-slate-50/60 px-4 py-3 sm:flex-row sm:justify-end`}
          >
            {footer}
          </div>
        )}
      </div>
    </div>
  );
}

/**
 * A destructive confirmation.
 *
 * Its own component rather than a Modal used ad hoc, so every delete in the
 * dashboard names the thing being deleted and says what cannot be undone —
 * the two things that make a confirmation worth showing at all.
 */
export function ConfirmDialog({
  open,
  onClose,
  onConfirm,
  title,
  itemName,
  consequence,
  confirmLabel = 'Delete',
  loading = false,
}: {
  open: boolean;
  onClose: () => void;
  onConfirm: () => void;
  title: string;
  itemName?: string;
  consequence: string;
  confirmLabel?: string;
  loading?: boolean;
}) {
  return (
    <Modal
      open={open}
      onClose={onClose}
      title={title}
      footer={
        <>
          <Button variant="ghost" onClick={onClose}>
            Cancel
          </Button>
          <Button variant="danger" onClick={onConfirm} loading={loading}>
            {confirmLabel}
          </Button>
        </>
      }
    >
      <p className="text-[13px] leading-relaxed text-slate-600">
        {itemName && <strong className="font-semibold text-slate-900">{itemName}</strong>}
        {itemName ? ' ' : ''}
        {consequence}
      </p>
    </Modal>
  );
}

// ─── Dropdown menu ──────────────────────────────────────────────────────────

interface MenuState {
  close: () => void;
}

const MenuContext = createContext<MenuState | null>(null);

/**
 * A small popover menu, used for row actions and the profile menu.
 *
 * Closes on outside click, on Escape and after any item is chosen — the three
 * ways people expect to dismiss one.
 */
export function DropdownMenu({
  trigger,
  children,
  align = 'right',
  label,
}: {
  trigger: (props: { open: boolean }) => ReactNode;
  children: ReactNode;
  align?: 'left' | 'right';
  label: string;
}) {
  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const menuId = useId();

  useEffect(() => {
    if (!open) return;

    const onPointerDown = (event: MouseEvent) => {
      if (!containerRef.current?.contains(event.target as Node)) setOpen(false);
    };

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setOpen(false);
    };

    document.addEventListener('mousedown', onPointerDown);
    document.addEventListener('keydown', onKeyDown);

    return () => {
      document.removeEventListener('mousedown', onPointerDown);
      document.removeEventListener('keydown', onKeyDown);
    };
  }, [open]);

  return (
    <div ref={containerRef} className="relative">
      <button
        type="button"
        aria-haspopup="menu"
        aria-expanded={open}
        aria-controls={open ? menuId : undefined}
        aria-label={label}
        onClick={() => setOpen((value) => !value)}
        className={`rounded-md ${focusRing}`}
      >
        {trigger({ open })}
      </button>

      {open && (
        <MenuContext.Provider value={{ close: () => setOpen(false) }}>
          <div
            id={menuId}
            role="menu"
            className={`absolute z-50 mt-1 min-w-[190px] overflow-hidden rounded-lg border ${hairline} bg-white py-1 shadow-lg ${
              align === 'right' ? 'right-0' : 'left-0'
            }`}
          >
            {children}
          </div>
        </MenuContext.Provider>
      )}
    </div>
  );
}

export function MenuItem({
  children,
  onSelect,
  icon,
  tone = 'default',
  disabled = false,
}: {
  children: ReactNode;
  onSelect: () => void;
  icon?: ReactNode;
  tone?: 'default' | 'danger';
  disabled?: boolean;
}) {
  const menu = useContext(MenuContext);

  return (
    <button
      type="button"
      role="menuitem"
      disabled={disabled}
      onClick={() => {
        menu?.close();
        onSelect();
      }}
      className={`flex w-full items-center gap-2.5 px-3 py-1.5 text-left text-[13px] transition-colors
        disabled:cursor-not-allowed disabled:opacity-40
        ${
          tone === 'danger'
            ? 'text-red-600 hover:bg-red-50'
            : 'text-slate-700 hover:bg-slate-50 hover:text-slate-900'
        }`}
    >
      {icon && <span className="shrink-0 text-slate-400">{icon}</span>}
      {children}
    </button>
  );
}

export function MenuSeparator() {
  return <div className={`my-1 border-t ${hairline}`} role="separator" />;
}

export function MenuLabel({ children }: { children: ReactNode }) {
  return <div className="px-3 py-1.5 text-[11px] text-slate-400">{children}</div>;
}

// ─── Toasts ─────────────────────────────────────────────────────────────────

export function Toaster() {
  const { toasts, dismiss } = useToast();

  return (
    <div
      aria-live="polite"
      aria-atomic="false"
      className="pointer-events-none fixed bottom-4 right-4 z-[60] flex w-[min(24rem,calc(100vw-2rem))] flex-col gap-2"
    >
      {toasts.map((toast) => (
        <ToastRow key={toast.id} toast={toast} onDismiss={() => dismiss(toast.id)} />
      ))}
    </div>
  );
}

function ToastRow({ toast, onDismiss }: { toast: Toast; onDismiss: () => void }) {
  const tones = {
    success: {
      ring: 'ring-emerald-200',
      bg: 'bg-white',
      icon: <CheckCircle2 className="h-4 w-4 text-emerald-600" />,
    },
    error: {
      ring: 'ring-red-200',
      bg: 'bg-white',
      icon: <AlertCircle className="h-4 w-4 text-red-600" />,
    },
    info: { ring: 'ring-slate-200', bg: 'bg-white', icon: <Info className="h-4 w-4 text-slate-500" /> },
  }[toast.tone];

  return (
    <div
      className={`pointer-events-auto flex items-start gap-2.5 rounded-lg px-3.5 py-2.5 shadow-lg ring-1 ${tones.ring} ${tones.bg}`}
    >
      <span className="mt-px shrink-0" aria-hidden>
        {tones.icon}
      </span>
      <p className="flex-1 text-[13px] text-slate-800">{toast.message}</p>
      <button
        type="button"
        onClick={onDismiss}
        aria-label="Dismiss"
        className={`shrink-0 rounded p-0.5 text-slate-400 hover:text-slate-700 ${focusRing}`}
      >
        <X className="h-3.5 w-3.5" aria-hidden />
      </button>
    </div>
  );
}

// ─── Formatting ─────────────────────────────────────────────────────────────

export function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`;
  return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
}

export function formatDate(value: string | null): string {
  if (!value) return '—';
  return new Date(value).toLocaleDateString('en-GB', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });
}

/** "3m ago" for anything recent, an absolute date once that stops being useful. */
export function relativeTime(iso: string): string {
  const seconds = Math.round((Date.now() - new Date(iso).getTime()) / 1000);

  if (seconds < 60) return 'just now';
  if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`;
  if (seconds < 86400) return `${Math.floor(seconds / 3600)}h ago`;
  if (seconds < 604800) return `${Math.floor(seconds / 86400)}d ago`;

  return new Date(iso).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' });
}

/** Initials for the avatar in the top bar. */
export function initialsOf(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return '?';
  if (parts.length === 1) return parts[0]!.slice(0, 2).toUpperCase();
  return (parts[0]![0]! + parts[parts.length - 1]![0]!).toUpperCase();
}

export { Check };
