'use client';

import React from 'react';
import { clsx } from 'clsx';

interface CardProps {
  children: React.ReactNode;
  className?: string;
  variant?: 'default' | 'glass' | 'gradient' | 'feature';
  hover?: boolean;
  onClick?: () => void;
}

export const Card: React.FC<CardProps> = ({ 
  children, 
  className, 
  variant = 'default',
  hover = false,
  onClick 
}) => {
  const baseClasses = clsx(
    'rounded-2xl border transition-all duration-200',
    {
      // Variants
      'bg-gray-800 border-gray-700': variant === 'default',
      'glass-effect border-gray-700/50': variant === 'glass',
      'card-gradient border-gray-700/30': variant === 'gradient',
      'glass-effect border-gray-600 hover:border-orange-500/50 group': variant === 'feature',
      
      // Interactive states
      'cursor-pointer': onClick,
      'hover:scale-105 hover:shadow-xl': hover && !onClick,
      'hover:scale-102 active:scale-98': onClick,
    },
    className
  );

  return (
    <div 
      className={baseClasses}
      onClick={onClick}
    >
      {children}
    </div>
  );
};

interface CardHeaderProps {
  children: React.ReactNode;
  className?: string;
}

export const CardHeader: React.FC<CardHeaderProps> = ({ children, className }) => (
  <div className={clsx('p-6 pb-4', className)}>
    {children}
  </div>
);

interface CardContentProps {
  children: React.ReactNode;
  className?: string;
}

export const CardContent: React.FC<CardContentProps> = ({ children, className }) => (
  <div className={clsx('px-6 pb-6', className)}>
    {children}
  </div>
);

interface CardFooterProps {
  children: React.ReactNode;
  className?: string;
}

export const CardFooter: React.FC<CardFooterProps> = ({ children, className }) => (
  <div className={clsx('p-6 pt-4 border-t border-gray-700', className)}>
    {children}
  </div>
);