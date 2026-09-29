"use client";

import { useEffect, useState, useMemo } from "react";
import {
  Calendar,
  Building2,
  RefreshCw,
  Search,
  ExternalLink,
  ShieldCheck,
  TrendingUp,
  DollarSign,
  Coins,
  CheckCircle2,
} from "lucide-react";
import { Company, DailyAvailability } from "../types";

interface DailyClosingHistoryTableProps {
  companies: Company[];
  onSelectClosing: (date: string, companyId: string) => void;
}

export function DailyClosingHistoryTable({
  companies,
  onSelectClosing,
}: DailyClosingHistoryTableProps) {
  const [availabilities, setAvailabilities] = useState<DailyAvailability[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedCompanyId, setSelectedCompanyId] = useState<string>("all");
  const [startDate, setStartDate] = useState<string>(() => {
    const d = new Date();
    d.setDate(d.getDate() - 30);
    return d.toISOString().split("T")[0];
  });
  const [endDate, setEndDate] = useState<string>(() => {
    return new Date().toISOString().split("T")[0];
  });
  const [searchTerm, setSearchTerm] = useState("");

  const formatVES = (val: number) => {
    return new Intl.NumberFormat("es-VE", {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(val || 0);
  };

  const formatUSD = (val: number) => {
    return new Intl.NumberFormat("es-VE", {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(val || 0);
  };

  const loadHistory = async () => {
    setLoading(true);
    try {
      const url =
        selectedCompanyId === "all"
          ? `/api/v1/treasury/availabilities/history?start=${startDate}&end=${endDate}`
          : `/api/v1/treasury/companies/${selectedCompanyId}/availabilities/history?start=${startDate}&end=${endDate}`;
      const res = await fetch(url);
      if (res.ok) {
        const data = await res.json();
        setAvailabilities(Array.isArray(data) ? data : []);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadHistory();
  }, [selectedCompanyId, startDate, endDate]);

  const companyMap = useMemo(() => {
    const map = new Map<string, Company>();
    companies.forEach((c) => map.set(c.id, c));
    return map;
  }, [companies]);

  const filteredList = useMemo(() => {
    return availabilities.filter((item) => {
      const comp = companyMap.get(item.company_id) || item.company;
      const compName = comp?.name || "";
      const dateStr = item.availability_date ? item.availability_date.split("T")[0] : "";
      const term = searchTerm.toLowerCase().trim();
      if (!term) return true;
      return (
        compName.toLowerCase().includes(term) ||
        dateStr.includes(term) ||
        (item.status && item.status.toLowerCase().includes(term))
      );
    });
  }, [availabilities, companyMap, searchTerm]);

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold tracking-tight text-neutral-900 dark:text-neutral-100 flex items-center gap-2">
            <Calendar className="w-5 h-5 text-locatel-medio" />
            Histórico de Cierres Diarios y Posición de Disponibilidad
          </h2>
          <p className="text-xs text-neutral-500 mt-1">
            Auditoría, consulta y reedición de posiciones operativas aprobadas por coordinación.
          </p>
        </div>

        <button
          onClick={loadHistory}
          disabled={loading}
          className="flex items-center justify-center gap-2 px-3.5 py-2 rounded-xl border border-neutral-200 dark:border-neutral-700 bg-white dark:bg-neutral-800 hover:bg-neutral-50 dark:hover:bg-neutral-700 text-neutral-700 dark:text-neutral-200 text-xs font-semibold shadow-xs transition-colors cursor-pointer disabled:opacity-50"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${loading ? "animate-spin" : ""}`} />
          <span>Actualizar</span>
        </button>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 bg-white dark:bg-neutral-900 p-4 rounded-2xl border border-neutral-200 dark:border-neutral-800 shadow-xs">
        <div>
          <label className="block text-xs font-semibold text-neutral-600 dark:text-neutral-300 mb-1.5 flex items-center gap-1.5">
            <Building2 className="w-4 h-4 text-locatel-medio" />
            Empresa
          </label>
          <select
            value={selectedCompanyId}
            onChange={(e) => setSelectedCompanyId(e.target.value)}
            className="w-full px-3 py-2 text-xs rounded-xl bg-white dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 text-neutral-800 dark:text-neutral-200 focus:outline-none focus:ring-2 focus:ring-locatel-medio/30 cursor-pointer"
          >
            <option value="all">Todas las Empresas</option>
            {companies.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name} ({c.code})
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="block text-xs font-semibold text-neutral-600 dark:text-neutral-300 mb-1.5 flex items-center gap-1.5">
            <Calendar className="w-4 h-4 text-locatel-medio" />
            Desde
          </label>
          <input
            type="date"
            value={startDate}
            onChange={(e) => setStartDate(e.target.value)}
            className="w-full px-3 py-2 text-xs rounded-xl bg-white dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 text-neutral-800 dark:text-neutral-200 focus:outline-none focus:ring-2 focus:ring-locatel-medio/30 cursor-pointer"
          />
        </div>

        <div>
          <label className="block text-xs font-semibold text-neutral-600 dark:text-neutral-300 mb-1.5 flex items-center gap-1.5">
            <Calendar className="w-4 h-4 text-locatel-medio" />
            Hasta
          </label>
          <input
            type="date"
            value={endDate}
            onChange={(e) => setEndDate(e.target.value)}
            className="w-full px-3 py-2 text-xs rounded-xl bg-white dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 text-neutral-800 dark:text-neutral-200 focus:outline-none focus:ring-2 focus:ring-locatel-medio/30 cursor-pointer"
          />
        </div>

        <div>
          <label className="block text-xs font-semibold text-neutral-600 dark:text-neutral-300 mb-1.5 flex items-center gap-1.5">
            <Search className="w-4 h-4 text-locatel-medio" />
            Buscar
          </label>
          <input
            type="text"
            placeholder="Filtrar por texto..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full px-3 py-2 text-xs rounded-xl bg-white dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 text-neutral-800 dark:text-neutral-200 focus:outline-none focus:ring-2 focus:ring-locatel-medio/30"
          />
        </div>
      </div>

      <div className="bg-white dark:bg-neutral-900 rounded-2xl border border-neutral-200 dark:border-neutral-800 shadow-xs overflow-hidden">
        {loading ? (
          <div className="p-12 text-center text-neutral-400">
            <RefreshCw className="w-7 h-7 animate-spin mx-auto mb-2 text-locatel-medio" />
            <p className="text-xs">Cargando histórico de cierres...</p>
          </div>
        ) : filteredList.length === 0 ? (
          <div className="p-12 text-center text-neutral-400">
            <p className="text-sm font-semibold">No se encontraron cierres registrados</p>
            <p className="text-xs mt-1">Modifique los filtros o el rango de fechas seleccionado.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="border-b border-neutral-200 dark:border-neutral-700 bg-neutral-50/80 dark:bg-neutral-800/60">
                  <th className="px-3.5 py-3 font-bold text-neutral-800 dark:text-neutral-200 uppercase tracking-wider">
                    Fecha Cierre
                  </th>
                  <th className="px-3.5 py-3 font-bold text-neutral-800 dark:text-neutral-200 uppercase tracking-wider">
                    Empresa
                  </th>
                  <th className="px-3 py-3 font-bold text-neutral-800 dark:text-neutral-200 uppercase tracking-wider text-right">
                    Tasa BCV
                  </th>
                  <th className="px-3.5 py-3 font-bold text-neutral-800 dark:text-neutral-200 uppercase tracking-wider text-right">
                    Liquidez Total
                  </th>
                  <th className="px-3.5 py-3 font-bold text-neutral-800 dark:text-neutral-200 uppercase tracking-wider text-right">
                    Comprometido
                  </th>
                  <th className="px-3.5 py-3 font-bold text-neutral-800 dark:text-neutral-200 uppercase tracking-wider text-right">
                    Remanente (Resta)
                  </th>
                  <th className="px-3 py-3 font-bold text-neutral-800 dark:text-neutral-200 uppercase tracking-wider text-center">
                    Estado
                  </th>
                  <th className="px-3.5 py-3 font-bold text-neutral-800 dark:text-neutral-200 uppercase tracking-wider text-center">
                    Acción
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-neutral-200/80 dark:divide-neutral-800 text-xs">
                {filteredList.map((item) => {
                  const comp = companyMap.get(item.company_id) || item.company;
                  const dateStr = item.availability_date ? item.availability_date.split("T")[0] : "";
                  const rate = item.exchange_rate || 1;
                  const totalCommitted =
                    (item.supplier_amount || 0) +
                    (item.payroll_amount || 0) +
                    (item.tax_amount || 0) +
                    (item.fx_amount || 0) +
                    (item.refund_amount || 0);
                  const remaining = item.total_liquidity - totalCommitted;

                  return (
                    <tr
                      key={item.id}
                      className="even:bg-neutral-50/30 dark:even:bg-neutral-800/20 hover:bg-neutral-50 dark:hover:bg-neutral-800/50 transition-colors"
                    >
                      <td className="px-3.5 py-3.5 font-bold text-neutral-900 dark:text-neutral-100 font-mono">
                        {dateStr}
                      </td>

                      <td className="px-3.5 py-3.5">
                        <div className="font-semibold text-neutral-900 dark:text-neutral-100">
                          {comp?.name || "Empresa"}
                        </div>
                        <div className="text-[10px] font-mono text-neutral-400">
                          {comp?.code}
                        </div>
                      </td>

                      <td className="px-3 py-3.5 text-right font-mono font-semibold text-neutral-700 dark:text-neutral-300">
                        {formatVES(rate)} Bs.
                      </td>

                      <td className="px-3.5 py-3.5 text-right font-mono">
                        <span className="font-bold text-neutral-900 dark:text-neutral-100 block">
                          Bs. {formatVES(item.total_liquidity)}
                        </span>
                        <span className="text-[10px] text-neutral-400 block">
                          ≈ $ {formatUSD(rate > 0 ? item.total_liquidity / rate : 0)} USD
                        </span>
                      </td>

                      <td className="px-3.5 py-3.5 text-right font-mono">
                        <span className="font-semibold text-neutral-800 dark:text-neutral-200 block">
                          Bs. {formatVES(totalCommitted)}
                        </span>
                        <span className="text-[10px] text-neutral-400 block">
                          ≈ $ {formatUSD(rate > 0 ? totalCommitted / rate : 0)} USD
                        </span>
                      </td>

                      <td className="px-3.5 py-3.5 text-right font-mono">
                        <span
                          className={`font-bold block ${
                            remaining < 0
                              ? "text-red-600 dark:text-red-400"
                              : "text-emerald-600 dark:text-emerald-400"
                          }`}
                        >
                          Bs. {formatVES(remaining)}
                        </span>
                        <span className="text-[10px] text-neutral-400 block">
                          ≈ $ {formatUSD(rate > 0 ? remaining / rate : 0)} USD
                        </span>
                      </td>

                      <td className="px-3 py-3.5 text-center">
                        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-800">
                          <CheckCircle2 className="w-3 h-3" />
                          {item.status || "APROBADO"}
                        </span>
                      </td>

                      <td className="px-3.5 py-3.5 text-center">
                        <button
                          onClick={() => onSelectClosing(dateStr, item.company_id)}
                          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-locatel-medio/10 hover:bg-locatel-medio hover:text-white text-locatel-medio dark:bg-emerald-950/40 dark:text-emerald-400 text-xs font-semibold transition-all cursor-pointer shadow-xs"
                          title="Cargar y editar este cierre diario"
                        >
                          <ExternalLink className="w-3.5 h-3.5" />
                          <span>Editar Cierre</span>
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
