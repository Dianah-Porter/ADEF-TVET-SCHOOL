import { useRef } from 'react';
import { motion } from 'motion/react';
import { useInView } from 'motion/react';
import { Target, Lightbulb } from 'lucide-react';
import { useApi } from '../../hooks/useApi';
import { api } from '../../lib/api';
import { STATIC_SETTINGS } from '../../lib/staticData';

export function VisionMissionSection() {
  const ref = useRef(null);
  const isInView = useInView(ref, { once: true, amount: 0.3 });
  const { data: settings, loading } = useApi(api.settings.get, STATIC_SETTINGS);

  return (
    <section className="py-20 bg-gradient-to-br from-[var(--navy)] to-[var(--charcoal)]">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <motion.div
          ref={ref}
          initial={{ opacity: 0, y: 30 }}
          animate={isInView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.6 }}
          className="text-center mb-12"
        >
          <h2 className="text-4xl md:text-5xl font-bold text-white mb-4">
            Our Vision & Mission
          </h2>
          <div className="w-24 h-1 bg-[var(--gold)] mx-auto" />
        </motion.div>

        <div className="grid md:grid-cols-2 gap-8">
          {/* Vision */}
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={isInView ? { opacity: 1, y: 0 } : {}}
            transition={{ duration: 0.6, delay: 0.2 }}
            className="group relative bg-white rounded-2xl p-8 shadow-xl hover:shadow-2xl transition-all duration-300 hover:scale-105"
          >
            <div className="absolute inset-0 bg-gradient-to-br from-[var(--gold)]/10 to-transparent rounded-2xl opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
            <div className="relative">
              <div className="w-16 h-16 bg-[var(--gold)]/10 rounded-full flex items-center justify-center mb-6">
                <Lightbulb className="w-8 h-8 text-[var(--gold)]" />
              </div>
              <h3 className="text-2xl font-bold text-[var(--navy)] mb-4">Vision</h3>
              {loading ? (
                <div className="space-y-2">
                  <div className="h-4 bg-gray-200 rounded animate-pulse" />
                  <div className="h-4 bg-gray-200 rounded animate-pulse w-4/5" />
                </div>
              ) : (
                <p className="text-lg text-gray-700 leading-relaxed">"{settings.vision}"</p>
              )}
            </div>
          </motion.div>

          {/* Mission */}
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={isInView ? { opacity: 1, y: 0 } : {}}
            transition={{ duration: 0.6, delay: 0.4 }}
            className="group relative bg-white rounded-2xl p-8 shadow-xl hover:shadow-2xl transition-all duration-300 hover:scale-105"
          >
            <div className="absolute inset-0 bg-gradient-to-br from-[var(--orange)]/10 to-transparent rounded-2xl opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
            <div className="relative">
              <div className="w-16 h-16 bg-[var(--orange)]/10 rounded-full flex items-center justify-center mb-6">
                <Target className="w-8 h-8 text-[var(--orange)]" />
              </div>
              <h3 className="text-2xl font-bold text-[var(--navy)] mb-4">Mission</h3>
              {loading ? (
                <div className="space-y-2">
                  <div className="h-4 bg-gray-200 rounded animate-pulse" />
                  <div className="h-4 bg-gray-200 rounded animate-pulse w-5/6" />
                  <div className="h-4 bg-gray-200 rounded animate-pulse w-4/6" />
                </div>
              ) : (
                <p className="text-lg text-gray-700 leading-relaxed">"{settings.mission}"</p>
              )}
            </div>
          </motion.div>
        </div>
      </div>
    </section>
  );
}
