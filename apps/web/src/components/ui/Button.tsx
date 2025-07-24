"use client";

import { clsx } from "clsx";
import React from "react";

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: "primary" | "secondary" | "ghost" | "outline";
  size?: "sm" | "md" | "lg";
  children: React.ReactNode;
  isLoading?: boolean;
  leftIcon?: React.ReactNode;
  rightIcon?: React.ReactNode;
}

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  (
    {
      variant = "primary",
      size = "md",
      children,
      className,
      isLoading = false,
      leftIcon,
      rightIcon,
      disabled,
      ...props
    },
    ref
  ) => {
    const baseClasses = clsx(
      "inline-flex items-center justify-center rounded-xl font-semibold transition-all duration-200",
      "focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-gray-900",
      "disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none",
      "hover:scale-105 active:scale-95",
      {
        // Variants
        "energy-gradient text-white energy-shadow focus:ring-orange-500":
          variant === "primary",
        "glass-effect text-white border border-gray-600 hover:border-gray-500 hover:bg-white/10":
          variant === "secondary",
        "text-gray-300 hover:text-white hover:bg-white/5 hover:scale-102":
          variant === "ghost",
        "border border-orange-500 text-orange-500 hover:bg-orange-500 hover:text-white":
          variant === "outline",

        // Sizes
        "px-3 py-2 text-sm gap-2": size === "sm",
        "px-6 py-3 text-base gap-3": size === "md",
        "px-8 py-4 text-lg gap-4": size === "lg",
      },
      className
    );

    return (
      <button
        ref={ref}
        className={baseClasses}
        disabled={disabled || isLoading}
        {...props}
      >
        {isLoading && (
          <div className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin" />
        )}
        {!isLoading && leftIcon}
        {children}
        {!isLoading && rightIcon}
      </button>
    );
  }
);

Button.displayName = "Button";
