import { useCallback, useEffect, useState } from 'react';
import { Archive, Inbox, Mail, MailOpen, Phone, Reply, Trash2 } from 'lucide-react';
import {
  api,
  ApiError,
  type ContactMessage,
  type ContactStatus,
  type InboxCounts,
} from '../lib/api';
import { PageHeader } from './AdminLayout';
import { useToast } from './admin-context';
import {
  Badge,
  Button,
  ConfirmDialog,
  EmptyState,
  ErrorState,
  IconButton,
  Modal,
  Pagination,
  Panel,
  RowActions,
  SearchInput,
  SegmentedControl,
  TBody,
  TD,
  TH,
  THead,
  TR,
  Table,
  TableSkeleton,
  Toolbar,
  relativeTime,
} from './ui';

type Filter = 'ALL' | ContactStatus;

const STATUS_TONE: Record<ContactStatus, 'info' | 'neutral' | 'success'> = {
  NEW: 'info',
  READ: 'neutral',
  REPLIED: 'success',
  ARCHIVED: 'neutral',
};

const STATUS_LABEL: Record<ContactStatus, string> = {
  NEW: 'New',
  READ: 'Read',
  REPLIED: 'Replied',
  ARCHIVED: 'Archived',
};

/**
 * Enquiries sent through the website's contact form.
 *
 * Modelled as an inbox rather than a log: each message has a state someone
 * moves it through, so "has anyone answered this?" is answerable at a glance
 * — which is the whole reason for capturing them in the database instead of
 * forwarding them to an email account nobody owns.
 */
export function InboxPage() {
  const { notify } = useToast();

  const [messages, setMessages] = useState<ContactMessage[]>([]);
  const [counts, setCounts] = useState<InboxCounts | null>(null);
  const [meta, setMeta] = useState({ page: 1, totalPages: 1, total: 0 });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [filter, setFilter] = useState<Filter>('ALL');
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);

  const [open, setOpen] = useState<ContactMessage | null>(null);
  const [deleting, setDeleting] = useState<ContactMessage | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);

    const params = new URLSearchParams({ page: String(page), limit: '25' });
    if (filter !== 'ALL') params.set('status', filter);
    if (search.trim()) params.set('search', search.trim());

    try {
      const result = await api.contact.list(`?${params.toString()}`);
      setMessages(result.data);
      setCounts(result.meta.counts);
      setMeta({ page: result.meta.page, totalPages: result.meta.totalPages, total: result.meta.total });
    } catch (caught) {
      setError(caught instanceof ApiError ? caught.message : 'Could not reach the server.');
    } finally {
      setLoading(false);
    }
  }, [filter, page, search]);

  useEffect(() => {
    document.title = 'Inbox · ADEF Admin';
  }, []);

  // Debounced so typing in the search box does not fire a request per keystroke.
  useEffect(() => {
    const timer = window.setTimeout(() => void load(), search ? 300 : 0);
    return () => window.clearTimeout(timer);
  }, [load, search]);

  const setStatus = async (message: ContactMessage, status: ContactStatus) => {
    try {
      await api.contact.setStatus(message.id, status);
      notify(`Marked as ${STATUS_LABEL[status].toLowerCase()}.`, 'success');
      await load();
    } catch {
      notify('Could not update that message.', 'error');
    }
  };

  /** Opening a new enquiry marks it read, the way an email client would. */
  const openMessage = async (message: ContactMessage) => {
    setOpen(message);

    if (message.status === 'NEW') {
      try {
        await api.contact.setStatus(message.id, 'READ');
        await load();
      } catch {
        // Not worth interrupting the person reading it.
      }
    }
  };

  return (
    <>
      <PageHeader
        title="Inbox"
        description="Messages sent through the contact form on the website."
      />

      <Toolbar>
        <SearchInput
          value={search}
          onChange={(value) => {
            setSearch(value);
            setPage(1);
          }}
          placeholder="Search name, email or message…"
          className="w-full sm:max-w-xs"
        />

        <SegmentedControl<Filter>
          label="Filter by status"
          value={filter}
          onChange={(value) => {
            setFilter(value);
            setPage(1);
          }}
          options={[
            { value: 'ALL', label: 'All', count: counts?.total },
            { value: 'NEW', label: 'New', count: counts?.NEW },
            { value: 'READ', label: 'Read', count: counts?.READ },
            { value: 'REPLIED', label: 'Replied', count: counts?.REPLIED },
            { value: 'ARCHIVED', label: 'Archived', count: counts?.ARCHIVED },
          ]}
        />
      </Toolbar>

      {error && !loading ? (
        <ErrorState message={error} onRetry={load} />
      ) : (
        <Panel>
          {loading ? (
            <Table>
              <TableSkeleton rows={5} columns={4} />
            </Table>
          ) : messages.length === 0 ? (
            <EmptyState
              icon={<Inbox className="h-7 w-7" />}
              title={filter === 'ALL' && !search ? 'No messages yet' : 'Nothing here'}
              description={
                filter === 'ALL' && !search
                  ? 'Enquiries sent through the website contact form will appear here.'
                  : 'No messages match the current filter or search.'
              }
              action={
                (filter !== 'ALL' || search) && (
                  <Button
                    variant="secondary"
                    onClick={() => {
                      setFilter('ALL');
                      setSearch('');
                    }}
                  >
                    Clear filters
                  </Button>
                )
              }
            />
          ) : (
            <>
              <Table>
                <THead>
                  <TH className="w-[24%]">From</TH>
                  <TH className="w-[44%]">Message</TH>
                  <TH>Status</TH>
                  <TH>Received</TH>
                  <TH align="right" />
                </THead>
                <TBody>
                  {messages.map((message) => (
                    <TR
                      key={message.id}
                      className={`group ${message.status === 'NEW' ? 'bg-blue-50/30' : ''}`}
                    >
                      <TD>
                        <button
                          type="button"
                          onClick={() => void openMessage(message)}
                          className="block w-full min-w-0 text-left"
                        >
                          <p
                            className={`truncate ${
                              message.status === 'NEW'
                                ? 'font-semibold text-slate-900'
                                : 'font-medium text-slate-800'
                            }`}
                          >
                            {message.name}
                          </p>
                          <p className="truncate text-[12px] text-slate-500">{message.email}</p>
                        </button>
                      </TD>

                      <TD>
                        <button
                          type="button"
                          onClick={() => void openMessage(message)}
                          className="line-clamp-2 w-full text-left text-[12px] leading-relaxed text-slate-600"
                        >
                          {message.message}
                        </button>
                      </TD>

                      <TD>
                        <Badge tone={STATUS_TONE[message.status]}>
                          {STATUS_LABEL[message.status]}
                        </Badge>
                      </TD>

                      <TD className="whitespace-nowrap text-[12px] text-slate-500">
                        <time dateTime={message.createdAt}>{relativeTime(message.createdAt)}</time>
                      </TD>

                      <TD align="right">
                        <RowActions>
                          <IconButton
                            label="Read message"
                            onClick={() => void openMessage(message)}
                          >
                            <MailOpen className="h-3.5 w-3.5" aria-hidden />
                          </IconButton>
                          <IconButton
                            label="Archive"
                            onClick={() => void setStatus(message, 'ARCHIVED')}
                          >
                            <Archive className="h-3.5 w-3.5" aria-hidden />
                          </IconButton>
                          <IconButton
                            label="Delete message"
                            tone="danger"
                            onClick={() => setDeleting(message)}
                          >
                            <Trash2 className="h-3.5 w-3.5" aria-hidden />
                          </IconButton>
                        </RowActions>
                      </TD>
                    </TR>
                  ))}
                </TBody>
              </Table>

              <Pagination
                page={meta.page}
                totalPages={meta.totalPages}
                total={meta.total}
                onChange={setPage}
              />
            </>
          )}
        </Panel>
      )}

      {open && (
        <MessageDialog
          message={open}
          onClose={() => setOpen(null)}
          onStatus={async (status) => {
            await setStatus(open, status);
            setOpen(null);
          }}
        />
      )}

      <ConfirmDialog
        open={Boolean(deleting)}
        onClose={() => setDeleting(null)}
        onConfirm={async () => {
          if (!deleting) return;
          try {
            await api.contact.remove(deleting.id);
            notify('Message deleted.', 'success');
            await load();
          } catch {
            notify('Could not delete that message.', 'error');
          }
          setDeleting(null);
        }}
        title="Delete this message?"
        itemName={deleting ? `The enquiry from ${deleting.name}` : undefined}
        consequence="will be permanently removed. Archive it instead if you may need it later."
        confirmLabel="Delete message"
      />
    </>
  );
}

function MessageDialog({
  message,
  onClose,
  onStatus,
}: {
  message: ContactMessage;
  onClose: () => void;
  onStatus: (status: ContactStatus) => void;
}) {
  // Pre-filling the reply saves retyping the address and the subject, and the
  // quoted original gives the sender context in the reply thread.
  const mailto = `mailto:${message.email}?subject=${encodeURIComponent(
    'Re: your enquiry to ADEF TVET School',
  )}&body=${encodeURIComponent(`\n\n———\nOn ${new Date(message.createdAt).toLocaleDateString('en-GB')}, ${message.name} wrote:\n${message.message}`)}`;

  return (
    <Modal
      open
      wide
      onClose={onClose}
      title={message.name}
      description={`Received ${new Date(message.createdAt).toLocaleString('en-GB')}`}
      footer={
        <>
          <Button variant="ghost" onClick={() => onStatus('ARCHIVED')}>
            <Archive className="h-3.5 w-3.5" aria-hidden />
            Archive
          </Button>
          <Button variant="secondary" onClick={() => onStatus('REPLIED')}>
            Mark as replied
          </Button>
          <a href={mailto}>
            <Button>
              <Reply className="h-3.5 w-3.5" aria-hidden />
              Reply by email
            </Button>
          </a>
        </>
      }
    >
      <div className="space-y-4">
        <div className="flex flex-wrap gap-x-5 gap-y-2 rounded-md border border-slate-200 bg-slate-50/60 px-3 py-2.5">
          <a
            href={`mailto:${message.email}`}
            className="inline-flex items-center gap-1.5 text-[13px] text-slate-700 hover:text-[var(--orange)]"
          >
            <Mail className="h-3.5 w-3.5 text-slate-400" aria-hidden />
            {message.email}
          </a>

          {message.phone && (
            <a
              href={`tel:${message.phone.replace(/\s/g, '')}`}
              className="inline-flex items-center gap-1.5 text-[13px] text-slate-700 hover:text-[var(--orange)]"
            >
              <Phone className="h-3.5 w-3.5 text-slate-400" aria-hidden />
              {message.phone}
            </a>
          )}
        </div>

        <p className="whitespace-pre-wrap text-[13px] leading-relaxed text-slate-700">
          {message.message}
        </p>
      </div>
    </Modal>
  );
}
