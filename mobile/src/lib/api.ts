import { getLang, t } from './i18n';

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
    res = await fetch(`${API_URL}${path}`, {
      ...rest,
      headers: {
        ...(isForm ? {} : { 'content-type': 'application/json' }),
        ...(token ? { authorization: `Bearer ${token}` } : {}),
        'x-lang': getLang(),
        ...(headers as Record<string, string> | undefined),
      },
    });
  } catch {
    throw new ApiError(0, t("Server bilan aloqa yo'q. Internetni tekshiring"));
  }
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new ApiError(res.status, data.error ?? t('Xato'));
  return data as T;
}
