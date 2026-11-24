"use client";

import { useEffect, useState, useMemo } from "react";
import {
  Calendar,
  Building2,
  RefreshCw,
  RotateCcw,
  Search,
  ExternalLink,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";
import { Company, DailyAvailability } from "../types";
import { fetchClient } from "@/lib/fetchClient";
import { SearchableSelect } from "@/components/ui/SearchableSelect";

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
  const getDefaultStartDate = () => {
    const d = new Date();
    d.setDate(d.getDate() - 30);
    return d.toISOString().split("T")[0];
  };

  const getDefaultEndDate = () => {
    return new Date().toISOString().split("T")[0];
  };

  const [selectedCompanyId, setSelectedCompanyId] = useState<string>("all");
  const [startDate, setStartDate] = useState<string>(getDefaultStartDate);
  const [endDate, setEndDate] = useState<string>(getDefaultEndDate);
  const [searchTerm, setSearchTerm] = useState("");
  const [page, setPage] = useState<number>(1);
  const [pageSize, setPageSize] = useState<number>(15);
  const [totalRecords, setTotalRecords] = useState<number>(0);
  const [totalPages, setTotalPages] = useState<number>(1);

  const hasActiveFilters = useMemo(() => {
    return (
      selectedCompanyId !== "all" ||
      searchTerm.trim() !== "" ||
      startDate !== getDefaultStartDate() ||
      endDate !== getDefaultEndDate()
    );
  }, [selectedCompanyId, searchTerm, startDate, endDate]);

  const handleClearFilters = () => {
    setSelectedCompanyId("all");
    setSearchTerm("");
    setStartDate(getDefaultStartDate());
    setEndDate(getDefaultEndDate());
    setPage(1);
  };

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
      const params = new URLSearchParams();
      params.append("start", startDate);
      params.append("end", endDate);
      params.append("page", String(page));
      params.append("page_size", String(pageSize));
      if (searchTerm.trim()) {
        params.append("search", searchTerm.trim());
      }
      const url =
        selectedCompanyId === "all"
          ? `/api/v1/treasury/availabilities/history?${params.toString()}`
          : `/api/v1/treasury/companies/${selectedCompanyId}/availabilities/history?${params.toString()}`;
      const res = await fetchClient(url);
      if (res.ok) {
        const resData = await res.json();
        if (Array.isArray(resData)) {
          setAvailabilities(resData);
          setTotalRecords(resData.length);
          setTotalPages(Math.max(1, Math.ceil(resData.length / pageSize)));
        } else {
          const items = Array.isArray(resData?.data) ? resData.data : [];
          setAvailabilities(items);
          setTotalRecords(resData?.meta?.total_records ?? items.length);
          setTotalPages(Math.max(1, resData?.meta?.total_pages ?? 1));
        }
      }
    } catch {
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const timer = setTimeout(() => {
      loadHistory();
    }, 200);
    return () => clearTimeout(timer);
  }, [selectedCompanyId, startDate, endDate, searchTerm, page, pageSize]);

  const companyMap = useMemo(() => {
    const map = new Map<string, Company>();
    companies.forEach((c) => map.set(c.id, c));
    return map;
  }, [companies]);

  const filteredList = availabilities;
  const paginatedList = availabilities;

  return (
    <div className="space-y-6">
      <div className="bg-white dark:bg-neutral-900 p-4 rounded-2xl border border-neutral-200 dark:border-neutral-800 shadow-xs space-y-3">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          <div>
            <label className="text-xs font-semibold text-neutral-600 dark:text-neutral-300 mb-1.5 flex items-center gap-1.5">
              <Building2 className="w-4 h-4 text-locatel-medio" />
              Empresa
            </label>
            <SearchableSelect
              value={selectedCompanyId}
              onChange={(val) => {
                setSelectedCompanyId(val);
                setPage(1);
              }}
              placeholder="Todas las Empresas"
              searchPlaceholder="Buscar por código, nombre o RIF..."
              buttonClassName="w-full px-3 py-2 text-xs rounded-xl bg-white dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 text-neutral-800 dark:text-neutral-200"
              options={[
                { value: "all", label: "Todas las Empresas" },
                ...companies.map((c) => ({
                  value: c.id,
                  label: c.code ? `${c.code} · ${c.name}` : c.name,
                  sublabel: c.rif || undefined,
                  searchTerms: `${c.code || ""} ${c.name} ${c.rif || ""}`,
                })),
              ]}
            />
          </div>

          <div>
            <label className="text-xs font-semibold text-neutral-600 dark:text-neutral-300 mb-1.5 flex items-center gap-1.5">
              <Calendar className="w-4 h-4 text-locatel-medio" />
              Desde
            </label>
            <input
              type="date"
              value={startDate}
              onChange={(e) => {
                setStartDate(e.target.value);
                setPage(1);
              }}
              className="w-full px-3 py-2 text-xs rounded-xl bg-white dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 text-neutral-800 dark:text-neutral-200 focus:outline-none focus:ring-2 focus:ring-locatel-medio/30 cursor-pointer"
            />
          </div>

          <div>
            <label className="text-xs font-semibold text-neutral-600 dark:text-neutral-300 mb-1.5 flex items-center gap-1.5">
              <Calendar className="w-4 h-4 text-locatel-medio" />
              Hasta
            </label>
            <input
              type="date"
              value={endDate}
              onChange={(e) => {
                setEndDate(e.target.value);
                setPage(1);
              }}
              className="w-full px-3 py-2 text-xs rounded-xl bg-white dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 text-neutral-800 dark:text-neutral-200 focus:outline-none focus:ring-2 focus:ring-locatel-medio/30 cursor-pointer"
            />
          </div>

          <div>
            <label className="text-xs font-semibold text-neutral-600 dark:text-neutral-300 mb-1.5 flex items-center gap-1.5">
              <Search className="w-4 h-4 text-locatel-medio" />
              Buscar
            </label>
            <div className="relative">
              <input
                type="text"
                placeholder="Filtrar por texto..."
                value={searchTerm}
                onChange={(e) => {
                  setSearchTerm(e.target.value);
                  setPage(1);
                }}
                className="w-full px-3 py-2 text-xs rounded-xl bg-white dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 text-neutral-800 dark:text-neutral-200 focus:outline-none focus:ring-2 focus:ring-locatel-medio/30 pr-8"
              />
              {searchTerm && (
                <button
                  type="button"
                  onClick={() => {
                    setSearchTerm("");
                    setPage(1);
                  }}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-neutral-400 hover:text-neutral-600 dark:hover:text-neutral-200 cursor-pointer"
                  title="Borrar texto de búsqueda"
                >
                  <RotateCcw className="w-3 h-3" />
                </button>
              )}
            </div>
          </div>
        </div>

        <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 pt-3 border-t border-neutral-100 dark:border-neutral-800">
          <div className="flex items-center gap-2 text-xs text-neutral-500 dark:text-neutral-400">
            <span>
              {totalRecords === 1
                ? "1 cierre registrado"
                : `${totalRecords.toLocaleString("es-VE")} cierres registrados`}
            </span>
            {hasActiveFilters && (
              <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold bg-locatel-medio/10 text-locatel-medio dark:bg-emerald-950/40 dark:text-emerald-400">
                Filtros aplicados
              </span>
            )}
          </div>

          <div className="flex items-center justify-end gap-2">
            <button
              type="button"
              onClick={handleClearFilters}
              disabled={!hasActiveFilters}
              className="flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-xl border border-neutral-200 dark:border-neutral-700 bg-white dark:bg-neutral-800 hover:bg-neutral-50 dark:hover:bg-neutral-700 text-neutral-700 dark:text-neutral-300 text-xs font-semibold shadow-xs transition-colors cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed"
              title="Restablecer filtros a valores por defecto"
            >
              <RotateCcw className="w-3.5 h-3.5 text-neutral-500 dark:text-neutral-400" />
              <span>Limpiar Filtros</span>
            </button>

            <button
              type="button"
              onClick={loadHistory}
              disabled={loading}
              className="flex items-center justify-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-locatel-medio hover:bg-locatel-oscuro text-white text-xs font-semibold shadow-xs transition-colors cursor-pointer disabled:opacity-50"
              title="Actualizar datos del histórico"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${loading ? "animate-spin" : ""}`} />
              <span>Actualizar</span>
            </button>
          </div>
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
                    Saldo Sin Asignar
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
                {paginatedList.map((item) => {
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
                          className={`font-bold block ${remaining < 0
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
                          <span>Editar</span>
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
            <div className="px-4 py-3 border-t border-neutral-200 dark:border-neutral-800 bg-neutral-50/50 dark:bg-neutral-900/30 flex flex-wrap items-center justify-between gap-3 text-xs">
              <div className="flex items-center gap-3 text-neutral-500 dark:text-neutral-400">
                <span>
                  Total: <strong className="text-neutral-800 dark:text-neutral-200 font-mono">{totalRecords.toLocaleString("es-VE")}</strong> registros
                </span>
                <select
                  value={pageSize}
                  onChange={(e) => {
                    setPageSize(Number(e.target.value));
                    setPage(1);
                  }}
                  className="px-2 py-1 rounded-md border border-neutral-200 dark:border-neutral-700 bg-white dark:bg-neutral-900 text-xs text-neutral-700 dark:text-neutral-300 focus:outline-none cursor-pointer"
                >
                  <option value={15}>15 / pág</option>
                  <option value={30}>30 / pág</option>
                </select>
              </div>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                  disabled={page <= 1 || loading}
                  className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg border border-neutral-200 dark:border-neutral-700 bg-white dark:bg-neutral-900 hover:bg-neutral-100 dark:hover:bg-neutral-800 text-neutral-700 dark:text-neutral-300 font-medium disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer transition-colors"
                >
                  <ChevronLeft className="w-3.5 h-3.5" />
                  <span>Anterior</span>
                </button>
                <span className="font-mono text-neutral-600 dark:text-neutral-300 px-2">
                  Página <strong>{page}</strong> de <strong>{totalPages}</strong>
                </span>
                <button
                  type="button"
                  onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                  disabled={page >= totalPages || loading}
                  className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg border border-neutral-200 dark:border-neutral-700 bg-white dark:bg-neutral-900 hover:bg-neutral-100 dark:hover:bg-neutral-800 text-neutral-700 dark:text-neutral-300 font-medium disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer transition-colors"
                >
                  <span>Siguiente</span>
                  <ChevronRight className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
