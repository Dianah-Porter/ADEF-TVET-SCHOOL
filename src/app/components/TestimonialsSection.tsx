import { motion } from 'motion/react';
import { useInView } from 'motion/react';
import { useRef } from 'react';
import Slider from 'react-slick';
import { Star, Quote } from 'lucide-react';
import 'slick-carousel/slick/slick.css';
import 'slick-carousel/slick/slick-theme.css';

const testimonials = [
  {
    name: 'Jean Pierre Mukiza',
    course: 'Welding L3 Graduate',
    text: 'ADEF gave me practical skills that prepared me for real employment opportunities. The hands-on training was exactly what I needed.',
    rating: 5,
  },
  {
    name: 'Marie Claire Uwase',
    course: 'Masonry L3 Graduate',
    text: 'The hands-on approach makes learning engaging and effective. I gained confidence in my abilities and found a great job right after graduation.',
    rating: 5,
  },
  {
    name: 'Eric Niyonzima',
    course: 'Carpentry L3 Graduate',
    text: 'Professional instructors and modern equipment made all the difference. ADEF TVET truly prepares you for the workforce.',
    rating: 5,
  },
  {
    name: 'Grace Mutoni',
    course: 'Welding L3 Graduate',
    text: 'I highly recommend ADEF to anyone looking for quality vocational training. The certification opened many doors for me.',
    rating: 5,
  },
];

export function TestimonialsSection() {
  const ref = useRef(null);
  const isInView = useInView(ref, { once: true, amount: 0.2 });

  const settings = {
    dots: true,
    infinite: true,
    speed: 500,
    slidesToShow: 3,
    slidesToScroll: 1,
    autoplay: true,
    autoplaySpeed: 5000,
    pauseOnHover: true,
    responsive: [
      {
        breakpoint: 1024,
        settings: {
          slidesToShow: 2,
        },
      },
      {
        breakpoint: 640,
        settings: {
          slidesToShow: 1,
        },
      },
    ],
  };

  return (
    <section className="py-20 bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <motion.div
          ref={ref}
          initial={{ opacity: 0, y: 30 }}
          animate={isInView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.6 }}
          className="text-center mb-12"
        >
          <div className="inline-block px-4 py-2 bg-[var(--orange)]/10 rounded-full mb-4">
            <span className="text-[var(--orange)] font-semibold">Student Success</span>
          </div>
          <h2 className="text-4xl md:text-5xl font-bold text-[var(--navy)] mb-4">
            What Our Graduates Say
          </h2>
          <p className="text-lg text-gray-600 max-w-2xl mx-auto">
            Hear from our successful graduates who transformed their careers through ADEF TVET
          </p>
        </motion.div>

        <motion.div
          initial={{ opacity: 0 }}
          animate={isInView ? { opacity: 1 } : {}}
          transition={{ duration: 0.8, delay: 0.3 }}
          className="testimonials-slider"
        >
          <Slider {...settings}>
            {testimonials.map((testimonial, index) => (
              <div key={index} className="px-4">
                <TestimonialCard testimonial={testimonial} />
              </div>
            ))}
          </Slider>
        </motion.div>
      </div>
    </section>
  );
}

function TestimonialCard({ testimonial }: { testimonial: typeof testimonials[0] }) {
  return (
    <div className="bg-white rounded-2xl p-8 shadow-lg hover:shadow-xl transition-shadow duration-300 h-full">
      <div className="flex items-center justify-between mb-6">
        <div className="flex gap-1">
          {[...Array(testimonial.rating)].map((_, i) => (
            <Star key={i} className="w-5 h-5 fill-[var(--gold)] text-[var(--gold)]" />
          ))}
        </div>
        <Quote className="w-10 h-10 text-[var(--gold)]/20" />
      </div>

      <p className="text-gray-700 leading-relaxed mb-6 italic">
        "{testimonial.text}"
      </p>

      <div className="border-t border-gray-200 pt-4">
        <h4 className="font-bold text-[var(--navy)]">{testimonial.name}</h4>
        <p className="text-sm text-gray-600">{testimonial.course}</p>
      </div>
    </div>
  );
}
