'use client';

import React from 'react';
import { Button } from '../ui';
import { ArrowLeft, ExternalLink, Github, Search } from 'lucide-react';

interface DocsHeaderProps {
  title?: string;
  description?: string;
  showBackButton?: boolean;
}

export const DocsHeader: React.FC<DocsHeaderProps> = ({ 
  title = "Documentación FitAI",
  description = "Guías completas, referencias API y recursos para dominar FitAI",
  showBackButton = false
}) => {
  return (
    <header className="sticky top-0 z-20 glass-effect border-b border-gray-700/50 bg-gray-900/80 backdrop-blur-md">
      <div className="container-custom py-4">
        <div className="flex items-center justify-between">
          {/* Left side */}
          <div className="flex items-center gap-4">
            {showBackButton && (
              <Button
                variant="ghost"
                size="sm"
                leftIcon={<ArrowLeft className="w-4 h-4" />}
                onClick={() => window.history.back()}
              >
                Volver
              </Button>
            )}
            
            <div>
              <h1 className="text-2xl font-bold text-white">{title}</h1>
              <p className="text-gray-400 text-sm mt-1">{description}</p>
            </div>
          </div>

          {/* Right side */}
          <div className="flex items-center gap-3">
            {/* Search */}
            <div className="hidden md:flex relative">
              <input
                type="text"
                placeholder="Buscar documentación..."
                className="w-64 px-4 py-2 pl-10 glass-effect border border-gray-700 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:border-orange-500 transition-colors"
              />
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
            </div>

            {/* Links */}
            <Button
              variant="ghost"
              size="sm"
              leftIcon={<ExternalLink className="w-4 h-4" />}
              onClick={() => window.open('/', '_blank')}
            >
              Landing
            </Button>
            
            <Button
              variant="ghost"
              size="sm"
              leftIcon={<Github className="w-4 h-4" />}
              onClick={() => window.open('https://github.com/fitai', '_blank')}
            >
              GitHub
            </Button>
          </div>
        </div>

        {/* Mobile search */}
        <div className="md:hidden mt-4">
          <div className="relative">
            <input
              type="text"
              placeholder="Buscar documentación..."
              className="w-full px-4 py-2 pl-10 glass-effect border border-gray-700 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:border-orange-500 transition-colors"
            />
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
          </div>
        </div>
      </div>
    </header>
  );
};