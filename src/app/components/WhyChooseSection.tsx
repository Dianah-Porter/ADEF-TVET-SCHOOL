import { useRef } from 'react';
import { motion } from 'motion/react';
import { useInView } from 'motion/react';
import { Award, Hand, Users, Wrench, Briefcase, type LucideIcon } from 'lucide-react';
import { useApi } from '../../hooks/useApi';
import { api } from '../../lib/api';
import { STATIC_FEATURES } from '../../lib/staticData';
import type { Feature } from '../../types';

const ICON_MAP: Record<string, LucideIcon> = { Award, Hand, Users, Wrench, Briefcase };
const COLOR_MAP: Record<string, string> = {
  gold: 'var(--gold)',
  orange: 'var(--orange)',
  navy: 'var(--navy)',
  charcoal: 'var(--charcoal)',
};

export function WhyChooseSection() {
  const ref = useRef(null);
  const isInView = useInView(ref, { once: true, amount: 0.2 });
  const { data: features, loading } = useApi(api.features.list, STATIC_FEATURES);

  return (
    <section className="py-20 bg-gradient-to-b from-gray-50 to-white">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <motion.div
          ref={ref}
          initial={{ opacity: 0, y: 30 }}
          animate={isInView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.6 }}
          className="text-center mb-16"
        >
          <div className="inline-block px-4 py-2 bg-[var(--navy)]/10 rounded-full mb-4">
            <span className="text-[var(--navy)] font-semibold">Why Choose Us</span>
          </div>
          <h2 className="text-4xl md:text-5xl font-bold text-[var(--navy)] mb-4">
            Why Choose ADEF TVET School
          </h2>
          <p className="text-lg text-gray-600 max-w-2xl mx-auto">
            We provide comprehensive training that prepares you for a successful career
          </p>
        </motion.div>

        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
          {loading
            ? Array.from({ length: 5 }).map((_, i) => <FeatureSkeleton key={i} />)
            : features.map((feature, index) => (
                <FeatureCard key={feature.id} feature={feature} index={index} isInView={isInView} />
              ))}
        </div>
      </div>
    </section>
  );
}

function FeatureCard({
  feature,
  index,
  isInView,
}: {
  feature: Feature;
  index: number;
  isInView: boolean;
}) {
  const Icon = ICON_MAP[feature.iconName] ?? Award;
  const color = COLOR_MAP[feature.accentColor] ?? 'var(--gold)';

  return (
    <motion.div
      initial={{ opacity: 0, y: 30 }}
      animate={isInView ? { opacity: 1, y: 0 } : {}}
      transition={{ duration: 0.5, delay: index * 0.1 }}
      className="group bg-white rounded-xl p-6 shadow-md hover:shadow-xl transition-all duration-300 border border-gray-100 hover:border-[var(--gold)]"
    >
      <div
        className="w-14 h-14 rounded-lg flex items-center justify-center mb-4 group-hover:scale-110 transition-transform duration-300"
        style={{ backgroundColor: `${color}18` }}
      >
        <Icon className="w-7 h-7" style={{ color }} />
      </div>
      <h3 className="text-xl font-bold text-[var(--navy)] mb-3">{feature.title}</h3>
      <p className="text-gray-600 leading-relaxed">{feature.description}</p>
    </motion.div>
  );
}

function FeatureSkeleton() {
  return (
    <div className="bg-white rounded-xl p-6 shadow-md border border-gray-100 animate-pulse">
      <div className="w-14 h-14 bg-gray-200 rounded-lg mb-4" />
      <div className="h-5 bg-gray-200 rounded w-3/4 mb-3" />
      <div className="space-y-2">
        <div className="h-4 bg-gray-200 rounded" />
        <div className="h-4 bg-gray-200 rounded w-5/6" />
      </div>
    </div>
  );
}
