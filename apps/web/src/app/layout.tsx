import type { Metadata, Viewport } from "next";
import { Inter } from "next/font/google";
import { ClerkProvider } from '@clerk/nextjs';
import { esES } from '@clerk/localizations';
import "./globals.css";

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "FitAI - Fitness con Inteligencia Artificial para Chile",
  description: "La primera app de fitness con IA diseñada para Chile. Rutinas personalizadas, Apple Watch, analytics avanzados y pagos con MercadoPago.",
  keywords: "fitness, inteligencia artificial, entrenamiento, Chile, Apple Watch, MercadoPago, rutinas personalizadas",
  authors: [{ name: "FitAI Team" }],
  creator: "FitAI",
  publisher: "FitAI",
  openGraph: {
    type: "website",
    locale: "es_CL",
    url: "https://fitai.cl",
    title: "FitAI - Fitness con IA para Chile",
    description: "Entrena inteligente con rutinas personalizadas por IA, seguimiento Apple Watch y analytics avanzados.",
    siteName: "FitAI",
  },
  twitter: {
    card: "summary_large_image",
    title: "FitAI - Fitness con IA para Chile",
    description: "Entrena inteligente con rutinas personalizadas por IA, seguimiento Apple Watch y analytics avanzados.",
  },
  robots: {
    index: true,
    follow: true,
  },
};

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <ClerkProvider localization={esES}>
      <html lang="es" className="scroll-smooth">
        <body
          className={`${inter.variable} font-sans antialiased bg-gray-900 text-white`}
        >
          {children}
        </body>
      </html>
    </ClerkProvider>
  );
}
