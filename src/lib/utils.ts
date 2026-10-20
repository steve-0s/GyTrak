export function formatPHP(value: number) {
  return `₱${value.toLocaleString("en-PH")}`;
}

export function formatNumber(value: number) {
  return value.toLocaleString("en-PH");
}

export function normalizePhone(value: string) {
  return value.replace(/\D/g, "").replace(/^0/, "63");
}
