"use client";

import { useMemo, useState, useRef, useEffect } from "react";
import {
  ArrowDown,
  ArrowUp,
  ArrowUpDown,
  Building2,
  ChevronLeft,
  ChevronRight,
  Landmark,
  Plus,
  Search,
  SlidersHorizontal,
  X,
} from "lucide-react";
import { toast } from "sonner";
import { fetchClient } from "@/lib/fetchClient";
import { Bank, BankAccount, Company } from "../types";
import { useTreasury } from "../context";
import { companySchema, bankSchema, bankAccountSchema } from "@/schemas/treasury";
import { z } from "zod"
import { useFormState } from "@/hooks/useFormState";

interface AccountsTableProps {
  accounts: BankAccount[];
  companies: Company[];
  banks: Bank[];
  onAccountCreated: () => void;
  onCompanyCreated: () => void;
  onBankCreated: () => void;
}

type SortField = "bank" | "alias" | "terminal" | "currency" | "balance";
type SortDirection = "asc" | "desc";

const INITIAL_ACCOUNT = {
  company_id: "",
  bank_id: "",
  account_alias: "",
  account_number: "",
  terminal_code: "",
  currency: "VES",
  account_type: "CORRIENTE",
  initial_balance: "0",
};

const INITIAL_COMPANY = {
  code: "",
  name: "",
  rif: "",
};

const INITIAL_BANK = {
  code: "",
  name: "",
  is_cash: false,
};

export function AccountsTable({
  accounts,
  companies,
  banks,
  onAccountCreated,
  onCompanyCreated,
  onBankCreated,
}: AccountsTableProps) {
  const [selectedCompany, setSelectedCompany] = useState<string>("all");
  const [selectedBank, setSelectedBank] = useState<string>("all");
  const [selectedCurrency, setSelectedCurrency] = useState<string>("all");
  const [globalFilter, setGlobalFilter] = useState<string>("");
  const [sortField, setSortField] = useState<SortField | null>(null);
  const [sortDirection, setSortDirection] = useState<SortDirection>("asc");
  const [currentPage, setCurrentPage] = useState<number>(1);
  const pageSize = 10;

  const [isFilterOpen, setIsFilterOpen] = useState(false);
  const filterRef = useRef<HTMLDivElement>(null);

  const activeFilterCount = useMemo(() => {
    let count = 0;
    if (selectedCompany !== "all") count++;
    if (selectedBank !== "all") count++;
    if (selectedCurrency !== "all") count++;
    return count;
  }, [selectedCompany, selectedBank, selectedCurrency]);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (filterRef.current && !filterRef.current.contains(event.target as Node)) {
        setIsFilterOpen(false);
      }
    };
    if (isFilterOpen) {
      document.addEventListener("mousedown", handleClickOutside);
    }
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [isFilterOpen]);

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isCompanyModalOpen, setIsCompanyModalOpen] = useState(false);
  const [isBankModalOpen, setIsBankModalOpen] = useState(false);

  const accountForm = useFormState(INITIAL_ACCOUNT);
  const companyForm = useFormState(INITIAL_COMPANY);
  const bankForm = useFormState(INITIAL_BANK);

  const [isSubmitting, setIsSubmitting] = useState(false);
  const { user } = useTreasury();

  const canManageAccounts = useMemo(() => {
    if (!user) return false;
    const roles = (user.roles || []).map((r) => r.toUpperCase().trim());
    if (roles.includes("ADMIN") || roles.includes("ADMINISTRADOR")) return true;
    const perms = (user.permissions || []).map((p) => p.toLowerCase().trim());
    return perms.includes("treasury.accounts.manage");
  }, [user]);

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      if (sortDirection === "asc") {
        setSortDirection("desc");
      } else {
        setSortField(null);
        setSortDirection("asc");
      }
    } else {
      setSortField(field);
      setSortDirection("asc");
    }
  };

  const filteredAndSortedData = useMemo(() => {
    const result = accounts.filter((item) => {
      if (selectedCompany !== "all" && item.company_id !== selectedCompany) {
        return false;
      }
      if (selectedBank !== "all" && item.bank_id !== selectedBank) {
        return false;
      }
      if (selectedCurrency !== "all" && item.currency !== selectedCurrency) {
        return false;
      }
      if (globalFilter.trim()) {
        const query = globalFilter.toLowerCase();
        const alias = item.account_alias?.toLowerCase() || "";
        const num = item.account_number?.toLowerCase() || "";
        const terminal = item.terminal_code?.toLowerCase() || "";
        const bankName = item.bank?.name?.toLowerCase() || "";
        const companyName = item.company?.name?.toLowerCase() || "";
        return (
          alias.includes(query) ||
          num.includes(query) ||
          terminal.includes(query) ||
          bankName.includes(query) ||
          companyName.includes(query)
        );
      }
      return true;
    });

    if (sortField) {
      result.sort((a, b) => {
        let valA: string | number = "";
        let valB: string | number = "";

        if (sortField === "bank") {
          valA = a.bank?.name?.toLowerCase() || "";
          valB = b.bank?.name?.toLowerCase() || "";
        } else if (sortField === "alias") {
          valA = a.account_alias?.toLowerCase() || "";
          valB = b.account_alias?.toLowerCase() || "";
        } else if (sortField === "terminal") {
          valA = a.terminal_code?.toLowerCase() || "";
          valB = b.terminal_code?.toLowerCase() || "";
        } else if (sortField === "currency") {
          valA = a.currency?.toLowerCase() || "";
          valB = b.currency?.toLowerCase() || "";
        } else if (sortField === "balance") {
          valA = a.current_balance;
          valB = b.current_balance;
        }

        if (valA < valB) return sortDirection === "asc" ? -1 : 1;
        if (valA > valB) return sortDirection === "asc" ? 1 : -1;
        return 0;
      });
    }

    return result;
  }, [
    accounts,
    selectedCompany,
    selectedBank,
    selectedCurrency,
    globalFilter,
    sortField,
    sortDirection,
  ]);

  const totalPages = Math.max(
    1,
    Math.ceil(filteredAndSortedData.length / pageSize)
  );

  const paginatedData = useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    return filteredAndSortedData.slice(start, start + pageSize);
  }, [filteredAndSortedData, currentPage, pageSize]);

  const handleCreateAccount = async (e: React.FormEvent) => {
    e.preventDefault();
    accountForm.setErrors({});
    const selectedBankObj = banks.find((b) => b.id === accountForm.values.bank_id);
    const parsed = bankAccountSchema.safeParse({
      company_id: accountForm.values.company_id,
      bank_id: accountForm.values.bank_id,
      account_alias: accountForm.values.account_alias,
      account_number: accountForm.values.account_number,
      terminal_code: accountForm.values.terminal_code,
      currency: accountForm.values.currency,
      account_type: accountForm.values.account_type,
      is_cash: selectedBankObj?.is_cash ?? false,
    });
    if (!parsed.success) {
      const flattened = z.flattenError(parsed.error)
      accountForm.setErrors(flattened.fieldErrors);
      return;
    }
    setIsSubmitting(true);
    try {
      const res = await fetchClient("/api/v1/treasury/accounts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          company_id: parsed.data.company_id,
          bank_id: parsed.data.bank_id,
          account_alias: parsed.data.account_alias,
          account_number: parsed.data.account_number,
          terminal_code: parsed.data.terminal_code,
          currency: parsed.data.currency,
          account_type: parsed.data.account_type,
          initial_balance: parseFloat(accountForm.values.initial_balance.replace(",", ".")) || 0,
        }),
      });
      if (res && !res.ok) {
        const data = await res.json().catch(() => ({}));
        accountForm.setErrors(data);
        return;
      }
      toast.success("Cuenta bancaria creada exitosamente");
      setIsModalOpen(false);
      accountForm.reset();
      onAccountCreated();
    } catch (err: any) {
      const errObj = err?.data?.errors || err?.data;
      if (errObj && typeof errObj === "object" && Object.keys(errObj).length > 0) {
        accountForm.setErrors(errObj);
        return;
      }
      toast.error("No se pudo completar el registro. Intente nuevamente.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleCreateCompany = async (e: React.FormEvent) => {
    e.preventDefault();
    companyForm.setErrors({});
    const parsed = companySchema.safeParse(companyForm.values);

    if (!parsed.success) {
      const flattened = z.flattenError(parsed.error);
      companyForm.setErrors(flattened.fieldErrors);
      return;
    }
    setIsSubmitting(true);
    try {
      const res = await fetchClient("/api/v1/treasury/companies", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(companyForm.values),
      });

      if (res && !res.ok) {
        const data = await res.json().catch(() => ({}));
        companyForm.setErrors(data);
        return;
      }

      toast.success("Empresa creada exitosamente");
      setIsCompanyModalOpen(false);
      companyForm.reset();
      onCompanyCreated();
    } catch (err: any) {
      const errObj = err?.data?.errors || err?.data;
      if (errObj && typeof errObj === "object" && Object.keys(errObj).length > 0) {
        companyForm.setErrors(errObj);
        return;
      }
      toast.error("No se pudo completar el registro. Intente nuevamente.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleCreateBank = async (e: React.FormEvent) => {
    e.preventDefault();
    bankForm.setErrors({});
    const parsed = bankSchema.safeParse(bankForm.values);
    if (!parsed.success) {
      const flattened = z.flattenError(parsed.error);
      bankForm.setErrors(flattened.fieldErrors);
      return;
    }

    setIsSubmitting(true);
    try {
      const res = await fetchClient("/api/v1/treasury/banks", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(parsed.data),
      });

      if (res && !res.ok) {
        const data = await res.json().catch(() => ({}));
        bankForm.setErrors(data);
        return;
      }

      toast.success("Banco creado exitosamente");
      setIsBankModalOpen(false);
      bankForm.reset();
      onBankCreated();
    } catch (err: any) {
      const errObj = err?.data?.errors || err?.data;
      if (errObj && typeof errObj === "object" && Object.keys(errObj).length > 0) {
        bankForm.setErrors(errObj);
        return;
      }
      toast.error("No se pudo completar el registro. Intente nuevamente.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-2.5 bg-white dark:bg-neutral-900 p-2.5 sm:p-3 rounded-xl border border-neutral-200 dark:border-neutral-800 shadow-2xs">
        <div className="relative flex-1 min-w-60 max-w-md">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-neutral-400" />
          <input
            type="text"
            placeholder="Buscar por alias, terminal, banco..."
            value={globalFilter}
            onChange={(e) => {
              setGlobalFilter(e.target.value);
              setCurrentPage(1);
            }}
            className="w-full pl-9 pr-3 h-9 border border-neutral-300 dark:border-neutral-700 focus:border-locatel-medio focus:ring-2 focus:ring-locatel-medio/80 bg-neutral-50/50 dark:bg-neutral-950 rounded-lg text-xs text-neutral-900 dark:text-neutral-100 placeholder:text-neutral-400 focus:outline-none transition-all shadow-2xs"
          />
        </div>

        <div className="flex flex-wrap items-center gap-2 shrink-0">
          <div className="flex items-center gap-1.5 px-2.5 h-9 bg-neutral-50/50 dark:bg-neutral-950 rounded-lg border border-neutral-300 dark:border-neutral-700 text-xs shadow-2xs">
            <Building2 className="w-3.5 h-3.5 text-locatel-medio shrink-0" />
            <select
              value={selectedCompany}
              onChange={(e) => {
                setSelectedCompany(e.target.value);
                setCurrentPage(1);
              }}
              className="bg-transparent border-none text-xs font-semibold text-neutral-800 dark:text-neutral-200 focus:outline-none cursor-pointer max-w-44 truncate"
            >
              <option value="all">Todas las empresas</option>
              {companies.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.code ? `${c.code} · ${c.name}` : c.name}
                </option>
              ))}
            </select>
          </div>

          <div className="relative" ref={filterRef}>
            <button
              type="button"
              onClick={() => setIsFilterOpen(!isFilterOpen)}
              className={`h-9 px-3 rounded-lg border text-xs font-semibold inline-flex items-center gap-1.5 transition-colors cursor-pointer shadow-2xs ${activeFilterCount > 0
                ? "border-locatel-medio bg-locatel-medio text-white"
                : "border-neutral-300 dark:border-neutral-700 bg-white dark:bg-neutral-950 text-neutral-700 dark:text-neutral-300 hover:bg-neutral-50 dark:hover:bg-neutral-900"
                }`}
            >
              <SlidersHorizontal className="w-3.5 h-3.5" />
              <span>Filtros</span>
              {activeFilterCount > 0 && (
                <span className="w-4 h-4 rounded-full text-[10px] font-mono flex items-center justify-center bg-white text-locatel-oscuro font-bold">
                  {activeFilterCount}
                </span>
              )}
            </button>

            {isFilterOpen && (
              <div className="absolute right-0 top-full mt-1.5 w-80 p-3.5 rounded-xl border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-950 shadow-xl z-30 space-y-3 animate-in fade-in zoom-in-95 duration-100 text-xs">
                <div className="flex items-center justify-between pb-2 border-b border-neutral-100 dark:border-neutral-900">
                  <span className="font-semibold text-neutral-900 dark:text-neutral-100">
                    Filtros de cuentas
                  </span>
                  {activeFilterCount > 0 && (
                    <button
                      type="button"
                      onClick={() => {
                        setSelectedCompany("all");
                        setSelectedBank("all");
                        setSelectedCurrency("all");
                        setCurrentPage(1);
                      }}
                      className="text-[11px] text-locatel-medio hover:underline cursor-pointer font-medium"
                    >
                      Restablecer
                    </button>
                  )}
                </div>

                <div className="space-y-2.5">
                  <div>
                    <label className="block text-[11px] font-medium text-neutral-500 mb-1">
                      Empresa
                    </label>
                    <select
                      value={selectedCompany}
                      onChange={(e) => {
                        setSelectedCompany(e.target.value);
                        setCurrentPage(1);
                      }}
                      className="w-full px-2.5 py-1.5 bg-neutral-50 dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-lg text-xs text-neutral-800 dark:text-neutral-200 focus:outline-none focus:border-locatel-medio cursor-pointer truncate"
                    >
                      <option value="all">Todas las Empresas</option>
                      {companies.map((c) => (
                        <option key={c.id} value={c.id}>
                          {c.code ? `${c.code} · ${c.name}` : c.name}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-[11px] font-medium text-neutral-500 mb-1">
                      Banco
                    </label>
                    <select
                      value={selectedBank}
                      onChange={(e) => {
                        setSelectedBank(e.target.value);
                        setCurrentPage(1);
                      }}
                      className="w-full px-2.5 py-1.5 bg-neutral-50 dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-lg text-xs text-neutral-800 dark:text-neutral-200 focus:outline-none focus:border-locatel-medio cursor-pointer truncate"
                    >
                      <option value="all">Todos los Bancos</option>
                      {banks.map((b) => (
                        <option key={b.id} value={b.id}>
                          {b.name}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-[11px] font-medium text-neutral-500 mb-1">
                      Moneda
                    </label>
                    <select
                      value={selectedCurrency}
                      onChange={(e) => {
                        setSelectedCurrency(e.target.value);
                        setCurrentPage(1);
                      }}
                      className="w-full px-2.5 py-1.5 bg-neutral-50 dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-lg text-xs text-neutral-800 dark:text-neutral-200 focus:outline-none focus:border-locatel-medio cursor-pointer"
                    >
                      <option value="all">Todas las Monedas</option>
                      <option value="VES">VES (Bolívares)</option>
                      <option value="USD">USD (Dólares)</option>
                      <option value="EUR">EUR (Euros)</option>
                    </select>
                  </div>
                </div>

                <div className="pt-2 border-t border-neutral-100 dark:border-neutral-900 flex justify-end">
                  <button
                    type="button"
                    onClick={() => setIsFilterOpen(false)}
                    className="px-3 py-1 bg-locatel-medio text-white hover:bg-locatel-oscuro rounded-md text-xs font-medium cursor-pointer transition-colors"
                  >
                    Aplicar
                  </button>
                </div>
              </div>
            )}
          </div>

          {canManageAccounts && (
            <>
              <button
                type="button"
                onClick={() => setIsCompanyModalOpen(true)}
                className="h-9 px-3 text-xs font-medium border border-neutral-300 dark:border-neutral-700 bg-white dark:bg-neutral-950 hover:bg-neutral-50 dark:hover:bg-neutral-900 text-neutral-700 dark:text-neutral-200 rounded-lg transition-colors flex items-center gap-1.5 cursor-pointer shadow-2xs"
              >
                <Building2 className="w-3.5 h-3.5 text-neutral-500" />
                <span>+ Empresa</span>
              </button>

              <button
                type="button"
                onClick={() => setIsBankModalOpen(true)}
                className="h-9 px-3 text-xs font-medium border border-neutral-300 dark:border-neutral-700 bg-white dark:bg-neutral-950 hover:bg-neutral-50 dark:hover:bg-neutral-900 text-neutral-700 dark:text-neutral-200 rounded-lg transition-colors flex items-center gap-1.5 cursor-pointer shadow-2xs"
              >
                <Landmark className="w-3.5 h-3.5 text-neutral-500" />
                <span>+ Banco</span>
              </button>

              <button
                type="button"
                onClick={() => setIsModalOpen(true)}
                className="h-9 px-3.5 text-xs font-semibold bg-locatel-medio hover:bg-locatel-oscuro text-white rounded-lg transition-colors flex items-center gap-1.5 shadow-2xs cursor-pointer"
              >
                <Plus className="w-4 h-4" />
                <span>Nueva Cuenta</span>
              </button>
            </>
          )}
        </div>
      </div>

      <div className="bg-white dark:bg-neutral-900 rounded-2xl border border-neutral-200 dark:border-neutral-800 shadow-sm overflow-hidden">
        <div className="overflow-x-auto custom-scrollbar">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-neutral-200 dark:border-neutral-700 bg-neutral-50/80 dark:bg-neutral-800/60">
                <th className="px-4 py-3.5 text-xs font-bold text-neutral-800 dark:text-neutral-200">
                  <button
                    onClick={() => handleSort("bank")}
                    className="flex items-center gap-1.5 font-bold text-xs text-neutral-800 dark:text-neutral-200 uppercase tracking-wider cursor-pointer hover:text-locatel-medio dark:hover:text-emerald-400 transition-colors"
                  >
                    <span>Banco</span>
                    {sortField === "bank" ? (
                      sortDirection === "asc" ? (
                        <ArrowUp className="w-3.5 h-3.5 text-locatel-medio" />
                      ) : (
                        <ArrowDown className="w-3.5 h-3.5 text-locatel-medio" />
                      )
                    ) : (
                      <ArrowUpDown className="w-3.5 h-3.5 opacity-40" />
                    )}
                  </button>
                </th>

                <th className="px-4 py-3.5 text-xs font-bold text-neutral-800 dark:text-neutral-200">
                  <button
                    onClick={() => handleSort("alias")}
                    className="flex items-center gap-1.5 font-bold text-xs text-neutral-800 dark:text-neutral-200 uppercase tracking-wider cursor-pointer hover:text-locatel-medio dark:hover:text-emerald-400 transition-colors"
                  >
                    <span>Alias</span>
                    {sortField === "alias" ? (
                      sortDirection === "asc" ? (
                        <ArrowUp className="w-3.5 h-3.5 text-locatel-medio" />
                      ) : (
                        <ArrowDown className="w-3.5 h-3.5 text-locatel-medio" />
                      )
                    ) : (
                      <ArrowUpDown className="w-3.5 h-3.5 opacity-40" />
                    )}
                  </button>
                </th>

                <th className="px-4 py-3.5 text-xs font-bold text-neutral-800 dark:text-neutral-200">
                  <button
                    onClick={() => handleSort("terminal")}
                    className="flex items-center gap-1.5 font-bold text-xs text-neutral-800 dark:text-neutral-200 uppercase tracking-wider cursor-pointer hover:text-locatel-medio dark:hover:text-emerald-400 transition-colors"
                  >
                    <span>Terminal</span>
                    {sortField === "terminal" ? (
                      sortDirection === "asc" ? (
                        <ArrowUp className="w-3.5 h-3.5 text-locatel-medio" />
                      ) : (
                        <ArrowDown className="w-3.5 h-3.5 text-locatel-medio" />
                      )
                    ) : (
                      <ArrowUpDown className="w-3.5 h-3.5 opacity-40" />
                    )}
                  </button>
                </th>

                <th className="px-4 py-3.5 text-xs font-bold text-neutral-800 dark:text-neutral-200 uppercase tracking-wider">
                  Número de Cuenta
                </th>

                <th className="px-4 py-3.5 text-xs font-bold text-neutral-800 dark:text-neutral-200">
                  <button
                    onClick={() => handleSort("currency")}
                    className="flex items-center gap-1.5 font-bold text-xs text-neutral-800 dark:text-neutral-200 uppercase tracking-wider cursor-pointer hover:text-locatel-medio dark:hover:text-emerald-400 transition-colors"
                  >
                    <span>Moneda</span>
                    {sortField === "currency" ? (
                      sortDirection === "asc" ? (
                        <ArrowUp className="w-3.5 h-3.5 text-locatel-medio" />
                      ) : (
                        <ArrowDown className="w-3.5 h-3.5 text-locatel-medio" />
                      )
                    ) : (
                      <ArrowUpDown className="w-3.5 h-3.5 opacity-40" />
                    )}
                  </button>
                </th>

                <th className="px-4 py-3.5 text-xs font-bold text-neutral-800 dark:text-neutral-200 uppercase tracking-wider">
                  Tipo
                </th>

                <th className="px-4 py-3.5 text-xs font-bold text-neutral-800 dark:text-neutral-200">
                  <button
                    onClick={() => handleSort("balance")}
                    className="flex items-center justify-end w-full gap-1.5 font-bold text-xs text-neutral-800 dark:text-neutral-200 uppercase tracking-wider cursor-pointer hover:text-locatel-medio dark:hover:text-emerald-400 transition-colors"
                  >
                    <span>Saldo Actual</span>
                    {sortField === "balance" ? (
                      sortDirection === "asc" ? (
                        <ArrowUp className="w-3.5 h-3.5 text-locatel-medio" />
                      ) : (
                        <ArrowDown className="w-3.5 h-3.5 text-locatel-medio" />
                      )
                    ) : (
                      <ArrowUpDown className="w-3.5 h-3.5 opacity-40" />
                    )}
                  </button>
                </th>

                <th className="px-4 py-3.5 text-xs font-bold text-neutral-800 dark:text-neutral-200 uppercase tracking-wider">
                  Estado
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-neutral-200/80 dark:divide-neutral-800 text-sm">
              {paginatedData.length === 0 ? (
                <tr>
                  <td
                    colSpan={8}
                    className="px-4 py-12 text-center text-xs text-neutral-400 dark:text-neutral-500"
                  >
                    No se encontraron cuentas bancarias registradas.
                  </td>
                </tr>
              ) : (
                paginatedData.map((item) => (
                  <tr
                    key={item.id}
                    className="even:bg-neutral-50/30 dark:even:bg-neutral-800/20 hover:bg-neutral-50 dark:hover:bg-neutral-800/50 transition-colors"
                  >
                    <td className="px-4 py-3.5">
                      <div className="flex flex-col">
                        <span className="font-medium text-neutral-900 dark:text-neutral-100">
                          {item.bank?.name || "Banco Desconocido"}
                        </span>
                        {item.bank?.code && (
                          <span className="text-xs text-neutral-400">
                            Cód: {item.bank.code}
                          </span>
                        )}
                      </div>
                    </td>

                    <td className="px-4 py-3.5">
                      <span className="font-semibold text-neutral-800 dark:text-neutral-200">
                        {item.account_alias}
                      </span>
                    </td>

                    <td className="px-4 py-3.5">
                      <span className="px-2.5 py-1 rounded-md bg-neutral-50 dark:bg-neutral-800 text-xs font-mono font-medium text-neutral-700 dark:text-neutral-300 border border-neutral-200 dark:border-neutral-700">
                        {item.terminal_code}
                      </span>
                    </td>

                    <td className="px-4 py-3.5">
                      <span className="text-sm font-mono text-neutral-600 dark:text-neutral-400">
                        {item.account_number || "N/A"}
                      </span>
                    </td>

                    <td className="px-4 py-3.5">
                      <span
                        className={`px-2.5 py-0.5 rounded-full text-xs font-bold border ${item.currency === "VES"
                          ? "bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-400 border-emerald-200 dark:border-emerald-800"
                          : item.currency === "USD"
                            ? "bg-amber-50 dark:bg-amber-950/40 text-amber-700 dark:text-amber-400 border-amber-200 dark:border-amber-800"
                            : "bg-neutral-100 dark:bg-neutral-800 text-neutral-700 dark:text-neutral-300 border-neutral-200 dark:border-neutral-700"
                          }`}
                      >
                        {item.currency}
                      </span>
                    </td>

                    <td className="px-4 py-3.5">
                      <span className="text-xs text-neutral-600 dark:text-neutral-400 capitalize">
                        {item.account_type}
                      </span>
                    </td>

                    <td className="px-4 py-3.5">
                      <div className="text-right font-mono font-semibold text-neutral-900 dark:text-neutral-100">
                        {new Intl.NumberFormat("es-VE", {
                          minimumFractionDigits: 2,
                          maximumFractionDigits: 2,
                        }).format(item.current_balance)}{" "}
                        {item.currency}
                      </div>
                    </td>

                    <td className="px-4 py-3.5">
                      <span
                        className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${item.is_active
                          ? "bg-green-100 dark:bg-green-950/50 text-green-800 dark:text-green-300"
                          : "bg-neutral-100 dark:bg-neutral-800 text-neutral-500"
                          }`}
                      >
                        {item.is_active ? "Activa" : "Inactiva"}
                      </span>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        <div className="px-4 py-3 border-t border-neutral-200 dark:border-neutral-800 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-neutral-500">
          <div>
            Mostrando {paginatedData.length} de {filteredAndSortedData.length}{" "}
            cuentas
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
              disabled={currentPage <= 1}
              className="p-1.5 rounded-lg border border-neutral-200 dark:border-neutral-700 disabled:opacity-30 disabled:cursor-not-allowed hover:bg-neutral-100 dark:hover:bg-neutral-800 cursor-pointer"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <span className="font-medium text-neutral-700 dark:text-neutral-300">
              Página {currentPage} de {totalPages}
            </span>
            <button
              onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
              disabled={currentPage >= totalPages}
              className="p-1.5 rounded-lg border border-neutral-200 dark:border-neutral-700 disabled:opacity-30 disabled:cursor-not-allowed hover:bg-neutral-100 dark:hover:bg-neutral-800 cursor-pointer"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>

      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-neutral-950/60 backdrop-blur-sm">
          <div className="bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-2xl max-w-lg w-full p-6 shadow-2xl relative">
            <button
              onClick={() => {
                setIsModalOpen(false);
                accountForm.reset();
              }}
              className="absolute top-4 right-4 text-neutral-400 hover:text-neutral-600 dark:hover:text-neutral-200 cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>

            <h3 className="text-lg font-bold text-neutral-900 dark:text-neutral-100 mb-4">
              Registrar Cuenta Bancaria
            </h3>

            <form onSubmit={handleCreateAccount} className="space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-neutral-600 dark:text-neutral-300 mb-1">
                    Empresa *
                  </label>
                  <select
                    value={accountForm.values.company_id}
                    onChange={(e) => {
                      accountForm.setValues({
                        ...accountForm.values,
                        company_id: e.target.value,
                      });
                      accountForm.setErrors((prev) => ({ ...prev, company_id: [] }));
                    }}
                    className={`w-full px-3 py-2 text-xs rounded-xl bg-white dark:bg-neutral-800 border ${accountForm.errors.company_id?.[0]
                      ? "border-rose-500 focus:ring-rose-500/30"
                      : "border-neutral-200 dark:border-neutral-700"
                      } text-neutral-800 dark:text-neutral-200 focus:outline-none focus:ring-2 focus:ring-locatel-medio/40`}
                  >
                    <option value="">Seleccione...</option>
                    {companies.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.name}
                      </option>
                    ))}
                  </select>
                  {accountForm.errors.company_id && (
                    <p className="text-rose-600 text-xs mt-1">{accountForm.errors.company_id[0]}</p>
                  )}
                </div>

                <div>
                  <label className="block text-xs font-semibold text-neutral-600 dark:text-neutral-300 mb-1">
                    Banco *
                  </label>
                  <select
                    value={accountForm.values.bank_id}
                    onChange={(e) => {
                      accountForm.setValues({ ...accountForm.values, bank_id: e.target.value });
                      if (accountForm.errors.bank_id) {
                        accountForm.setErrors((prev) => ({ ...prev, bank_id: [] }));
                      }
                    }}
                    className={`w-full px-3 py-2 text-xs rounded-xl bg-white dark:bg-neutral-800 border ${accountForm.errors.bank_id
                      ? "border-rose-500 focus:ring-rose-500/30"
                      : "border-neutral-200 dark:border-neutral-700"
                      } text-neutral-800 dark:text-neutral-200 focus:outline-none focus:ring-2 focus:ring-locatel-medio/40`}
                  >
                    <option value="">Seleccione...</option>
                    {banks.map((b) => (
                      <option key={b.id} value={b.id}>
                        {b.name} {b.is_cash ? "(Caja/Efectivo)" : ""}
                      </option>
                    ))}
                  </select>
                  {accountForm.errors.bank_id && (
                    <p className="text-rose-600 text-xs mt-1">{accountForm.errors.bank_id[0]}</p>
                  )}
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-neutral-600 dark:text-neutral-300 mb-1">
                    Alias de Cuenta *
                  </label>
                  <input
                    type="text"
                    placeholder="Ej. Banesco Operativa"
                    value={accountForm.values.account_alias}
                    onChange={(e) => {
                      accountForm.setValues({
                        ...accountForm.values,
                        account_alias: e.target.value,
                      });
                      if (accountForm.errors.account_alias) {
                        accountForm.setErrors((prev) => ({ ...prev, account_alias: [] }));
                      }
                    }}
                    className={`w-full px-3 py-2 text-xs rounded-xl bg-white dark:bg-neutral-800 border ${accountForm.errors.account_alias
                      ? "border-rose-500 focus:ring-rose-500/30"
                      : "border-neutral-200 dark:border-neutral-700"
                      } text-neutral-800 dark:text-neutral-200 focus:outline-none focus:ring-2 focus:ring-locatel-medio/40`}
                  />
                  {accountForm.errors.account_alias && (
                    <p className="text-rose-600 text-xs mt-1">{accountForm.errors.account_alias[0]}</p>
                  )}
                </div>

                <div>
                  <label className="block text-xs font-semibold text-neutral-600 dark:text-neutral-300 mb-1">
                    Terminal / Código *
                  </label>
                  <input
                    type="text"
                    placeholder="Ej. 1001 / BNS-01"
                    value={accountForm.values.terminal_code}
                    onChange={(e) => {
                      accountForm.setValues({
                        ...accountForm.values,
                        terminal_code: e.target.value,
                      });
                      if (accountForm.errors.terminal_code) {
                        accountForm.setErrors((prev) => ({ ...prev, terminal_code: [] }));
                      }
                    }}
                    className={`w-full px-3 py-2 text-xs rounded-xl bg-white dark:bg-neutral-800 border ${accountForm.errors.terminal_code
                      ? "border-rose-500 focus:ring-rose-500/30"
                      : "border-neutral-200 dark:border-neutral-700"
                      } text-neutral-800 dark:text-neutral-200 focus:outline-none focus:ring-2 focus:ring-locatel-medio/40`}
                  />
                  {accountForm.errors.terminal_code && (
                    <p className="text-rose-600 text-xs mt-1">{accountForm.errors.terminal_code[0]}</p>
                  )}
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-neutral-600 dark:text-neutral-300 mb-1">
                  Número de Cuenta (20 dígitos)
                </label>
                <input
                  type="text"
                  inputMode="numeric"
                  maxLength={20}
                  placeholder="0134..."
                  value={accountForm.values.account_number}
                  onChange={(e) => {
                    const val = e.target.value.replace(/\D/g, "");
                    accountForm.setValues({
                      ...accountForm.values,
                      account_number: val,
                    });
                    if (accountForm.errors.account_number) {
                      accountForm.setErrors((prev) => ({ ...prev, account_number: [] }));
                    }
                  }}
                  className={`w-full px-3 py-2 text-xs rounded-xl bg-white dark:bg-neutral-800 border ${accountForm.errors.account_number?.[0]
                    ? "border-rose-500 focus:ring-rose-500/30"
                    : "border-neutral-200 dark:border-neutral-700"
                    } text-neutral-800 dark:text-neutral-200 focus:outline-none focus:ring-2 focus:ring-locatel-medio/40`}
                />
                {accountForm.errors.account_number && (
                  <p className="text-rose-600 text-xs mt-1">{accountForm.errors.account_number[0]}</p>
                )}
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-neutral-600 dark:text-neutral-300 mb-1">
                    Moneda *
                  </label>
                  <select
                    value={accountForm.values.currency}
                    onChange={(e) => {
                      accountForm.setValues({ ...accountForm.values, currency: e.target.value });
                      if (accountForm.errors.currency) {
                        accountForm.setErrors((prev) => ({ ...prev, currency: [] }));
                      }
                    }}
                    className={`w-full px-3 py-2 text-xs rounded-xl bg-white dark:bg-neutral-800 border ${accountForm.errors.currency
                      ? "border-rose-500 focus:ring-rose-500/30"
                      : "border-neutral-200 dark:border-neutral-700"
                      } text-neutral-800 dark:text-neutral-200 focus:outline-none focus:ring-2 focus:ring-locatel-medio/40`}
                  >
                    <option value="VES">VES</option>
                    <option value="USD">USD</option>
                    <option value="EUR">EUR</option>
                  </select>
                  {accountForm.errors.currency && (
                    <p className="text-rose-600 text-xs mt-1">{accountForm.errors.currency[0]}</p>
                  )}
                </div>

                <div>
                  <label className="block text-xs font-semibold text-neutral-600 dark:text-neutral-300 mb-1">
                    Tipo de Cuenta *
                  </label>
                  <select
                    value={accountForm.values.account_type}
                    onChange={(e) => {
                      accountForm.setValues({
                        ...accountForm.values,
                        account_type: e.target.value,
                      });
                      if (accountForm.errors.account_type) {
                        accountForm.setErrors((prev) => ({ ...prev, account_type: [] }));
                      }
                    }}
                    className={`w-full px-3 py-2 text-xs rounded-xl bg-white dark:bg-neutral-800 border ${accountForm.errors.account_type
                      ? "border-rose-500 focus:ring-rose-500/30"
                      : "border-neutral-200 dark:border-neutral-700"
                      } text-neutral-800 dark:text-neutral-200 focus:outline-none focus:ring-2 focus:ring-locatel-medio/40`}
                  >
                    <option value="CORRIENTE">CORRIENTE</option>
                    <option value="AHORRO">AHORRO</option>
                    <option value="CUSTODIA">CUSTODIA</option>
                  </select>
                  {accountForm.errors.account_type && (
                    <p className="text-rose-600 text-xs mt-1">{accountForm.errors.account_type[0]}</p>
                  )}
                </div>

                <div>
                  <label className="block text-xs font-semibold text-neutral-600 dark:text-neutral-300 mb-1">
                    Saldo Inicial
                  </label>
                  <input
                    type="text"
                    inputMode="decimal"
                    autoComplete="off"
                    value={accountForm.values.initial_balance}
                    onChange={(e) => {
                      const val = e.target.value;
                      if (val === "" || /^[0-9]*[.,]?[0-9]*$/.test(val)) {
                        accountForm.setValues({
                          ...accountForm.values,
                          initial_balance: val,
                        });
                      }
                    }}
                    className="w-full px-3 py-2 text-xs rounded-xl bg-white dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 text-neutral-800 dark:text-neutral-200 focus:outline-none focus:ring-2 focus:ring-locatel-medio/40"
                  />
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-4">
                <button
                  type="button"
                  onClick={() => {
                    setIsModalOpen(false);
                    accountForm.reset();
                  }}
                  className="px-4 py-2 text-xs font-semibold rounded-xl bg-neutral-100 hover:bg-neutral-200 dark:bg-neutral-800 text-neutral-700 dark:text-neutral-300 cursor-pointer
                  dark:hover:text-black "
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="px-5 py-2 text-xs font-semibold rounded-xl bg-locatel-medio hover:bg-locatel-oscuro text-white cursor-pointer disabled:opacity-50"
                >
                  {isSubmitting ? "Guardando..." : "Crear Cuenta"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {isCompanyModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-neutral-950/60 backdrop-blur-sm">
          <div className="bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-2xl max-w-md w-full p-6 shadow-2xl relative">
            <button
              onClick={() => {
                setIsCompanyModalOpen(false);
                companyForm.reset();
              }}
              className="absolute top-4 right-4 text-neutral-400 hover:text-neutral-600 dark:hover:text-neutral-200 cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>

            <h3 className="text-lg font-bold text-neutral-900 dark:text-neutral-100 mb-4 flex items-center gap-2">
              <Building2 className="w-5 h-5 text-locatel-medio" />
              Nueva Empresa
            </h3>

            <form onSubmit={handleCreateCompany} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-neutral-600 dark:text-neutral-300 mb-1">
                  Código *
                </label>
                <input
                  type="text"
                  placeholder="Ej. LOC-01"
                  value={companyForm.values.code}
                  onChange={(e) => {
                    companyForm.setValues({ ...companyForm.values, code: e.target.value });
                    if (companyForm.errors.code) {
                      companyForm.setErrors((prev) => ({ ...prev, code: [] }));
                    }
                  }}
                  className={`w-full px-3 py-2 text-xs rounded-xl bg-white dark:bg-neutral-800 border ${companyForm.errors.code
                    ? "border-rose-500 focus:ring-rose-500/30"
                    : "border-neutral-200 dark:border-neutral-700"
                    } text-neutral-800 dark:text-neutral-200 focus:outline-none focus:ring-2 focus:ring-locatel-medio/40`}
                />
                {companyForm.errors.code && (
                  <p className="text-rose-600 text-xs mt-1">{companyForm.errors.code[0]}</p>
                )}
              </div>

              <div>
                <label className="block text-xs font-semibold text-neutral-600 dark:text-neutral-300 mb-1">
                  Razón Social / Nombre *
                </label>
                <input
                  type="text"
                  placeholder="Ej. Locatel Servicios C.A."
                  value={companyForm.values.name}
                  onChange={(e) => {
                    companyForm.setValues({ ...companyForm.values, name: e.target.value });
                    if (companyForm.errors.name) {
                      companyForm.setErrors((prev) => ({ ...prev, name: [] }));
                    }
                  }}
                  className={`w-full px-3 py-2 text-xs rounded-xl bg-white dark:bg-neutral-800 border ${companyForm.errors.name
                    ? "border-rose-500 focus:ring-rose-500/30"
                    : "border-neutral-200 dark:border-neutral-700"
                    } text-neutral-800 dark:text-neutral-200 focus:outline-none focus:ring-2 focus:ring-locatel-medio/40`}
                />
                {companyForm.errors.name && (
                  <p className="text-rose-600 text-xs mt-1">{companyForm.errors.name[0]}</p>
                )}
              </div>

              <div>
                <label className="block text-xs font-semibold text-neutral-600 dark:text-neutral-300 mb-1">
                  RIF *
                </label>
                <input
                  type="text"
                  placeholder="Ej. J-12345678-9"
                  value={companyForm.values.rif}
                  onChange={(e) => {
                    companyForm.setValues({ ...companyForm.values, rif: e.target.value });
                    if (companyForm.errors.rif) {
                      companyForm.setErrors((prev) => ({ ...prev, rif: [] }));
                    }
                  }}
                  className={`w-full px-3 py-2 text-xs rounded-xl bg-white dark:bg-neutral-800 border ${companyForm.errors.rif
                    ? "border-rose-500 focus:ring-rose-500/30"
                    : "border-neutral-200 dark:border-neutral-700"
                    } text-neutral-800 dark:text-neutral-200 focus:outline-none focus:ring-2 focus:ring-locatel-medio/40`}
                />
                {companyForm.errors.rif && (
                  <p className="text-rose-600 text-xs mt-1">{companyForm.errors.rif[0]}</p>
                )}
              </div>

              <div className="flex justify-end gap-2 pt-4">
                <button
                  type="button"
                  onClick={() => {
                    setIsCompanyModalOpen(false);
                    companyForm.reset();
                  }}
                  className="px-4 py-2 text-xs font-semibold rounded-xl bg-neutral-100 hover:bg-neutral-200 dark:bg-neutral-800 text-neutral-700 dark:text-neutral-300 cursor-pointer
                  dark:hover:text-black"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="px-5 py-2 text-xs font-semibold rounded-xl bg-locatel-medio hover:bg-locatel-oscuro text-white cursor-pointer disabled:opacity-50"
                >
                  {isSubmitting ? "Guardando..." : "Crear Empresa"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {isBankModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-neutral-950/60 backdrop-blur-sm">
          <div className="bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-2xl max-w-md w-full p-6 shadow-2xl relative">
            <button
              onClick={() => {
                setIsBankModalOpen(false);
                bankForm.reset();
              }}
              className="absolute top-4 right-4 text-neutral-400 hover:text-neutral-600 dark:hover:text-neutral-200 cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>

            <h3 className="text-lg font-bold text-neutral-900 dark:text-neutral-100 mb-4 flex items-center gap-2">
              <Landmark className="w-5 h-5 text-locatel-medio" />
              Nuevo Banco
            </h3>

            <form onSubmit={handleCreateBank} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-neutral-600 dark:text-neutral-300 mb-1">
                  Código (Opcional)
                </label>
                <input
                  type="text"
                  inputMode="numeric"
                  maxLength={4}
                  placeholder="Ej. 0134"
                  value={bankForm.values.code}
                  onChange={(e) => {
                    const val = e.target.value.replace(/\D/g, "");
                    bankForm.setValues({ ...bankForm.values, code: val });
                    if (bankForm.errors.code) {
                      bankForm.setErrors((prev) => ({ ...prev, code: [] }));
                    }
                  }}
                  className={`w-full px-3 py-2 text-xs rounded-xl bg-white dark:bg-neutral-800 border ${bankForm.errors.code
                    ? "border-rose-500 focus:ring-rose-500/30"
                    : "border-neutral-200 dark:border-neutral-700"
                    } text-neutral-800 dark:text-neutral-200 focus:outline-none focus:ring-2 focus:ring-locatel-medio/40`}
                />
                {bankForm.errors.code && (
                  <p className="text-rose-600 text-xs mt-1">{bankForm.errors.code[0]}</p>
                )}
              </div>

              <div>
                <label className="block text-xs font-semibold text-neutral-600 dark:text-neutral-300 mb-1">
                  Nombre del Banco *
                </label>
                <input
                  type="text"
                  placeholder="Ej. Banesco Banco Universal"
                  value={bankForm.values.name}
                  onChange={(e) => {
                    bankForm.setValues({ ...bankForm.values, name: e.target.value });
                    if (bankForm.errors.name) {
                      bankForm.setErrors((prev) => ({ ...prev, name: [] }));
                    }
                  }}
                  className={`w-full px-3 py-2 text-xs rounded-xl bg-white dark:bg-neutral-800 border ${bankForm.errors.name
                    ? "border-rose-500 focus:ring-rose-500/30"
                    : "border-neutral-200 dark:border-neutral-700"
                    } text-neutral-800 dark:text-neutral-200 focus:outline-none focus:ring-2 focus:ring-locatel-medio/40`}
                />
                {bankForm.errors.name && (
                  <p className="text-rose-600 text-xs mt-1">{bankForm.errors.name[0]}</p>
                )}
              </div>

              <div className="flex items-center gap-2 pt-2">
                <input
                  type="checkbox"
                  id="is_cash"
                  checked={bankForm.values.is_cash}
                  onChange={(e) =>
                    bankForm.setValues({ ...bankForm.values, is_cash: e.target.checked })
                  }
                  className="rounded border-neutral-300 text-locatel-medio focus:ring-locatel-medio"
                />
                <label
                  htmlFor="is_cash"
                  className="text-xs font-medium text-neutral-700 dark:text-neutral-300 cursor-pointer"
                >
                  Representa caja o custodia de efectivo
                </label>
              </div>

              <div className="flex justify-end gap-2 pt-4">
                <button
                  type="button"
                  onClick={() => {
                    setIsBankModalOpen(false);
                    bankForm.reset();
                  }}
                  className="px-4 py-2 text-xs font-semibold rounded-xl bg-neutral-100 hover:bg-neutral-200 dark:bg-neutral-800 text-neutral-700 dark:text-neutral-300 cursor-pointer dark:hover:text-black"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="px-5 py-2 text-xs font-semibold rounded-xl bg-locatel-medio hover:bg-locatel-oscuro text-white cursor-pointer disabled:opacity-50"
                >
                  {isSubmitting ? "Guardando..." : "Crear Banco"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
