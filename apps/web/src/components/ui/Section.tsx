'use client';

import React from 'react';
import { clsx } from 'clsx';

interface SectionProps {
  children: React.ReactNode;
  className?: string;
  id?: string;
  background?: 'default' | 'gradient' | 'glass';
  padding?: 'none' | 'sm' | 'md' | 'lg' | 'xl';
}

export const Section: React.FC<SectionProps> = ({ 
  children, 
  className, 
  id,
  background = 'default',
  padding = 'lg'
}) => {
  const baseClasses = clsx(
    'w-full',
    {
      // Backgrounds
      '': background === 'default',
      'hero-gradient': background === 'gradient',
      'glass-effect border-y border-gray-700/30': background === 'glass',
      
      // Padding
      '': padding === 'none',
      'py-8': padding === 'sm',
      'py-16': padding === 'md',
      'py-24': padding === 'lg',
      'py-32': padding === 'xl',
    },
    className
  );

  return (
    <section id={id} className={baseClasses}>
      <div className="container-custom">
        {children}
      </div>
    </section>
  );
};

interface SectionHeaderProps {
  title: string;
  subtitle?: string;
  description?: string;
  className?: string;
  centered?: boolean;
}

export const SectionHeader: React.FC<SectionHeaderProps> = ({ 
  title, 
  subtitle,
  description, 
  className,
  centered = true 
}) => (
  <div className={clsx('mb-16', { 'text-center': centered }, className)}>
    {subtitle && (
      <p className="text-orange-400 font-semibold text-sm uppercase tracking-wide mb-4">
        {subtitle}
      </p>
    )}
    <h2 className="text-4xl md:text-5xl font-bold text-white mb-6 leading-tight">
      {title}
    </h2>
    {description && (
      <p className="text-xl text-gray-300 max-w-3xl mx-auto leading-relaxed">
        {description}
      </p>
    )}
  </div>
);