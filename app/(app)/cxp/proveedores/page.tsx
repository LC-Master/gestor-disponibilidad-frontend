"use client";

import { useState } from "react";
import { useTreasury } from "../../tesoreria/context";
import { SuppliersManagement } from "../components/SuppliersManagement";
import { SupplierStatementView } from "../components/SupplierStatementView";

export default function SuppliersRoutePage() {
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
    <SuppliersManagement
      user={user}
      companies={companies}
      onViewStatement={(id) => setStatementSupplierId(id)}
    />
  );
}
