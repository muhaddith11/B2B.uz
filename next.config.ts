import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Telefondan tunnel (masalan, cloudflared) orqali sinash uchun manzilni shu yerga qo'shish mumkin
  allowedDevOrigins: process.env.DEV_TUNNEL_HOST ? [process.env.DEV_TUNNEL_HOST] : [],
};

export default nextConfig;
