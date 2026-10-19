import { PANEL_LANG_COOKIE } from "../panel-lang";

// Panel tilini almashtirish: /panel/lang?to=ru&back=/panel/orders. Faqat panel ichiga qaytariladi (boshqa saytga emas)
export async function GET(req: Request) {
  const url = new URL(req.url);
  const lang = url.searchParams.get("to") === "ru" ? "ru" : "uz";
  const back = url.searchParams.get("back") ?? "/panel";
  const target = /^\/panel(\/[\w/-]*)?(\?[\w=&%.-]*)?$/.test(back) ? back : "/panel";
  const res = Response.redirect(new URL(target, url.origin), 303);
  const headers = new Headers(res.headers);
  headers.append("set-cookie", `${PANEL_LANG_COOKIE}=${lang}; Path=/panel; Max-Age=${365 * 24 * 3600}; SameSite=Lax${process.env.NODE_ENV === "production" ? "; Secure" : ""}`);
  return new Response(null, { status: 303, headers });
}
