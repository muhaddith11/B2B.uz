// Server manzili: telefonda sinashda kompyuterning lokal tarmoqdagi IP manzili (masalan, http://192.168.1.10:3000)
export const API_URL = (process.env.EXPO_PUBLIC_API_URL ?? 'http://localhost:3000').replace(/\/$/, '');

export class ApiError extends Error {
  constructor(
    public status: number,
    message: string,
  ) {
    super(message);
  }
}

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
        ...(headers as Record<string, string> | undefined),
      },
    });
  } catch {
    throw new ApiError(0, "Server bilan aloqa yo'q. Internetni tekshiring");
  }
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new ApiError(res.status, data.error ?? 'Xato');
  return data as T;
}
