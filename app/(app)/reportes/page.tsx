"use client";

import { useTreasury } from "../tesoreria/context";
import { AnalyticsDashboardView } from "./components/AnalyticsDashboardView";

export default function ReportsRoutePage() {
  const { companies, user } = useTreasury();

  return <AnalyticsDashboardView companies={companies} user={user} />;
}
