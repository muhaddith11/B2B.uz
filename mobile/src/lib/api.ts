import { getLang, t } from './i18n';
import { fetchWithTimeout, REQUEST_TIMEOUT_MS, TimeoutError, UPLOAD_TIMEOUT_MS } from './net';

// Server manzili: telefonda sinashda kompyuterning lokal tarmoqdagi IP manzili (masalan, http://192.168.1.10:3000)
export const API_URL = (process.env.EXPO_PUBLIC_API_URL ?? 'http://localhost:3000').replace(/\/$/, '');

// Server qaytargan rasm havolasi nisbiy bo'lishi mumkin (/api/files/...): to'liq manzilga aylantiradi
export function fileUrl(url: string): string {
  return url.startsWith('/') ? `${API_URL}${url}` : url;
}

export class ApiError extends Error {
  constructor(
    public status: number,
    message: string,
  ) {
    super(message);
  }
}

// Har so'rovda ilova tili yuboriladi: server xato matnini shu tilda qaytaradi
export async function request<T>(path: string, init: RequestInit & { token?: string | null } = {}): Promise<T> {
  const { token, headers, ...rest } = init;
  // Fayl yuborishda (FormData) content-type'ni fetch o'zi qo'yadi
  const isForm = typeof FormData !== 'undefined' && rest.body instanceof FormData;
  let res: Response;
  try {
    const init: RequestInit = {
      ...rest,
      headers: {
        ...(isForm ? {} : { 'content-type': 'application/json' }),
        ...(token ? { authorization: `Bearer ${token}` } : {}),
        'x-lang': getLang(),
        ...(headers as Record<string, string> | undefined),
      },
    };
    res = await fetchWithTimeout(fetch, `${API_URL}${path}`, init, isForm ? UPLOAD_TIMEOUT_MS : REQUEST_TIMEOUT_MS);
  } catch (e) {
    if (e instanceof TimeoutError) throw new ApiError(0, t("Server javob bermadi. Internetni tekshirib, qayta urinib ko'ring"));
    throw new ApiError(0, t("Server bilan aloqa yo'q. Internetni tekshiring"));
  }
  const data = await res.json().catch(() => ({}));
  // 413: fayl serverga sig'madi (Vercel 4,5 MB dan kattasini o'zi qaytaradi, javobi JSON emas)
  if (res.status === 413) throw new ApiError(413, t('Fayl juda katta. Kichikroq rasm tanlang'));
  if (!res.ok) throw new ApiError(res.status, data.error ?? t('Xato'));
  return data as T;
}
