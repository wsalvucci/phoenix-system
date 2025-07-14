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
    flex
    items-center
    justify-between
    rounded-lg
    font-bold
  `;

  const variantClasses = {
    primary: "bg-gradient-to-br from-primary via-primary/80 to-primary text-white",
    secondary: "bg-gradient-to-br from-gray-600 via-gray-500 to-gray-600 text-white",
    outline: "bg-transparent border-2 border-primary text-primary hover:bg-primary hover:text-white",
    ghost: "bg-transparent text-primary hover:bg-primary/10",
  };

  const sizeClasses = {
    sm: "px-3 py-3 text-sm",
    md: "px-4 py-4 text-base",
    lg: "px-6 py-6 text-lg",
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

  const content = (
    <motion.div
      className={combinedClasses}
      {...motionProps}
      onClick={disabled ? undefined : onClick}
    >
      {children}
    </motion.div>
  );

  if (href && !disabled) {
    return <Link href={href}>{content}</Link>;
  }

  return content;
} 