"use client";

import { useTreasury } from "../../tesoreria/context";
import { ProposalsTableView } from "../components/ProposalsTableView";

export default function ProposalsPagoPage() {
  const { companies, user, loading } = useTreasury();

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-24 text-neutral-400">
        <div className="w-8 h-8 rounded-full border-2 border-locatel-medio border-t-transparent animate-spin mb-3" />
        <span className="text-xs font-semibold">Cargando propuestas de pago...</span>
      </div>
    );
  }

  return <ProposalsTableView companies={companies} user={user} />;
}
