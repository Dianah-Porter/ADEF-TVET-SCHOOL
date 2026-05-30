import { motion } from 'motion/react';
import { useInView } from 'motion/react';
import { useRef } from 'react';
import { ImageWithFallback } from './figma/ImageWithFallback';
import { Flame, Hammer, Box } from 'lucide-react';
import weldingImg from '../../imports/image-18.png';
import masonryImg from '../../imports/image-10.png';
import carpentryImg from '../../imports/image-15.png';

const courses = [
  {
    title: 'Welding L3',
    description: 'Master modern welding techniques with practical industrial training.',
    image: weldingImg,
    icon: Flame,
    color: 'var(--orange)',
  },
  {
    title: 'Masonry L3',
    description: 'Develop strong construction and structural building skills.',
    image: masonryImg,
    icon: Hammer,
    color: 'var(--gold)',
  },
  {
    title: 'Carpentry L3',
    description: 'Learn professional woodworking and craftsmanship techniques.',
    image: carpentryImg,
    icon: Box,
    color: 'var(--charcoal)',
  },
];

export function CoursesSection() {
  const ref = useRef(null);
  const isInView = useInView(ref, { once: true, amount: 0.2 });

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
          {courses.map((course, index) => (
            <CourseCard key={course.title} course={course} index={index} isInView={isInView} />
          ))}
        </div>
      </div>
    </section>
  );
}

function CourseCard({ course, index, isInView }: { course: typeof courses[0]; index: number; isInView: boolean }) {
  const Icon = course.icon;

  return (
    <motion.div
      initial={{ opacity: 0, y: 50 }}
      animate={isInView ? { opacity: 1, y: 0 } : {}}
      transition={{ duration: 0.6, delay: index * 0.2 }}
      className="group relative bg-white rounded-2xl overflow-hidden shadow-lg hover:shadow-2xl transition-all duration-300"
    >
      {/* Image */}
      <div className="relative h-64 overflow-hidden">
        <ImageWithFallback
          src={course.image}
          alt={course.title}
          className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/40 to-transparent" />
        
        {/* Icon */}
        <div 
          className="absolute top-4 right-4 w-12 h-12 bg-white/90 rounded-full flex items-center justify-center shadow-lg"
          style={{ color: course.color }}
        >
          <Icon className="w-6 h-6" />
        </div>

        {/* Title Overlay */}
        <div className="absolute bottom-4 left-4 right-4">
          <h3 className="text-2xl font-bold text-white mb-1">{course.title}</h3>
        </div>
      </div>

      {/* Content */}
      <div className="p-6">
        <p className="text-gray-700 leading-relaxed mb-4">
          {course.description}
        </p>
        <button 
          className="text-[var(--orange)] font-semibold hover:text-[var(--orange)]/80 transition-colors flex items-center gap-2 group-hover:gap-3 transition-all"
        >
          Learn More
          <span>→</span>
        </button>
      </div>

      {/* Hover Border Effect */}
      <div 
        className="absolute inset-0 border-2 border-transparent group-hover:border-[var(--gold)] rounded-2xl transition-all duration-300 pointer-events-none"
      />
    </motion.div>
  );
}
