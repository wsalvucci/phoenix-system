"use client";

import { forwardRef, SelectHTMLAttributes, ReactNode } from "react";

interface ThemeSelectProps extends Omit<SelectHTMLAttributes<HTMLSelectElement>, 'size'> {
  label?: string;
  error?: string;
  fullWidth?: boolean;
  size?: "sm" | "md" | "lg";
  children: ReactNode;
}

const ThemeSelect = forwardRef<HTMLSelectElement, ThemeSelectProps>(
  ({ label, error, fullWidth = false, size = "md", className = "", children, ...props }, ref) => {
    const baseClasses = `
      rounded-lg
      border
      bg-background
      text-foreground
      border-input
      focus:border-ring
      focus:outline-none
      transition-colors
      duration-200
    `;

    const sizeClasses = {
      sm: "px-2 py-1 text-sm",
      md: "px-3 py-2 text-base",
      lg: "px-4 py-3 text-lg",
    };

    const widthClass = fullWidth ? "w-full" : "";
    const errorClass = error ? "border-destructive" : "";

    const combinedClasses = `
      ${baseClasses}
      ${sizeClasses[size]}
      ${widthClass}
      ${errorClass}
      ${className}
    `.trim().replace(/\s+/g, " ");

    return (
      <div className={`${fullWidth ? "w-full" : ""}`}>
        {label && (
          <label className="block text-sm font-medium text-foreground mb-1">
            {label}
          </label>
        )}
        <select
          ref={ref}
          className={combinedClasses}
          {...props}
        >
          {children}
        </select>
        {error && (
          <p className="mt-1 text-sm text-destructive">
            {error}
          </p>
        )}
      </div>
    );
  }
);

ThemeSelect.displayName = "ThemeSelect";

export default ThemeSelect; 