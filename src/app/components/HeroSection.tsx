import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Button } from './ui/button';
import { ImageWithFallback } from './figma/ImageWithFallback';

import heroImg1 from '../../imports/image-2.png';
import heroImg2 from '../../imports/image.png';
import heroImg3 from '../../imports/image-1.png';
import heroImg4 from '../../imports/image-3.png';
import heroImg5 from '../../imports/image-4.png';

const heroImages = [heroImg1, heroImg2, heroImg3, heroImg4, heroImg5];

export function HeroSection() {
  const [currentIndex, setCurrentIndex] = useState(0);

  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentIndex((prev) => (prev + 1) % heroImages.length);
    }, 5000);
    return () => clearInterval(interval);
  }, []);

  const scrollToSection = (sectionId: string) => {
    const element = document.getElementById(sectionId);
    element?.scrollIntoView({ behavior: 'smooth' });
  };

  return (
    <div className="relative h-screen w-full overflow-hidden">

      {/* 🔥 Background */}
      <AnimatePresence mode="wait">
        <motion.div
          key={currentIndex}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1, scale: 1.08 }}
          exit={{ opacity: 0 }}
          transition={{
            opacity: { duration: 1.2 },
            scale: { duration: 10, ease: 'linear' }
          }}
          className="absolute inset-0 z-0"
        >
          <ImageWithFallback
            src={heroImages[currentIndex]}
            alt="ADEF TVET School"
            className="w-full h-full object-cover"
          />
        </motion.div>
      </AnimatePresence>

      {/* 🔥 Overlay */}
      <div className="absolute inset-0 z-10 bg-gradient-to-b from-black/70 via-black/40 to-[var(--navy)]" />

      {/* 🔥 Content */}
      <div className="relative z-20 h-full flex flex-col items-center justify-center text-center px-6 md:px-12">

        <motion.div
          initial={{ y: 40, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 0.4, duration: 0.8 }}
          className="max-w-5xl"
        >
          {/* Title */}
          <h1 className="text-4xl md:text-7xl font-bold text-white mb-6 leading-tight">
            Empowering the Next Generation of{' '}
            <span className="text-[var(--gold)]">
              Skilled Professionals
            </span>
          </h1>

          {/* Description */}
          <p className="text-lg md:text-2xl text-gray-300 mb-10 max-w-3xl mx-auto">
            Hands-on technical education designed to prepare students for
            success in local and international labor markets.
          </p>

          {/* 🔥 Buttons */}
          <div className="flex flex-col sm:flex-row items-center justify-center gap-6 mt-6">

            <Button
              size="lg"
              onClick={() => scrollToSection('contact')}
              className="bg-[var(--orange)] hover:bg-[var(--orange)]/90 text-white px-10 py-6 text-lg rounded-xl shadow-lg transition-all duration-300 hover:scale-105"
            >
              Apply Now
            </Button>

            <Button
              size="lg"
              variant="outline"
              onClick={() => scrollToSection('courses')}
              className="border-2 border-white text-white bg-transparent hover:bg-white hover:text-[var(--navy)] px-10 py-6 text-lg rounded-xl shadow-lg transition-all duration-300 hover:scale-105"
            >
              Explore Courses
            </Button>

          </div>
        </motion.div>
      </div>

      {/* 🔥 Scroll Indicator (FIXED — NO OVERLAP) */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 2, duration: 1 }}
        className="absolute bottom-4 left-1/2 transform -translate-x-1/2 z-10 hidden md:block pointer-events-none"
      >
        <motion.div
          animate={{ y: [0, 12, 0] }}
          transition={{ repeat: Infinity, duration: 2 }}
          className="w-6 h-10 border-2 border-white/60 rounded-full flex items-start justify-center p-2"
        >
          <div className="w-1 h-3 bg-white rounded-full" />
        </motion.div>
      </motion.div>

    </div>
  );
}