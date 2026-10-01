"use client";

import { useTreasury } from "../../tesoreria/context";
import { InvoicesTableView } from "../components/InvoicesTableView";

export default function FacturasRoutePage() {
  const { companies, user } = useTreasury();

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-xl font-bold text-neutral-900 dark:text-neutral-100">
          Cuentas por Pagar - Facturas Pendientes
        </h1>
        <p className="text-xs text-neutral-500 dark:text-neutral-400 mt-0.5">
          Gestión de facturas pendientes de pago y generación de propuestas
        </p>
      </div>
      <InvoicesTableView companies={companies} user={user} />
    </div>
  );
}

