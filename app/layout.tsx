import type { Metadata, Viewport } from "next";
import { Inter, JetBrains_Mono } from "next/font/google";
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

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
  display: "swap",
  preload: true,
});

const jetbrainsMono = JetBrains_Mono({
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
    icon: "/icon.svg",
    shortcut: "/icon.svg",
    apple: "/icon.svg",
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
    <html lang="pt-BR" data-scroll-behavior="smooth">
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
