"use client";

import { useEffect, useState } from "react";
import { CheckCircle2, Loader2, X } from "lucide-react";
import { toast } from "sonner";
import { fetchClient } from "@/lib/fetchClient";
import { Invoice } from "../types";

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

  if (!isOpen) return null;

  let totalVES = 0;
  let totalUSD = 0;
  for (const inv of invoices) {
    if (inv.currency === "VES") {
      totalVES += inv.total_amount;
      totalUSD +=
        inv.exchange_rate > 1.0
          ? inv.total_amount / inv.exchange_rate
          : inv.total_amount / 36.50;
    } else {
      totalUSD += inv.total_amount;
      totalVES += inv.total_amount * (inv.exchange_rate || 36.50);
    }
  }

  const formatNumber = (num: number) => {
    return num.toLocaleString("es-VE", {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    });
  };

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
      <div className="bg-white dark:bg-neutral-900 w-full max-w-xl rounded-3xl border border-neutral-200 dark:border-neutral-800 shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200">
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

        <form onSubmit={handleSubmit} className="p-6 space-y-5">
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
                <span className="text-[11px] text-neutral-400">Equivalente Aprox. (USD):</span>
                <p className="text-sm font-extrabold font-mono text-neutral-900 dark:text-neutral-100">
                  ${formatNumber(totalUSD)}
                </p>
              </div>
            </div>
          </div>

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
                type="text"
                inputMode="numeric"
                placeholder="YYYY-MM-DD"
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
