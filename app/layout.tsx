import type { Metadata, Viewport } from "next";
import { Archivo } from "next/font/google";
import { ThemeScript } from "@/components/layout/theme-script";
import { ServiceWorkerRegister } from "@/components/layout/sw-register";
import "./globals.css";

// One family, two registers — the variable width axis carries the contrast
// between metrics (expanded, heavy) and body text, so there's no second face.
const archivo = Archivo({ subsets: ["latin"], axes: ["wdth"], variable: "--font-archivo" });

export const metadata: Metadata = {
  title: "FitSaathi — Fitness that fits student life.",
  description:
    "FitSaathi motivates students through friends, fits fitness into their timetable, and guides them to the best place and time to stay active.",
  manifest: "/manifest.json",
  appleWebApp: { capable: true, statusBarStyle: "default", title: "FitSaathi" },
  icons: {
    icon: [{ url: "/icons/icon-192.png", sizes: "192x192", type: "image/png" }],
    apple: [{ url: "/icons/apple-touch-icon.png" }],
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  viewportFit: "cover",
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#fafbfd" },
    { media: "(prefers-color-scheme: dark)", color: "#15171f" },
  ],
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="en" className={`${archivo.variable} antialiased`} suppressHydrationWarning>
      <head>
        <ThemeScript />
      </head>
      <body className="min-h-screen bg-background text-foreground">
        {children}
        <ServiceWorkerRegister />
      </body>
    </html>
  );
}
