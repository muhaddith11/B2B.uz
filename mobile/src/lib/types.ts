// Server API javoblari (src/app/api/shop/* va src/app/api/auth/*)

export type LinkSummary = {
  linkId: string;
  distributor: { id: string; name: string; categories: string[]; minOrder: number; deliveryDays: string[] };
  debt: number;
  overdueAmount: number;
  overdueDays: number;
  nextDue: string | null;
  creditLimit: number;
  creditAvailable: number;
  activeOrders: number;
};

export type HomeData = {
  user: { name: string; role: string };
  shop: { name: string; address: string };
  links: LinkSummary[];
  requests: { distributorId: string; name: string; createdAt: string }[];
};

export type CatalogProduct = {
  id: string;
  name: string;
  brand: string;
  category: string;
  unit: string;
  packSize: number;
  minOrderPacks: number;
  inStock: boolean;
  marked: boolean;
  imageUrl: string | null;
  price: number;
};

export type CatalogData = {
  distributor: { id: string; name: string; minOrder: number };
  products: CatalogProduct[];
};

export type DiscoverDistributor = {
  id: string;
  name: string;
  categories: string[];
  districts: string[];
  minOrder: number;
  deliveryDays: string[];
  productCount: number;
  brands: string[];
  requested: boolean;
  servesYou: boolean;
};

export type DiscoverData = { district: string; categories: string[]; distributors: DiscoverDistributor[] };

export type OrderStatus = 'SENT' | 'ACCEPTED' | 'REJECTED' | 'IN_DELIVERY' | 'DELIVERED' | 'CANCELLED';
export type PaymentType = 'CASH' | 'TRANSFER' | 'CREDIT';

export type ShopOrder = {
  id: string;
  number: number;
  status: OrderStatus;
  paymentType: PaymentType;
  total: number;
  deliveredTotal: number | null;
  createdAt: string;
  rejectReason: string | null;
  distributor: { id: string; name: string };
  items: { productId: string; name: string; packSize: number; qty: number; deliveredQty: number | null; price: number }[];
};

export type LedgerItem = {
  id: string;
  linkId: string;
  type: 'DEBT' | 'PAYMENT' | 'ADJUSTMENT';
  amount: number;
  date: string;
  dueDate: string | null;
  status: 'CONFIRMED' | 'PENDING' | 'REJECTED';
  channel: string | null;
  note: string | null;
  orderNumber: number | null;
};

export type StaffRole = 'ADMIN' | 'OPERATOR' | 'ACCOUNTANT' | 'AGENT' | 'COURIER';

export type Account = { kind: 'shop' | 'staff' | 'brand'; role?: StaffRole; title: string; subtitle: string; token: string };

export type PaymentOptions = {
  distributor: { id: string; name: string };
  transfer: { id: string; type: 'CARD' | 'BANK_ACCOUNT'; number: string; holder: string | null; bankMfo: string | null; inn: string | null }[];
  online: ('PAYME' | 'CLICK')[];
};

export const STATUS_LABEL: Record<OrderStatus, string> = {
  SENT: 'Yuborildi',
  ACCEPTED: 'Qabul qilindi',
  REJECTED: 'Rad etildi',
  IN_DELIVERY: "Yo'lda",
  DELIVERED: 'Topshirildi',
  CANCELLED: 'Bekor qilindi',
};

export const PAYMENT_LABEL: Record<PaymentType, string> = {
  CASH: 'Naqd',
  TRANSFER: "O'tkazma",
  CREDIT: 'Nasiya',
};
