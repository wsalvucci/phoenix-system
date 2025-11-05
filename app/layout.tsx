import { Analytics } from "@vercel/analytics/next"
import { GeistSans } from "geist/font/sans";
import "./globals.css";
import { ThemeProvider } from "@/components/ThemeProvider";
import { ThemeToggle } from "@/components/ThemeToggle";
import QueryProvider from "@/components/QueryProvider";

import { config } from '@fortawesome/fontawesome-svg-core'
import '@fortawesome/fontawesome-svg-core/styles.css'
config.autoAddCss = false

const defaultUrl = process.env.VERCEL_URL
  ? `https://${process.env.VERCEL_URL}`
  : "http://localhost:3000";

export const metadata = {
  metadataBase: new URL(defaultUrl),
  title: "Phoenix System",
  description: "A student rewards system",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className={GeistSans.className}>
      <body className="bg-background text-foreground">
        <QueryProvider>
          <ThemeProvider>
            <main className="min-h-screen flex flex-col items-center w-full max-w-full overflow-x-hidden">
              {/* <ThemeToggle /> */}
              {children}
              <Analytics />
            </main>
          </ThemeProvider>
        </QueryProvider>
      </body>
    </html>
  );
}
