import type { Metadata, Viewport } from "next";
import localFont from "next/font/local";
import "./globals.css";
import { MainLayout } from "@/components/layout";
import PWAInstaller, { useServiceWorker } from "@/components/pwa/PWAInstaller";
import { BMCButton } from "@/components/layout/BMCButton";

const geistSans = localFont({
  src: "./fonts/GeistVF.woff",
  variable: "--font-geist-sans",
  weight: "100 900",
});
const geistMono = localFont({
  src: "./fonts/GeistMonoVF.woff",
  variable: "--font-geist-mono",
  weight: "100 900",
});

export const metadata: Metadata = {
  title: "PMP 2026 Study App",
  description: "Prepare for the PMP 2026 exam with flashcards, practice tests, and progress tracking organized by ECO Domains and Tasks.",
  keywords: ["PMP", "PMP 2026", "Project Management", "Certification", "Study", "Flashcards", "Practice Tests"],
  manifest: "/manifest.json",
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "PMP Study",
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  themeColor: "#2563eb",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <head>
        <link rel="icon" href="/icon-192.png" sizes="192x192" />
        <link rel="apple-touch-icon" href="/icon-192.png" />
      </head>
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
      >
        <MainLayout>{children}</MainLayout>
        <PWAInstaller />
        <BMCButton />
      </body>
    </html>
  );
}
