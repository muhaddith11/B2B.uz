// Server API javoblari (src/app/api/shop/* va src/app/api/auth/*)
import { t } from './i18n';

export type LinkSummary = {
  linkId: string;
  distributor: { id: string; name: string; logoUrl: string | null; categories: string[]; minOrder: number; deliveryDays: string[] };
  debt: number;
  overdueAmount: number;
  overdueDays: number;
  nextDue: string | null;
  creditLimit: number;
  creditAvailable: number;
  activeOrders: number;
};

// Tashkilot (do'kon yoki distribyutor) obunasi: server src/lib/subscription.ts subscriptionInfo
export type Subscription = { state: 'ACTIVE' | 'GRACE' | 'EXPIRED'; paidUntil: string; trial: boolean; daysLeft: number; blocksAt: string };

export type HomeData = {
  user: { name: string; role: string; avatarUrl: string | null };
  shop: { name: string; address: string; imageUrl: string | null };
  subscription: Subscription;
  links: LinkSummary[];
  requests: { distributorId: string; name: string; logoUrl: string | null; createdAt: string }[];
  invites: Invite[];
  active: ActiveOrder[];
};

// Distribyutorning ulanish taklifi: do'kon egasi tasdiqlaguncha distribyutor do'konni ko'rmaydi
export type Invite = { linkId: string; distributorId: string; name: string; logoUrl: string | null; categories: string[]; createdAt: string };

// Bosh sahifadagi yo'ldagi buyurtma
export type ActiveOrder = StepTimes & {
  id: string;
  number: number;
  status: OrderStatus;
  total: number;
  packs: number;
  distributor: { id: string; name: string; logoUrl: string | null };
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
  distributor: { id: string; name: string; logoUrl: string | null; minOrder: number; deliveryDays?: string[] };
  products: CatalogProduct[];
};

export type DiscoverDistributor = {
  id: string;
  name: string;
  logoUrl: string | null;
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
  acceptedAt: string | null;
  dispatchedAt: string | null;
  deliveredAt: string | null;
  rejectReason: string | null;
  distributor: { id: string; name: string; logoUrl: string | null };
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

export type Account = { kind: 'shop' | 'staff' | 'brand'; role?: StaffRole; title: string; subtitle: string; imageUrl: string | null; token: string };

export type PaymentOptions = {
  distributor: { id: string; name: string };
  transfer: { id: string; type: 'CARD' | 'BANK_ACCOUNT'; number: string; holder: string | null; bankMfo: string | null; inn: string | null }[];
  online: ('PAYME' | 'CLICK')[];
};

const STATUS_KEY = {
  SENT: 'Yuborildi',
  ACCEPTED: 'Qabul qilindi',
  REJECTED: 'Rad etildi',
  IN_DELIVERY: "Yo'lda",
  DELIVERED: 'Topshirildi',
  CANCELLED: 'Bekor qilindi',
} as const;

export const statusLabel = (s: OrderStatus) => t(STATUS_KEY[s]);

const PAYMENT_KEY = { CASH: 'Naqd', TRANSFER: "O'tkazma", CREDIT: 'Nasiya' } as const;

export const paymentLabel = (p: PaymentType) => t(PAYMENT_KEY[p]);

// Holat bosqichlari vaqti (buyurtma yo'lida ko'rinadi)
export type StepTimes = { createdAt: string; acceptedAt: string | null; dispatchedAt: string | null; deliveredAt: string | null };
