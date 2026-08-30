import { useCallback, useEffect, useRef, useState } from 'react';
import { useSearchParams } from 'react-router';
import {
  FileText,
  Megaphone,
  Paperclip,
  Pencil,
  Pin,
  PinOff,
  Plus,
  Send,
  Trash2,
  Undo2,
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
  Badge,
  Button,
  ConfirmDialog,
  DropdownMenu,
  EmptyState,
  ErrorState,
  Field,
  IconButton,
  MenuItem,
  MenuSeparator,
  Modal,
  Panel,
  RowActions,
  SearchInput,
  SegmentedControl,
  Select,
  StatusPill,
  Switch,
  TBody,
  TD,
  TH,
  THead,
  TR,
  Table,
  TableSkeleton,
  Toolbar,
  focusRing,
  formatBytes,
  formatDate,
  hairline,
  inputClass,
} from './ui';

const TYPES: { value: AnnouncementType; label: string }[] = [
  { value: 'NEWS', label: 'News' },
  { value: 'EVENT', label: 'Event' },
  { value: 'NOTICE', label: 'Notice' },
];

const TYPE_TONE: Record<AnnouncementType, 'info' | 'warning' | 'neutral'> = {
  NEWS: 'info',
  EVENT: 'warning',
  NOTICE: 'neutral',
};

type StatusFilter = '' | AnnouncementStatus;

export function AnnouncementsPage() {
  const { notify } = useToast();
  const [searchParams, setSearchParams] = useSearchParams();

  const [items, setItems] = useState<Announcement[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [editing, setEditing] = useState<Announcement | 'new' | null>(null);
  const [deleting, setDeleting] = useState<Announcement | null>(null);

  const [search, setSearch] = useState('');
  const [type, setType] = useState<'' | AnnouncementType>('');

  // The status filter lives in the URL so the overview's "Review drafts" card
  // can link straight to it, and so a filtered view can be shared or bookmarked.
  const statusFilter = (searchParams.get('status') ?? '') as StatusFilter;

  const setStatusFilter = (next: StatusFilter) => {
    if (next) searchParams.set('status', next);
    else searchParams.delete('status');
    setSearchParams(searchParams, { replace: true });
  };

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);

    const params = new URLSearchParams({ limit: '50' });
    if (statusFilter) params.set('status', statusFilter);
    if (type) params.set('type', type);
    if (search.trim()) params.set('search', search.trim());

    try {
      const result = await api.announcements.listAdmin(`?${params.toString()}`);
      setItems(result.data);
    } catch (caught) {
      setError(caught instanceof ApiError ? caught.message : 'Could not reach the server.');
    } finally {
      setLoading(false);
    }
  }, [search, statusFilter, type]);

  useEffect(() => {
    document.title = 'Announcements · ADEF Admin';
  }, []);

  useEffect(() => {
    const timer = window.setTimeout(() => void load(), search ? 300 : 0);
    return () => window.clearTimeout(timer);
  }, [load, search]);

  // Deep link from the overview's "Write an announcement" action.
  useEffect(() => {
    if (searchParams.get('new') === '1') {
      setEditing('new');
      searchParams.delete('new');
      setSearchParams(searchParams, { replace: true });
    }
  }, [searchParams, setSearchParams]);

  const counts = {
    all: items.length,
    published: items.filter((item) => item.status === 'PUBLISHED').length,
    drafts: items.filter((item) => item.status === 'DRAFT').length,
  };

  const patch = async (item: Announcement, changes: Partial<Announcement>, message: string) => {
    try {
      await api.announcements.update(item.id, changes);
      notify(message, 'success');
      await load();
    } catch {
      notify('Could not change that announcement.', 'error');
    }
  };

  const isFiltered = Boolean(statusFilter || type || search.trim());

  return (
    <>
      <PageHeader
        title="Announcements"
        description="News, events and notices. Attach PDFs such as timetables or forms."
        action={
          <Button onClick={() => setEditing('new')}>
            <Plus className="h-3.5 w-3.5" aria-hidden />
            New announcement
          </Button>
        }
      />

      <Toolbar>
        <SearchInput
          value={search}
          onChange={setSearch}
          placeholder="Search titles…"
          className="w-full sm:max-w-xs"
        />

        <SegmentedControl<StatusFilter>
          label="Filter by status"
          value={statusFilter}
          onChange={setStatusFilter}
          options={[
            { value: '', label: 'All', count: statusFilter === '' ? counts.all : undefined },
            {
              value: 'PUBLISHED',
              label: 'Published',
              count: statusFilter === '' ? counts.published : undefined,
            },
            {
              value: 'DRAFT',
              label: 'Drafts',
              count: statusFilter === '' ? counts.drafts : undefined,
            },
          ]}
        />

        <Select
          value={type}
          onChange={(event) => setType(event.target.value as '' | AnnouncementType)}
          aria-label="Filter by type"
          className="w-auto min-w-[9rem]"
        >
          <option value="">All types</option>
          {TYPES.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </Select>
      </Toolbar>

      {error && !loading ? (
        <ErrorState message={error} onRetry={load} />
      ) : (
        <Panel>
          {loading ? (
            <Table>
              <TableSkeleton rows={5} columns={5} />
            </Table>
          ) : items.length === 0 ? (
            <EmptyState
              icon={<Megaphone className="h-7 w-7" />}
              title={isFiltered ? 'Nothing matches' : 'No announcements yet'}
              description={
                isFiltered
                  ? 'No announcements match the current search or filters.'
                  : 'Write your first announcement. It stays a draft until you publish it, so nothing goes live by accident.'
              }
              action={
                isFiltered ? (
                  <Button
                    variant="secondary"
                    onClick={() => {
                      setSearch('');
                      setType('');
                      setStatusFilter('');
                    }}
                  >
                    Clear filters
                  </Button>
                ) : (
                  <Button onClick={() => setEditing('new')}>
                    <Plus className="h-3.5 w-3.5" aria-hidden />
                    Write the first one
                  </Button>
                )
              }
            />
          ) : (
            <Table>
              <THead>
                <TH className="w-[46%]">Title</TH>
                <TH>Type</TH>
                <TH>Status</TH>
                <TH>Date</TH>
                <TH>Author</TH>
                <TH align="right" />
              </THead>
              <TBody>
                {items.map((item) => (
                  <TR key={item.id} className="group">
                    <TD>
                      <button
                        type="button"
                        onClick={() => setEditing(item)}
                        className={`block w-full min-w-0 rounded text-left ${focusRing}`}
                      >
                        <span className="flex items-center gap-1.5">
                          {item.pinned && (
                            <Pin
                              className="h-3 w-3 shrink-0 text-[var(--gold)]"
                              aria-label="Pinned"
                            />
                          )}
                          <span className="truncate font-medium text-slate-900">{item.title}</span>
                        </span>
                        {item.excerpt && (
                          <span className="mt-0.5 line-clamp-1 block text-[12px] text-slate-500">
                            {item.excerpt}
                          </span>
                        )}
                      </button>
                    </TD>

                    <TD>
                      <Badge tone={TYPE_TONE[item.type]}>
                        {TYPES.find((option) => option.value === item.type)?.label}
                      </Badge>
                    </TD>

                    <TD>
                      <div className="flex items-center gap-2">
                        <Switch
                          checked={item.status === 'PUBLISHED'}
                          onChange={() =>
                            void patch(
                              item,
                              { status: item.status === 'PUBLISHED' ? 'DRAFT' : 'PUBLISHED' },
                              item.status === 'PUBLISHED'
                                ? 'Moved back to draft and removed from the website.'
                                : 'Published — it is now on the website.',
                            )
                          }
                          label={
                            item.status === 'PUBLISHED'
                              ? `Unpublish ${item.title}`
                              : `Publish ${item.title}`
                          }
                        />
                        <StatusPill status={item.status} />
                      </div>
                    </TD>

                    <TD className="whitespace-nowrap text-[12px] text-slate-500">
                      {item.status === 'PUBLISHED'
                        ? formatDate(item.publishedAt)
                        : formatDate(item.updatedAt)}
                    </TD>

                    <TD className="whitespace-nowrap text-[12px] text-slate-500">
                      <span className="flex items-center gap-2">
                        {item.author?.name ?? '—'}
                        {item.attachments.length > 0 && (
                          <span
                            className="inline-flex items-center gap-0.5 text-slate-400"
                            title={`${item.attachments.length} attached document${item.attachments.length === 1 ? '' : 's'}`}
                          >
                            <Paperclip className="h-3 w-3" aria-hidden />
                            {item.attachments.length}
                          </span>
                        )}
                      </span>
                    </TD>

                    <TD align="right">
                      <RowActions>
                        <IconButton label="Edit announcement" onClick={() => setEditing(item)}>
                          <Pencil className="h-3.5 w-3.5" aria-hidden />
                        </IconButton>

                        <DropdownMenu
                          label={`More actions for ${item.title}`}
                          trigger={() => (
                            <span className="inline-flex h-7 w-7 items-center justify-center rounded-md text-slate-500 transition-colors hover:bg-slate-100 hover:text-slate-900">
                              <span className="text-base leading-none" aria-hidden>
                                ⋯
                              </span>
                            </span>
                          )}
                        >
                          <MenuItem
                            icon={
                              item.status === 'PUBLISHED' ? (
                                <Undo2 className="h-4 w-4" />
                              ) : (
                                <Send className="h-4 w-4" />
                              )
                            }
                            onSelect={() =>
                              void patch(
                                item,
                                { status: item.status === 'PUBLISHED' ? 'DRAFT' : 'PUBLISHED' },
                                item.status === 'PUBLISHED'
                                  ? 'Moved back to draft.'
                                  : 'Published to the website.',
                              )
                            }
                          >
                            {item.status === 'PUBLISHED' ? 'Move back to draft' : 'Publish now'}
                          </MenuItem>

                          <MenuItem
                            icon={
                              item.pinned ? (
                                <PinOff className="h-4 w-4" />
                              ) : (
                                <Pin className="h-4 w-4" />
                              )
                            }
                            onSelect={() =>
                              void patch(
                                item,
                                { pinned: !item.pinned },
                                item.pinned ? 'Unpinned.' : 'Pinned to the top.',
                              )
                            }
                          >
                            {item.pinned ? 'Unpin' : 'Pin to the top'}
                          </MenuItem>

                          <MenuSeparator />

                          <MenuItem
                            tone="danger"
                            icon={<Trash2 className="h-4 w-4" />}
                            onSelect={() => setDeleting(item)}
                          >
                            Delete
                          </MenuItem>
                        </DropdownMenu>
                      </RowActions>
                    </TD>
                  </TR>
                ))}
              </TBody>
            </Table>
          )}
        </Panel>
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

      <ConfirmDialog
        open={Boolean(deleting)}
        onClose={() => setDeleting(null)}
        onConfirm={async () => {
          if (!deleting) return;
          try {
            await api.announcements.remove(deleting.id);
            notify('Announcement deleted.', 'success');
            await load();
          } catch {
            notify('Could not delete that announcement.', 'error');
          }
          setDeleting(null);
        }}
        title="Delete this announcement?"
        itemName={deleting?.title}
        consequence="and any PDFs attached to it will be permanently removed. This cannot be undone."
        confirmLabel="Delete"
      />
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
    excerpt: announcement?.excerpt ?? '',
    type: announcement?.type ?? ('NEWS' as AnnouncementType),
    pinned: announcement?.pinned ?? false,
  });

  const [attachments, setAttachments] = useState(announcement?.attachments ?? []);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);

  const pendingFiles = useRef<File[]>([]);

  const save = async (status: AnnouncementStatus) => {
    setSaving(true);
    setErrors({});

    try {
      const payload = {
        title: form.title,
        body: plainToHtml(form.body),
        excerpt: form.excerpt || null,
        type: form.type,
        pinned: form.pinned,
        status,
      };

      if (announcement) {
        await api.announcements.update(announcement.id, payload);
      } else {
        const saved = await api.announcements.create(payload);

        // A new announcement has no id until now, so any PDFs the user picked
        // are attached immediately after it exists.
        if (pendingFiles.current.length > 0) {
          await api.announcements.attach(saved.id, pendingFiles.current);
          pendingFiles.current = [];
        }
      }

      notify(status === 'PUBLISHED' ? 'Published.' : 'Draft saved.', 'success');
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
      result.failed.forEach((failure) => notify(`${failure.filename} — ${failure.reason}`, 'error'));
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
      description="Drafts are only visible here. Publishing puts it on the website immediately."
      footer={
        <>
          <Button variant="ghost" onClick={onClose}>
            Cancel
          </Button>
          <Button variant="secondary" onClick={() => void save('DRAFT')} loading={saving}>
            Save as draft
          </Button>
          <Button onClick={() => void save('PUBLISHED')} loading={saving}>
            <Send className="h-3.5 w-3.5" aria-hidden />
            Publish
          </Button>
        </>
      }
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
            rows={9}
            className={`${inputClass} resize-y leading-relaxed`}
            placeholder={
              'Registration for Term 3 closes on 15 September.\n\nBring your national ID and last term’s report to the front office.'
            }
          />
        </Field>

        <Field
          label="Summary"
          hint="Optional"
          error={errors.excerpt}
          help="Shown on the card before someone opens the full text."
        >
          <input
            value={form.excerpt}
            onChange={(event) => setForm({ ...form, excerpt: event.target.value })}
            className={inputClass}
            placeholder="Registration closes 15 September."
          />
        </Field>

        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Type">
            <Select
              value={form.type}
              onChange={(event) =>
                setForm({ ...form, type: event.target.value as AnnouncementType })
              }
            >
              {TYPES.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </Select>
          </Field>

          <div className="flex items-end pb-1">
            <div className="flex w-full items-center justify-between rounded-md border border-slate-200 bg-slate-50/60 px-3 py-2">
              <span className="text-[13px] text-slate-700">Pin to the top</span>
              <Switch
                checked={form.pinned}
                onChange={(value) => setForm({ ...form, pinned: value })}
                label="Pin to the top of the list"
              />
            </div>
          </div>
        </div>

        <div>
          <span className="mb-1.5 block text-[13px] font-medium text-slate-700">
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
                  className={`flex items-center gap-2.5 rounded-md border ${hairline} bg-slate-50/60 px-3 py-2`}
                >
                  <FileText className="h-3.5 w-3.5 shrink-0 text-slate-400" aria-hidden />
                  <span className="min-w-0 flex-1 truncate text-[13px] text-slate-700">
                    {file.filename}
                  </span>
                  <span className="shrink-0 text-[11px] tabular-nums text-slate-500">
                    {formatBytes(file.sizeBytes)}
                  </span>
                  <button
                    type="button"
                    onClick={() => void detach(file.id)}
                    aria-label={`Remove ${file.filename}`}
                    className={`shrink-0 rounded p-1 text-slate-400 hover:bg-red-50 hover:text-red-600 ${focusRing}`}
                  >
                    <X className="h-3 w-3" aria-hidden />
                  </button>
                </li>
              ))}
            </ul>
          )}

          <div className="flex items-center gap-2">
            <Button
              variant="secondary"
              size="sm"
              loading={uploading}
              onClick={() => fileInput.current?.click()}
            >
              <Upload className="h-3.5 w-3.5" aria-hidden />
              Attach a PDF
            </Button>
            <span className="text-[11px] text-slate-500">PDF only · up to 15 MB</span>
          </div>
        </div>
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
