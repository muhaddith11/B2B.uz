import { HttpError } from "./session";
import { prepareImage, storeUpload, type UploadFolder } from "./uploads";

// Rasm (tovar, logo, avatar): ilovadan yoki paneldan FormData "image" maydonida keladi, saqlanib havolasi qaytadi
export async function saveImage(req: Request, folder: Exclude<UploadFolder, "receipts">): Promise<string> {
  const form = await req.formData().catch(() => null);
  const file = form?.get("image");
  if (!(file instanceof File)) throw new HttpError(400, "Faqat rasm (JPG, PNG, WEBP) yuklang");
  const saved = await storeUpload(folder, await prepareImage(file));
  return saved.url;
}

export function saveProductImage(req: Request): Promise<string> {
  return saveImage(req, "products");
}
