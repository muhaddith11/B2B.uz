// Serverdagi src/lib/money.ts bilan bir xil: o'zgartirsangiz, ikkalasini ham yangilang

// 1234500 -> "1 234 500" (uzilmaydigan bo'sh joy bilan: summa va "so'm" ikki qatorga bo'linmaydi)
export function formatAmount(n: number): string {
  const sign = n < 0 ? '−' : '';
  return sign + Math.abs(Math.round(n)).toString().replace(/\B(?=(\d{3})+(?!\d))/g, ' ');
}

export function formatSom(n: number): string {
  return `${formatAmount(n)} so'm`;
}

// "07.10.2026"
export function formatDate(d: Date | string): string {
  const x = typeof d === 'string' ? new Date(d) : d;
  const p = (n: number) => String(n).padStart(2, '0');
  return `${p(x.getDate())}.${p(x.getMonth() + 1)}.${x.getFullYear()}`;
}
