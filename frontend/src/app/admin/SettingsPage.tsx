import { useCallback, useEffect, useState } from 'react';
import { Clock, Pencil, Plus, Trash2 } from 'lucide-react';
import { api, ApiError, type AdminSiteSettings, type AdminWorkingHours } from '../lib/api';
import { PageHeader } from './AdminLayout';
import { useToast } from './admin-context';
import { useContentResource } from './useContentResource';
import { ReorderButtons } from './ContentPageShell';
import {
  Badge,
  Button,
  ConfirmDialog,
  ErrorState,
  Field,
  IconButton,
  Modal,
  Panel,
  PanelHeader,
  RowActions,
  SegmentedControl,
  Spinner,
  Switch,
  TBody,
  TD,
  TH,
  THead,
  TR,
  Table,
  inputClass,
} from './ui';

type Section = 'general' | 'about' | 'contact' | 'hours';

const SECTIONS: { value: Section; label: string }[] = [
  { value: 'general', label: 'General' },
  { value: 'about', label: 'About & vision' },
  { value: 'contact', label: 'Contact & social' },
  { value: 'hours', label: 'Opening hours' },
];

/**
 * Site-wide settings.
 *
 * Split into sections rather than one long form: the whole document is about
 * forty fields, and a single page of them makes finding the phone number a
 * scrolling exercise. Each section saves only what it contains, which is also
 * what stops one person's edit overwriting another's on an unrelated field.
 */
export function SettingsPage() {
  const { notify } = useToast();

  const [section, setSection] = useState<Section>('general');
  const [settings, setSettings] = useState<AdminSiteSettings | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      setSettings(await api.settings.get());
    } catch (caught) {
      setError(caught instanceof ApiError ? caught.message : 'Could not reach the server.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    document.title = 'Site settings · ADEF Admin';
    void load();
  }, [load]);

  const save = async (patch: Partial<AdminSiteSettings>) => {
    try {
      setSettings(await api.settings.update(patch));
      notify('Settings saved.', 'success');
      return {};
    } catch (caught) {
      if (caught instanceof ApiError && caught.fields) return caught.fields;
      notify(caught instanceof ApiError ? caught.message : 'Could not save.', 'error');
      return {};
    }
  };

  return (
    <>
      <PageHeader
        title="Site settings"
        description="The text and contact details used across the public website."
      />

      <div className="mb-4">
        <SegmentedControl
          label="Settings section"
          value={section}
          onChange={setSection}
          options={SECTIONS}
        />
      </div>

      {loading && <Spinner label="Loading settings" />}
      {error && !loading && <ErrorState message={error} onRetry={load} />}

      {settings && !loading && !error && (
        <>
          {section === 'general' && <GeneralSection settings={settings} onSave={save} />}
          {section === 'about' && <AboutSection settings={settings} onSave={save} />}
          {section === 'contact' && <ContactSection settings={settings} onSave={save} />}
          {section === 'hours' && <WorkingHoursSection note={settings.workingHoursNote} onSave={save} />}
        </>
      )}
    </>
  );
}

type SaveFn = (patch: Partial<AdminSiteSettings>) => Promise<Record<string, string>>;

/**
 * One settings section: holds its own draft, and only enables Save once
 * something has actually changed.
 */
function useSectionForm<T extends object>(initial: T, onSave: SaveFn) {
  const [form, setForm] = useState<T>(initial);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState(false);

  const dirty = JSON.stringify(form) !== JSON.stringify(initial);

  const set = <K extends keyof T>(key: K, value: T[K]) =>
    setForm((current) => ({ ...current, [key]: value }));

  const submit = async () => {
    setSaving(true);
    setErrors(await onSave(form as Partial<AdminSiteSettings>));
    setSaving(false);
  };

  return { form, set, errors, saving, dirty, submit };
}

function SectionFooter({
  dirty,
  saving,
  onSave,
}: {
  dirty: boolean;
  saving: boolean;
  onSave: () => void;
}) {
  return (
    <div className="flex items-center justify-end gap-3 border-t border-slate-200 bg-slate-50/60 px-4 py-3">
      {dirty && <span className="text-[12px] text-slate-500">Unsaved changes</span>}
      <Button onClick={onSave} loading={saving} disabled={!dirty}>
        Save changes
      </Button>
    </div>
  );
}

function GeneralSection({
  settings,
  onSave,
}: {
  settings: AdminSiteSettings;
  onSave: SaveFn;
}) {
  const { form, set, errors, saving, dirty, submit } = useSectionForm(
    {
      schoolName: settings.schoolName,
      tagline: settings.tagline ?? '',
      graduatesCount: settings.graduatesCount,
      programsCount: settings.programsCount,
    },
    onSave,
  );

  return (
    <Panel>
      <PanelHeader title="General" description="The school's name and the headline figures." />

      <div className="grid gap-4 p-4 sm:grid-cols-2">
        <Field label="School name" error={errors.schoolName} required>
          <input
            value={form.schoolName}
            onChange={(event) => set('schoolName', event.target.value)}
            className={inputClass}
          />
        </Field>

        <Field label="Tagline" hint="Optional" error={errors.tagline}>
          <input
            value={form.tagline}
            onChange={(event) => set('tagline', event.target.value)}
            className={inputClass}
            placeholder="Technical & Vocational Education"
          />
        </Field>

        <Field
          label="Graduates"
          error={errors.graduatesCount}
          help="Free text, so it can read “100+” rather than an exact number."
        >
          <input
            value={form.graduatesCount}
            onChange={(event) => set('graduatesCount', event.target.value)}
            className={inputClass}
            placeholder="100+"
          />
        </Field>

        <Field label="Number of programmes" error={errors.programsCount}>
          <input
            type="number"
            min={0}
            value={form.programsCount}
            onChange={(event) => set('programsCount', Number(event.target.value))}
            className={inputClass}
          />
        </Field>
      </div>

      <SectionFooter dirty={dirty} saving={saving} onSave={() => void submit()} />
    </Panel>
  );
}

function AboutSection({ settings, onSave }: { settings: AdminSiteSettings; onSave: SaveFn }) {
  const { form, set, errors, saving, dirty, submit } = useSectionForm(
    {
      aboutTitle: settings.aboutTitle ?? '',
      aboutText: settings.aboutText,
      aboutText2: settings.aboutText2 ?? '',
      vision: settings.vision,
      mission: settings.mission,
    },
    onSave,
  );

  return (
    <Panel>
      <PanelHeader
        title="About, vision and mission"
        description="The narrative sections in the middle of the home page."
      />

      <div className="space-y-4 p-4">
        <Field label="About heading" hint="Optional" error={errors.aboutTitle}>
          <input
            value={form.aboutTitle}
            onChange={(event) => set('aboutTitle', event.target.value)}
            className={inputClass}
          />
        </Field>

        <Field label="About — first paragraph" error={errors.aboutText} required>
          <textarea
            value={form.aboutText}
            onChange={(event) => set('aboutText', event.target.value)}
            rows={3}
            className={`${inputClass} resize-y leading-relaxed`}
          />
        </Field>

        <Field label="About — second paragraph" hint="Optional" error={errors.aboutText2}>
          <textarea
            value={form.aboutText2}
            onChange={(event) => set('aboutText2', event.target.value)}
            rows={3}
            className={`${inputClass} resize-y leading-relaxed`}
          />
        </Field>

        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Vision" error={errors.vision} required>
            <textarea
              value={form.vision}
              onChange={(event) => set('vision', event.target.value)}
              rows={4}
              className={`${inputClass} resize-y leading-relaxed`}
            />
          </Field>

          <Field label="Mission" error={errors.mission} required>
            <textarea
              value={form.mission}
              onChange={(event) => set('mission', event.target.value)}
              rows={4}
              className={`${inputClass} resize-y leading-relaxed`}
            />
          </Field>
        </div>
      </div>

      <SectionFooter dirty={dirty} saving={saving} onSave={() => void submit()} />
    </Panel>
  );
}

function ContactSection({ settings, onSave }: { settings: AdminSiteSettings; onSave: SaveFn }) {
  const { form, set, errors, saving, dirty, submit } = useSectionForm(
    {
      phone: settings.phone,
      whatsapp: settings.whatsapp ?? '',
      email: settings.email,
      address: settings.address,
      mapEmbedUrl: settings.mapEmbedUrl ?? '',
      instagramUrl: settings.instagramUrl ?? '',
      twitterUrl: settings.twitterUrl ?? '',
    },
    onSave,
  );

  return (
    <Panel>
      <PanelHeader
        title="Contact and social"
        description="Shown in the top bar, the contact section and the footer."
      />

      <div className="grid gap-4 p-4 sm:grid-cols-2">
        <Field label="Phone" error={errors.phone} required>
          <input
            value={form.phone}
            onChange={(event) => set('phone', event.target.value)}
            className={inputClass}
            placeholder="+250 789 895 800"
          />
        </Field>

        <Field
          label="WhatsApp"
          hint="Optional"
          error={errors.whatsapp}
          help="Digits only, no spaces — it is used to build a wa.me link."
        >
          <input
            value={form.whatsapp}
            onChange={(event) => set('whatsapp', event.target.value)}
            className={inputClass}
            placeholder="+250789895800"
          />
        </Field>

        <Field label="Email" error={errors.email} required>
          <input
            type="email"
            value={form.email}
            onChange={(event) => set('email', event.target.value)}
            className={inputClass}
          />
        </Field>

        <Field label="Address" error={errors.address} required>
          <input
            value={form.address}
            onChange={(event) => set('address', event.target.value)}
            className={inputClass}
            placeholder="NR5, Kigali, Rwanda"
          />
        </Field>

        <div className="sm:col-span-2">
          <Field
            label="Google Maps embed URL"
            hint="Optional"
            error={errors.mapEmbedUrl}
            help="In Google Maps: Share → Embed a map → copy the src value from the iframe."
          >
            <input
              value={form.mapEmbedUrl}
              onChange={(event) => set('mapEmbedUrl', event.target.value)}
              className={inputClass}
              placeholder="https://www.google.com/maps/embed?pb=…"
            />
          </Field>
        </div>

        <Field label="Instagram" hint="Optional" error={errors.instagramUrl}>
          <input
            value={form.instagramUrl}
            onChange={(event) => set('instagramUrl', event.target.value)}
            className={inputClass}
            placeholder="https://instagram.com/adef_tvet_school"
          />
        </Field>

        <Field label="X / Twitter" hint="Optional" error={errors.twitterUrl}>
          <input
            value={form.twitterUrl}
            onChange={(event) => set('twitterUrl', event.target.value)}
            className={inputClass}
            placeholder="https://twitter.com/AdefTvet"
          />
        </Field>
      </div>

      <SectionFooter dirty={dirty} saving={saving} onSave={() => void submit()} />
    </Panel>
  );
}

/**
 * Opening hours live under settings rather than getting their own nav entry:
 * there are two or three rows of them, and they belong with the phone number
 * and address in anyone's mental model of "the school's details".
 */
function WorkingHoursSection({
  note,
  onSave,
}: {
  note: string | null;
  onSave: SaveFn;
}) {
  const resource = useContentResource(api.workingHours, {
    label: 'row',
    searchable: (row) => [row.day],
  });

  const [editing, setEditing] = useState<AdminWorkingHours | 'new' | null>(null);
  const [deleting, setDeleting] = useState<AdminWorkingHours | null>(null);

  const noteForm = useSectionForm({ workingHoursNote: note ?? '' }, onSave);
  const rows = resource.items as AdminWorkingHours[];

  return (
    <div className="space-y-4">
      <Panel>
        <PanelHeader
          title="Opening hours"
          description="Rows appear on the website in this order."
          action={
            <Button size="sm" onClick={() => setEditing('new')}>
              <Plus className="h-3.5 w-3.5" aria-hidden />
              Add row
            </Button>
          }
        />

        {resource.loading ? (
          <Spinner label="Loading hours" />
        ) : rows.length === 0 ? (
          <div className="px-4 py-10 text-center">
            <Clock className="mx-auto mb-2 h-6 w-6 text-slate-300" aria-hidden />
            <p className="text-[13px] text-slate-500">
              No opening hours yet. Add a row such as “Monday – Saturday”.
            </p>
          </div>
        ) : (
          <Table>
            <THead>
              <TH className="w-[40%]">Day</TH>
              <TH>Hours</TH>
              <TH align="right">Order</TH>
              <TH align="right" />
            </THead>
            <TBody>
              {rows.map((row, index) => (
                <TR key={row.id} className="group">
                  <TD className="font-medium text-slate-900">{row.day}</TD>

                  <TD>
                    {row.isOpen ? (
                      <span className="tabular-nums text-slate-600">
                        {row.openTime || '—'}
                        {row.closeTime ? ` – ${row.closeTime}` : ''}
                      </span>
                    ) : (
                      <Badge tone="neutral">Closed</Badge>
                    )}
                  </TD>

                  <TD align="right">
                    <ReorderButtons
                      label={row.day}
                      disabled={false}
                      isFirst={index === 0}
                      isLast={index === rows.length - 1}
                      onUp={() => void resource.move(row.id, -1)}
                      onDown={() => void resource.move(row.id, 1)}
                    />
                  </TD>

                  <TD align="right">
                    <RowActions>
                      <IconButton label="Edit row" onClick={() => setEditing(row)}>
                        <Pencil className="h-3.5 w-3.5" aria-hidden />
                      </IconButton>
                      <IconButton label="Delete row" tone="danger" onClick={() => setDeleting(row)}>
                        <Trash2 className="h-3.5 w-3.5" aria-hidden />
                      </IconButton>
                    </RowActions>
                  </TD>
                </TR>
              ))}
            </TBody>
          </Table>
        )}
      </Panel>

      <Panel>
        <PanelHeader
          title="Note under the hours"
          description="A sentence shown below the table on the website."
        />
        <div className="p-4">
          <Field label="Note" hint="Optional" error={noteForm.errors.workingHoursNote}>
            <textarea
              value={noteForm.form.workingHoursNote}
              onChange={(event) => noteForm.set('workingHoursNote', event.target.value)}
              rows={3}
              className={`${inputClass} resize-y leading-relaxed`}
              placeholder="Walk-ins are welcome, but appointments are recommended."
            />
          </Field>
        </div>
        <SectionFooter
          dirty={noteForm.dirty}
          saving={noteForm.saving}
          onSave={() => void noteForm.submit()}
        />
      </Panel>

      {editing && (
        <WorkingHoursEditor
          row={editing === 'new' ? null : editing}
          saving={resource.saving}
          onClose={() => setEditing(null)}
          onSave={async (input) => {
            const result =
              editing === 'new'
                ? await resource.create(input)
                : await resource.update(editing.id, input);

            if (result.ok) setEditing(null);
            return result.ok ? {} : result.fields;
          }}
        />
      )}

      <ConfirmDialog
        open={Boolean(deleting)}
        onClose={() => setDeleting(null)}
        onConfirm={async () => {
          if (deleting) await resource.remove(deleting.id);
          setDeleting(null);
        }}
        title="Delete this row?"
        itemName={deleting?.day}
        consequence="will no longer appear in the opening hours on the website."
        confirmLabel="Delete row"
        loading={resource.saving}
      />
    </div>
  );
}

interface HoursForm {
  day: string;
  openTime: string;
  closeTime: string;
  isOpen: boolean;
}

function WorkingHoursEditor({
  row,
  saving,
  onClose,
  onSave,
}: {
  row: AdminWorkingHours | null;
  saving: boolean;
  onClose: () => void;
  onSave: (input: {
    day: string;
    openTime: string;
    closeTime: string | null;
    isOpen: boolean;
  }) => Promise<Record<string, string>>;
}) {
  const [form, setForm] = useState<HoursForm>(() => ({
    day: row?.day ?? '',
    openTime: row?.openTime ?? '',
    closeTime: row?.closeTime ?? '',
    isOpen: row?.isOpen ?? true,
  }));

  const [errors, setErrors] = useState<Record<string, string>>({});

  const set = <K extends keyof HoursForm>(key: K, value: HoursForm[K]) =>
    setForm((current) => ({ ...current, [key]: value }));

  return (
    <Modal
      open
      onClose={onClose}
      title={row ? 'Edit opening hours' : 'Add opening hours'}
      footer={
        <>
          <Button variant="ghost" onClick={onClose}>
            Cancel
          </Button>
          <Button
            loading={saving}
            onClick={async () =>
              setErrors(
                await onSave({
                  day: form.day,
                  // When closed the times are meaningless, so they are cleared
                  // rather than saved and hidden — otherwise reopening the day
                  // would silently restore hours nobody checked.
                  openTime: form.isOpen ? form.openTime : '',
                  closeTime: form.isOpen ? form.closeTime || null : null,
                  isOpen: form.isOpen,
                }),
              )
            }
          >
            {row ? 'Save changes' : 'Add row'}
          </Button>
        </>
      }
    >
      <div className="space-y-4">
        <Field
          label="Day or range"
          error={errors.day}
          help="A label, not a date — “Monday – Saturday” is one row."
          required
        >
          <input
            value={form.day}
            onChange={(event) => set('day', event.target.value)}
            className={inputClass}
            placeholder="Monday – Saturday"
            autoFocus
          />
        </Field>

        <div className="flex items-center justify-between rounded-md border border-slate-200 bg-slate-50/60 px-3 py-2.5">
          <div>
            <p className="text-[13px] font-medium text-slate-800">Open on these days</p>
            <p className="text-[11px] text-slate-500">Turn off to show “Closed” instead of times.</p>
          </div>
          <Switch
            checked={form.isOpen}
            onChange={(value) => set('isOpen', value)}
            label="Open on these days"
          />
        </div>

        {form.isOpen && (
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Opens" error={errors.openTime}>
              <input
                value={form.openTime}
                onChange={(event) => set('openTime', event.target.value)}
                className={inputClass}
                placeholder="7:30 AM"
              />
            </Field>

            <Field label="Closes" hint="Optional" error={errors.closeTime}>
              <input
                value={form.closeTime}
                onChange={(event) => set('closeTime', event.target.value)}
                className={inputClass}
                placeholder="5:00 PM"
              />
            </Field>
          </div>
        )}
      </div>
    </Modal>
  );
}
