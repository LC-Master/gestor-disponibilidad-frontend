"use client";

import { useEffect, useMemo, useState } from "react";
import {
  useTable,
  stockFeatures,
  createColumnHelper,
  SortingState,
  ColumnDef,
} from "@tanstack/react-table";
import {
  Building2,
  Calendar,
  Coins,
  History,
  RefreshCw,
  Search,
  TrendingDown,
  TrendingUp,
  Wallet,
  Table as TableIcon,
  LayoutGrid,
  BarChart3,
  Landmark,
} from "lucide-react";
import { BankAccount, Company, DailyAccountBalance } from "../types";
import { fetchClient } from "@/lib/fetchClient";

interface MonthlyHistoryMatrixProps {
  companies: Company[];
  accounts: BankAccount[];
}

type AccountMonthlyRow = {
  account_id: string;
  bank_name: string;
  bank_code: string;
  terminal_code: string;
  account_alias: string;
  account_number: string;
  currency: string;
  [dayKey: `day_${number}`]: number | null;
};

const columnHelper = createColumnHelper<typeof stockFeatures, AccountMonthlyRow>();

export function MonthlyHistoryMatrix({
  companies,
  accounts,
}: MonthlyHistoryMatrixProps) {
  const currentDate = useMemo(() => new Date(), []);
  const [selectedCompanyId, setSelectedCompanyId] = useState<string>("");
  const [selectedCurrency, setSelectedCurrency] = useState<"VES" | "USD" | "EUR">("VES");
  const [selectedYear, setSelectedYear] = useState<number>(currentDate.getFullYear());
  const [selectedMonth, setSelectedMonth] = useState<number>(currentDate.getMonth() + 1);
  const [historyData, setHistoryData] = useState<DailyAccountBalance[]>([]);
  const [loading, setLoading] = useState(false);
  const [globalFilter, setGlobalFilter] = useState("");
  const [sorting, setSorting] = useState<SortingState>([]);
  const [viewMode, setViewMode] = useState<"matrix" | "cards" | "analytics">("matrix");
  const [hoveredDay, setHoveredDay] = useState<number | null>(null);

  useEffect(() => {
    if (companies.length > 0 && !selectedCompanyId) {
      setSelectedCompanyId(companies[0].id);
    }
  }, [companies, selectedCompanyId]);

  const daysInMonth = useMemo(() => {
    return new Date(selectedYear, selectedMonth, 0).getDate();
  }, [selectedYear, selectedMonth]);

  const fetchHistory = async () => {
    if (!selectedCompanyId) return;
    setLoading(true);
    try {
      const monthStr = String(selectedMonth).padStart(2, "0");
      const startDate = `${selectedYear}-${monthStr}-01`;
      const endDate = `${selectedYear}-${monthStr}-${String(daysInMonth).padStart(2, "0")}`;

      const res = await fetchClient(
        `/api/v1/treasury/companies/${selectedCompanyId}/history?start=${startDate}&end=${endDate}`
      );
      if (res.ok) {
        const data = await res.json();
        setHistoryData(Array.isArray(data) ? data : []);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchHistory();
  }, [selectedCompanyId, selectedYear, selectedMonth, daysInMonth]);

  const filteredAccounts = useMemo(() => {
    if (!selectedCompanyId) return [];
    return accounts.filter(
      (acc) =>
        acc.company_id === selectedCompanyId &&
        acc.currency === selectedCurrency &&
        acc.is_active
    );
  }, [accounts, selectedCompanyId, selectedCurrency]);

  const matrixRows = useMemo<AccountMonthlyRow[]>(() => {
    const balancesByAccountAndDay: Record<string, Record<number, number>> = {};

    historyData.forEach((item) => {
      if (!balancesByAccountAndDay[item.bank_account_id]) {
        balancesByAccountAndDay[item.bank_account_id] = {};
      }
      const dateParts = item.balance_date.split("T")[0].split("-");
      if (dateParts.length >= 3) {
        const dayNum = parseInt(dateParts[2], 10);
        balancesByAccountAndDay[item.bank_account_id][dayNum] = item.balance_amount;
      }
    });

    return filteredAccounts.map((account) => {
      const row: AccountMonthlyRow = {
        account_id: account.id,
        bank_name: account.bank?.name || "Banco",
        bank_code: account.bank?.code || "",
        terminal_code: account.terminal_code,
        account_alias: account.account_alias,
        account_number: account.account_number || "",
        currency: account.currency,
      };

      const accountBalances = balancesByAccountAndDay[account.id] || {};

      for (let day = 1; day <= daysInMonth; day++) {
        const dayKey: `day_${number}` = `day_${day}`;
        row[dayKey] = accountBalances[day] !== undefined ? accountBalances[day] : null;
      }

      return row;
    });
  }, [filteredAccounts, historyData, daysInMonth]);

  const dailyTotals = useMemo(() => {
    const totals: Record<number, { sum: number; count: number }> = {};
    for (let day = 1; day <= daysInMonth; day++) {
      let sum = 0;
      let count = 0;
      matrixRows.forEach((row) => {
        const val = row[`day_${day}`];
        if (val !== null && val !== undefined) {
          sum += Number(val);
          count++;
        }
      });
      totals[day] = { sum, count };
    }
    return totals;
  }, [matrixRows, daysInMonth]);

  const kpis = useMemo(() => {
    let latestDayWithData = 0;
    let latestBalance = 0;
    let firstDayWithData = 0;
    let firstBalance = 0;
    let peakDay = 0;
    let peakBalance = 0;
    let lowestDay = 0;
    let lowestBalance = Infinity;
    let totalActiveDays = 0;
    let cumulativeSum = 0;

    for (let day = 1; day <= daysInMonth; day++) {
      const dayData = dailyTotals[day];
      if (dayData && dayData.count > 0) {
        if (firstDayWithData === 0) {
          firstDayWithData = day;
          firstBalance = dayData.sum;
        }
        latestDayWithData = day;
        latestBalance = dayData.sum;
        totalActiveDays++;
        cumulativeSum += dayData.sum;

        if (dayData.sum > peakBalance) {
          peakBalance = dayData.sum;
          peakDay = day;
        }
        if (dayData.sum < lowestBalance) {
          lowestBalance = dayData.sum;
          lowestDay = day;
        }
      }
    }

    if (lowestBalance === Infinity) {
      lowestBalance = 0;
    }

    const netChange = latestBalance - firstBalance;
    const avgDailyBalance = totalActiveDays > 0 ? cumulativeSum / totalActiveDays : 0;

    return {
      currentTotal: latestBalance,
      latestDay: latestDayWithData,
      netChange,
      peakDay,
      peakBalance,
      lowestDay,
      lowestBalance,
      avgDailyBalance,
      activeDays: totalActiveDays,
      accountsCount: filteredAccounts.length,
    };
  }, [dailyTotals, daysInMonth, filteredAccounts]);

  const dayMetadata = useMemo(() => {
    const meta: Record<number, { dayNum: number; weekday: string; isWeekend: boolean }> = {};
    for (let d = 1; d <= daysInMonth; d++) {
      const dt = new Date(selectedYear, selectedMonth - 1, d);
      const dayOfWeek = dt.getDay();
      const wd = new Intl.DateTimeFormat("es-VE", { weekday: "narrow" }).format(dt).toUpperCase();
      meta[d] = {
        dayNum: d,
        weekday: wd,
        isWeekend: dayOfWeek === 0 || dayOfWeek === 6,
      };
    }
    return meta;
  }, [selectedYear, selectedMonth, daysInMonth]);

  const columns = useMemo(() => {
    const cols: ColumnDef<typeof stockFeatures, AccountMonthlyRow, any>[] = [
      columnHelper.accessor("bank_name", {
        id: "account_info",
        header: "Cuenta Bancaria & Terminal",
        cell: (info) => (
          <div className="flex items-center gap-3 py-1 min-w-65">
            <div className="w-9 h-9 rounded-xl bg-locatel-medio/10 border border-locatel-medio/20 flex items-center justify-center text-locatel-medio font-bold text-xs shrink-0">
              {info.getValue().charAt(0)}
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-1.5">
                <span className="font-semibold text-xs text-neutral-900 dark:text-neutral-100 truncate">
                  {info.getValue()}
                </span>
                <span className="px-1.5 py-0.5 rounded text-[10px] font-mono font-medium bg-neutral-100 dark:bg-neutral-800 text-neutral-600 dark:text-neutral-400 border border-neutral-200 dark:border-neutral-700">
                  {info.row.original.terminal_code}
                </span>
              </div>
              <p className="text-[11px] text-neutral-500 truncate mt-0.5">
                {info.row.original.account_alias}
                {info.row.original.account_number && ` • ${info.row.original.account_number.slice(-4)}`}
              </p>
            </div>
          </div>
        ),
      }),
    ];

    for (let day = 1; day <= daysInMonth; day++) {
      const dayKey: `day_${number}` = `day_${day}`;
      const meta = dayMetadata[day];
      cols.push(
        columnHelper.accessor(dayKey as any, {
          header: () => (
            <div
              className={`flex flex-col items-center justify-center py-0.5 px-1 min-w-19 ${meta?.isWeekend ? "text-neutral-400 dark:text-neutral-500" : "text-neutral-700 dark:text-neutral-200"
                }`}
            >
              <span className="text-[10px] uppercase font-bold tracking-wider">
                {meta?.weekday}
              </span>
              <span className="text-xs font-mono font-semibold">
                {String(day).padStart(2, "0")}
              </span>
            </div>
          ),
          cell: (info) => {
            const val = info.getValue();
            if (val === null || val === undefined) {
              return (
                <div className="text-center text-neutral-300 dark:text-neutral-700 font-mono text-xs py-1">
                  —
                </div>
              );
            }
            return (
              <div className="text-right py-1 px-1">
                <span className="font-mono text-xs font-semibold text-neutral-900 dark:text-neutral-100 tabular-nums block">
                  {new Intl.NumberFormat("es-VE", {
                    minimumFractionDigits: 2,
                    maximumFractionDigits: 2,
                  }).format(val)}
                </span>
              </div>
            );
          },
        })
      );
    }

    return cols;
  }, [daysInMonth, dayMetadata]);

  const table = useTable({
    features: stockFeatures,
    columns,
    data: matrixRows,
    state: {
      sorting,
      globalFilter,
    },
    onSortingChange: setSorting,
    onGlobalFilterChange: setGlobalFilter,
  });

  const accountCardsData = useMemo(() => {
    return matrixRows.map((row) => {
      let firstVal: number | null = null;
      let lastVal: number | null = null;
      let maxVal = 0;
      let minVal = Infinity;
      let sum = 0;
      let count = 0;
      const historyPoints: number[] = [];

      for (let d = 1; d <= daysInMonth; d++) {
        const v = row[`day_${d}`];
        if (v !== null && v !== undefined) {
          const num = Number(v);
          if (firstVal === null) firstVal = num;
          lastVal = num;
          if (num > maxVal) maxVal = num;
          if (num < minVal) minVal = num;
          sum += num;
          count++;
          historyPoints.push(num);
        } else {
          historyPoints.push(lastVal ?? 0);
        }
      }

      if (minVal === Infinity) minVal = 0;
      const avg = count > 0 ? sum / count : 0;
      const startBalance = firstVal ?? 0;
      const currentBalance = lastVal ?? 0;
      const net = currentBalance - startBalance;
      const pct = startBalance > 0 ? (net / startBalance) * 100 : 0;

      return {
        ...row,
        startBalance,
        currentBalance,
        net,
        pct,
        maxVal,
        minVal,
        avg,
        count,
        historyPoints,
      };
    });
  }, [matrixRows, daysInMonth]);

  const months = [
    { num: 1, name: "Enero" },
    { num: 2, name: "Febrero" },
    { num: 3, name: "Marzo" },
    { num: 4, name: "Abril" },
    { num: 5, name: "Mayo" },
    { num: 6, name: "Junio" },
    { num: 7, name: "Julio" },
    { num: 8, name: "Agosto" },
    { num: 9, name: "Septiembre" },
    { num: 10, name: "Octubre" },
    { num: 11, name: "Noviembre" },
    { num: 12, name: "Diciembre" },
  ];

  const years = Array.from({ length: 5 }, (_, i) => currentDate.getFullYear() - i);

  return (
    <div className="space-y-6">
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold tracking-tight text-neutral-900 dark:text-neutral-100 flex items-center gap-2">
            <History className="w-5 h-5 text-locatel-medio" />
            Matriz Histórica de Posición Mensual
          </h2>
          <p className="text-xs text-neutral-500 mt-1">
            Auditoría de balances diarios, dispersión de liquidez y evolución consolidada por cuenta.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <div className="flex items-center p-1 bg-neutral-100 dark:bg-neutral-800 rounded-xl border border-neutral-200 dark:border-neutral-700">
            <button
              onClick={() => setViewMode("matrix")}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer ${viewMode === "matrix"
                ? "bg-white dark:bg-neutral-900 text-neutral-900 dark:text-neutral-100 shadow-xs"
                : "text-neutral-600 dark:text-neutral-400 hover:text-neutral-900 dark:hover:text-neutral-200"
                }`}
            >
              <TableIcon className="w-3.5 h-3.5" />
              <span>Matriz</span>
            </button>

            <button
              onClick={() => setViewMode("cards")}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer ${viewMode === "cards"
                ? "bg-white dark:bg-neutral-900 text-neutral-900 dark:text-neutral-100 shadow-xs"
                : "text-neutral-600 dark:text-neutral-400 hover:text-neutral-900 dark:hover:text-neutral-200"
                }`}
            >
              <LayoutGrid className="w-3.5 h-3.5" />
              <span>Por Cuenta</span>
            </button>

            <button
              onClick={() => setViewMode("analytics")}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer ${viewMode === "analytics"
                ? "bg-white dark:bg-neutral-900 text-neutral-900 dark:text-neutral-100 shadow-xs"
                : "text-neutral-600 dark:text-neutral-400 hover:text-neutral-900 dark:hover:text-neutral-200"
                }`}
            >
              <BarChart3 className="w-3.5 h-3.5" />
              <span>Evolución</span>
            </button>
          </div>

          <button
            onClick={fetchHistory}
            disabled={loading}
            className="flex items-center justify-center gap-2 px-3.5 py-2 text-xs font-semibold rounded-xl bg-white dark:bg-neutral-800 hover:bg-neutral-50 dark:hover:bg-neutral-700 text-neutral-700 dark:text-neutral-200 border border-neutral-200 dark:border-neutral-700 transition-colors cursor-pointer shadow-xs disabled:opacity-50"
            title="Recargar matriz"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? "animate-spin" : ""}`} />
            <span className="hidden sm:inline">Actualizar</span>
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5">
        <div className="p-4.5 rounded-2xl bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 shadow-xs">
          <div className="flex items-center justify-between text-xs text-neutral-500 mb-1.5">
            <span className="font-semibold">Último Saldo Registrado</span>
            <Wallet className="w-4 h-4 text-locatel-medio" />
          </div>
          <div className="text-2xl font-bold font-mono text-neutral-900 dark:text-neutral-100 tabular-nums">
            {new Intl.NumberFormat("es-VE", {
              minimumFractionDigits: 2,
              maximumFractionDigits: 2,
            }).format(kpis.currentTotal)}{" "}
            <span className="text-xs font-bold text-locatel-medio">{selectedCurrency}</span>
          </div>
          <p className="text-xs text-neutral-400 mt-1">
            {kpis.latestDay > 0
              ? `Consolidado día ${kpis.latestDay}`
              : "Sin registros este mes"}
          </p>
        </div>

        <div className="p-4.5 rounded-2xl bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 shadow-xs">
          <div className="flex items-center justify-between text-xs text-neutral-500 mb-1.5">
            <span className="font-semibold">Variación Mensual Neta</span>
            {kpis.netChange >= 0 ? (
              <TrendingUp className="w-4 h-4 text-emerald-500" />
            ) : (
              <TrendingDown className="w-4 h-4 text-red-500" />
            )}
          </div>
          <div
            className={`text-2xl font-bold font-mono tabular-nums ${kpis.netChange > 0
              ? "text-emerald-600 dark:text-emerald-400"
              : kpis.netChange < 0
                ? "text-red-500"
                : "text-neutral-800 dark:text-neutral-200"
              }`}
          >
            {kpis.netChange > 0 ? "+" : ""}
            {new Intl.NumberFormat("es-VE", {
              minimumFractionDigits: 2,
              maximumFractionDigits: 2,
            }).format(kpis.netChange)}{" "}
            <span className="text-xs font-normal text-neutral-500">{selectedCurrency}</span>
          </div>
          <p className="text-xs text-neutral-400 mt-1">
            Diferencia entre primer y último día registrado
          </p>
        </div>

        <div className="p-4.5 rounded-2xl bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 shadow-xs">
          <div className="flex items-center justify-between text-xs text-neutral-500 mb-1.5">
            <span className="font-semibold">Pico de Liquidez</span>
            <Coins className="w-4 h-4 text-locatel-oro" />
          </div>
          <div className="text-2xl font-bold font-mono text-neutral-900 dark:text-neutral-100 tabular-nums">
            {new Intl.NumberFormat("es-VE", {
              minimumFractionDigits: 2,
              maximumFractionDigits: 2,
            }).format(kpis.peakBalance)}{" "}
            <span className="text-xs font-bold text-locatel-oro">{selectedCurrency}</span>
          </div>
          <p className="text-xs text-neutral-400 mt-1">
            {kpis.peakDay > 0
              ? `Máximo alcanzado el día ${kpis.peakDay}`
              : "Sin movimientos"}
          </p>
        </div>

        <div className="p-4.5 rounded-2xl bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 shadow-xs">
          <div className="flex items-center justify-between text-xs text-neutral-500 mb-1.5">
            <span className="font-semibold">Promedio Diario Consolidado</span>
            <Building2 className="w-4 h-4 text-locatel-claro" />
          </div>
          <div className="text-2xl font-bold font-mono text-neutral-900 dark:text-neutral-100 tabular-nums">
            {new Intl.NumberFormat("es-VE", {
              minimumFractionDigits: 2,
              maximumFractionDigits: 2,
            }).format(kpis.avgDailyBalance)}{" "}
            <span className="text-xs font-normal text-neutral-500">{selectedCurrency}</span>
          </div>
          <p className="text-xs text-neutral-400 mt-1">
            {kpis.accountsCount} cuentas evaluadas en el período
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-5 gap-3.5 bg-white dark:bg-neutral-900 p-4.5 rounded-2xl border border-neutral-200 dark:border-neutral-800 shadow-xs">
        <div>
          <label className="text-xs sm:text-sm font-semibold text-neutral-600 dark:text-neutral-300 mb-1.5 flex items-center gap-1.5">
            <Building2 className="w-4 h-4 text-locatel-medio" />
            Empresa
          </label>
          <select
            value={selectedCompanyId}
            onChange={(e) => setSelectedCompanyId(e.target.value)}
            className="w-full px-3.5 py-2.5 text-xs sm:text-sm rounded-xl bg-white dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 text-neutral-800 dark:text-neutral-200 focus:outline-none focus:ring-2 focus:ring-locatel-medio/30 cursor-pointer"
          >
            {companies.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name} ({c.code})
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="text-xs sm:text-sm font-semibold text-neutral-600 dark:text-neutral-300 mb-1.5 flex items-center gap-1.5">
            <Coins className="w-4 h-4 text-locatel-medio" />
            Moneda
          </label>
          <select
            value={selectedCurrency}
            onChange={(e) => setSelectedCurrency(e.target.value as "VES" | "USD" | "EUR")}
            className="w-full px-3.5 py-2.5 text-xs sm:text-sm rounded-xl bg-white dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 text-neutral-800 dark:text-neutral-200 focus:outline-none focus:ring-2 focus:ring-locatel-medio/30 cursor-pointer"
          >
            <option value="VES">VES (Bolívares)</option>
            <option value="USD">USD (Dólares)</option>
            <option value="EUR">EUR (Euros)</option>
          </select>
        </div>

        <div>
          <label className="text-xs sm:text-sm font-semibold text-neutral-600 dark:text-neutral-300 mb-1.5 flex items-center gap-1.5">
            <Calendar className="w-4 h-4 text-locatel-medio" />
            Mes
          </label>
          <select
            value={selectedMonth}
            onChange={(e) => setSelectedMonth(Number(e.target.value))}
            className="w-full px-3.5 py-2.5 text-xs sm:text-sm rounded-xl bg-white dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 text-neutral-800 dark:text-neutral-200 focus:outline-none focus:ring-2 focus:ring-locatel-medio/30 cursor-pointer"
          >
            {months.map((m) => (
              <option key={m.num} value={m.num}>
                {m.name}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="text-xs sm:text-sm font-semibold text-neutral-600 dark:text-neutral-300 mb-1.5 flex items-center gap-1.5">
            <Calendar className="w-4 h-4 text-locatel-medio" />
            Año
          </label>
          <select
            value={selectedYear}
            onChange={(e) => setSelectedYear(Number(e.target.value))}
            className="w-full px-3.5 py-2.5 text-xs sm:text-sm rounded-xl bg-white dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 text-neutral-800 dark:text-neutral-200 focus:outline-none focus:ring-2 focus:ring-locatel-medio/30 cursor-pointer"
          >
            {years.map((y) => (
              <option key={y} value={y}>
                {y}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="text-xs sm:text-sm font-semibold text-neutral-600 dark:text-neutral-300 mb-1.5 flex items-center gap-1.5">
            <Search className="w-4 h-4 text-locatel-medio" />
            Buscar Cuenta
          </label>
          <input
            type="text"
            placeholder="Filtrar alias, terminal..."
            value={globalFilter}
            onChange={(e) => setGlobalFilter(e.target.value)}
            className="w-full px-3.5 py-2.5 text-xs sm:text-sm rounded-xl bg-white dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 text-neutral-800 dark:text-neutral-200 focus:outline-none focus:ring-2 focus:ring-locatel-medio/30"
          />
        </div>
      </div>

      {viewMode === "analytics" && (
        <div className="bg-white dark:bg-neutral-900 rounded-2xl border border-neutral-200 dark:border-neutral-800 p-6 shadow-xs space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-neutral-100 dark:border-neutral-800">
            <div>
              <h3 className="text-base font-bold text-neutral-900 dark:text-neutral-100 flex items-center gap-2">
                <BarChart3 className="w-4.5 h-4.5 text-locatel-medio" />
                Curva de Liquidez Consolidada • {months.find((m) => m.num === selectedMonth)?.name} {selectedYear}
              </h3>
              <p className="text-xs text-neutral-500 mt-0.5">
                Volumen diario consolidado sumando todas las cuentas en {selectedCurrency}.
              </p>
            </div>
            {hoveredDay && (
              <div className="px-3.5 py-1.5 rounded-xl bg-locatel-medio/10 border border-locatel-medio/20 flex items-center gap-3 text-xs">
                <span className="font-semibold text-locatel-medio">
                  Día {hoveredDay} ({dayMetadata[hoveredDay]?.weekday}):
                </span>
                <span className="font-bold font-mono text-neutral-900 dark:text-neutral-100">
                  {new Intl.NumberFormat("es-VE", {
                    minimumFractionDigits: 2,
                    maximumFractionDigits: 2,
                  }).format(dailyTotals[hoveredDay]?.sum || 0)}{" "}
                  {selectedCurrency}
                </span>
              </div>
            )}
          </div>

          <div className="h-64 flex items-end gap-1.5 pt-8 pb-2 px-2 overflow-x-auto custom-scrollbar">
            {Array.from({ length: daysInMonth }, (_, i) => i + 1).map((day) => {
              const val = dailyTotals[day]?.sum || 0;
              const hasData = (dailyTotals[day]?.count || 0) > 0;
              const maxRef = kpis.peakBalance > 0 ? kpis.peakBalance : 1;
              const heightPct = hasData ? Math.max(8, Math.round((val / maxRef) * 100)) : 0;
              const isPeak = day === kpis.peakDay && hasData;
              const isWeekend = dayMetadata[day]?.isWeekend;

              return (
                <div
                  key={day}
                  onMouseEnter={() => setHoveredDay(day)}
                  onMouseLeave={() => setHoveredDay(null)}
                  className="flex-1 min-w-5.5 flex flex-col items-center justify-end h-full group relative cursor-pointer"
                >
                  <div className="w-full flex items-end justify-center h-full">
                    {hasData ? (
                      <div
                        style={{ height: `${heightPct}%` }}
                        className={`w-full rounded-t-md transition-all duration-200 group-hover:opacity-90 ${isPeak
                          ? "bg-linear-to-t from-emerald-600 to-locatel-claro shadow-xs ring-2 ring-emerald-400/40"
                          : isWeekend
                            ? "bg-neutral-300 dark:bg-neutral-700"
                            : "bg-locatel-medio dark:bg-emerald-500/80"
                          }`}
                      />
                    ) : (
                      <div className="w-full h-1 bg-neutral-200 dark:bg-neutral-800 rounded-full" />
                    )}
                  </div>
                  <span
                    className={`text-[10px] font-mono font-medium mt-2 ${hoveredDay === day
                      ? "text-locatel-medio font-bold"
                      : isWeekend
                        ? "text-neutral-400 dark:text-neutral-600"
                        : "text-neutral-600 dark:text-neutral-400"
                      }`}
                  >
                    {day}
                  </span>
                </div>
              );
            })}
          </div>

          <div className="flex items-center justify-between text-xs text-neutral-500 pt-2 border-t border-neutral-100 dark:border-neutral-800">
            <div className="flex items-center gap-4">
              <span className="flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded-full bg-locatel-medio" />
                Día Laboral Activo
              </span>
              <span className="flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded-full bg-neutral-300 dark:bg-neutral-700" />
                Fin de Semana
              </span>
              <span className="flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 ring-2 ring-emerald-300/50" />
                Pico del Mes (Día {kpis.peakDay})
              </span>
            </div>
            <span className="font-mono text-neutral-600 dark:text-neutral-400">
              Promedio: {new Intl.NumberFormat("es-VE", { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(kpis.avgDailyBalance)} {selectedCurrency}
            </span>
          </div>
        </div>
      )}

      {viewMode === "cards" && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {accountCardsData.length === 0 ? (
            <div className="col-span-full bg-white dark:bg-neutral-900 rounded-2xl p-12 text-center text-xs text-neutral-400 border border-neutral-200 dark:border-neutral-800">
              No se encontraron cuentas bancarias para esta empresa en {selectedCurrency}.
            </div>
          ) : (
            accountCardsData.map((acc) => (
              <div
                key={acc.account_id}
                className="bg-white dark:bg-neutral-900 rounded-2xl p-5 border border-neutral-200 dark:border-neutral-800 shadow-xs hover:border-locatel-medio/40 dark:hover:border-locatel-medio/40 transition-all flex flex-col justify-between space-y-4"
              >
                <div>
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-center gap-2.5">
                      <div className="w-9 h-9 rounded-xl bg-locatel-medio/10 border border-locatel-medio/20 flex items-center justify-center text-locatel-medio font-bold text-xs">
                        <Landmark className="w-4.5 h-4.5" />
                      </div>
                      <div>
                        <h4 className="text-sm font-bold text-neutral-900 dark:text-neutral-100">
                          {acc.bank_name}
                        </h4>
                        <p className="text-xs text-neutral-500">{acc.account_alias}</p>
                      </div>
                    </div>
                    <span className="px-2 py-0.5 rounded-md bg-neutral-100 dark:bg-neutral-800 text-[11px] font-mono font-semibold text-neutral-700 dark:text-neutral-300 border border-neutral-200 dark:border-neutral-700">
                      {acc.terminal_code}
                    </span>
                  </div>

                  {acc.account_number && (
                    <p className="text-[11px] font-mono text-neutral-400 mt-2">
                      Cuenta: {acc.account_number}
                    </p>
                  )}
                </div>

                <div className="grid grid-cols-2 gap-3 p-3 rounded-xl bg-neutral-50 dark:bg-neutral-800/40 border border-neutral-100 dark:border-neutral-800">
                  <div>
                    <span className="text-[10px] uppercase font-semibold text-neutral-400 block">
                      Saldo Cierre
                    </span>
                    <span className="text-base font-bold font-mono text-neutral-900 dark:text-neutral-100 tabular-nums">
                      {new Intl.NumberFormat("es-VE", {
                        minimumFractionDigits: 2,
                        maximumFractionDigits: 2,
                      }).format(acc.currentBalance)}
                    </span>
                  </div>

                  <div>
                    <span className="text-[10px] uppercase font-semibold text-neutral-400 block">
                      Variación Mes
                    </span>
                    <span
                      className={`text-sm font-bold font-mono tabular-nums flex items-center gap-1 mt-0.5 ${acc.net > 0
                        ? "text-emerald-600 dark:text-emerald-400"
                        : acc.net < 0
                          ? "text-red-500"
                          : "text-neutral-600 dark:text-neutral-400"
                        }`}
                    >
                      {acc.net > 0 ? "+" : ""}
                      {new Intl.NumberFormat("es-VE", {
                        minimumFractionDigits: 2,
                        maximumFractionDigits: 2,
                      }).format(acc.net)}
                    </span>
                  </div>
                </div>

                <div className="space-y-1.5 pt-1">
                  <div className="flex items-center justify-between text-[11px] text-neutral-500">
                    <span>Tendencia Diaria (30 Días)</span>
                    <span className="font-mono">Pico: {new Intl.NumberFormat("es-VE", { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(acc.maxVal)}</span>
                  </div>

                  <div className="h-9 flex items-end gap-0.5 w-full bg-neutral-50 dark:bg-neutral-800/30 p-1 rounded-lg">
                    {acc.historyPoints.map((val, idx) => {
                      const maxR = acc.maxVal > 0 ? acc.maxVal : 1;
                      const hPct = val > 0 ? Math.max(12, Math.round((val / maxR) * 100)) : 4;
                      return (
                        <div
                          key={idx}
                          style={{ height: `${hPct}%` }}
                          className={`flex-1 rounded-t-xs transition-all ${val > 0
                            ? "bg-locatel-medio/80 hover:bg-locatel-medio"
                            : "bg-neutral-200 dark:bg-neutral-700"
                            }`}
                          title={`Día ${idx + 1}: ${new Intl.NumberFormat("es-VE", { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(val)}`}
                        />
                      );
                    })}
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      )}

      {viewMode === "matrix" && (
        <div className="bg-white dark:bg-neutral-900 rounded-2xl border border-neutral-200 dark:border-neutral-800 shadow-sm overflow-hidden">
          {loading && (
            <div className="px-4 py-2.5 bg-locatel-medio/10 text-locatel-medio text-xs flex items-center gap-2 border-b border-locatel-medio/20">
              <RefreshCw className="w-3.5 h-3.5 animate-spin" />
              <span>Consultando matriz histórica del período...</span>
            </div>
          )}

          <div className="overflow-x-auto custom-scrollbar max-h-160 relative">
            <table className="w-full text-left border-collapse text-xs">
              <thead className="sticky top-0 z-30 bg-neutral-50/95 dark:bg-neutral-800/95 backdrop-blur-md border-b border-neutral-200 dark:border-neutral-700 shadow-xs">
                {table.getHeaderGroups().map((headerGroup) => (
                  <tr key={headerGroup.id}>
                    {headerGroup.headers.map((header, colIndex) => {
                      const isPinned = colIndex === 0;
                      return (
                        <th
                          key={header.id}
                          className={`py-3 px-3.5 font-bold text-neutral-800 dark:text-neutral-200 select-none ${isPinned
                            ? "sticky left-0 z-40 bg-neutral-50/95 dark:bg-neutral-800/95 border-r border-neutral-200/80 dark:border-neutral-700 shadow-[4px_0_12px_-2px_rgba(0,0,0,0.06)]"
                            : "text-center whitespace-nowrap hover:bg-neutral-100/60 dark:hover:bg-neutral-700/40 transition-colors"
                            }`}
                        >
                          <table.FlexRender header={header} />
                        </th>
                      );
                    })}
                  </tr>
                ))}
              </thead>

              <tbody className="divide-y divide-neutral-100 dark:divide-neutral-800/80">
                {table.getRowModel().rows.length === 0 ? (
                  <tr>
                    <td
                      colSpan={columns.length}
                      className="px-4 py-20 text-center text-xs text-neutral-400 dark:text-neutral-500"
                    >
                      No se encontraron registros de balance para los filtros seleccionados.
                    </td>
                  </tr>
                ) : (
                  table.getRowModel().rows.map((row) => (
                    <tr
                      key={row.id}
                      className="hover:bg-neutral-50/70 dark:hover:bg-neutral-800/40 transition-colors group"
                    >
                      {row.getAllCells().map((cell, cellIndex) => {
                        const isPinned = cellIndex === 0;
                        return (
                          <td
                            key={cell.id}
                            className={`py-2 px-3 whitespace-nowrap ${isPinned
                              ? "sticky left-0 z-20 bg-white dark:bg-neutral-900 group-hover:bg-neutral-50 dark:group-hover:bg-neutral-800/80 border-r border-neutral-200/80 dark:border-neutral-700 shadow-[4px_0_12px_-2px_rgba(0,0,0,0.06)]"
                              : ""
                              }`}
                          >
                            <table.FlexRender cell={cell} />
                          </td>
                        );
                      })}
                    </tr>
                  ))
                )}
              </tbody>

              {matrixRows.length > 0 && (
                <tfoot className="sticky bottom-0 z-30 bg-neutral-50/95 dark:bg-neutral-800/95 backdrop-blur-md border-t-2 border-locatel-medio shadow-lg">
                  <tr>
                    <td className="sticky left-0 z-40 bg-neutral-50 dark:bg-neutral-800 border-r border-neutral-200 dark:border-neutral-700 shadow-[4px_0_12px_-2px_rgba(0,0,0,0.06)] py-3 px-3.5">
                      <div className="flex items-center justify-between gap-2">
                        <span className="font-bold text-xs uppercase text-locatel-oscuro dark:text-emerald-400">
                          Total Consolidado
                        </span>
                        <span className="text-[10px] font-mono font-semibold text-neutral-500">
                          {matrixRows.length} Cuentas
                        </span>
                      </div>
                    </td>

                    {Array.from({ length: daysInMonth }, (_, i) => i + 1).map((day) => {
                      const dayTotal = dailyTotals[day]?.sum || 0;
                      const hasData = (dailyTotals[day]?.count || 0) > 0;
                      return (
                        <td
                          key={`total_${day}`}
                          className="py-3 px-2 text-right font-mono text-xs font-bold text-neutral-900 dark:text-neutral-100 tabular-nums whitespace-nowrap"
                        >
                          {hasData ? (
                            new Intl.NumberFormat("es-VE", {
                              minimumFractionDigits: 2,
                              maximumFractionDigits: 2,
                            }).format(dayTotal)
                          ) : (
                            <span className="text-neutral-300 dark:text-neutral-600 font-normal">
                              —
                            </span>
                          )}
                        </td>
                      );
                    })}
                  </tr>
                </tfoot>
              )}
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
