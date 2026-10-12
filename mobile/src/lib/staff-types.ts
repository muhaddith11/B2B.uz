// Distribyutor xodimi va tovar egasi ekranlari uchun server javoblari (src/app/api/staff/*, src/app/api/brand/*)
import type { OrderStatus, PaymentType, StaffRole } from './types';

export type StaffMe = {
  staff: { id: string; name: string; phone: string; role: StaffRole };
  distributor: { id: string; name: string; status: 'PENDING' | 'ACTIVE'; districts: string[]; categories: string[]; minOrder: number; deliveryDays: string[]; inn: string | null };
  couriers: { id: string; name: string }[];
  agents: { id: string; name: string }[];
  priceGroups: { id: string; name: string; isDefault: boolean }[];
};

export type Dashboard = {
  distributorStatus: 'PENDING' | 'ACTIVE';
  newOrders: { count: number; sum: number };
  acceptedOrders: number;
  inDelivery: number;
  deliveredToday: { count: number; sum: number };
  shops: number;
  overdue: { shops: number; sum: number };
  paidToday: number;
  pendingPayments: number;
  requests: number;
  brandProposals: number;
  brandOrdersToReceive: number;
};

export type StaffOrder = {
  id: string;
  number: number;
  status: OrderStatus;
  paymentType: PaymentType;
  total: number;
  deliveredTotal: number | null;
  source: 'APP' | 'AGENT';
  createdAt: string;
  rejectReason: string | null;
  createdBy: string | null;
  courier: { id: string; name: string } | null;
  shop: { linkId: string; name: string; address: string; district: string; phone: string | null; owner: string | null };
  items: { id: string; productId: string; name: string; sku: string; packSize: number; unit: string; qty: number; deliveredQty: number | null; price: number }[];
};

export type Summary = {
  debt: number;
  overdueAmount: number;
  overdueDays: number;
  nextDue: string | null;
  creditLimit: number;
  creditAvailable: number;
  activeOrders: number;
  pendingPayments: number;
};

export type StaffShop = Summary & {
  linkId: string;
  status: 'ACTIVE' | 'BLOCKED';
  shop: { id: string; name: string; address: string; district: string };
  agent: string | null;
};

export type StaffLedger = {
  id: string;
  type: 'DEBT' | 'PAYMENT' | 'ADJUSTMENT';
  amount: number;
  date: string;
  dueDate: string | null;
  status: 'CONFIRMED' | 'PENDING' | 'REJECTED';
  channel: string | null;
  note: string | null;
  receiptUrl: string | null;
  orderNumber: number | null;
};

export type ShopDetail = {
  linkId: string;
  status: 'ACTIVE' | 'BLOCKED';
  shop: { id: string; name: string; address: string; district: string; inn: string | null };
  users: { name: string; phone: string; role: string }[];
  terms: { priceGroup: { id: string; name: string } | null; creditLimit: number; creditDays: number; blockAfterDays: number | null; agent: { id: string; name: string } | null };
  summary: Summary;
  ledger: StaffLedger[];
  orders: StaffOrder[];
};

export type StaffPayment = {
  id: string;
  linkId: string;
  shop: string;
  amount: number;
  date: string;
  status: 'CONFIRMED' | 'PENDING' | 'REJECTED';
  channel: string | null;
  note: string | null;
  receiptUrl: string | null;
  method: { type: string; number: string | null } | null;
  createdBy: string;
};

export type StaffProduct = {
  id: string;
  sku: string;
  name: string;
  brand: string;
  category: string;
  unit: string;
  packSize: number;
  minOrderPacks: number;
  inStock: boolean;
  active: boolean;
  fromBrand: string | null;
  price: number | null;
  prices: { group: string; price: number }[];
};

export type AgreementStatus = 'PROPOSED' | 'ACTIVE' | 'REJECTED' | 'ENDED';
export type BrandOrderStatus = 'SENT' | 'ACCEPTED' | 'REJECTED' | 'SHIPPED' | 'DELIVERED' | 'CANCELLED';
export type Side = 'BRAND' | 'DISTRIBUTOR';

export type BrandCard = {
  id: string;
  name: string;
  description: string | null;
  categories: string[];
  productCount: number;
  agreement: { id: string; status: AgreementStatus; initiatedBy: Side } | null;
};

export type Agreement = {
  id: string;
  status: AgreementStatus;
  initiatedBy: Side;
  districts: string[];
  discountPercent: number;
  terms: string | null;
  createdAt: string;
};

export type BrandForStaff = {
  brand: { id: string; name: string; description: string | null; categories: string[]; inn: string | null };
  agreement: Agreement | null;
  products: {
    id: string;
    name: string;
    category: string;
    unit: string;
    packSize: number;
    description: string | null;
    price: number;
    retailPrice: number | null;
    purchasePrice: number;
    inCatalog: { productId: string; active: boolean; price: number | null } | null;
  }[];
  orders: { id: string; number: number; status: BrandOrderStatus; total: number; createdAt: string; rejectReason: string | null; items: { name: string; qty: number; price: number }[] }[];
};

export type TeamMember = { id: string; name: string; phone: string; role: StaffRole; active: boolean; me: boolean };

export type PaymentMethodRow = {
  id: string;
  type: 'CARD' | 'BANK_ACCOUNT' | 'PAYME' | 'CLICK';
  number: string | null;
  holder: string | null;
  bankMfo: string | null;
  inn: string | null;
  merchantId: string | null;
  serviceId: string | null;
  hasKey: boolean;
  isPrimary: boolean;
  active: boolean;
  callbackUrl: string | null;
};

export const ROLE_LABEL: Record<StaffRole, string> = {
  ADMIN: 'Admin',
  OPERATOR: 'Operator',
  ACCOUNTANT: 'Hisobchi',
  AGENT: 'Agent',
  COURIER: 'Yetkazuvchi',
};

export const AGREEMENT_LABEL: Record<AgreementStatus, string> = {
  PROPOSED: 'Taklif',
  ACTIVE: 'Faol',
  REJECTED: 'Rad etilgan',
  ENDED: 'Tugagan',
};

export const BRAND_ORDER_LABEL: Record<BrandOrderStatus, string> = {
  SENT: 'Yuborildi',
  ACCEPTED: 'Qabul qilindi',
  REJECTED: 'Rad etildi',
  SHIPPED: "Jo'natildi",
  DELIVERED: 'Qabul qilib olindi',
  CANCELLED: 'Bekor qilindi',
};

export const CHANNEL_LABEL: Record<string, string> = {
  CASH: 'Naqd',
  CARD_RECEIPT: 'Chek',
  BANK_TRANSFER: "O'tkazma",
  PAYME: 'Payme',
  CLICK: 'Click',
};

// ---- Tovar egasi ----

export type BrandMe = {
  user: { name: string; phone: string };
  brand: { id: string; name: string; status: 'PENDING' | 'ACTIVE'; categories: string[]; description: string | null; inn: string | null };
  counts: { products: number; activeAgreements: number; incomingProposals: number; newOrders: number };
  sales: {
    days: number;
    total: number;
    distributors: { distributorId: string; name: string; qty: number; sum: number }[];
    products: { name: string; qty: number; sum: number }[];
  };
};

export type BrandProductRow = {
  id: string;
  name: string;
  category: string;
  unit: string;
  packSize: number;
  barcode: string | null;
  description: string | null;
  price: number;
  retailPrice: number | null;
  active: boolean;
  distributors: number;
};

export type DistributorForBrand = {
  id: string;
  name: string;
  districts: string[];
  categories: string[];
  deliveryDays: string[];
  shops: number;
  products: number;
  agreement: { id: string; status: AgreementStatus; initiatedBy: Side } | null;
};

export type BrandAgreementRow = Agreement & { distributor: { id: string; name: string; districts: string[] } };

export type BrandAgreementDetail = {
  agreement: Agreement & { respondedAt: string | null; endedAt: string | null };
  distributor: { id: string; name: string; districts: string[]; categories: string[]; shops: number };
  listed: { name: string; active: boolean; inStock: boolean; price: number | null }[];
  orders: { id: string; number: number; status: BrandOrderStatus; total: number; createdAt: string }[];
};

export type BrandOrderRow = {
  id: string;
  number: number;
  status: BrandOrderStatus;
  total: number;
  note: string | null;
  rejectReason: string | null;
  createdAt: string;
  distributor: string;
  items: { name: string; packSize: number; unit: string; qty: number; price: number }[];
};
