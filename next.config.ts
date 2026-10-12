import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Telegram Mini App sinovi uchun tunnel (masalan, cloudflared) manzilini shu yerga qo'shish mumkin
  allowedDevOrigins: process.env.DEV_TUNNEL_HOST ? [process.env.DEV_TUNNEL_HOST] : [],
};

export default nextConfig;
