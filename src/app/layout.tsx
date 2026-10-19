import type { Metadata, Viewport } from "next";
import localFont from "next/font/local";
import "./globals.css";

// Shriftlar repoda (src/app/fonts, OFL): build tashqi xizmatga bog'liq emas, Google'ga so'rov ketmaydi.
// Mobil ilovadagi @expo-google-fonts fayllaridan lotin, kirill va o'zbek harflari ajratib olingan.
const unbounded = localFont({
  src: [
    { path: "./fonts/unbounded-500.woff2", weight: "500" },
    { path: "./fonts/unbounded-600.woff2", weight: "600" },
    { path: "./fonts/unbounded-700.woff2", weight: "700" },
  ],
  variable: "--font-unbounded",
  display: "swap",
});
const golos = localFont({
  src: [
    { path: "./fonts/golos-text-400.woff2", weight: "400" },
    { path: "./fonts/golos-text-500.woff2", weight: "500" },
    { path: "./fonts/golos-text-600.woff2", weight: "600" },
    { path: "./fonts/golos-text-700.woff2", weight: "700" },
  ],
  variable: "--font-golos",
  display: "swap",
});

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
