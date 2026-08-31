import { useEffect, useMemo, useState } from 'react';
import { Box, Flame, Hammer, ListChecks, Pencil, Trash2, type LucideIcon } from 'lucide-react';
import { api, type AccentColor, type AdminCourse, type CourseIcon } from '../lib/api';
import { ContentPageShell, ReorderButtons } from './ContentPageShell';
import { useContentResource } from './useContentResource';
import { ACCENTS, AccentPicker, COURSE_ICONS, IconPicker, ImageField } from './contentFields';
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
  formatDate,
  inputClass,
} from './ui';

const ICON_COMPONENTS: Record<CourseIcon, LucideIcon> = {
  FLAME: Flame,
  HAMMER: Hammer,
  BOX: Box,
};

export function CoursesPage() {
  const resource = useContentResource(api.courses, {
    label: 'course',
    searchable: (course) => [course.title, course.description, course.level ?? ''],
  });

  const [editing, setEditing] = useState<AdminCourse | 'new' | null>(null);
  const [deleting, setDeleting] = useState<AdminCourse | null>(null);

  useEffect(() => {
    document.title = 'Courses · ADEF Admin';
  }, []);

  const rows = resource.filtered as AdminCourse[];
  const all = resource.items as AdminCourse[];

  return (
    <>
      <ContentPageShell
        title="Courses"
        description="The training programmes shown on the website. Order here is the order they appear."
        newLabel="New course"
        onNew={() => setEditing('new')}
        searchPlaceholder="Search courses…"
        resource={resource}
        columns={5}
        empty={{
          icon: <ListChecks className="h-7 w-7" />,
          title: 'No courses yet',
          description: 'Add the trades the school teaches. Each one becomes a card on the website.',
        }}
      >
        <Table>
          <THead>
            <TH className="w-[42%]">Course</TH>
            <TH>Level</TH>
            <TH>Accent</TH>
            <TH align="center">Visible</TH>
            <TH>Updated</TH>
            <TH align="right">Order</TH>
            <TH align="right" />
          </THead>
          <TBody>
            {rows.map((course) => {
              const Icon = ICON_COMPONENTS[course.icon] ?? Flame;
              const index = all.findIndex((item) => item.id === course.id);
              const accent = ACCENTS.find((item) => item.value === course.accentColor);

              return (
                <TR key={course.id} className="group">
                  <TD>
                    <div className="flex items-center gap-2.5">
                      <div className="h-9 w-12 shrink-0 overflow-hidden rounded border border-slate-200 bg-slate-50">
                        {course.imageUrl ? (
                          <img
                            src={course.imageUrl}
                            alt=""
                            loading="lazy"
                            className="h-full w-full object-cover"
                          />
                        ) : (
                          <span className="flex h-full w-full items-center justify-center">
                            <Icon className="h-3.5 w-3.5 text-slate-300" aria-hidden />
                          </span>
                        )}
                      </div>
                      <div className="min-w-0">
                        <p className="truncate font-medium text-slate-900">{course.title}</p>
                        <p className="truncate text-[12px] text-slate-500">{course.description}</p>
                      </div>
                    </div>
                  </TD>

                  <TD className="whitespace-nowrap text-[12px] text-slate-500">
                    {course.level || '—'}
                    {course.duration ? ` · ${course.duration}` : ''}
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
                        checked={course.published}
                        onChange={() => void resource.togglePublished(course)}
                        label={`${course.published ? 'Hide' : 'Show'} ${course.title}`}
                      />
                      <VisibilityBadge published={course.published} />
                    </div>
                  </TD>

                  <TD className="whitespace-nowrap text-[12px] text-slate-500">
                    {formatDate(course.updatedAt)}
                  </TD>

                  <TD align="right">
                    <ReorderButtons
                      label={course.title}
                      disabled={resource.isFiltered}
                      isFirst={index === 0}
                      isLast={index === all.length - 1}
                      onUp={() => void resource.move(course.id, -1)}
                      onDown={() => void resource.move(course.id, 1)}
                    />
                  </TD>

                  <TD align="right">
                    <RowActions>
                      <IconButton label="Edit course" onClick={() => setEditing(course)}>
                        <Pencil className="h-3.5 w-3.5" aria-hidden />
                      </IconButton>
                      <IconButton
                        label="Delete course"
                        tone="danger"
                        onClick={() => setDeleting(course)}
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
        <CourseEditor
          course={editing === 'new' ? null : editing}
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
        title="Delete this course?"
        itemName={deleting?.title}
        consequence="will be removed from the website along with its picture. This cannot be undone."
        confirmLabel="Delete course"
        loading={resource.saving}
      />
    </>
  );
}

interface CourseForm {
  title: string;
  description: string;
  level: string;
  duration: string;
  icon: CourseIcon;
  accentColor: AccentColor;
  published: boolean;
}

function CourseEditor({
  course,
  saving,
  onClose,
  onSave,
}: {
  course: AdminCourse | null;
  saving: boolean;
  onClose: () => void;
  onSave: (
    input: CourseForm,
    image: File | null,
  ) => Promise<Record<string, string>>;
}) {
  const [form, setForm] = useState<CourseForm>(() => ({
    title: course?.title ?? '',
    description: course?.description ?? '',
    level: course?.level ?? '',
    duration: course?.duration ?? '',
    icon: course?.icon ?? 'FLAME',
    accentColor: course?.accentColor ?? 'ORANGE',
    published: course?.published ?? true,
  }));

  const [image, setImage] = useState<File | null>(null);
  const [errors, setErrors] = useState<Record<string, string>>({});

  const set = <K extends keyof CourseForm>(key: K, value: CourseForm[K]) =>
    setForm((current) => ({ ...current, [key]: value }));

  const submit = async () => {
    setErrors(await onSave(form, image));
  };

  const preview = useMemo(
    () => ACCENTS.find((accent) => accent.value === form.accentColor),
    [form.accentColor],
  );

  return (
    <Modal
      open
      wide
      onClose={onClose}
      title={course ? 'Edit course' : 'New course'}
      description="This appears as a card in the Programs section of the website."
      footer={
        <>
          <Button variant="ghost" onClick={onClose}>
            Cancel
          </Button>
          <Button onClick={() => void submit()} loading={saving}>
            {course ? 'Save changes' : 'Add course'}
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
            placeholder="Welding L3"
            autoFocus
          />
        </Field>

        <Field
          label="Description"
          error={errors.description}
          help="One or two sentences. This is the text under the course title on the card."
          required
        >
          <textarea
            value={form.description}
            onChange={(event) => set('description', event.target.value)}
            rows={3}
            className={`${inputClass} resize-y leading-relaxed`}
            placeholder="Master modern welding techniques with practical industrial training."
          />
        </Field>

        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Level" hint="Optional" error={errors.level}>
            <input
              value={form.level}
              onChange={(event) => set('level', event.target.value)}
              className={inputClass}
              placeholder="Level 3"
            />
          </Field>

          <Field label="Duration" hint="Optional" error={errors.duration}>
            <input
              value={form.duration}
              onChange={(event) => set('duration', event.target.value)}
              className={inputClass}
              placeholder="2 years"
            />
          </Field>
        </div>

        <ImageField
          label="Course photo"
          currentUrl={course?.imageUrl}
          file={image}
          onChange={setImage}
          error={errors.image}
          hint="JPEG, PNG or WebP, up to 8 MB. It is resized and converted automatically."
        />

        <div className="grid gap-4 sm:grid-cols-2">
          <IconPicker
            label="Icon"
            value={form.icon}
            onChange={(value) => set('icon', value)}
            options={COURSE_ICONS}
          />
          <AccentPicker value={form.accentColor} onChange={(value) => set('accentColor', value)} />
        </div>

        <div className="flex items-center justify-between rounded-md border border-slate-200 bg-slate-50/60 px-3 py-2.5">
          <div>
            <p className="text-[13px] font-medium text-slate-800">Show on the website</p>
            <p className="text-[11px] text-slate-500">
              Turn this off to keep the course here without publishing it.
            </p>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-[12px] text-slate-500" style={{ color: preview?.token }}>
              {preview?.label}
            </span>
            <Switch
              checked={form.published}
              onChange={(value) => set('published', value)}
              label="Show on the website"
            />
          </div>
        </div>
      </div>
    </Modal>
  );
}
