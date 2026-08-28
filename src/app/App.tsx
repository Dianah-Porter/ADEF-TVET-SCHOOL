import { useEffect } from 'react';
import { Navbar } from './components/Navbar';
import { HeroSection } from './components/HeroSection';
import { AboutSection } from './components/AboutSection';
import { VisionMissionSection } from './components/VisionMissionSection';
import { CoursesSection } from './components/CoursesSection';
import { GallerySection } from './components/GallerySection';
import { AnnouncementsSection } from './components/AnnouncementsSection';
import { WhyChooseSection } from './components/WhyChooseSection';
import { WorkingHoursSection } from './components/WorkingHoursSection';
import { TestimonialsSection } from './components/TestimonialsSection';
import { ContactSection } from './components/ContactSection';
import { Footer } from './components/Footer';

export default function App() {
  useEffect(() => {
    // Smooth scroll behavior
    document.documentElement.style.scrollBehavior = 'smooth';
  }, []);

  return (
    <div id="home" className="min-h-screen bg-white">
      <Navbar />
      <main>
        <HeroSection />
        <AboutSection />
        <VisionMissionSection />
        <CoursesSection />
        <GallerySection />
        <AnnouncementsSection />
        <WhyChooseSection />
        <WorkingHoursSection />
        <TestimonialsSection />
        <ContactSection />
      </main>
      <Footer />
    </div>
  );
}
