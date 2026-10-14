// Payme va Click to'lov sahifasi havolalari: qarz to'lovi (distribyutor kassasi) va obuna (platforma kassasi) uchun umumiy

export function publicUrl(): string {
  return (process.env.PUBLIC_URL || "http://localhost:3000").replace(/\/$/, "");
}

export function paymeCheckoutUrl(merchantId: string, paymentId: string, amount: number, returnUrl: string, test = false): string {
  const params = `m=${merchantId};ac.order_id=${paymentId};a=${amount * 100};c=${returnUrl}`;
  return `https://checkout.${test ? "test." : ""}paycom.uz/${Buffer.from(params).toString("base64")}`;
}

export function clickCheckoutUrl(serviceId: string, merchantId: string, paymentId: string, amount: number, returnUrl: string): string {
  const q = new URLSearchParams({ service_id: serviceId, merchant_id: merchantId, amount: String(amount), transaction_param: paymentId, return_url: returnUrl });
  return `https://my.click.uz/services/pay?${q}`;
}

export const paymeTestMode = () => process.env.PAYME_TEST === "1";
