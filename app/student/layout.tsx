import { Fraunces } from "next/font/google";
import type { ReactNode } from "react";

// Display face for the student surface only: self-hosted at build, latin subset, swap.
const display = Fraunces({
  subsets: ["latin"],
  variable: "--font-display",
  display: "swap",
  axes: ["opsz"],
  fallback: ["Georgia", "Times New Roman", "serif"],
});

export default function StudentLayout({ children }: { children: ReactNode }) {
  return (
    <div className={`${display.variable} theme-victorian vic-page min-h-screen w-full bg-background text-foreground`}>
      {children}
    </div>
  );
}
