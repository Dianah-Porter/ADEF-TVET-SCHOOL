import { motion } from 'motion/react';
import { useInView } from 'motion/react';
import { useRef } from 'react';
import { Phone, Mail, MapPin, Send } from 'lucide-react';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Textarea } from './ui/textarea';

export function ContactSection() {
  const ref = useRef(null);
  const isInView = useInView(ref, { once: true, amount: 0.2 });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    // Handle form submission
    alert('Thank you for your inquiry! We will get back to you soon.');
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
          {/* Contact Information */}
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
                content="+250 789 895 800"
                href="tel:+250789895800"
              />
              <ContactInfo
                icon={<Mail className="w-6 h-6" />}
                title="Email"
                content="adeftvet@gmail.com"
                href="mailto:adeftvet@gmail.com"
              />
              <ContactInfo
                icon={<MapPin className="w-6 h-6" />}
                title="Location"
                content="NR5, Kigali, Rwanda"
              />
            </div>

            {/* Map */}
            <div className="rounded-xl overflow-hidden shadow-lg h-80">
              <iframe
                src="https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d3987.5162978834844!2d30.0588735!3d-1.9440271!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0x0%3A0x0!2zMcKwNTYnMzguNSJTIDMwwrAwMyczMS41IkU!5e0!3m2!1sen!2srw!4v1234567890"
                width="100%"
                height="100%"
                style={{ border: 0 }}
                allowFullScreen
                loading="lazy"
                referrerPolicy="no-referrer-when-downgrade"
                title="ADEF TVET School Location"
              />
            </div>
          </motion.div>

          {/* Contact Form */}
          <motion.div
            initial={{ opacity: 0, x: 30 }}
            animate={isInView ? { opacity: 1, x: 0 } : {}}
            transition={{ duration: 0.6, delay: 0.4 }}
          >
            <div className="bg-gradient-to-br from-[var(--navy)] to-[var(--charcoal)] rounded-2xl p-8 shadow-xl">
              <h3 className="text-2xl font-bold text-white mb-6">Send Us a Message</h3>
              
              <form onSubmit={handleSubmit} className="space-y-6">
                <div>
                  <Input
                    type="text"
                    placeholder="Your Name"
                    required
                    className="bg-white/10 border-white/20 text-white placeholder:text-gray-300"
                  />
                </div>
                <div>
                  <Input
                    type="email"
                    placeholder="Your Email"
                    required
                    className="bg-white/10 border-white/20 text-white placeholder:text-gray-300"
                  />
                </div>
                <div>
                  <Input
                    type="tel"
                    placeholder="Phone Number"
                    className="bg-white/10 border-white/20 text-white placeholder:text-gray-300"
                  />
                </div>
                <div>
                  <Textarea
                    placeholder="Your Message"
                    required
                    rows={5}
                    className="bg-white/10 border-white/20 text-white placeholder:text-gray-300 resize-none"
                  />
                </div>
                <Button
                  type="submit"
                  className="w-full bg-[var(--orange)] hover:bg-[var(--orange)]/90 text-white py-6 text-lg font-semibold"
                >
                  <Send className="w-5 h-5 mr-2" />
                  Send Message
                </Button>
              </form>
            </div>
          </motion.div>
        </div>
      </div>
    </section>
  );
}

function ContactInfo({ icon, title, content, href }: { icon: React.ReactNode; title: string; content: string; href?: string }) {
  const ContentWrapper = href ? 'a' : 'div';
  const props = href ? { href, className: 'hover:text-[var(--orange)] transition-colors' } : {};

  return (
    <div className="flex items-start gap-4">
      <div className="flex-shrink-0 w-12 h-12 bg-[var(--gold)]/10 rounded-lg flex items-center justify-center text-[var(--gold)]">
        {icon}
      </div>
      <div>
        <h4 className="font-semibold text-[var(--navy)] mb-1">{title}</h4>
        <ContentWrapper {...props}>
          <p className="text-gray-600">{content}</p>
        </ContentWrapper>
      </div>
    </div>
  );
}
