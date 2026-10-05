"use client";

import { useEffect, useMemo, useState } from "react";
import {
  Calendar,
  Building2,
  Save,
  CheckCircle2,
  Clock,
  Lock,
  RefreshCw,
  AlertTriangle,
  History,
  ShieldCheck
} from "lucide-react";
import { toast } from "sonner";
import { fetchClient } from "@/lib/fetchClient";
import { BankAccount, Company, DailyAvailability, UserProfile } from "../types";

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

  const canOverrideBalances = userPermissions.has("treasury.balances.override");
  const canApproveAvailability = userPermissions.has("treasury.availability.approve");

  const [selectedDate, setSelectedDate] = useState<string>(initialDate || todayStr);
  const [selectedCompanyId, setSelectedCompanyId] = useState<string>(initialCompanyId || "all");

  useEffect(() => {
    if (initialDate) setSelectedDate(initialDate);
    if (initialCompanyId) setSelectedCompanyId(initialCompanyId);
  }, [initialDate, initialCompanyId]);
  const [balanceInputs, setBalanceInputs] = useState<Record<string, string>>({});
  const [loadedAccountIds, setLoadedAccountIds] = useState<Set<string>>(new Set());
  const [savingAccountId, setSavingAccountId] = useState<string | null>(null);
  const [loadingExisting, setLoadingExisting] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const [exchangeRateStr, setExchangeRateStr] = useState<string>("36.5");
  const [supplierAmountStr, setSupplierAmountStr] = useState<string>("0");
  const [payrollAmountStr, setPayrollAmountStr] = useState<string>("0");
  const [taxAmountStr, setTaxAmountStr] = useState<string>("0");
  const [fxAmountStr, setFxAmountStr] = useState<string>("0");
  const [refundAmountStr, setRefundAmountStr] = useState<string>("0");

  const exchangeRate = useMemo(() => parseFloat(exchangeRateStr.replace(",", ".")) || 0, [exchangeRateStr]);
  const supplierAmount = useMemo(() => parseFloat(supplierAmountStr.replace(",", ".")) || 0, [supplierAmountStr]);
  const payrollAmount = useMemo(() => parseFloat(payrollAmountStr.replace(",", ".")) || 0, [payrollAmountStr]);
  const taxAmount = useMemo(() => parseFloat(taxAmountStr.replace(",", ".")) || 0, [taxAmountStr]);
  const fxAmount = useMemo(() => parseFloat(fxAmountStr.replace(",", ".")) || 0, [fxAmountStr]);
  const refundAmount = useMemo(() => parseFloat(refundAmountStr.replace(",", ".")) || 0, [refundAmountStr]);
  const [availabilityStatus, setAvailabilityStatus] = useState<string>("PENDIENTE");
  const isPositionClosed = availabilityStatus === "APROBADO";
  const [historyAvailabilities, setHistoryAvailabilities] = useState<DailyAvailability[]>([]);
  const [isHistoryOpen, setIsHistoryOpen] = useState(false);

  const activeAccounts = useMemo(() => {
    return accounts.filter((acc) => {
      if (!acc.is_active) return false;
      if (selectedCompanyId === "all") return true;
      return acc.company_id === selectedCompanyId;
    });
  }, [accounts, selectedCompanyId]);

  const companyMap = useMemo(() => {
    const map = new Map<string, Company>();
    companies.forEach((c) => map.set(c.id, c));
    return map;
  }, [companies]);

  const loadBalancesAndAvailability = async (date: string, companyId: string) => {
    setLoadingExisting(true);
    try {
      const targetCompany = companyId === "all" && companies.length > 0 ? companies[0].id : companyId;

      const posPromises =
        companyId === "all"
          ? companies.map((c) =>
            fetchClient(`/api/v1/treasury/companies/${c.id}/position?date=${date}`)
              .then((r) => (r.ok ? r.json() : []))
              .catch(() => [])
          )
          : [
            fetchClient(`/api/v1/treasury/companies/${companyId}/position?date=${date}`)
              .then((r) => (r.ok ? r.json() : []))
              .catch(() => []),
          ];

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

      const availUrl =
        targetCompany && targetCompany !== "all"
          ? `/api/v1/treasury/companies/${targetCompany}/availability?date=${date}`
          : `/api/v1/treasury/availabilities/history?start=${date}&end=${date}`;

      const availRes = await fetchClient(availUrl);
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
          setSupplierAmountStr("0");
          setPayrollAmountStr("0");
          setTaxAmountStr("0");
          setFxAmountStr("0");
          setRefundAmountStr("0");
          setAvailabilityStatus("PENDIENTE");
        }
      } else {
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
    loadBalancesAndAvailability(selectedDate, selectedCompanyId);
  }, [selectedDate, selectedCompanyId]);

  useEffect(() => {
    const targetComp = selectedCompanyId === "all" ? (companies[0]?.id || "") : selectedCompanyId;
    if (!targetComp) return;

    const now = new Date();
    const start = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().split("T")[0];
    const end = todayStr;

    fetchClient(`/api/v1/treasury/companies/${targetComp}/availabilities/history?start=${start}&end=${end}`)
      .then((r) => (r.ok ? r.json() : []))
      .then((data) => {
        if (Array.isArray(data)) {
          setHistoryAvailabilities(data);
        }
      })
      .catch(() => { });
  }, [selectedCompanyId, companies, todayStr]);

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
        sumVES += val * 1.08 * (exchangeRate || 1);
      }
    });
    return Math.round(sumVES * 100) / 100;
  }, [activeAccounts, balanceInputs, exchangeRate]);

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
      await loadBalancesAndAvailability(selectedDate, selectedCompanyId);
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

    const targetCompanyId = selectedCompanyId === "all" ? (companies[0]?.id || "") : selectedCompanyId;
    if (!targetCompanyId) {
      toast.error("Seleccione una empresa para registrar la disponibilidad");
      return;
    }

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
        const err = await balancesRes.json();
        throw new Error(err.message || "Error al guardar saldos");
      }

      const availPayload = {
        company_id: targetCompanyId,
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
        const err = await availRes.json();
        throw new Error(err.message || "Error al aprobar disponibilidad");
      }

      toast.success("Posición y disponibilidad diaria aprobadas exitosamente");
      setAvailabilityStatus("APROBADO");
      await loadBalancesAndAvailability(selectedDate, selectedCompanyId);
      onSaved();
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Error al procesar aprobación");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="space-y-3.5">
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2.5 bg-white dark:bg-neutral-900 p-3 rounded-2xl border border-neutral-200 dark:border-neutral-800 shadow-xs">
        <div>
          <label className="text-xs font-semibold text-neutral-600 dark:text-neutral-300 mb-1.5 flex items-center gap-1.5">
            <Building2 className="w-4 h-4 text-locatel-medio" />
            Filtrar Empresa
          </label>
          <select
            value={selectedCompanyId}
            onChange={(e) => setSelectedCompanyId(e.target.value)}
            className="w-full px-3 py-2 text-xs rounded-xl bg-white dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 text-neutral-800 dark:text-neutral-200 focus:outline-none focus:ring-2 focus:ring-locatel-medio/30 cursor-pointer"
          >
            <option value="all">Todas las Empresas (Consolidado)</option>
            {companies.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name} ({c.code})
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="text-xs font-semibold text-neutral-600 dark:text-neutral-300 mb-1.5 flex items-center gap-1.5">
            <Calendar className="w-4 h-4 text-locatel-medio" />
            Fecha de Cierre
          </label>
          <input
            type="date"
            value={selectedDate}
            onChange={(e) => setSelectedDate(e.target.value)}
            className="w-full px-3 py-2 text-xs rounded-xl bg-white dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 text-neutral-800 dark:text-neutral-200 focus:outline-none focus:ring-2 focus:ring-locatel-medio/30 cursor-pointer"
          />
        </div>

        <div className="relative">
          <label className="text-xs font-semibold text-neutral-600 dark:text-neutral-300 mb-1.5 flex items-center gap-1.5">
            <History className="w-4 h-4 text-locatel-medio" />
            Historial de Posiciones
          </label>
          <button
            onClick={() => setIsHistoryOpen(!isHistoryOpen)}
            className="w-full px-3 py-2 text-xs rounded-xl bg-neutral-50 dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 text-neutral-700 dark:text-neutral-300 flex items-center justify-between cursor-pointer hover:bg-neutral-100 dark:hover:bg-neutral-700"
          >
            <span>{historyAvailabilities.length} cierres registrados</span>
            <span className="text-[10px] text-locatel-medio font-semibold">Consultar</span>
          </button>

          {isHistoryOpen && (
            <div className="absolute top-full left-0 right-0 mt-1 z-30 bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-700 rounded-xl shadow-lg p-2 max-h-56 overflow-y-auto">
              {historyAvailabilities.length === 0 ? (
                <p className="text-xs text-neutral-400 p-2 text-center">
                  No hay cierres históricos guardados este mes
                </p>
              ) : (
                historyAvailabilities.map((hist) => {
                  const dStr = hist.availability_date.split("T")[0];
                  return (
                    <button
                      key={hist.id}
                      onClick={() => {
                        setSelectedDate(dStr);
                        setIsHistoryOpen(false);
                      }}
                      className={`w-full text-left p-2 rounded-lg text-xs flex items-center justify-between hover:bg-neutral-100 dark:hover:bg-neutral-800 transition-colors ${selectedDate === dStr ? "bg-locatel-medio/10 text-locatel-medio font-bold" : "text-neutral-700 dark:text-neutral-300"
                        }`}
                    >
                      <span>{dStr}</span>
                      <span className="text-[10px] px-1.5 py-0.5 rounded bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300 font-semibold">
                        {hist.status}
                      </span>
                    </button>
                  );
                })
              )}
            </div>
          )}
        </div>

        <div className="flex items-center gap-2 pt-1 sm:pt-0">
          <div className="flex-1 p-2.5 rounded-xl bg-neutral-50 dark:bg-neutral-800/40 border border-neutral-200 dark:border-neutral-700">
            <span className="text-[10px] uppercase font-semibold text-neutral-400 block">
              Cuentas Cargadas
            </span>
            <span className="text-sm font-bold text-neutral-800 dark:text-neutral-100">
              {loadedAccountIds.size} de {activeAccounts.length}
            </span>
          </div>
          <div className="flex-1 p-2.5 rounded-xl bg-neutral-50 dark:bg-neutral-800/40 border border-neutral-200 dark:border-neutral-700">
            <span className="text-[10px] uppercase font-semibold text-neutral-400 block">
              Estado Posición
            </span>
            <span className={`text-xs font-semibold flex items-center gap-1 mt-0.5 ${availabilityStatus === "APROBADO" ? "text-emerald-600 dark:text-emerald-400" : "text-amber-500"
              }`}>
              <CheckCircle2 className="w-3.5 h-3.5" />
              {availabilityStatus}
            </span>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
        {Object.entries(totalsByCurrency).map(([curr, values]) => {
          const diff = values.next - values.current;
          const diffFormatted = formatVES(diff);
          const totalFormatted = formatVES(values.next);
          const diffInUSD = exchangeRate > 0 ? (curr === "VES" ? diff / exchangeRate : diff) : 0;
          const totalInUSD = exchangeRate > 0 ? (curr === "VES" ? values.next / exchangeRate : values.next) : 0;

          return (
            <div
              key={curr}
              className="bg-white dark:bg-neutral-900 p-3 rounded-xl border border-neutral-200 dark:border-neutral-800 shadow-xs"
            >
              <div className="flex items-center justify-between text-xs mb-1">
                <span className="font-bold text-neutral-500">{curr}</span>
                <div className="text-right">
                  <span
                    className={`text-[11px] font-semibold font-mono block ${diff > 0
                      ? "text-emerald-600 dark:text-emerald-400"
                      : diff < 0
                        ? "text-red-500"
                        : "text-neutral-400"
                      }`}
                  >
                    {diff > 0 ? "+" : ""}
                    {diffFormatted} {curr === "VES" ? "Bs." : curr}
                  </span>
                  {curr === "VES" && exchangeRate > 0 && (
                    <span className="text-[10px] font-mono text-neutral-400 block">
                      {diff > 0 ? "+" : ""}≈ $ {formatUSD(diffInUSD)} USD
                    </span>
                  )}
                </div>
              </div>
              <div className="text-base font-bold font-mono text-neutral-900 dark:text-neutral-100">
                {curr === "VES" ? "Bs." : ""} {totalFormatted} {curr !== "VES" ? curr : ""}
              </div>
              {curr === "VES" ? (
                <div className="text-[11px] font-mono font-semibold text-neutral-500 dark:text-neutral-400">
                  ≈ $ {formatUSD(totalInUSD)} USD
                </div>
              ) : (
                <div className="text-[11px] font-mono font-semibold text-neutral-500 dark:text-neutral-400">
                  ≈ Bs. {formatVES(exchangeRate > 0 ? values.next * exchangeRate : 0)}
                </div>
              )}
            </div>
          );
        })}
      </div>

      <div className="bg-white dark:bg-neutral-900 rounded-2xl border border-neutral-200 dark:border-neutral-800 shadow-xs overflow-hidden">
        {loadingExisting && (
          <div className="px-4 py-2 bg-locatel-medio/10 text-locatel-medio text-xs flex items-center gap-2 border-b border-locatel-medio/20">
            <RefreshCw className="w-3.5 h-3.5 animate-spin" />
            <span>Consultando saldos y estados de carga para {selectedDate}...</span>
          </div>
        )}

        <div className="overflow-x-auto custom-scrollbar">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="border-b border-neutral-200 dark:border-neutral-700 bg-neutral-50/80 dark:bg-neutral-800/60">
                <th className="px-3.5 py-2.5 font-bold text-neutral-800 dark:text-neutral-200 uppercase tracking-wider">
                  Empresa
                </th>
                <th className="px-3.5 py-2.5 font-bold text-neutral-800 dark:text-neutral-200 uppercase tracking-wider">
                  Banco & Alias
                </th>
                <th className="px-3 py-2.5 font-bold text-neutral-800 dark:text-neutral-200 uppercase tracking-wider">
                  Terminal
                </th>
                <th className="px-3 py-2.5 font-bold text-neutral-800 dark:text-neutral-200 uppercase tracking-wider">
                  Moneda
                </th>
                <th className="px-3.5 py-2.5 font-bold text-neutral-800 dark:text-neutral-200 uppercase tracking-wider text-right">
                  Saldo Actual Sistema
                </th>
                <th className="px-3.5 py-2.5 font-bold text-neutral-800 dark:text-neutral-200 uppercase tracking-wider text-right w-52">
                  Nuevo Saldo Cierre
                </th>
                <th className="px-3 py-2.5 font-bold text-neutral-800 dark:text-neutral-200 uppercase tracking-wider text-right">
                  Variación
                </th>
                <th className="px-3.5 py-2.5 font-bold text-neutral-800 dark:text-neutral-200 uppercase tracking-wider text-center">
                  Estado
                </th>
                <th className="px-3.5 py-2.5 font-bold text-neutral-800 dark:text-neutral-200 uppercase tracking-wider text-center">
                  Acción
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-neutral-200/80 dark:divide-neutral-800 text-xs">
              {activeAccounts.length === 0 ? (
                <tr>
                  <td
                    colSpan={9}
                    className="px-4 py-12 text-center text-neutral-400 dark:text-neutral-500"
                  >
                    No hay cuentas bancarias activas para el filtro seleccionado.
                  </td>
                </tr>
              ) : (
                activeAccounts.map((account) => {
                  const company = companyMap.get(account.company_id);
                  const isLoaded = loadedAccountIds.has(account.id);
                  const currentVal = account.current_balance;
                  const inputValStr = balanceInputs[account.id] ?? String(currentVal);
                  const nextVal = parseFloat(inputValStr.replace(",", ".")) || 0;
                  const delta = nextVal - currentVal;

                  const currentFormatted = new Intl.NumberFormat("es-VE", {
                    minimumFractionDigits: 2,
                    maximumFractionDigits: 2,
                  }).format(currentVal);

                  const deltaFormatted = new Intl.NumberFormat("es-VE", {
                    minimumFractionDigits: 2,
                    maximumFractionDigits: 2,
                  }).format(delta);

                  const isInputDisabled = (!canOverrideBalances && isLoaded) || isPositionClosed;

                  return (
                    <tr
                      key={account.id}
                      className="even:bg-neutral-50/30 dark:even:bg-neutral-800/20 hover:bg-neutral-50 dark:hover:bg-neutral-800/50 transition-colors"
                    >
                      <td className="px-3.5 py-2.5">
                        <div className="font-semibold text-neutral-900 dark:text-neutral-100 truncate max-w-44">
                          {company?.name || "Empresa"}
                        </div>
                        <div className="text-[10px] font-mono text-neutral-400">
                          {company?.code}
                        </div>
                      </td>

                      <td className="px-3.5 py-2.5">
                        <div className="font-semibold text-neutral-900 dark:text-neutral-100">
                          {account.bank?.name || "Banco"}
                        </div>
                        <div className="text-[11px] text-neutral-500">
                          {account.account_alias}
                        </div>
                      </td>

                      <td className="px-3.5 py-2.5">
                        <span className="px-2 py-0.5 rounded bg-neutral-100 dark:bg-neutral-800 font-mono text-[11px] text-neutral-700 dark:text-neutral-300 border border-neutral-200 dark:border-neutral-700">
                          {account.terminal_code}
                        </span>
                      </td>

                      <td className="px-3.5 py-2.5">
                        <span className={`px-2 py-0.5 rounded text-[10px] font-bold font-mono ${account.currency === "USD"
                          ? "bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300"
                          : account.currency === "EUR"
                            ? "bg-purple-100 text-purple-800 dark:bg-purple-950 dark:text-purple-300"
                            : "bg-neutral-100 text-neutral-700 dark:bg-neutral-800 dark:text-neutral-300"
                          }`}>
                          {account.currency}
                        </span>
                      </td>

                      <td className="px-3.5 py-2.5 text-right font-mono text-neutral-600 dark:text-neutral-400">
                        <span className="block font-semibold">
                          {currentFormatted} {account.currency === "VES" ? "Bs." : account.currency}
                        </span>
                        {account.currency === "VES" && exchangeRate > 0 && (
                          <span className="text-[10px] text-neutral-400 block">
                            ≈ $ {formatUSD(currentVal / exchangeRate)} USD
                          </span>
                        )}
                      </td>

                      <td className="px-3.5 py-2.5 text-right">
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
                              isPositionClosed
                                ? "Bloqueado: La posición diaria para esta fecha ya fue aprobada y cerrada."
                                : isInputDisabled
                                  ? "Bloqueado: Esta cuenta ya tiene saldo registrado para hoy."
                                  : ""
                            }
                            className={`w-full text-right px-3 py-1 font-mono font-semibold rounded-lg border text-neutral-900 dark:text-neutral-100 focus:outline-none focus:ring-1 focus:ring-locatel-medio transition-all text-xs ${isInputDisabled
                              ? "bg-neutral-100 dark:bg-neutral-800/60 border-neutral-300 dark:border-neutral-700 cursor-not-allowed opacity-75"
                              : "bg-white dark:bg-neutral-800 border-neutral-300 dark:border-neutral-600"
                              }`}
                          />
                          {isInputDisabled && (
                            <Lock className="w-3.5 h-3.5 text-neutral-400 absolute left-2 pointer-events-none" />
                          )}
                        </div>
                      </td>

                      <td className="px-3.5 py-2.5 text-right font-mono">
                        <span
                          className={`font-semibold block ${delta > 0
                            ? "text-emerald-600 dark:text-emerald-400"
                            : delta < 0
                              ? "text-red-500"
                              : "text-neutral-400"
                            }`}
                        >
                          {delta > 0 ? "+" : ""}
                          {deltaFormatted} {account.currency === "VES" ? "Bs." : account.currency}
                        </span>
                        {account.currency === "VES" && exchangeRate > 0 && (
                          <span className="text-[10px] text-neutral-400 block">
                            {delta > 0 ? "+" : ""}≈ $ {formatUSD(delta / exchangeRate)} USD
                          </span>
                        )}
                      </td>

                      <td className="px-3.5 py-2.5 text-center">
                        {isLoaded ? (
                          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-400 border border-emerald-300 dark:border-emerald-800">
                            <CheckCircle2 className="w-3 h-3 text-emerald-600 dark:text-emerald-400" />
                            Cargado
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-amber-50 text-amber-700 dark:bg-amber-950/40 dark:text-amber-400 border border-amber-200 dark:border-amber-800/60">
                            <Clock className="w-3 h-3 text-amber-500" />
                            Pendiente
                          </span>
                        )}
                      </td>

                      <td className="px-3.5 py-2.5 text-center">
                        {isPositionClosed ? (
                          <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-neutral-400 dark:text-neutral-500">
                            <Lock className="w-3.5 h-3.5" />
                            Cerrado
                          </span>
                        ) : !canOverrideBalances && isLoaded ? (
                          <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-neutral-400 dark:text-neutral-500">
                            <Lock className="w-3.5 h-3.5" />
                            Fijado
                          </span>
                        ) : (
                          <button
                            onClick={() => handleSaveSingleAccount(account.id)}
                            disabled={savingAccountId === account.id}
                            className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-xl text-xs font-semibold shadow-xs transition-colors cursor-pointer disabled:opacity-50 ${isLoaded
                              ? "border border-neutral-300 dark:border-neutral-600 bg-white dark:bg-neutral-800 hover:bg-neutral-100 dark:hover:bg-neutral-700 text-neutral-700 dark:text-neutral-200"
                              : "bg-locatel-medio hover:bg-locatel-oscuro text-white"
                              }`}
                            title={isLoaded ? "Modificar saldo de esta cuenta" : "Guardar saldo para esta cuenta"}
                          >
                            {savingAccountId === account.id ? (
                              <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                            ) : (
                              <Save className={`w-3.5 h-3.5 ${isLoaded ? "text-locatel-medio" : ""}`} />
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

      {canApproveAvailability && (
        <div className="bg-white dark:bg-neutral-900 rounded-2xl border border-neutral-200 dark:border-neutral-800 shadow-xs p-4 space-y-3">
          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <div className="flex items-center gap-2">
                <ShieldCheck className="w-4 h-4 text-locatel-medio" />
                <h3 className="text-sm font-bold text-neutral-900 dark:text-neutral-100">
                  Cierre y Distribución
                </h3>
              </div>
              <div className="flex items-center gap-1.5 pl-2 border-l border-neutral-200 dark:border-neutral-700">
                <span className="text-[11px] font-bold text-neutral-500">Tasa BCV:</span>
                <div className="relative w-28">
                  <span className="absolute left-2 top-1/2 -translate-y-1/2 text-[10px] font-bold text-neutral-400">
                    Bs.
                  </span>
                  <input
                    type="text"
                    inputMode="decimal"
                    autoComplete="off"
                    disabled={isPositionClosed}
                    value={exchangeRateStr}
                    onChange={(e) => {
                      const val = e.target.value;
                      if (val === "" || /^[0-9]*[.,]?[0-9]*$/.test(val)) {
                        setExchangeRateStr(val);
                      }
                    }}
                    className="w-full pl-7 pr-2 py-1 text-xs font-mono font-bold rounded-lg bg-neutral-50 dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 text-neutral-900 dark:text-neutral-100 focus:outline-none focus:ring-1 focus:ring-locatel-medio disabled:opacity-60"
                  />
                </div>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-4 text-xs font-mono">
              <div className="flex items-baseline gap-1.5">
                <span className="text-[11px] font-sans text-neutral-400">Liquidez:</span>
                <span className="font-bold text-neutral-900 dark:text-neutral-100">
                  Bs. {formatVES(totalLiquidityVES)}
                </span>
                <span className="text-[10px] text-neutral-400">
                  (${formatUSD(totalLiquidityUSD)})
                </span>
              </div>

              <div className="flex items-baseline gap-1.5">
                <span className="text-[11px] font-sans text-neutral-400">Comprometido:</span>
                <span className="font-bold text-neutral-900 dark:text-neutral-100">
                  Bs. {formatVES(totalCommittedVES)}
                </span>
                <span className="text-[10px] text-neutral-400">
                  (${formatUSD(totalCommittedUSD)})
                </span>
              </div>

              <div className="flex items-baseline gap-1.5">
                <span className="text-[11px] font-sans text-neutral-400">Sin Asignar:</span>
                <span
                  className={`font-bold ${isOverLimit ? "text-red-500" : "text-emerald-600 dark:text-emerald-400"
                    }`}
                >
                  Bs. {formatVES(remainingAvailableVES)}
                </span>
                <span
                  className={`text-[10px] ${isOverLimit ? "text-red-400" : "text-emerald-500/80"
                    }`}
                >
                  (${formatUSD(remainingAvailableUSD)})
                </span>
              </div>
            </div>
          </div>

          <div className="w-full h-1 rounded-full bg-neutral-100 dark:bg-neutral-800 overflow-hidden">
            <div
              style={{ width: `${committedPercent}%` }}
              className={`h-full transition-all duration-300 rounded-full ${isOverLimit
                ? "bg-red-500"
                : "bg-linear-to-r from-emerald-500 to-locatel-medio"
                }`}
            />
          </div>

          {isOverLimit && (
            <div className="flex items-center gap-2 p-2 rounded-lg bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-900/60 text-red-700 dark:text-red-400 text-xs">
              <AlertTriangle className="w-3.5 h-3.5 shrink-0" />
              <span className="font-semibold text-[11px]">
                Sobregiro: El monto comprometido (Bs. {formatVES(totalCommittedVES)}) supera la liquidez total (Bs. {formatVES(totalLiquidityVES)}).
              </span>
            </div>
          )}

          <div className="grid grid-cols-1 sm:grid-cols-5 gap-2.5">
            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="text-xs font-bold text-neutral-700 dark:text-neutral-300 truncate">
                  Proveedores
                </label>
                <span className="text-[10px] font-mono text-neutral-400">
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
                  disabled={isPositionClosed}
                  value={supplierAmountStr}
                  onChange={(e) => {
                    const val = e.target.value;
                    if (val === "" || /^[0-9]*[.,]?[0-9]*$/.test(val)) {
                      setSupplierAmountStr(val);
                    }
                  }}
                  className="w-full pl-8 pr-2.5 py-1 text-xs font-mono font-bold rounded-lg bg-neutral-50 dark:bg-neutral-800 border border-neutral-300 dark:border-neutral-700 text-neutral-900 dark:text-neutral-100 focus:outline-none focus:ring-1 focus:ring-locatel-medio disabled:opacity-60"
                />
              </div>
            </div>

            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="text-xs font-bold text-neutral-700 dark:text-neutral-300 truncate">
                  Nómina
                </label>
                <span className="text-[10px] font-mono text-neutral-400">
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
                  disabled={isPositionClosed}
                  value={payrollAmountStr}
                  onChange={(e) => {
                    const val = e.target.value;
                    if (val === "" || /^[0-9]*[.,]?[0-9]*$/.test(val)) {
                      setPayrollAmountStr(val);
                    }
                  }}
                  className="w-full pl-8 pr-2.5 py-1 text-xs font-mono font-bold rounded-lg bg-neutral-50 dark:bg-neutral-800 border border-neutral-300 dark:border-neutral-700 text-neutral-900 dark:text-neutral-100 focus:outline-none focus:ring-1 focus:ring-locatel-medio disabled:opacity-60"
                />
              </div>
            </div>

            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="text-xs font-bold text-neutral-700 dark:text-neutral-300 truncate">
                  Impuestos
                </label>
                <span className="text-[10px] font-mono text-neutral-400">
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
                  disabled={isPositionClosed}
                  value={taxAmountStr}
                  onChange={(e) => {
                    const val = e.target.value;
                    if (val === "" || /^[0-9]*[.,]?[0-9]*$/.test(val)) {
                      setTaxAmountStr(val);
                    }
                  }}
                  className="w-full pl-8 pr-2.5 py-1 text-xs font-mono font-bold rounded-lg bg-neutral-50 dark:bg-neutral-800 border border-neutral-300 dark:border-neutral-700 text-neutral-900 dark:text-neutral-100 focus:outline-none focus:ring-1 focus:ring-locatel-medio disabled:opacity-60"
                />
              </div>
            </div>

            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="text-xs font-bold text-neutral-700 dark:text-neutral-300 truncate">
                  Divisas
                </label>
                <span className="text-[10px] font-mono text-neutral-400">
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
                  disabled={isPositionClosed}
                  value={fxAmountStr}
                  onChange={(e) => {
                    const val = e.target.value;
                    if (val === "" || /^[0-9]*[.,]?[0-9]*$/.test(val)) {
                      setFxAmountStr(val);
                    }
                  }}
                  className="w-full pl-8 pr-2.5 py-1 text-xs font-mono font-bold rounded-lg bg-neutral-50 dark:bg-neutral-800 border border-neutral-300 dark:border-neutral-700 text-neutral-900 dark:text-neutral-100 focus:outline-none focus:ring-1 focus:ring-locatel-medio disabled:opacity-60"
                />
              </div>
            </div>

            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="text-xs font-bold text-neutral-700 dark:text-neutral-300 truncate">
                  Reembolsos
                </label>
                <span className="text-[10px] font-mono text-neutral-400">
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
                  disabled={isPositionClosed}
                  value={refundAmountStr}
                  onChange={(e) => {
                    const val = e.target.value;
                    if (val === "" || /^[0-9]*[.,]?[0-9]*$/.test(val)) {
                      setRefundAmountStr(val);
                    }
                  }}
                  className="w-full pl-8 pr-2.5 py-1 text-xs font-mono font-bold rounded-lg bg-neutral-50 dark:bg-neutral-800 border border-neutral-300 dark:border-neutral-700 text-neutral-900 dark:text-neutral-100 focus:outline-none focus:ring-1 focus:ring-locatel-medio disabled:opacity-60"
                />
              </div>
            </div>
          </div>

          <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-2 border-t border-neutral-100 dark:border-neutral-800">
            <div>
              {isPositionClosed ? (
                <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-800">
                  <Lock className="w-3.5 h-3.5" />
                  Posición Cerrada y Aprobada
                </span>
              ) : (
                <span className="text-xs text-neutral-500 font-medium">
                  {loadedAccountIds.size} de {activeAccounts.length} cuentas conciliadas
                </span>
              )}
            </div>

            {isPositionClosed ? (
              <button
                disabled
                className="w-full sm:w-auto flex items-center justify-center gap-2 px-6 py-2 rounded-xl bg-neutral-100 dark:bg-neutral-800 text-neutral-400 dark:text-neutral-500 text-xs sm:text-sm font-semibold border border-neutral-200 dark:border-neutral-700 cursor-not-allowed shadow-none"
              >
                <Lock className="w-4 h-4" />
                <span>Posición Cerrada</span>
              </button>
            ) : (
              <button
                onClick={handleApproveAndSaveAvailability}
                disabled={isSubmitting || isOverLimit}
                className="w-full sm:w-auto flex items-center justify-center gap-2 px-6 py-2 rounded-xl bg-locatel-medio hover:bg-locatel-oscuro text-white text-xs sm:text-sm font-bold shadow-xs hover:shadow-md transition-all cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isSubmitting ? (
                  <RefreshCw className="w-4 h-4 animate-spin" />
                ) : (
                  <ShieldCheck className="w-4 h-4" />
                )}
                <span>Aprobar y Guardar Posición Diaria</span>
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
