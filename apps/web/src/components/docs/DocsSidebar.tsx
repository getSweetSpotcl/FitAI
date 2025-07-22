'use client';

import React, { useState } from 'react';
import { 
  BookOpen,
  ChevronDown,
  ChevronRight,
  Home,
  Play,
  Brain,
  Watch,
  BarChart3,
  Code,
  HelpCircle,
  Menu,
  X
} from 'lucide-react';
// import { usePathname } from 'next/navigation';

interface NavItem {
  title: string;
  href: string;
  icon?: React.ComponentType<any>;
  children?: NavItem[];
}

const navigation: NavItem[] = [
  {
    title: 'Inicio',
    href: '/docs',
    icon: Home,
  },
  {
    title: 'Inicio Rápido',
    href: '/docs/quickstart',
    icon: Play,
    children: [
      { title: 'Instalación', href: '/docs/quickstart/installation' },
      { title: 'Primer Entrenamiento', href: '/docs/quickstart/first-workout' },
      { title: 'Configuración Básica', href: '/docs/quickstart/setup' },
    ],
  },
  {
    title: 'Guía de Usuario',
    href: '/docs/guide',
    icon: BookOpen,
    children: [
      { title: 'Navegación', href: '/docs/guide/navigation' },
      { title: 'Registro de Entrenamientos', href: '/docs/guide/workouts' },
      { title: 'Seguimiento de Progreso', href: '/docs/guide/progress' },
      { title: 'Perfil y Configuración', href: '/docs/guide/profile' },
    ],
  },
  {
    title: 'Funciones IA',
    href: '/docs/ai',
    icon: Brain,
    children: [
      { title: 'Generación de Rutinas', href: '/docs/ai/routines' },
      { title: 'Coach Personal', href: '/docs/ai/coach' },
      { title: 'Recomendaciones', href: '/docs/ai/recommendations' },
      { title: 'Créditos y Costos', href: '/docs/ai/credits' },
    ],
  },
  {
    title: 'Apple Watch',
    href: '/docs/apple-watch',
    icon: Watch,
    children: [
      { title: 'Configuración', href: '/docs/apple-watch/setup' },
      { title: 'Entrenamientos', href: '/docs/apple-watch/workouts' },
      { title: 'Sincronización', href: '/docs/apple-watch/sync' },
    ],
  },
  {
    title: 'Premium Features',
    href: '/docs/premium',
    icon: BarChart3,
    children: [
      { title: 'Analytics Avanzados', href: '/docs/premium/analytics' },
      { title: 'Reportes', href: '/docs/premium/reports' },
      { title: 'Funciones Sociales', href: '/docs/premium/social' },
      { title: 'Suscripciones', href: '/docs/premium/subscriptions' },
    ],
  },
  {
    title: 'API Reference',
    href: '/docs/api',
    icon: Code,
    children: [
      { title: 'Autenticación', href: '/docs/api/auth' },
      { title: 'Usuarios', href: '/docs/api/users' },
      { title: 'Entrenamientos', href: '/docs/api/workouts' },
      { title: 'IA', href: '/docs/api/ai' },
    ],
  },
  {
    title: 'Soporte',
    href: '/docs/support',
    icon: HelpCircle,
    children: [
      { title: 'FAQ', href: '/docs/support/faq' },
      { title: 'Contacto', href: '/docs/support/contact' },
      { title: 'Reportar Bug', href: '/docs/support/bug-report' },
    ],
  },
];

interface DocsSidebarProps {
  className?: string;
}

export const DocsSidebar: React.FC<DocsSidebarProps> = ({ className }) => {
  const [expandedItems, setExpandedItems] = useState<string[]>(['/docs/guide']);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  // const pathname = usePathname();
  const pathname = '/';

  const toggleExpanded = (href: string) => {
    setExpandedItems(prev => 
      prev.includes(href) 
        ? prev.filter(item => item !== href)
        : [...prev, href]
    );
  };

  const isActive = (href: string) => {
    return pathname === href;
  };

  const isParentActive = (item: NavItem) => {
    return item.children?.some(child => isActive(child.href)) || isActive(item.href);
  };

  const NavItems = ({ items, level = 0 }: { items: NavItem[], level?: number }) => (
    <ul className="space-y-1">
      {items.map((item) => {
        const Icon = item.icon;
        const hasChildren = item.children && item.children.length > 0;
        const isExpanded = expandedItems.includes(item.href);
        const isItemActive = isActive(item.href);
        const isParentItemActive = isParentActive(item);

        return (
          <li key={item.href}>
            <div className="relative">
              <button
                onClick={() => {
                  if (hasChildren) {
                    toggleExpanded(item.href);
                  } else {
                    setIsMobileMenuOpen(false);
                    // Navigate to the page
                    window.location.href = item.href;
                  }
                }}
                className={`w-full flex items-center gap-3 px-3 py-2 text-sm rounded-lg transition-all group ${
                  isItemActive
                    ? 'bg-orange-500/20 text-orange-400 font-medium'
                    : isParentItemActive
                    ? 'text-white'
                    : 'text-gray-400 hover:text-white hover:bg-gray-800/50'
                } ${level > 0 ? 'ml-4' : ''}`}
              >
                {Icon && <Icon className="w-4 h-4 flex-shrink-0" />}
                <span className="flex-1 text-left">{item.title}</span>
                {hasChildren && (
                  <div className={`transition-transform duration-200 ${isExpanded ? 'rotate-90' : ''}`}>
                    <ChevronRight className="w-4 h-4" />
                  </div>
                )}
              </button>

              {/* Active indicator */}
              {isItemActive && (
                <div className="absolute left-0 top-0 bottom-0 w-1 bg-orange-400 rounded-r-full" />
              )}
            </div>

            {/* Children */}
            {hasChildren && isExpanded && (
              <div className="mt-1 overflow-hidden transition-all duration-300">
                <NavItems items={item.children!} level={level + 1} />
              </div>
            )}
          </li>
        );
      })}
    </ul>
  );

  return (
    <>
      {/* Mobile Menu Button */}
      <button
        onClick={() => setIsMobileMenuOpen(true)}
        className="lg:hidden fixed top-4 left-4 z-50 p-2 glass-effect rounded-lg border border-gray-700"
      >
        <Menu className="w-5 h-5 text-white" />
      </button>

      {/* Sidebar */}
      <aside className={`fixed lg:sticky top-0 left-0 z-40 h-screen lg:h-auto lg:max-h-screen bg-gray-900 lg:bg-transparent border-r border-gray-800 lg:border-none transition-transform duration-300 ${
        isMobileMenuOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'
      } ${className}`}>
        <div className="flex flex-col h-full">
          {/* Header */}
          <div className="flex items-center justify-between p-6 lg:p-4 border-b border-gray-800 lg:border-none">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 energy-gradient rounded-lg flex items-center justify-center">
                <span className="text-white font-bold text-sm">⚡</span>
              </div>
              <span className="text-lg font-bold bg-gradient-to-r from-orange-400 to-orange-600 bg-clip-text text-transparent">
                FitAI Docs
              </span>
            </div>
            <button
              onClick={() => setIsMobileMenuOpen(false)}
              className="lg:hidden p-2 text-gray-400 hover:text-white"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Navigation */}
          <nav className="flex-1 p-4 overflow-y-auto">
            <NavItems items={navigation} />
          </nav>

          {/* Footer */}
          <div className="p-4 border-t border-gray-800">
            <div className="glass-effect rounded-lg p-3 text-center">
              <p className="text-xs text-gray-400 mb-2">¿Necesitas ayuda?</p>
              <button className="text-orange-400 hover:text-orange-300 text-sm font-medium transition-colors">
                Contactar Soporte
              </button>
            </div>
          </div>
        </div>
      </aside>

      {/* Mobile overlay */}
      {isMobileMenuOpen && (
        <div
          className="fixed inset-0 bg-black/50 z-30 lg:hidden transition-opacity duration-300"
          onClick={() => setIsMobileMenuOpen(false)}
        />
      )}
    </>
  );
};