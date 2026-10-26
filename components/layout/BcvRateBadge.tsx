"use client";

import { useEffect, useState } from "react";
import { RefreshCw } from "lucide-react";
import { getCurrentRates } from "@/lib/exchangeRates";
import { CurrentRatesResponse } from "@/app/(app)/cxp/types";

export function BcvRateBadge() {
  const [rates, setRates] = useState<CurrentRatesResponse | null>(null);
  const [loading, setLoading] = useState(false);

  const fetchRates = async () => {
    setLoading(true);
    try {
      const data = await getCurrentRates();
      console.log(data)
      if (data && (data.dolar || data.euro)) {
        setRates(data);
      }
    } catch {
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchRates();
    const interval = setInterval(fetchRates, 5 * 60 * 1000);
    return () => clearInterval(interval);
  }, []);

  const formatRate = (val?: number) => {
    if (!val) return "0,00";
    return val.toLocaleString("es-VE", { minimumFractionDigits: 2, maximumFractionDigits: 4 });
  };

  const formatDate = (dateStr?: string) => {
    if (!dateStr) return "";
    return new Date(dateStr).toLocaleDateString("es-VE", {
      timeZone: "UTC",
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
    });
  };

  if (!rates || !rates.dolar) {
    return (
      <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-lg border border-neutral-200/80 dark:border-neutral-800 bg-neutral-50/70 dark:bg-neutral-900/40 backdrop-blur-xs text-xs text-neutral-400">
        <span className="h-1.5 w-1.5 rounded-full bg-neutral-400 animate-pulse" />
        <span className="font-mono text-[11px]">BCV...</span>
      </div>
    );
  }

  const validDateUSD = formatDate(rates.dolar.FechaValida || rates.dolar.Fecha);
  const displayDate = rates.dolar?.FechaValida || rates.euro?.FechaValida
    ? formatDate(rates.dolar?.FechaValida || rates.euro?.FechaValida)
    : "";

  return (
    <div
      className="inline-flex items-center gap-2 px-2.5 sm:px-3 py-1 rounded-lg border border-neutral-200/80 dark:border-neutral-800 bg-neutral-50/70 dark:bg-neutral-900/40 hover:border-neutral-300 dark:hover:border-neutral-700 backdrop-blur-xs text-xs select-none transition-colors"
      title={validDateUSD ? `Vigencia oficial: ${validDateUSD}` : "Tasas oficiales BCV"}
    >
      <div className="flex items-center gap-1.5 shrink-0">
        <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
        <span className="text-[10px] font-semibold uppercase tracking-wider text-neutral-400 dark:text-neutral-500 font-mono">
          BCV
        </span>
      </div>

      <div className="h-3 w-px bg-neutral-200 dark:bg-neutral-800" />

      <div className="flex items-center gap-1.5">
        <span className="text-[10px] font-medium text-neutral-400 dark:text-neutral-500 font-mono">
          USD
        </span>
        <span className="font-mono font-semibold text-neutral-800 dark:text-neutral-100 tabular-nums text-xs">
          Bs. {formatRate(rates.dolar.Valor)}
        </span>
      </div>

      {rates.euro && (
        <>
          <div className="h-3 w-px bg-neutral-200 dark:bg-neutral-800" />
          <div className="flex items-center gap-1.5">
            <span className="text-[10px] font-medium text-neutral-400 dark:text-neutral-500 font-mono">
              EUR
            </span>
            <span className="font-mono font-semibold text-neutral-800 dark:text-neutral-100 tabular-nums text-xs">
              Bs. {formatRate(rates.euro.Valor)}
            </span>
          </div>
        </>
      )}

      {displayDate && (
        <>
          <div className="hidden md:block h-3 w-px bg-neutral-200 dark:bg-neutral-800" />
          <span className="hidden md:inline text-[10px] text-neutral-400 dark:text-neutral-500 font-mono tabular-nums">
            {displayDate}
          </span>
        </>
      )}

      <button
        type="button"
        onClick={fetchRates}
        disabled={loading}
        title="Actualizar tasas oficiales BCV"
        className="ml-0.5 p-1 text-neutral-400 hover:text-neutral-700 dark:hover:text-neutral-200 rounded transition-colors cursor-pointer disabled:opacity-40"
      >
        <RefreshCw className={`w-3 h-3 ${loading ? "animate-spin" : ""}`} />
      </button>
    </div>
  );
}
