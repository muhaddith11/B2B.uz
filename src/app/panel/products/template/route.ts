import { templateWorkbook } from "@/lib/price-list-apply";
import { getStaff } from "@/lib/session";

// Prays-list shabloni: distribyutorning narx guruhlari ustun sifatida qo'shiladi
export async function GET() {
  const staff = await getStaff();
  if (!staff) return new Response("Kirish kerak", { status: 401 });
  const buf = await templateWorkbook(staff.distributorId);
  return new Response(new Uint8Array(buf), {
    headers: {
      "content-type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "content-disposition": 'attachment; filename="prays-list-shablon.xlsx"',
    },
  });
}
