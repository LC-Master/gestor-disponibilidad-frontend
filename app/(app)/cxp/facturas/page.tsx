"use client";

import { useTreasury } from "../../tesoreria/context";
import { InvoicesTableView } from "../components/InvoicesTableView";

export default function FacturasRoutePage() {
  const { companies, user } = useTreasury();

  return (
    <div className="space-y-4">
      <InvoicesTableView companies={companies} user={user} />
    </div>
  );
}

