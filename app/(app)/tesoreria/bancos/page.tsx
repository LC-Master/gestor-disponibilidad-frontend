"use client";

import { BanksManagement } from "../components/BanksManagement";
import { useTreasury } from "../context";

export default function BancosPage() {
  const { handleRefresh } = useTreasury();
  return <BanksManagement onChanged={handleRefresh} />;
}

