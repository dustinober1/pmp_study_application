import type { Metadata } from "next";
import localFont from "next/font/local";
import "./globals.css";
import { MainLayout } from "@/components/layout";

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
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
      >
        <MainLayout>{children}</MainLayout>
      </body>
    </html>
  );
}
