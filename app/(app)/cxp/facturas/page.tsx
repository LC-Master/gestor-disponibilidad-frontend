"use client";

import { useTreasury } from "../../tesoreria/context";
import { InvoicesTableView } from "../components/InvoicesTableView";

export default function FacturasRoutePage() {
  const { companies, user } = useTreasury();

  return <InvoicesTableView companies={companies} user={user} />;
}
