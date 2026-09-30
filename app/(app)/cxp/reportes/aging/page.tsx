"use client";

import { useState } from "react";
import { useTreasury } from "../../../tesoreria/context";
import { AgingReportView } from "../../components/AgingReportView";
import { SupplierStatementView } from "../../components/SupplierStatementView";

export default function AgingReportRoutePage() {
  const { companies, user } = useTreasury();
  const [statementSupplierId, setStatementSupplierId] = useState<string | null>(null);

  if (statementSupplierId) {
    return (
      <SupplierStatementView
        supplierId={statementSupplierId}
        onBack={() => setStatementSupplierId(null)}
        companies={companies}
      />
    );
  }

  return (
    <AgingReportView
      companies={companies}
      user={user}
      onOpenStatement={(id) => setStatementSupplierId(id)}
    />
  );
}
