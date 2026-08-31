import { useEffect, useState } from 'react';
import { MessageSquareQuote, Pencil, Star, Trash2 } from 'lucide-react';
import { api, type AdminTestimonial } from '../lib/api';
import { ContentPageShell, ReorderButtons } from './ContentPageShell';
import { useContentResource } from './useContentResource';
import { ImageField, RatingPicker } from './contentFields';
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
  initialsOf,
  inputClass,
} from './ui';

export function TestimonialsPage() {
  const resource = useContentResource(api.testimonials, {
    label: 'testimonial',
    searchable: (item) => [item.name, item.course, item.text],
  });

  const [editing, setEditing] = useState<AdminTestimonial | 'new' | null>(null);
  const [deleting, setDeleting] = useState<AdminTestimonial | null>(null);

  useEffect(() => {
    document.title = 'Testimonials · ADEF Admin';
  }, []);

  const rows = resource.filtered as AdminTestimonial[];
  const all = resource.items as AdminTestimonial[];

  return (
    <>
      <ContentPageShell
        title="Testimonials"
        description="Quotes from graduates. These rotate in the testimonials section of the website."
        newLabel="New testimonial"
        onNew={() => setEditing('new')}
        searchPlaceholder="Search by name, course or quote…"
        resource={resource}
        columns={4}
        empty={{
          icon: <MessageSquareQuote className="h-7 w-7" />,
          title: 'No testimonials yet',
          description:
            'Add what graduates have said about the school. Ask permission before publishing a name.',
        }}
      >
        <Table>
          <THead>
            <TH className="w-[28%]">Graduate</TH>
            <TH className="w-[42%]">Quote</TH>
            <TH>Rating</TH>
            <TH align="center">Visible</TH>
            <TH align="right">Order</TH>
            <TH align="right" />
          </THead>
          <TBody>
            {rows.map((item) => {
              const index = all.findIndex((row) => row.id === item.id);

              return (
                <TR key={item.id} className="group">
                  <TD>
                    <div className="flex items-center gap-2.5">
                      {item.avatarUrl ? (
                        <img
                          src={item.avatarUrl}
                          alt=""
                          loading="lazy"
                          className="h-8 w-8 shrink-0 rounded-full object-cover"
                        />
                      ) : (
                        <span
                          className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-slate-100 text-[11px] font-semibold text-slate-500"
                          aria-hidden
                        >
                          {initialsOf(item.name)}
                        </span>
                      )}
                      <div className="min-w-0">
                        <p className="truncate font-medium text-slate-900">{item.name}</p>
                        <p className="truncate text-[12px] text-slate-500">{item.course}</p>
                      </div>
                    </div>
                  </TD>

                  <TD>
                    <p className="line-clamp-2 text-[12px] leading-relaxed text-slate-600">
                      {item.text}
                    </p>
                  </TD>

                  <TD>
                    <span className="inline-flex items-center gap-0.5" aria-label={`${item.rating} out of 5`}>
                      {Array.from({ length: 5 }).map((_, star) => (
                        <Star
                          key={star}
                          className={`h-3 w-3 ${
                            star < item.rating
                              ? 'fill-[var(--gold)] text-[var(--gold)]'
                              : 'text-slate-200'
                          }`}
                          aria-hidden
                        />
                      ))}
                    </span>
                  </TD>

                  <TD align="center">
                    <div className="flex items-center justify-center gap-2">
                      <Switch
                        checked={item.published}
                        onChange={() => void resource.togglePublished(item)}
                        label={`${item.published ? 'Hide' : 'Show'} testimonial from ${item.name}`}
                      />
                      <VisibilityBadge published={item.published} />
                    </div>
                  </TD>

                  <TD align="right">
                    <ReorderButtons
                      label={`testimonial from ${item.name}`}
                      disabled={resource.isFiltered}
                      isFirst={index === 0}
                      isLast={index === all.length - 1}
                      onUp={() => void resource.move(item.id, -1)}
                      onDown={() => void resource.move(item.id, 1)}
                    />
                  </TD>

                  <TD align="right">
                    <RowActions>
                      <IconButton label="Edit testimonial" onClick={() => setEditing(item)}>
                        <Pencil className="h-3.5 w-3.5" aria-hidden />
                      </IconButton>
                      <IconButton
                        label="Delete testimonial"
                        tone="danger"
                        onClick={() => setDeleting(item)}
                      >
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
        <TestimonialEditor
          testimonial={editing === 'new' ? null : editing}
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
        title="Delete this testimonial?"
        itemName={deleting ? `The quote from ${deleting.name}` : undefined}
        consequence="will be removed from the website. This cannot be undone."
        confirmLabel="Delete testimonial"
        loading={resource.saving}
      />
    </>
  );
}

interface TestimonialForm {
  name: string;
  course: string;
  text: string;
  rating: number;
  published: boolean;
}

function TestimonialEditor({
  testimonial,
  saving,
  onClose,
  onSave,
}: {
  testimonial: AdminTestimonial | null;
  saving: boolean;
  onClose: () => void;
  onSave: (input: TestimonialForm, image: File | null) => Promise<Record<string, string>>;
}) {
  const [form, setForm] = useState<TestimonialForm>(() => ({
    name: testimonial?.name ?? '',
    course: testimonial?.course ?? '',
    text: testimonial?.text ?? '',
    rating: testimonial?.rating ?? 5,
    published: testimonial?.published ?? true,
  }));

  const [image, setImage] = useState<File | null>(null);
  const [errors, setErrors] = useState<Record<string, string>>({});

  const set = <K extends keyof TestimonialForm>(key: K, value: TestimonialForm[K]) =>
    setForm((current) => ({ ...current, [key]: value }));

  return (
    <Modal
      open
      wide
      onClose={onClose}
      title={testimonial ? 'Edit testimonial' : 'New testimonial'}
      description="Publish a graduate's name only with their permission."
      footer={
        <>
          <Button variant="ghost" onClick={onClose}>
            Cancel
          </Button>
          <Button
            onClick={async () => setErrors(await onSave(form, image))}
            loading={saving}
          >
            {testimonial ? 'Save changes' : 'Add testimonial'}
          </Button>
        </>
      }
    >
      <div className="space-y-4">
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Name" error={errors.name} required>
            <input
              value={form.name}
              onChange={(event) => set('name', event.target.value)}
              className={inputClass}
              placeholder="Jean Pierre Mukiza"
              autoFocus
            />
          </Field>

          <Field
            label="Course"
            error={errors.course}
            help="Shown under the name."
            required
          >
            <input
              value={form.course}
              onChange={(event) => set('course', event.target.value)}
              className={inputClass}
              placeholder="Welding L3 Graduate"
            />
          </Field>
        </div>

        <Field label="Quote" error={errors.text} required>
          <textarea
            value={form.text}
            onChange={(event) => set('text', event.target.value)}
            rows={4}
            className={`${inputClass} resize-y leading-relaxed`}
            placeholder="ADEF gave me practical skills that prepared me for real employment."
          />
        </Field>

        <ImageField
          label="Photo"
          currentUrl={testimonial?.avatarUrl}
          file={image}
          onChange={setImage}
          error={errors.image}
          hint="Optional. Without one the website shows their initials."
        />

        <RatingPicker value={form.rating} onChange={(value) => set('rating', value)} />

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
