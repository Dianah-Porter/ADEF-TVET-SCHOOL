import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Button } from './ui/button';
import { ImageWithFallback } from './figma/ImageWithFallback';
import { useApi } from '../../hooks/useApi';
import { api } from '../../lib/api';
import { STATIC_HERO_SLIDES } from '../../lib/staticData';

export function HeroSection() {
  const [currentIndex, setCurrentIndex] = useState(0);
  const { data: slides } = useApi(api.hero.list, STATIC_HERO_SLIDES);

  useEffect(() => {
    if (slides.length < 2) return;
    const interval = setInterval(() => {
      setCurrentIndex((prev) => (prev + 1) % slides.length);
    }, 5000);
    return () => clearInterval(interval);
  }, [slides.length]);

  const scrollToSection = (sectionId: string) => {
    document.getElementById(sectionId)?.scrollIntoView({ behavior: 'smooth' });
  };

  const activeSlide = slides[currentIndex] ?? slides[0];

  return (
    <div className="relative h-screen w-full overflow-hidden">
      {/* Animated Background Images */}
      <AnimatePresence mode="sync">
        <motion.div
          key={currentIndex}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1, scale: 1.1 }}
          exit={{ opacity: 0 }}
          transition={{
            opacity: { duration: 1.5, ease: 'easeInOut' },
            scale: { duration: 10, ease: 'linear' }
          }}
          className="absolute inset-0"
        >
          {activeSlide && (
            <ImageWithFallback
              src={activeSlide.imageUrl}
              alt={activeSlide.headline ?? 'ADEF TVET School'}
              className="w-full h-full object-cover"
            />
          )}
        </motion.div>
      </AnimatePresence>

      {/* Dark Overlay */}
      <div className="absolute inset-0 bg-gradient-to-b from-[var(--dark-overlay)] via-[var(--dark-overlay)]/60 to-[var(--navy)]" />

      {/* Hero Content */}
      <div className="relative z-10 h-full flex flex-col items-center justify-center text-center px-4 md:px-8">
        <motion.div
          initial={{ y: 30, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 0.5, duration: 0.8 }}
          className="max-w-5xl"
        >
          <h1 className="text-5xl md:text-7xl font-bold text-white mb-6 leading-tight">
            {activeSlide?.headline ?? (
              <>
                Empowering the Next Generation of{' '}
                <span className="text-[var(--gold)]">Skilled Professionals</span>
              </>
            )}
          </h1>
          <p className="text-xl md:text-2xl text-gray-200 mb-10 max-w-3xl mx-auto">
            {activeSlide?.subtext ??
              'Hands-on technical education designed to prepare students for success in local and international labor markets.'}
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Button
              size="lg"
              onClick={() => scrollToSection('contact')}
              className="bg-[var(--orange)] hover:bg-[var(--orange)]/90 text-white px-8 py-6 text-lg transition-all hover:scale-105"
            >
              Apply Now
            </Button>
            <Button
              size="lg"
              variant="outline"
              onClick={() => scrollToSection('courses')}
              className="border-2 border-white text-white bg-transparent hover:bg-white hover:text-[var(--navy)] px-8 py-6 text-lg transition-all hover:scale-105"
            >
              Explore Courses
            </Button>
          </div>
        </motion.div>

        {/* Slide indicators */}
        {slides.length > 1 && (
          <div className="absolute bottom-24 flex gap-2">
            {slides.map((_, i) => (
              <button
                key={i}
                onClick={() => setCurrentIndex(i)}
                className={`h-2 rounded-full transition-all duration-300 ${
                  i === currentIndex ? 'bg-[var(--gold)] w-8' : 'bg-white/50 w-2'
                }`}
              />
            ))}
          </div>
        )}

        {/* Stats Bar */}
        <motion.div
          initial={{ y: 50, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 1, duration: 0.8 }}
          className="absolute bottom-8 left-0 right-0 flex flex-col sm:flex-row gap-4 sm:gap-8 justify-center items-center px-4"
        >
          <StatCard label="RTB Certified" />
          <StatCard label="WDA Accredited" />
          <StatCard label="RP Recognized" />
        </motion.div>
      </div>

      {/* Scroll Indicator */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 2, duration: 1 }}
        className="absolute bottom-24 left-1/2 transform -translate-x-1/2 hidden md:block"
      >
        <motion.div
          animate={{ y: [0, 10, 0] }}
          transition={{ repeat: Infinity, duration: 2 }}
          className="w-6 h-10 border-2 border-white rounded-full flex items-start justify-center p-2"
        >
          <div className="w-1 h-3 bg-white rounded-full" />
        </motion.div>
      </motion.div>
    </div>
  );
}

function StatCard({ label }: { label: string }) {
  return (
    <div className="bg-white/10 backdrop-blur-md border border-white/20 rounded-lg px-6 py-3 text-center">
      <div className="text-[var(--gold)] text-2xl font-bold">✓</div>
      <div className="text-white font-semibold">{label}</div>
    </div>
  );
}
