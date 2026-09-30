"use client";

import { useEffect, useMemo, useState } from "react";
import {
  Building2,
  Check,
  Clock,
  Copy,
  CreditCard,
  FileText,
  Landmark,
  Plus,
  RefreshCw,
  Trash2,
  X,
} from "lucide-react";
import { toast } from "sonner";
import { fetchClient } from "@/lib/fetchClient";
import { Bank, Company } from "@/app/(app)/tesoreria/types";
import { SupplierDetailsResponse } from "../types";

interface SupplierDetailModalProps {
  isOpen: boolean;
  onClose: () => void;
  supplierId: string | null;
  companies: Company[];
  banks?: Bank[];
  canEdit?: boolean;
}

export function SupplierDetailModal({
  isOpen,
  onClose,
  supplierId,
  companies = [],
  banks = [],
  canEdit = true,
}: SupplierDetailModalProps) {
  const [activeTab, setActiveTab] = useState<"accounts" | "invoices">("accounts");
  const [loading, setLoading] = useState(false);
  const [details, setDetails] = useState<SupplierDetailsResponse | null>(null);
  const [selectedCompanyId, setSelectedCompanyId] = useState<string>("");
  const [copiedAccountId, setCopiedAccountId] = useState<string | null>(null);

  const [showAddAccountForm, setShowAddAccountForm] = useState(false);
  const [isSubmittingAccount, setIsSubmittingAccount] = useState(false);
  const [deletingAccountId, setDeletingAccountId] = useState<string | null>(null);

  const [formBankId, setFormBankId] = useState("");
  const [formBankName, setFormBankName] = useState("");
  const [formAccountNumber, setFormAccountNumber] = useState("");
  const [formAccountType, setFormAccountType] = useState<"CORRIENTE" | "AHORRO">("CORRIENTE");
  const [formCurrency, setFormCurrency] = useState<"VES" | "USD">("VES");
  const [formHolderName, setFormHolderName] = useState("");
  const [formHolderRIF, setFormHolderRIF] = useState("");
  const [formIsDefault, setFormIsDefault] = useState(false);

  const fetchDetails = async () => {
    if (!supplierId) return;
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (selectedCompanyId) {
        params.append("company_id", selectedCompanyId);
      }
      const res = await fetchClient(`/api/cxp/suppliers/${supplierId}/details?${params.toString()}`);
      if (!res.ok) {
        throw new Error("No se pudo cargar el detalle del proveedor");
      }
      const data: SupplierDetailsResponse = await res.json();
      setDetails(data);
    } catch (err: any) {
      toast.error(err.message || "Error al cargar datos del proveedor");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen && supplierId) {
      fetchDetails();
      setShowAddAccountForm(false);
    } else {
      setDetails(null);
    }
  }, [isOpen, supplierId, selectedCompanyId]);

  useEffect(() => {
    if (details && !formHolderName) {
      setFormHolderName(details.business_name || details.supplier?.business_name || "");
      setFormHolderRIF(details.rif || details.supplier?.rif || "");
    }
  }, [details]);

  const handleBankSelectChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const bId = e.target.value;
    setFormBankId(bId);
    const b = banks.find((item) => item.id === bId);
    if (b) {
      setFormBankName(b.name);
    }
  };

  const handleCopyAccount = (id: string, num: string) => {
    navigator.clipboard.writeText(num);
    setCopiedAccountId(id);
    toast.success("Número de cuenta copiado");
    setTimeout(() => {
      setCopiedAccountId(null);
    }, 2000);
  };

  const handleCreateAccount = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!supplierId) return;

    const cleanNum = formAccountNumber.trim();
    if (cleanNum.length !== 20 || !/^\d{20}$/.test(cleanNum)) {
      toast.error("El número de cuenta debe tener exactamente 20 dígitos numéricos");
      return;
    }

    const cleanBank = formBankName.trim();
    if (!cleanBank) {
      toast.error("Seleccione o ingrese el nombre del banco");
      return;
    }

    setIsSubmittingAccount(true);
    try {
      const payload = {
        bank_id: formBankId || undefined,
        bank_name: cleanBank,
        account_number: cleanNum,
        account_type: formAccountType,
        currency: formCurrency,
        holder_name: formHolderName.trim() || details?.business_name || "",
        holder_rif: formHolderRIF.trim() || details?.rif || "",
        is_default: formIsDefault,
      };

      const res = await fetchClient(`/api/cxp/suppliers/${supplierId}/bank-accounts`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.message || "Error al registrar cuenta bancaria");
      }

      toast.success("Cuenta bancaria registrada exitosamente");
      setFormAccountNumber("");
      setFormBankId("");
      setFormBankName("");
      setFormIsDefault(false);
      setShowAddAccountForm(false);
      fetchDetails();
    } catch (err: any) {
      toast.error(err.message || "No se pudo guardar la cuenta");
    } finally {
      setIsSubmittingAccount(false);
    }
  };

  const handleDeleteAccount = async (accountId: string) => {
    if (!supplierId) return;
    if (!confirm("¿Está seguro de eliminar esta cuenta bancaria?")) return;

    setDeletingAccountId(accountId);
    try {
      const res = await fetchClient(`/api/cxp/suppliers/${supplierId}/bank-accounts/${accountId}`, {
        method: "DELETE",
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.message || "Error al eliminar cuenta bancaria");
      }

      toast.success("Cuenta bancaria eliminada");
      fetchDetails();
    } catch (err: any) {
      toast.error(err.message || "No se pudo eliminar la cuenta");
    } finally {
      setDeletingAccountId(null);
    }
  };

  const invoiceMetrics = useMemo(() => {
    const list = details?.invoices || [];
    let activeVES = 0;
    let activeUSD = 0;
    let paidVES = 0;
    let paidUSD = 0;

    for (const inv of list) {
      const isVES = inv.currency === "VES";
      if (inv.status === "PENDIENTE" || inv.status === "PROGRAMADO") {
        if (isVES) activeVES += inv.total_amount;
        else activeUSD += inv.total_amount;
      } else if (inv.status === "PAGADO") {
        if (isVES) paidVES += inv.paid_amount || inv.total_amount;
        else paidUSD += inv.paid_amount || inv.total_amount;
      }
    }

    return {
      total: list.length,
      activeVES,
      activeUSD,
      paidVES,
      paidUSD,
    };
  }, [details?.invoices]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-60 flex items-center justify-center p-3 sm:p-4 bg-black/60 backdrop-blur-xs overflow-y-auto">
      <div className="bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-3xl max-w-4xl w-full p-5 sm:p-6 shadow-2xl space-y-5 my-6 max-h-[92vh] overflow-y-auto custom-scrollbar flex flex-col">
        <div className="flex items-start justify-between pb-4 border-b border-neutral-100 dark:border-neutral-800 gap-4">
          <div className="space-y-1.5 min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <span className="p-1.5 rounded-xl bg-locatel-medio/10 text-locatel-medio dark:bg-emerald-950/40 dark:text-emerald-400">
                <Building2 className="w-5 h-5" />
              </span>
              <h2 className="text-lg sm:text-xl font-extrabold text-neutral-900 dark:text-neutral-100 tracking-tight truncate">
                {details?.business_name || details?.supplier?.business_name || "Detalle del Proveedor"}
              </h2>
            </div>

            <div className="flex flex-wrap items-center gap-2 pt-0.5">
              <span className="font-mono text-xs font-bold px-2.5 py-0.5 rounded-lg bg-neutral-100 dark:bg-neutral-800 text-neutral-800 dark:text-neutral-200 border border-neutral-200 dark:border-neutral-700">
                {details?.rif || details?.supplier?.rif || "---"}
              </span>

              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-lg text-xs font-semibold bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800/60">
                <Clock className="w-3.5 h-3.5" />
                {details?.credit_days ?? details?.supplier?.credit_days ?? 0} días crédito
              </span>

              {(details?.sap_vendor_code || details?.supplier?.sap_vendor_code) && (
                <span className="font-mono text-xs font-bold px-2.5 py-0.5 rounded-lg bg-purple-50 dark:bg-purple-950/40 text-purple-700 dark:text-purple-300 border border-purple-200 dark:border-purple-800/60">
                  SAP: {details?.sap_vendor_code || details?.supplier?.sap_vendor_code}
                </span>
              )}

              {details?.is_active !== undefined && (
                <span
                  className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-lg text-xs font-semibold ${details.is_active
                    ? "bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300"
                    : "bg-neutral-100 text-neutral-500 dark:bg-neutral-800 dark:text-neutral-400"
                    }`}
                >
                  <span
                    className={`w-1.5 h-1.5 rounded-full ${details.is_active ? "bg-emerald-500" : "bg-neutral-400"
                      }`}
                  />
                  {details.is_active ? "Activo" : "Inactivo"}
                </span>
              )}
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 rounded-xl text-neutral-400 hover:text-neutral-700 dark:hover:text-neutral-200 hover:bg-neutral-100 dark:hover:bg-neutral-800 transition-colors cursor-pointer shrink-0"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-neutral-100 dark:border-neutral-800 pb-3">
          <div className="flex items-center gap-2">
            <button
              onClick={() => setActiveTab("accounts")}
              className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${activeTab === "accounts"
                ? "bg-locatel-medio text-white shadow-xs"
                : "text-neutral-600 dark:text-neutral-400 hover:bg-neutral-100 dark:hover:bg-neutral-800"
                }`}
            >
              <Landmark className="w-4 h-4" />
              <span>Cuentas Bancarias</span>
              <span
                className={`px-1.5 py-0.2 rounded-full text-[10px] font-extrabold ${activeTab === "accounts"
                  ? "bg-white/20 text-white"
                  : "bg-neutral-200 dark:bg-neutral-700 text-neutral-700 dark:text-neutral-300"
                  }`}
              >
                {details?.bank_accounts?.length || 0}
              </span>
            </button>

            <button
              onClick={() => setActiveTab("invoices")}
              className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${activeTab === "invoices"
                ? "bg-locatel-medio text-white shadow-xs"
                : "text-neutral-600 dark:text-neutral-400 hover:bg-neutral-100 dark:hover:bg-neutral-800"
                }`}
            >
              <FileText className="w-4 h-4" />
              <span>Facturas Asociadas</span>
              <span
                className={`px-1.5 py-0.2 rounded-full text-[10px] font-extrabold ${activeTab === "invoices"
                  ? "bg-white/20 text-white"
                  : "bg-neutral-200 dark:bg-neutral-700 text-neutral-700 dark:text-neutral-300"
                  }`}
              >
                {details?.invoices?.length || 0}
              </span>
            </button>
          </div>

          {activeTab === "invoices" && companies.length > 0 && (
            <div className="flex items-center gap-2">
              <span className="text-xs font-semibold text-neutral-500 dark:text-neutral-400">
                Empresa:
              </span>
              <select
                value={selectedCompanyId}
                onChange={(e) => setSelectedCompanyId(e.target.value)}
                className="text-xs font-medium px-2.5 py-1.5 rounded-xl border border-neutral-200 dark:border-neutral-700 bg-white dark:bg-neutral-800 text-neutral-800 dark:text-neutral-200 focus:outline-none focus:ring-1 focus:ring-locatel-medio cursor-pointer"
              >
                <option value="">Todas las empresas</option>
                {companies.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </select>
            </div>
          )}
        </div>

        {loading && !details ? (
          <div className="py-16 flex flex-col items-center justify-center text-neutral-400">
            <RefreshCw className="w-7 h-7 animate-spin text-locatel-medio mb-2" />
            <span className="text-xs font-semibold">Cargando detalles del proveedor...</span>
          </div>
        ) : (
          <div className="flex-1 space-y-4">
            {activeTab === "accounts" && (
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <p className="text-xs text-neutral-500 dark:text-neutral-400">
                    Cuentas receptoras autorizadas para dispersión y emisión de órdenes de pago.
                  </p>
                  {canEdit && !showAddAccountForm && (
                    <button
                      onClick={() => setShowAddAccountForm(true)}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-locatel-medio hover:bg-locatel-medio/90 text-white text-xs font-bold transition-all shadow-xs cursor-pointer"
                    >
                      <Plus className="w-3.5 h-3.5" />
                      <span>Agregar Cuenta Bancaria</span>
                    </button>
                  )}
                </div>

                {showAddAccountForm && (
                  <form
                    onSubmit={handleCreateAccount}
                    className="p-4 rounded-2xl border border-locatel-medio/30 bg-locatel-medio/5 dark:bg-emerald-950/20 space-y-3.5"
                  >
                    <div className="flex items-center justify-between pb-2 border-b border-neutral-200 dark:border-neutral-700">
                      <span className="text-xs font-bold text-neutral-900 dark:text-neutral-100 flex items-center gap-1.5">
                        <CreditCard className="w-4 h-4 text-locatel-medio" />
                        Registrar Nueva Cuenta Bancaria
                      </span>
                      <button
                        type="button"
                        onClick={() => setShowAddAccountForm(false)}
                        className="p-1 rounded-lg text-neutral-400 hover:text-neutral-700 dark:hover:text-neutral-200"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                      <div>
                        <label className="block text-xs font-bold text-neutral-700 dark:text-neutral-300 mb-1">
                          Banco Receptor
                        </label>
                        {banks.length > 0 ? (
                          <select
                            value={formBankId}
                            onChange={handleBankSelectChange}
                            className="w-full px-3 py-2 text-xs rounded-xl bg-white dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 text-neutral-900 dark:text-neutral-100 focus:outline-none focus:ring-1 focus:ring-locatel-medio"
                            required
                          >
                            <option value="">Seleccione Banco</option>
                            {banks.map((b) => (
                              <option key={b.id} value={b.id}>
                                {b.name} {b.code ? `(${b.code})` : ""}
                              </option>
                            ))}
                          </select>
                        ) : (
                          <input
                            type="text"
                            value={formBankName}
                            onChange={(e) => setFormBankName(e.target.value)}
                            placeholder="Ej. Banesco, Mercantil, BDV"
                            className="w-full px-3 py-2 text-xs rounded-xl bg-white dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 text-neutral-900 dark:text-neutral-100 focus:outline-none focus:ring-1 focus:ring-locatel-medio"
                            required
                          />
                        )}
                      </div>

                      <div>
                        <label className="block text-xs font-bold text-neutral-700 dark:text-neutral-300 mb-1">
                          Número de Cuenta (20 Dígitos)
                        </label>
                        <input
                          type="text"
                          inputMode="numeric"
                          maxLength={20}
                          value={formAccountNumber}
                          onChange={(e) => {
                            const val = e.target.value.replace(/\D/g, "");
                            setFormAccountNumber(val);
                          }}
                          placeholder="01020123456789012345"
                          className="w-full px-3 py-2 text-xs font-mono rounded-xl bg-white dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 text-neutral-900 dark:text-neutral-100 focus:outline-none focus:ring-1 focus:ring-locatel-medio"
                          required
                        />
                        <span className="text-[10px] text-neutral-400 dark:text-neutral-500 font-mono mt-0.5 block">
                          {formAccountNumber.length} / 20 dígitos
                        </span>
                      </div>

                      <div>
                        <label className="block text-xs font-bold text-neutral-700 dark:text-neutral-300 mb-1">
                          Tipo de Cuenta
                        </label>
                        <select
                          value={formAccountType}
                          onChange={(e) => setFormAccountType(e.target.value as "CORRIENTE" | "AHORRO")}
                          className="w-full px-3 py-2 text-xs rounded-xl bg-white dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 text-neutral-900 dark:text-neutral-100 focus:outline-none focus:ring-1 focus:ring-locatel-medio"
                        >
                          <option value="CORRIENTE">Corriente</option>
                          <option value="AHORRO">Ahorro</option>
                        </select>
                      </div>

                      <div>
                        <label className="block text-xs font-bold text-neutral-700 dark:text-neutral-300 mb-1">
                          Moneda
                        </label>
                        <select
                          value={formCurrency}
                          onChange={(e) => setFormCurrency(e.target.value as "VES" | "USD")}
                          className="w-full px-3 py-2 text-xs rounded-xl bg-white dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 text-neutral-900 dark:text-neutral-100 focus:outline-none focus:ring-1 focus:ring-locatel-medio"
                        >
                          <option value="VES">Bolívares (VES)</option>
                          <option value="USD">Dólares (USD)</option>
                        </select>
                      </div>

                      <div>
                        <label className="block text-xs font-bold text-neutral-700 dark:text-neutral-300 mb-1">
                          Nombre del Titular
                        </label>
                        <input
                          type="text"
                          value={formHolderName}
                          onChange={(e) => setFormHolderName(e.target.value)}
                          placeholder="Nombre o Razón Social"
                          className="w-full px-3 py-2 text-xs rounded-xl bg-white dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 text-neutral-900 dark:text-neutral-100 focus:outline-none focus:ring-1 focus:ring-locatel-medio"
                          required
                        />
                      </div>

                      <div>
                        <label className="block text-xs font-bold text-neutral-700 dark:text-neutral-300 mb-1">
                          RIF / Cédula del Titular
                        </label>
                        <input
                          type="text"
                          value={formHolderRIF}
                          onChange={(e) => setFormHolderRIF(e.target.value)}
                          placeholder="J-12345678-9"
                          className="w-full px-3 py-2 text-xs rounded-xl bg-white dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 text-neutral-900 dark:text-neutral-100 focus:outline-none focus:ring-1 focus:ring-locatel-medio"
                          required
                        />
                      </div>
                    </div>

                    <div className="flex items-center justify-between pt-2">
                      <label className="flex items-center gap-2 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={formIsDefault}
                          onChange={(e) => setFormIsDefault(e.target.checked)}
                          className="rounded border-neutral-300 text-locatel-medio focus:ring-locatel-medio cursor-pointer"
                        />
                        <span className="text-xs font-medium text-neutral-700 dark:text-neutral-300">
                          Establecer como cuenta bancaria principal
                        </span>
                      </label>

                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          onClick={() => setShowAddAccountForm(false)}
                          className="px-3 py-1.5 text-xs font-semibold text-neutral-600 dark:text-neutral-400 hover:bg-neutral-200 dark:hover:bg-neutral-700 rounded-xl transition-colors cursor-pointer"
                        >
                          Cancelar
                        </button>
                        <button
                          type="submit"
                          disabled={isSubmittingAccount}
                          className="px-4 py-1.5 text-xs font-bold text-white bg-locatel-medio hover:bg-locatel-medio/90 rounded-xl shadow-xs transition-all disabled:opacity-50 cursor-pointer"
                        >
                          {isSubmittingAccount ? "Guardando..." : "Guardar Cuenta"}
                        </button>
                      </div>
                    </div>
                  </form>
                )}

                {(!details?.bank_accounts || details.bank_accounts.length === 0) ? (
                  <div className="py-12 text-center rounded-2xl border border-dashed border-neutral-200 dark:border-neutral-800 text-neutral-400">
                    <Landmark className="w-8 h-8 mx-auto mb-2 text-neutral-300 dark:text-neutral-600" />
                    <p className="text-xs font-semibold">No hay cuentas bancarias registradas para este proveedor.</p>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
                    {details.bank_accounts.map((acc) => (
                      <div
                        key={acc.id}
                        className={`p-4 rounded-2xl border transition-all ${acc.is_default
                          ? "bg-amber-50/50 dark:bg-amber-950/20 border-amber-300 dark:border-amber-800/60 shadow-xs"
                          : "bg-white dark:bg-neutral-800/60 border-neutral-200 dark:border-neutral-700/80"
                          }`}
                      >
                        <div className="flex items-start justify-between gap-2 mb-2">
                          <div className="space-y-0.5">
                            <span className="text-xs font-bold text-neutral-900 dark:text-neutral-100 flex items-center gap-1.5">
                              <Landmark className="w-4 h-4 text-locatel-medio" />
                              {acc.bank_name}
                            </span>
                            <div className="flex items-center gap-1.5">
                              <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-neutral-100 dark:bg-neutral-700 text-neutral-700 dark:text-neutral-300">
                                {acc.account_type}
                              </span>
                              <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-100 dark:bg-emerald-950/40 text-emerald-800 dark:text-emerald-300">
                                {acc.currency}
                              </span>
                            </div>
                          </div>

                          <div className="flex items-center gap-1">
                            {acc.is_default && (
                              <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-100 text-amber-800 dark:bg-amber-950/60 dark:text-amber-300 border border-amber-200 dark:border-amber-800">
                                Principal
                              </span>
                            )}
                            {canEdit && (
                              <button
                                onClick={() => handleDeleteAccount(acc.id)}
                                disabled={deletingAccountId === acc.id}
                                className="p-1.5 rounded-lg text-neutral-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/40 transition-colors cursor-pointer"
                                title="Eliminar cuenta"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            )}
                          </div>
                        </div>

                        <div className="flex items-center justify-between p-2 rounded-xl bg-neutral-50 dark:bg-neutral-900 border border-neutral-100 dark:border-neutral-800 my-2.5">
                          <span className="font-mono text-xs font-bold tracking-wider text-neutral-900 dark:text-neutral-100">
                            {acc.account_number}
                          </span>
                          <button
                            onClick={() => handleCopyAccount(acc.id, acc.account_number)}
                            className="p-1 rounded-md text-neutral-400 hover:text-locatel-medio hover:bg-neutral-200 dark:hover:bg-neutral-800 transition-colors cursor-pointer"
                            title="Copiar número de cuenta"
                          >
                            {copiedAccountId === acc.id ? (
                              <Check className="w-3.5 h-3.5 text-emerald-500" />
                            ) : (
                              <Copy className="w-3.5 h-3.5" />
                            )}
                          </button>
                        </div>

                        <div className="text-[11px] text-neutral-500 dark:text-neutral-400 space-y-0.5 pt-1">
                          <p className="truncate">
                            <span className="font-semibold text-neutral-700 dark:text-neutral-300">Titular:</span>{" "}
                            {acc.holder_name}
                          </p>
                          <p>
                            <span className="font-semibold text-neutral-700 dark:text-neutral-300">RIF:</span>{" "}
                            {acc.holder_rif}
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {activeTab === "invoices" && (
              <div className="space-y-4">
                {(!details?.invoices || details.invoices.length === 0) ? (
                  <div className="py-12 text-center rounded-2xl border border-dashed border-neutral-200 dark:border-neutral-800 text-neutral-400">
                    <FileText className="w-8 h-8 mx-auto mb-2 text-neutral-300 dark:text-neutral-600" />
                    <p className="text-xs font-semibold">No se registran facturas para este proveedor en la empresa seleccionada.</p>
                  </div>
                ) : (
                  <>
                    <div className="rounded-2xl border border-neutral-200 dark:border-neutral-800 overflow-hidden shadow-xs">
                      <div className="overflow-x-auto max-h-[46vh]">
                        <table className="w-full text-left text-xs text-neutral-600 dark:text-neutral-400">
                          <thead className="bg-neutral-50 dark:bg-neutral-800/80 text-neutral-700 dark:text-neutral-300 font-bold uppercase tracking-wider text-[11px] border-b border-neutral-200 dark:border-neutral-800 sticky top-0 z-10 backdrop-blur-xs">
                            <tr>
                              <th className="py-2.5 px-3">N° Factura</th>
                              <th className="py-2.5 px-3 text-center">Tipo SAP</th>
                              <th className="py-2.5 px-3 text-center">Emisión</th>
                              <th className="py-2.5 px-3 text-center">Vencimiento</th>
                              <th className="py-2.5 px-3 text-right">Monto Total</th>
                              <th className="py-2.5 px-3 text-center">Estatus</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-neutral-100 dark:divide-neutral-800/60">
                            {details.invoices.map((inv) => {
                              const isVES = inv.currency === "VES";
                              return (
                                <tr
                                  key={inv.id}
                                  className="hover:bg-neutral-50/70 dark:hover:bg-neutral-800/30 transition-colors"
                                >
                                  <td className="py-2.5 px-3 font-mono font-bold text-neutral-900 dark:text-neutral-100">
                                    {inv.invoice_number}
                                  </td>
                                  <td className="py-2.5 px-3 text-center">
                                    <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-neutral-100 dark:bg-neutral-800 text-neutral-700 dark:text-neutral-300">
                                      {inv.sap_document_type}
                                    </span>
                                  </td>
                                  <td className="py-2.5 px-3 text-center text-neutral-600 dark:text-neutral-400">
                                    {inv.issue_date?.split("T")[0] || "---"}
                                  </td>
                                  <td className="py-2.5 px-3 text-center font-medium text-neutral-800 dark:text-neutral-200">
                                    {inv.due_date?.split("T")[0] || "---"}
                                  </td>
                                  <td className="py-2.5 px-3 text-right font-mono font-bold text-neutral-900 dark:text-neutral-100">
                                    {isVES ? "Bs. " : "$ "}
                                    {inv.total_amount?.toLocaleString("es-VE", {
                                      minimumFractionDigits: 2,
                                      maximumFractionDigits: 2,
                                    })}
                                  </td>
                                  <td className="py-2.5 px-3 text-center">
                                    {inv.status === "PENDIENTE" && (
                                      <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-100 text-amber-800 dark:bg-amber-950/60 dark:text-amber-300 border border-amber-200 dark:border-amber-800">
                                        PENDIENTE
                                      </span>
                                    )}
                                    {inv.status === "PROGRAMADO" && (
                                      <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold bg-purple-100 text-purple-800 dark:bg-purple-950/60 dark:text-purple-300 border border-purple-200 dark:border-purple-800">
                                        PROGRAMADO
                                      </span>
                                    )}
                                    {inv.status === "PAGADO" && (
                                      <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800">
                                        PAGADO
                                      </span>
                                    )}
                                    {inv.status === "ANULADO" && (
                                      <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold bg-neutral-100 text-neutral-500 line-through dark:bg-neutral-800 dark:text-neutral-400 border border-neutral-200 dark:border-neutral-700">
                                        ANULADO
                                      </span>
                                    )}
                                  </td>
                                </tr>
                              );
                            })}
                          </tbody>
                        </table>
                      </div>
                    </div>

                    <div className="p-3.5 rounded-2xl bg-neutral-50 dark:bg-neutral-800/40 border border-neutral-200/80 dark:border-neutral-700 grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
                      <div>
                        <span className="text-neutral-500 dark:text-neutral-400 block font-semibold text-[11px]">
                          Documentos Totales
                        </span>
                        <span className="font-extrabold text-neutral-900 dark:text-neutral-100 text-sm">
                          {invoiceMetrics.total} facturas
                        </span>
                      </div>

                      <div>
                        <span className="text-amber-700 dark:text-amber-400 block font-semibold text-[11px]">
                          Deuda Activa (Pendiente + Programado)
                        </span>
                        <div className="font-mono font-bold text-neutral-900 dark:text-neutral-100 text-xs">
                          {invoiceMetrics.activeVES > 0 && (
                            <span className="block">
                              Bs. {invoiceMetrics.activeVES.toLocaleString("es-VE", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                            </span>
                          )}
                          {invoiceMetrics.activeUSD > 0 && (
                            <span className="block text-emerald-700 dark:text-emerald-400">
                              $ {invoiceMetrics.activeUSD.toLocaleString("es-VE", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                            </span>
                          )}
                          {invoiceMetrics.activeVES === 0 && invoiceMetrics.activeUSD === 0 && (
                            <span>0,00</span>
                          )}
                        </div>
                      </div>

                      <div>
                        <span className="text-emerald-700 dark:text-emerald-400 block font-semibold text-[11px]">
                          Total Histórico Pagado
                        </span>
                        <div className="font-mono font-bold text-neutral-900 dark:text-neutral-100 text-xs">
                          {invoiceMetrics.paidVES > 0 && (
                            <span className="block">
                              Bs. {invoiceMetrics.paidVES.toLocaleString("es-VE", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                            </span>
                          )}
                          {invoiceMetrics.paidUSD > 0 && (
                            <span className="block text-emerald-700 dark:text-emerald-400">
                              $ {invoiceMetrics.paidUSD.toLocaleString("es-VE", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                            </span>
                          )}
                          {invoiceMetrics.paidVES === 0 && invoiceMetrics.paidUSD === 0 && (
                            <span>0,00</span>
                          )}
                        </div>
                      </div>
                    </div>
                  </>
                )}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
