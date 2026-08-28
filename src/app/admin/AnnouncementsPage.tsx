import { useCallback, useEffect, useRef, useState } from 'react';
import { useSearchParams } from 'react-router';
import {
  FileText,
  Megaphone,
  Paperclip,
  Pencil,
  Pin,
  Plus,
  Trash2,
  Upload,
  X,
} from 'lucide-react';
import {
  api,
  ApiError,
  type Announcement,
  type AnnouncementStatus,
  type AnnouncementType,
} from '../lib/api';
import { PageHeader } from './AdminLayout';
import { useToast } from './admin-context';
import {
  Button,
  EmptyState,
  ErrorState,
  Field,
  Modal,
  Spinner,
  StatusPill,
  focusRing,
  formatBytes,
  formatDate,
  inputClass,
} from './ui';

const TYPES: { value: AnnouncementType; label: string }[] = [
  { value: 'NEWS', label: 'News' },
  { value: 'EVENT', label: 'Event' },
  { value: 'NOTICE', label: 'Notice' },
];

export function AnnouncementsPage() {
  const { notify } = useToast();
  const [searchParams, setSearchParams] = useSearchParams();

  const [items, setItems] = useState<Announcement[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [editing, setEditing] = useState<Announcement | 'new' | null>(null);
  const [deleting, setDeleting] = useState<Announcement | null>(null);

  const statusFilter = searchParams.get('status') ?? '';

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const query = statusFilter ? `?status=${statusFilter}&limit=50` : '?limit=50';
      const result = await api.announcements.listAdmin(query);
      setItems(result.data);
    } catch (caught) {
      setError(caught instanceof ApiError ? caught.message : 'Could not reach the server.');
    } finally {
      setLoading(false);
    }
  }, [statusFilter]);

  useEffect(() => {
    document.title = 'Announcements · ADEF Admin';
    void load();
  }, [load]);

  // Deep link from the overview's "Write an announcement" action.
  useEffect(() => {
    if (searchParams.get('new') === '1') {
      setEditing('new');
      searchParams.delete('new');
      setSearchParams(searchParams, { replace: true });
    }
  }, [searchParams, setSearchParams]);

  const togglePin = async (item: Announcement) => {
    try {
      await api.announcements.update(item.id, { pinned: !item.pinned });
      notify(item.pinned ? 'Unpinned.' : 'Pinned to the top.', 'success');
      await load();
    } catch {
      notify('Could not change that announcement.', 'error');
    }
  };

  const setStatus = async (item: Announcement, status: AnnouncementStatus) => {
    try {
      await api.announcements.update(item.id, { status });
      notify(
        status === 'PUBLISHED'
          ? 'Published — it is now on the website.'
          : 'Moved back to draft and removed from the website.',
        'success',
      );
      await load();
    } catch {
      notify('Could not change that announcement.', 'error');
    }
  };

  const confirmDelete = async () => {
    if (!deleting) return;
    try {
      await api.announcements.remove(deleting.id);
      notify('Announcement deleted.', 'success');
      setDeleting(null);
      await load();
    } catch {
      notify('Could not delete that announcement.', 'error');
    }
  };

  return (
    <>
      <PageHeader
        title="Announcements"
        description="Post news, events and notices. Attach PDFs such as timetables or forms."
        action={
          <Button onClick={() => setEditing('new')}>
            <Plus className="h-4 w-4" aria-hidden />
            New announcement
          </Button>
        }
      />

      <div className="mb-5 flex flex-wrap gap-2" role="group" aria-label="Filter by status">
        {[
          { value: '', label: 'All' },
          { value: 'PUBLISHED', label: 'Published' },
          { value: 'DRAFT', label: 'Drafts' },
        ].map((option) => (
          <button
            key={option.value}
            type="button"
            aria-pressed={statusFilter === option.value}
            onClick={() => {
              if (option.value) searchParams.set('status', option.value);
              else searchParams.delete('status');
              setSearchParams(searchParams, { replace: true });
            }}
            className={`rounded-lg px-3 py-1.5 text-sm font-medium transition-colors ${focusRing} ${
              statusFilter === option.value
                ? 'bg-[var(--navy)] text-white'
                : 'bg-white text-slate-600 ring-1 ring-slate-300 hover:bg-slate-50'
            }`}
          >
            {option.label}
          </button>
        ))}
      </div>

      {loading && <Spinner label="Loading announcements" />}
      {error && !loading && <ErrorState message={error} onRetry={load} />}

      {!loading && !error && items.length === 0 && (
        <EmptyState
          icon={<Megaphone className="h-8 w-8" />}
          title={statusFilter ? 'Nothing here' : 'No announcements yet'}
          description={
            statusFilter
              ? 'Try a different filter.'
              : 'Write your first announcement. It stays a draft until you publish it, so nothing goes live by accident.'
          }
          action={
            !statusFilter && (
              <Button onClick={() => setEditing('new')}>
                <Plus className="h-4 w-4" aria-hidden />
                Write the first one
              </Button>
            )
          }
        />
      )}

      {!loading && !error && items.length > 0 && (
        <ul className="space-y-3">
          {items.map((item) => (
            <li
              key={item.id}
              className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm transition-shadow hover:shadow-md sm:p-5"
            >
              <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                <div className="min-w-0 flex-1">
                  <div className="mb-1.5 flex flex-wrap items-center gap-2">
                    <StatusPill status={item.status} />
                    <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[11px] font-medium uppercase tracking-wide text-slate-600">
                      {item.type.toLowerCase()}
                    </span>
                    {item.pinned && (
                      <span className="inline-flex items-center gap-1 rounded-full bg-[var(--gold)]/15 px-2 py-0.5 text-[11px] font-medium text-[#8a5d2c]">
                        <Pin className="h-3 w-3" aria-hidden />
                        Pinned
                      </span>
                    )}
                  </div>

                  <h2 className="truncate text-base font-semibold text-[var(--navy)]">
                    {item.title}
                  </h2>

                  {item.excerpt && (
                    <p className="mt-1 line-clamp-2 text-sm text-slate-600">{item.excerpt}</p>
                  )}

                  <p className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-slate-500">
                    <span>
                      {item.status === 'PUBLISHED'
                        ? `Published ${formatDate(item.publishedAt)}`
                        : `Edited ${formatDate(item.updatedAt)}`}
                    </span>
                    {item.author && <span>by {item.author.name}</span>}
                    {item.attachments.length > 0 && (
                      <span className="inline-flex items-center gap-1">
                        <Paperclip className="h-3 w-3" aria-hidden />
                        {item.attachments.length} PDF
                        {item.attachments.length === 1 ? '' : 's'}
                      </span>
                    )}
                  </p>
                </div>

                <div className="flex shrink-0 flex-wrap items-center gap-2">
                  <Button
                    size="sm"
                    variant={item.status === 'PUBLISHED' ? 'secondary' : 'primary'}
                    onClick={() =>
                      void setStatus(item, item.status === 'PUBLISHED' ? 'DRAFT' : 'PUBLISHED')
                    }
                  >
                    {item.status === 'PUBLISHED' ? 'Unpublish' : 'Publish'}
                  </Button>
                  <Button size="sm" variant="ghost" onClick={() => void togglePin(item)}>
                    <Pin className="h-3.5 w-3.5" aria-hidden />
                    <span className="sr-only sm:not-sr-only">
                      {item.pinned ? 'Unpin' : 'Pin'}
                    </span>
                  </Button>
                  <Button size="sm" variant="ghost" onClick={() => setEditing(item)}>
                    <Pencil className="h-3.5 w-3.5" aria-hidden />
                    <span className="sr-only sm:not-sr-only">Edit</span>
                  </Button>
                  <Button size="sm" variant="ghost" onClick={() => setDeleting(item)}>
                    <Trash2 className="h-3.5 w-3.5 text-red-600" aria-hidden />
                    <span className="sr-only">Delete</span>
                  </Button>
                </div>
              </div>
            </li>
          ))}
        </ul>
      )}

      {editing && (
        <EditorModal
          announcement={editing === 'new' ? null : editing}
          onClose={() => setEditing(null)}
          onSaved={async () => {
            setEditing(null);
            await load();
          }}
        />
      )}

      <Modal
        open={Boolean(deleting)}
        onClose={() => setDeleting(null)}
        title="Delete this announcement?"
      >
        <p className="text-sm text-slate-600">
          <strong className="text-[var(--navy)]">{deleting?.title}</strong> and any PDFs attached to
          it will be permanently removed. This cannot be undone.
        </p>
        <div className="mt-6 flex justify-end gap-2">
          <Button variant="secondary" onClick={() => setDeleting(null)}>
            Keep it
          </Button>
          <Button variant="danger" onClick={() => void confirmDelete()}>
            <Trash2 className="h-4 w-4" aria-hidden />
            Delete
          </Button>
        </div>
      </Modal>
    </>
  );
}

function EditorModal({
  announcement,
  onClose,
  onSaved,
}: {
  announcement: Announcement | null;
  onClose: () => void;
  onSaved: () => void | Promise<void>;
}) {
  const { notify } = useToast();
  const fileInput = useRef<HTMLInputElement>(null);

  const [form, setForm] = useState({
    title: announcement?.title ?? '',
    body: htmlToPlain(announcement?.body ?? ''),
    type: announcement?.type ?? ('NEWS' as AnnouncementType),
    pinned: announcement?.pinned ?? false,
  });
  const [attachments, setAttachments] = useState(announcement?.attachments ?? []);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);

  const save = async (status: AnnouncementStatus) => {
    setSaving(true);
    setErrors({});

    try {
      const payload = {
        title: form.title,
        body: plainToHtml(form.body),
        type: form.type,
        pinned: form.pinned,
        status,
      };

      if (announcement) {
        await api.announcements.update(announcement.id, payload);
        notify(status === 'PUBLISHED' ? 'Published.' : 'Draft saved.', 'success');
      } else {
        const saved = await api.announcements.create(payload);
        notify(status === 'PUBLISHED' ? 'Published.' : 'Draft saved.', 'success');
        // A new announcement has no id until now, so any PDFs the user picked
        // are attached immediately after it exists.
        if (pendingFiles.current.length > 0) {
          await api.announcements.attach(saved.id, pendingFiles.current);
          pendingFiles.current = [];
        }
      }

      await onSaved();
    } catch (caught) {
      if (caught instanceof ApiError) {
        setErrors(caught.fields ?? { title: caught.message });
      } else {
        notify('Could not save. Check your connection.', 'error');
      }
    } finally {
      setSaving(false);
    }
  };

  const pendingFiles = useRef<File[]>([]);

  const attachFiles = async (files: File[]) => {
    if (files.length === 0) return;

    // Not saved yet: hold the files until the announcement has an id.
    if (!announcement) {
      pendingFiles.current = [...pendingFiles.current, ...files];
      notify(
        `${files.length} PDF${files.length === 1 ? '' : 's'} will be attached when you save.`,
        'info',
      );
      return;
    }

    setUploading(true);
    try {
      const result = await api.announcements.attach(announcement.id, files);
      setAttachments((current) => [...current, ...result.created]);
      result.failed.forEach((failure) =>
        notify(`${failure.filename} — ${failure.reason}`, 'error'),
      );
      if (result.created.length > 0) notify('Document attached.', 'success');
    } catch (caught) {
      notify(
        caught instanceof ApiError
          ? (caught.fields?.documents ?? caught.message)
          : 'The upload failed.',
        'error',
      );
    } finally {
      setUploading(false);
      if (fileInput.current) fileInput.current.value = '';
    }
  };

  const detach = async (id: string) => {
    try {
      await api.announcements.detach(id);
      setAttachments((current) => current.filter((item) => item.id !== id));
      notify('Document removed.', 'success');
    } catch {
      notify('Could not remove that document.', 'error');
    }
  };

  return (
    <Modal
      open
      onClose={onClose}
      wide
      title={announcement ? 'Edit announcement' : 'New announcement'}
    >
      <div className="space-y-4">
        <Field label="Title" error={errors.title} required>
          <input
            value={form.title}
            onChange={(event) => setForm({ ...form, title: event.target.value })}
            className={inputClass}
            placeholder="Term 3 registration is now open"
            autoFocus
          />
        </Field>

        <Field
          label="Announcement"
          hint="Blank lines start a new paragraph"
          error={errors.body}
          required
        >
          <textarea
            value={form.body}
            onChange={(event) => setForm({ ...form, body: event.target.value })}
            rows={10}
            className={`${inputClass} resize-y font-normal leading-relaxed`}
            placeholder={'Registration for Term 3 closes on 15 September.\n\nBring your national ID and last term’s report to the front office.'}
          />
        </Field>

        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Type">
            <select
              value={form.type}
              onChange={(event) =>
                setForm({ ...form, type: event.target.value as AnnouncementType })
              }
              className={inputClass}
            >
              {TYPES.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </Field>

          <div className="flex items-end pb-1">
            <label className="flex cursor-pointer items-center gap-2.5 text-sm text-slate-700">
              <input
                type="checkbox"
                checked={form.pinned}
                onChange={(event) => setForm({ ...form, pinned: event.target.checked })}
                className="h-4 w-4 rounded border-slate-300 text-[var(--orange)] focus:ring-[var(--gold)]"
              />
              Pin to the top of the list
            </label>
          </div>
        </div>

        <div>
          <span className="mb-1.5 block text-sm font-medium text-slate-700">
            Attached documents
          </span>

          <input
            ref={fileInput}
            type="file"
            accept="application/pdf"
            multiple
            className="sr-only"
            onChange={(event) => void attachFiles(Array.from(event.target.files ?? []))}
          />

          {attachments.length > 0 && (
            <ul className="mb-2 space-y-1.5">
              {attachments.map((file) => (
                <li
                  key={file.id}
                  className="flex items-center gap-2.5 rounded-lg border border-slate-200 bg-slate-50 px-3 py-2"
                >
                  <FileText className="h-4 w-4 shrink-0 text-slate-400" aria-hidden />
                  <span className="min-w-0 flex-1 truncate text-sm text-slate-700">
                    {file.filename}
                  </span>
                  <span className="shrink-0 text-xs tabular-nums text-slate-500">
                    {formatBytes(file.sizeBytes)}
                  </span>
                  <button
                    type="button"
                    onClick={() => void detach(file.id)}
                    aria-label={`Remove ${file.filename}`}
                    className={`shrink-0 rounded p-1 text-slate-400 hover:bg-red-50 hover:text-red-600 ${focusRing}`}
                  >
                    <X className="h-3.5 w-3.5" aria-hidden />
                  </button>
                </li>
              ))}
            </ul>
          )}

          <Button
            variant="secondary"
            size="sm"
            loading={uploading}
            onClick={() => fileInput.current?.click()}
          >
            <Upload className="h-3.5 w-3.5" aria-hidden />
            Attach a PDF
          </Button>
          <span className="ml-2 text-xs text-slate-500">PDF only · up to 15 MB</span>
        </div>
      </div>

      {/* Sticky, like the dialog header: on a short screen the publish button
          would otherwise sit below the fold behind a scroll nobody expects. */}
      <div className="sticky bottom-0 -mx-5 mt-7 flex flex-col-reverse gap-2 border-t border-slate-200 bg-white/95 px-5 py-4 backdrop-blur sm:flex-row sm:justify-end">
        <Button variant="ghost" onClick={onClose}>
          Cancel
        </Button>
        <Button variant="secondary" onClick={() => void save('DRAFT')} loading={saving}>
          Save as draft
        </Button>
        <Button onClick={() => void save('PUBLISHED')} loading={saving}>
          Publish to the website
        </Button>
      </div>
    </Modal>
  );
}

/**
 * The editor is a plain textarea, so paragraphs are round-tripped rather than
 * asking staff to write HTML. The API sanitises whatever arrives regardless.
 */
function plainToHtml(text: string): string {
  return text
    .split(/\n{2,}/)
    .map((paragraph) => paragraph.trim())
    .filter(Boolean)
    .map((paragraph) => `<p>${escapeHtml(paragraph).replace(/\n/g, '<br />')}</p>`)
    .join('');
}

function htmlToPlain(html: string): string {
  return html
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/<\/p>\s*<p>/gi, '\n\n')
    .replace(/<\/?[^>]+>/g, '')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .trim();
}

function escapeHtml(text: string): string {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}
