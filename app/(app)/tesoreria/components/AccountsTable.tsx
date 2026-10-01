"use client";

import { useMemo, useState } from "react";
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
  Wallet,
  X,
} from "lucide-react";
import { toast } from "sonner";
import { fetchClient } from "@/lib/fetchClient";
import { Bank, BankAccount, Company } from "../types";
import { companySchema, bankSchema, bankAccountSchema } from "@/schemas/treasury";

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

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isCompanyModalOpen, setIsCompanyModalOpen] = useState(false);
  const [isBankModalOpen, setIsBankModalOpen] = useState(false);

  const [newAccount, setNewAccount] = useState({
    company_id: "",
    bank_id: "",
    account_alias: "",
    account_number: "",
    terminal_code: "",
    currency: "VES",
    account_type: "CORRIENTE",
    initial_balance: "0",
  });

  const [newCompany, setNewCompany] = useState({
    code: "",
    name: "",
    rif: "",
  });

  const [newBank, setNewBank] = useState({
    code: "",
    name: "",
    is_cash: false,
  });

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [accountErrors, setAccountErrors] = useState<Record<string, string>>({});
  const [companyErrors, setCompanyErrors] = useState<Record<string, string>>({});
  const [bankErrors, setBankErrors] = useState<Record<string, string>>({});

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
    setAccountErrors({});
    const selectedBankObj = banks.find((b) => b.id === newAccount.bank_id);
    const parsed = bankAccountSchema.safeParse({
      company_id: newAccount.company_id,
      bank_id: newAccount.bank_id,
      account_alias: newAccount.account_alias,
      account_number: newAccount.account_number,
      terminal_code: newAccount.terminal_code,
      currency: newAccount.currency,
      account_type: newAccount.account_type,
      is_cash: selectedBankObj?.is_cash ?? false,
    });
    if (!parsed.success) {
      const errMap: Record<string, string> = {};
      parsed.error.issues.forEach((issue) => {
        const key = issue.path[0] as string;
        if (key && !errMap[key]) {
          errMap[key] = issue.message;
        }
      });
      setAccountErrors(errMap);
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
          initial_balance: parseFloat(newAccount.initial_balance.replace(",", ".")) || 0,
        }),
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.message || "Error al crear cuenta bancaria");
      }
      toast.success("Cuenta bancaria creada exitosamente");
      setIsModalOpen(false);
      setAccountErrors({});
      setNewAccount({
        company_id: "",
        bank_id: "",
        account_alias: "",
        account_number: "",
        terminal_code: "",
        currency: "VES",
        account_type: "CORRIENTE",
        initial_balance: "0",
      });
      onAccountCreated();
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Error al procesar");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleCreateCompany = async (e: React.FormEvent) => {
    e.preventDefault();
    setCompanyErrors({});
    const parsed = companySchema.safeParse(newCompany);
    if (!parsed.success) {
      const errMap: Record<string, string> = {};
      parsed.error.issues.forEach((issue) => {
        const key = issue.path[0] as string;
        if (key && !errMap[key]) {
          errMap[key] = issue.message;
        }
      });
      setCompanyErrors(errMap);
      return;
    }
    setIsSubmitting(true);
    try {
      const res = await fetchClient("/api/v1/treasury/companies", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(parsed.data),
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.message || "Error al crear empresa");
      }
      toast.success("Empresa creada exitosamente");
      setIsCompanyModalOpen(false);
      setCompanyErrors({});
      setNewCompany({ code: "", name: "", rif: "" });
      onCompanyCreated();
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Error al procesar");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleCreateBank = async (e: React.FormEvent) => {
    e.preventDefault();
    setBankErrors({});
    const parsed = bankSchema.safeParse(newBank);
    if (!parsed.success) {
      const errMap: Record<string, string> = {};
      parsed.error.issues.forEach((issue) => {
        const key = issue.path[0] as string;
        if (key && !errMap[key]) {
          errMap[key] = issue.message;
        }
      });
      setBankErrors(errMap);
      return;
    }
    setIsSubmitting(true);
    try {
      const res = await fetchClient("/api/v1/treasury/banks", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(parsed.data),
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.message || "Error al crear banco");
      }
      toast.success("Banco creado exitosamente");
      setIsBankModalOpen(false);
      setBankErrors({});
      setNewBank({ code: "", name: "", is_cash: false });
      onBankCreated();
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Error al procesar");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold tracking-tight text-neutral-900 dark:text-neutral-100 flex items-center gap-2">
            <Wallet className="w-5 h-5 text-locatel-medio" />
            Catálogo de Cuentas Bancarias
          </h2>
          <p className="text-xs text-neutral-500 mt-1">
            Visualiza y administra las cuentas, terminales y saldos operativos.
          </p>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          <button
            onClick={() => setIsCompanyModalOpen(true)}
            className="flex items-center gap-2 px-3.5 py-2.5 text-xs sm:text-sm font-semibold rounded-xl bg-neutral-100 hover:bg-neutral-200 dark:bg-neutral-800 dark:hover:bg-neutral-700 text-neutral-700 dark:text-neutral-200 transition-colors cursor-pointer"
          >
            <Building2 className="w-4 h-4" />
            + Empresa
          </button>

          <button
            onClick={() => setIsBankModalOpen(true)}
            className="flex items-center gap-2 px-3.5 py-2.5 text-xs sm:text-sm font-semibold rounded-xl bg-neutral-100 hover:bg-neutral-200 dark:bg-neutral-800 dark:hover:bg-neutral-700 text-neutral-700 dark:text-neutral-200 transition-colors cursor-pointer"
          >
            <Landmark className="w-4 h-4" />
            + Banco
          </button>

          <button
            onClick={() => setIsModalOpen(true)}
            className="flex items-center gap-2 px-4.5 py-2.5 text-xs sm:text-sm font-semibold rounded-xl bg-locatel-medio hover:bg-locatel-oscuro text-white shadow-sm transition-all cursor-pointer"
          >
            <Plus className="w-4.5 h-4.5" />
            Nueva Cuenta
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3 bg-white dark:bg-neutral-900 p-4 rounded-2xl border border-neutral-200 dark:border-neutral-800 shadow-sm">
        <div className="relative">
          <Search className="w-4.5 h-4.5 absolute left-3.5 top-1/2 -translate-y-1/2 text-neutral-400" />
          <input
            type="text"
            placeholder="Buscar por alias, terminal, banco..."
            value={globalFilter}
            onChange={(e) => {
              setGlobalFilter(e.target.value);
              setCurrentPage(1);
            }}
            className="w-full pl-10 pr-3.5 py-2.5 text-xs sm:text-sm rounded-xl bg-white dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 focus:outline-none focus:ring-2 focus:ring-locatel-medio/30"
          />
        </div>

        <div>
          <select
            value={selectedCompany}
            onChange={(e) => {
              setSelectedCompany(e.target.value);
              setCurrentPage(1);
            }}
            className="w-full px-3.5 py-2.5 text-xs sm:text-sm rounded-xl bg-white dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 focus:outline-none focus:ring-2 focus:ring-locatel-medio/30 text-neutral-800 dark:text-neutral-200 cursor-pointer"
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
          <select
            value={selectedBank}
            onChange={(e) => {
              setSelectedBank(e.target.value);
              setCurrentPage(1);
            }}
            className="w-full px-3.5 py-2.5 text-xs sm:text-sm rounded-xl bg-white dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 focus:outline-none focus:ring-2 focus:ring-locatel-medio/30 text-neutral-800 dark:text-neutral-200 cursor-pointer"
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
          <select
            value={selectedCurrency}
            onChange={(e) => {
              setSelectedCurrency(e.target.value);
              setCurrentPage(1);
            }}
            className="w-full px-3.5 py-2.5 text-xs sm:text-sm rounded-xl bg-white dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 focus:outline-none focus:ring-2 focus:ring-locatel-medio/30 text-neutral-800 dark:text-neutral-200 cursor-pointer"
          >
            <option value="all">Todas las Monedas</option>
            <option value="VES">VES (Bolívares)</option>
            <option value="USD">USD (Dólares)</option>
            <option value="EUR">EUR (Euros)</option>
          </select>
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
                        className={`px-2.5 py-0.5 rounded-full text-xs font-bold border ${
                          item.currency === "VES"
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
                        className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${
                          item.is_active
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
                setAccountErrors({});
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
                    value={newAccount.company_id}
                    onChange={(e) => {
                      setNewAccount({
                        ...newAccount,
                        company_id: e.target.value,
                      });
                      if (accountErrors.company_id) {
                        setAccountErrors((prev) => ({ ...prev, company_id: "" }));
                      }
                    }}
                    className={`w-full px-3 py-2 text-xs rounded-xl bg-white dark:bg-neutral-800 border ${
                      accountErrors.company_id
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
                  {accountErrors.company_id && (
                    <p className="text-rose-600 text-xs mt-1">{accountErrors.company_id}</p>
                  )}
                </div>

                <div>
                  <label className="block text-xs font-semibold text-neutral-600 dark:text-neutral-300 mb-1">
                    Banco *
                  </label>
                  <select
                    value={newAccount.bank_id}
                    onChange={(e) => {
                      setNewAccount({ ...newAccount, bank_id: e.target.value });
                      if (accountErrors.bank_id) {
                        setAccountErrors((prev) => ({ ...prev, bank_id: "" }));
                      }
                    }}
                    className={`w-full px-3 py-2 text-xs rounded-xl bg-white dark:bg-neutral-800 border ${
                      accountErrors.bank_id
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
                  {accountErrors.bank_id && (
                    <p className="text-rose-600 text-xs mt-1">{accountErrors.bank_id}</p>
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
                    value={newAccount.account_alias}
                    onChange={(e) => {
                      setNewAccount({
                        ...newAccount,
                        account_alias: e.target.value,
                      });
                      if (accountErrors.account_alias) {
                        setAccountErrors((prev) => ({ ...prev, account_alias: "" }));
                      }
                    }}
                    className={`w-full px-3 py-2 text-xs rounded-xl bg-white dark:bg-neutral-800 border ${
                      accountErrors.account_alias
                        ? "border-rose-500 focus:ring-rose-500/30"
                        : "border-neutral-200 dark:border-neutral-700"
                    } text-neutral-800 dark:text-neutral-200 focus:outline-none focus:ring-2 focus:ring-locatel-medio/40`}
                  />
                  {accountErrors.account_alias && (
                    <p className="text-rose-600 text-xs mt-1">{accountErrors.account_alias}</p>
                  )}
                </div>

                <div>
                  <label className="block text-xs font-semibold text-neutral-600 dark:text-neutral-300 mb-1">
                    Terminal / Código *
                  </label>
                  <input
                    type="text"
                    placeholder="Ej. 1001 / BNS-01"
                    value={newAccount.terminal_code}
                    onChange={(e) => {
                      setNewAccount({
                        ...newAccount,
                        terminal_code: e.target.value,
                      });
                      if (accountErrors.terminal_code) {
                        setAccountErrors((prev) => ({ ...prev, terminal_code: "" }));
                      }
                    }}
                    className={`w-full px-3 py-2 text-xs rounded-xl bg-white dark:bg-neutral-800 border ${
                      accountErrors.terminal_code
                        ? "border-rose-500 focus:ring-rose-500/30"
                        : "border-neutral-200 dark:border-neutral-700"
                    } text-neutral-800 dark:text-neutral-200 focus:outline-none focus:ring-2 focus:ring-locatel-medio/40`}
                  />
                  {accountErrors.terminal_code && (
                    <p className="text-rose-600 text-xs mt-1">{accountErrors.terminal_code}</p>
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
                  value={newAccount.account_number}
                  onChange={(e) => {
                    const val = e.target.value.replace(/\D/g, "");
                    setNewAccount({
                      ...newAccount,
                      account_number: val,
                    });
                    if (accountErrors.account_number) {
                      setAccountErrors((prev) => ({ ...prev, account_number: "" }));
                    }
                  }}
                  className={`w-full px-3 py-2 text-xs rounded-xl bg-white dark:bg-neutral-800 border ${
                    accountErrors.account_number
                      ? "border-rose-500 focus:ring-rose-500/30"
                      : "border-neutral-200 dark:border-neutral-700"
                  } text-neutral-800 dark:text-neutral-200 focus:outline-none focus:ring-2 focus:ring-locatel-medio/40`}
                />
                {accountErrors.account_number && (
                  <p className="text-rose-600 text-xs mt-1">{accountErrors.account_number}</p>
                )}
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-neutral-600 dark:text-neutral-300 mb-1">
                    Moneda *
                  </label>
                  <select
                    value={newAccount.currency}
                    onChange={(e) => {
                      setNewAccount({ ...newAccount, currency: e.target.value });
                      if (accountErrors.currency) {
                        setAccountErrors((prev) => ({ ...prev, currency: "" }));
                      }
                    }}
                    className={`w-full px-3 py-2 text-xs rounded-xl bg-white dark:bg-neutral-800 border ${
                      accountErrors.currency
                        ? "border-rose-500 focus:ring-rose-500/30"
                        : "border-neutral-200 dark:border-neutral-700"
                    } text-neutral-800 dark:text-neutral-200 focus:outline-none focus:ring-2 focus:ring-locatel-medio/40`}
                  >
                    <option value="VES">VES</option>
                    <option value="USD">USD</option>
                    <option value="EUR">EUR</option>
                  </select>
                  {accountErrors.currency && (
                    <p className="text-rose-600 text-xs mt-1">{accountErrors.currency}</p>
                  )}
                </div>

                <div>
                  <label className="block text-xs font-semibold text-neutral-600 dark:text-neutral-300 mb-1">
                    Tipo de Cuenta *
                  </label>
                  <select
                    value={newAccount.account_type}
                    onChange={(e) => {
                      setNewAccount({
                        ...newAccount,
                        account_type: e.target.value,
                      });
                      if (accountErrors.account_type) {
                        setAccountErrors((prev) => ({ ...prev, account_type: "" }));
                      }
                    }}
                    className={`w-full px-3 py-2 text-xs rounded-xl bg-white dark:bg-neutral-800 border ${
                      accountErrors.account_type
                        ? "border-rose-500 focus:ring-rose-500/30"
                        : "border-neutral-200 dark:border-neutral-700"
                    } text-neutral-800 dark:text-neutral-200 focus:outline-none focus:ring-2 focus:ring-locatel-medio/40`}
                  >
                    <option value="CORRIENTE">CORRIENTE</option>
                    <option value="AHORRO">AHORRO</option>
                    <option value="CUSTODIA">CUSTODIA</option>
                  </select>
                  {accountErrors.account_type && (
                    <p className="text-rose-600 text-xs mt-1">{accountErrors.account_type}</p>
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
                    value={newAccount.initial_balance}
                    onChange={(e) => {
                      const val = e.target.value;
                      if (val === "" || /^[0-9]*[.,]?[0-9]*$/.test(val)) {
                        setNewAccount({
                          ...newAccount,
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
                    setAccountErrors({});
                  }}
                  className="px-4 py-2 text-xs font-semibold rounded-xl bg-neutral-100 hover:bg-neutral-200 dark:bg-neutral-800 text-neutral-700 dark:text-neutral-300 cursor-pointer"
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
                setCompanyErrors({});
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
                  value={newCompany.code}
                  onChange={(e) => {
                    setNewCompany({ ...newCompany, code: e.target.value });
                    if (companyErrors.code) {
                      setCompanyErrors((prev) => ({ ...prev, code: "" }));
                    }
                  }}
                  className={`w-full px-3 py-2 text-xs rounded-xl bg-white dark:bg-neutral-800 border ${
                    companyErrors.code
                      ? "border-rose-500 focus:ring-rose-500/30"
                      : "border-neutral-200 dark:border-neutral-700"
                  } text-neutral-800 dark:text-neutral-200 focus:outline-none focus:ring-2 focus:ring-locatel-medio/40`}
                />
                {companyErrors.code && (
                  <p className="text-rose-600 text-xs mt-1">{companyErrors.code}</p>
                )}
              </div>

              <div>
                <label className="block text-xs font-semibold text-neutral-600 dark:text-neutral-300 mb-1">
                  Razón Social / Nombre *
                </label>
                <input
                  type="text"
                  placeholder="Ej. Locatel Servicios C.A."
                  value={newCompany.name}
                  onChange={(e) => {
                    setNewCompany({ ...newCompany, name: e.target.value });
                    if (companyErrors.name) {
                      setCompanyErrors((prev) => ({ ...prev, name: "" }));
                    }
                  }}
                  className={`w-full px-3 py-2 text-xs rounded-xl bg-white dark:bg-neutral-800 border ${
                    companyErrors.name
                      ? "border-rose-500 focus:ring-rose-500/30"
                      : "border-neutral-200 dark:border-neutral-700"
                  } text-neutral-800 dark:text-neutral-200 focus:outline-none focus:ring-2 focus:ring-locatel-medio/40`}
                />
                {companyErrors.name && (
                  <p className="text-rose-600 text-xs mt-1">{companyErrors.name}</p>
                )}
              </div>

              <div>
                <label className="block text-xs font-semibold text-neutral-600 dark:text-neutral-300 mb-1">
                  RIF *
                </label>
                <input
                  type="text"
                  placeholder="Ej. J-12345678-9"
                  value={newCompany.rif}
                  onChange={(e) => {
                    setNewCompany({ ...newCompany, rif: e.target.value });
                    if (companyErrors.rif) {
                      setCompanyErrors((prev) => ({ ...prev, rif: "" }));
                    }
                  }}
                  className={`w-full px-3 py-2 text-xs rounded-xl bg-white dark:bg-neutral-800 border ${
                    companyErrors.rif
                      ? "border-rose-500 focus:ring-rose-500/30"
                      : "border-neutral-200 dark:border-neutral-700"
                  } text-neutral-800 dark:text-neutral-200 focus:outline-none focus:ring-2 focus:ring-locatel-medio/40`}
                />
                {companyErrors.rif && (
                  <p className="text-rose-600 text-xs mt-1">{companyErrors.rif}</p>
                )}
              </div>

              <div className="flex justify-end gap-2 pt-4">
                <button
                  type="button"
                  onClick={() => {
                    setIsCompanyModalOpen(false);
                    setCompanyErrors({});
                  }}
                  className="px-4 py-2 text-xs font-semibold rounded-xl bg-neutral-100 hover:bg-neutral-200 dark:bg-neutral-800 text-neutral-700 dark:text-neutral-300 cursor-pointer"
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
                setBankErrors({});
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
                  value={newBank.code}
                  onChange={(e) => {
                    const val = e.target.value.replace(/\D/g, "");
                    setNewBank({ ...newBank, code: val });
                    if (bankErrors.code) {
                      setBankErrors((prev) => ({ ...prev, code: "" }));
                    }
                  }}
                  className={`w-full px-3 py-2 text-xs rounded-xl bg-white dark:bg-neutral-800 border ${
                    bankErrors.code
                      ? "border-rose-500 focus:ring-rose-500/30"
                      : "border-neutral-200 dark:border-neutral-700"
                  } text-neutral-800 dark:text-neutral-200 focus:outline-none focus:ring-2 focus:ring-locatel-medio/40`}
                />
                {bankErrors.code && (
                  <p className="text-rose-600 text-xs mt-1">{bankErrors.code}</p>
                )}
              </div>

              <div>
                <label className="block text-xs font-semibold text-neutral-600 dark:text-neutral-300 mb-1">
                  Nombre del Banco *
                </label>
                <input
                  type="text"
                  placeholder="Ej. Banesco Banco Universal"
                  value={newBank.name}
                  onChange={(e) => {
                    setNewBank({ ...newBank, name: e.target.value });
                    if (bankErrors.name) {
                      setBankErrors((prev) => ({ ...prev, name: "" }));
                    }
                  }}
                  className={`w-full px-3 py-2 text-xs rounded-xl bg-white dark:bg-neutral-800 border ${
                    bankErrors.name
                      ? "border-rose-500 focus:ring-rose-500/30"
                      : "border-neutral-200 dark:border-neutral-700"
                  } text-neutral-800 dark:text-neutral-200 focus:outline-none focus:ring-2 focus:ring-locatel-medio/40`}
                />
                {bankErrors.name && (
                  <p className="text-rose-600 text-xs mt-1">{bankErrors.name}</p>
                )}
              </div>

              <div className="flex items-center gap-2 pt-2">
                <input
                  type="checkbox"
                  id="is_cash"
                  checked={newBank.is_cash}
                  onChange={(e) =>
                    setNewBank({ ...newBank, is_cash: e.target.checked })
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
                    setBankErrors({});
                  }}
                  className="px-4 py-2 text-xs font-semibold rounded-xl bg-neutral-100 hover:bg-neutral-200 dark:bg-neutral-800 text-neutral-700 dark:text-neutral-300 cursor-pointer"
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
