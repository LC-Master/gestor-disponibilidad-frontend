"use client";

import { CompaniesManagement } from "../components/CompaniesManagement";
import { useTreasury } from "../context";

export default function EmpresasPage() {
  const { handleRefresh } = useTreasury();
  return <CompaniesManagement onChanged={handleRefresh} />;
}

