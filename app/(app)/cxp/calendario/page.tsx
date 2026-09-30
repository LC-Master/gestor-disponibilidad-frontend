"use client";

import { useTreasury } from "../../tesoreria/context";
import { CxpCalendarView } from "../components/CxpCalendarView";

export default function CalendarRoutePage() {
  const { companies } = useTreasury();

  return <CxpCalendarView companies={companies} />;
}
