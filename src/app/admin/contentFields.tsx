import { useEffect, useRef, useState } from 'react';
import {
  Award,
  Box,
  Briefcase,
  Flame,
  Hammer,
  Hand,
  ImagePlus,
  Star,
  Trash2,
  Users,
  Wrench,
  type LucideIcon,
} from 'lucide-react';
import type { AccentColor, CourseIcon, FeatureIcon } from '../lib/api';
import { Field, focusRing, hairline, labelClass } from './ui';

/**
 * The pickers shared by the content forms.
 *
 * Each one shows the actual thing being chosen — the real icon, the real
 * colour — rather than its name in a dropdown. Staff are picking how a card
 * will look on the website, and "CHARCOAL" in a select box does not tell them
 * that.
 */

export const COURSE_ICONS: { value: CourseIcon; icon: LucideIcon; label: string }[] = [
  { value: 'FLAME', icon: Flame, label: 'Flame' },
  { value: 'HAMMER', icon: Hammer, label: 'Hammer' },
  { value: 'BOX', icon: Box, label: 'Box' },
];

export const FEATURE_ICONS: { value: FeatureIcon; icon: LucideIcon; label: string }[] = [
  { value: 'AWARD', icon: Award, label: 'Award' },
  { value: 'HAND', icon: Hand, label: 'Hand' },
  { value: 'USERS', icon: Users, label: 'People' },
  { value: 'WRENCH', icon: Wrench, label: 'Wrench' },
  { value: 'BRIEFCASE', icon: Briefcase, label: 'Briefcase' },
];

export const ACCENTS: { value: AccentColor; label: string; token: string }[] = [
  { value: 'ORANGE', label: 'Orange', token: 'var(--orange)' },
  { value: 'GOLD', label: 'Gold', token: 'var(--gold)' },
  { value: 'NAVY', label: 'Navy', token: 'var(--navy)' },
  { value: 'CHARCOAL', label: 'Charcoal', token: 'var(--charcoal)' },
];

export function IconPicker<T extends string>({
  label,
  value,
  onChange,
  options,
}: {
  label: string;
  value: T;
  onChange: (next: T) => void;
  options: { value: T; icon: LucideIcon; label: string }[];
}) {
  return (
    <div>
      <span className={`mb-1.5 block ${labelClass}`}>{label}</span>
      <div role="radiogroup" aria-label={label} className="flex flex-wrap gap-1.5">
        {options.map((option) => {
          const selected = option.value === value;

          return (
            <button
              key={option.value}
              type="button"
              role="radio"
              aria-checked={selected}
              title={option.label}
              onClick={() => onChange(option.value)}
              className={`flex h-9 w-9 items-center justify-center rounded-md border transition-colors ${focusRing} ${
                selected
                  ? 'border-[var(--orange)] bg-[var(--orange)]/10 text-[var(--orange)]'
                  : `${hairline} bg-white text-slate-500 hover:border-slate-400 hover:text-slate-800`
              }`}
            >
              <option.icon className="h-4 w-4" aria-hidden />
              <span className="sr-only">{option.label}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
}

export function AccentPicker({
  value,
  onChange,
}: {
  value: AccentColor;
  onChange: (next: AccentColor) => void;
}) {
  return (
    <div>
      <span className={`mb-1.5 block ${labelClass}`}>Accent colour</span>
      <div role="radiogroup" aria-label="Accent colour" className="flex flex-wrap gap-1.5">
        {ACCENTS.map((accent) => {
          const selected = accent.value === value;

          return (
            <button
              key={accent.value}
              type="button"
              role="radio"
              aria-checked={selected}
              title={accent.label}
              onClick={() => onChange(accent.value)}
              className={`flex h-9 items-center gap-2 rounded-md border px-2.5 text-[12px] font-medium transition-colors ${focusRing} ${
                selected
                  ? 'border-slate-900 text-slate-900'
                  : `${hairline} text-slate-600 hover:border-slate-400`
              }`}
            >
              <span
                className="h-3.5 w-3.5 rounded-full ring-1 ring-inset ring-black/10"
                style={{ background: accent.token }}
                aria-hidden
              />
              {accent.label}
            </button>
          );
        })}
      </div>
    </div>
  );
}

export function RatingPicker({
  value,
  onChange,
}: {
  value: number;
  onChange: (next: number) => void;
}) {
  return (
    <div>
      <span className={`mb-1.5 block ${labelClass}`}>Rating</span>
      <div role="radiogroup" aria-label="Rating" className="flex items-center gap-0.5">
        {[1, 2, 3, 4, 5].map((star) => (
          <button
            key={star}
            type="button"
            role="radio"
            aria-checked={star === value}
            aria-label={`${star} star${star === 1 ? '' : 's'}`}
            onClick={() => onChange(star)}
            className={`rounded p-0.5 transition-colors ${focusRing}`}
          >
            <Star
              className={`h-5 w-5 ${
                star <= value ? 'fill-[var(--gold)] text-[var(--gold)]' : 'text-slate-300'
              }`}
              aria-hidden
            />
          </button>
        ))}
        <span className="ml-2 text-[12px] tabular-nums text-slate-500">{value} / 5</span>
      </div>
    </div>
  );
}

/**
 * Picks an image and previews it before it is uploaded.
 *
 * The preview is a local object URL, so someone choosing the wrong file finds
 * out immediately rather than after a save and a page refresh. The URL is
 * revoked when it changes or the field unmounts, otherwise every re-pick would
 * leak the previous blob for the lifetime of the tab.
 */
export function ImageField({
  label,
  currentUrl,
  file,
  onChange,
  hint,
  error,
  required = false,
}: {
  label: string;
  currentUrl?: string | null;
  file: File | null;
  onChange: (file: File | null) => void;
  hint?: string;
  error?: string;
  required?: boolean;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [preview, setPreview] = useState<string | null>(null);

  useEffect(() => {
    if (!file) {
      setPreview(null);
      return;
    }

    const url = URL.createObjectURL(file);
    setPreview(url);

    return () => URL.revokeObjectURL(url);
  }, [file]);

  const shown = preview ?? currentUrl ?? null;

  return (
    <Field label={label} error={error} help={hint} required={required}>
      <div className="flex items-start gap-3">
        <div
          className={`flex h-20 w-28 shrink-0 items-center justify-center overflow-hidden rounded-md border ${hairline} bg-slate-50`}
        >
          {shown ? (
            <img src={shown} alt="" className="h-full w-full object-cover" />
          ) : (
            <ImagePlus className="h-5 w-5 text-slate-300" aria-hidden />
          )}
        </div>

        <div className="flex min-w-0 flex-1 flex-col gap-1.5">
          <input
            ref={inputRef}
            type="file"
            accept="image/jpeg,image/png,image/webp"
            className="sr-only"
            onChange={(event) => onChange(event.target.files?.[0] ?? null)}
          />

          <div className="flex flex-wrap gap-1.5">
            <button
              type="button"
              onClick={() => inputRef.current?.click()}
              className={`inline-flex h-7 items-center gap-1.5 rounded-md border ${hairline} bg-white px-2.5 text-[12px] font-medium text-slate-700 transition-colors hover:bg-slate-50 ${focusRing}`}
            >
              <ImagePlus className="h-3.5 w-3.5" aria-hidden />
              {shown ? 'Replace' : 'Choose image'}
            </button>

            {file && (
              <button
                type="button"
                onClick={() => {
                  onChange(null);
                  if (inputRef.current) inputRef.current.value = '';
                }}
                className={`inline-flex h-7 items-center gap-1.5 rounded-md px-2 text-[12px] text-slate-500 transition-colors hover:bg-slate-100 hover:text-slate-800 ${focusRing}`}
              >
                <Trash2 className="h-3.5 w-3.5" aria-hidden />
                Undo
              </button>
            )}
          </div>

          {file && <p className="truncate text-[11px] text-slate-500">{file.name}</p>}
        </div>
      </div>
    </Field>
  );
}
