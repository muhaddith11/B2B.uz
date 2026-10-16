import { adjustInput, adjustLedger, CORRECTION_ROLES } from "@/lib/corrections";
import { handle, readJson, requireStaff } from "@/lib/session";

// Qarz daftariga tuzatish yozuvi: qaytarilgan tovar, chegirma, eski qarz (admin va hisobchi)
export const POST = handle(async (req: Request) => {
  const staff = await requireStaff(req, CORRECTION_ROLES);
  const input = await readJson(req, adjustInput, "Summa va sababni kiriting");
  const entry = await adjustLedger(staff, input);
  return Response.json({ id: entry.id });
});
