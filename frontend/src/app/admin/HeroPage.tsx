import { useEffect, useState } from 'react';
import { GalleryHorizontalEnd, Pencil, Trash2 } from 'lucide-react';
import { api, type AdminHeroSlide } from '../lib/api';
import { ContentPageShell, ReorderButtons } from './ContentPageShell';
import { useContentResource } from './useContentResource';
import { ImageField } from './contentFields';
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
  formatBytes,
  inputClass,
} from './ui';

export function HeroPage() {
  const resource = useContentResource(api.hero, {
    label: 'slide',
    searchable: (item) => [item.headline ?? '', item.subtext ?? ''],
  });

  const [editing, setEditing] = useState<AdminHeroSlide | 'new' | null>(null);
  const [deleting, setDeleting] = useState<AdminHeroSlide | null>(null);

  useEffect(() => {
    document.title = 'Hero slides · ADEF Admin';
  }, []);

  const rows = resource.filtered as AdminHeroSlide[];
  const all = resource.items as AdminHeroSlide[];

  return (
    <>
      <ContentPageShell
        title="Hero slides"
        description="The images that rotate behind the headline at the top of the website."
        newLabel="New slide"
        onNew={() => setEditing('new')}
        searchPlaceholder="Search slides…"
        resource={resource}
        columns={4}
        empty={{
          icon: <GalleryHorizontalEnd className="h-7 w-7" />,
          title: 'No hero slides yet',
          description:
            'Add wide photographs of the campus or workshops. They rotate behind the headline.',
        }}
      >
        <Table>
          <THead>
            <TH className="w-[46%]">Slide</TH>
            <TH>Size</TH>
            <TH align="center">Visible</TH>
            <TH align="right">Order</TH>
            <TH align="right" />
          </THead>
          <TBody>
            {rows.map((slide) => {
              const index = all.findIndex((row) => row.id === slide.id);

              return (
                <TR key={slide.id} className="group">
                  <TD>
                    <div className="flex items-center gap-2.5">
                      <img
                        src={slide.imageUrl}
                        alt=""
                        loading="lazy"
                        className="h-10 w-20 shrink-0 rounded border border-slate-200 object-cover"
                      />
                      <div className="min-w-0">
                        <p className="truncate font-medium text-slate-900">
                          {slide.headline || (
                            <span className="font-normal text-slate-400">No headline</span>
                          )}
                        </p>
                        <p className="truncate text-[12px] text-slate-500">
                          {slide.subtext || 'Uses the default hero text'}
                        </p>
                      </div>
                    </div>
                  </TD>

                  <TD className="whitespace-nowrap text-[12px] tabular-nums text-slate-500">
                    {slide.width}×{slide.height} · {formatBytes(slide.sizeBytes)}
                  </TD>

                  <TD align="center">
                    <div className="flex items-center justify-center gap-2">
                      <Switch
                        checked={slide.published}
                        onChange={() => void resource.togglePublished(slide)}
                        label={slide.published ? 'Hide slide' : 'Show slide'}
                      />
                      <VisibilityBadge published={slide.published} />
                    </div>
                  </TD>

                  <TD align="right">
                    <ReorderButtons
                      label="slide"
                      disabled={resource.isFiltered}
                      isFirst={index === 0}
                      isLast={index === all.length - 1}
                      onUp={() => void resource.move(slide.id, -1)}
                      onDown={() => void resource.move(slide.id, 1)}
                    />
                  </TD>

                  <TD align="right">
                    <RowActions>
                      <IconButton label="Edit slide" onClick={() => setEditing(slide)}>
                        <Pencil className="h-3.5 w-3.5" aria-hidden />
                      </IconButton>
                      <IconButton label="Delete slide" tone="danger" onClick={() => setDeleting(slide)}>
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
        <HeroEditor
          slide={editing === 'new' ? null : editing}
          saving={resource.saving}
          onClose={() => setEditing(null)}
          onSave={async (input, image) => {
            const result =
              editing === 'new'
                ? await resource.create(input, image)
                : await resource.update(editing.id, input, image);

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
        title="Delete this slide?"
        itemName="This slide"
        consequence="will be removed from the website and its image deleted. This cannot be undone."
        confirmLabel="Delete slide"
        loading={resource.saving}
      />
    </>
  );
}

interface HeroForm {
  headline: string;
  subtext: string;
  published: boolean;
}

function HeroEditor({
  slide,
  saving,
  onClose,
  onSave,
}: {
  slide: AdminHeroSlide | null;
  saving: boolean;
  onClose: () => void;
  onSave: (input: HeroForm, image: File | null) => Promise<Record<string, string>>;
}) {
  const [form, setForm] = useState<HeroForm>(() => ({
    headline: slide?.headline ?? '',
    subtext: slide?.subtext ?? '',
    published: slide?.published ?? true,
  }));

  const [image, setImage] = useState<File | null>(null);
  const [errors, setErrors] = useState<Record<string, string>>({});

  const set = <K extends keyof HeroForm>(key: K, value: HeroForm[K]) =>
    setForm((current) => ({ ...current, [key]: value }));

  return (
    <Modal
      open
      wide
      onClose={onClose}
      title={slide ? 'Edit slide' : 'New hero slide'}
      description="Wide, well-lit photographs work best — text is laid over the middle of the image."
      footer={
        <>
          <Button variant="ghost" onClick={onClose}>
            Cancel
          </Button>
          <Button onClick={async () => setErrors(await onSave(form, image))} loading={saving}>
            {slide ? 'Save changes' : 'Add slide'}
          </Button>
        </>
      }
    >
      <div className="space-y-4">
        <ImageField
          label="Image"
          currentUrl={slide?.imageUrl}
          file={image}
          onChange={setImage}
          error={errors.image}
          required={!slide}
          hint="Landscape, at least 1600px wide. JPEG, PNG or WebP up to 8 MB."
        />

        <Field
          label="Headline"
          hint="Optional"
          error={errors.headline}
          help="Leave blank to use the site's standard headline on this slide."
        >
          <input
            value={form.headline}
            onChange={(event) => set('headline', event.target.value)}
            className={inputClass}
            placeholder="Empowering the Next Generation"
          />
        </Field>

        <Field label="Sub-text" hint="Optional" error={errors.subtext}>
          <textarea
            value={form.subtext}
            onChange={(event) => set('subtext', event.target.value)}
            rows={2}
            className={`${inputClass} resize-y leading-relaxed`}
            placeholder="Hands-on technical education for local and international labour markets."
          />
        </Field>

        <div className="flex items-center justify-between rounded-md border border-slate-200 bg-slate-50/60 px-3 py-2.5">
          <div>
            <p className="text-[13px] font-medium text-slate-800">Show on the website</p>
            <p className="text-[11px] text-slate-500">Hidden slides stay here but never appear.</p>
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
