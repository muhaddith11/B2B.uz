import { db } from "@/lib/db";
import { createOrder, createOrderInput } from "@/lib/orders";
import { handle, readJson, requireShopUser } from "@/lib/session";

export const GET = handle(async (req: Request) => {
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
        acceptedAt: o.acceptedAt,
        dispatchedAt: o.dispatchedAt,
        deliveredAt: o.deliveredAt,
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
});

// Savatdagi har bir distribyutor uchun alohida buyurtma yaratiladi
export const POST = handle(async (req: Request) => {
  const user = await requireShopUser(req);
  const input = await readJson(req, createOrderInput, "Buyurtma ma'lumotlari noto'g'ri");
  const order = await createOrder(user, input);
  return Response.json({ id: order.id, number: order.number, total: order.total });
});
