"use client";

import { motion } from "framer-motion";
import Link from "next/link";
import { ReactNode } from "react";

interface MotionButtonProps {
  children: ReactNode;
  href?: string;
  onClick?: () => void;
  className?: string;
  variant?: "primary" | "secondary" | "outline" | "ghost";
  size?: "sm" | "md" | "lg";
  disabled?: boolean;
  fullWidth?: boolean;
}

export default function MotionButton({
  children,
  href,
  onClick,
  className = "",
  variant = "primary",
  size = "md",
  disabled = false,
  fullWidth = false,
}: MotionButtonProps) {
  const baseClasses = `
    inline-flex
    items-center
    justify-center
    gap-4
    rounded-lg
    font-semibold
    shadow-sm
    transition-colors
    focus-visible:outline-none
    focus-visible:ring-2
    focus-visible:ring-primary
    focus-visible:ring-offset-2
  `;

  const variantClasses = {
    primary: "bg-primary text-primary-foreground hover:bg-primary/90",
    secondary: "bg-slate-700 text-white hover:bg-slate-800 dark:bg-slate-200 dark:text-slate-900 dark:hover:bg-white",
    outline: "border border-slate-300 bg-white text-slate-700 hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200 dark:hover:bg-slate-800",
    ghost: "bg-transparent text-slate-600 shadow-none hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800",
  };

  const sizeClasses = {
    sm: "h-9 px-3 text-sm",
    md: "h-11 px-4 text-sm",
    lg: "h-12 px-6 text-base",
  };

  const widthClass = fullWidth ? "w-full" : "";
  const disabledClass = disabled ? "opacity-50 cursor-not-allowed" : "cursor-pointer";

  const combinedClasses = `
    ${baseClasses}
    ${variantClasses[variant]}
    ${sizeClasses[size]}
    ${widthClass}
    ${disabledClass}
    ${className}
  `.trim().replace(/\s+/g, " ");

  const motionProps = {
    initial: { opacity: 0, y: 10 },
    animate: { opacity: 1, y: 0 },
    transition: { 
      duration: 0.2, 
      ease: "easeOut"
    },
    whileHover: disabled ? {} : { 
      scale: 1.02,
      transition: { duration: 0.1, ease: "easeOut" }
    },
    whileTap: disabled ? {} : { 
      scale: 0.98,
      transition: { duration: 0.05, ease: "easeOut" }
    },
  };

  if (href && !disabled) {
    const MotionLink = motion(Link);
    return (
      <MotionLink href={href} className={combinedClasses} {...motionProps}>
        {children}
      </MotionLink>
    );
  }

  return (
    <motion.button
      type="button"
      className={combinedClasses}
      {...motionProps}
      onClick={disabled ? undefined : onClick}
      disabled={disabled}
    >
      {children}
    </motion.button>
  );
}
