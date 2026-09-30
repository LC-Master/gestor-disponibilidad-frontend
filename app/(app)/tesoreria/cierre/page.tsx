"use client";

import { useTreasury } from "../context";
import { DailyClosingMatrix } from "../components/DailyClosingMatrix";

export default function CierreOperativoPage() {
  const {
    companies,
    accounts,
    user,
    closingPreload,
    handleRefresh,
    loading,
  } = useTreasury();

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-24 text-neutral-400">
        <div className="w-8 h-8 rounded-full border-2 border-locatel-medio border-t-transparent animate-spin mb-3" />
        <span className="text-xs font-semibold">Cargando cierre operativo...</span>
      </div>
    );
  }

  return (
    <DailyClosingMatrix
      companies={companies}
      accounts={accounts}
      user={user}
      initialDate={closingPreload?.date}
      initialCompanyId={closingPreload?.companyId}
      onSaved={handleRefresh}
    />
  );
}
