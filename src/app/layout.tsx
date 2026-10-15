import type { Metadata, Viewport } from "next";
import { Golos_Text, Unbounded } from "next/font/google";
import "./globals.css";

// Shriftlar build paytida yuklab olinib, o'z serverimizdan beriladi (Google'ga so'rov ketmaydi)
const unbounded = Unbounded({ subsets: ["latin", "latin-ext", "cyrillic"], weight: ["500", "600", "700"], variable: "--font-unbounded", display: "swap" });
const golos = Golos_Text({ subsets: ["latin", "latin-ext", "cyrillic"], weight: ["400", "500", "600", "700"], variable: "--font-golos", display: "swap" });

export const metadata: Metadata = {
  title: "Captar",
  description: "Distribyutor va do'konlar uchun buyurtma, nasiya va to'lov",
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="uz" className={`${unbounded.variable} ${golos.variable}`}>
      <body>{children}</body>
    </html>
  );
}
