import type { Invoice, ProposalInvoiceDetail } from "@/app/(app)/cxp/types";

export function getInvoiceVESAmount(
  inv: Invoice,
  usdRate: number,
  eurRate: number = 0
): number {
  const curr = (inv.currency || "VES").toUpperCase().trim();
  const remaining = Math.max(0, (inv.total_amount || 0) - (inv.paid_amount || 0));
  const activeUsdRate = usdRate > 0 ? usdRate : inv.exchange_rate > 0 ? inv.exchange_rate : 1;
  const activeEurRate = eurRate > 0 ? eurRate : inv.exchange_rate > 0 ? inv.exchange_rate : activeUsdRate;

  if (inv.is_indexed) {
    if (curr === "EUR") {
      return remaining * activeEurRate;
    }
    const ratio = inv.total_amount > 0 ? remaining / inv.total_amount : 1;
    const usdBase =
      curr === "USD"
        ? remaining
        : inv.total_amount_usd > 0
          ? inv.total_amount_usd * ratio
          : inv.exchange_rate > 0
            ? remaining / inv.exchange_rate
            : remaining;
    return usdBase * activeUsdRate;
  }

  if (curr === "VES") {
    return remaining;
  }
  if (curr === "EUR") {
    return remaining * activeEurRate;
  }
  if (curr === "USD") {
    return remaining * activeUsdRate;
  }
  return remaining;
}

export function getProposalInvoiceVESAmount(
  inv: ProposalInvoiceDetail,
  usdRate: number = 0,
  eurRate: number = 0,
  useLiveRate: boolean = true
): number {
  const curr = (inv.currency || "VES").toUpperCase().trim();

  if (curr === "VES" && !inv.is_indexed) {
    return inv.amount_ves > 0 ? inv.amount_ves : inv.total_amount || 0;
  }

  if (inv.is_indexed) {
    if (!useLiveRate) {
      return inv.amount_ves || 0;
    }
    if (curr === "EUR" && eurRate > 0) {
      const eurBase = inv.amount_eur && inv.amount_eur > 0 ? inv.amount_eur : inv.total_amount || 0;
      return eurBase * eurRate;
    }
    if (usdRate > 0) {
      const usdBase =
        inv.amount_usd > 0
          ? inv.amount_usd
          : inv.total_amount_usd && inv.total_amount_usd > 0
            ? inv.total_amount_usd
            : inv.exchange_rate && inv.exchange_rate > 0
              ? (inv.total_amount || 0) / inv.exchange_rate
              : 0;
      if (usdBase > 0) {
        return usdBase * usdRate;
      }
    }
    return inv.amount_ves || 0;
  }

  if (inv.amount_ves > 0) {
    return inv.amount_ves;
  }
  if (curr === "USD") {
    const rate = usdRate > 0 ? usdRate : inv.exchange_rate || 1;
    return (inv.total_amount || 0) * rate;
  }
  if (curr === "EUR") {
    const rate = eurRate > 0 ? eurRate : inv.exchange_rate || usdRate || 1;
    return (inv.total_amount || 0) * rate;
  }
  return inv.total_amount || 0;
}

export function getProposalInvoiceOriginalDisplay(
  inv: ProposalInvoiceDetail,
  formatMoney: (val: number, cur?: string) => string
): string {
  const curr = (inv.currency || "VES").toUpperCase().trim();
  if (curr === "VES") {
    const origVes =
      inv.original_amount_ves && inv.original_amount_ves > 0
        ? inv.original_amount_ves
        : inv.total_amount;
    return formatMoney(origVes, "VES");
  }
  return formatMoney(inv.total_amount, curr);
}
