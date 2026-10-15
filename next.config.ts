import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Telefondan tunnel (masalan, cloudflared) orqali sinash uchun manzilni shu yerga qo'shish mumkin
  allowedDevOrigins: process.env.DEV_TUNNEL_HOST ? [process.env.DEV_TUNNEL_HOST] : [],
  // Paneldagi server amallari: tovar rasmi va Excel prays-list (standart 1 MB telefon rasmiga yetmaydi;
  // Vercel funksiyasi baribir 4,5 MB dan kattasini qabul qilmaydi)
  experimental: { serverActions: { bodySizeLimit: "4.5mb" } },
};

export default nextConfig;
