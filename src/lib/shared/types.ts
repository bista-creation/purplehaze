import {
  BOOKING_STATUSES,
  EVENT_TYPES,
  ORDER_STATUS_FLOW,
  ORDER_STATUSES,
  ORDER_TYPE_LABELS,
  ORDER_TYPES,
  PAYMENT_METHOD_LABELS,
  PAYMENT_METHODS,
  PAYMENT_STATUSES,
  ROLES,
  TIME_SLOTS,
  type OrderStatus,
  type OrderType,
  type PaymentMethod,
  type PaymentStatus,
  type Role,
} from "@/lib/constants";
import type { MenuAddOn, MenuDish, MenuVariant, MenuCategoryView } from "@/types";

export {
  BOOKING_STATUSES,
  EVENT_TYPES,
  ORDER_STATUS_FLOW,
  ORDER_STATUSES,
  ORDER_TYPE_LABELS,
  ORDER_TYPES,
  PAYMENT_METHOD_LABELS,
  PAYMENT_METHODS,
  PAYMENT_STATUSES,
  ROLES,
  TIME_SLOTS,
};
export type {
  OrderStatus,
  OrderType,
  PaymentMethod,
  PaymentStatus,
  Role,
  MenuAddOn,
  MenuDish,
  MenuVariant,
  MenuCategoryView,
};

export type ApiResponse<T = unknown> = {
  success: boolean;
  data?: T;
  error?: {
    code: string;
    message: string;
    details?: unknown;
  };
  meta?: {
    page?: number;
    limit?: number;
    total?: number;
    [key: string]: unknown;
  };
};

export type AuthTokens = {
  accessToken: string;
  refreshToken: string;
  expiresIn: number;
  tokenType: "Bearer";
};

export type UserProfileDto = {
  id: string;
  name: string | null;
  email: string;
  phone: string | null;
  role: Role;
  image: string | null;
  emailVerified: Date | null;
  createdAt: Date;
};

export type CartItemInputDto = {
  dishId: string;
  variantId?: string | null;
  addOnIds?: string[];
  quantity: number;
  instructions?: string | null;
};

export type OrderSummaryDto = {
  subtotal: number;
  deliveryFee: number;
  taxAmount: number;
  discountAmount: number;
  total: number;
  itemCount: number;
};
