import { motion } from 'motion/react';
import { useInView } from 'motion/react';
import { useRef } from 'react';
import { Award, Hand, Users, Wrench, Briefcase } from 'lucide-react';

const features = [
  {
    icon: Award,
    title: 'Certified & Accredited Programs',
    description: 'Nationally recognized qualifications that meet industry standards',
    color: 'var(--gold)',
  },
  {
    icon: Hand,
    title: 'Hands-On Practical Learning',
    description: 'Real-world experience through intensive practical training sessions',
    color: 'var(--orange)',
  },
  {
    icon: Users,
    title: 'Skilled Professional Instructors',
    description: 'Learn from experienced industry professionals and certified trainers',
    color: 'var(--navy)',
  },
  {
    icon: Wrench,
    title: 'Industry Standard Equipment',
    description: 'Train with the same tools and technology used in the field',
    color: 'var(--charcoal)',
  },
  {
    icon: Briefcase,
    title: 'Career-Focused Training',
    description: 'Curriculum designed to meet local and international job market demands',
    color: 'var(--gold)',
  },
];

export function WhyChooseSection() {
  const ref = useRef(null);
  const isInView = useInView(ref, { once: true, amount: 0.2 });

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
          {features.map((feature, index) => (
            <FeatureCard key={feature.title} feature={feature} index={index} isInView={isInView} />
          ))}
        </div>
      </div>
    </section>
  );
}

function FeatureCard({ feature, index, isInView }: { feature: typeof features[0]; index: number; isInView: boolean }) {
  const Icon = feature.icon;

  return (
    <motion.div
      initial={{ opacity: 0, y: 30 }}
      animate={isInView ? { opacity: 1, y: 0 } : {}}
      transition={{ duration: 0.5, delay: index * 0.1 }}
      className="group bg-white rounded-xl p-6 shadow-md hover:shadow-xl transition-all duration-300 border border-gray-100 hover:border-[var(--gold)]"
    >
      <div
        className="w-14 h-14 rounded-lg flex items-center justify-center mb-4 group-hover:scale-110 transition-transform duration-300"
        style={{ backgroundColor: `${feature.color}15` }}
      >
        <Icon className="w-7 h-7" style={{ color: feature.color }} />
      </div>
      <h3 className="text-xl font-bold text-[var(--navy)] mb-3">{feature.title}</h3>
      <p className="text-gray-600 leading-relaxed">{feature.description}</p>
    </motion.div>
  );
}
