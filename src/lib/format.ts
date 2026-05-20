export function formatMoney(cents: number) {
  return new Intl.NumberFormat("vi-VN", {
    style: "currency",
    currency: "VND",
    maximumFractionDigits: 0,
  }).format(cents);
}

export function toCents(value: string) {
  const numeric = Number.parseFloat(value.replace(/,/g, "."));
  if (Number.isNaN(numeric)) {
    return 0;
  }
  return Math.round(numeric);
}
