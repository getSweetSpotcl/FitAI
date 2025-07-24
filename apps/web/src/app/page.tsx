"use client";

import { FooterSimple as Footer } from "@/components/landing/FooterSimple";
import { HeroSimple as Hero } from "@/components/landing/HeroSimple";
import { NavbarSimple as Navbar } from "@/components/landing/NavbarSimple";

// Force dynamic rendering for Clerk hooks
export const dynamic = "force-dynamic";

export default function HomePage() {
  return (
    <main className="min-h-screen">
      <Navbar />
      <Hero />
      <Footer />
    </main>
  );
}
