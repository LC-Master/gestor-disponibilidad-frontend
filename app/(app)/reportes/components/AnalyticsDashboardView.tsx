"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import {
  AlertTriangle,
  ArrowDownToLine,
  BarChart3,
  Building2,
  CheckCircle2,
  Clock,
  Coins,
  Percent,
  PieChart,
  RefreshCw,
  ShieldAlert,
  Users,
} from "lucide-react";
import { toast } from "sonner";
import { fetchClient } from "@/lib/fetchClient";
import { AnalyticsDashboardViewProps, KPIData, SAPDistributionData, TopSuppliersData, AgingSummaryData } from "../types";


export function AnalyticsDashboardView({ companies, user }: AnalyticsDashboardViewProps) {
  const router = useRouter();

  const hasAccess =
    (user?.roles || []).some((r) => {
      const u = r.toUpperCase().trim();
      return u === "ADMIN" || u === "ADMINISTRADOR" || u === "COORD_CXP" || u === "COORD_TESORERIA";
    }) ||
    (user?.permissions || []).some(
      (p) => p.toLowerCase().trim() === "reports.dashboard.view"
    );

  const [selectedCompanyId, setSelectedCompanyId] = useState<string>("ALL");
  const [dateFrom, setDateFrom] = useState<string>(() => {
    const d = new Date();
    d.setDate(1);
    return d.toISOString().split("T")[0];
  });
  const [dateTo, setDateTo] = useState<string>(() => {
    return new Date().toISOString().split("T")[0];
  });
  const [displayCurrency, setDisplayCurrency] = useState<"VES" | "USD">("VES");
  const [topLimit, setTopLimit] = useState<number>(5);

  const [kpis, setKpis] = useState<KPIData | null>(null);
  const [sapDist, setSapDist] = useState<SAPDistributionData | null>(null);
  const [topSuppliers, setTopSuppliers] = useState<TopSuppliersData | null>(null);
  const [agingSummary, setAgingSummary] = useState<AgingSummaryData | null>(null);
  const [loading, setLoading] = useState(true);

  const formatMoney = (val: number, cur: "VES" | "USD" = displayCurrency) => {
    const formatted = new Intl.NumberFormat("es-VE", {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(val || 0);
    return cur === "VES" ? `Bs. ${formatted}` : `$ ${formatted}`;
  };

  const loadData = async () => {
    if (!hasAccess) return;
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (selectedCompanyId && selectedCompanyId !== "ALL") {
        params.append("company_id", selectedCompanyId);
      }
      if (dateFrom) {
        params.append("date_from", dateFrom);
      }
      if (dateTo) {
        params.append("date_to", dateTo);
      }

      const [kpiRes, sapRes, topRes, agingRes] = await Promise.all([
        fetchClient(`/api/reports/kpis?${params.toString()}`),
        fetchClient(`/api/reports/sap-distribution?${params.toString()}`),
        fetchClient(`/api/reports/top-suppliers?company_id=${selectedCompanyId}&limit=${topLimit}`),
        fetchClient(`/api/reports/aging-summary?company_id=${selectedCompanyId}`),
      ]);

      if (kpiRes.ok) {
        const d = await kpiRes.json();
        setKpis(d);
      }
      if (sapRes.ok) {
        const d = await sapRes.json();
        setSapDist(d);
      }
      if (topRes.ok) {
        const d = await topRes.json();
        setTopSuppliers(d);
      }
      if (agingRes.ok) {
        const d = await agingRes.json();
        setAgingSummary(d);
      }
    } catch {
      toast.error("Error al sincronizar estadísticas ejecutivas");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [selectedCompanyId, dateFrom, dateTo, topLimit]);

  const handleExportCSV = () => {
    let csv = "REPORTE EJECUTIVO DE ESTADISTICAS Y CUENTAS POR PAGAR\n";
    csv += `Generado: ${new Date().toLocaleString("es-VE")}\n\n`;
    csv += "1. METRICAS GLOBALES (KPIS)\n";
    csv += `Pasivo Total (VES),${kpis?.total_debt_ves || 0}\n`;
    csv += `Pasivo Total (USD),${kpis?.total_debt_usd || 0}\n`;
    csv += `Total Pagado Periodo (VES),${kpis?.total_paid_ves || 0}\n`;
    csv += `Total Pagado Periodo (USD),${kpis?.total_paid_usd || 0}\n`;
    csv += `Facturas Pagadas,${kpis?.paid_invoices_count || 0}\n`;
    csv += `Pasivo Vencido en Mora (VES),${kpis?.overdue_amount_ves || 0}\n`;
    csv += `Efectividad Cupo Tesoreria (%),${kpis?.treasury_cupo_efficiency || 0}%\n\n`;

    csv += "2. DISTRIBUCION TIPOLOGIA SAP\n";
    csv += "Tipo,Descripcion,Total VES,Total USD,Facturas,Porcentaje (%)\n";
    if (sapDist) {
      csv += `MIRO,${sapDist.miro.description},${sapDist.miro.total_ves},${sapDist.miro.total_usd},${sapDist.miro.count},${sapDist.miro.percentage}%\n`;
      csv += `MRKO,${sapDist.mrko.description},${sapDist.mrko.total_ves},${sapDist.mrko.total_usd},${sapDist.mrko.count},${sapDist.mrko.percentage}%\n`;
      csv += `FB60,${sapDist.fb60.description},${sapDist.fb60.total_ves},${sapDist.fb60.total_usd},${sapDist.fb60.count},${sapDist.fb60.percentage}%\n\n`;
    }

    csv += "3. TOP PROVEEDORES (CONCENTRACION DE DEUDA)\n";
    csv += "Posicion,RIF,Razon Social,Deuda VES,Deuda USD,% Pasivo Total,Facturas\n";
    topSuppliers?.suppliers.forEach((s, idx) => {
      csv += `${idx + 1},"${s.rif}","${s.business_name.replace(/"/g, '""')}",${s.total_debt_ves},${s.total_debt_usd},${s.percentage}%,${s.open_invoices_count}\n`;
    });

    csv += "\n4. ANTIGUEDAD DE SALDOS (AGING CONSOLIDADO)\n";
    csv += "Cubeta,Total VES,Total USD,Facturas,Porcentaje (%)\n";
    if (agingSummary) {
      csv += `Corriente,${agingSummary.current.total_ves},${agingSummary.current.total_usd},${agingSummary.current.count},${agingSummary.current.percentage}%\n`;
      csv += `1 a 15 dias,${agingSummary.days_1_15.total_ves},${agingSummary.days_1_15.total_usd},${agingSummary.days_1_15.count},${agingSummary.days_1_15.percentage}%\n`;
      csv += `16 a 30 dias,${agingSummary.days_16_30.total_ves},${agingSummary.days_16_30.total_usd},${agingSummary.days_16_30.count},${agingSummary.days_16_30.percentage}%\n`;
      csv += `31 a 45 dias,${agingSummary.days_31_45.total_ves},${agingSummary.days_31_45.total_usd},${agingSummary.days_31_45.count},${agingSummary.days_31_45.percentage}%\n`;
      csv += `Mas de 45 dias,${agingSummary.days_over_45.total_ves},${agingSummary.days_over_45.total_usd},${agingSummary.days_over_45.count},${agingSummary.days_over_45.percentage}%\n`;
    }

    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute("download", `reporte_ejecutivo_cxp_${new Date().toISOString().split("T")[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    toast.success("Resumen descargado en formato CSV");
  };

  if (!hasAccess) {
    return (
      <div className="min-h-100 flex flex-col items-center justify-center p-8 bg-white dark:bg-neutral-900 rounded-3xl border border-neutral-200 dark:border-neutral-800 text-center space-y-4">
        <div className="p-4 rounded-2xl bg-rose-50 dark:bg-rose-950/40 text-rose-600">
          <ShieldAlert className="w-10 h-10" />
        </div>
        <div>
          <h2 className="text-lg font-bold text-neutral-900 dark:text-neutral-100">
            Acceso Restringido
          </h2>
          <p className="text-xs text-neutral-500 dark:text-neutral-400 max-w-md mt-1">
            Esta vista está reservada exclusivamente para Coordinadores y Administradores del sistema con permiso de visualización ejecutiva.
          </p>
        </div>
        <button
          onClick={() => router.push("/tesoreria")}
          className="px-4 py-2 text-xs font-bold text-white bg-locatel-medio hover:bg-locatel-oscuro rounded-xl transition-colors cursor-pointer"
        >
          Volver a Tesorería
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-5">
      <div className="bg-white dark:bg-neutral-900 p-5 rounded-3xl border border-neutral-200 dark:border-neutral-800 shadow-xs space-y-4">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-2xl bg-locatel-medio/10 text-locatel-medio">
              <BarChart3 className="w-6 h-6" />
            </div>
            <div>
              <h1 className="text-base sm:text-lg font-bold text-neutral-900 dark:text-neutral-100">
                Módulo Ejecutivo de Reportes y Estadísticas
              </h1>
              <p className="text-xs text-neutral-400">
                Consolidado financiero de pasivos, eficiencia de cupos y análisis de concentración
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2.5">
            <div className="flex items-center gap-1 bg-neutral-100 dark:bg-neutral-800 p-1 rounded-2xl border border-neutral-200/80 dark:border-neutral-700">
              <button
                type="button"
                onClick={() => setDisplayCurrency("VES")}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${displayCurrency === "VES"
                  ? "bg-white dark:bg-neutral-700 text-locatel-medio shadow-xs"
                  : "text-neutral-500 hover:text-neutral-900 dark:hover:text-neutral-200"
                  }`}
              >
                Bs. (VES)
              </button>
              <button
                type="button"
                onClick={() => setDisplayCurrency("USD")}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${displayCurrency === "USD"
                  ? "bg-white dark:bg-neutral-700 text-locatel-medio shadow-xs"
                  : "text-neutral-500 hover:text-neutral-900 dark:hover:text-neutral-200"
                  }`}
              >
                $ (USD)
              </button>
            </div>

            <button
              type="button"
              onClick={handleExportCSV}
              className="flex items-center gap-1.5 px-3.5 py-2 text-xs font-bold text-white bg-locatel-medio hover:bg-locatel-oscuro rounded-2xl shadow-xs transition-all cursor-pointer"
            >
              <ArrowDownToLine className="w-4 h-4" />
              <span>Exportar Resumen CSV</span>
            </button>

            <button
              type="button"
              onClick={loadData}
              disabled={loading}
              className="p-2 text-neutral-500 hover:text-neutral-900 dark:hover:text-neutral-200 bg-neutral-100 dark:bg-neutral-800 rounded-2xl border border-neutral-200/80 dark:border-neutral-700 cursor-pointer"
              title="Refrescar estadísticas"
            >
              <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin text-locatel-medio" : ""}`} />
            </button>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-3 border-t border-neutral-100 dark:border-neutral-800">
          <div>
            <label className="block text-[11px] font-semibold text-neutral-500 dark:text-neutral-400 mb-1">
              Empresa
            </label>
            <div className="flex items-center gap-2">
              <Building2 className="w-4 h-4 text-neutral-400 shrink-0" />
              <select
                value={selectedCompanyId}
                onChange={(e) => setSelectedCompanyId(e.target.value)}
                className="w-full px-2.5 py-1.5 bg-neutral-50 dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 rounded-xl text-xs text-neutral-800 dark:text-neutral-200 focus:outline-none focus:ring-2 focus:ring-locatel-medio/40 cursor-pointer"
              >
                <option value="ALL">Todas las Empresas</option>
                {companies.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.code ? `${c.code} - ${c.name}` : c.name}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div>
            <label className="block text-[11px] font-semibold text-neutral-500 dark:text-neutral-400 mb-1">
              Fecha Desde
            </label>
            <input
              type="date"
              value={dateFrom}
              onChange={(e) => setDateFrom(e.target.value)}
              className="w-full px-2.5 py-1.5 bg-neutral-50 dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 rounded-xl text-xs text-neutral-800 dark:text-neutral-200 focus:outline-none focus:ring-2 focus:ring-locatel-medio/40"
            />
          </div>

          <div>
            <label className="block text-[11px] font-semibold text-neutral-500 dark:text-neutral-400 mb-1">
              Fecha Hasta
            </label>
            <input
              type="date"
              value={dateTo}
              onChange={(e) => setDateTo(e.target.value)}
              className="w-full px-2.5 py-1.5 bg-neutral-50 dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 rounded-xl text-xs text-neutral-800 dark:text-neutral-200 focus:outline-none focus:ring-2 focus:ring-locatel-medio/40"
            />
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5">
        <div className="p-4 rounded-3xl bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 shadow-xs flex flex-col justify-between">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-bold text-neutral-500 uppercase tracking-wider">
              Pasivo Exigible Total
            </span>
            <Coins className="w-4 h-4 text-neutral-500 dark:text-neutral-400" />
          </div>
          <div>
            <p className="text-xl sm:text-2xl font-extrabold font-mono text-neutral-900 dark:text-neutral-100">
              {displayCurrency === "VES"
                ? formatMoney(kpis?.total_debt_ves || 0, "VES")
                : formatMoney(kpis?.total_debt_usd || 0, "USD")}
            </p>
            <p className="text-xs font-mono text-neutral-400 mt-1">
              {displayCurrency === "VES"
                ? `≈ ${formatMoney(kpis?.total_debt_usd || 0, "USD")}`
                : `≈ ${formatMoney(kpis?.total_debt_ves || 0, "VES")}`}
            </p>
          </div>
          <div className="mt-3 pt-2 border-t border-neutral-100 dark:border-neutral-800 text-[11px] text-neutral-500">
            Facturas pendientes y programadas
          </div>
        </div>

        <div className="p-4 rounded-3xl bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 shadow-xs flex flex-col justify-between">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-bold text-neutral-500 uppercase tracking-wider">
              Total Liquidado (Período)
            </span>
            <CheckCircle2 className="w-4 h-4 text-emerald-600" />
          </div>
          <div>
            <p className="text-xl sm:text-2xl font-extrabold font-mono text-emerald-600 dark:text-emerald-400">
              {displayCurrency === "VES"
                ? formatMoney(kpis?.total_paid_ves || 0, "VES")
                : formatMoney(kpis?.total_paid_usd || 0, "USD")}
            </p>
            <p className="text-xs font-mono text-neutral-400 mt-1">
              {displayCurrency === "VES"
                ? `≈ ${formatMoney(kpis?.total_paid_usd || 0, "USD")}`
                : `≈ ${formatMoney(kpis?.total_paid_ves || 0, "VES")}`}
            </p>
          </div>
          <div className="mt-3 pt-2 border-t border-neutral-100 dark:border-neutral-800 flex items-center justify-between text-[11px]">
            <span className="text-neutral-500">Facturas canceladas:</span>
            <span className="px-2 py-0.5 rounded-full font-bold bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300">
              {kpis?.paid_invoices_count || 0}
            </span>
          </div>
        </div>

        <div className="p-4 rounded-3xl bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 shadow-xs flex flex-col justify-between">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-bold text-neutral-500 uppercase tracking-wider">
              Pasivo Vencido en Mora
            </span>
            <AlertTriangle className="w-4 h-4 text-rose-500" />
          </div>
          <div>
            <p className="text-xl sm:text-2xl font-extrabold font-mono text-rose-600 dark:text-rose-400">
              {formatMoney(kpis?.overdue_amount_ves || 0, "VES")}
            </p>
            <p className="text-xs font-semibold text-rose-700/80 dark:text-rose-400/80 mt-1">
              {(kpis?.total_debt_ves || 0) > 0
                ? `${Math.round(((kpis?.overdue_amount_ves || 0) / (kpis?.total_debt_ves || 1)) * 100)}% de la deuda en mora`
                : "Sin mora registrada"}
            </p>
          </div>
          <div className="mt-3 pt-2 border-t border-neutral-100 dark:border-neutral-800 text-[11px] text-rose-600 dark:text-rose-400 font-medium">
            Requiere priorización de pago
          </div>
        </div>

        <div className="p-4 rounded-3xl bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 shadow-xs flex flex-col justify-between">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-bold text-neutral-500 uppercase tracking-wider">
              Efectividad Cupo Tesorería
            </span>
            <Percent className="w-4 h-4 text-amber-500" />
          </div>
          <div>
            <div className="flex items-baseline gap-2">
              <span className="text-2xl sm:text-3xl font-extrabold font-mono text-neutral-900 dark:text-neutral-100">
                {kpis?.treasury_cupo_efficiency || 0}%
              </span>
              <span className="text-xs text-neutral-400 font-semibold">de consumo</span>
            </div>
            <div className="w-full bg-neutral-100 dark:bg-neutral-800 rounded-full h-2 mt-3 overflow-hidden">
              <div
                className={`h-full rounded-full transition-all duration-500 ${(kpis?.treasury_cupo_efficiency || 0) >= 90
                  ? "bg-emerald-500"
                  : (kpis?.treasury_cupo_efficiency || 0) >= 50
                    ? "bg-amber-500"
                    : "bg-rose-500"
                  }`}
                style={{ width: `${Math.min(100, Math.max(0, kpis?.treasury_cupo_efficiency || 0))}%` }}
              />
            </div>
          </div>
          <div className="mt-3 pt-2 border-t border-neutral-100 dark:border-neutral-800 text-[11px] text-neutral-500">
            Aprovechamiento de cupo proveedor
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        <div className="bg-white dark:bg-neutral-900 p-5 rounded-3xl border border-neutral-200 dark:border-neutral-800 shadow-xs space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-neutral-100 dark:border-neutral-800">
            <div className="flex items-center gap-2">
              <PieChart className="w-4 h-4 text-locatel-medio" />
              <h2 className="text-sm font-bold text-neutral-900 dark:text-neutral-100">
                Desglose por Tipología Contable SAP
              </h2>
            </div>
            <span className="text-xs font-mono text-neutral-400">
              Total: {formatMoney(displayCurrency === "VES" ? (sapDist?.total_ves || 0) : ((sapDist?.total_ves || 0) / 1))}
            </span>
          </div>

          <div className="space-y-4">
            <div>
              <div className="flex items-center justify-between text-xs mb-1.5">
                <span className="font-semibold text-neutral-800 dark:text-neutral-200">
                  MIRO - Mercancía de Almacén (Firme)
                </span>
                <div className="flex items-center gap-2 font-mono">
                  <span className="font-bold text-purple-700 dark:text-purple-400">
                    {displayCurrency === "VES"
                      ? formatMoney(sapDist?.miro.total_ves || 0, "VES")
                      : formatMoney(sapDist?.miro.total_usd || 0, "USD")}
                  </span>
                  <span className="text-[11px] text-neutral-400">
                    ({sapDist?.miro.percentage || 0}%)
                  </span>
                </div>
              </div>
              <div className="w-full bg-neutral-100 dark:bg-neutral-800 rounded-full h-2.5 overflow-hidden">
                <div
                  className="bg-purple-600 h-full rounded-full transition-all duration-500"
                  style={{ width: `${Math.min(100, sapDist?.miro.percentage || 0)}%` }}
                />
              </div>
              <span className="text-[10px] text-neutral-400 mt-1 block">
                {sapDist?.miro.count || 0} facturas registradas
              </span>
            </div>

            <div>
              <div className="flex items-center justify-between text-xs mb-1.5">
                <span className="font-semibold text-neutral-800 dark:text-neutral-200">
                  MRKO - Consignación
                </span>
                <div className="flex items-center gap-2 font-mono">
                  <span className="font-bold text-emerald-700 dark:text-emerald-400">
                    {displayCurrency === "VES"
                      ? formatMoney(sapDist?.mrko.total_ves || 0, "VES")
                      : formatMoney(sapDist?.mrko.total_usd || 0, "USD")}
                  </span>
                  <span className="text-[11px] text-neutral-400">
                    ({sapDist?.mrko.percentage || 0}%)
                  </span>
                </div>
              </div>
              <div className="w-full bg-neutral-100 dark:bg-neutral-800 rounded-full h-2.5 overflow-hidden">
                <div
                  className="bg-emerald-600 h-full rounded-full transition-all duration-500"
                  style={{ width: `${Math.min(100, sapDist?.mrko.percentage || 0)}%` }}
                />
              </div>
              <span className="text-[10px] text-neutral-400 mt-1 block">
                {sapDist?.mrko.count || 0} facturas registradas
              </span>
            </div>

            <div>
              <div className="flex items-center justify-between text-xs mb-1.5">
                <span className="font-semibold text-neutral-800 dark:text-neutral-200">
                  FB60 - Gastos y Servicios Directos
                </span>
                <div className="flex items-center gap-2 font-mono">
                  <span className="font-bold text-amber-700 dark:text-amber-400">
                    {displayCurrency === "VES"
                      ? formatMoney(sapDist?.fb60.total_ves || 0, "VES")
                      : formatMoney(sapDist?.fb60.total_usd || 0, "USD")}
                  </span>
                  <span className="text-[11px] text-neutral-400">
                    ({sapDist?.fb60.percentage || 0}%)
                  </span>
                </div>
              </div>
              <div className="w-full bg-neutral-100 dark:bg-neutral-800 rounded-full h-2.5 overflow-hidden">
                <div
                  className="bg-amber-600 h-full rounded-full transition-all duration-500"
                  style={{ width: `${Math.min(100, sapDist?.fb60.percentage || 0)}%` }}
                />
              </div>
              <span className="text-[10px] text-neutral-400 mt-1 block">
                {sapDist?.fb60.count || 0} facturas registradas
              </span>
            </div>
          </div>
        </div>

        <div className="bg-white dark:bg-neutral-900 p-5 rounded-3xl border border-neutral-200 dark:border-neutral-800 shadow-xs space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-neutral-100 dark:border-neutral-800">
            <div className="flex items-center gap-2">
              <Clock className="w-4 h-4 text-locatel-medio" />
              <h2 className="text-sm font-bold text-neutral-900 dark:text-neutral-100">
                Antigüedad de Saldos Global (Aging)
              </h2>
            </div>
            <span className="text-xs font-mono text-neutral-400">
              Total: {formatMoney(displayCurrency === "VES" ? (agingSummary?.total_debt_ves || 0) : (agingSummary?.total_debt_usd || 0))}
            </span>
          </div>

          <div className="space-y-3">
            {[
              {
                data: agingSummary?.current,
                color: "bg-emerald-500",
                textColor: "text-emerald-700 dark:text-emerald-400",
              },
              {
                data: agingSummary?.days_1_15,
                color: "bg-amber-400",
                textColor: "text-amber-700 dark:text-amber-400",
              },
              {
                data: agingSummary?.days_16_30,
                color: "bg-amber-500",
                textColor: "text-amber-800 dark:text-amber-300",
              },
              {
                data: agingSummary?.days_31_45,
                color: "bg-rose-500",
                textColor: "text-rose-600 dark:text-rose-400",
              },
              {
                data: agingSummary?.days_over_45,
                color: "bg-rose-700",
                textColor: "text-rose-800 dark:text-rose-300",
              },
            ].map((bucket, idx) => {
              const b = bucket.data;
              return (
                <div key={idx}>
                  <div className="flex items-center justify-between text-xs mb-1">
                    <span className="font-semibold text-neutral-700 dark:text-neutral-300">
                      {b?.label || "-"}
                    </span>
                    <div className="flex items-center gap-2 font-mono">
                      <span className={`font-bold ${bucket.textColor}`}>
                        {displayCurrency === "VES"
                          ? formatMoney(b?.total_ves || 0, "VES")
                          : formatMoney(b?.total_usd || 0, "USD")}
                      </span>
                      <span className="text-[11px] text-neutral-400">
                        ({b?.percentage || 0}%)
                      </span>
                    </div>
                  </div>
                  <div className="w-full bg-neutral-100 dark:bg-neutral-800 rounded-full h-2 overflow-hidden">
                    <div
                      className={`${bucket.color} h-full rounded-full transition-all duration-500`}
                      style={{ width: `${Math.min(100, b?.percentage || 0)}%` }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      <div className="bg-white dark:bg-neutral-900 rounded-3xl border border-neutral-200 dark:border-neutral-800 shadow-xs overflow-hidden">
        <div className="p-5 border-b border-neutral-100 dark:border-neutral-800 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-locatel-medio/10 text-locatel-medio">
              <Users className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-sm font-bold text-neutral-900 dark:text-neutral-100">
                Concentración de Deuda por Proveedor (Pareto)
              </h2>
              <p className="text-xs text-neutral-400">
                Identificación de los mayores acreedores sobre el pasivo de la empresa
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <span className="text-xs font-semibold text-neutral-500">Mostrar:</span>
            <select
              value={topLimit}
              onChange={(e) => setTopLimit(parseInt(e.target.value, 10))}
              className="px-2.5 py-1 bg-neutral-50 dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 rounded-xl text-xs font-semibold text-neutral-800 dark:text-neutral-200 focus:outline-none cursor-pointer"
            >
              <option value={5}>Top 5 Proveedores</option>
              <option value={10}>Top 10 Proveedores</option>
            </select>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs text-neutral-600 dark:text-neutral-400">
            <thead className="bg-neutral-50 dark:bg-neutral-800/60 text-neutral-700 dark:text-neutral-300 font-bold uppercase tracking-wider text-[11px] border-b border-neutral-200 dark:border-neutral-800 whitespace-nowrap">
              <tr>
                <th className="py-3 px-4 w-12 text-center">Pos</th>
                <th className="py-3 px-4">Proveedor</th>
                <th className="py-3 px-4 text-right">Total Adeudado</th>
                <th className="py-3 px-4 text-center">Facturas</th>
                <th className="py-3 px-4 w-60">% Concentración</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-neutral-100 dark:divide-neutral-800/60 whitespace-nowrap">
              {loading && (!topSuppliers || topSuppliers.suppliers.length === 0) ? (
                <tr>
                  <td colSpan={5} className="py-12 text-center text-neutral-400">
                    <div className="flex flex-col items-center justify-center gap-2">
                      <RefreshCw className="w-5 h-5 animate-spin text-locatel-medio" />
                      <span>Cargando análisis de concentración...</span>
                    </div>
                  </td>
                </tr>
              ) : !topSuppliers || topSuppliers.suppliers.length === 0 ? (
                <tr>
                  <td colSpan={5} className="py-12 text-center text-neutral-400">
                    No se encontraron proveedores con saldo pendiente en la empresa seleccionada
                  </td>
                </tr>
              ) : (
                topSuppliers.suppliers.map((supp, index) => (
                  <tr
                    key={supp.supplier_id}
                    className="hover:bg-neutral-50/70 dark:hover:bg-neutral-800/30 transition-colors"
                  >
                    <td className="py-3 px-4 text-center font-bold text-neutral-500 font-mono">
                      #{index + 1}
                    </td>
                    <td className="py-3 px-4 max-w-sm">
                      <div className="font-bold text-neutral-900 dark:text-neutral-100">
                        {supp.business_name}
                      </div>
                      <div className="text-[11px] text-neutral-400 font-mono">
                        RIF: {supp.rif}
                      </div>
                    </td>
                    <td className="py-3 px-4 text-right font-mono font-bold text-neutral-900 dark:text-neutral-100">
                      {displayCurrency === "VES"
                        ? formatMoney(supp.total_debt_ves, "VES")
                        : formatMoney(supp.total_debt_usd, "USD")}
                    </td>
                    <td className="py-3 px-4 text-center">
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-neutral-100 dark:bg-neutral-800 text-neutral-700 dark:text-neutral-300">
                        {supp.open_invoices_count} facturas
                      </span>
                    </td>
                    <td className="py-3 px-4">
                      <div className="flex items-center gap-2">
                        <div className="flex-1 bg-neutral-100 dark:bg-neutral-800 rounded-full h-2 overflow-hidden">
                          <div
                            className="bg-locatel-medio h-full rounded-full transition-all duration-500"
                            style={{ width: `${Math.min(100, supp.percentage)}%` }}
                          />
                        </div>
                        <span className="text-[11px] font-bold font-mono text-neutral-700 dark:text-neutral-300 w-12 text-right">
                          {supp.percentage}%
                        </span>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
