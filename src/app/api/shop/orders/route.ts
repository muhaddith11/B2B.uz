import { db } from "@/lib/db";
import { createOrder, createOrderInput } from "@/lib/orders";
import { errorResponse, HttpError, requireShopUser } from "@/lib/session";

export async function GET(req: Request) {
  try {
    const user = await requireShopUser(req);
    const orders = await db.order.findMany({
      where: { shopLink: { shopId: user.shopId } },
      include: {
        shopLink: { include: { distributor: { select: { name: true } } } },
        items: { include: { product: { select: { name: true, packSize: true } } } },
      },
      orderBy: { createdAt: "desc" },
      take: 50,
    });
    return Response.json({
      orders: orders.map((o) => ({
        id: o.id,
        number: o.number,
        status: o.status,
        paymentType: o.paymentType,
        total: o.total,
        deliveredTotal: o.deliveredTotal,
        createdAt: o.createdAt,
        rejectReason: o.rejectReason,
        distributor: { id: o.shopLink.distributorId, name: o.shopLink.distributor.name },
        items: o.items.map((i) => ({
          productId: i.productId,
          name: i.product.name,
          packSize: i.product.packSize,
          qty: i.qty,
          deliveredQty: i.deliveredQty,
          price: i.price,
        })),
      })),
    });
  } catch (e) {
    return errorResponse(e);
  }
}

// Savatdagi har bir distribyutor uchun alohida buyurtma yaratiladi
export async function POST(req: Request) {
  try {
    const user = await requireShopUser(req);
    const body = await req.json().catch(() => null);
    const parsed = createOrderInput.safeParse(body);
    if (!parsed.success) throw new HttpError(400, "Buyurtma ma'lumotlari noto'g'ri");
    const order = await createOrder(user, parsed.data);
    return Response.json({ id: order.id, number: order.number, total: order.total });
  } catch (e) {
    return errorResponse(e);
  }
}
