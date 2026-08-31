import { useState, useRef } from 'react';
import { motion } from 'motion/react';
import { useInView } from 'motion/react';
import { X } from 'lucide-react';
import Masonry from 'react-responsive-masonry';
import { ImageWithFallback } from './figma/ImageWithFallback';
import { useApi } from '../../hooks/useApi';
import { api } from '../../lib/api';
import { STATIC_GALLERY } from '../../lib/staticData';
import type { GalleryItem } from '../../types';

export function GallerySection() {
  const ref = useRef(null);
  const isInView = useInView(ref, { once: true, amount: 0.2 });
  const [selected, setSelected] = useState<GalleryItem | null>(null);
  const { data: galleryItems, loading } = useApi(api.gallery.list, STATIC_GALLERY);

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
          {loading ? (
            <div className="grid grid-cols-3 gap-4">
              {Array.from({ length: 9 }).map((_, i) => (
                <div key={i} className="aspect-square bg-gray-200 rounded-lg animate-pulse" />
              ))}
            </div>
          ) : (
            <>
              {/* Desktop masonry */}
              <Masonry columnsCount={3} gutter="1rem" className="hidden md:block">
                {galleryItems.map((item, index) => (
                  <GalleryImage
                    key={item.id}
                    item={item}
                    index={index}
                    onClick={() => setSelected(item)}
                  />
                ))}
              </Masonry>

              {/* Mobile grid */}
              <div className="grid grid-cols-2 gap-4 md:hidden">
                {galleryItems.map((item, index) => (
                  <GalleryImage
                    key={item.id}
                    item={item}
                    index={index}
                    onClick={() => setSelected(item)}
                  />
                ))}
              </div>
            </>
          )}
        </motion.div>
      </div>

      {/* Lightbox */}
      {selected && (
        <div
          className="fixed inset-0 z-50 bg-black/95 flex items-center justify-center p-4"
          onClick={() => setSelected(null)}
        >
          <button
            className="absolute top-4 right-4 text-white hover:text-[var(--gold)] transition-colors"
            onClick={() => setSelected(null)}
          >
            <X size={32} />
          </button>
          {selected.caption && (
            <p className="absolute bottom-6 left-1/2 -translate-x-1/2 text-white/80 text-sm">
              {selected.caption}
            </p>
          )}
          <motion.div
            initial={{ scale: 0.8, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className="max-w-5xl w-full"
          >
            <ImageWithFallback
              src={selected.imageUrl}
              alt={selected.altText ?? selected.caption ?? 'Gallery image'}
              className="w-full h-auto max-h-[90vh] object-contain rounded-lg"
            />
          </motion.div>
        </div>
      )}
    </section>
  );
}

function GalleryImage({
  item,
  index,
  onClick,
}: {
  item: GalleryItem;
  index: number;
  onClick: () => void;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.9 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: 0.4, delay: Math.min(index * 0.05, 0.6) }}
      className="relative overflow-hidden rounded-lg cursor-pointer group"
      onClick={onClick}
    >
      <ImageWithFallback
        src={item.thumbnailUrl ?? item.imageUrl}
        alt={item.altText ?? item.caption ?? `Gallery ${index + 1}`}
        loading="lazy"
        className="w-full h-auto object-cover group-hover:scale-110 transition-transform duration-500"
      />
      <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex items-end p-4">
        <span className="text-white font-semibold text-sm">
          {item.caption ?? 'View Full Image'}
        </span>
      </div>
    </motion.div>
  );
}
