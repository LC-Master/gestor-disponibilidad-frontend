"use client";

import { useEffect, useState } from "react";
import {
  AlertTriangle,
  Building2,
  Calendar,
  CheckCircle2,
  Clock,
  ExternalLink,
  FileText,
  RefreshCw,
  X,
  XCircle,
} from "lucide-react";
import { toast } from "sonner";
import { fetchClient } from "@/lib/fetchClient";
import { Invoice } from "../types";

interface InvoiceDetailModalProps {
  isOpen: boolean;
  onClose: () => void;
  invoiceId?: string | null;
  invoice?: Invoice | null;
  onOpenSupplier?: (supplierId: string) => void;
}

export function InvoiceDetailModal({
  isOpen,
  onClose,
  invoiceId,
  invoice: initialInvoice,
  onOpenSupplier,
}: InvoiceDetailModalProps) {
  const [invoice, setInvoice] = useState<Invoice | null>(initialInvoice || null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!isOpen) {
      setInvoice(null);
      return;
    }

    if (initialInvoice) {
      setInvoice(initialInvoice);
      return;
    }

    if (invoiceId) {
      fetchInvoice(invoiceId);
    }
  }, [isOpen, invoiceId, initialInvoice]);

  const fetchInvoice = async (id: string) => {
    setLoading(true);
    try {
      const res = await fetchClient(`/api/cxp/invoices/${id}`);
      if (!res.ok) {
        throw new Error("No se pudo obtener la información de la factura");
      }
      const data: Invoice = await res.json();
      setInvoice(data);
    } catch (err: any) {
      toast.error(err.message || "Error al cargar la factura");
      onClose();
    } finally {
      setLoading(false);
    }
  };

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

  const formatDate = (str?: string) => {
    if (!str) return "-";
    const parts = str.split("T")[0].split("-");
    if (parts.length === 3) {
      return `${parts[2]}/${parts[1]}/${parts[0]}`;
    }
    return str;
  };

  if (!isOpen) return null;

  const renderStatusBadge = (status: string) => {
    switch (status) {
      case "PENDIENTE":
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-amber-50 dark:bg-amber-950/40 text-amber-700 dark:text-amber-400 border border-amber-200 dark:border-amber-800/60">
            <Clock className="w-3 h-3" />
            PENDIENTE
          </span>
        );
      case "EN_PROPUESTA":
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-purple-50 dark:bg-purple-950/40 text-purple-700 dark:text-purple-300 border border-purple-200 dark:border-purple-800/60">
            <FileText className="w-3 h-3" />
            EN PROPUESTA
          </span>
        );
      case "PROGRAMADO":
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800/60">
            <Calendar className="w-3 h-3" />
            PROGRAMADO
          </span>
        );
      case "PAGADO":
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-teal-50 dark:bg-teal-950/40 text-teal-700 dark:text-teal-300 border border-teal-200 dark:border-teal-800/60">
            <CheckCircle2 className="w-3 h-3" />
            PAGADO
          </span>
        );
      case "ANULADO":
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-rose-50 dark:bg-rose-950/40 text-rose-700 dark:text-rose-400 border border-rose-200 dark:border-rose-800/60">
            <XCircle className="w-3 h-3" />
            ANULADO
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-neutral-100 dark:bg-neutral-800 text-neutral-700 dark:text-neutral-300">
            {status}
          </span>
        );
    }
  };

  return (
    <div className="fixed inset-0 z-60 flex items-center justify-center p-4 bg-neutral-950/70 backdrop-blur-xs animate-in fade-in duration-200">
      <div className="bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-2xl w-full max-w-lg shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200 flex flex-col max-h-[90vh]">
        <div className="px-5 py-4 border-b border-neutral-200 dark:border-neutral-800 flex items-center justify-between bg-neutral-50/70 dark:bg-neutral-800/40">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-locatel-medio/10 text-locatel-medio border border-locatel-medio/20">
              <FileText className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-neutral-900 dark:text-neutral-100 font-mono">
                {invoice ? `Factura N° ${invoice.invoice_number}` : "Cargando Factura..."}
              </h3>
              {invoice && (
                <p className="text-[11px] text-neutral-500 dark:text-neutral-400">
                  Tipo SAP: <span className="font-semibold text-neutral-700 dark:text-neutral-300">{invoice.sap_document_type}</span> • Tipo:{" "}
                  <span className="font-semibold text-neutral-700 dark:text-neutral-300">{invoice.invoice_type}</span>
                </p>
              )}
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-neutral-400 hover:text-neutral-600 dark:hover:text-neutral-200 rounded-lg hover:bg-neutral-100 dark:hover:bg-neutral-800 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-5 space-y-4 overflow-y-auto flex-1 text-xs">
          {loading ? (
            <div className="py-16 text-center text-neutral-400 flex flex-col items-center justify-center gap-2">
              <RefreshCw className="w-6 h-6 animate-spin text-locatel-medio" />
              <span className="text-xs font-semibold">Cargando datos de la factura...</span>
            </div>
          ) : !invoice ? (
            <div className="py-12 text-center text-neutral-400">
              <AlertTriangle className="w-8 h-8 mx-auto mb-2 text-amber-500" />
              <p>No se encontraron datos para esta factura.</p>
            </div>
          ) : (
            <>
              <div className="grid grid-cols-2 gap-3 p-3.5 rounded-xl bg-neutral-50 dark:bg-neutral-800/60 border border-neutral-200/80 dark:border-neutral-800">
                <div>
                  <span className="text-[10px] uppercase font-bold text-neutral-400 block mb-0.5">
                    Empresa
                  </span>
                  <p className="font-semibold text-neutral-900 dark:text-neutral-100 flex items-center gap-1.5">
                    <Building2 className="w-3.5 h-3.5 text-neutral-400" />
                    {invoice.company?.name || invoice.company?.alias || invoice.company_id}
                  </p>
                </div>
                <div>
                  <span className="text-[10px] uppercase font-bold text-neutral-400 block mb-0.5">
                    Estatus
                  </span>
                  <div className="mt-0.5">
                    {renderStatusBadge(invoice.status)}
                  </div>
                </div>

                <div className="col-span-2 pt-2 border-t border-neutral-200/60 dark:border-neutral-700/60">
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] uppercase font-bold text-neutral-400">
                      Proveedor
                    </span>
                    {onOpenSupplier && (
                      <button
                        type="button"
                        onClick={() => onOpenSupplier(invoice.supplier_id)}
                        className="text-[11px] font-semibold text-locatel-medio hover:text-emerald-700 dark:text-emerald-400 dark:hover:text-emerald-300 inline-flex items-center gap-1 cursor-pointer transition-colors"
                      >
                        <span>Ver Ficha / Cuentas</span>
                        <ExternalLink className="w-3 h-3" />
                      </button>
                    )}
                  </div>
                  <p className="font-semibold text-neutral-900 dark:text-neutral-100 mt-0.5">
                    <span className="font-mono text-neutral-700 dark:text-neutral-300">
                      {invoice.supplier?.rif || "RIF N/D"}
                    </span>{" "}
                    - {invoice.supplier?.business_name || "Proveedor"}
                  </p>
                  {invoice.supplier?.credit_days !== undefined && (
                    <p className="text-[11px] text-neutral-400 mt-0.5">
                      Condición de crédito: <strong className="text-neutral-600 dark:text-neutral-300">{invoice.supplier.credit_days} días</strong>
                      {invoice.supplier.sap_vendor_code && (
                        <span> • Código SAP: <strong className="font-mono text-neutral-600 dark:text-neutral-300">{invoice.supplier.sap_vendor_code}</strong></span>
                      )}
                    </p>
                  )}
                </div>
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div className="p-2.5 rounded-xl border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-900">
                  <span className="text-[10px] uppercase font-bold text-neutral-400 block mb-0.5">
                    F. Emisión
                  </span>
                  <p className="font-mono font-medium text-neutral-900 dark:text-neutral-100">
                    {formatDate(invoice.issue_date)}
                  </p>
                </div>
                <div className="p-2.5 rounded-xl border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-900">
                  <span className="text-[10px] uppercase font-bold text-neutral-400 block mb-0.5">
                    F. Recepción (MIGO)
                  </span>
                  <p className="font-mono font-medium text-neutral-900 dark:text-neutral-100">
                    {formatDate(invoice.reception_date)}
                  </p>
                </div>
                <div className="p-2.5 rounded-xl border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-900">
                  <span className="text-[10px] uppercase font-bold text-neutral-400 block mb-0.5">
                    F. Vencimiento
                  </span>
                  <p className="font-mono font-medium text-neutral-900 dark:text-neutral-100">
                    {formatDate(invoice.due_date)}
                  </p>
                </div>
              </div>

              <div className="p-3.5 rounded-xl border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-900 space-y-2">
                <div className="flex justify-between items-center text-neutral-500 dark:text-neutral-400">
                  <span>N° de Control:</span>
                  <span className="font-mono font-semibold text-neutral-800 dark:text-neutral-200">
                    {invoice.control_number || "N/A"}
                  </span>
                </div>
                <div className="flex justify-between items-center text-neutral-500 dark:text-neutral-400">
                  <span>Subtotal:</span>
                  <span className="font-mono text-neutral-800 dark:text-neutral-200">
                    {formatMoney(invoice.subtotal, invoice.currency)}
                  </span>
                </div>
                <div className="flex justify-between items-center text-neutral-500 dark:text-neutral-400">
                  <span>Impuesto (IVA):</span>
                  <span className="font-mono text-neutral-800 dark:text-neutral-200">
                    {formatMoney(invoice.tax_amount, invoice.currency)}
                  </span>
                </div>
                <div className="flex justify-between items-center text-neutral-500 dark:text-neutral-400">
                  <span>Tasa de Cambio (BCV):</span>
                  <span className="font-mono text-neutral-800 dark:text-neutral-200">
                    Bs. {invoice.exchange_rate.toFixed(4)}
                  </span>
                </div>

                <div className="pt-2 border-t border-neutral-200 dark:border-neutral-800 flex justify-between items-center">
                  <span className="font-bold text-neutral-900 dark:text-neutral-100">Monto Total:</span>
                  <span className="font-mono font-extrabold text-sm text-locatel-medio dark:text-emerald-400">
                    {formatMoney(invoice.total_amount, invoice.currency)}
                  </span>
                </div>

                {invoice.currency === "USD" && (
                  <div className="flex justify-between items-center text-[11px] text-neutral-500 dark:text-neutral-400">
                    <span>Equivalente en VES:</span>
                    <span className="font-mono font-semibold text-neutral-700 dark:text-neutral-300">
                      Bs. {formatMoney(invoice.total_amount * invoice.exchange_rate, "VES")}
                    </span>
                  </div>
                )}

                {invoice.currency === "VES" && invoice.exchange_rate > 0 && (
                  <div className="flex justify-between items-center text-[11px] text-neutral-500 dark:text-neutral-400">
                    <span>Equivalente en USD:</span>
                    <span className="font-mono font-semibold text-neutral-700 dark:text-neutral-300">
                      ≈ ${formatMoney(invoice.total_amount / invoice.exchange_rate, "USD")}
                    </span>
                  </div>
                )}

                {invoice.paid_amount > 0 && (
                  <div className="pt-2 border-t border-neutral-100 dark:border-neutral-800 flex justify-between items-center text-[11px]">
                    <span className="text-neutral-500">Monto Pagado:</span>
                    <span className="font-mono font-semibold text-emerald-600 dark:text-emerald-400">
                      {formatMoney(invoice.paid_amount, invoice.currency)}
                    </span>
                  </div>
                )}
              </div>
            </>
          )}

          <div className="flex justify-end pt-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 bg-neutral-100 hover:bg-neutral-200 dark:bg-neutral-800 dark:hover:bg-neutral-700 text-neutral-800 dark:text-neutral-200 text-xs font-semibold rounded-xl transition-colors cursor-pointer"
            >
              Cerrar
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
