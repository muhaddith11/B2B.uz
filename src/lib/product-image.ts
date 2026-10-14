import { HttpError } from "./session";
import { prepareImage, storeUpload } from "./uploads";

// Tovar rasmi: ilovadan FormData "image" maydonida keladi, saqlanib havolasi qaytadi
export async function saveProductImage(req: Request): Promise<string> {
  const form = await req.formData().catch(() => null);
  const file = form?.get("image");
  if (!(file instanceof File)) throw new HttpError(400, "Faqat rasm (JPG, PNG, WEBP) yuklang");
  const saved = await storeUpload("products", await prepareImage(file));
  return saved.url;
}
