import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { Analytics } from "@vercel/analytics/react";

import { AppSessionProvider } from "@/components/app-session-provider";
import { DataStatusBanner } from "@/components/data-status-banner";
import { PwaInstallBanner } from "@/components/pwa-install-banner";
import { SiteHeader } from "@/components/site-header";
import { DataLoader } from "@/components/data-loader";
import { MobileNavigation } from "@/components/mobile-navigation";
import { CommandPalette } from "@/components/command-palette";
import { ProductTour } from "@/components/product-tour";
import { ThemeBoot } from "@/components/theme-boot";
import { TrialBanner } from "@/components/trial-banner";
import { WhatsAppTemplatesLoader } from "@/components/whatsapp-templates-loader";

import "./globals.css";

const inter = Geist({
  subsets: ["latin"],
  variable: "--font-inter",
  display: "swap",
  preload: true,
});

const jetbrainsMono = Geist_Mono({
  subsets: ["latin"],
  variable: "--font-jetbrains",
  display: "swap",
  preload: false,
});

export const metadata: Metadata = {
  applicationName: "Adestro",
  title: "Adestro",
  description: "Plataforma B2B para adestradores caninos profissionais.",
  manifest: "/manifest.webmanifest",
  appleWebApp: {
    capable: true,
    title: "Adestro",
    statusBarStyle: "default",
  },
  formatDetection: { telephone: false },
  icons: {
    icon: [
      { url: "/favicon-32.png", sizes: "32x32", type: "image/png" },
      { url: "/icon.png", sizes: "512x512", type: "image/png" },
    ],
    shortcut: "/icon.png",
    apple: "/apple-icon.png",
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  themeColor: "#0f172a",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="pt-BR" data-scroll-behavior="smooth" suppressHydrationWarning>
      <body
        className={`${inter.variable} ${jetbrainsMono.variable} min-h-dvh bg-[var(--background)] font-sans text-[var(--foreground)] antialiased`}
      >
        <ThemeBoot />
        <AppSessionProvider>
          <DataLoader />
          <WhatsAppTemplatesLoader />
          <div className="relative isolate min-h-dvh">
            <SiteHeader />
            <TrialBanner />
            <PwaInstallBanner />
            <DataStatusBanner />
            {children}
            <MobileNavigation />
            <CommandPalette />
            <ProductTour />
          </div>
        </AppSessionProvider>
        <Analytics />
      </body>
    </html>
  );
}
