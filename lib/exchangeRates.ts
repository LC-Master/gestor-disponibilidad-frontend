import { fetchClient } from "./fetchClient";
import type { CurrentRatesResponse, RateItem, DifferentialResponse } from "@/app/(app)/cxp/types";

export async function getCurrentRates(): Promise<CurrentRatesResponse> {
  const res = await fetchClient("/api/v1/rates/current");
  if (!res.ok) {
    const legacy = await fetchClient("/api/rates/current");
    if (!legacy.ok) {
      throw new Error(`Error al obtener tasas vigentes: ${res.statusText}`);
    }
    return legacy.json();
  }
  return res.json();
}

export async function getSpecificRate(currency: string, date?: string): Promise<RateItem> {
  const query = new URLSearchParams();
  query.set("currency", currency);
  if (date) {
    query.set("date", date);
  }
  const res = await fetchClient(`/api/v1/rates/specific?${query.toString()}`);
  if (!res.ok) {
    const legacy = await fetchClient(`/api/rates/specific?${query.toString()}`);
    if (!legacy.ok) {
      throw new Error(`Error al obtener tasa para ${currency}: ${res.statusText}`);
    }
    return legacy.json();
  }
  return res.json();
}

export async function getDifferential(
  currency: string,
  issueDate: string,
  paymentDate: string
): Promise<DifferentialResponse> {
  const query = new URLSearchParams();
  query.set("currency", currency);
  query.set("issue_date", issueDate);
  query.set("payment_date", paymentDate);

  const res = await fetchClient(`/api/v1/rates/differential?${query.toString()}`);
  if (!res.ok) {
    const legacy = await fetchClient(`/api/rates/differential?${query.toString()}`);
    if (!legacy.ok) {
      throw new Error(`Error al calcular diferencial cambiario: ${res.statusText}`);
    }
    return legacy.json();
  }
  return res.json();
}
