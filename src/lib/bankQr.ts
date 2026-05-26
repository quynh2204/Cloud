export type TenantBankConfig = {
  bankName?: string | null;
  bankBin?: string | null;
  accountNumber?: string | null;
  accountName?: string | null;
  transferNotePrefix?: string | null;
};

import { buildEmvCoPayload } from "@/lib/emvco";

const BANK_BIN_FALLBACKS: Array<[string, string]> = [
  ["MB", "970422"],
  ["MBBANK", "970422"],
  ["MB BANK", "970422"],
  ["MBB", "970422"],
  ["VIETCOMBANK", "970436"],
  ["VCB", "970436"],
  ["TECHCOMBANK", "970407"],
  ["TCB", "970407"],
  ["TPBANK", "970423"],
  ["TPB", "970423"],
  ["ACB", "970416"],
  ["SACOMBANK", "970403"],
  ["STB", "970403"],
];

export function resolveTenantBankBin(config?: TenantBankConfig | null): string | null {
  const explicit = config?.bankBin?.trim();
  if (explicit) {
    return explicit;
  }

  const name = config?.bankName?.trim().toUpperCase();
  if (!name) {
    return null;
  }

  for (const [alias, bankBin] of BANK_BIN_FALLBACKS) {
    if (name === alias || name.includes(alias)) {
      return bankBin;
    }
  }

  return null;
}

export function hasTenantBankConfig(config?: TenantBankConfig | null): boolean {
  return Boolean(resolveTenantBankBin(config) && config?.accountNumber && config?.accountName);
}

export function buildTenantBankTransferText({
  amountCents,
  bankConfig,
}: {
  amountCents: number;
  bankConfig: TenantBankConfig;
}) {
  // Return EMVCo payload string (VietQR compatible)
  const amountStr = String(amountCents);
  const ref = `${bankConfig.transferNotePrefix ?? "PAYMENT"}-${amountCents}`;
  const bankBin = resolveTenantBankBin(bankConfig);

  if (!bankBin) {
    throw new Error("Missing bank BIN for VietQR payload");
  }

  return buildEmvCoPayload({
    bankBin,
    accountNumber: bankConfig.accountNumber ?? "",
    amount: amountStr,
    referenceLabel: ref,
  });
}
