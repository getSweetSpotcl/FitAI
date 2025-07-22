'use client';

import React from 'react';
import { DocsContent } from '@/components/docs';
import { Card, CardContent, Button } from '@/components/ui';
import { Download, User, Play, CheckCircle } from 'lucide-react';

export default function QuickstartPage() {
  return (
    <DocsContent
      title="Inicio Rápido"
      lastUpdated="Enero 2025"
      readingTime="5 min"
    >
      <div className="space-y-8">
        {/* Introduction */}
        <div className="prose prose-invert prose-orange max-w-none">
          <p className="text-xl text-gray-300 leading-relaxed">
            Bienvenido a FitAI. Esta guía te llevará desde la instalación hasta tu primer entrenamiento
            con inteligencia artificial en menos de 15 minutos.
          </p>
        </div>

        {/* Steps */}
        <div className="space-y-6">
          {/* Step 1 */}
          <Card variant="glass">
            <CardContent className="p-6">
              <div className="flex items-start gap-4">
                <div className="w-10 h-10 energy-gradient rounded-full flex items-center justify-center flex-shrink-0">
                  <span className="text-white font-bold">1</span>
                </div>
                <div className="flex-1">
                  <h3 className="text-xl font-semibold text-white mb-3 flex items-center gap-2">
                    <Download className="w-5 h-5" />
                    Descargar FitAI
                  </h3>
                  <p className="text-gray-300 mb-4">
                    FitAI está disponible exclusivamente en el App Store para iPhone y Apple Watch.
                  </p>
                  <div className="bg-gray-800 rounded-lg p-4 mb-4">
                    <h4 className="text-white font-medium mb-2">Requisitos del Sistema:</h4>
                    <ul className="text-gray-300 text-sm space-y-1">
                      <li>• iOS 16.0 o superior</li>
                      <li>• iPhone 12 o modelo más reciente (recomendado)</li>
                      <li>• Apple Watch Series 6+ (opcional pero recomendado)</li>
                      <li>• 200MB de espacio libre</li>
                    </ul>
                  </div>
                  <Button 
                    leftIcon={<Download className="w-4 h-4" />}
                    onClick={() => alert('Redireccionar al App Store')}
                  >
                    Descargar del App Store
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Step 2 */}
          <Card variant="glass">
            <CardContent className="p-6">
              <div className="flex items-start gap-4">
                <div className="w-10 h-10 energy-gradient rounded-full flex items-center justify-center flex-shrink-0">
                  <span className="text-white font-bold">2</span>
                </div>
                <div className="flex-1">
                  <h3 className="text-xl font-semibold text-white mb-3 flex items-center gap-2">
                    <User className="w-5 h-5" />
                    Crear tu Cuenta
                  </h3>
                  <p className="text-gray-300 mb-4">
                    Registrarte es rápido y gratis. Solo necesitas un email y contraseña.
                  </p>
                  <div className="bg-gray-800 rounded-lg p-4 mb-4">
                    <h4 className="text-white font-medium mb-2">Durante el registro configurarás:</h4>
                    <ul className="text-gray-300 text-sm space-y-1">
                      <li>• Datos básicos (edad, peso, altura)</li>
                      <li>• Nivel de experiencia en fitness</li>
                      <li>• Objetivos principales (fuerza, masa muscular, definición)</li>
                      <li>• Disponibilidad de tiempo para entrenar</li>
                      <li>• Equipamiento disponible</li>
                    </ul>
                  </div>
                  <div className="bg-blue-500/10 border border-blue-500/20 rounded-lg p-4">
                    <p className="text-blue-300 text-sm">
                      💡 <strong>Consejo:</strong> Sé honesto con tu nivel de experiencia. 
                      La IA funciona mejor con información precisa.
                    </p>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Step 3 */}
          <Card variant="glass">
            <CardContent className="p-6">
              <div className="flex items-start gap-4">
                <div className="w-10 h-10 energy-gradient rounded-full flex items-center justify-center flex-shrink-0">
                  <span className="text-white font-bold">3</span>
                </div>
                <div className="flex-1">
                  <h3 className="text-xl font-semibold text-white mb-3 flex items-center gap-2">
                    <Play className="w-5 h-5" />
                    Primer Entrenamiento
                  </h3>
                  <p className="text-gray-300 mb-4">
                    La IA generará automáticamente tu primera rutina basada en tu perfil.
                  </p>
                  <div className="bg-gray-800 rounded-lg p-4 mb-4">
                    <h4 className="text-white font-medium mb-2">Tu primera rutina incluirá:</h4>
                    <ul className="text-gray-300 text-sm space-y-1">
                      <li>• 4-6 ejercicios fundamentales</li>
                      <li>• Explicaciones detalladas de cada movimiento</li>
                      <li>• Videos demostrativos</li>
                      <li>• Progresiones adaptadas a tu nivel</li>
                      <li>• Estimación de tiempo total</li>
                    </ul>
                  </div>
                  <Button 
                    variant="outline"
                    leftIcon={<Play className="w-4 h-4" />}
                    onClick={() => alert('Ver ejemplo de rutina')}
                  >
                    Ver Rutina de Ejemplo
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Success Section */}
        <Card variant="gradient" className="p-6">
          <CardContent className="p-0 text-center">
            <CheckCircle className="w-12 h-12 text-green-400 mx-auto mb-4" />
            <h3 className="text-2xl font-bold text-white mb-3">
              ¡Listo para Entrenar!
            </h3>
            <p className="text-gray-300 mb-6">
              Con estos pasos ya tienes todo configurado para comenzar tu journey fitness con IA.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Button 
                size="lg"
                onClick={() => window.location.href = '/docs/guide'}
              >
                Explorar Todas las Funciones
              </Button>
              <Button 
                variant="outline"
                size="lg"
                onClick={() => window.location.href = '/docs/apple-watch/setup'}
              >
                Configurar Apple Watch
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* What's Next */}
        <div className="prose prose-invert prose-orange max-w-none">
          <h2>¿Qué Sigue?</h2>
          <p>
            Ahora que tienes FitAI funcionando, te recomendamos explorar estas funciones:
          </p>
          <ul>
            <li><strong>Configurar Apple Watch:</strong> Para seguimiento avanzado de métricas</li>
            <li><strong>Explorar funciones IA:</strong> Generación de rutinas y coach personal</li>
            <li><strong>Analytics:</strong> Entender tu progreso con reportes detallados</li>
            <li><strong>Comunidad:</strong> Conectar con otros usuarios chilenos</li>
          </ul>
        </div>
      </div>
    </DocsContent>
  );
}