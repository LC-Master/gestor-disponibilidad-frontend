"use client";

import { useRouter } from "next/navigation";
import { useTreasury } from "../context";
import { DailyClosingHistoryTable } from "../components/DailyClosingHistoryTable";

export default function HistoricoCierresPage() {
  const router = useRouter();
  const { companies, setClosingPreload, loading } = useTreasury();

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-24 text-neutral-400">
        <div className="w-8 h-8 rounded-full border-2 border-locatel-medio border-t-transparent animate-spin mb-3" />
        <span className="text-xs font-semibold">Cargando histórico de cierres...</span>
      </div>
    );
  }

  return (
    <DailyClosingHistoryTable
      companies={companies}
      onSelectClosing={(date, companyId) => {
        setClosingPreload({ date, companyId });
        router.push("/tesoreria/cierre");
      }}
    />
  );
}
