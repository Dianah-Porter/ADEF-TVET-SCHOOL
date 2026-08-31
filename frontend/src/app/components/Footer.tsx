import { motion } from 'motion/react';
import { Instagram, Twitter, Mail, Phone, MapPin } from 'lucide-react';
import { ImageWithFallback } from './figma/ImageWithFallback';
import adefBadge from '../../imports/adef_badge.jpg';

export function Footer() {
  const scrollToSection = (sectionId: string) => {
    const element = document.getElementById(sectionId);
    if (element) {
      element.scrollIntoView({ behavior: 'smooth' });
    }
  };

  const quickLinks = [
    { label: 'Home', id: 'home' },
    { label: 'About Us', id: 'about' },
    { label: 'Our Courses', id: 'courses' },
    { label: 'Gallery', id: 'gallery' },
    { label: 'Contact', id: 'contact' },
  ];

  return (
    <footer className="bg-[var(--navy)] text-white">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
        <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-12">
          {/* Brand */}
          <div>
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5 }}
            >
              <div className="flex items-center gap-3 mb-4">
                <div className="w-16 h-16 rounded-full bg-white p-0.5 shadow-lg flex-shrink-0 ring-2 ring-[var(--gold)]/50">
                  <ImageWithFallback
                    src={adefBadge}
                    alt="ADEF TVET School Badge"
                    className="w-full h-full object-contain rounded-full"
                  />
                </div>
                <div className="flex flex-col leading-tight">
                  <span className="text-2xl font-extrabold tracking-wide leading-none">ADEF TVET SCHOOL</span>
                  <span className="text-xs text-[var(--gold)] tracking-widest uppercase mt-1">Kigali, Rwanda</span>
                </div>
              </div>
              <p className="text-gray-300 leading-relaxed mb-6">
                Empowering the next generation of skilled professionals through quality technical and vocational education.
              </p>
              
              {/* Social Icons */}
              <div className="flex gap-4">
                <SocialIcon
                  href="https://instagram.com/adef_tvet_school"
                  icon={<Instagram className="w-5 h-5" />}
                  label="Instagram"
                />
                <SocialIcon
                  href="https://twitter.com/AdefTvet"
                  icon={<Twitter className="w-5 h-5" />}
                  label="Twitter"
                />
              </div>
            </motion.div>
          </div>

          {/* Quick Links */}
          <div>
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5, delay: 0.1 }}
            >
              <h3 className="text-xl font-bold mb-6">Quick Links</h3>
              <ul className="space-y-3">
                {quickLinks.map((link) => (
                  <li key={link.id}>
                    <button
                      onClick={() => scrollToSection(link.id)}
                      className="text-gray-300 hover:text-[var(--gold)] transition-colors duration-200"
                    >
                      {link.label}
                    </button>
                  </li>
                ))}
              </ul>
            </motion.div>
          </div>

          {/* Our Programs */}
          <div>
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5, delay: 0.2 }}
            >
              <h3 className="text-xl font-bold mb-6">Our Programs</h3>
              <ul className="space-y-3">
                <li className="text-gray-300">Welding Level 3</li>
                <li className="text-gray-300">Masonry Level 3</li>
                <li className="text-gray-300">Carpentry Level 3</li>
              </ul>
              <div className="mt-6 pt-6 border-t border-white/10">
                <p className="text-sm text-gray-400">RTB Certified</p>
                <p className="text-sm text-gray-400">WDA Accredited</p>
                <p className="text-sm text-gray-400">RP Recognized</p>
              </div>
            </motion.div>
          </div>

          {/* Contact Info */}
          <div>
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5, delay: 0.3 }}
            >
              <h3 className="text-xl font-bold mb-6">Contact Us</h3>
              <ul className="space-y-4">
                <li className="flex items-start gap-3">
                  <Phone className="w-5 h-5 text-[var(--gold)] flex-shrink-0 mt-1" />
                  <div>
                    <a
                      href="tel:+250789895800"
                      className="text-gray-300 hover:text-[var(--gold)] transition-colors"
                    >
                      +250 789 895 800
                    </a>
                  </div>
                </li>
                <li className="flex items-start gap-3">
                  <Mail className="w-5 h-5 text-[var(--gold)] flex-shrink-0 mt-1" />
                  <div>
                    <a
                      href="mailto:adeftvet@gmail.com"
                      className="text-gray-300 hover:text-[var(--gold)] transition-colors"
                    >
                      adeftvet@gmail.com
                    </a>
                  </div>
                </li>
                <li className="flex items-start gap-3">
                  <MapPin className="w-5 h-5 text-[var(--gold)] flex-shrink-0 mt-1" />
                  <div>
                    <p className="text-gray-300">NR5, Kigali, Rwanda</p>
                  </div>
                </li>
              </ul>
            </motion.div>
          </div>
        </div>

        {/* Bottom Bar */}
        <motion.div
          initial={{ opacity: 0 }}
          whileInView={{ opacity: 1 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5, delay: 0.4 }}
          className="border-t border-white/10 mt-12 pt-8 text-center text-gray-400"
        >
          <p>&copy; {new Date().getFullYear()} ADEF TVET School. All rights reserved.</p>
          <p className="mt-2 text-sm">Building careers, shaping futures.</p>
        </motion.div>
      </div>
    </footer>
  );
}

function SocialIcon({ href, icon, label }: { href: string; icon: React.ReactNode; label: string }) {
  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      className="w-10 h-10 bg-white/10 hover:bg-[var(--gold)] rounded-lg flex items-center justify-center transition-all duration-300 hover:scale-110"
      aria-label={label}
    >
      {icon}
    </a>
  );
}
