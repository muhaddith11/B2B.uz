// Kunlik zaxira nusxa (.github/workflows/backup.yml) uchun GitHub sirlarini o'rnatadi va birinchi nusxani boshlaydi.
// Kompyuteringizda ishlaydi: baza manzili Vercel production'dan olinadi, parol shu yerda yaratiladi va ikkalasi
// to'g'ridan-to'g'ri GitHub'ga yoziladi, ekranga chiqmaydi. Parol Hujjatlar papkasidagi faylga saqlanadi:
// uni parollar menejeriga ko'chiring, u yo'qolsa nusxalarni ochib bo'lmaydi.
// Qayta ishga tushirsa, o'sha parol ishlatiladi (fayl bor bo'lsa). Kerak: Vercel CLI'ga kirilgan, GitHub CLI (gh).
//   node scripts/backup-secrets.mjs
import { spawnSync } from 'node:child_process';
import { randomBytes } from 'node:crypto';
import { existsSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { homedir } from 'node:os';
import path from 'node:path';

const REPO = 'muhaddith11/B2B.uz';
const root = path.resolve(import.meta.dirname, '..');
const win = process.platform === 'win32';

function run(cmd, args, opts = {}) {
  // vercel Windows'da .cmd fayl: uni faqat shell orqali ishga tushirib bo'ladi
  const r = spawnSync(cmd, args, { cwd: root, stdio: 'inherit', shell: win && cmd === 'vercel', ...opts });
  if (r.error) throw new Error(`${cmd} ishga tushmadi: ${r.error.message}`);
  return r.status ?? 1;
}

function fail(message) {
  console.error(`\nXato: ${message}`);
  process.exit(1);
}

// .env fayldan bitta qiymat (qo'shtirnoqsiz)
export function envValue(text, name) {
  const line = text.split(/\r?\n/).find((l) => l.startsWith(`${name}=`));
  if (!line) return null;
  return line.slice(name.length + 1).trim().replace(/^"(.*)"$/, '$1');
}

// pg_dump uchun to'g'ridan-to'g'ri ulanish kerak: pooler (Neon'da xost nomida "-pooler") orqali emas
export function directUrl(env) {
  const unpooled = envValue(env, 'DATABASE_URL_UNPOOLED');
  if (unpooled) return unpooled;
  const pooled = envValue(env, 'DATABASE_URL');
  return pooled ? pooled.replace(/-pooler\./, '.') : null;
}

function setSecret(name, value) {
  const status = run('gh', ['secret', 'set', name, '--repo', REPO], { input: value, stdio: ['pipe', 'inherit', 'inherit'] });
  if (status !== 0) fail(`${name} GitHub'ga yozilmadi`);
  console.log(`✓ ${name} GitHub'ga yozildi`);
}

function main() {
  // 1. GitHub: kirilmagan bo'lsa, brauzer orqali bir martalik kirish
  if (run('gh', ['auth', 'status'], { stdio: 'ignore' }) !== 0) {
    console.log("GitHub'ga kirish kerak: brauzer ochiladi, terminaldagi kodni kiriting.\n");
    if (run('gh', ['auth', 'login', '--hostname', 'github.com', '--git-protocol', 'https', '--web']) !== 0) fail("GitHub'ga kirilmadi");
  }

  // 2. Baza manzili: Vercel production o'zgaruvchilaridan, vaqtinchalik faylga (.env.* git'ga tushmaydi), darhol o'chiriladi
  const tmp = path.join(root, '.env.backup-pull.tmp');
  let url;
  try {
    if (run('vercel', ['env', 'pull', tmp, '--environment=production', '--yes'], { stdio: ['inherit', 'ignore', 'inherit'] }) !== 0) {
      fail("Vercel'dan o'zgaruvchilar olinmadi. Terminalda `vercel login` qilib, qayta urinib ko'ring");
    }
    url = directUrl(readFileSync(tmp, 'utf8'));
  } finally {
    rmSync(tmp, { force: true });
  }
  if (!url || !/^postgres(ql)?:\/\//.test(url)) {
    fail("Vercel'da baza manzili topilmadi yoki yashirin (Sensitive). Vercel -> Storage -> b2b-uz-db-eu -> .env.local dan DATABASE_URL_UNPOOLED ni GitHub'ga qo'lda kiriting");
  }
  setSecret('BACKUP_DATABASE_URL', url);

  // 3. Parol: bir marta yaratiladi, Hujjatlar papkasida saqlanadi
  const docs = path.join(homedir(), 'Documents');
  const file = path.join(existsSync(docs) ? docs : homedir(), 'captar-zaxira-paroli.txt');
  let passphrase = existsSync(file) ? readFileSync(file, 'utf8').trim() : '';
  if (passphrase) {
    console.log(`Parol fayli bor, o'sha ishlatiladi: ${file}`);
  } else {
    passphrase = randomBytes(32).toString('base64');
    writeFileSync(file, `${passphrase}\n`);
  }
  setSecret('BACKUP_PASSPHRASE', passphrase);

  // 4. Birinchi nusxa
  if (run('gh', ['workflow', 'run', 'backup.yml', '--repo', REPO]) !== 0) fail("Birinchi nusxa boshlanmadi: GitHub -> Actions -> Zaxira nusxa -> Run workflow ni bosing");

  console.log(`
Tayyor. Birinchi nusxa boshlandi, 2-3 daqiqada tugaydi:
  https://github.com/${REPO}/actions/workflows/backup.yml

Zaxira paroli shu faylda: ${file}
Uni parollar menejeriga (yoki xavfsiz joyga) ko'chiring. Parol yo'qolsa, nusxalarni ochib bo'lmaydi.`);
}

// Faqat to'g'ridan-to'g'ri ishga tushirilganda (sinovda import qilinganda emas)
if (process.argv[1] && path.resolve(process.argv[1]) === import.meta.filename) main();
