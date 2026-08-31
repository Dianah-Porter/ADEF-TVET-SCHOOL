import { useEffect, useState } from 'react';
import {
  Award,
  Briefcase,
  Hand,
  Pencil,
  Sparkles,
  Trash2,
  Users,
  Wrench,
  type LucideIcon,
} from 'lucide-react';
import { api, type AccentColor, type AdminFeature, type FeatureIcon } from '../lib/api';
import { ContentPageShell, ReorderButtons } from './ContentPageShell';
import { useContentResource } from './useContentResource';
import { ACCENTS, AccentPicker, FEATURE_ICONS, IconPicker } from './contentFields';
import {
  Button,
  ConfirmDialog,
  Field,
  IconButton,
  Modal,
  RowActions,
  Switch,
  TBody,
  TD,
  TH,
  THead,
  TR,
  Table,
  VisibilityBadge,
  inputClass,
} from './ui';

const ICON_COMPONENTS: Record<FeatureIcon, LucideIcon> = {
  AWARD: Award,
  HAND: Hand,
  USERS: Users,
  WRENCH: Wrench,
  BRIEFCASE: Briefcase,
};

export function FeaturesPage() {
  const resource = useContentResource(api.features, {
    label: 'point',
    searchable: (item) => [item.title, item.description],
  });

  const [editing, setEditing] = useState<AdminFeature | 'new' | null>(null);
  const [deleting, setDeleting] = useState<AdminFeature | null>(null);

  useEffect(() => {
    document.title = 'Why choose us · ADEF Admin';
  }, []);

  const rows = resource.filtered as AdminFeature[];
  const all = resource.items as AdminFeature[];

  return (
    <>
      <ContentPageShell
        title="Why choose us"
        description="The selling points shown in the “Why Choose ADEF” section of the website."
        newLabel="New point"
        onNew={() => setEditing('new')}
        searchPlaceholder="Search points…"
        resource={resource}
        columns={4}
        empty={{
          icon: <Sparkles className="h-7 w-7" />,
          title: 'No points yet',
          description:
            'Add what makes the school worth choosing — accreditation, equipment, staff, results.',
        }}
      >
        <Table>
          <THead>
            <TH className="w-[52%]">Point</TH>
            <TH>Accent</TH>
            <TH align="center">Visible</TH>
            <TH align="right">Order</TH>
            <TH align="right" />
          </THead>
          <TBody>
            {rows.map((item) => {
              const Icon = ICON_COMPONENTS[item.icon] ?? Award;
              const index = all.findIndex((row) => row.id === item.id);
              const accent = ACCENTS.find((row) => row.value === item.accentColor);

              return (
                <TR key={item.id} className="group">
                  <TD>
                    <div className="flex items-start gap-2.5">
                      <span
                        className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-md"
                        style={{ background: `${accent?.token}1a`, color: accent?.token }}
                        aria-hidden
                      >
                        <Icon className="h-4 w-4" />
                      </span>
                      <div className="min-w-0">
                        <p className="truncate font-medium text-slate-900">{item.title}</p>
                        <p className="truncate text-[12px] text-slate-500">{item.description}</p>
                      </div>
                    </div>
                  </TD>

                  <TD>
                    <span className="inline-flex items-center gap-1.5 text-[12px] text-slate-600">
                      <span
                        className="h-3 w-3 rounded-full ring-1 ring-inset ring-black/10"
                        style={{ background: accent?.token }}
                        aria-hidden
                      />
                      {accent?.label}
                    </span>
                  </TD>

                  <TD align="center">
                    <div className="flex items-center justify-center gap-2">
                      <Switch
                        checked={item.published}
                        onChange={() => void resource.togglePublished(item)}
                        label={`${item.published ? 'Hide' : 'Show'} ${item.title}`}
                      />
                      <VisibilityBadge published={item.published} />
                    </div>
                  </TD>

                  <TD align="right">
                    <ReorderButtons
                      label={item.title}
                      disabled={resource.isFiltered}
                      isFirst={index === 0}
                      isLast={index === all.length - 1}
                      onUp={() => void resource.move(item.id, -1)}
                      onDown={() => void resource.move(item.id, 1)}
                    />
                  </TD>

                  <TD align="right">
                    <RowActions>
                      <IconButton label="Edit point" onClick={() => setEditing(item)}>
                        <Pencil className="h-3.5 w-3.5" aria-hidden />
                      </IconButton>
                      <IconButton label="Delete point" tone="danger" onClick={() => setDeleting(item)}>
                        <Trash2 className="h-3.5 w-3.5" aria-hidden />
                      </IconButton>
                    </RowActions>
                  </TD>
                </TR>
              );
            })}
          </TBody>
        </Table>
      </ContentPageShell>

      {editing && (
        <FeatureEditor
          feature={editing === 'new' ? null : editing}
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
        title="Delete this point?"
        itemName={deleting?.title}
        consequence="will be removed from the website. This cannot be undone."
        confirmLabel="Delete point"
        loading={resource.saving}
      />
    </>
  );
}

interface FeatureForm {
  title: string;
  description: string;
  icon: FeatureIcon;
  accentColor: AccentColor;
  published: boolean;
}

function FeatureEditor({
  feature,
  saving,
  onClose,
  onSave,
}: {
  feature: AdminFeature | null;
  saving: boolean;
  onClose: () => void;
  onSave: (input: FeatureForm) => Promise<Record<string, string>>;
}) {
  const [form, setForm] = useState<FeatureForm>(() => ({
    title: feature?.title ?? '',
    description: feature?.description ?? '',
    icon: feature?.icon ?? 'AWARD',
    accentColor: feature?.accentColor ?? 'GOLD',
    published: feature?.published ?? true,
  }));

  const [errors, setErrors] = useState<Record<string, string>>({});

  const set = <K extends keyof FeatureForm>(key: K, value: FeatureForm[K]) =>
    setForm((current) => ({ ...current, [key]: value }));

  return (
    <Modal
      open
      onClose={onClose}
      title={feature ? 'Edit point' : 'New point'}
      description="A short claim and one line of explanation."
      footer={
        <>
          <Button variant="ghost" onClick={onClose}>
            Cancel
          </Button>
          <Button onClick={async () => setErrors(await onSave(form))} loading={saving}>
            {feature ? 'Save changes' : 'Add point'}
          </Button>
        </>
      }
    >
      <div className="space-y-4">
        <Field label="Title" error={errors.title} required>
          <input
            value={form.title}
            onChange={(event) => set('title', event.target.value)}
            className={inputClass}
            placeholder="Certified & Accredited Programs"
            autoFocus
          />
        </Field>

        <Field label="Description" error={errors.description} required>
          <textarea
            value={form.description}
            onChange={(event) => set('description', event.target.value)}
            rows={3}
            className={`${inputClass} resize-y leading-relaxed`}
            placeholder="Nationally recognized qualifications that meet industry standards"
          />
        </Field>

        <IconPicker
          label="Icon"
          value={form.icon}
          onChange={(value) => set('icon', value)}
          options={FEATURE_ICONS}
        />

        <AccentPicker value={form.accentColor} onChange={(value) => set('accentColor', value)} />

        <div className="flex items-center justify-between rounded-md border border-slate-200 bg-slate-50/60 px-3 py-2.5">
          <div>
            <p className="text-[13px] font-medium text-slate-800">Show on the website</p>
            <p className="text-[11px] text-slate-500">Turn off to keep it here without publishing.</p>
          </div>
          <Switch
            checked={form.published}
            onChange={(value) => set('published', value)}
            label="Show on the website"
          />
        </div>
      </div>
    </Modal>
  );
}
