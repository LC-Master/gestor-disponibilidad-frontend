"use client";

import { useTreasury } from "../../tesoreria/context";
import { ScheduledInvoicesTableView } from "../components/ScheduledInvoicesTableView";

export default function ScheduledInvoicesPage() {
  const { companies, user, loading } = useTreasury();

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-24 text-neutral-400">
        <div className="w-8 h-8 rounded-full border-2 border-locatel-medio border-t-transparent animate-spin mb-3" />
        <span className="text-xs font-semibold">Cargando facturas programadas...</span>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-xl font-bold text-neutral-900 dark:text-neutral-100">
          Cuentas por Pagar - Facturas Programadas por Pagar
        </h1>
        <p className="text-xs text-neutral-500 dark:text-neutral-400 mt-0.5">
          Compromisos comerciales aprobados listos para ejecución y liquidación bancaria
        </p>
      </div>
      <ScheduledInvoicesTableView companies={companies} user={user} />
    </div>
  );
}
