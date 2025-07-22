'use client';

import { NavbarSimple as Navbar } from '@/components/landing/NavbarSimple';
import { HeroSimple as Hero } from '@/components/landing/HeroSimple';
import { FooterSimple as Footer } from '@/components/landing/FooterSimple';

export default function HomePage() {
  return (
    <main className="min-h-screen">
      <Navbar />
      <Hero />
      <Footer />
    </main>
  );
}