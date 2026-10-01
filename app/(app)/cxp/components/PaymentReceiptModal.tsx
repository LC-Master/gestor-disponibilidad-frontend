"use client";

import { useEffect, useState } from "react";
import { CheckCircle2, Loader2, Printer, X } from "lucide-react";
import { fetchClient } from "@/lib/fetchClient";
import { PaymentDetailResponse } from "../types";

interface PaymentReceiptModalProps {
  paymentId: string | null;
  onClose: () => void;
}

export function PaymentReceiptModal({ paymentId, onClose }: PaymentReceiptModalProps) {
  const [data, setData] = useState<PaymentDetailResponse | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!paymentId) return;

    const fetchPaymentDetails = async () => {
      setLoading(true);
      try {
        const res = await fetchClient(`/api/cxp/payments/${paymentId}`);
        if (res.ok) {
          const json = await res.json();
          setData(json);
        } else {
          setData(null);
        }
      } catch {
        setData(null);
      } finally {
        setLoading(false);
      }
    };

    fetchPaymentDetails();
  }, [paymentId]);

  if (!paymentId) return null;

  const formatMoney = (val: number, cur: string = "VES") => {
    return (
      new Intl.NumberFormat("es-VE", {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
      }).format(val) +
      " " +
      cur
    );
  };

  const formatDate = (dateStr?: string) => {
    if (!dateStr) return "-";
    const parts = dateStr.split("T")[0].split("-");
    if (parts.length === 3) {
      return `${parts[2]}/${parts[1]}/${parts[0]}`;
    }
    return dateStr;
  };

  const payment = data?.payment;
  const invoices = data?.invoices || [];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs animate-in fade-in duration-200">
      <div className="bg-white dark:bg-neutral-900 w-full max-w-2xl rounded-3xl border border-neutral-200 dark:border-neutral-800 shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200 flex flex-col max-h-[90vh]">
        <div className="px-6 py-5 border-b border-neutral-100 dark:border-neutral-800 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-2xl bg-emerald-50 text-emerald-600 dark:bg-emerald-950/40 dark:text-emerald-400">
              <CheckCircle2 className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-neutral-900 dark:text-neutral-100">
                Comprobante de Liquidación de Pago
              </h3>
              <p className="text-xs text-neutral-400">
                Registro de egreso bancario y facturas saldadas
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-xl text-neutral-400 hover:text-neutral-700 dark:hover:text-neutral-200 hover:bg-neutral-100 dark:hover:bg-neutral-800 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-6 overflow-y-auto space-y-5 text-xs">
          {loading ? (
            <div className="py-16 text-center text-neutral-400 flex flex-col items-center justify-center gap-2">
              <Loader2 className="w-6 h-6 animate-spin text-locatel-medio" />
              <span>Cargando detalle del comprobante...</span>
            </div>
          ) : !payment ? (
            <div className="py-16 text-center text-neutral-400">
              No se encontró la información de la liquidación solicitada.
            </div>
          ) : (
            <>
              <div className="p-4 rounded-2xl bg-neutral-50 dark:bg-neutral-800/50 border border-neutral-200/70 dark:border-neutral-700/60 grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <span className="text-[10px] uppercase font-bold text-neutral-400 block">
                    Empresa Pagadora
                  </span>
                  <p className="font-semibold text-neutral-900 dark:text-neutral-100 text-sm mt-0.5">
                    {payment.company_name}
                  </p>
                  <p className="text-[11px] text-neutral-500 font-mono">
                    Cuenta: {payment.bank_name} (•••• {payment.account_number.slice(-4)})
                  </p>
                </div>

                <div>
                  <span className="text-[10px] uppercase font-bold text-neutral-400 block">
                    Referencia Bancaria
                  </span>
                  <p className="font-mono font-bold text-neutral-900 dark:text-neutral-100 text-sm mt-0.5">
                    {payment.reference_number}
                  </p>
                  <p className="text-[11px] text-neutral-500">
                    Fecha de Débito: {formatDate(payment.payment_date)}
                  </p>
                </div>

                <div>
                  <span className="text-[10px] uppercase font-bold text-neutral-400 block">
                    Liquidado por
                  </span>
                  <p className="font-medium text-neutral-800 dark:text-neutral-200 mt-0.5">
                    {payment.created_by_name || "Usuario del Sistema"}
                  </p>
                </div>

                <div>
                  <span className="text-[10px] uppercase font-bold text-neutral-400 block">
                    Monto Total Liquidado
                  </span>
                  <p className="text-base font-extrabold font-mono text-emerald-600 dark:text-emerald-400 mt-0.5">
                    Bs. {formatMoney(payment.total_paid, "VES")}
                  </p>
                </div>
              </div>

              <div>
                <div className="flex items-center justify-between mb-2">
                  <h4 className="font-bold text-neutral-800 dark:text-neutral-200 text-xs">
                    Facturas Cubiertas en este Pago ({invoices.length})
                  </h4>
                </div>

                <div className="border border-neutral-200 dark:border-neutral-800 rounded-2xl overflow-hidden">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-neutral-50 dark:bg-neutral-800/60 text-neutral-600 dark:text-neutral-400 text-[10px] uppercase font-bold border-b border-neutral-200 dark:border-neutral-800">
                      <tr>
                        <th className="py-2.5 px-3">Proveedor</th>
                        <th className="py-2.5 px-3">N° Factura</th>
                        <th className="py-2.5 px-3">Tipo SAP</th>
                        <th className="py-2.5 px-3 text-right">Monto Factura</th>
                        <th className="py-2.5 px-3 text-right">Monto Pagado</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-neutral-100 dark:divide-neutral-800">
                      {invoices.map((inv) => (
                        <tr key={inv.invoice_id} className="hover:bg-neutral-50/50 dark:hover:bg-neutral-800/40">
                          <td className="py-2.5 px-3">
                            <span className="font-mono font-semibold text-neutral-900 dark:text-neutral-100 block">
                              {inv.supplier_rif}
                            </span>
                            <span className="text-[10px] text-neutral-400 truncate max-w-45 block">
                              {inv.supplier_name}
                            </span>
                          </td>
                          <td className="py-2.5 px-3 font-mono font-bold text-neutral-900 dark:text-neutral-100">
                            {inv.invoice_number}
                          </td>
                          <td className="py-2.5 px-3 font-mono text-[10px] text-neutral-500">
                            {inv.sap_document_type}
                          </td>
                          <td className="py-2.5 px-3 text-right font-mono text-neutral-600 dark:text-neutral-400">
                            {formatMoney(inv.total_amount, inv.currency)}
                          </td>
                          <td className="py-2.5 px-3 text-right font-mono font-bold text-emerald-600 dark:text-emerald-400">
                            {formatMoney(inv.amount_paid, "VES")}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </>
          )}
        </div>

        <div className="px-6 py-4 border-t border-neutral-100 dark:border-neutral-800 flex items-center justify-between bg-neutral-50/40 dark:bg-neutral-900/60">
          <button
            type="button"
            onClick={() => window.print()}
            className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-semibold text-neutral-700 dark:text-neutral-300 bg-neutral-100 hover:bg-neutral-200 dark:bg-neutral-800 dark:hover:bg-neutral-700 transition-colors cursor-pointer"
          >
            <Printer className="w-3.5 h-3.5" />
            <span>Imprimir</span>
          </button>

          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 rounded-xl text-xs font-semibold text-neutral-600 dark:text-neutral-400 hover:bg-neutral-100 dark:hover:bg-neutral-800 transition-colors cursor-pointer"
          >
            Cerrar
          </button>
        </div>
      </div>
    </div>
  );
}
