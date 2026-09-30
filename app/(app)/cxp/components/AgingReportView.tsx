"use client";

import { useEffect, useState } from "react";
import {
  Clock,
  ExternalLink,
  Loader2,
  RefreshCw,
  Search,
} from "lucide-react";
import { toast } from "sonner";
import { fetchClient } from "@/lib/fetchClient";
import { Company } from "@/app/(app)/tesoreria/types";
import { AgingReportResponse } from "../types";

interface AgingReportViewProps {
  companies: Company[];
  user?: any;
  onOpenStatement?: (supplierId: string) => void;
}

export function AgingReportView({
  companies,
  onOpenStatement,
}: AgingReportViewProps) {
  const [report, setReport] = useState<AgingReportResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [selectedCompanyId, setSelectedCompanyId] = useState<string>("ALL");
  const [search, setSearch] = useState("");

  const fetchAgingReport = async () => {
    setLoading(true);
    try {
      let url = "/api/cxp/reports/aging";
      if (selectedCompanyId && selectedCompanyId !== "ALL") {
        url += `?company_id=${selectedCompanyId}`;
      }
      const res = await fetchClient(url);
      if (res.ok) {
        const data = await res.json();
        setReport(data);
      } else {
        toast.error("Error al cargar reporte de antigüedad de saldos");
      }
    } catch (err) {
      console.error(err);
      toast.error("Error al conectar con el servidor");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAgingReport();
  }, [selectedCompanyId]);

  const formatNumber = (num: number) => {
    return num.toLocaleString("es-VE", {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    });
  };

  const filteredItems = (report?.items || []).filter((item) => {
    if (!search) return true;
    const s = search.toLowerCase();
    return (
      item.business_name.toLowerCase().includes(s) ||
      item.rif.toLowerCase().includes(s) ||
      (item.sap_vendor_code && item.sap_vendor_code.toLowerCase().includes(s))
    );
  });

  return (
    <div className="space-y-6">
      <div className="flex flex-col lg:flex-row items-stretch lg:items-center justify-between gap-4 bg-white dark:bg-neutral-900 p-5 rounded-3xl border border-neutral-200 dark:border-neutral-800 shadow-xs">
        <div className="flex items-center gap-3">
          <div className="p-2.5 rounded-2xl bg-locatel-medio/10 text-locatel-medio">
            <Clock className="w-6 h-6" />
          </div>
          <div>
            <h2 className="text-base sm:text-lg font-bold text-neutral-900 dark:text-neutral-100">
              Antigüedad de Saldos (Aging de CXP)
            </h2>
            <p className="text-xs text-neutral-400">
              Distribución de pasivos por cubetas de vencimiento
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <div className="relative flex-1 sm:w-64">
            <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-neutral-400" />
            <input
              type="text"
              placeholder="Buscar proveedor o RIF..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-9 pr-3 py-2 rounded-xl border border-neutral-200 dark:border-neutral-700 bg-neutral-50 dark:bg-neutral-800 text-xs text-neutral-900 dark:text-neutral-100 placeholder:text-neutral-400 focus:outline-none focus:ring-2 focus:ring-locatel-medio/20"
            />
          </div>

          <select
            value={selectedCompanyId}
            onChange={(e) => setSelectedCompanyId(e.target.value)}
            className="px-3 py-2 rounded-xl border border-neutral-200 dark:border-neutral-700 bg-neutral-50 dark:bg-neutral-800 text-xs font-semibold text-neutral-900 dark:text-neutral-100 focus:outline-none focus:ring-2 focus:ring-locatel-medio/20 cursor-pointer"
          >
            <option value="ALL">Todas las Empresas</option>
            {companies.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>

          <button
            onClick={fetchAgingReport}
            disabled={loading}
            className="p-2 rounded-xl border border-neutral-200 dark:border-neutral-700 bg-neutral-50 dark:bg-neutral-800 text-neutral-600 dark:text-neutral-300 hover:text-neutral-900 dark:hover:text-white transition-colors cursor-pointer"
            title="Actualizar reporte"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin" : ""}`} />
          </button>
        </div>
      </div>

      {report?.summary && (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
          <div className="p-4 rounded-3xl bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 shadow-xs space-y-1.5">
            <span className="text-[11px] font-semibold text-emerald-600 dark:text-emerald-400">
              Corriente (No vencido)
            </span>
            <p className="text-sm font-extrabold font-mono text-neutral-900 dark:text-neutral-100">
              Bs. {formatNumber(report.summary.current_ves)}
            </p>
            <p className="text-[10px] font-mono text-neutral-400">
              ≈ ${formatNumber(report.summary.current_usd)}
            </p>
          </div>

          <div className="p-4 rounded-3xl bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 shadow-xs space-y-1.5">
            <span className="text-[11px] font-semibold text-amber-600 dark:text-amber-400">
              1 a 15 días
            </span>
            <p className="text-sm font-extrabold font-mono text-neutral-900 dark:text-neutral-100">
              Bs. {formatNumber(report.summary.days_1_15_ves)}
            </p>
            <p className="text-[10px] font-mono text-neutral-400">
              ≈ ${formatNumber(report.summary.days_1_15_usd)}
            </p>
          </div>

          <div className="p-4 rounded-3xl bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 shadow-xs space-y-1.5">
            <span className="text-[11px] font-semibold text-amber-700 dark:text-amber-500">
              16 a 30 días
            </span>
            <p className="text-sm font-extrabold font-mono text-neutral-900 dark:text-neutral-100">
              Bs. {formatNumber(report.summary.days_16_30_ves)}
            </p>
            <p className="text-[10px] font-mono text-neutral-400">
              ≈ ${formatNumber(report.summary.days_16_30_usd)}
            </p>
          </div>

          <div className="p-4 rounded-3xl bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 shadow-xs space-y-1.5">
            <span className="text-[11px] font-semibold text-orange-600 dark:text-orange-400">
              31 a 45 días
            </span>
            <p className="text-sm font-extrabold font-mono text-neutral-900 dark:text-neutral-100">
              Bs. {formatNumber(report.summary.days_31_45_ves)}
            </p>
            <p className="text-[10px] font-mono text-neutral-400">
              ≈ ${formatNumber(report.summary.days_31_45_usd)}
            </p>
          </div>

          <div className="p-4 rounded-3xl bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 shadow-xs space-y-1.5">
            <span className="text-[11px] font-semibold text-red-600 dark:text-red-400">
              Más de 45 días
            </span>
            <p className="text-sm font-extrabold font-mono text-red-600 dark:text-red-400">
              Bs. {formatNumber(report.summary.days_over_45_ves)}
            </p>
            <p className="text-[10px] font-mono text-neutral-400">
              ≈ ${formatNumber(report.summary.days_over_45_usd)}
            </p>
          </div>

          <div className="p-4 rounded-3xl bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 shadow-xs space-y-1.5">
            <span className="text-[11px] font-semibold text-neutral-600 dark:text-neutral-400">
              Total Deuda
            </span>
            <p className="text-sm font-extrabold font-mono text-neutral-900 dark:text-neutral-100">
              Bs. {formatNumber(report.summary.total_debt_ves)}
            </p>
            <p className="text-[10px] font-mono text-neutral-400">
              ≈ ${formatNumber(report.summary.total_debt_usd)}
            </p>
          </div>
        </div>
      )}

      <div className="bg-white dark:bg-neutral-900 rounded-3xl border border-neutral-200 dark:border-neutral-800 shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          {loading ? (
            <div className="py-20 flex flex-col items-center justify-center gap-2 text-neutral-400">
              <Loader2 className="w-7 h-7 animate-spin text-locatel-medio" />
              <span className="text-xs font-semibold">Calculando antigüedad de saldos...</span>
            </div>
          ) : filteredItems.length === 0 ? (
            <div className="py-20 text-center text-neutral-400 text-xs font-semibold">
              No hay saldos pendientes registrados para los filtros seleccionados.
            </div>
          ) : (
            <table className="w-full text-left border-collapse min-w-225">
              <thead>
                <tr className="border-b border-neutral-100 dark:border-neutral-800 text-[11px] font-bold text-neutral-400 uppercase tracking-wider bg-neutral-50/50 dark:bg-neutral-800/40">
                  <th className="py-3.5 px-4">Proveedor</th>
                  <th className="py-3.5 px-3 text-right">Corriente</th>
                  <th className="py-3.5 px-3 text-right">1-15 Días</th>
                  <th className="py-3.5 px-3 text-right">16-30 Días</th>
                  <th className="py-3.5 px-3 text-right">31-45 Días</th>
                  <th className="py-3.5 px-3 text-right">&gt;45 Días</th>
                  <th className="py-3.5 px-4 text-right">Total Deuda (VES)</th>
                  <th className="py-3.5 px-3 text-center">Acción</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-neutral-100 dark:divide-neutral-800 text-xs">
                {filteredItems.map((item) => (
                  <tr
                    key={item.supplier_id}
                    className="hover:bg-neutral-50/80 dark:hover:bg-neutral-800/40 transition-colors"
                  >
                    <td className="py-3.5 px-4">
                      <div>
                        <span className="font-bold text-neutral-900 dark:text-neutral-100">
                          {item.business_name}
                        </span>
                        <p className="text-[11px] text-neutral-400 font-mono">
                          {item.rif} {item.sap_vendor_code ? `• SAP: ${item.sap_vendor_code}` : ""} • {item.credit_days}d
                        </p>
                      </div>
                    </td>
                    <td className="py-3.5 px-3 text-right font-mono font-medium text-emerald-600 dark:text-emerald-400">
                      {formatNumber(item.buckets.current_ves)}
                    </td>
                    <td className="py-3.5 px-3 text-right font-mono font-medium text-amber-600 dark:text-amber-400">
                      {formatNumber(item.buckets.days_1_15_ves)}
                    </td>
                    <td className="py-3.5 px-3 text-right font-mono font-medium text-amber-700 dark:text-amber-500">
                      {formatNumber(item.buckets.days_16_30_ves)}
                    </td>
                    <td className="py-3.5 px-3 text-right font-mono font-medium text-orange-600 dark:text-orange-400">
                      {formatNumber(item.buckets.days_31_45_ves)}
                    </td>
                    <td className="py-3.5 px-3 text-right font-mono font-bold text-red-600 dark:text-red-400">
                      {formatNumber(item.buckets.days_over_45_ves)}
                    </td>
                    <td className="py-3.5 px-4 text-right font-mono font-extrabold text-neutral-900 dark:text-neutral-100">
                      Bs. {formatNumber(item.buckets.total_debt_ves)}
                    </td>
                    <td className="py-3.5 px-3 text-center">
                      {onOpenStatement && (
                        <button
                          onClick={() => onOpenStatement(item.supplier_id)}
                          className="px-2.5 py-1.5 rounded-xl text-xs font-semibold text-locatel-medio hover:bg-locatel-medio/10 dark:hover:bg-emerald-950/40 transition-colors inline-flex items-center gap-1.5 cursor-pointer"
                          title="Ver estado de cuenta"
                        >
                          <ExternalLink className="w-3.5 h-3.5" />
                          <span>Ficha</span>
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </div>
  );
}
