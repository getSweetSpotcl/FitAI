'use client';

import React from 'react';
import { Card, CardContent } from '../ui';

interface DocsContentProps {
  children: React.ReactNode;
  title?: string;
  lastUpdated?: string;
  readingTime?: string;
  showTableOfContents?: boolean;
}

export const DocsContent: React.FC<DocsContentProps> = ({
  children,
  title,
  lastUpdated,
  readingTime,
  showTableOfContents = true
}) => {
  return (
    <div className="max-w-4xl mx-auto">
      {/* Article Header */}
      {title && (
        <div className="mb-8 pb-8 border-b border-gray-800">
          <h1 className="text-4xl font-bold text-white mb-4">{title}</h1>
          <div className="flex items-center gap-4 text-sm text-gray-400">
            {lastUpdated && (
              <span>Actualizado: {lastUpdated}</span>
            )}
            {readingTime && (
              <>
                <span>•</span>
                <span>{readingTime} de lectura</span>
              </>
            )}
          </div>
        </div>
      )}

      {/* Main Content */}
      <div className="flex gap-8">
        {/* Article Content */}
        <article className="flex-1 min-w-0">
          <div className="prose prose-invert prose-orange max-w-none">
            {children}
          </div>
        </article>

        {/* Table of Contents */}
        {showTableOfContents && (
          <aside className="hidden xl:block w-64 flex-shrink-0">
            <div className="sticky top-24">
              <Card variant="glass" className="p-4">
                <CardContent className="p-0">
                  <h3 className="text-sm font-semibold text-white mb-3">
                    En esta página
                  </h3>
                  <nav className="space-y-2">
                    <button className="block text-left text-sm text-gray-400 hover:text-orange-400 transition-colors">
                      Introducción
                    </button>
                    <button className="block text-left text-sm text-gray-400 hover:text-orange-400 transition-colors">
                      Instalación
                    </button>
                    <button className="block text-left text-sm text-gray-400 hover:text-orange-400 transition-colors">
                      Configuración
                    </button>
                    <button className="block text-left text-sm text-gray-400 hover:text-orange-400 transition-colors">
                      Ejemplos
                    </button>
                  </nav>
                </CardContent>
              </Card>
            </div>
          </aside>
        )}
      </div>

      {/* Navigation Footer */}
      <div className="mt-16 pt-8 border-t border-gray-800">
        <div className="flex justify-between">
          <button className="flex items-center gap-2 text-gray-400 hover:text-white transition-colors">
            <span>←</span>
            Página anterior
          </button>
          <button className="flex items-center gap-2 text-gray-400 hover:text-white transition-colors">
            Página siguiente
            <span>→</span>
          </button>
        </div>
      </div>
    </div>
  );
};