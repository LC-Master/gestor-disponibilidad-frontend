"use client";

import { useEffect, useState } from "react";
import { CheckCircle2, Loader2, X, TrendingUp, TrendingDown, ArrowRight, DollarSign } from "lucide-react";
import { toast } from "sonner";
import { fetchClient } from "@/lib/fetchClient";
import { Invoice, DifferentialResponse } from "../types";
import { getDifferential } from "@/lib/exchangeRates";

interface BankAccountOption {
  id: string;
  company_id: string;
  bank_name?: string;
  bank?: { name: string };
  account_type?: string;
  account_number: string;
  currency?: string;
}

interface ExecutePaymentModalProps {
  isOpen: boolean;
  onClose: () => void;
  invoices: Invoice[];
  companyId: string;
  onSuccess: () => void;
}

export function ExecutePaymentModal({
  isOpen,
  onClose,
  invoices,
  companyId,
  onSuccess,
}: ExecutePaymentModalProps) {
  const [bankAccounts, setBankAccounts] = useState<BankAccountOption[]>([]);
  const [loadingAccounts, setLoadingAccounts] = useState(false);
  const [selectedAccountId, setSelectedAccountId] = useState("");
  const [referenceNumber, setReferenceNumber] = useState("");
  const [paymentDate, setPaymentDate] = useState(() =>
    new Date().toISOString().split("T")[0]
  );
  const [submitting, setSubmitting] = useState(false);
  const [differential, setDifferential] = useState<DifferentialResponse | null>(null);
  const [loadingDiff, setLoadingDiff] = useState(false);

  useEffect(() => {
    if (!isOpen || !companyId) return;

    const fetchAccounts = async () => {
      setLoadingAccounts(true);
      try {
        const res = await fetchClient(`/api/treasury/bank-accounts?company_id=${companyId}`);
        if (res.ok) {
          const data = await res.json();
          const list = Array.isArray(data) ? data : [];
          setBankAccounts(list);
          if (list.length > 0) {
            setSelectedAccountId(list[0].id);
          }
        }
      } catch (err) {
        console.error(err);
      } finally {
        setLoadingAccounts(false);
      }
    };

    fetchAccounts();
    setReferenceNumber("");
  }, [isOpen, companyId]);

  const foreignInvoice = invoices.find((inv) => inv.currency !== "VES") || invoices[0];

  useEffect(() => {
    if (!isOpen || !foreignInvoice || !paymentDate) return;

    const issueDateStr = foreignInvoice.issue_date
      ? foreignInvoice.issue_date.split("T")[0]
      : "";
    if (!issueDateStr) return;

    const bcvCurrency = foreignInvoice.currency === "EUR" ? "Euro" : "Dolar";

    const fetchDiff = async () => {
      setLoadingDiff(true);
      try {
        const data = await getDifferential(bcvCurrency, issueDateStr, paymentDate);
        setDifferential(data);
      } catch {
        setDifferential(null);
      } finally {
        setLoadingDiff(false);
      }
    };

    fetchDiff();
  }, [isOpen, foreignInvoice, paymentDate]);

  if (!isOpen) return null;

  let totalVES = 0;
  let totalUSD = 0;
  let totalForeignAmount = 0;

  for (const inv of invoices) {
    const amount = inv.net_amount > 0 ? inv.net_amount : inv.total_amount;
    if (inv.currency === "VES") {
      totalVES += amount;
      totalUSD += inv.exchange_rate > 1.0 ? amount / inv.exchange_rate : amount / 36.50;
    } else {
      totalForeignAmount += amount;
      totalUSD += amount;
      totalVES += amount * (inv.exchange_rate || 36.50);
    }
  }

  const formatNumber = (num: number) => {
    return num.toLocaleString("es-VE", {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    });
  };

  const differentialTotalBs = differential && totalForeignAmount > 0
    ? totalForeignAmount * differential.absolute_difference
    : 0;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!selectedAccountId) {
      toast.error("Seleccione una cuenta bancaria pagadora");
      return;
    }

    if (!referenceNumber.trim()) {
      toast.error("Ingrese el número de referencia bancaria");
      return;
    }

    if (!paymentDate) {
      toast.error("Indique la fecha de débito");
      return;
    }

    setSubmitting(true);
    try {
      const payload = {
        company_id: companyId,
        bank_account_id: selectedAccountId,
        reference_number: referenceNumber.trim(),
        payment_date: paymentDate,
        invoice_ids: invoices.map((inv) => inv.id),
      };

      const res = await fetchClient("/api/cxp/payments/execute", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.message || "Error al liquidar pago");
      }

      toast.success("Pago liquidado y facturas cerradas como PAGADO");
      onSuccess();
      onClose();
    } catch (err: any) {
      toast.error(err.message || "Error al ejecutar liquidación de pago");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs animate-in fade-in duration-200">
      <div className="bg-white dark:bg-neutral-900 w-full max-w-xl rounded-3xl border border-neutral-200 dark:border-neutral-800 shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200 max-h-[92vh] overflow-y-auto custom-scrollbar">
        <div className="px-6 py-5 border-b border-neutral-100 dark:border-neutral-800 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-2xl bg-emerald-50 text-emerald-600 dark:bg-emerald-950/40 dark:text-emerald-400">
              <CheckCircle2 className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-neutral-900 dark:text-neutral-100">
                Liquidar y Cerrar Pago de Facturas
              </h3>
              <p className="text-xs text-neutral-400">
                Transición de estatus PROGRAMADO a PAGADO
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-xl text-neutral-400 hover:text-neutral-700 dark:hover:text-neutral-200 hover:bg-neutral-100 dark:hover:bg-neutral-800 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div className="p-4 rounded-2xl bg-neutral-50 dark:bg-neutral-800/40 border border-neutral-200/70 dark:border-neutral-700/60 space-y-3">
            <div className="flex items-center justify-between text-xs">
              <span className="text-neutral-500 dark:text-neutral-400">
                Facturas a liquidar:
              </span>
              <span className="font-bold font-mono text-neutral-900 dark:text-neutral-100">
                {invoices.length} {invoices.length === 1 ? "factura" : "facturas"}
              </span>
            </div>

            <div className="pt-2 border-t border-neutral-200/60 dark:border-neutral-700/60 grid grid-cols-2 gap-3">
              <div>
                <span className="text-[11px] text-neutral-400">Total Liquidado (VES):</span>
                <p className="text-sm font-extrabold font-mono text-emerald-600 dark:text-emerald-400">
                  Bs. {formatNumber(totalVES)}
                </p>
              </div>
              <div>
                <span className="text-[11px] text-neutral-400">Equivalente Divisa (USD):</span>
                <p className="text-sm font-extrabold font-mono text-neutral-900 dark:text-neutral-100">
                  ${formatNumber(totalUSD)}
                </p>
              </div>
            </div>
          </div>

          {foreignInvoice && (
            <div className="p-4 rounded-2xl bg-neutral-50 dark:bg-neutral-800/40 border border-neutral-200/70 dark:border-neutral-700/60 space-y-2.5">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-neutral-800 dark:text-neutral-200 flex items-center gap-1.5">
                  <DollarSign className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                  Cálculo de Diferencial Cambiario (BCV)
                </span>
                {loadingDiff && <Loader2 className="w-3.5 h-3.5 animate-spin text-neutral-400" />}
              </div>

              {differential ? (
                <div className="space-y-2 text-xs">
                  <div className="flex items-center justify-between py-1 border-b border-neutral-200/60 dark:border-neutral-700/60">
                    <span className="text-neutral-500 dark:text-neutral-400">Tasa Emisión vs Pago:</span>
                    <div className="flex items-center gap-2 font-mono font-bold">
                      <span className="text-neutral-700 dark:text-neutral-300">
                        Bs. {differential.issue_rate.toFixed(4)}
                      </span>
                      <ArrowRight className="w-3 h-3 text-neutral-400" />
                      <span className="text-emerald-600 dark:text-emerald-400">
                        Bs. {differential.payment_rate.toFixed(4)}
                      </span>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-2 py-1">
                    <div>
                      <span className="text-[11px] text-neutral-400">Dif. Absoluta por Divisa:</span>
                      <p className="font-mono font-bold text-neutral-800 dark:text-neutral-200">
                        Bs. {differential.absolute_difference.toFixed(4)}
                      </p>
                    </div>
                    <div>
                      <span className="text-[11px] text-neutral-400">Variación Porcentual:</span>
                      <p className={`font-mono font-bold flex items-center gap-1 ${
                        differential.percentage_difference >= 0
                          ? "text-rose-600 dark:text-rose-400"
                          : "text-emerald-600 dark:text-emerald-400"
                      }`}>
                        {differential.percentage_difference >= 0 ? (
                          <TrendingUp className="w-3.5 h-3.5" />
                        ) : (
                          <TrendingDown className="w-3.5 h-3.5" />
                        )}
                        {differential.percentage_difference >= 0 ? "+" : ""}
                        {differential.percentage_difference.toFixed(2)}%
                      </p>
                    </div>
                  </div>

                  <div className="pt-2 border-t border-neutral-200/60 dark:border-neutral-700/60 flex items-center justify-between">
                    <div>
                      <span className="text-[11px] text-neutral-500 font-semibold">
                        Ajuste Cambiario Total:
                      </span>
                      <p className="text-[10px] text-neutral-400">
                        {differentialTotalBs >= 0 ? "Pérdida en cambio (mayor desembolso Bs)" : "Ganancia en cambio"}
                      </p>
                    </div>
                    <span className={`font-mono font-extrabold text-sm ${
                      differentialTotalBs >= 0 ? "text-amber-600 dark:text-amber-400" : "text-emerald-600 dark:text-emerald-400"
                    }`}>
                      {differentialTotalBs >= 0 ? "+" : ""}
                      Bs. {formatNumber(differentialTotalBs)}
                    </span>
                  </div>
                </div>
              ) : (
                <p className="text-[11px] text-neutral-400">
                  {loadingDiff ? "Calculando tasas y variación..." : "Las facturas seleccionadas son en Bolívares o no requieren diferencial."}
                </p>
              )}
            </div>
          )}

          <div className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-neutral-700 dark:text-neutral-300 mb-1.5">
                Cuenta Bancaria Pagadora *
              </label>
              {loadingAccounts ? (
                <div className="p-2.5 text-xs text-neutral-400 flex items-center gap-2">
                  <Loader2 className="w-4 h-4 animate-spin text-locatel-medio" />
                  Cargando cuentas bancarias...
                </div>
              ) : bankAccounts.length === 0 ? (
                <p className="text-xs text-amber-600 dark:text-amber-400">
                  No se encontraron cuentas bancarias para esta empresa.
                </p>
              ) : (
                <select
                  value={selectedAccountId}
                  onChange={(e) => setSelectedAccountId(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-neutral-200 dark:border-neutral-700 bg-white dark:bg-neutral-800 text-xs font-medium text-neutral-900 dark:text-neutral-100 focus:outline-none focus:ring-2 focus:ring-locatel-medio/20 focus:border-locatel-medio cursor-pointer"
                >
                  {bankAccounts.map((acc) => {
                    const bName = acc.bank?.name || acc.bank_name || "Banco";
                    const last4 = acc.account_number
                      ? acc.account_number.slice(-4)
                      : "0000";
                    return (
                      <option key={acc.id} value={acc.id}>
                        {bName} - {acc.account_type || "Corriente"} (•••• {last4}) {acc.currency ? `[${acc.currency}]` : ""}
                      </option>
                    );
                  })}
                </select>
              )}
            </div>

            <div>
              <label className="block text-xs font-semibold text-neutral-700 dark:text-neutral-300 mb-1.5">
                Referencia Bancaria del Pago *
              </label>
              <input
                type="text"
                autoComplete="off"
                placeholder="Ej. REF-89218291"
                value={referenceNumber}
                onChange={(e) => setReferenceNumber(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-xl border border-neutral-200 dark:border-neutral-700 bg-white dark:bg-neutral-800 text-xs font-mono text-neutral-900 dark:text-neutral-100 placeholder:text-neutral-400 focus:outline-none focus:ring-2 focus:ring-locatel-medio/20 focus:border-locatel-medio"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-neutral-700 dark:text-neutral-300 mb-1.5">
                Fecha de Débito Bancario *
              </label>
              <input
                type="date"
                value={paymentDate}
                onChange={(e) => setPaymentDate(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-xl border border-neutral-200 dark:border-neutral-700 bg-white dark:bg-neutral-800 text-xs font-mono text-neutral-900 dark:text-neutral-100 focus:outline-none focus:ring-2 focus:ring-locatel-medio/20 focus:border-locatel-medio"
              />
            </div>
          </div>

          <div className="pt-3 flex items-center justify-end gap-3 border-t border-neutral-100 dark:border-neutral-800">
            <button
              type="button"
              onClick={onClose}
              disabled={submitting}
              className="px-4 py-2.5 rounded-xl text-xs font-semibold text-neutral-600 dark:text-neutral-400 hover:bg-neutral-100 dark:hover:bg-neutral-800 transition-colors cursor-pointer"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={submitting || bankAccounts.length === 0}
              className="px-5 py-2.5 rounded-xl text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-700 shadow-xs transition-all cursor-pointer flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {submitting ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Procesando Liquidación...</span>
                </>
              ) : (
                <>
                  <CheckCircle2 className="w-4 h-4" />
                  <span>Confirmar y Cerrar Pago</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
