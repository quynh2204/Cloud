import type { SaleStatus as PrismaSaleStatus } from "@prisma/client";

export const SALE_STATUS = {
  COMPLETED: "COMPLETED",
  VOIDED: "VOIDED",
  REFUNDED: "REFUNDED",
  REFUND: "REFUND",
} as const;

export type SaleStatus = PrismaSaleStatus;

export const PAYMENT_METHOD = {
  CASH: "cash",
  CARD: "card",
  TRANSFER: "transfer",
} as const;

export type PaymentMethod = (typeof PAYMENT_METHOD)[keyof typeof PAYMENT_METHOD];

export const ACTIVE_REVENUE_SALE_STATUSES: SaleStatus[] = [SALE_STATUS.COMPLETED];

export function isValidPaymentMethod(value: string): value is PaymentMethod {
  return Object.values(PAYMENT_METHOD).includes(value as PaymentMethod);
}
