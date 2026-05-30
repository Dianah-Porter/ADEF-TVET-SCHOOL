import { useState } from 'react';
import { motion } from 'motion/react';
import { useInView } from 'motion/react';
import { useRef } from 'react';
import { ImageWithFallback } from './figma/ImageWithFallback';
import { X } from 'lucide-react';
import Masonry from 'react-responsive-masonry';
import img1 from '../../imports/image-2.png';
import img2 from '../../imports/image.png';
import img3 from '../../imports/image-1.png';
import img4 from '../../imports/image-3.png';
import img5 from '../../imports/image-4.png';
import img6 from '../../imports/image-5.png';
import img7 from '../../imports/image-6.png';
import img8 from '../../imports/image-7.png';
import img9 from '../../imports/image-8.png';
import img10 from '../../imports/image-9.png';
import img12 from '../../imports/image-11.png';
import img13 from '../../imports/image-12.png';
import img14 from '../../imports/image-14.png';
import img16 from '../../imports/image-16.png';
import img17 from '../../imports/image-17.png';
import img19 from '../../imports/image-19.png';
import img20 from '../../imports/image-20.png';
import img21 from '../../imports/image-21.png';
import img22 from '../../imports/image-22.png';
import img23 from '../../imports/image-23.png';
import img24 from '../../imports/image-24.png';

// Removed image-10, image-15, and image-18 as they are used in Courses Section
const galleryImages = [
  img13, img19, img12, img20, img16, img21, img17, img22, img10, 
  img23, img14, img24, img6, img7, img8, img9, img1, img2, img3, img4, img5
];

export function GallerySection() {
  const ref = useRef(null);
  const isInView = useInView(ref, { once: true, amount: 0.2 });
  const [selectedImage, setSelectedImage] = useState<string | null>(null);

  return (
    <section id="gallery" className="py-20 bg-white">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <motion.div
          ref={ref}
          initial={{ opacity: 0, y: 30 }}
          animate={isInView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.6 }}
          className="text-center mb-12"
        >
          <div className="inline-block px-4 py-2 bg-[var(--gold)]/10 rounded-full mb-4">
            <span className="text-[var(--gold)] font-semibold">Our Campus</span>
          </div>
          <h2 className="text-4xl md:text-5xl font-bold text-[var(--navy)] mb-4">
            Student Work & Training Environment
          </h2>
          <p className="text-lg text-gray-600 max-w-2xl mx-auto">
            Experience our state-of-the-art facilities and see our students in action
          </p>
        </motion.div>

        <motion.div
          initial={{ opacity: 0 }}
          animate={isInView ? { opacity: 1 } : {}}
          transition={{ duration: 0.8, delay: 0.3 }}
        >
          <Masonry columnsCount={3} gutter="1rem" className="hidden md:block">
            {galleryImages.map((img, index) => (
              <GalleryImage
                key={index}
                src={img}
                index={index}
                onClick={() => setSelectedImage(img)}
              />
            ))}
          </Masonry>

          {/* Mobile Grid */}
          <div className="grid grid-cols-2 gap-4 md:hidden">
            {galleryImages.map((img, index) => (
              <GalleryImage
                key={index}
                src={img}
                index={index}
                onClick={() => setSelectedImage(img)}
              />
            ))}
          </div>
        </motion.div>
      </div>

      {/* Lightbox */}
      {selectedImage && (
        <div
          className="fixed inset-0 z-50 bg-black/95 flex items-center justify-center p-4"
          onClick={() => setSelectedImage(null)}
        >
          <button
            className="absolute top-4 right-4 text-white hover:text-[var(--gold)] transition-colors"
            onClick={() => setSelectedImage(null)}
          >
            <X size={32} />
          </button>
          <motion.div
            initial={{ scale: 0.8, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.8, opacity: 0 }}
            className="max-w-5xl w-full"
          >
            <ImageWithFallback
              src={selectedImage}
              alt="Gallery Image"
              className="w-full h-auto max-h-[90vh] object-contain rounded-lg"
            />
          </motion.div>
        </div>
      )}
    </section>
  );
}

function GalleryImage({ src, index, onClick }: { src: string; index: number; onClick: () => void }) {
  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.9 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: 0.4, delay: index * 0.1 }}
      className="relative overflow-hidden rounded-lg cursor-pointer group"
      onClick={onClick}
    >
      <ImageWithFallback
        src={src}
        alt={`Gallery ${index + 1}`}
        className="w-full h-auto object-cover group-hover:scale-110 transition-transform duration-500"
      />
      <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex items-end p-4">
        <span className="text-white font-semibold">View Full Image</span>
      </div>
    </motion.div>
  );
}