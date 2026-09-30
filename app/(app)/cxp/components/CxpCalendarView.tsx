"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import {
  ChevronLeft,
  ChevronRight,
  Building2,
  AlertTriangle,
  Clock,
  CheckCircle2,
  Plus,
  RefreshCw,
  X,
  CalendarDays,
  ArrowRight,
} from "lucide-react";
import { toast } from "sonner";
import { fetchClient } from "@/lib/fetchClient";
import { Company } from "@/app/(app)/tesoreria/types";
import { CalendarDayAggregate, Supplier } from "../types";
import { CreateInvoiceModal } from "./CreateInvoiceModal";

interface CxpCalendarViewProps {
  companies: Company[];
}

export function CxpCalendarView({ companies }: CxpCalendarViewProps) {

  const [selectedCompanyId, setSelectedCompanyId] = useState<string>(companies[0]?.id || "");
  const [currentDate, setCurrentDate] = useState(() => new Date());
  const [calendarData, setCalendarData] = useState<CalendarDayAggregate[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedDay, setSelectedDay] = useState<CalendarDayAggregate | null>(null);
  const [isCreateInvoiceOpen, setIsCreateInvoiceOpen] = useState(false);
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);

  const year = currentDate.getFullYear();
  const month = currentDate.getMonth() + 1;

  useEffect(() => {
    if (!selectedCompanyId && companies.length > 0) {
      setSelectedCompanyId(companies[0].id);
    }
  }, [companies, selectedCompanyId]);

  const loadSuppliers = async () => {
    try {
      const res = await fetchClient("/api/cxp/suppliers");
      if (res.ok) {
        const data = await res.json();
        setSuppliers(Array.isArray(data) ? data : []);
      }
    } catch (err) {
      console.error(err);
    }
  };

  const loadCalendar = async () => {
    if (!selectedCompanyId) return;
    setLoading(true);
    try {
      const res = await fetchClient(`/api/cxp/calendar?company_id=${selectedCompanyId}&year=${year}&month=${month}`);
      if (!res.ok) throw new Error("Error al consultar calendario de CXP");
      const data = await res.json();
      setCalendarData(Array.isArray(data) ? data : []);
    } catch (err: any) {
      toast.error(err.message || "Error al cargar calendario");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadSuppliers();
  }, []);

  useEffect(() => {
    loadCalendar();
  }, [selectedCompanyId, year, month]);

  const handlePrevMonth = () => {
    setCurrentDate(new Date(year, month - 2, 1));
    setSelectedDay(null);
  };

  const handleNextMonth = () => {
    setCurrentDate(new Date(year, month, 1));
    setSelectedDay(null);
  };

  const monthName = new Intl.DateTimeFormat("es-VE", {
    month: "long",
    year: "numeric",
  }).format(currentDate);

  const summary = useMemo(() => {
    let monthVES = 0;
    let monthUSD = 0;
    let overdueVES = 0;
    let scheduledVES = 0;

    const todayStr = new Date().toISOString().split("T")[0];

    calendarData.forEach((day) => {
      monthVES += day.total_ves;
      monthUSD += day.total_usd;

      day.invoices.forEach((inv) => {
        const invAmountVES = inv.currency === "VES" ? inv.total_amount : inv.total_amount * inv.exchange_rate;
        if (inv.due_date < todayStr && inv.status === "PENDIENTE") {
          overdueVES += invAmountVES;
        }
        if (inv.status === "PROGRAMADO") {
          scheduledVES += invAmountVES;
        }
      });
    });

    return { monthVES, monthUSD, overdueVES, scheduledVES };
  }, [calendarData]);

  const maxDayAmount = useMemo(() => {
    return calendarData.reduce((max, day) => Math.max(max, day.total_ves), 0);
  }, [calendarData]);

  const calendarGrid = useMemo(() => {
    const firstDayIndex = new Date(year, month - 1, 1).getDay();
    const adjustedFirstDay = firstDayIndex === 0 ? 6 : firstDayIndex - 1;

    const daysInMonth = new Date(year, month, 0).getDate();
    const days: (CalendarDayAggregate | null)[] = [];

    for (let i = 0; i < adjustedFirstDay; i++) {
      days.push(null);
    }

    const dataMap = new Map<string, CalendarDayAggregate>();
    calendarData.forEach((d) => dataMap.set(d.date, d));

    for (let d = 1; d <= daysInMonth; d++) {
      const dateStr = `${year}-${String(month).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
      const aggregate = dataMap.get(dateStr) || {
        date: dateStr,
        total_invoices: 0,
        total_ves: 0,
        total_usd: 0,
        has_overdue: false,
        invoices: [],
      };
      days.push(aggregate);
    }

    const remainder = 7 - (days.length % 7);
    if (remainder < 7) {
      for (let i = 0; i < remainder; i++) {
        days.push(null);
      }
    }

    return days;
  }, [calendarData, year, month]);

  const formatNumber = (num: number) => {
    return num.toLocaleString("es-VE", {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    });
  };



  const todayStr = new Date().toISOString().split("T")[0];

  return (
    <div className="space-y-5">
      <div className="flex flex-col lg:flex-row items-stretch lg:items-center justify-between gap-4 bg-white dark:bg-neutral-900 p-4 rounded-3xl border border-neutral-200 dark:border-neutral-800 shadow-xs">
        <div className="flex items-center gap-3">
          <div className="p-2.5 rounded-2xl bg-locatel-medio/10 text-locatel-medio">
            <CalendarDays className="w-6 h-6" />
          </div>
          <div>
            <h2 className="text-base sm:text-lg font-bold text-neutral-900 dark:text-neutral-100 capitalize">
              {monthName}
            </h2>
            <p className="text-xs text-neutral-400">
              Calendario de Vencimientos y Proyección de Pasivos
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          <div className="flex items-center gap-1 bg-neutral-100 dark:bg-neutral-800 p-1 rounded-2xl border border-neutral-200/80 dark:border-neutral-700">
            <button
              onClick={handlePrevMonth}
              className="p-1.5 rounded-xl hover:bg-white dark:hover:bg-neutral-700 text-neutral-600 dark:text-neutral-300 transition-colors cursor-pointer"
              title="Mes Anterior"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <span className="px-2 text-xs font-bold text-neutral-700 dark:text-neutral-200 capitalize min-w-25 text-center">
              {currentDate.toLocaleDateString("es-VE", { month: "short", year: "numeric" })}
            </span>
            <button
              onClick={handleNextMonth}
              className="p-1.5 rounded-xl hover:bg-white dark:hover:bg-neutral-700 text-neutral-600 dark:text-neutral-300 transition-colors cursor-pointer"
              title="Mes Siguiente"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>

          <div className="flex items-center gap-2">
            <Building2 className="w-4 h-4 text-neutral-400 hidden sm:block" />
            <select
              value={selectedCompanyId}
              onChange={(e) => setSelectedCompanyId(e.target.value)}
              className="px-3 py-2 text-xs font-semibold rounded-2xl bg-white dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 text-neutral-900 dark:text-neutral-100 focus:outline-none focus:ring-1 focus:ring-locatel-medio cursor-pointer"
            >
              {companies.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
          </div>

          <button
            onClick={() => setIsCreateInvoiceOpen(true)}
            className="flex items-center gap-1.5 px-4 py-2 text-xs font-bold text-white bg-locatel-medio hover:bg-locatel-oscuro rounded-2xl shadow-xs transition-all cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span>Cargar Factura</span>
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5">
        <div className="p-4 rounded-3xl bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 shadow-xs">
          <div className="flex items-center justify-between mb-1.5">
            <span className="text-xs font-bold text-neutral-500 uppercase tracking-wider">
              Total por Vencer (Mes)
            </span>
            <Clock className="w-4 h-4 text-neutral-500 dark:text-neutral-400" />
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-lg sm:text-xl font-extrabold font-mono text-neutral-900 dark:text-neutral-100">
              Bs. {formatNumber(summary.monthVES)}
            </span>
            <span className="text-xs font-mono text-neutral-400">
              ≈ ${formatNumber(summary.monthUSD)}
            </span>
          </div>
        </div>

        <div className="p-4 rounded-3xl bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 shadow-xs">
          <div className="flex items-center justify-between mb-1.5">
            <span className="text-xs font-bold text-neutral-500 uppercase tracking-wider">
              Total Vencido Acumulado
            </span>
            <AlertTriangle className="w-4 h-4 text-rose-500" />
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-lg sm:text-xl font-extrabold font-mono text-rose-600 dark:text-rose-400">
              Bs. {formatNumber(summary.overdueVES)}
            </span>
            <span className="text-xs text-neutral-400 font-semibold">
              Requiere pago urgente
            </span>
          </div>
        </div>

        <div className="p-4 rounded-3xl bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 shadow-xs">
          <div className="flex items-center justify-between mb-1.5">
            <span className="text-xs font-bold text-neutral-500 uppercase tracking-wider">
              Total Programado
            </span>
            <CheckCircle2 className="w-4 h-4 text-emerald-500" />
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-lg sm:text-xl font-extrabold font-mono text-emerald-600 dark:text-emerald-400">
              Bs. {formatNumber(summary.scheduledVES)}
            </span>
            <span className="text-xs text-neutral-400 font-semibold">
              En propuesta aprobada
            </span>
          </div>
        </div>
      </div>

      <div className="bg-white dark:bg-neutral-900 rounded-3xl border border-neutral-200 dark:border-neutral-800 shadow-xs overflow-hidden">
        <div className="grid grid-cols-7 border-b border-neutral-200 dark:border-neutral-800 bg-neutral-50 dark:bg-neutral-800/60 text-center py-2.5 text-xs font-bold text-neutral-600 dark:text-neutral-400">
          <div>Lunes</div>
          <div>Martes</div>
          <div>Miércoles</div>
          <div>Jueves</div>
          <div>Viernes</div>
          <div>Sábado</div>
          <div>Domingo</div>
        </div>

        {loading ? (
          <div className="flex flex-col items-center justify-center py-24 text-neutral-400">
            <RefreshCw className="w-7 h-7 animate-spin text-locatel-medio mb-2" />
            <span className="text-xs font-semibold">Cargando vencimientos de facturas...</span>
          </div>
        ) : (
          <div className="grid grid-cols-7 auto-rows-fr divide-x divide-y divide-neutral-200 dark:divide-neutral-800">
            {calendarGrid.map((day, idx) => {
              if (!day) {
                return (
                  <div
                    key={`empty-${idx}`}
                    className="min-h-22.5 sm:min-h-27.5 p-2 bg-neutral-50/40 dark:bg-neutral-950/20"
                  />
                );
              }

              const dayNumber = parseInt(day.date.split("-")[2], 10);
              const hasInvoices = day.total_invoices > 0;
              const dayTotal = day.total_ves;
              const ratio = maxDayAmount > 0 ? dayTotal / maxDayAmount : 0;

              let cellBg = "bg-white dark:bg-neutral-900 border-neutral-200 dark:border-neutral-800";
              let amountTextPrimary = "text-neutral-800 dark:text-neutral-200";
              let amountTextSecondary = "text-neutral-500 dark:text-neutral-400";
              let badgeClasses = "bg-neutral-100 text-neutral-800 dark:bg-neutral-800 dark:text-neutral-200";

              if (hasInvoices && ratio >= 0.7) {
                cellBg = "bg-rose-50/80 dark:bg-rose-950/30 border-rose-400 dark:border-rose-800 ring-1 ring-rose-400/40";
                amountTextPrimary = "text-rose-900 dark:text-rose-200";
                amountTextSecondary = "text-rose-700/80 dark:text-rose-400";
                badgeClasses = "bg-rose-100 text-rose-900 dark:bg-rose-900/60 dark:text-rose-200";
              } else if (hasInvoices && ratio >= 0.35) {
                cellBg = "bg-amber-50/70 dark:bg-amber-950/20 border-amber-300 dark:border-amber-800/50";
                amountTextPrimary = "text-amber-900 dark:text-amber-200";
                amountTextSecondary = "text-amber-700/80 dark:text-amber-400";
                badgeClasses = "bg-amber-100 text-amber-900 dark:bg-amber-900/60 dark:text-amber-200";
              }

              const hasOverduePending = hasInvoices && day.invoices.some(
                (inv) => inv.status === "PENDIENTE" && inv.due_date < todayStr
              );

              return (
                <div
                  key={day.date}
                  onClick={() => hasInvoices && setSelectedDay(day)}
                  className={`min-h-22.5 sm:min-h-27.5 p-2 sm:p-2.5 transition-all flex flex-col justify-between ${cellBg} ${hasInvoices ? "cursor-pointer hover:opacity-90" : ""
                    }`}
                >
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold font-mono text-neutral-800 dark:text-neutral-200">
                      {dayNumber}
                    </span>
                    {hasInvoices && (
                      <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded-full ${badgeClasses}`}>
                        {day.total_invoices} {day.total_invoices === 1 ? "factura" : "facturas"}
                      </span>
                    )}
                  </div>

                  {hasInvoices && (
                    <div className="mt-2 space-y-0.5">
                      <p className={`text-xs font-extrabold font-mono truncate ${amountTextPrimary}`}>
                        $ {formatNumber(day.total_usd)}
                      </p>
                      <p className={`text-[10px] font-mono truncate ${amountTextSecondary}`}>
                        Bs. {formatNumber(day.total_ves)}
                      </p>
                      {hasOverduePending && (
                        <span className="inline-flex items-center gap-1 text-[9px] font-bold text-rose-600 dark:text-rose-400 mt-0.5">
                          <span className="w-1.5 h-1.5 rounded-full bg-rose-600" />
                          Mora
                        </span>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>

      {selectedDay && (
        <div className="fixed inset-0 z-50 flex justify-end bg-black/40 backdrop-blur-2xs animate-in fade-in duration-150">
          <div className="bg-white dark:bg-neutral-900 w-full max-w-lg h-full shadow-2xl border-l border-neutral-200 dark:border-neutral-800 p-6 flex flex-col justify-between animate-in slide-in-from-right duration-200">
            <div className="space-y-4 overflow-y-auto custom-scrollbar flex-1 pr-1">
              <div className="flex items-center justify-between pb-3 border-b border-neutral-100 dark:border-neutral-800">
                <div>
                  <h3 className="text-base font-bold text-neutral-900 dark:text-neutral-100">
                    Facturas con Vencimiento al {selectedDay.date}
                  </h3>
                  <p className="text-xs text-neutral-400">
                    Total día: $ {formatNumber(selectedDay.total_usd)} (≈ Bs. {formatNumber(selectedDay.total_ves)})
                  </p>
                </div>
                <button
                  onClick={() => setSelectedDay(null)}
                  className="p-1 rounded-lg text-neutral-400 hover:text-neutral-700 dark:hover:text-neutral-200 cursor-pointer"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="space-y-2.5">
                {selectedDay.invoices.map((inv) => (
                  <div
                    key={inv.id}
                    className="p-3.5 rounded-2xl border border-neutral-200 dark:border-neutral-800 bg-neutral-50/50 dark:bg-neutral-800/40"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <span className="text-xs font-bold text-neutral-900 dark:text-neutral-100">
                          {inv.supplier?.business_name || "Proveedor"}
                        </span>
                        <p className="text-[11px] text-neutral-400 font-mono">
                          {inv.supplier?.rif || ""} | N° {inv.invoice_number}
                        </p>
                      </div>

                      <span
                        className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${inv.sap_document_type === "MIRO"
                          ? "bg-purple-100 text-purple-800 dark:bg-purple-900/60 dark:text-purple-300"
                          : inv.sap_document_type === "MRKO"
                            ? "bg-emerald-100 text-emerald-800 dark:bg-emerald-900/60 dark:text-emerald-300"
                            : "bg-amber-100 text-amber-800 dark:bg-amber-900/60 dark:text-amber-300"
                          }`}
                      >
                        {inv.sap_document_type}
                      </span>
                    </div>

                    <div className="flex items-center justify-between mt-3 pt-2.5 border-t border-neutral-100 dark:border-neutral-700/60 text-xs">
                      <span className="text-neutral-400 text-[11px]">Monto Neto:</span>
                      <span className="font-extrabold font-mono text-neutral-900 dark:text-neutral-100">
                        {inv.currency} {formatNumber(inv.total_amount)}
                      </span>
                    </div>

                    <div className="flex items-center justify-between mt-1 text-[11px]">
                      <span className="text-neutral-400">Estado:</span>
                      <span
                        className={`font-semibold ${inv.status === "PAGADO"
                          ? "text-emerald-600 dark:text-emerald-400"
                          : inv.status === "PROGRAMADO"
                            ? "text-emerald-700 dark:text-emerald-300"
                            : "text-amber-600 dark:text-amber-400"
                          }`}
                      >
                        {inv.status}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="pt-4 border-t border-neutral-100 dark:border-neutral-800">
              <Link
                href="/cxp/facturas"
                className="w-full flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl text-xs font-bold text-white bg-locatel-medio hover:bg-locatel-oscuro shadow-xs transition-all cursor-pointer"
              >
                <span>Ir a operar este lote a la Bandeja</span>
                <ArrowRight className="w-4 h-4" />
              </Link>
            </div>
          </div>
        </div>
      )}

      <CreateInvoiceModal
        isOpen={isCreateInvoiceOpen}
        onClose={() => setIsCreateInvoiceOpen(false)}
        companies={companies}
        suppliers={suppliers}
        defaultCompanyId={selectedCompanyId}
        onSuccess={() => {
          loadCalendar();
          loadSuppliers();
        }}
      />
    </div>
  );
}
