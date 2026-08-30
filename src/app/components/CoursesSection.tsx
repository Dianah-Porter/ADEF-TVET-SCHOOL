import { useRef } from 'react';
import { motion } from 'motion/react';
import { useInView } from 'motion/react';
import { Flame, Hammer, Box, type LucideIcon } from 'lucide-react';
import { ImageWithFallback } from './figma/ImageWithFallback';
import { useApi } from '../../hooks/useApi';
import { api } from '../../lib/api';
import { STATIC_COURSES } from '../../lib/staticData';
import type { Course } from '../../types';

const ICON_MAP: Record<string, LucideIcon> = { Flame, Hammer, Box };
const COLOR_MAP: Record<string, string> = {
  orange: 'var(--orange)',
  gold: 'var(--gold)',
  charcoal: 'var(--charcoal)',
  navy: 'var(--navy)',
};

export function CoursesSection() {
  const ref = useRef(null);
  const isInView = useInView(ref, { once: true, amount: 0.2 });
  const { data: courses, loading } = useApi(api.courses.list, STATIC_COURSES);

  return (
    <section id="courses" className="py-20 bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <motion.div
          ref={ref}
          initial={{ opacity: 0, y: 30 }}
          animate={isInView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.6 }}
          className="text-center mb-16"
        >
          <div className="inline-block px-4 py-2 bg-[var(--orange)]/10 rounded-full mb-4">
            <span className="text-[var(--orange)] font-semibold">Our Programs</span>
          </div>
          <h2 className="text-4xl md:text-5xl font-bold text-[var(--navy)] mb-4">
            Our Accredited Training Programs
          </h2>
          <p className="text-lg text-gray-600 max-w-2xl mx-auto">
            Industry-recognized certifications designed to equip you with practical skills for real-world success
          </p>
        </motion.div>

        <div className="grid md:grid-cols-3 gap-8">
          {loading
            ? Array.from({ length: 3 }).map((_, i) => <CourseSkeleton key={i} />)
            : courses.map((course, index) => (
                <CourseCard key={course.id} course={course} index={index} isInView={isInView} />
              ))}
        </div>
      </div>
    </section>
  );
}

function CourseCard({
  course,
  index,
  isInView,
}: {
  course: Course;
  index: number;
  isInView: boolean;
}) {
  const Icon = ICON_MAP[course.iconName] ?? Flame;
  const color = COLOR_MAP[course.accentColor] ?? 'var(--orange)';

  return (
    <motion.div
      initial={{ opacity: 0, y: 50 }}
      animate={isInView ? { opacity: 1, y: 0 } : {}}
      transition={{ duration: 0.6, delay: index * 0.2 }}
      className="group relative bg-white rounded-2xl overflow-hidden shadow-lg hover:shadow-2xl transition-all duration-300"
    >
      <div className="relative h-64 overflow-hidden">
        <ImageWithFallback
          src={course.imageUrl}
          alt={course.title}
          className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/40 to-transparent" />
        <div
          className="absolute top-4 right-4 w-12 h-12 bg-white/90 rounded-full flex items-center justify-center shadow-lg"
          style={{ color }}
        >
          <Icon className="w-6 h-6" />
        </div>
        <div className="absolute bottom-4 left-4 right-4">
          <h3 className="text-2xl font-bold text-white mb-1">{course.title}</h3>
          {course.level && (
            <span className="text-xs text-white/70 uppercase tracking-wider">{course.level}</span>
          )}
        </div>
      </div>

      <div className="p-6">
        <p className="text-gray-700 leading-relaxed mb-4">{course.description}</p>
        {course.duration && (
          <p className="text-sm text-gray-500 mb-4">Duration: {course.duration}</p>
        )}
        <button
          className="text-[var(--orange)] font-semibold hover:text-[var(--orange)]/80 transition-colors flex items-center gap-2 group-hover:gap-3 transition-all"
        >
          Learn More <span>→</span>
        </button>
      </div>

      <div className="absolute inset-0 border-2 border-transparent group-hover:border-[var(--gold)] rounded-2xl transition-all duration-300 pointer-events-none" />
    </motion.div>
  );
}

function CourseSkeleton() {
  return (
    <div className="bg-white rounded-2xl overflow-hidden shadow-lg animate-pulse">
      <div className="h-64 bg-gray-200" />
      <div className="p-6 space-y-3">
        <div className="h-4 bg-gray-200 rounded w-3/4" />
        <div className="h-4 bg-gray-200 rounded w-full" />
        <div className="h-4 bg-gray-200 rounded w-1/2" />
      </div>
    </div>
  );
}
