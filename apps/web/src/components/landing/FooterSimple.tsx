'use client';

import React from 'react';
import { Button } from '../ui';
import { 
  Download, 
  Mail, 
  MapPin, 
  Phone, 
  ExternalLink,
  Instagram,
  Twitter,
  Youtube,
  Shield,
  FileText,
  Heart
} from 'lucide-react';

export const FooterSimple: React.FC = () => {
  const footerLinks = {
    product: {
      title: 'Producto',
      links: [
        { label: 'Características', href: '#features' },
        { label: 'Precios', href: '#pricing' },
        { label: 'Actualizaciones', href: '#' },
        { label: 'Roadmap', href: '#' },
      ]
    },
    resources: {
      title: 'Recursos',
      links: [
        { label: 'Documentación', href: '/docs' },
        { label: 'Guías de Entrenamiento', href: '/docs/guides' },
        { label: 'API', href: '/docs/api' },
        { label: 'Blog', href: '#' },
      ]
    },
    support: {
      title: 'Soporte',
      links: [
        { label: 'Centro de Ayuda', href: '/docs/support' },
        { label: 'Comunidad', href: '#' },
        { label: 'Estado del Servicio', href: '#' },
        { label: 'Reportar Bug', href: '#' },
      ]
    },
    company: {
      title: 'Empresa',
      links: [
        { label: 'Acerca de', href: '#' },
        { label: 'Carreras', href: '#' },
        { label: 'Prensa', href: '#' },
        { label: 'Contacto', href: '#contact' },
      ]
    }
  };

  const socialLinks = [
    { icon: Instagram, href: '#', label: 'Instagram' },
    { icon: Twitter, href: '#', label: 'Twitter' },
    { icon: Youtube, href: '#', label: 'YouTube' },
  ];

  const scrollToSection = (href: string) => {
    if (href.startsWith('#')) {
      const element = document.querySelector(href);
      if (element) {
        element.scrollIntoView({ behavior: 'smooth' });
      }
    }
  };

  return (
    <footer id="footer" className="relative bg-gray-900 border-t border-gray-800">
      {/* CTA Section */}
      <div className="relative py-20">
        <div className="absolute inset-0 hero-gradient opacity-10" />
        <div className="container-custom relative z-10">
          <div className="text-center">
            <h2 className="text-4xl md:text-5xl font-bold text-white mb-6">
              ¿Listo para Transformar tu Fitness?
            </h2>
            <p className="text-xl text-gray-300 mb-8 max-w-2xl mx-auto">
              Únete a miles de usuarios que ya están entrenando más inteligente con FitAI.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center items-center">
              <Button 
                size="lg" 
                leftIcon={<Download className="w-5 h-5" />}
                className="animate-pulse-glow"
              >
                Descargar para iPhone
              </Button>
              <p className="text-sm text-gray-400">
                Disponible en App Store • Gratis
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Main Footer */}
      <div className="py-16 border-t border-gray-800">
        <div className="container-custom">
          <div className="grid lg:grid-cols-6 gap-8 lg:gap-12">
            {/* Brand Column */}
            <div className="lg:col-span-2">
              <div>
                {/* Logo */}
                <div className="flex items-center gap-3 mb-6">
                  <div className="w-12 h-12 energy-gradient rounded-xl flex items-center justify-center energy-shadow">
                    <span className="text-white font-bold text-xl">⚡</span>
                  </div>
                  <span className="text-3xl font-bold bg-gradient-to-r from-orange-400 to-orange-600 bg-clip-text text-transparent">
                    FitAI
                  </span>
                </div>

                <p className="text-gray-300 mb-6 leading-relaxed">
                  La primera aplicación de fitness con inteligencia artificial diseñada 
                  específicamente para Chile. Entrena inteligente, progresa más rápido.
                </p>

                {/* Contact Info */}
                <div className="space-y-3 text-sm text-gray-400">
                  <div className="flex items-center gap-3">
                    <Mail className="w-4 h-4" />
                    <span>soporte@fitai.cl</span>
                  </div>
                  <div className="flex items-center gap-3">
                    <MapPin className="w-4 h-4" />
                    <span>Santiago, Chile</span>
                  </div>
                  <div className="flex items-center gap-3">
                    <Phone className="w-4 h-4" />
                    <span>+56 9 1234 5678</span>
                  </div>
                </div>

                {/* Social Links */}
                <div className="flex gap-4 mt-6">
                  {socialLinks.map((social) => {
                    const Icon = social.icon;
                    return (
                      <a
                        key={social.label}
                        href={social.href}
                        className="w-10 h-10 glass-effect rounded-lg flex items-center justify-center text-gray-400 hover:text-white hover:border-orange-500/50 transition-all hover:scale-110"
                        aria-label={social.label}
                      >
                        <Icon className="w-5 h-5" />
                      </a>
                    );
                  })}
                </div>
              </div>
            </div>

            {/* Links Columns */}
            {Object.entries(footerLinks).map(([key, section]) => (
              <div key={key}>
                <h3 className="text-white font-semibold mb-4">{section.title}</h3>
                <ul className="space-y-3">
                  {section.links.map((link) => (
                    <li key={link.label}>
                      <button
                        onClick={() => {
                          if (link.href.startsWith('/')) {
                            window.open(link.href, '_blank');
                          } else if (link.href.startsWith('#')) {
                            scrollToSection(link.href);
                          }
                        }}
                        className="text-gray-400 hover:text-white transition-colors flex items-center gap-1 text-sm group"
                      >
                        {link.label}
                        {link.href.startsWith('/') && (
                          <ExternalLink className="w-3 h-3 opacity-0 group-hover:opacity-100 transition-opacity" />
                        )}
                      </button>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Bottom Bar */}
      <div className="py-6 border-t border-gray-800">
        <div className="container-custom">
          <div className="flex flex-col md:flex-row justify-between items-center gap-4">
            <div className="flex items-center gap-4 text-sm text-gray-400">
              <span>© 2024 FitAI. Todos los derechos reservados.</span>
            </div>

            <div className="flex items-center gap-6 text-sm">
              <button className="text-gray-400 hover:text-white transition-colors flex items-center gap-1">
                <Shield className="w-4 h-4" />
                Privacidad
              </button>
              <button className="text-gray-400 hover:text-white transition-colors flex items-center gap-1">
                <FileText className="w-4 h-4" />
                Términos
              </button>
              <div className="flex items-center gap-1 text-gray-400">
                <span>Hecho con</span>
                <Heart className="w-4 h-4 text-red-400" />
                <span>en Chile</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </footer>
  );
};