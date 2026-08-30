import { useCallback, useEffect, useRef, useState, type DragEvent } from 'react';
import {
  ChevronLeft,
  ChevronRight,
  Eye,
  EyeOff,
  GripVertical,
  Images,
  Pencil,
  Trash2,
  Upload,
} from 'lucide-react';
import { api, ApiError, type GalleryImage } from '../lib/api';
import { PageHeader } from './AdminLayout';
import { useToast } from './admin-context';
import {
  Badge,
  Button,
  ConfirmDialog,
  EmptyState,
  ErrorState,
  Field,
  IconButton,
  Modal,
  Pagination,
  Panel,
  SearchInput,
  SegmentedControl,
  Select,
  Spinner,
  Toolbar,
  focusRing,
  formatBytes,
  hairline,
  inputClass,
} from './ui';

const CATEGORIES = ['Campus', 'Workshop', 'Students', 'Events', 'Facilities'];

type Visibility = 'all' | 'live' | 'hidden';

export function GalleryPage() {
  const { notify } = useToast();

  const [images, setImages] = useState<GalleryImage[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [dragActive, setDragActive] = useState(false);

  const [editing, setEditing] = useState<GalleryImage | null>(null);
  const [deleting, setDeleting] = useState<GalleryImage | null>(null);

  const [uploadCategory, setUploadCategory] = useState(CATEGORIES[0]!);
  const [search, setSearch] = useState('');
  const [category, setCategory] = useState('');
  const [visibility, setVisibility] = useState<Visibility>('all');

  const [page, setPage] = useState(1);
  const [meta, setMeta] = useState({ totalPages: 1, total: 0 });

  const fileInput = useRef<HTMLInputElement>(null);
  const dragIndex = useRef<number | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);

    const params = new URLSearchParams({ page: String(page), limit: '48' });
    if (search.trim()) params.set('search', search.trim());
    if (category) params.set('category', category);
    if (visibility !== 'all') params.set('published', String(visibility === 'live'));

    try {
      const result = await api.gallery.listAdmin(`?${params.toString()}`);
      setImages(result.data);
      setMeta({ totalPages: result.meta.totalPages, total: result.meta.total });
    } catch (caught) {
      setError(caught instanceof ApiError ? caught.message : 'Could not reach the server.');
    } finally {
      setLoading(false);
    }
  }, [category, page, search, visibility]);

  useEffect(() => {
    document.title = 'Gallery · ADEF Admin';
  }, []);

  // Debounced, so typing in the search box does not fire a request per keystroke.
  useEffect(() => {
    const timer = window.setTimeout(() => void load(), search ? 300 : 0);
    return () => window.clearTimeout(timer);
  }, [load, search]);

  const isFiltered = Boolean(search.trim() || category || visibility !== 'all');

  const upload = async (files: File[]) => {
    if (files.length === 0) return;

    setUploading(true);

    try {
      const result = await api.gallery.upload(files, { category: uploadCategory });

      if (result.created.length > 0) {
        notify(
          result.created.length === 1 ? 'Photo added.' : `${result.created.length} photos added.`,
          'success',
        );
      }

      // Rejected files are named individually — telling someone "some files
      // failed" without saying which ones is useless.
      result.failed.forEach((failure) => notify(`${failure.filename} — ${failure.reason}`, 'error'));

      setPage(1);
      await load();
    } catch (caught) {
      notify(
        caught instanceof ApiError
          ? (caught.fields?.files ?? caught.message)
          : 'The upload failed.',
        'error',
      );
    } finally {
      setUploading(false);
      if (fileInput.current) fileInput.current.value = '';
    }
  };

  const togglePublished = async (image: GalleryImage) => {
    // Optimistic: the toggle should feel instant. Reverted below if it fails.
    setImages((current) =>
      current.map((item) => (item.id === image.id ? { ...item, published: !item.published } : item)),
    );

    try {
      await api.gallery.update(image.id, { published: !image.published });
      notify(image.published ? 'Photo hidden from the website.' : 'Photo is now live.', 'success');
    } catch {
      setImages((current) =>
        current.map((item) =>
          item.id === image.id ? { ...item, published: image.published } : item,
        ),
      );
      notify('Could not change that photo. Try again.', 'error');
    }
  };

  const persistOrder = async (ordered: GalleryImage[]) => {
    const previous = images;
    setImages(ordered);

    try {
      await api.gallery.reorder(ordered.map((image) => image.id));
    } catch {
      setImages(previous);
      notify('Could not save the new order.', 'error');
    }
  };

  const moveBy = (index: number, delta: number) => {
    const target = index + delta;
    if (target < 0 || target >= images.length) return;

    const next = [...images];
    const [moved] = next.splice(index, 1);
    next.splice(target, 0, moved!);
    void persistOrder(next);
  };

  return (
    <>
      <PageHeader
        title="Gallery"
        description="Photos in the campus gallery. Drag a card, or use the arrows, to change their order."
        action={
          <Button onClick={() => fileInput.current?.click()} loading={uploading}>
            <Upload className="h-3.5 w-3.5" aria-hidden />
            Add photos
          </Button>
        }
      />

      <Toolbar>
        <SearchInput
          value={search}
          onChange={(value) => {
            setSearch(value);
            setPage(1);
          }}
          placeholder="Search photo titles…"
          className="w-full sm:max-w-xs"
        />

        <Select
          value={category}
          onChange={(event) => {
            setCategory(event.target.value);
            setPage(1);
          }}
          aria-label="Filter by category"
          className="w-auto min-w-[10rem]"
        >
          <option value="">All categories</option>
          {CATEGORIES.map((option) => (
            <option key={option} value={option}>
              {option}
            </option>
          ))}
        </Select>

        <SegmentedControl<Visibility>
          label="Filter by visibility"
          value={visibility}
          onChange={(value) => {
            setVisibility(value);
            setPage(1);
          }}
          options={[
            { value: 'all', label: 'All' },
            { value: 'live', label: 'Live' },
            { value: 'hidden', label: 'Hidden' },
          ]}
        />
      </Toolbar>

      <input
        ref={fileInput}
        type="file"
        accept="image/jpeg,image/png,image/webp"
        multiple
        className="sr-only"
        onChange={(event) => void upload(Array.from(event.target.files ?? []))}
      />

      {/* Upload target. Category is chosen here rather than in the toolbar so
          it is unmistakably about what is being added, not what is shown. */}
      <div
        onDragOver={(event) => {
          event.preventDefault();
          setDragActive(true);
        }}
        onDragLeave={() => setDragActive(false)}
        onDrop={(event) => {
          event.preventDefault();
          setDragActive(false);
          void upload(Array.from(event.dataTransfer.files));
        }}
        className={`mb-4 flex flex-col items-center gap-2 rounded-lg border border-dashed px-6 py-6 text-center transition-colors sm:flex-row sm:justify-center sm:gap-4 ${
          dragActive
            ? 'border-[var(--orange)] bg-orange-50'
            : `${hairline} bg-white hover:border-slate-400`
        }`}
      >
        <Upload className="h-5 w-5 shrink-0 text-slate-400" aria-hidden />

        <div className="text-[13px] text-slate-600">
          Drop photos here, or{' '}
          <button
            type="button"
            onClick={() => fileInput.current?.click()}
            className={`rounded font-medium text-[var(--orange)] underline underline-offset-2 hover:text-[#d96a1c] ${focusRing}`}
          >
            browse your files
          </button>
          <span className="mt-0.5 block text-[11px] text-slate-400">
            JPEG, PNG or WebP · up to 8 MB each · 10 at a time
          </span>
        </div>

        <label className="flex items-center gap-2 text-[12px] text-slate-500">
          <span className="whitespace-nowrap">Add to</span>
          <Select
            value={uploadCategory}
            onChange={(event) => setUploadCategory(event.target.value)}
            aria-label="Category for new uploads"
            className="w-auto"
          >
            {CATEGORIES.map((option) => (
              <option key={option} value={option}>
                {option}
              </option>
            ))}
          </Select>
        </label>
      </div>

      {error && !loading ? (
        <ErrorState message={error} onRetry={load} />
      ) : loading ? (
        <Spinner label="Loading photos" />
      ) : images.length === 0 ? (
        <Panel>
          <EmptyState
            icon={<Images className="h-7 w-7" />}
            title={isFiltered ? 'Nothing matches' : 'No photos yet'}
            description={
              isFiltered
                ? 'No photos match the current search or filters.'
                : 'Add photos of the campus, workshops and students. They appear on the website gallery straight away.'
            }
            action={
              isFiltered ? (
                <Button
                  variant="secondary"
                  onClick={() => {
                    setSearch('');
                    setCategory('');
                    setVisibility('all');
                  }}
                >
                  Clear filters
                </Button>
              ) : (
                <Button onClick={() => fileInput.current?.click()}>
                  <Upload className="h-3.5 w-3.5" aria-hidden />
                  Add the first photo
                </Button>
              )
            }
          />
        </Panel>
      ) : (
        <Panel>
          <div className={`flex items-center justify-between border-b ${hairline} bg-slate-50/60 px-3 py-2`}>
            <p className="text-[12px] text-slate-500">
              {meta.total} photo{meta.total === 1 ? '' : 's'}
              {isFiltered ? ' matching' : ''}
            </p>
            {isFiltered && (
              <p className="text-[11px] text-slate-400">Reordering is disabled while filtering</p>
            )}
          </div>

          <ul className="grid grid-cols-2 gap-3 p-3 sm:grid-cols-3 lg:grid-cols-4">
            {images.map((image, index) => (
              <li
                key={image.id}
                draggable={!isFiltered}
                onDragStart={() => {
                  dragIndex.current = index;
                }}
                onDragOver={(event) => event.preventDefault()}
                onDrop={(event: DragEvent<HTMLLIElement>) => {
                  event.preventDefault();
                  const from = dragIndex.current;
                  dragIndex.current = null;
                  if (isFiltered || from === null || from === index) return;

                  const next = [...images];
                  const [moved] = next.splice(from, 1);
                  next.splice(index, 0, moved!);
                  void persistOrder(next);
                }}
                className={`group relative overflow-hidden rounded-lg border ${hairline} bg-white transition-shadow hover:shadow-sm`}
              >
                <div className="relative aspect-[4/3] bg-slate-100">
                  <img
                    src={image.thumbnailUrl ?? image.url}
                    alt={image.altText}
                    loading="lazy"
                    className={`h-full w-full object-cover transition-opacity ${
                      image.published ? '' : 'opacity-40'
                    }`}
                  />

                  {!image.published && (
                    <span className="absolute left-1.5 top-1.5">
                      <Badge tone="neutral">Hidden</Badge>
                    </span>
                  )}

                  {!isFiltered && (
                    <span
                      className="absolute right-1.5 top-1.5 cursor-grab rounded bg-white/90 p-1 text-slate-500 opacity-0 shadow-sm transition-opacity group-hover:opacity-100"
                      aria-hidden
                    >
                      <GripVertical className="h-3 w-3" />
                    </span>
                  )}
                </div>

                <div className="p-2.5">
                  <p className="truncate text-[13px] font-medium text-slate-900" title={image.title}>
                    {image.title}
                  </p>
                  <p className="mt-0.5 truncate text-[11px] tabular-nums text-slate-500">
                    {image.category} · {image.width}×{image.height} · {formatBytes(image.sizeBytes)}
                  </p>

                  <div className="mt-2 flex items-center gap-0.5">
                    <IconButton label="Edit details" onClick={() => setEditing(image)}>
                      <Pencil className="h-3.5 w-3.5" aria-hidden />
                    </IconButton>
                    <IconButton
                      label={image.published ? 'Hide from website' : 'Show on website'}
                      onClick={() => void togglePublished(image)}
                    >
                      {image.published ? (
                        <Eye className="h-3.5 w-3.5" aria-hidden />
                      ) : (
                        <EyeOff className="h-3.5 w-3.5" aria-hidden />
                      )}
                    </IconButton>
                    <IconButton label="Delete photo" tone="danger" onClick={() => setDeleting(image)}>
                      <Trash2 className="h-3.5 w-3.5" aria-hidden />
                    </IconButton>

                    {/* Dragging is unusable with a keyboard, so ordering also
                        has explicit buttons. */}
                    <span className="ml-auto flex">
                      <IconButton
                        label={`Move ${image.title} earlier`}
                        disabled={isFiltered || index === 0}
                        onClick={() => moveBy(index, -1)}
                      >
                        <ChevronLeft className="h-3.5 w-3.5" aria-hidden />
                      </IconButton>
                      <IconButton
                        label={`Move ${image.title} later`}
                        disabled={isFiltered || index === images.length - 1}
                        onClick={() => moveBy(index, 1)}
                      >
                        <ChevronRight className="h-3.5 w-3.5" aria-hidden />
                      </IconButton>
                    </span>
                  </div>
                </div>
              </li>
            ))}
          </ul>

          <Pagination
            page={page}
            totalPages={meta.totalPages}
            total={meta.total}
            onChange={setPage}
          />
        </Panel>
      )}

      <EditImageModal
        image={editing}
        onClose={() => setEditing(null)}
        onSaved={(updated) => {
          setImages((current) =>
            current.map((item) => (item.id === updated.id ? { ...item, ...updated } : item)),
          );
          setEditing(null);
          notify('Photo updated.', 'success');
        }}
      />

      <ConfirmDialog
        open={Boolean(deleting)}
        onClose={() => setDeleting(null)}
        onConfirm={async () => {
          if (!deleting) return;
          try {
            await api.gallery.remove(deleting.id);
            notify('Photo deleted.', 'success');
            await load();
          } catch {
            notify('Could not delete that photo.', 'error');
          }
          setDeleting(null);
        }}
        title="Delete this photo?"
        itemName={deleting?.title}
        consequence="will be removed from the website and the file deleted. This cannot be undone."
        confirmLabel="Delete photo"
      />
    </>
  );
}

function EditImageModal({
  image,
  onClose,
  onSaved,
}: {
  image: GalleryImage | null;
  onClose: () => void;
  onSaved: (image: GalleryImage) => void;
}) {
  const [form, setForm] = useState({ title: '', caption: '', altText: '', category: '' });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (image) {
      setForm({
        title: image.title,
        caption: image.caption ?? '',
        altText: image.altText,
        category: image.category,
      });
      setErrors({});
    }
  }, [image]);

  if (!image) return null;

  const save = async () => {
    setSaving(true);
    setErrors({});

    try {
      const updated = await api.gallery.update(image.id, {
        title: form.title,
        caption: form.caption || null,
        altText: form.altText,
        category: form.category,
      });
      onSaved(updated);
    } catch (caught) {
      if (caught instanceof ApiError) setErrors(caught.fields ?? { title: caught.message });
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal
      open
      onClose={onClose}
      title="Photo details"
      wide
      footer={
        <>
          <Button variant="ghost" onClick={onClose}>
            Cancel
          </Button>
          <Button onClick={() => void save()} loading={saving}>
            Save changes
          </Button>
        </>
      }
    >
      <div className={`mb-4 overflow-hidden rounded-lg border ${hairline} bg-slate-50`}>
        <img
          src={image.thumbnailUrl ?? image.url}
          alt={image.altText}
          className="max-h-52 w-full object-contain"
        />
      </div>

      <div className="space-y-4">
        <Field label="Title" error={errors.title} required>
          <input
            value={form.title}
            onChange={(event) => setForm({ ...form, title: event.target.value })}
            className={inputClass}
          />
        </Field>

        <Field
          label="Alt text"
          error={errors.altText}
          help="Describes the photo for visitors using a screen reader."
          required
        >
          <input
            value={form.altText}
            onChange={(event) => setForm({ ...form, altText: event.target.value })}
            className={inputClass}
            placeholder="Students welding a steel frame in the workshop"
          />
        </Field>

        <Field label="Caption" hint="Optional" error={errors.caption}>
          <input
            value={form.caption}
            onChange={(event) => setForm({ ...form, caption: event.target.value })}
            className={inputClass}
          />
        </Field>

        <Field label="Category" error={errors.category}>
          <Select
            value={form.category}
            onChange={(event) => setForm({ ...form, category: event.target.value })}
          >
            {[...new Set([...CATEGORIES, form.category])].map((option) => (
              <option key={option} value={option}>
                {option}
              </option>
            ))}
          </Select>
        </Field>
      </div>
    </Modal>
  );
}
