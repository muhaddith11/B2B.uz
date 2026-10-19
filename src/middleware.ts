import { NextResponse, type NextRequest } from "next/server";

// Mobil ilova API'si: token Authorization sarlavhasida yuradi, cookie ishlatilmaydi,
// shuning uchun istalgan manbaga ruxsat berish xavfsiz. Panel (cookie bilan) bunga kirmaydi.
const CORS_HEADERS = {
  "access-control-allow-origin": "*",
  "access-control-allow-methods": "GET, POST, PUT, PATCH, DELETE, OPTIONS",
  "access-control-allow-headers": "authorization, content-type, x-lang",
  "access-control-max-age": "86400",
};

export function middleware(req: NextRequest) {
  if (req.method === "OPTIONS") return new NextResponse(null, { status: 204, headers: CORS_HEADERS });
  const res = NextResponse.next();
  for (const [k, v] of Object.entries(CORS_HEADERS)) res.headers.set(k, v);
  return res;
}

export const config = {
  matcher: ["/api/shop/:path*", "/api/auth/:path*", "/api/staff/:path*", "/api/brand/:path*", "/api/push/:path*", "/api/files/:path*", "/api/account/:path*", "/api/client-errors"],
};
