import { useRef } from 'react';
import { motion } from 'motion/react';
import { useInView } from 'motion/react';
import { Clock, Calendar, Info } from 'lucide-react';
import { useApi } from '../../hooks/useApi';
import { api } from '../../lib/api';
import { STATIC_WORKING_HOURS, STATIC_SETTINGS } from '../../lib/staticData';
import type { WorkingHoursEntry } from '../../types';

export function WorkingHoursSection() {
  const ref = useRef(null);
  const isInView = useInView(ref, { once: true, amount: 0.3 });
  const { data: hours, loading } = useApi(api.workingHours.list, STATIC_WORKING_HOURS);
  const { data: settings } = useApi(api.settings.get, STATIC_SETTINGS);

  return (
    <section className="py-20 bg-[var(--navy)] relative overflow-hidden">
      <div
        className="absolute inset-0 opacity-5"
        style={{
          backgroundImage:
            'repeating-linear-gradient(45deg, transparent, transparent 35px, rgba(255,255,255,.1) 35px, rgba(255,255,255,.1) 70px)',
        }}
      />

      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
        <motion.div
          ref={ref}
          initial={{ opacity: 0, y: 30 }}
          animate={isInView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.6 }}
          className="text-center mb-12"
        >
          <div className="w-16 h-16 bg-[var(--gold)]/20 rounded-full flex items-center justify-center mx-auto mb-6">
            <Clock className="w-8 h-8 text-[var(--gold)]" />
          </div>
          <h2 className="text-4xl md:text-5xl font-bold text-white mb-4">Operating Hours</h2>
          <p className="text-gray-300 text-lg">
            Visit us during our operating hours for admissions, consultations, and campus inquiries
          </p>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={isInView ? { opacity: 1, scale: 1 } : {}}
          transition={{ duration: 0.6, delay: 0.2 }}
          className="bg-white rounded-2xl shadow-2xl overflow-hidden"
        >
          <div className="divide-y divide-gray-200">
            {loading
              ? Array.from({ length: 2 }).map((_, i) => (
                  <div key={i} className="flex items-center justify-between p-6 animate-pulse">
                    <div className="h-5 bg-gray-200 rounded w-40" />
                    <div className="h-5 bg-gray-200 rounded w-24" />
                  </div>
                ))
              : hours.map((entry) => (
                  <ScheduleRow key={entry.id} entry={entry} />
                ))}
          </div>

          <div className="bg-gradient-to-r from-[var(--gold)]/10 to-[var(--orange)]/10 p-6 border-t border-gray-200">
            <div className="flex items-start gap-4">
              <div className="flex-shrink-0">
                <Info className="w-6 h-6 text-[var(--orange)]" />
              </div>
              <div>
                <h4 className="font-semibold text-[var(--navy)] mb-1">Important Notice</h4>
                <p className="text-gray-700">
                  {settings.workingHoursNote ??
                    'Our admissions office is available during all operating hours. Walk-ins are welcome, but appointments are recommended for detailed consultations.'}
                </p>
              </div>
            </div>
          </div>
        </motion.div>
      </div>
    </section>
  );
}

function ScheduleRow({ entry }: { entry: WorkingHoursEntry }) {
  const timeLabel = entry.isOpen
    ? `${entry.openTime} – ${entry.closeTime ?? ''}`
    : 'Closed';

  return (
    <div className="flex items-center justify-between p-6 hover:bg-gray-50 transition-colors">
      <div className="flex items-center gap-4">
        <div className="flex-shrink-0">
          <Calendar
            className={`w-6 h-6 ${entry.isOpen ? 'text-[var(--orange)]' : 'text-gray-400'}`}
          />
        </div>
        <span className="text-lg font-semibold text-[var(--navy)]">{entry.day}</span>
      </div>
      <div className="flex items-center gap-3">
        <span className="text-lg text-gray-700">{timeLabel}</span>
        <span
          className={`px-3 py-1 rounded-full text-sm font-medium ${
            entry.isOpen ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'
          }`}
        >
          {entry.isOpen ? 'Open' : 'Closed'}
        </span>
      </div>
    </div>
  );
}
