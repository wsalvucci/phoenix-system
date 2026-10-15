import { Fraunces } from "next/font/google";

// Display face for the Honor Board (hallway walls, phone board view, hub heading). Same load as the
// student layout so a student's name looks the same on their phone and on the wall.
export const honorFont = Fraunces({
  subsets: ["latin"],
  variable: "--font-display",
  display: "swap",
  axes: ["opsz"],
  fallback: ["Georgia", "Times New Roman", "serif"],
});
