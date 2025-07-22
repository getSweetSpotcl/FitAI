'use client';

import React from 'react';
import { DocsContent } from '@/components/docs';
import { Card, CardContent, Button } from '@/components/ui';
import { 
  Play, 
  BookOpen, 
  Brain, 
  Watch,
  BarChart3,
  Code,
  HelpCircle,
  ArrowRight,
  Zap,
  Download
} from 'lucide-react';

const quickStartItems = [
  {
    icon: Download,
    title: 'Descargar FitAI',
    description: 'Obtén la app desde el App Store y crea tu cuenta',
    href: '/docs/quickstart/installation',
    time: '2 min'
  },
  {
    icon: Play,
    title: 'Primer Entrenamiento',
    description: 'Configura tu perfil y realiza tu primera rutina con IA',
    href: '/docs/quickstart/first-workout',
    time: '10 min'
  },
  {
    icon: Watch,
    title: 'Conectar Apple Watch',
    description: 'Sincroniza tu Apple Watch para seguimiento avanzado',
    href: '/docs/apple-watch/setup',
    time: '5 min'
  },
];

const featuresItems = [
  {
    icon: Brain,
    title: 'Funciones IA',
    description: 'Generación de rutinas, coach personal y recomendaciones inteligentes',
    href: '/docs/ai',
    color: 'text-blue-400',
  },
  {
    icon: BarChart3,
    title: 'Analytics Premium',
    description: 'Reportes avanzados, detección de plateau y análisis de fatiga',
    href: '/docs/premium/analytics',
    color: 'text-purple-400',
  },
  {
    icon: Watch,
    title: 'Apple Watch',
    description: 'Seguimiento en tiempo real y sincronización con HealthKit',
    href: '/docs/apple-watch',
    color: 'text-green-400',
  },
  {
    icon: Code,
    title: 'API Reference',
    description: 'Documentación completa de nuestra API REST',
    href: '/docs/api',
    color: 'text-orange-400',
  },
];

export default function DocsHomePage() {
  return (
    <DocsContent showTableOfContents={false}>
      <div className="space-y-12">
        {/* Hero Section */}
        <div className="text-center py-8">
          <div className="w-16 h-16 energy-gradient rounded-2xl flex items-center justify-center mx-auto mb-6 animate-pulse-glow">
            <Zap className="w-8 h-8 text-white" />
          </div>
          <h1 className="text-5xl font-bold text-white mb-6">
            Bienvenido a FitAI Docs
          </h1>
          <p className="text-xl text-gray-300 max-w-3xl mx-auto mb-8">
            Todo lo que necesitas para dominar la app de fitness con IA más avanzada de Chile. 
            Desde tu primer entrenamiento hasta funciones premium.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Button 
              size="lg" 
              leftIcon={<Play className="w-5 h-5" />}
              onClick={() => window.location.href = '/docs/quickstart'}
            >
              Comenzar Ahora
            </Button>
            <Button 
              variant="outline" 
              size="lg"
              leftIcon={<BookOpen className="w-5 h-5" />}
              onClick={() => window.location.href = '/docs/guide'}
            >
              Guía Completa
            </Button>
          </div>
        </div>

        {/* Quick Start */}
        <section>
          <div className="flex items-center gap-3 mb-8">
            <div className="w-8 h-8 energy-gradient rounded-lg flex items-center justify-center">
              <Play className="w-4 h-4 text-white" />
            </div>
            <h2 className="text-3xl font-bold text-white">Inicio Rápido</h2>
          </div>
          
          <div className="grid md:grid-cols-3 gap-6">
            {quickStartItems.map((item, index) => {
              const Icon = item.icon;
              return (
                <div key={item.title}>
                  <Card 
                    variant="feature"
                    hover
                    onClick={() => window.location.href = item.href}
                    className="h-full group cursor-pointer"
                  >
                    <CardContent className="p-6">
                      <div className="flex items-start justify-between mb-4">
                        <div className="w-12 h-12 energy-gradient rounded-xl flex items-center justify-center group-hover:scale-110 transition-transform">
                          <Icon className="w-6 h-6 text-white" />
                        </div>
                        <span className="text-xs bg-orange-500/20 text-orange-400 px-2 py-1 rounded-full">
                          {item.time}
                        </span>
                      </div>
                      <h3 className="text-lg font-semibold text-white mb-2 group-hover:text-orange-400 transition-colors">
                        {item.title}
                      </h3>
                      <p className="text-gray-300 text-sm mb-4">
                        {item.description}
                      </p>
                      <div className="flex items-center text-orange-400 text-sm font-medium group-hover:gap-3 transition-all">
                        Comenzar
                        <ArrowRight className="w-4 h-4 ml-2 group-hover:ml-0 transition-all" />
                      </div>
                    </CardContent>
                  </Card>
                </div>
              );
            })}
          </div>
        </section>

        {/* Popular Features */}
        <section>
          <div className="flex items-center gap-3 mb-8">
            <div className="w-8 h-8 energy-gradient rounded-lg flex items-center justify-center">
              <BookOpen className="w-4 h-4 text-white" />
            </div>
            <h2 className="text-3xl font-bold text-white">Funciones Populares</h2>
          </div>
          
          <div className="grid md:grid-cols-2 gap-6">
            {featuresItems.map((item, index) => {
              const Icon = item.icon;
              return (
                <div key={item.title}>
                  <Card 
                    variant="glass"
                    hover
                    onClick={() => window.location.href = item.href}
                    className="p-6 group cursor-pointer"
                  >
                    <div className="flex items-start gap-4">
                      <div className={`w-12 h-12 rounded-xl flex items-center justify-center group-hover:scale-110 transition-transform ${
                        item.color === 'text-blue-400' ? 'bg-blue-500/10' :
                        item.color === 'text-purple-400' ? 'bg-purple-500/10' :
                        item.color === 'text-green-400' ? 'bg-green-500/10' :
                        'bg-orange-500/10'
                      }`}>
                        <Icon className={`w-6 h-6 ${item.color}`} />
                      </div>
                      <div className="flex-1">
                        <h3 className="text-lg font-semibold text-white mb-2 group-hover:text-orange-400 transition-colors">
                          {item.title}
                        </h3>
                        <p className="text-gray-300 text-sm">
                          {item.description}
                        </p>
                      </div>
                      <ArrowRight className="w-5 h-5 text-gray-500 group-hover:text-orange-400 group-hover:translate-x-1 transition-all" />
                    </div>
                  </Card>
                </div>
              );
            })}
          </div>
        </section>

        {/* Help Section */}
        <section>
          <Card variant="gradient" className="p-8 text-center">
            <CardContent className="p-0">
              <HelpCircle className="w-12 h-12 text-orange-400 mx-auto mb-4" />
              <h3 className="text-2xl font-bold text-white mb-4">
                ¿Necesitas Ayuda?
              </h3>
              <p className="text-gray-300 mb-6 max-w-2xl mx-auto">
                Nuestro equipo de soporte está aquí para ayudarte. Encuentra respuestas rápidas en nuestro FAQ 
                o contacta directamente con nosotros.
              </p>
              <div className="flex flex-col sm:flex-row gap-4 justify-center">
                <Button 
                  variant="primary"
                  leftIcon={<HelpCircle className="w-4 h-4" />}
                  onClick={() => window.location.href = '/docs/support/faq'}
                >
                  Ver FAQ
                </Button>
                <Button 
                  variant="outline"
                  onClick={() => window.location.href = '/docs/support/contact'}
                >
                  Contactar Soporte
                </Button>
              </div>
            </CardContent>
          </Card>
        </section>
      </div>
    </DocsContent>
  );
}