/**
 * Static fallback data used when no backend API is configured.
 * All image imports live here so components are purely presentational.
 */

import type {
  Course,
  Testimonial,
  GalleryItem,
  WorkingHoursEntry,
  SiteSettings,
  Feature,
  HeroSlide,
} from '../types';

// ---------------------------------------------------------------------------
// Image imports
// ---------------------------------------------------------------------------

// Hero images
import heroImg1 from '../imports/image-2.png';
import heroImg2 from '../imports/image.png';
import heroImg3 from '../imports/image-1.png';
import heroImg4 from '../imports/image-3.png';
import heroImg5 from '../imports/image-4.png';

// Course images
import weldingImg from '../imports/image-18.png';
import masonryImg from '../imports/image-10.png';
import carpentryImg from '../imports/image-15.png';

// About image
import aboutImg from '../imports/image-13.png';

// Gallery images (21 total; image-10, -15, -18 are used for courses)
import gImg1 from '../imports/image-12.png';
import gImg2 from '../imports/image-19.png';
import gImg3 from '../imports/image-11.png';
import gImg4 from '../imports/image-20.png';
import gImg5 from '../imports/image-16.png';
import gImg6 from '../imports/image-21.png';
import gImg7 from '../imports/image-17.png';
import gImg8 from '../imports/image-22.png';
import gImg9 from '../imports/image-9.png';
import gImg10 from '../imports/image-23.png';
import gImg11 from '../imports/image-14.png';
import gImg12 from '../imports/image-24.png';
import gImg13 from '../imports/image-5.png';
import gImg14 from '../imports/image-6.png';
import gImg15 from '../imports/image-7.png';
import gImg16 from '../imports/image-8.png';
import gImg17 from '../imports/image-2.png';
import gImg18 from '../imports/image.png';
import gImg19 from '../imports/image-1.png';
import gImg20 from '../imports/image-3.png';
import gImg21 from '../imports/image-4.png';

// ---------------------------------------------------------------------------
// Exported fallback data
// ---------------------------------------------------------------------------

export const STATIC_HERO_SLIDES: HeroSlide[] = [
  { id: '1', imageUrl: heroImg1 as unknown as string },
  { id: '2', imageUrl: heroImg2 as unknown as string },
  { id: '3', imageUrl: heroImg3 as unknown as string },
  { id: '4', imageUrl: heroImg4 as unknown as string },
  { id: '5', imageUrl: heroImg5 as unknown as string },
];

export const STATIC_ABOUT_IMAGE: string = aboutImg as unknown as string;

export const STATIC_COURSES: Course[] = [
  {
    id: '1',
    title: 'Welding L3',
    description: 'Master modern welding techniques with practical industrial training.',
    imageUrl: weldingImg as unknown as string,
    iconName: 'Flame',
    accentColor: 'orange',
  },
  {
    id: '2',
    title: 'Masonry L3',
    description: 'Develop strong construction and structural building skills.',
    imageUrl: masonryImg as unknown as string,
    iconName: 'Hammer',
    accentColor: 'gold',
  },
  {
    id: '3',
    title: 'Carpentry L3',
    description: 'Learn professional woodworking and craftsmanship techniques.',
    imageUrl: carpentryImg as unknown as string,
    iconName: 'Box',
    accentColor: 'charcoal',
  },
];

export const STATIC_GALLERY: GalleryItem[] = [
  gImg1, gImg2, gImg3, gImg4, gImg5, gImg6, gImg7, gImg8, gImg9, gImg10,
  gImg11, gImg12, gImg13, gImg14, gImg15, gImg16, gImg17, gImg18, gImg19,
  gImg20, gImg21,
].map((src, i) => ({ id: String(i + 1), imageUrl: src as unknown as string }));

export const STATIC_TESTIMONIALS: Testimonial[] = [
  {
    id: '1',
    name: 'Jean Pierre Mukiza',
    course: 'Welding L3 Graduate',
    text: 'ADEF gave me practical skills that prepared me for real employment opportunities. The hands-on training was exactly what I needed.',
    rating: 5,
  },
  {
    id: '2',
    name: 'Marie Claire Uwase',
    course: 'Masonry L3 Graduate',
    text: 'The hands-on approach makes learning engaging and effective. I gained confidence in my abilities and found a great job right after graduation.',
    rating: 5,
  },
  {
    id: '3',
    name: 'Eric Niyonzima',
    course: 'Carpentry L3 Graduate',
    text: 'Professional instructors and modern equipment made all the difference. ADEF TVET truly prepares you for the workforce.',
    rating: 5,
  },
  {
    id: '4',
    name: 'Grace Mutoni',
    course: 'Welding L3 Graduate',
    text: 'I highly recommend ADEF to anyone looking for quality vocational training. The certification opened many doors for me.',
    rating: 5,
  },
];

export const STATIC_WORKING_HOURS: WorkingHoursEntry[] = [
  { id: '1', day: 'Monday – Saturday', openTime: '7:30 AM', closeTime: '5:00 PM', isOpen: true },
  { id: '2', day: 'Sunday', openTime: '', closeTime: null, isOpen: false },
];

export const STATIC_SETTINGS: SiteSettings = {
  schoolName: 'ADEF TVET School',
  tagline: 'Technical & Vocational Education',
  vision: 'To become the Referral TVET School in East Africa.',
  mission:
    'Empower and prepare students to deliver on high level standards of hands-on skills to meet local and international labour market.',
  aboutTitle: 'Leading Technical & Vocational Training Institution',
  aboutText:
    'ADEF TVET School is dedicated to providing world-class technical and vocational education that bridges the gap between classroom learning and real-world industry demands.',
  aboutText2:
    'Our institution focuses on practical, industry-ready education that empowers students with the hands-on skills and knowledge needed to excel in local and international labor markets.',
  graduatesCount: '100+',
  programsCount: 3,
  phone: '+250 789 895 800',
  whatsapp: '+250789895800',
  email: 'adeftvet@gmail.com',
  address: 'NR5, Kigali, Rwanda',
  mapEmbedUrl:
    'https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d3987.5162978834844!2d30.0588735!3d-1.9440271!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0x0%3A0x0!2zMcKwNTYnMzguNSJTIDMwwrAwMyczMS41IkU!5e0!3m2!1sen!2srw!4v1234567890',
  instagramUrl: 'https://instagram.com/adef_tvet_school',
  twitterUrl: 'https://twitter.com/AdefTvet',
  workingHoursNote:
    'Our admissions office is available during all operating hours. Walk-ins are welcome, but appointments are recommended for detailed consultations.',
};

export const STATIC_FEATURES: Feature[] = [
  {
    id: '1',
    title: 'Certified & Accredited Programs',
    description: 'Nationally recognized qualifications that meet industry standards',
    iconName: 'Award',
    accentColor: 'gold',
  },
  {
    id: '2',
    title: 'Hands-On Practical Learning',
    description: 'Real-world experience through intensive practical training sessions',
    iconName: 'Hand',
    accentColor: 'orange',
  },
  {
    id: '3',
    title: 'Skilled Professional Instructors',
    description: 'Learn from experienced industry professionals and certified trainers',
    iconName: 'Users',
    accentColor: 'navy',
  },
  {
    id: '4',
    title: 'Industry Standard Equipment',
    description: 'Train with the same tools and technology used in the field',
    iconName: 'Wrench',
    accentColor: 'charcoal',
  },
  {
    id: '5',
    title: 'Career-Focused Training',
    description: 'Curriculum designed to meet local and international job market demands',
    iconName: 'Briefcase',
    accentColor: 'gold',
  },
];
