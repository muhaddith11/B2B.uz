// SMS yuborish (kirish kodi). Xizmat: TextUP (asosiy) yoki Eskiz.uz (zaxira).
// Hech biri sozlanmagan bo'lsa (lokal sinov), matn server logiga chiqadi.

// ---- TextUP: https://api-auth.textup.uz (login), https://sms-api.textup.uz (yuborish) ----

const TEXTUP_AUTH_URL = "https://api-auth.textup.uz/v1";
const TEXTUP_SMS_URL = "https://sms-api.textup.uz/v1";
let textupSession: { token: string; userId: string; until: number } | null = null;

function textupConfigured(): boolean {
  return Boolean(process.env.TEXTUP_EMAIL && process.env.TEXTUP_PASSWORD);
}

// JWT ichidagi exp (soniya); o'qib bo'lmasa, 1 soat
function tokenExpiry(jwt: string): number {
  try {
    const payload = JSON.parse(Buffer.from(jwt.split(".")[1] ?? "", "base64url").toString("utf8")) as { exp?: number };
    if (payload.exp) return payload.exp * 1000;
  } catch {
    /* JWT emas */
  }
  return Date.now() + 60 * 60 * 1000;
}

async function textupLogin(): Promise<{ token: string; userId: string }> {
  // Muddati tugashiga bir daqiqa qolganda yangilanadi
  if (textupSession && textupSession.until - 60_000 > Date.now()) return textupSession;
  const res = await fetch(`${TEXTUP_AUTH_URL}/login`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ email: process.env.TEXTUP_EMAIL, password: process.env.TEXTUP_PASSWORD }),
  });
  const raw = await res.text().catch(() => "");
  let data: { accessToken?: string; user?: { id?: string } } = {};
  try {
    data = JSON.parse(raw);
  } catch {
    /* JSON emas */
  }
  // 404 {"error":"Not Found"}: TextUP bunday email/parol bilan hisob topmadi
  if (!res.ok || !data.accessToken || !data.user?.id) throw new Error(`TextUP login: ${res.status} ${raw.slice(0, 200)}`);
  textupSession = { token: data.accessToken, userId: data.user.id, until: tokenExpiry(data.accessToken) };
  return textupSession;
}

async function textupSend(phone: string, text: string): Promise<void> {
  const send = async ({ token, userId }: { token: string; userId: string }) =>
    fetch(`${TEXTUP_SMS_URL}/send`, {
      method: "POST",
      headers: { "content-type": "application/json", authorization: `Bearer ${token}` },
      body: JSON.stringify({
        message: text,
        userId,
        recipients: [phone],
        name: "Kirish kodi",
        isOtp: true,
        // Alfa-nom (jo'natuvchi nomi) va tasdiqlangan shablon: kabinetda bo'lsa
        ...(process.env.TEXTUP_NICKNAME_ID ? { nicknameId: process.env.TEXTUP_NICKNAME_ID } : {}),
        ...(process.env.TEXTUP_TEMPLATE_ID ? { templateId: process.env.TEXTUP_TEMPLATE_ID } : {}),
      }),
    });
  let res = await send(await textupLogin());
  if (res.status === 401) {
    textupSession = null;
    res = await send(await textupLogin());
  }
  if (!res.ok) throw new Error(`TextUP SMS: ${res.status} ${await res.text().catch(() => "")}`);
}

// ---- Eskiz.uz ----

const ESKIZ_URL = "https://notify.eskiz.uz/api";
let eskizToken: { value: string; until: number } | null = null;

function eskizConfigured(): boolean {
  return Boolean(process.env.ESKIZ_EMAIL && process.env.ESKIZ_PASSWORD);
}

async function eskizLogin(): Promise<string> {
  if (eskizToken && eskizToken.until > Date.now()) return eskizToken.value;
  const form = new FormData();
  form.set("email", process.env.ESKIZ_EMAIL ?? "");
  form.set("password", process.env.ESKIZ_PASSWORD ?? "");
  const res = await fetch(`${ESKIZ_URL}/auth/login`, { method: "POST", body: form });
  const data = (await res.json().catch(() => ({}))) as { data?: { token?: string } };
  if (!res.ok || !data.data?.token) throw new Error(`Eskiz login: ${res.status}`);
  // Token 30 kun amal qiladi; ehtiyot uchun 25 kundan keyin yangilanadi
  eskizToken = { value: data.data.token, until: Date.now() + 25 * 24 * 60 * 60 * 1000 };
  return eskizToken.value;
}

async function eskizSend(phone: string, text: string): Promise<void> {
  const send = async (token: string) => {
    const form = new FormData();
    form.set("mobile_phone", phone.replace(/^\+/, ""));
    form.set("message", text);
    form.set("from", process.env.ESKIZ_FROM || "4546");
    return fetch(`${ESKIZ_URL}/message/sms/send`, { method: "POST", headers: { authorization: `Bearer ${token}` }, body: form });
  };
  let res = await send(await eskizLogin());
  if (res.status === 401) {
    eskizToken = null;
    res = await send(await eskizLogin());
  }
  if (!res.ok) throw new Error(`Eskiz SMS: ${res.status} ${await res.text().catch(() => "")}`);
}

// ---- Umumiy ----

export function smsConfigured(): boolean {
  return textupConfigured() || eskizConfigured();
}

// SMS xizmati yo'q va sinov (DEV_AUTH) yoki demo (DEMO_OTP=1) rejimi: kirish kodi javobda/ekranda qaytadi.
// DEMO_OTP faqat demo ma'lumotli server uchun: istalgan raqam bilan kirish mumkin bo'ladi.
export function exposeCode(): boolean {
  if (smsConfigured()) return false;
  return (process.env.DEV_AUTH === "1" && process.env.NODE_ENV !== "production") || process.env.DEMO_OTP === "1";
}

export async function sendSms(phone: string, text: string): Promise<void> {
  if (textupConfigured()) return textupSend(phone, text);
  if (eskizConfigured()) return eskizSend(phone, text);
  console.log(`[SMS sinov] ${phone}: ${text}`);
}

// Testlar uchun: saqlangan tokenlarni tozalash
export function resetSmsSessions() {
  textupSession = null;
  eskizToken = null;
}
