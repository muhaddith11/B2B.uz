// SMS yuborish: Eskiz.uz orqali. Sozlanmagan bo'lsa (lokal sinov), matn server logiga chiqadi.
// Eskiz'da ishlab chiqarishda faqat oldindan tasdiqlangan shablon matnlari yuboriladi.

const ESKIZ_URL = "https://notify.eskiz.uz/api";
let eskizToken: { value: string; until: number } | null = null;

export function smsConfigured(): boolean {
  return Boolean(process.env.ESKIZ_EMAIL && process.env.ESKIZ_PASSWORD);
}

// SMS xizmati yo'q va sinov (DEV_AUTH) yoki demo (DEMO_OTP=1) rejimi: kirish kodi javobda/ekranda qaytadi.
// DEMO_OTP faqat demo ma'lumotli server uchun: istalgan raqam bilan kirish mumkin bo'ladi.
export function exposeCode(): boolean {
  if (smsConfigured()) return false;
  return (process.env.DEV_AUTH === "1" && process.env.NODE_ENV !== "production") || process.env.DEMO_OTP === "1";
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

export async function sendSms(phone: string, text: string): Promise<void> {
  if (!smsConfigured()) {
    console.log(`[SMS sinov] ${phone}: ${text}`);
    return;
  }
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
