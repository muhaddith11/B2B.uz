import type { NextConfig } from "next";

// Barcha sahifa va API javoblaridagi xavfsizlik sarlavhalari:
// - sayt (ayniqsa /admin va /panel) boshqa saytga iframe ichida joylanmaydi: tugmalarni yashirincha bostirib bo'lmaydi;
// - brauzer fayl turini taxmin qilmaydi (yuklangan chek yoki rasm sahifa sifatida ochilmaydi);
// - boshqa saytga o'tilganda manzildagi parametrlar (masalan, telefon) yuborilmaydi;
// - sayt kamera, mikrofon va joylashuvni so'ramaydi.
const SECURITY_HEADERS = [
  { key: "Content-Security-Policy", value: "frame-ancestors 'none'; base-uri 'self'; object-src 'none'" },
  { key: "X-Frame-Options", value: "DENY" },
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=()" },
  { key: "Strict-Transport-Security", value: "max-age=31536000" },
];

const nextConfig: NextConfig = {
  // Telefondan tunnel (masalan, cloudflared) orqali sinash uchun manzilni shu yerga qo'shish mumkin
  allowedDevOrigins: process.env.DEV_TUNNEL_HOST ? [process.env.DEV_TUNNEL_HOST] : [],
  // Paneldagi server amallari: tovar rasmi va Excel prays-list (standart 1 MB telefon rasmiga yetmaydi;
  // Vercel funksiyasi baribir 4,5 MB dan kattasini qabul qilmaydi)
  experimental: { serverActions: { bodySizeLimit: "4.5mb" } },
  async headers() {
    return [{ source: "/:path*", headers: SECURITY_HEADERS }];
  },
};

export default nextConfig;
