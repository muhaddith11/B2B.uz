// Vercel build: muhitga qarab (VERCEL_ENV). package.json → "vercel-build".
// - production: sozlamalar tekshiriladi (xato bo'lsa deploy to'xtaydi), migratsiyalar qo'llanadi, App Store tekshiruvchisi
//   uchun demo hisoblar yaratiladi (REVIEW_PHONE bo'lsa), keyin next build;
// - preview (pull request): migratsiya FAQAT MIGRATE_ON_BUILD=1 bo'lsa. Preview production bazasiga ulangan bo'lsa,
//   tekshirilmagan branch migratsiyasi production bazani o'zgartirib yubormasin. Har preview'ga alohida Neon branch
//   ulangan bo'lsa (Vercel → Neon integratsiyasi), Preview muhitiga MIGRATE_ON_BUILD=1 yoziladi (docs/RUNBOOK.md).
import { execSync } from "node:child_process";
import { checkProductionEnv } from "../src/lib/env-check";

const env = process.env.VERCEL_ENV ?? "development";
const run = (cmd: string) => execSync(cmd, { stdio: "inherit" });

if (env === "production") {
  const { errors, warnings } = checkProductionEnv(process.env);
  for (const w of warnings) console.warn(`⚠️  ${w}`);
  if (errors.length) {
    for (const e of errors) console.error(`❌ ${e}`);
    throw new Error("Production sozlamalari noto'g'ri: deploy to'xtatildi (yuqoridagi xatolarga qarang)");
  }
}

run("prisma generate");
if (env === "production" || process.env.MIGRATE_ON_BUILD === "1") run("prisma migrate deploy");
else console.log(`[build] ${env}: migratsiya qo'llanmadi (MIGRATE_ON_BUILD=1 bilan yoqiladi)`);
if (env === "production") run("node --import tsx prisma/review.ts --if-configured");
run("next build");
