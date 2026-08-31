import { useEffect, useRef, useState } from 'react';
import { motion, useInView } from 'motion/react';
import { Calendar, Download, FileText, Pin, X } from 'lucide-react';
import { api, type Announcement } from '../lib/api';

const typeStyles: Record<string, { label: string; className: string }> = {
  NEWS: { label: 'News', className: 'bg-[var(--gold)]/15 text-[#8a5d2c]' },
  EVENT: { label: 'Event', className: 'bg-[var(--orange)]/12 text-[#c4410b]' },
  NOTICE: { label: 'Notice', className: 'bg-[var(--navy)]/10 text-[var(--navy)]' },
};

export function AnnouncementsSection() {
  const ref = useRef(null);
  const isInView = useInView(ref, { once: true, amount: 0.2 });

  const [items, setItems] = useState<Announcement[]>([]);
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState<Announcement | null>(null);

  useEffect(() => {
    let cancelled = false;

    (async () => {
      try {
        const result = await api.announcements.listPublic('?limit=6');
        if (!cancelled) setItems(result.data);
      } catch {
        // Leave the list empty; the section hides itself below.
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, []);

  // With nothing published, showing an empty "Announcements" heading would look
  // broken. The section simply is not part of the page until there is news.
  if (!loading && items.length === 0) return null;

  return (
    <section id="news" className="py-20 bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <motion.div
          ref={ref}
          initial={{ opacity: 0, y: 30 }}
          animate={isInView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.6 }}
          className="text-center mb-12"
        >
          <div className="inline-block px-4 py-2 bg-[var(--orange)]/10 rounded-full mb-4">
            <span className="text-[var(--orange)] font-semibold">Latest Updates</span>
          </div>
          <h2 className="text-4xl md:text-5xl font-bold text-[var(--navy)] mb-4">
            News & Announcements
          </h2>
          <p className="text-lg text-gray-600 max-w-2xl mx-auto">
            Registration dates, events and important notices for students and parents
          </p>
        </motion.div>

        {loading ? (
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
            {[0, 1, 2].map((key) => (
              <div
                key={key}
                className="bg-white rounded-2xl p-6 shadow-lg animate-pulse"
                aria-hidden
              >
                <div className="h-5 w-20 bg-gray-200 rounded-full mb-4" />
                <div className="h-6 w-3/4 bg-gray-200 rounded mb-3" />
                <div className="h-4 w-full bg-gray-100 rounded mb-2" />
                <div className="h-4 w-5/6 bg-gray-100 rounded" />
              </div>
            ))}
          </div>
        ) : (
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
            {items.map((item, index) => (
              <motion.article
                key={item.id}
                initial={{ opacity: 0, y: 30 }}
                animate={isInView ? { opacity: 1, y: 0 } : {}}
                transition={{ duration: 0.5, delay: index * 0.1 }}
                className="bg-white rounded-2xl p-6 shadow-lg hover:shadow-xl transition-shadow flex flex-col"
              >
                <div className="flex items-center gap-2 mb-4">
                  <span
                    className={`px-3 py-1 rounded-full text-sm font-semibold ${
                      typeStyles[item.type]?.className ?? typeStyles.NEWS!.className
                    }`}
                  >
                    {typeStyles[item.type]?.label ?? 'News'}
                  </span>
                  {item.pinned && (
                    <span className="inline-flex items-center gap-1 text-xs font-semibold text-[var(--gold)]">
                      <Pin className="w-3 h-3" aria-hidden />
                      Pinned
                    </span>
                  )}
                </div>

                <h3 className="text-xl font-bold text-[var(--navy)] mb-2">{item.title}</h3>

                {item.publishedAt && (
                  <p className="flex items-center gap-1.5 text-sm text-gray-500 mb-3">
                    <Calendar className="w-3.5 h-3.5" aria-hidden />
                    <time dateTime={item.publishedAt}>
                      {new Date(item.publishedAt).toLocaleDateString('en-GB', {
                        day: 'numeric',
                        month: 'long',
                        year: 'numeric',
                      })}
                    </time>
                  </p>
                )}

                {item.excerpt && (
                  <p className="text-gray-600 leading-relaxed mb-4 flex-1">{item.excerpt}</p>
                )}

                <div className="flex flex-wrap items-center gap-3 mt-auto">
                  <button
                    type="button"
                    onClick={() => void openAnnouncement(item, setOpen)}
                    className="text-[var(--orange)] font-semibold hover:underline underline-offset-4 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--gold)] rounded"
                  >
                    Read more
                  </button>

                  {item.attachments.length > 0 && (
                    <span className="inline-flex items-center gap-1.5 text-sm text-gray-500">
                      <FileText className="w-3.5 h-3.5" aria-hidden />
                      {item.attachments.length} document
                      {item.attachments.length === 1 ? '' : 's'}
                    </span>
                  )}
                </div>
              </motion.article>
            ))}
          </div>
        )}
      </div>

      {open && <AnnouncementDialog announcement={open} onClose={() => setOpen(null)} />}
    </section>
  );
}

/**
 * The list endpoint omits the body to keep the payload small, so the full text
 * is fetched when a reader actually opens one.
 */
async function openAnnouncement(
  item: Announcement,
  setOpen: (value: Announcement | null) => void,
) {
  setOpen(item);
  try {
    setOpen(await api.announcements.getBySlug(item.slug));
  } catch {
    // Keep the summary that is already on screen.
  }
}

function AnnouncementDialog({
  announcement,
  onClose,
}: {
  announcement: Announcement;
  onClose: () => void;
}) {
  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', onKeyDown);

    const previous = document.body.style.overflow;
    document.body.style.overflow = 'hidden';

    return () => {
      document.removeEventListener('keydown', onKeyDown);
      document.body.style.overflow = previous;
    };
  }, [onClose]);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4">
      <button
        type="button"
        aria-label="Close"
        onClick={onClose}
        className="absolute inset-0 cursor-default"
        tabIndex={-1}
      />
      <div
        role="dialog"
        aria-modal="true"
        aria-label={announcement.title}
        className="relative bg-white rounded-2xl max-w-2xl w-full max-h-[85vh] overflow-y-auto shadow-2xl"
      >
        <div className="sticky top-0 flex items-start justify-between gap-4 bg-white/95 backdrop-blur px-6 py-5 border-b border-gray-200">
          <h3 className="text-2xl font-bold text-[var(--navy)]">{announcement.title}</h3>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="shrink-0 text-gray-400 hover:text-[var(--navy)] transition-colors rounded focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--gold)]"
          >
            <X size={22} />
          </button>
        </div>

        <div className="px-6 py-5">
          {announcement.body ? (
            <div
              className="prose prose-slate max-w-none text-gray-700 leading-relaxed [&_p]:mb-4 [&_a]:text-[var(--orange)] [&_a]:underline [&_ul]:list-disc [&_ul]:pl-5 [&_ol]:list-decimal [&_ol]:pl-5"
              // The API sanitises every announcement body on write, so what is
              // stored is already safe to render. Nothing unsanitised can reach
              // this point.
              dangerouslySetInnerHTML={{ __html: announcement.body }}
            />
          ) : (
            <p className="text-gray-500">Loading…</p>
          )}

          {announcement.attachments.length > 0 && (
            <div className="mt-6 pt-5 border-t border-gray-200">
              <h4 className="font-semibold text-[var(--navy)] mb-3">Documents</h4>
              <ul className="space-y-2">
                {announcement.attachments.map((file) => (
                  <li key={file.id}>
                    <a
                      href={api.announcements.downloadUrl(file.id)}
                      className="flex items-center gap-3 p-3 rounded-lg border border-gray-200 hover:border-[var(--gold)] hover:bg-[var(--gold)]/5 transition-colors group"
                    >
                      <FileText className="w-5 h-5 text-[var(--gold)] shrink-0" aria-hidden />
                      <span className="flex-1 min-w-0 truncate text-gray-800 font-medium">
                        {file.filename}
                      </span>
                      <Download
                        className="w-4 h-4 text-gray-400 group-hover:text-[var(--orange)] shrink-0"
                        aria-hidden
                      />
                    </a>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
