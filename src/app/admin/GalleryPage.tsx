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
  Button,
  EmptyState,
  ErrorState,
  Field,
  Modal,
  Spinner,
  focusRing,
  formatBytes,
  inputClass,
} from './ui';

const CATEGORIES = ['Campus', 'Workshop', 'Students', 'Events', 'Facilities'];

export function GalleryPage() {
  const { notify } = useToast();

  const [images, setImages] = useState<GalleryImage[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [dragActive, setDragActive] = useState(false);
  const [editing, setEditing] = useState<GalleryImage | null>(null);
  const [deleting, setDeleting] = useState<GalleryImage | null>(null);
  const [category, setCategory] = useState(CATEGORIES[0]);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal] = useState(0);

  const fileInput = useRef<HTMLInputElement>(null);
  const dragIndex = useRef<number | null>(null);

  const load = useCallback(async (targetPage: number) => {
    setLoading(true);
    setError(null);
    try {
      const result = await api.gallery.listAdmin(`?page=${targetPage}&limit=48`);
      setImages(result.data);
      setTotalPages(result.meta.totalPages);
      setTotal(result.meta.total);
    } catch (caught) {
      setError(caught instanceof ApiError ? caught.message : 'Could not reach the server.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    document.title = 'Gallery · ADEF Admin';
    void load(page);
  }, [load, page]);

  const upload = async (files: File[]) => {
    if (files.length === 0) return;

    setUploading(true);
    try {
      const result = await api.gallery.upload(files, { category });

      if (result.created.length > 0) {
        notify(
          result.created.length === 1
            ? 'Photo added.'
            : `${result.created.length} photos added.`,
          'success',
        );
      }

      // Rejected files are named individually — telling someone "some files
      // failed" without saying which ones is useless.
      result.failed.forEach((failure) =>
        notify(`${failure.filename} — ${failure.reason}`, 'error'),
      );

      setPage(1);
      await load(1);
    } catch (caught) {
      const message =
        caught instanceof ApiError
          ? (caught.fields?.files ?? caught.message)
          : 'The upload failed.';
      notify(message, 'error');
    } finally {
      setUploading(false);
      if (fileInput.current) fileInput.current.value = '';
    }
  };

  const handleDrop = (event: DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    setDragActive(false);
    void upload(Array.from(event.dataTransfer.files));
  };

  const togglePublished = async (image: GalleryImage) => {
    // Optimistic: the switch should feel instant. Reverted below if it fails.
    setImages((current) =>
      current.map((item) =>
        item.id === image.id ? { ...item, published: !item.published } : item,
      ),
    );

    try {
      await api.gallery.update(image.id, { published: !image.published });
      notify(image.published ? 'Photo hidden from the website.' : 'Photo is now live.', 'success');
    } catch {
      setImages((current) =>
        current.map((item) => (item.id === image.id ? { ...item, published: image.published } : item)),
      );
      notify('Could not change that photo. Try again.', 'error');
    }
  };

  const confirmDelete = async () => {
    if (!deleting) return;

    try {
      await api.gallery.remove(deleting.id);
      notify('Photo deleted.', 'success');
      setDeleting(null);
      await load(page);
    } catch {
      notify('Could not delete that photo.', 'error');
    }
  };

  /** Persists the current on-screen order. */
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
        description={
          total > 0
            ? `${total} photo${total === 1 ? '' : 's'}. Drag to reorder — the website shows them in this order.`
            : 'Photos shown on the website gallery.'
        }
        action={
          <Button onClick={() => fileInput.current?.click()} loading={uploading}>
            <Upload className="h-4 w-4" aria-hidden />
            Add photos
          </Button>
        }
      />

      <div className="mb-5 flex flex-col gap-3 sm:flex-row sm:items-end">
        <div className="sm:w-56">
          <Field label="Category for new uploads">
            <select
              value={category}
              onChange={(event) => setCategory(event.target.value)}
              className={inputClass}
            >
              {CATEGORIES.map((option) => (
                <option key={option} value={option}>
                  {option}
                </option>
              ))}
            </select>
          </Field>
        </div>
      </div>

      <input
        ref={fileInput}
        type="file"
        accept="image/jpeg,image/png,image/webp"
        multiple
        className="sr-only"
        onChange={(event) => void upload(Array.from(event.target.files ?? []))}
      />

      <div
        onDragOver={(event) => {
          event.preventDefault();
          setDragActive(true);
        }}
        onDragLeave={() => setDragActive(false)}
        onDrop={handleDrop}
        className={`mb-6 rounded-xl border-2 border-dashed px-6 py-8 text-center transition-colors ${
          dragActive
            ? 'border-[var(--orange)] bg-orange-50'
            : 'border-slate-300 bg-white hover:border-slate-400'
        }`}
      >
        <Upload className="mx-auto mb-2 h-6 w-6 text-slate-400" aria-hidden />
        <p className="text-sm font-medium text-slate-700">
          Drop photos here, or{' '}
          <button
            type="button"
            onClick={() => fileInput.current?.click()}
            className={`rounded text-[var(--orange)] underline underline-offset-2 hover:text-[#d4551f] ${focusRing}`}
          >
            browse your files
          </button>
        </p>
        <p className="mt-1 text-xs text-slate-500">
          JPEG, PNG or WebP · up to 8 MB each · 10 at a time
        </p>
      </div>

      {loading && <Spinner label="Loading photos" />}
      {error && !loading && <ErrorState message={error} onRetry={() => void load(page)} />}

      {!loading && !error && images.length === 0 && (
        <EmptyState
          icon={<Images className="h-8 w-8" />}
          title="No photos yet"
          description="Add photos of the campus, workshops and students. They appear on the website gallery straight away."
          action={
            <Button onClick={() => fileInput.current?.click()}>
              <Upload className="h-4 w-4" aria-hidden />
              Add the first photo
            </Button>
          }
        />
      )}

      {!loading && !error && images.length > 0 && (
        <>
          <ul className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
            {images.map((image, index) => (
              <li
                key={image.id}
                draggable
                onDragStart={() => {
                  dragIndex.current = index;
                }}
                onDragOver={(event) => event.preventDefault()}
                onDrop={(event) => {
                  event.preventDefault();
                  const from = dragIndex.current;
                  dragIndex.current = null;
                  if (from === null || from === index) return;

                  const next = [...images];
                  const [moved] = next.splice(from, 1);
                  next.splice(index, 0, moved!);
                  void persistOrder(next);
                }}
                className="group relative overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm transition-shadow hover:shadow-md"
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
                    <span className="absolute left-2 top-2 rounded-md bg-slate-900/80 px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-white">
                      Hidden
                    </span>
                  )}

                  <span
                    className="absolute right-2 top-2 cursor-grab rounded-md bg-white/90 p-1 text-slate-500 opacity-0 shadow-sm transition-opacity group-hover:opacity-100"
                    aria-hidden
                  >
                    <GripVertical className="h-3.5 w-3.5" />
                  </span>
                </div>

                <div className="p-3">
                  <p className="truncate text-sm font-medium text-[var(--navy)]" title={image.title}>
                    {image.title}
                  </p>
                  <p className="mt-0.5 text-xs text-slate-500">
                    {image.category} · {image.width}×{image.height} · {formatBytes(image.sizeBytes)}
                  </p>

                  <div className="mt-2.5 flex items-center gap-1">
                    <IconButton label="Edit details" onClick={() => setEditing(image)}>
                      <Pencil className="h-3.5 w-3.5" />
                    </IconButton>
                    <IconButton
                      label={image.published ? 'Hide from website' : 'Show on website'}
                      onClick={() => void togglePublished(image)}
                    >
                      {image.published ? (
                        <Eye className="h-3.5 w-3.5" />
                      ) : (
                        <EyeOff className="h-3.5 w-3.5" />
                      )}
                    </IconButton>
                    <IconButton label="Delete photo" danger onClick={() => setDeleting(image)}>
                      <Trash2 className="h-3.5 w-3.5" />
                    </IconButton>

                    {/* Dragging is unusable with a keyboard, so ordering also
                        has explicit buttons. */}
                    <span className="ml-auto flex gap-0.5">
                      <IconButton
                        label={`Move ${image.title} earlier`}
                        disabled={index === 0}
                        onClick={() => moveBy(index, -1)}
                      >
                        <ChevronLeft className="h-3.5 w-3.5" />
                      </IconButton>
                      <IconButton
                        label={`Move ${image.title} later`}
                        disabled={index === images.length - 1}
                        onClick={() => moveBy(index, 1)}
                      >
                        <ChevronRight className="h-3.5 w-3.5" />
                      </IconButton>
                    </span>
                  </div>
                </div>
              </li>
            ))}
          </ul>

          {totalPages > 1 && (
            <nav className="mt-6 flex items-center justify-center gap-3" aria-label="Pagination">
              <Button
                variant="secondary"
                size="sm"
                disabled={page === 1}
                onClick={() => setPage((value) => value - 1)}
              >
                Previous
              </Button>
              <span className="text-sm tabular-nums text-slate-600">
                Page {page} of {totalPages}
              </span>
              <Button
                variant="secondary"
                size="sm"
                disabled={page === totalPages}
                onClick={() => setPage((value) => value + 1)}
              >
                Next
              </Button>
            </nav>
          )}
        </>
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

      <Modal open={Boolean(deleting)} onClose={() => setDeleting(null)} title="Delete this photo?">
        <p className="text-sm text-slate-600">
          <strong className="text-[var(--navy)]">{deleting?.title}</strong> will be removed from the
          website and the file deleted. This cannot be undone.
        </p>
        <div className="mt-6 flex justify-end gap-2">
          <Button variant="secondary" onClick={() => setDeleting(null)}>
            Keep it
          </Button>
          <Button variant="danger" onClick={() => void confirmDelete()}>
            <Trash2 className="h-4 w-4" aria-hidden />
            Delete photo
          </Button>
        </div>
      </Modal>
    </>
  );
}

function IconButton({
  children,
  label,
  danger = false,
  ...props
}: { label: string; danger?: boolean } & React.ButtonHTMLAttributes<HTMLButtonElement>) {
  return (
    <button
      {...props}
      type="button"
      title={label}
      aria-label={label}
      className={`rounded-md p-1.5 transition-colors disabled:cursor-not-allowed disabled:opacity-30 ${focusRing} ${
        danger
          ? 'text-slate-500 hover:bg-red-50 hover:text-red-600'
          : 'text-slate-500 hover:bg-slate-100 hover:text-[var(--navy)]'
      }`}
    >
      {children}
    </button>
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
    <Modal open onClose={onClose} title="Photo details">
      <div className="mb-5 overflow-hidden rounded-lg bg-slate-100">
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
          hint="Required"
          error={errors.altText}
          required
        >
          <input
            value={form.altText}
            onChange={(event) => setForm({ ...form, altText: event.target.value })}
            className={inputClass}
            placeholder="Students welding a steel frame in the workshop"
          />
          <span className="mt-1 block text-xs text-slate-500">
            Describes the photo for visitors using a screen reader.
          </span>
        </Field>

        <Field label="Caption" hint="Optional" error={errors.caption}>
          <input
            value={form.caption}
            onChange={(event) => setForm({ ...form, caption: event.target.value })}
            className={inputClass}
          />
        </Field>

        <Field label="Category" error={errors.category}>
          <select
            value={form.category}
            onChange={(event) => setForm({ ...form, category: event.target.value })}
            className={inputClass}
          >
            {[...new Set([...CATEGORIES, form.category])].map((option) => (
              <option key={option} value={option}>
                {option}
              </option>
            ))}
          </select>
        </Field>
      </div>

      <div className="mt-6 flex justify-end gap-2">
        <Button variant="secondary" onClick={onClose}>
          Cancel
        </Button>
        <Button onClick={() => void save()} loading={saving}>
          Save changes
        </Button>
      </div>
    </Modal>
  );
}
