import { cookies } from "next/headers";
import { verifyToken } from "@/lib/token";

// Obuna sahifasiga SMS kod bilan kirgan raqam: qisqa muddatli, faqat /obuna yo'lida yuradigan cookie
export const SUBSCRIPTION_COOKIE = "obuna_session";
export const SUBSCRIPTION_SESSION_SECONDS = 30 * 60;

export async function subscriptionPhone(): Promise<string | null> {
  const payload = verifyToken((await cookies()).get(SUBSCRIPTION_COOKIE)?.value, "obuna");
  return payload?.kind === "phone" ? payload.phone : null;
}
