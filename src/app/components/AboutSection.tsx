import { motion } from 'motion/react';
import { useInView } from 'motion/react';
import { useRef } from 'react';
import { ImageWithFallback } from './figma/ImageWithFallback';
import aboutImg from '../../imports/image-13.png';

export function AboutSection() {
  const ref = useRef(null);
  const isInView = useInView(ref, { once: true, amount: 0.3 });

  return (
    <section id="about" className="py-20 bg-white">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid md:grid-cols-2 gap-12 items-center">
          {/* Image */}
          <motion.div
            ref={ref}
            initial={{ opacity: 0, x: -50 }}
            animate={isInView ? { opacity: 1, x: 0 } : {}}
            transition={{ duration: 0.8 }}
            className="relative"
          >
            <div className="relative overflow-hidden rounded-2xl shadow-2xl">
              <ImageWithFallback
                src={aboutImg}
                alt="ADEF TVET School - Referral TVET School in East Africa"
                className="w-full h-[500px] object-cover"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-[var(--navy)]/50 to-transparent" />
            </div>
            {/* Decorative Element */}
            <div className="absolute -bottom-6 -right-6 w-40 h-40 bg-[var(--gold)] rounded-2xl -z-10" />
          </motion.div>

          {/* Content */}
          <motion.div
            initial={{ opacity: 0, x: 50 }}
            animate={isInView ? { opacity: 1, x: 0 } : {}}
            transition={{ duration: 0.8, delay: 0.2 }}
          >
            <div className="inline-block px-4 py-2 bg-[var(--orange)]/10 rounded-full mb-4">
              <span className="text-[var(--orange)] font-semibold">About ADEF TVET</span>
            </div>
            <h2 className="text-4xl md:text-5xl font-bold text-[var(--navy)] mb-6">
              Leading Technical & Vocational Training Institution
            </h2>
            <p className="text-lg text-gray-700 mb-6 leading-relaxed">
              ADEF TVET School is dedicated to providing world-class technical and vocational education 
              that bridges the gap between classroom learning and real-world industry demands.
            </p>
            <p className="text-lg text-gray-700 mb-6 leading-relaxed">
              Our institution focuses on practical, industry-ready education that empowers students with 
              the hands-on skills and knowledge needed to excel in local and international labor markets.
            </p>
            <div className="grid grid-cols-2 gap-6 mt-8">
              <div className="border-l-4 border-[var(--gold)] pl-4">
                <div className="text-3xl font-bold text-[var(--navy)]">100+</div>
                <div className="text-gray-600">Graduates</div>
              </div>
              <div className="border-l-4 border-[var(--orange)] pl-4">
                <div className="text-3xl font-bold text-[var(--navy)]">3</div>
                <div className="text-gray-600">Programs</div>
              </div>
            </div>
          </motion.div>
        </div>
      </div>
    </section>
  );
}
