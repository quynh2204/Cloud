export function formatMoney(cents: number) {
  return new Intl.NumberFormat("vi-VN", {
    style: "currency",
    currency: "VND",
    maximumFractionDigits: 0,
  }).format(cents);
}

export function toCents(value: string) {
  const digits = value.replace(/[^0-9]/g, "");
  if (!digits) {
    return 0;
  }
  return Number.parseInt(digits, 10);
}
