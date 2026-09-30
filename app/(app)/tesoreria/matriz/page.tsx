"use client";

import { useTreasury } from "../context";
import { MonthlyHistoryMatrix } from "../components/MonthlyHistoryMatrix";

export default function MatrizMensualPage() {
  const { companies, accounts, loading } = useTreasury();

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-24 text-neutral-400">
        <div className="w-8 h-8 rounded-full border-2 border-locatel-medio border-t-transparent animate-spin mb-3" />
        <span className="text-xs font-semibold">Cargando matriz mensual...</span>
      </div>
    );
  }

  return (
    <MonthlyHistoryMatrix
      companies={companies}
      accounts={accounts}
    />
  );
}
