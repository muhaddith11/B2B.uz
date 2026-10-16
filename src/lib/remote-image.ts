import { createHash } from "node:crypto";
import { lookup, type LookupAddress } from "node:dns";
import { request } from "node:https";
import { BlockList, isIP } from "node:net";
import type { PreparedUpload } from "./uploads";

// Prays-listdagi "Rasm havolasi": internetdagi rasm serverga yuklab olinib, o'z omborimizda saqlanadi.
// Shunda do'kon telefoni begona serverga murojaat qilmaydi (distribyutor yoki boshqa sayt do'konlarning IP manzilini
// kuzata olmaydi), rasm esa havola o'chib ketsa ham ko'rinaveradi.
// Xavfsizlik: faqat https, yo'naltirish (redirect) kuzatilmaydi, ichki tarmoq manzillari (localhost, 10.x, 192.168.x,
// bulut metama'lumot xizmati va h.k.) taqiqlanadi. Manzil ulanish paytida tekshiriladi: DNS javobini almashtirib
// (DNS rebinding) ichki tarmoqqa kirib bo'lmaydi.

const MAX_BYTES = 4 * 1024 * 1024;
const TIMEOUT_MS = 6_000;
const TYPES: Record<string, string> = { "image/jpeg": "jpg", "image/png": "png", "image/webp": "webp" };

const PRIVATE = new BlockList();
for (const [net, prefix] of [
  ["0.0.0.0", 8],
  ["10.0.0.0", 8],
  ["100.64.0.0", 10],
  ["127.0.0.0", 8],
  ["169.254.0.0", 16],
  ["172.16.0.0", 12],
  ["192.0.0.0", 24],
  ["192.168.0.0", 16],
  ["198.18.0.0", 15],
  ["224.0.0.0", 3],
] as const)
  PRIVATE.addSubnet(net, prefix, "ipv4");
for (const [net, prefix] of [
  ["::", 128],
  ["::1", 128],
  ["fc00::", 7],
  ["fe80::", 10],
  ["ff00::", 8],
] as const)
  PRIVATE.addSubnet(net, prefix, "ipv6");

// Internetdagi (ochiq) manzilmi: ichki tarmoq, localhost va maxsus manzillar emas
export function isPublicAddress(ip: string): boolean {
  const family = isIP(ip);
  if (family === 0) return false;
  if (family === 6) {
    // IPv4 manzilning IPv6 ko'rinishi (::ffff:127.0.0.1)
    const mapped = /^::ffff:(\d+\.\d+\.\d+\.\d+)$/i.exec(ip);
    if (mapped) return isPublicAddress(mapped[1]);
    return !PRIVATE.check(ip, "ipv6");
  }
  return !PRIVATE.check(ip, "ipv4");
}

// Fayl haqiqatan rasmmi: birinchi baytlar turiga mos kelishi kerak (sarlavhadagi content-type ga ishonilmaydi)
export function imageTypeOf(buf: Buffer): string | null {
  if (buf.length >= 3 && buf[0] === 0xff && buf[1] === 0xd8 && buf[2] === 0xff) return "image/jpeg";
  if (buf.length >= 8 && buf.subarray(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]))) return "image/png";
  if (buf.length >= 12 && buf.toString("ascii", 0, 4) === "RIFF" && buf.toString("ascii", 8, 12) === "WEBP") return "image/webp";
  return null;
}

// Ulanish faqat ochiq manzilga: DNS javobidagi har bir manzil tekshiriladi
function safeLookup(hostname: string, options: object, callback: (err: Error | null, address: string | LookupAddress[], family?: number) => void) {
  lookup(hostname, { ...options, all: true }, (err, addresses) => {
    if (err) return callback(err, []);
    const list = addresses as LookupAddress[];
    if (list.length === 0 || list.some((a) => !isPublicAddress(a.address))) return callback(new Error(`ichki tarmoq manzili: ${hostname}`), []);
    const all = (options as { all?: boolean }).all;
    if (all) return callback(null, list);
    callback(null, list[0].address, list[0].family);
  });
}

export async function fetchRemoteImage(url: string): Promise<PreparedUpload> {
  const u = new URL(url);
  if (u.protocol !== "https:") throw new Error("faqat https");
  if (u.port && u.port !== "443") throw new Error("faqat 443-port");
  if (u.username || u.password) throw new Error("havolada login bo'lmasin");
  if (isIP(u.hostname.replace(/^\[|\]$/g, "")) && !isPublicAddress(u.hostname.replace(/^\[|\]$/g, ""))) throw new Error("ichki tarmoq manzili");

  const buf = await new Promise<Buffer>((resolve, reject) => {
    const req = request(u, { method: "GET", lookup: safeLookup, timeout: TIMEOUT_MS, headers: { accept: "image/jpeg,image/png,image/webp", "user-agent": "CaptarImageImport/1.0" } }, (res) => {
      if (res.statusCode !== 200) {
        res.resume();
        return reject(new Error(`javob ${res.statusCode}`));
      }
      const declared = Number(res.headers["content-length"] ?? 0);
      if (declared > MAX_BYTES) {
        res.destroy();
        return reject(new Error("rasm 4 MB dan katta"));
      }
      const chunks: Buffer[] = [];
      let size = 0;
      res.on("data", (chunk: Buffer) => {
        size += chunk.length;
        if (size > MAX_BYTES) {
          res.destroy();
          reject(new Error("rasm 4 MB dan katta"));
          return;
        }
        chunks.push(chunk);
      });
      res.on("end", () => resolve(Buffer.concat(chunks)));
      res.on("error", reject);
    });
    req.on("timeout", () => req.destroy(new Error("javob kelmadi")));
    req.on("error", reject);
    req.end();
  });

  const type = imageTypeOf(buf);
  if (!type) throw new Error("rasm emas (JPG, PNG yoki WEBP bo'lsin)");
  const data = Buffer.from(buf) as Buffer<ArrayBuffer>;
  return { buf: data, type, ext: TYPES[type], hash: createHash("sha256").update(data).digest("hex") };
}
