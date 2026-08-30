import { useRef, useState } from 'react';
import { motion } from 'motion/react';
import { useInView } from 'motion/react';
import { Phone, Mail, MapPin, Send, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Textarea } from './ui/textarea';
import { useApi } from '../../hooks/useApi';
import { api } from '../../lib/api';
import { STATIC_SETTINGS } from '../../lib/staticData';
import type { ContactFormData } from '../../types';

const EMPTY_FORM: ContactFormData = { name: '', email: '', phone: '', message: '', website: '' };

export function ContactSection() {
  const ref = useRef(null);
  const isInView = useInView(ref, { once: true, amount: 0.2 });
  const { data: settings } = useApi(api.settings.get, STATIC_SETTINGS);

  const [form, setForm] = useState<ContactFormData>(EMPTY_FORM);
  const [submitting, setSubmitting] = useState(false);

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>,
  ) => {
    setForm((prev) => ({ ...prev, [e.target.name]: e.target.value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      await api.contact.submit(form);
      toast.success('Message sent!', {
        description: "Thank you for reaching out. We'll get back to you soon.",
      });
      setForm(EMPTY_FORM);
    } catch (error) {
      // The API validates the same fields this form does, so its message is
      // usually the specific one ("Write your message.") rather than a generic
      // failure — worth showing verbatim. The phone number goes alongside it so
      // a visitor is never left with no way to reach the school.
      toast.error(error instanceof Error ? error.message : 'Could not send that message.', {
        description: `You can also email ${settings.email} or call ${settings.phone}.`,
        duration: 8000,
      });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <section id="contact" className="py-20 bg-white">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <motion.div
          ref={ref}
          initial={{ opacity: 0, y: 30 }}
          animate={isInView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.6 }}
          className="text-center mb-12"
        >
          <div className="inline-block px-4 py-2 bg-[var(--navy)]/10 rounded-full mb-4">
            <span className="text-[var(--navy)] font-semibold">Get In Touch</span>
          </div>
          <h2 className="text-4xl md:text-5xl font-bold text-[var(--navy)] mb-4">
            Contact Us Today
          </h2>
          <p className="text-lg text-gray-600 max-w-2xl mx-auto">
            Ready to start your journey? Reach out to us for admissions, inquiries, or campus visits
          </p>
        </motion.div>

        <div className="grid lg:grid-cols-2 gap-12">
          {/* Contact info + map */}
          <motion.div
            initial={{ opacity: 0, x: -30 }}
            animate={isInView ? { opacity: 1, x: 0 } : {}}
            transition={{ duration: 0.6, delay: 0.2 }}
          >
            <h3 className="text-2xl font-bold text-[var(--navy)] mb-6">Contact Information</h3>

            <div className="space-y-6 mb-8">
              <ContactInfo
                icon={<Phone className="w-6 h-6" />}
                title="Phone / WhatsApp"
                content={settings.phone}
                href={`tel:${(settings.whatsapp ?? settings.phone).replace(/\s/g, '')}`}
              />
              <ContactInfo
                icon={<Mail className="w-6 h-6" />}
                title="Email"
                content={settings.email}
                href={`mailto:${settings.email}`}
              />
              <ContactInfo
                icon={<MapPin className="w-6 h-6" />}
                title="Location"
                content={settings.address}
              />
            </div>

            {settings.mapEmbedUrl && (
              <div className="rounded-xl overflow-hidden shadow-lg h-80">
                <iframe
                  src={settings.mapEmbedUrl}
                  width="100%"
                  height="100%"
                  style={{ border: 0 }}
                  allowFullScreen
                  loading="lazy"
                  referrerPolicy="no-referrer-when-downgrade"
                  title="ADEF TVET School Location"
                />
              </div>
            )}
          </motion.div>

          {/* Contact form */}
          <motion.div
            initial={{ opacity: 0, x: 30 }}
            animate={isInView ? { opacity: 1, x: 0 } : {}}
            transition={{ duration: 0.6, delay: 0.4 }}
          >
            <div className="bg-gradient-to-br from-[var(--navy)] to-[var(--charcoal)] rounded-2xl p-8 shadow-xl">
              <h3 className="text-2xl font-bold text-white mb-6">Send Us a Message</h3>

              <form onSubmit={handleSubmit} className="space-y-6">
                <Input
                  name="name"
                  type="text"
                  placeholder="Your Name"
                  required
                  value={form.name}
                  onChange={handleChange}
                  className="bg-white/10 border-white/20 text-white placeholder:text-gray-300"
                />
                <Input
                  name="email"
                  type="email"
                  placeholder="Your Email"
                  required
                  value={form.email}
                  onChange={handleChange}
                  className="bg-white/10 border-white/20 text-white placeholder:text-gray-300"
                />
                <Input
                  name="phone"
                  type="tel"
                  placeholder="Phone Number"
                  value={form.phone ?? ''}
                  onChange={handleChange}
                  className="bg-white/10 border-white/20 text-white placeholder:text-gray-300"
                />
                {/* Honeypot: positioned off-screen and hidden from assistive
                    tech, so only a bot that fills every field fills it — which
                    is how the API knows to discard the submission. */}
                <input
                  type="text"
                  name="website"
                  value={form.website ?? ''}
                  onChange={handleChange}
                  tabIndex={-1}
                  autoComplete="off"
                  aria-hidden="true"
                  className="absolute left-[-9999px] h-0 w-0 opacity-0"
                />
                <Textarea
                  name="message"
                  placeholder="Your Message"
                  required
                  rows={5}
                  value={form.message}
                  onChange={handleChange}
                  className="bg-white/10 border-white/20 text-white placeholder:text-gray-300 resize-none"
                />
                <Button
                  type="submit"
                  disabled={submitting}
                  className="w-full bg-[var(--orange)] hover:bg-[var(--orange)]/90 text-white py-6 text-lg font-semibold"
                >
                  {submitting ? (
                    <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                  ) : (
                    <Send className="w-5 h-5 mr-2" />
                  )}
                  {submitting ? 'Sending…' : 'Send Message'}
                </Button>
              </form>
            </div>
          </motion.div>
        </div>
      </div>
    </section>
  );
}

function ContactInfo({
  icon,
  title,
  content,
  href,
}: {
  icon: React.ReactNode;
  title: string;
  content: string;
  href?: string;
}) {
  const Wrapper = href ? 'a' : 'div';
  const linkProps = href
    ? ({ href, className: 'hover:text-[var(--orange)] transition-colors' } as const)
    : ({} as const);

  return (
    <div className="flex items-start gap-4">
      <div className="flex-shrink-0 w-12 h-12 bg-[var(--gold)]/10 rounded-lg flex items-center justify-center text-[var(--gold)]">
        {icon}
      </div>
      <div>
        <h4 className="font-semibold text-[var(--navy)] mb-1">{title}</h4>
        <Wrapper {...linkProps}>
          <p className="text-gray-600">{content}</p>
        </Wrapper>
      </div>
    </div>
  );
}
