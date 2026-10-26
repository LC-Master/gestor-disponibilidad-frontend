"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import {
  Calendar,
  Building2,
  Save,
  Lock,
  RefreshCw,
  AlertTriangle,
  AlertCircle,
  History,
  ShieldCheck,
  Search,
  Filter,
  ChevronDown
} from "lucide-react";
import { toast } from "sonner";
import { fetchClient } from "@/lib/fetchClient";
import { BankAccount, Company, DailyAvailability, UserProfile } from "../types";
import { getSpecificRate } from "@/lib/exchangeRates";

interface DailyClosingMatrixProps {
  companies: Company[];
  accounts: BankAccount[];
  user?: UserProfile | null;
  initialDate?: string;
  initialCompanyId?: string;
  onSaved: () => void;
}

export function DailyClosingMatrix({
  companies,
  accounts,
  user,
  initialDate,
  initialCompanyId,
  onSaved,
}: DailyClosingMatrixProps) {
  const todayStr = useMemo(() => {
    return new Date().toISOString().split("T")[0];
  }, []);

  const userPermissions = useMemo(() => {
    return new Set<string>(user?.permissions || []);
  }, [user]);

  const isCoordinator = useMemo(() => {
    const roles = user?.roles || [];
    return roles.some((r) => ["COORD_TESORERIA", "ADMIN", "ADMINISTRADOR"].includes(r.toUpperCase()));
  }, [user]);

  const canOverrideBalances = isCoordinator || userPermissions.has("treasury.balances.override");
  const canApproveAvailability = isCoordinator || userPermissions.has("treasury.availability.approve") || userPermissions.has("treasury.availability.edit");
  const canRecordBalances = isCoordinator || userPermissions.has("treasury.balances.record") || userPermissions.has("treasury.balances.edit") || userPermissions.has("treasury.balances.override");

  const [selectedDate, setSelectedDate] = useState<string>(initialDate || todayStr);

  useEffect(() => {
    if (initialDate) setSelectedDate(initialDate);
  }, [initialDate]);

  const [balanceInputs, setBalanceInputs] = useState<Record<string, string>>({});
  const [loadedAccountIds, setLoadedAccountIds] = useState<Set<string>>(new Set());
  const [savingAccountId, setSavingAccountId] = useState<string | null>(null);
  const [loadingExisting, setLoadingExisting] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const [exchangeRateStr, setExchangeRateStr] = useState<string>("36.5");
  const [euroRateStr, setEuroRateStr] = useState<string>("0");
  const [supplierAmountStr, setSupplierAmountStr] = useState<string>("0");
  const [payrollAmountStr, setPayrollAmountStr] = useState<string>("0");
  const [taxAmountStr, setTaxAmountStr] = useState<string>("0");
  const [fxAmountStr, setFxAmountStr] = useState<string>("0");
  const [refundAmountStr, setRefundAmountStr] = useState<string>("0");

  const exchangeRate = useMemo(() => parseFloat(exchangeRateStr.replace(",", ".")) || 0, [exchangeRateStr]);
  const euroRate = useMemo(() => parseFloat(euroRateStr.replace(",", ".")) || 0, [euroRateStr]);
  const supplierAmount = useMemo(() => parseFloat(supplierAmountStr.replace(",", ".")) || 0, [supplierAmountStr]);
  const payrollAmount = useMemo(() => parseFloat(payrollAmountStr.replace(",", ".")) || 0, [payrollAmountStr]);
  const taxAmount = useMemo(() => parseFloat(taxAmountStr.replace(",", ".")) || 0, [taxAmountStr]);
  const fxAmount = useMemo(() => parseFloat(fxAmountStr.replace(",", ".")) || 0, [fxAmountStr]);
  const refundAmount = useMemo(() => parseFloat(refundAmountStr.replace(",", ".")) || 0, [refundAmountStr]);
  const [availabilityStatus, setAvailabilityStatus] = useState<string>("PENDIENTE");
  const isPositionClosed = availabilityStatus === "APROBADO";
  const [historyAvailabilities, setHistoryAvailabilities] = useState<DailyAvailability[]>([]);
  const [isHistoryOpen, setIsHistoryOpen] = useState(false);
  const historyRef = useRef<HTMLDivElement>(null);

  const [quotaError, setQuotaError] = useState<{
    message: string;
    minRequired: number;
    committed: number;
    activeCount: number;
  } | null>(null);
  const [rateError, setRateError] = useState<{
    message: string;
    currentRate: number;
    activeCount: number;
  } | null>(null);

  const [selectedCompanyFilter, setSelectedCompanyFilter] = useState<string>(initialCompanyId || "ALL");
  const [selectedBankFilter, setSelectedBankFilter] = useState<string>("ALL");
  const [selectedCurrencyFilter, setSelectedCurrencyFilter] = useState<string>("ALL");
  const [searchAccount, setSearchAccount] = useState<string>("");

  const activeAccounts = useMemo(() => {
    return accounts.filter((acc) => acc.is_active);
  }, [accounts]);

  const companyMap = useMemo(() => {
    const map = new Map<string, Company>();
    companies.forEach((c) => map.set(c.id, c));
    return map;
  }, [companies]);

  const availableBanks = useMemo(() => {
    const set = new Set<string>();
    activeAccounts.forEach((acc) => {
      if (acc.bank?.name) set.add(acc.bank.name);
    });
    return Array.from(set).sort();
  }, [activeAccounts]);

  const companyAccountCounts = useMemo(() => {
    const counts: Record<string, number> = {};
    activeAccounts.forEach((acc) => {
      counts[acc.company_id] = (counts[acc.company_id] || 0) + 1;
    });
    return counts;
  }, [activeAccounts]);

  const filteredAccounts = useMemo(() => {
    return activeAccounts.filter((acc) => {
      if (selectedCompanyFilter !== "ALL" && acc.company_id !== selectedCompanyFilter) {
        return false;
      }
      if (selectedBankFilter !== "ALL" && acc.bank?.name !== selectedBankFilter) {
        return false;
      }
      if (selectedCurrencyFilter !== "ALL" && acc.currency !== selectedCurrencyFilter) {
        return false;
      }
      if (searchAccount.trim()) {
        const query = searchAccount.toLowerCase().trim();
        const alias = (acc.account_alias || "").toLowerCase();
        const term = (acc.terminal_code || "").toLowerCase();
        const bankName = (acc.bank?.name || "").toLowerCase();
        const comp = companyMap.get(acc.company_id);
        const compName = (comp?.name || "").toLowerCase();
        const compCode = (comp?.code || "").toLowerCase();
        if (
          !alias.includes(query) &&
          !term.includes(query) &&
          !bankName.includes(query) &&
          !compName.includes(query) &&
          !compCode.includes(query)
        ) {
          return false;
        }
      }
      return true;
    });
  }, [activeAccounts, selectedCompanyFilter, selectedBankFilter, selectedCurrencyFilter, searchAccount, companyMap]);

  const visibleLoadedCount = useMemo(() => {
    return filteredAccounts.filter((acc) => loadedAccountIds.has(acc.id)).length;
  }, [filteredAccounts, loadedAccountIds]);

  const loadBalancesAndAvailability = async (date: string) => {
    setLoadingExisting(true);
    setQuotaError(null);
    setRateError(null);
    try {
      const posPromises = companies.map((c) =>
        fetchClient(`/api/v1/treasury/companies/${c.id}/position?date=${date}`)
          .then((r) => (r.ok ? r.json() : []))
          .catch(() => [])
      );

      const posResults = await Promise.all(posPromises);
      const allBalances = posResults.flat();

      const loadedSet = new Set<string>();
      const inputs: Record<string, string> = {};

      accounts.forEach((acc) => {
        const found = allBalances.find(
          (b: { bank_account_id: string }) => b.bank_account_id === acc.id
        );
        if (found) {
          loadedSet.add(acc.id);
          inputs[acc.id] = String(found.balance_amount);
        } else {
          inputs[acc.id] = String(acc.current_balance);
        }
      });

      setLoadedAccountIds(loadedSet);
      setBalanceInputs(inputs);

      const availRes = await fetchClient(`/api/v1/treasury/availabilities?date=${date}`);
      if (availRes.ok) {
        const raw = await availRes.json();
        const availData: DailyAvailability | null = Array.isArray(raw) ? raw[0] || null : raw;
        if (availData && availData.id) {
          setExchangeRateStr(String(availData.exchange_rate || 36.5));
          setSupplierAmountStr(String(availData.supplier_amount || 0));
          setPayrollAmountStr(String(availData.payroll_amount || 0));
          setTaxAmountStr(String(availData.tax_amount || 0));
          setFxAmountStr(String(availData.fx_amount || 0));
          setRefundAmountStr(String(availData.refund_amount || 0));
          setAvailabilityStatus(availData.status || "APROBADO");
        } else {
          try {
            const bcvRate = await getSpecificRate("Dolar", date);
            if (bcvRate && bcvRate.Valor > 0) {
              setExchangeRateStr(String(bcvRate.Valor));
            }
          } catch {
          }
          try {
            const euroRes = await getSpecificRate("Euro", date);
            if (euroRes && euroRes.Valor > 0) {
              setEuroRateStr(String(euroRes.Valor));
            }
          } catch {
          }
          setSupplierAmountStr("0");
          setPayrollAmountStr("0");
          setTaxAmountStr("0");
          setFxAmountStr("0");
          setRefundAmountStr("0");
          setAvailabilityStatus("PENDIENTE");
        }
      } else {
        try {
          const bcvRate = await getSpecificRate("Dolar", date);
          if (bcvRate && bcvRate.Valor > 0) {
            setExchangeRateStr(String(bcvRate.Valor));
          }
        } catch {
        }
        try {
          const euroRes = await getSpecificRate("Euro", date);
          if (euroRes && euroRes.Valor > 0) {
            setEuroRateStr(String(euroRes.Valor));
          }
        } catch {
        }
        setAvailabilityStatus("PENDIENTE");
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoadingExisting(false);
    }
  };

  useEffect(() => {
    if (!selectedDate) return;
    loadBalancesAndAvailability(selectedDate);
  }, [selectedDate, companies]);

  useEffect(() => {
    const now = new Date();
    const start = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().split("T")[0];
    const end = todayStr;

    fetchClient(`/api/v1/treasury/availabilities/history?start=${start}&end=${end}`)
      .then((r) => (r.ok ? r.json() : []))
      .then((data) => {
        if (Array.isArray(data)) {
          const uniqueByDate = new Map<string, DailyAvailability>();
          data.forEach((item: DailyAvailability) => {
            const d = item.availability_date.split("T")[0];
            if (!uniqueByDate.has(d)) {
              uniqueByDate.set(d, item);
            }
          });
          setHistoryAvailabilities(Array.from(uniqueByDate.values()));
        }
      })
      .catch(() => { });
  }, [todayStr]);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (historyRef.current && !historyRef.current.contains(event.target as Node)) {
        setIsHistoryOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleInputChange = (accountId: string, value: string) => {
    if (value === "" || /^[0-9]*[.,]?[0-9]*$/.test(value)) {
      setBalanceInputs((prev) => ({
        ...prev,
        [accountId]: value,
      }));
    }
  };

  const totalsByCurrency = useMemo(() => {
    const totals: Record<string, { current: number; next: number }> = {
      VES: { current: 0, next: 0 },
      USD: { current: 0, next: 0 },
      EUR: { current: 0, next: 0 },
    };

    activeAccounts.forEach((acc) => {
      const curr = acc.currency || "VES";
      if (!totals[curr]) {
        totals[curr] = { current: 0, next: 0 };
      }
      totals[curr].current += acc.current_balance;
      const parsedInput = parseFloat((balanceInputs[acc.id] || "").replace(",", ".")) || 0;
      totals[curr].next += parsedInput;
    });

    return totals;
  }, [activeAccounts, balanceInputs]);

  const formatVES = (val: number) => {
    return new Intl.NumberFormat("es-VE", {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(val);
  };

  const formatUSD = (val: number) => {
    return new Intl.NumberFormat("es-VE", {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(val);
  };

  const totalLiquidityVES = useMemo(() => {
    let sumVES = 0;
    activeAccounts.forEach((acc) => {
      const inputStr = balanceInputs[acc.id];
      const val = inputStr !== undefined ? parseFloat(inputStr.replace(",", ".")) || 0 : acc.current_balance;
      if (acc.currency === "VES") {
        sumVES += val;
      } else if (acc.currency === "USD") {
        sumVES += val * (exchangeRate || 1);
      } else if (acc.currency === "EUR") {
        const rate = euroRate > 0 ? euroRate : (exchangeRate || 1) * 1.08;
        sumVES += val * rate;
      }
    });
    return Math.round(sumVES * 100) / 100;
  }, [activeAccounts, balanceInputs, exchangeRate, euroRate]);

  const totalLiquidityUSD = useMemo(() => {
    if (!exchangeRate || exchangeRate <= 0) return 0;
    return Math.round((totalLiquidityVES / exchangeRate) * 100) / 100;
  }, [totalLiquidityVES, exchangeRate]);

  const totalCommittedVES = useMemo(() => {
    return (
      (supplierAmount || 0) +
      (payrollAmount || 0) +
      (taxAmount || 0) +
      (fxAmount || 0) +
      (refundAmount || 0)
    );
  }, [supplierAmount, payrollAmount, taxAmount, fxAmount, refundAmount]);

  const totalCommittedUSD = useMemo(() => {
    if (!exchangeRate || exchangeRate <= 0) return 0;
    return Math.round((totalCommittedVES / exchangeRate) * 100) / 100;
  }, [totalCommittedVES, exchangeRate]);

  const remainingAvailableVES = totalLiquidityVES - totalCommittedVES;
  const remainingAvailableUSD = totalLiquidityUSD - totalCommittedUSD;
  const isOverLimit = totalCommittedVES > totalLiquidityVES;
  const committedPercent =
    totalLiquidityVES > 0
      ? Math.min(100, Math.max(0, (totalCommittedVES / totalLiquidityVES) * 100))
      : 0;

  const handleSaveSingleAccount = async (accountId: string) => {
    if (!selectedDate) {
      toast.error("Seleccione una fecha válida");
      return;
    }
    const targetAccount = accounts.find((a) => a.id === accountId);
    if (!targetAccount) return;

    const rawVal = balanceInputs[accountId];
    const amount = rawVal !== undefined ? parseFloat(rawVal.replace(",", ".")) || 0 : targetAccount.current_balance;

    setSavingAccountId(accountId);
    try {
      const res = await fetchClient(`/api/v1/treasury/accounts/${accountId}/daily-balance`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          date: selectedDate,
          amount: amount,
        }),
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.message || "Error al registrar saldo de la cuenta");
      }

      toast.success(`Saldo registrado para ${targetAccount.account_alias || targetAccount.bank?.name || "cuenta"}`);
      setLoadedAccountIds((prev) => new Set([...prev, accountId]));
      await loadBalancesAndAvailability(selectedDate);
      onSaved();
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Error al registrar saldo");
    } finally {
      setSavingAccountId(null);
    }
  };

  const handleApproveAndSaveAvailability = async () => {
    if (!selectedDate) {
      toast.error("Seleccione una fecha de cierre válida");
      return;
    }
    if (isOverLimit) {
      toast.error("No se puede aprobar: El monto comprometido supera la liquidez total disponible");
      return;
    }

    setQuotaError(null);
    setRateError(null);
    setIsSubmitting(true);
    try {
      const items = activeAccounts.map((acc) => {
        const rawVal = balanceInputs[acc.id];
        const val = rawVal !== undefined ? parseFloat(rawVal.replace(",", ".")) || 0 : acc.current_balance;
        return {
          account_id: acc.id,
          amount: val,
        };
      });

      const balancesRes = await fetchClient("/api/v1/treasury/daily-balances/batch", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          date: selectedDate,
          items,
        }),
      });

      if (!balancesRes.ok) {
        const err = await balancesRes.json().catch(() => ({}));
        throw new Error(err.message || "Error al guardar saldos");
      }

      const availPayload = {
        availability_date: selectedDate,
        exchange_rate: exchangeRate,
        total_liquidity: totalLiquidityVES,
        supplier_amount: supplierAmount,
        payroll_amount: payrollAmount,
        tax_amount: taxAmount,
        fx_amount: fxAmount,
        refund_amount: refundAmount,
      };

      const availRes = await fetchClient("/api/v1/treasury/availabilities", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(availPayload),
      });

      if (!availRes.ok) {
        const errData = await availRes.json().catch(() => ({}));
        if (availRes.status === 422 || errData.code === "INSUFFICIENT_SUPPLIER_QUOTA") {
          setQuotaError({
            message: errData.message || "El cupo asignado no puede ser inferior a las propuestas activas.",
            minRequired: errData.min_required_amount || errData.committed_amount || 0,
            committed: errData.committed_amount || 0,
            activeCount: errData.active_proposals_count || 0,
          });
          toast.error(errData.message || "Cupo insuficiente para cubrir las propuestas activas.");
          return;
        }
        if (availRes.status === 409 || errData.code === "EXCHANGE_RATE_FROZEN") {
          setRateError({
            message: errData.message || "La tasa de cambio no puede modificarse mientras existan propuestas de pago abiertas.",
            currentRate: errData.current_exchange_rate || 0,
            activeCount: errData.active_proposals_count || 0,
          });
          toast.error(errData.message || "La tasa de cambio no puede modificarse mientras existan propuestas abiertas.");
          return;
        }
        if (availRes.status === 403) {
          toast.error(errData.message || "Acceso denegado: solo coordinadores pueden modificar esta posición.");
          return;
        }
        throw new Error(errData.message || "Error al aprobar disponibilidad");
      }

      toast.success("Posición y disponibilidad diaria aprobadas exitosamente para todas las empresas");
      setAvailabilityStatus("APROBADO");
      await loadBalancesAndAvailability(selectedDate);
      onSaved();
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Error al procesar aprobación");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="space-y-3">
      <div className="bg-white dark:bg-neutral-950 border border-neutral-200/80 dark:border-neutral-800 rounded-xl px-4 py-3 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-2.5">
          <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg border border-neutral-200/80 dark:border-neutral-800 bg-neutral-50 dark:bg-neutral-900 text-xs">
            <Calendar className="w-3.5 h-3.5 text-neutral-400 shrink-0" />
            <input
              type="date"
              value={selectedDate}
              onChange={(e) => setSelectedDate(e.target.value)}
              className="bg-transparent border-none text-xs font-mono font-medium text-neutral-800 dark:text-neutral-200 focus:outline-none cursor-pointer"
            />
          </div>

          <div className="relative" ref={historyRef}>
            <button
              type="button"
              onClick={() => setIsHistoryOpen(!isHistoryOpen)}
              className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-medium border border-neutral-200/80 dark:border-neutral-800 bg-white dark:bg-neutral-950 hover:bg-neutral-50 dark:hover:bg-neutral-900 text-neutral-600 dark:text-neutral-400 transition-colors cursor-pointer"
              title="Historial de cierres guardados este mes"
            >
              <History className="w-3.5 h-3.5 text-neutral-400" />
              <span>{historyAvailabilities.length} cierres</span>
              <ChevronDown className="w-3 h-3 text-neutral-400" />
            </button>

            {isHistoryOpen && (
              <div className="absolute top-full left-0 mt-1.5 z-40 w-64 bg-white dark:bg-neutral-950 border border-neutral-200 dark:border-neutral-800 rounded-xl shadow-lg p-1.5 max-h-56 overflow-y-auto">
                <div className="px-2 py-1 text-[10px] font-semibold uppercase tracking-wider text-neutral-400 border-b border-neutral-100 dark:border-neutral-800 mb-1">
                  Posiciones de este mes
                </div>
                {historyAvailabilities.length === 0 ? (
                  <p className="text-xs text-neutral-400 p-2.5 text-center">
                    No hay cierres guardados
                  </p>
                ) : (
                  historyAvailabilities.map((hist) => {
                    const dStr = hist.availability_date.split("T")[0];
                    const isSelected = selectedDate === dStr;
                    return (
                      <button
                        key={hist.id}
                        type="button"
                        onClick={() => {
                          setSelectedDate(dStr);
                          setIsHistoryOpen(false);
                        }}
                        className={`w-full text-left px-2.5 py-1.5 rounded-lg text-xs font-mono flex items-center justify-between hover:bg-neutral-50 dark:hover:bg-neutral-900 transition-colors cursor-pointer ${isSelected ? "bg-locatel-medio/10 text-locatel-oscuro dark:text-locatel-claro font-semibold" : "text-neutral-700 dark:text-neutral-300"
                          }`}
                      >
                        <span>{dStr}</span>
                        <span className={`text-[10px] px-1.5 py-0.2 rounded font-sans font-medium ${hist.status === "APROBADO"
                          ? "bg-emerald-50 text-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-300"
                          : "bg-amber-50 text-amber-700 dark:bg-amber-950/50 dark:text-amber-300"
                          }`}>
                          {hist.status}
                        </span>
                      </button>
                    );
                  })
                )}
              </div>
            )}
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">


          <div
            className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-medium border ${isPositionClosed
              ? "bg-locatel-medio/10 text-locatel-oscuro dark:text-locatel-claro border-locatel-medio/30"
              : "bg-amber-500/10 text-amber-700 dark:text-amber-400 border-amber-500/20"
              }`}
          >
            <span
              className={`w-1.5 h-1.5 rounded-full ${isPositionClosed ? "bg-locatel-medio" : "bg-amber-500"
                }`}
            />
            <span className="font-semibold text-[11px] tracking-wide">
              {isPositionClosed ? "APROBADO" : "PENDIENTE"}
            </span>
          </div>

          <div className="text-[11px] font-mono text-neutral-400 tabular-nums px-2 py-1 bg-neutral-50 dark:bg-neutral-900 rounded-lg border border-neutral-200/60 dark:border-neutral-800">
            {loadedAccountIds.size}/{activeAccounts.length} conc.
          </div>
        </div>
      </div>

      <div className="bg-neutral-50 dark:bg-neutral-900/60 border border-neutral-200/80 dark:border-neutral-800 rounded-xl p-3 grid grid-cols-1 md:grid-cols-3 divide-y md:divide-y-0 md:divide-x divide-neutral-200/60 dark:divide-neutral-800 shadow-xs">
        {Object.entries(totalsByCurrency).map(([curr, values]) => {
          const diff = values.next - values.current;
          const hasDiff = Math.abs(diff) > 0.001;
          const diffFormatted = formatVES(Math.abs(diff));
          const totalFormatted = formatVES(values.next);
          const totalInUSD = exchangeRate > 0 ? (curr === "VES" ? values.next / exchangeRate : values.next) : 0;
          const eurRateToUse = euroRate > 0 ? euroRate : (exchangeRate > 0 ? exchangeRate * 1.08 : 0);

          return (
            <div key={curr} className="px-3.5 py-1.5 first:pl-1 last:pr-1 flex flex-col justify-between">
              <div className="flex items-center justify-between gap-2">
                <span className="text-[10px] text-neutral-500 font-semibold uppercase tracking-wider">
                  {curr === "VES" ? "Bolívares (VES)" : curr === "USD" ? "Dólares (USD)" : "Euros (EUR)"}
                </span>
                {hasDiff && (
                  <span
                    className={`text-[10px] font-mono font-semibold tabular-nums px-1.5 py-0.2 rounded border ${diff > 0
                      ? "bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border-emerald-500/20"
                      : "bg-rose-500/10 text-rose-700 dark:text-rose-400 border-rose-500/20"
                      }`}
                    title="Variación respecto al saldo registrado"
                  >
                    {diff > 0 ? "+" : "-"}{diffFormatted}
                  </span>
                )}
              </div>

              <div className="mt-1 text-base lg:text-lg font-bold font-mono tracking-tight tabular-nums text-neutral-900 dark:text-neutral-100">
                {curr === "VES" ? "Bs. " : curr === "USD" ? "$ " : "€ "}
                {totalFormatted}
              </div>

              <div className="mt-0.5 text-xs text-neutral-400 font-mono tabular-nums">
                {curr === "VES" && <span>≈ $ {formatUSD(totalInUSD)} USD</span>}
                {curr === "USD" && <span>≈ Bs. {formatVES(exchangeRate > 0 ? values.next * exchangeRate : 0)}</span>}
                {curr === "EUR" && <span>≈ Bs. {formatVES(eurRateToUse > 0 ? values.next * eurRateToUse : 0)}</span>}
              </div>
            </div>
          );
        })}
      </div>

      <div className="bg-white dark:bg-neutral-950 border border-neutral-200/80 dark:border-neutral-800 rounded-xl p-3 shadow-xs space-y-2.5">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-2.5">
          <div className="flex flex-wrap items-center gap-2 flex-1">
            <div className="flex items-center gap-1.5 px-2.5 py-1.5 bg-neutral-50 dark:bg-neutral-900 rounded-lg border border-neutral-200/80 dark:border-neutral-800 text-xs min-w-44">
              <Building2 className="w-3.5 h-3.5 text-neutral-400 shrink-0" />
              <select
                value={selectedCompanyFilter}
                onChange={(e) => setSelectedCompanyFilter(e.target.value)}
                className="bg-transparent border-none text-xs font-medium text-neutral-800 dark:text-neutral-200 focus:outline-none cursor-pointer w-full pr-1"
              >
                <option value="ALL">Todas las Empresas ({activeAccounts.length})</option>
                {companies.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.code ? `${c.code} · ` : ""}{c.name} ({companyAccountCounts[c.id] || 0})
                  </option>
                ))}
              </select>
            </div>

            <div className="flex items-center gap-1.5 px-2.5 py-1.5 bg-neutral-50 dark:bg-neutral-900 rounded-lg border border-neutral-200/80 dark:border-neutral-800 text-xs min-w-40">
              <Filter className="w-3.5 h-3.5 text-neutral-400 shrink-0" />
              <select
                value={selectedBankFilter}
                onChange={(e) => setSelectedBankFilter(e.target.value)}
                className="bg-transparent border-none text-xs font-medium text-neutral-800 dark:text-neutral-200 focus:outline-none cursor-pointer w-full pr-1"
              >
                <option value="ALL">Todos los Bancos ({availableBanks.length})</option>
                {availableBanks.map((bank) => (
                  <option key={bank} value={bank}>
                    {bank}
                  </option>
                ))}
              </select>
            </div>

            <div className="inline-flex rounded-lg border border-neutral-200/80 dark:border-neutral-800 bg-neutral-50 dark:bg-neutral-900 p-0.5 text-xs">
              {(["ALL", "VES", "USD", "EUR"] as const).map((curr) => {
                const isActive = selectedCurrencyFilter === curr;
                return (
                  <button
                    key={curr}
                    type="button"
                    onClick={() => setSelectedCurrencyFilter(curr)}
                    className={`px-2.5 py-1 rounded-md text-[11px] font-mono font-medium transition-colors cursor-pointer ${isActive
                      ? "bg-white dark:bg-neutral-800 text-neutral-900 dark:text-neutral-100 font-bold shadow-2xs"
                      : "text-neutral-500 hover:text-neutral-800 dark:hover:text-neutral-200"
                      }`}
                  >
                    {curr === "ALL" ? "Todos" : curr}
                  </button>
                );
              })}
            </div>
          </div>

          <div className="flex items-center gap-2.5 shrink-0">
            <div className="relative w-full sm:w-64">
              <Search className="w-3.5 h-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-neutral-400" />
              <input
                type="text"
                value={searchAccount}
                onChange={(e) => setSearchAccount(e.target.value)}
                placeholder="Buscar por alias o terminal..."
                className="w-full pl-8 pr-3 py-1.5 border border-neutral-200/80 dark:border-neutral-800 bg-neutral-50 dark:bg-neutral-900 rounded-lg text-xs text-neutral-900 dark:text-neutral-100 placeholder:text-neutral-400 focus:bg-white dark:focus:bg-neutral-950 focus:outline-none focus:border-neutral-400 transition-colors"
              />
            </div>

            <span className="text-[11px] font-mono text-neutral-400 tabular-nums shrink-0 hidden sm:inline-block">
              {filteredAccounts.length} de {activeAccounts.length} cuentas ({visibleLoadedCount} conc.)
            </span>
          </div>
        </div>

        <div className="border border-neutral-200/80 dark:border-neutral-800 rounded-xl overflow-hidden bg-white dark:bg-neutral-950 shadow-2xs">
          {loadingExisting && (
            <div className="px-4 py-2 bg-locatel-medio/10 text-locatel-oscuro dark:text-locatel-claro text-xs flex items-center gap-2 border-b border-locatel-medio/20">
              <RefreshCw className="w-3.5 h-3.5 animate-spin text-locatel-medio" />
              <span className="font-medium">Consultando saldos y estados de carga para {selectedDate}...</span>
            </div>
          )}

          <div className="overflow-x-auto custom-scrollbar">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="border-b border-neutral-200/80 dark:border-neutral-800 bg-neutral-50/70 dark:bg-neutral-900/50 text-[11px] font-semibold text-neutral-500 uppercase tracking-wider">
                  <th className="py-2.5 px-3.5">
                    Empresa & Banco
                  </th>
                  <th className="py-2.5 px-3 text-center">
                    Terminal
                  </th>
                  <th className="py-2.5 px-2.5 text-center">
                    Moneda
                  </th>
                  <th className="py-2.5 px-3.5 text-right">
                    Saldo Actual Sistema
                  </th>
                  <th className="py-2.5 px-3.5 text-right w-44">
                    Nuevo Saldo Cierre
                  </th>
                  <th className="py-2.5 px-3.5 text-right">
                    Variación
                  </th>
                  <th className="py-2.5 px-3 text-center">
                    Estado
                  </th>
                  <th className="py-2.5 px-2.5 text-center">
                    Acción
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-neutral-100 dark:divide-neutral-900 text-xs">
                {filteredAccounts.length === 0 ? (
                  <tr>
                    <td
                      colSpan={8}
                      className="px-4 py-10 text-center text-neutral-400 dark:text-neutral-500"
                    >
                      No se encontraron cuentas bancarias con los filtros aplicados.
                    </td>
                  </tr>
                ) : (
                  filteredAccounts.map((account) => {
                    const company = companyMap.get(account.company_id);
                    const isLoaded = loadedAccountIds.has(account.id);
                    const currentVal = account.current_balance;
                    const inputValStr = balanceInputs[account.id] ?? String(currentVal);
                    const nextVal = parseFloat(inputValStr.replace(",", ".")) || 0;
                    const delta = nextVal - currentVal;

                    const currentFormatted = formatVES(currentVal);
                    const deltaFormatted = formatVES(delta);

                    const isInputDisabled = !canRecordBalances || (isPositionClosed
                      ? (!canApproveAvailability && !canOverrideBalances)
                      : (!canOverrideBalances && isLoaded));

                    return (
                      <tr
                        key={account.id}
                        className="hover:bg-neutral-50/80 dark:hover:bg-neutral-900/50 transition-colors"
                      >
                        <td className="py-2 px-3.5">
                          <div className="font-semibold text-xs text-neutral-900 dark:text-neutral-100 truncate max-w-52">
                            {company?.code ? `${company.code} · ` : ""}{company?.name || "Empresa"}
                          </div>
                          <div className="text-[11px] text-neutral-500 truncate max-w-52">
                            {account.bank?.name || "Banco"} {account.account_alias ? `· ${account.account_alias}` : ""}
                          </div>
                        </td>

                        <td className="py-2 px-3 text-center">
                          <span className="px-1.5 py-0.5 rounded text-[10px] font-mono border border-neutral-200/70 dark:border-neutral-800 bg-neutral-100 dark:bg-neutral-900 text-neutral-600 dark:text-neutral-400">
                            {account.terminal_code || "—"}
                          </span>
                        </td>

                        <td className="py-2 px-2.5 text-center">
                          <span className={`px-1.5 py-0.5 rounded text-[10px] font-bold font-mono ${account.currency === "USD"
                            ? "bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 border border-emerald-500/20"
                            : account.currency === "EUR"
                              ? "bg-purple-500/10 text-purple-700 dark:text-purple-300 border border-purple-500/20"
                              : "bg-neutral-200/50 dark:bg-neutral-800 text-neutral-700 dark:text-neutral-300"
                            }`}>
                            {account.currency}
                          </span>
                        </td>

                        <td className="py-2 px-3.5 text-right font-mono tabular-nums text-neutral-700 dark:text-neutral-300">
                          <span className="font-semibold block text-xs">
                            {currentFormatted} {account.currency === "VES" ? "Bs." : account.currency}
                          </span>
                          {account.currency === "VES" && exchangeRate > 0 && (
                            <span className="text-[10px] text-neutral-400 block">
                              ≈ $ {formatUSD(currentVal / exchangeRate)}
                            </span>
                          )}
                        </td>

                        <td className="py-2 px-3.5 text-right">
                          <div className="relative flex items-center">
                            <input
                              type="text"
                              inputMode="decimal"
                              autoComplete="off"
                              disabled={isInputDisabled}
                              value={inputValStr}
                              onChange={(e) =>
                                handleInputChange(account.id, e.target.value)
                              }
                              title={
                                isPositionClosed && !canApproveAvailability && !canOverrideBalances
                                  ? "Bloqueado: La posición diaria para esta fecha ya fue aprobada y cerrada."
                                  : isPositionClosed && (canApproveAvailability || canOverrideBalances)
                                    ? "Modo edición de coordinador habilitada."
                                    : isLoaded && !canOverrideBalances
                                      ? "Bloqueado con candado: Saldo ya registrado por el analista. Solo el coordinador puede modificarlo."
                                      : ""
                              }
                              className={`h-8 w-full text-right ${isInputDisabled ? "pl-7" : "px-2.5"} font-mono text-xs font-semibold rounded-md border text-neutral-900 dark:text-neutral-100 tabular-nums transition-colors focus:bg-white dark:focus:bg-neutral-900 focus:outline-none focus:border-neutral-400 dark:focus:border-neutral-600 focus:ring-1 focus:ring-neutral-400 ${isInputDisabled
                                ? "bg-neutral-100 dark:bg-neutral-900 border-neutral-200 dark:border-neutral-800 cursor-not-allowed opacity-75"
                                : "bg-neutral-50 dark:bg-neutral-900/50 border-neutral-200 dark:border-neutral-800"
                                }`}
                            />
                            {isInputDisabled && (
                              <div className="absolute left-2.5 top-1/2 -translate-y-1/2 pointer-events-none text-neutral-400">
                                <Lock className="w-3.5 h-3.5" />
                              </div>
                            )}
                          </div>
                        </td>

                        <td className="py-2 px-3.5 text-right font-mono tabular-nums">
                          <span
                            className={`font-semibold text-xs block ${delta > 0
                              ? "text-emerald-600 dark:text-emerald-400"
                              : delta < 0
                                ? "text-rose-600 dark:text-rose-400"
                                : "text-neutral-400"
                              }`}
                          >
                            {delta > 0 ? "+" : ""}
                            {deltaFormatted}
                          </span>
                          {account.currency === "VES" && exchangeRate > 0 && Math.abs(delta) > 0.001 && (
                            <span className="text-[10px] text-neutral-400 block">
                              {delta > 0 ? "+" : ""}≈ $ {formatUSD(delta / exchangeRate)}
                            </span>
                          )}
                        </td>

                        <td className="py-2 px-3 text-center">
                          {isLoaded ? (
                            <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[10px] font-medium bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border border-emerald-500/20">
                              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                              Conciliado
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[10px] font-medium bg-amber-500/10 text-amber-700 dark:text-amber-400 border border-amber-500/20">
                              <span className="w-1.5 h-1.5 rounded-full bg-amber-500" />
                              Pendiente
                            </span>
                          )}
                        </td>

                        <td className="py-2 px-2.5 text-center">
                          {!canRecordBalances ? (
                            <span className="inline-flex items-center gap-1 px-2 py-1 rounded-md text-[11px] font-medium text-neutral-400 bg-neutral-100 dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800">
                              <Lock className="w-3 h-3 text-neutral-400" />
                              <span>Lectura</span>
                            </span>
                          ) : isPositionClosed && !canApproveAvailability && !canOverrideBalances ? (
                            <span className="inline-flex items-center gap-1 px-2 py-1 rounded-md text-[11px] font-medium text-neutral-400 bg-neutral-100 dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800">
                              <Lock className="w-3 h-3 text-neutral-400" />
                              <span>Cerrado</span>
                            </span>
                          ) : !canOverrideBalances && isLoaded ? (
                            <span className="inline-flex items-center gap-1 px-2 py-1 rounded-md text-[11px] font-medium text-neutral-400 bg-neutral-100 dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800">
                              <Lock className="w-3 h-3 text-neutral-400" />
                              <span>Fijado</span>
                            </span>
                          ) : (
                            <button
                              type="button"
                              onClick={() => handleSaveSingleAccount(account.id)}
                              disabled={savingAccountId === account.id}
                              className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-md text-[11px] font-semibold transition-colors cursor-pointer disabled:opacity-50 ${isLoaded
                                ? "border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-900 hover:bg-neutral-100 dark:hover:bg-neutral-800 text-neutral-700 dark:text-neutral-200 shadow-2xs"
                                : "bg-locatel-medio hover:bg-locatel-oscuro text-white shadow-2xs"
                                }`}
                              title={isLoaded ? "Modificar saldo de esta cuenta (Coordinador)" : "Guardar saldo para esta cuenta"}
                            >
                              {savingAccountId === account.id ? (
                                <RefreshCw className="w-3 h-3 animate-spin" />
                              ) : (
                                <Save className={`w-3 h-3 ${isLoaded ? "text-locatel-medio" : ""}`} />
                              )}
                              <span>{isLoaded ? "Modificar" : "Guardar"}</span>
                            </button>
                          )}
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {canApproveAvailability && (
        <div className="bg-white dark:bg-neutral-950 rounded-xl border border-neutral-200/80 dark:border-neutral-800 shadow-sm p-4 space-y-4">
          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3 pb-3 border-b border-neutral-100 dark:border-neutral-900">
            <div className="flex items-center gap-3">
              <div className="flex items-center gap-2">
                <ShieldCheck className="w-4 h-4 text-locatel-medio" />
                <h3 className="text-xs font-semibold text-neutral-900 dark:text-neutral-100 uppercase tracking-wider">
                  Distribución de Liquidez y Posición
                </h3>
              </div>

              <div className="flex items-center gap-1.5 pl-3 border-l border-neutral-200 dark:border-neutral-800">
                <span className="text-[11px] font-semibold text-neutral-400">Tasa BCV:</span>
                <div className="relative w-28">
                  <span className="absolute left-2 top-1/2 -translate-y-1/2 text-[10px] font-semibold text-neutral-400">
                    Bs.
                  </span>
                  <input
                    type="text"
                    inputMode="decimal"
                    autoComplete="off"
                    disabled={isPositionClosed && !canApproveAvailability}
                    value={exchangeRateStr}
                    onChange={(e) => {
                      const val = e.target.value;
                      if (val === "" || /^[0-9]*[.,]?[0-9]*$/.test(val)) {
                        setExchangeRateStr(val);
                        setRateError(null);
                      }
                    }}
                    className={`h-7 w-full pl-7 pr-2 text-xs font-mono font-semibold tabular-nums rounded-md border ${rateError
                      ? "bg-rose-50 dark:bg-rose-950/40 border-rose-500 text-rose-900 dark:text-rose-200 ring-1 ring-rose-500"
                      : "bg-neutral-50 dark:bg-neutral-900 border-neutral-200 dark:border-neutral-800 text-neutral-900 dark:text-neutral-100 focus:bg-white focus:border-neutral-400"
                      } focus:outline-none disabled:opacity-60`}
                  />
                </div>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-4 text-xs font-mono tabular-nums">
              <div className="flex items-baseline gap-1.5">
                <span className="text-[11px] font-sans text-neutral-400">Liquidez:</span>
                <span className="font-bold text-neutral-900 dark:text-neutral-100">
                  Bs. {formatVES(totalLiquidityVES)}
                </span>
                <span className="text-[11px] text-neutral-400">
                  (${formatUSD(totalLiquidityUSD)})
                </span>
              </div>

              <div className="flex items-baseline gap-1.5">
                <span className="text-[11px] font-sans text-neutral-400">Comprometido:</span>
                <span className="font-bold text-neutral-900 dark:text-neutral-100">
                  Bs. {formatVES(totalCommittedVES)}
                </span>
                <span className="text-[11px] text-neutral-400">
                  (${formatUSD(totalCommittedUSD)})
                </span>
              </div>

              <div className="flex items-baseline gap-1.5">
                <span className="text-[11px] font-sans text-neutral-400">Sin Asignar:</span>
                <span
                  className={`font-bold ${isOverLimit ? "text-rose-600 dark:text-rose-400" : "text-locatel-oscuro dark:text-locatel-claro"
                    }`}
                >
                  Bs. {formatVES(remainingAvailableVES)}
                </span>
                <span
                  className={`text-[11px] ${isOverLimit ? "text-rose-400" : "text-neutral-400"
                    }`}
                >
                  (${formatUSD(remainingAvailableUSD)})
                </span>
              </div>
            </div>
          </div>

          <div className="w-full h-1 rounded-full bg-neutral-100 dark:bg-neutral-900 overflow-hidden">
            <div
              style={{ width: `${committedPercent}%` }}
              className={`h-full transition-all duration-300 rounded-full ${isOverLimit ? "bg-rose-500" : "bg-locatel-medio"
                }`}
            />
          </div>

          {isOverLimit && (
            <div className="flex items-center gap-2 p-2.5 rounded-lg bg-rose-50 dark:bg-rose-950/40 border border-rose-200/80 dark:border-rose-900/60 text-rose-700 dark:text-rose-400 text-xs">
              <AlertTriangle className="w-4 h-4 shrink-0" />
              <span className="font-medium text-xs">
                Sobregiro: El monto comprometido (Bs. {formatVES(totalCommittedVES)}) supera la liquidez total (Bs. {formatVES(totalLiquidityVES)}).
              </span>
            </div>
          )}

          {rateError && (
            <div className="flex items-center gap-2.5 p-3 rounded-lg bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800 text-amber-900 dark:text-amber-200 text-xs animate-in fade-in">
              <AlertTriangle className="w-4 h-4 shrink-0 text-amber-600 dark:text-amber-400 animate-pulse" />
              <div>
                <span className="font-semibold block">Tasa de Cambio Congelada:</span>
                <span>
                  {rateError.message} (Hay {rateError.activeCount} propuesta(s) de pago activa(s). Tasa fijada en base de datos: Bs. {formatVES(rateError.currentRate)}).
                </span>
              </div>
            </div>
          )}

          {quotaError && (
            <div className="flex items-center gap-2.5 p-3 rounded-lg bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800 text-rose-900 dark:text-rose-200 text-xs animate-in fade-in">
              <AlertCircle className="w-4 h-4 shrink-0 text-rose-600 dark:text-rose-400 animate-pulse" />
              <div>
                <span className="font-semibold block">Cupo de Proveedores Insuficiente:</span>
                <span>
                  {quotaError.message} El cupo mínimo requerido es de Bs. {formatVES(quotaError.minRequired)} para respaldar las {quotaError.activeCount} propuesta(s) activas.
                </span>
              </div>
            </div>
          )}

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
            <div className="space-y-1">
              <div className="flex items-center justify-between text-xs">
                <label className="font-semibold text-neutral-700 dark:text-neutral-300">
                  Proveedores
                </label>
                <span className="text-[10px] font-mono tabular-nums text-neutral-400">
                  ≈ ${formatUSD(exchangeRate > 0 ? supplierAmount / exchangeRate : 0)}
                </span>
              </div>
              <div className="relative">
                <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-xs font-semibold text-neutral-400">
                  Bs.
                </span>
                <input
                  type="text"
                  inputMode="decimal"
                  autoComplete="off"
                  disabled={isPositionClosed && !canApproveAvailability}
                  value={supplierAmountStr}
                  onChange={(e) => {
                    const val = e.target.value;
                    if (val === "" || /^[0-9]*[.,]?[0-9]*$/.test(val)) {
                      setSupplierAmountStr(val);
                      setQuotaError(null);
                    }
                  }}
                  className={`h-8 w-full pl-8 pr-2.5 text-xs font-mono font-semibold tabular-nums rounded-md border ${quotaError
                    ? "bg-rose-50 dark:bg-rose-950/40 border-rose-500 text-rose-900 dark:text-rose-200 ring-1 ring-rose-500"
                    : "bg-neutral-50 dark:bg-neutral-900/50 border-neutral-200 dark:border-neutral-800 text-neutral-900 dark:text-neutral-100 focus:bg-white dark:focus:bg-neutral-900 focus:border-neutral-400"
                    } focus:outline-none disabled:opacity-60`}
                />
              </div>
              {quotaError && (
                <div className="text-[10px] font-semibold text-rose-600 dark:text-rose-400 leading-tight">
                  Mínimo: Bs. {formatVES(quotaError.minRequired)} ({quotaError.activeCount} activas)
                </div>
              )}
            </div>

            <div className="space-y-1">
              <div className="flex items-center justify-between text-xs">
                <label className="font-semibold text-neutral-700 dark:text-neutral-300">
                  Nómina
                </label>
                <span className="text-[10px] font-mono tabular-nums text-neutral-400">
                  ≈ ${formatUSD(exchangeRate > 0 ? payrollAmount / exchangeRate : 0)}
                </span>
              </div>
              <div className="relative">
                <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-xs font-semibold text-neutral-400">
                  Bs.
                </span>
                <input
                  type="text"
                  inputMode="decimal"
                  autoComplete="off"
                  disabled={isPositionClosed && !canApproveAvailability}
                  value={payrollAmountStr}
                  onChange={(e) => {
                    const val = e.target.value;
                    if (val === "" || /^[0-9]*[.,]?[0-9]*$/.test(val)) {
                      setPayrollAmountStr(val);
                    }
                  }}
                  className="h-8 w-full pl-8 pr-2.5 text-xs font-mono font-semibold tabular-nums rounded-md bg-neutral-50 dark:bg-neutral-900/50 border border-neutral-200 dark:border-neutral-800 text-neutral-900 dark:text-neutral-100 focus:bg-white dark:focus:bg-neutral-900 focus:border-neutral-400 focus:outline-none disabled:opacity-60"
                />
              </div>
            </div>

            <div className="space-y-1">
              <div className="flex items-center justify-between text-xs">
                <label className="font-semibold text-neutral-700 dark:text-neutral-300">
                  Impuestos
                </label>
                <span className="text-[10px] font-mono tabular-nums text-neutral-400">
                  ≈ ${formatUSD(exchangeRate > 0 ? taxAmount / exchangeRate : 0)}
                </span>
              </div>
              <div className="relative">
                <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-xs font-semibold text-neutral-400">
                  Bs.
                </span>
                <input
                  type="text"
                  inputMode="decimal"
                  autoComplete="off"
                  disabled={isPositionClosed && !canApproveAvailability}
                  value={taxAmountStr}
                  onChange={(e) => {
                    const val = e.target.value;
                    if (val === "" || /^[0-9]*[.,]?[0-9]*$/.test(val)) {
                      setTaxAmountStr(val);
                    }
                  }}
                  className="h-8 w-full pl-8 pr-2.5 text-xs font-mono font-semibold tabular-nums rounded-md bg-neutral-50 dark:bg-neutral-900/50 border border-neutral-200 dark:border-neutral-800 text-neutral-900 dark:text-neutral-100 focus:bg-white dark:focus:bg-neutral-900 focus:border-neutral-400 focus:outline-none disabled:opacity-60"
                />
              </div>
            </div>

            <div className="space-y-1">
              <div className="flex items-center justify-between text-xs">
                <label className="font-semibold text-neutral-700 dark:text-neutral-300">
                  Divisas
                </label>
                <span className="text-[10px] font-mono tabular-nums text-neutral-400">
                  ≈ ${formatUSD(exchangeRate > 0 ? fxAmount / exchangeRate : 0)}
                </span>
              </div>
              <div className="relative">
                <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-xs font-semibold text-neutral-400">
                  Bs.
                </span>
                <input
                  type="text"
                  inputMode="decimal"
                  autoComplete="off"
                  disabled={isPositionClosed && !canApproveAvailability}
                  value={fxAmountStr}
                  onChange={(e) => {
                    const val = e.target.value;
                    if (val === "" || /^[0-9]*[.,]?[0-9]*$/.test(val)) {
                      setFxAmountStr(val);
                    }
                  }}
                  className="h-8 w-full pl-8 pr-2.5 text-xs font-mono font-semibold tabular-nums rounded-md bg-neutral-50 dark:bg-neutral-900/50 border border-neutral-200 dark:border-neutral-800 text-neutral-900 dark:text-neutral-100 focus:bg-white dark:focus:bg-neutral-900 focus:border-neutral-400 focus:outline-none disabled:opacity-60"
                />
              </div>
            </div>

            <div className="space-y-1">
              <div className="flex items-center justify-between text-xs">
                <label className="font-semibold text-neutral-700 dark:text-neutral-300">
                  Reembolsos
                </label>
                <span className="text-[10px] font-mono tabular-nums text-neutral-400">
                  ≈ ${formatUSD(exchangeRate > 0 ? refundAmount / exchangeRate : 0)}
                </span>
              </div>
              <div className="relative">
                <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-xs font-semibold text-neutral-400">
                  Bs.
                </span>
                <input
                  type="text"
                  inputMode="decimal"
                  autoComplete="off"
                  disabled={isPositionClosed && !canApproveAvailability}
                  value={refundAmountStr}
                  onChange={(e) => {
                    const val = e.target.value;
                    if (val === "" || /^[0-9]*[.,]?[0-9]*$/.test(val)) {
                      setRefundAmountStr(val);
                    }
                  }}
                  className="h-8 w-full pl-8 pr-2.5 text-xs font-mono font-semibold tabular-nums rounded-md bg-neutral-50 dark:bg-neutral-900/50 border border-neutral-200 dark:border-neutral-800 text-neutral-900 dark:text-neutral-100 focus:bg-white dark:focus:bg-neutral-900 focus:border-neutral-400 focus:outline-none disabled:opacity-60"
                />
              </div>
            </div>
          </div>

          <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-3 border-t border-neutral-100 dark:border-neutral-900">
            <div className="flex-1">
              {isPositionClosed && canApproveAvailability ? (
                <div className="flex items-center gap-2 p-2 rounded-lg bg-amber-500/10 border border-amber-500/20 text-amber-800 dark:text-amber-300 text-xs">
                  <AlertCircle className="w-4 h-4 shrink-0 text-amber-600 dark:text-amber-400" />
                  <span className="font-medium text-xs">
                    Modo edición de posición aprobada: las modificaciones impactarán la disponibilidad de caja del día.
                  </span>
                </div>
              ) : (
                <span className="text-xs text-neutral-500 font-medium">
                  {loadedAccountIds.size} de {activeAccounts.length} cuentas conciliadas para la fecha seleccionada
                </span>
              )}
            </div>

            {isPositionClosed && !canApproveAvailability ? (
              <div className="flex items-center gap-2 px-5 py-2.5 rounded-lg bg-neutral-100 dark:bg-neutral-900 text-neutral-400 border border-neutral-200 dark:border-neutral-800 text-xs font-semibold">
                <Lock className="w-4 h-4" />
                <span>Posición Cerrada</span>
              </div>
            ) : (
              <button
                type="button"
                onClick={handleApproveAndSaveAvailability}
                disabled={isSubmitting || isOverLimit}
                className="w-full sm:w-auto bg-locatel-medio text-white dark:bg-locatel-claro/95 dark:text-text-white hover:opacity-90 px-6 py-2.5 rounded-lg text-xs font-semibold shadow-sm transition-all cursor-pointer disabled:opacity-50 flex items-center justify-center gap-2"
              >
                {isSubmitting ? (
                  <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                ) : (
                  <ShieldCheck className="w-3.5 h-3.5" />
                )}
                <span>
                  {isPositionClosed
                    ? "Actualizar Posición Aprobada"
                    : "Aprobar y Guardar Posición Diaria"}
                </span>
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
