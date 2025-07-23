'use client';

import React from 'react';
import { useRouter } from 'next/navigation';
import { useUser } from '@clerk/nextjs';
import { Button } from '../ui';
import { Download, Play } from 'lucide-react';

export const HeroSimple: React.FC = () => {
  const router = useRouter();
  const { isSignedIn } = useUser();

  const handleGetStarted = () => {
    if (isSignedIn) {
      router.push('/dashboard');
    } else {
      router.push('/sign-up');
    }
  };

  const handleDemo = () => {
    // For now, scroll to features or redirect to a demo page
    const element = document.querySelector('#features');
    if (element) {
      element.scrollIntoView({ behavior: 'smooth' });
    }
  };

  return (
    <section className="relative min-h-screen flex items-center justify-center overflow-hidden">
      {/* Background gradient */}
      <div className="absolute inset-0 hero-gradient" />
      
      {/* Animated background elements */}
      <div className="absolute inset-0 opacity-30">
        <div className="absolute top-20 left-10 w-72 h-72 bg-orange-500/20 rounded-full blur-3xl animate-pulse" />
        <div className="absolute bottom-20 right-10 w-96 h-96 bg-purple-500/20 rounded-full blur-3xl animate-pulse" />
      </div>

      <div className="container-custom relative z-10">
        <div className="grid lg:grid-cols-2 gap-12 lg:gap-20 items-center">
          {/* Left side - Content */}
          <div className="text-center lg:text-left">
            {/* Badge */}
            <div className="inline-flex items-center gap-2 glass-effect px-4 py-2 rounded-full text-sm font-medium text-white mb-8">
              <span className="w-2 h-2 bg-green-400 rounded-full animate-pulse" />
              Primera App de Fitness con IA para Chile
            </div>

            {/* Main heading */}
            <h1 className="text-5xl md:text-6xl lg:text-7xl font-bold text-white mb-6 leading-tight">
              <span className="block">Entrena</span>
              <span className="block bg-gradient-to-r from-orange-400 to-orange-600 bg-clip-text text-transparent">
                Inteligente
              </span>
            </h1>

            {/* Subtitle */}
            <p className="text-xl md:text-2xl text-gray-300 mb-8 leading-relaxed max-w-2xl mx-auto lg:mx-0">
              Rutinas personalizadas por IA, seguimiento en Apple Watch, 
              y analytics avanzados. Todo en español, diseñado para Chile.
            </p>

            {/* Key benefits */}
            <div className="flex flex-col sm:flex-row gap-4 mb-10 text-sm text-gray-300">
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 bg-orange-400 rounded-full" />
                IA con GPT-4 personalizada
              </div>
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 bg-orange-400 rounded-full" />
                Integración Apple Watch
              </div>
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 bg-orange-400 rounded-full" />
                Pagos con MercadoPago
              </div>
            </div>

            {/* CTA Buttons */}
            <div className="flex flex-col sm:flex-row gap-4 justify-center lg:justify-start">
              <Button 
                size="lg" 
                leftIcon={<Download className="w-5 h-5" />}
                className="animate-pulse-glow"
                onClick={handleGetStarted}
              >
                {isSignedIn ? 'Ir a Dashboard' : 'Descargar Gratis'}
              </Button>
              <Button 
                variant="secondary" 
                size="lg"
                leftIcon={<Play className="w-5 h-5" />}
                onClick={handleDemo}
              >
                Ver Demo
              </Button>
            </div>

            {/* Social proof */}
            <div className="mt-12 pt-8 border-t border-gray-700/50">
              <div className="flex flex-col sm:flex-row items-center justify-center lg:justify-start gap-8 text-sm text-gray-400">
                <div className="text-center">
                  <div className="text-2xl font-bold text-white">1,247</div>
                  <div>Usuarios Activos</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-white">5,643</div>
                  <div>Entrenamientos</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-white">4.8⭐</div>
                  <div>Rating App Store</div>
                </div>
              </div>
            </div>
          </div>

          {/* Right side - Phone mockup */}
          <div className="flex justify-center lg:justify-end">
            <div className="relative">
              {/* Phone frame */}
              <div className="relative w-80 h-[640px] bg-gray-800 rounded-[3rem] border-8 border-gray-700 shadow-2xl animate-float">
                {/* Screen */}
                <div className="absolute inset-4 bg-gray-900 rounded-[2rem] overflow-hidden">
                  {/* Status bar */}
                  <div className="flex justify-between items-center px-6 pt-4 pb-2 text-white text-sm">
                    <span>9:41</span>
                    <div className="flex items-center gap-1">
                      <div className="w-4 h-2 bg-white rounded-sm" />
                    </div>
                  </div>
                  
                  {/* App content preview */}
                  <div className="px-4 py-2">
                    <div className="text-white text-lg font-bold mb-2">¡Buenos días!</div>
                    <div className="text-gray-400 text-sm mb-4">¿Listo para dominar el día?</div>
                    
                    {/* AI coaching bubble */}
                    <div className="hero-gradient p-3 rounded-2xl mb-4">
                      <div className="flex items-start gap-3">
                        <div className="w-8 h-8 bg-white/20 rounded-full flex items-center justify-center text-sm">
                          ✨
                        </div>
                        <div className="flex-1 text-white text-sm">
                          ¡Estás en fuego! Tu press de banca ha mejorado 12%...
                        </div>
                      </div>
                    </div>
                    
                    {/* Workout card */}
                    <div className="bg-gray-800 rounded-2xl p-4">
                      <div className="text-white font-semibold mb-1">Entrenamiento de Hoy</div>
                      <div className="text-gray-400 text-sm mb-3">Día de Empuje • 45 min</div>
                      <div className="energy-gradient rounded-xl py-3 text-center">
                        <div className="text-white font-semibold">▶️ Comenzar Entrenamiento</div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
              
              {/* Glow effect */}
              <div className="absolute inset-0 bg-orange-500/20 rounded-[3rem] blur-2xl -z-10 animate-pulse-glow" />
            </div>
          </div>
        </div>
      </div>

      {/* Bottom indicator */}
      <div className="absolute bottom-8 left-1/2 transform -translate-x-1/2">
        <div className="text-gray-400 text-center">
          <div className="w-6 h-10 border-2 border-gray-400 rounded-full flex justify-center">
            <div className="w-1 h-3 bg-gray-400 rounded-full mt-2 animate-pulse" />
          </div>
        </div>
      </div>
    </section>
  );
};