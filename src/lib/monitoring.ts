import { runAfterResponse } from "./background";

// Xatolar va muhim hodisalar kuzatuvi. Uch qatlam:
// 1. Har doim: bitta qatorli JSON log (Vercel → Logs da level, area bo'yicha qidiriladi, log drain orqali tashqariga beriladi);
// 2. SENTRY_DSN bo'lsa: Sentry'ga hodisa (SDK'siz, envelope API orqali: edge va node'da bir xil ishlaydi);
// 3. ALERT_TELEGRAM_BOT_TOKEN va ALERT_TELEGRAM_CHAT_ID bo'lsa: "fatal" hodisa (masalan, to'lov tizimi so'rovi yiqildi)
//    Telegram guruhiga darhol xabar bo'lib boradi.
// Bu fayl node: modullarini ishlatmaydi: middleware va instrumentation (edge) ichida ham chaqiriladi.

export type Level = "fatal" | "error" | "warning" | "info";
export type ErrorContext = { area: string } & Record<string, unknown>;

// Kontekstdagi maxfiy maydonlar logga ham, tashqi xizmatga ham chiqmaydi
const SECRET_KEY = /token|secret|password|authorization|cookie|key|code/i;
const PHONE = /\+?998\d{9}/g;

export function scrub(value: unknown, depth = 0): unknown {
  if (depth > 4) return "[...]";
  if (typeof value === "string") return value.replace(/Bearer\s+[\w.-]+/gi, "Bearer [yashirin]").replace(PHONE, (p) => `${p.slice(0, -7)}*******`);
  if (Array.isArray(value)) return value.slice(0, 20).map((v) => scrub(v, depth + 1));
  if (value && typeof value === "object") {
    return Object.fromEntries(Object.entries(value).map(([k, v]) => [k, SECRET_KEY.test(k) ? "[yashirin]" : scrub(v, depth + 1)]));
  }
  return value;
}

function asError(e: unknown): Error {
  if (e instanceof Error) return e;
  return new Error(typeof e === "string" ? e : JSON.stringify(e));
}

// ---- Sentry (envelope API) ----

type SentryTarget = { url: string; auth: string; dsn: string };

export function parseDsn(dsn: string | undefined): SentryTarget | null {
  if (!dsn) return null;
  try {
    const u = new URL(dsn);
    const projectId = u.pathname.replace(/^\/+|\/+$/g, "");
    if (!u.username || !projectId) return null;
    return {
      url: `${u.protocol}//${u.host}/api/${projectId}/envelope/`,
      auth: `Sentry sentry_version=7, sentry_key=${u.username}, sentry_client=captar/1.0`,
      dsn,
    };
  } catch {
    return null;
  }
}

type Frame = { function?: string; filename?: string; lineno?: number; colno?: number; in_app?: boolean };

// "    at fn (file:10:5)" qatorlari: Sentry kadrlarni eskisidan yangisiga qarab kutadi
export function parseStack(stack: string | undefined): Frame[] {
  if (!stack) return [];
  const frames: Frame[] = [];
  for (const line of stack.split("\n").slice(1, 51)) {
    const m = /^\s*at (?:(.+?) \()?(.+?):(\d+):(\d+)\)?$/.exec(line);
    if (!m) continue;
    frames.push({ function: m[1] || "?", filename: m[2], lineno: Number(m[3]), colno: Number(m[4]), in_app: !m[2].includes("node_modules") });
  }
  return frames.reverse();
}

export function sentryEnvelope(target: SentryTarget, error: Error, level: Level, context: Record<string, unknown>, now = new Date()): string {
  const eventId = globalThis.crypto.randomUUID().replace(/-/g, "");
  const { area, ...extra } = context;
  const event = {
    event_id: eventId,
    timestamp: now.getTime() / 1000,
    platform: "node",
    level,
    environment: process.env.VERCEL_ENV ?? process.env.NODE_ENV ?? "development",
    release: process.env.VERCEL_GIT_COMMIT_SHA,
    tags: { area: String(area ?? "unknown") },
    exception: { values: [{ type: error.name, value: error.message, stacktrace: { frames: parseStack(error.stack) } }] },
    extra,
  };
  return [JSON.stringify({ event_id: eventId, sent_at: now.toISOString(), dsn: target.dsn }), JSON.stringify({ type: "event" }), JSON.stringify(event)].join("\n");
}

async function sendToSentry(error: Error, level: Level, context: Record<string, unknown>) {
  const target = parseDsn(process.env.SENTRY_DSN);
  if (!target) return;
  const res = await fetch(target.url, {
    method: "POST",
    headers: { "content-type": "application/x-sentry-envelope", "x-sentry-auth": target.auth },
    body: sentryEnvelope(target, error, level, context),
    signal: AbortSignal.timeout(5000),
  });
  if (!res.ok) throw new Error(`Sentry: ${res.status}`);
}

// ---- Telegram ogohlantirishi ----

// Bir xil xato ketma-ket kelsa, guruh xabarga ko'milmasin: bir nusxada (funksiya instansiyasida) 10 daqiqada bir marta
const ALERT_EVERY_MS = 10 * 60 * 1000;
const lastAlert = new Map<string, number>();

export function shouldAlert(fingerprint: string, now = Date.now()): boolean {
  const last = lastAlert.get(fingerprint);
  if (last !== undefined && now - last < ALERT_EVERY_MS) return false;
  lastAlert.set(fingerprint, now);
  if (lastAlert.size > 500) lastAlert.delete(lastAlert.keys().next().value!);
  return true;
}

async function sendToTelegram(error: Error, context: Record<string, unknown>) {
  const token = process.env.ALERT_TELEGRAM_BOT_TOKEN;
  const chatId = process.env.ALERT_TELEGRAM_CHAT_ID;
  if (!token || !chatId) return;
  if (!shouldAlert(`${String(context.area)}:${error.message}`)) return;
  const env = process.env.VERCEL_ENV ?? process.env.NODE_ENV ?? "dev";
  const text = `🚨 Captar (${env}) · ${String(context.area)}\n${error.message}\n\n${JSON.stringify(context).slice(0, 1500)}`;
  const res = await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ chat_id: chatId, text, disable_web_page_preview: true }),
    signal: AbortSignal.timeout(5000),
  });
  if (!res.ok) throw new Error(`Telegram: ${res.status}`);
}

// ---- Umumiy ----

function log(level: Level, error: Error, context: Record<string, unknown>) {
  const line = JSON.stringify({ level, msg: error.message, name: error.name, ...context, stack: level === "info" ? undefined : error.stack?.split("\n").slice(0, 8).join("\n") });
  if (level === "warning" || level === "info") console.warn(line);
  else console.error(line);
}

async function deliver(error: Error, level: Level, context: Record<string, unknown>) {
  const jobs: Promise<void>[] = [];
  if (level !== "info") jobs.push(sendToSentry(error, level, context));
  if (level === "fatal") jobs.push(sendToTelegram(error, context));
  const results = await Promise.allSettled(jobs);
  // Kuzatuv xizmati ishlamasa, faqat logga: xato hisoboti o'zi xato hisobotini keltirib chiqarmasin
  for (const r of results) if (r.status === "rejected") console.warn(JSON.stringify({ level: "warning", area: "monitoring", msg: String((r.reason as Error)?.message ?? r.reason) }));
}

// Xatoni qayd qilish: darhol logga, tashqi xizmatlarga javobdan keyin (foydalanuvchi kutmaydi)
export function reportError(e: unknown, context: ErrorContext, level: Level = "error"): void {
  const error = asError(e);
  const safe = scrub(context) as Record<string, unknown>;
  log(level, error, safe);
  runAfterResponse(() => deliver(error, level, safe), () => {});
}

// So'rovdan tashqarida (instrumentation, skriptlar): yuborilishini kutadi
export async function captureError(e: unknown, context: ErrorContext, level: Level = "error"): Promise<void> {
  const error = asError(e);
  const safe = scrub(context) as Record<string, unknown>;
  log(level, error, safe);
  await deliver(error, level, safe);
}

// Muhim hodisa (xato emas): faqat log, masalan SMS chegarasi to'lgani
export function logEvent(message: string, context: ErrorContext, level: Level = "info"): void {
  log(level, new Error(message), scrub(context) as Record<string, unknown>);
}
