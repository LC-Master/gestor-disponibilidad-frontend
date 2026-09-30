"use client";

import { useEffect, useMemo, useState } from "react";
import { X, FileText, RefreshCw } from "lucide-react";
import { toast } from "sonner";
import { fetchClient } from "@/lib/fetchClient";
import { Company } from "@/app/(app)/tesoreria/types";
import { InvoiceType, SAPDocumentType, Supplier } from "../types";

interface CreateInvoiceModalProps {
  isOpen: boolean;
  onClose: () => void;
  companies: Company[];
  suppliers: Supplier[];
  onSuccess: () => void;
  defaultCompanyId?: string;
}

export function CreateInvoiceModal({
  isOpen,
  onClose,
  companies,
  suppliers,
  onSuccess,
  defaultCompanyId,
}: CreateInvoiceModalProps) {
  const [companyId, setCompanyId] = useState(defaultCompanyId || (companies[0]?.id ?? ""));
  const [supplierId, setSupplierId] = useState("");
  const [invoiceNumber, setInvoiceNumber] = useState("");
  const [controlNumber, setControlNumber] = useState("");
  const [invoiceType, setInvoiceType] = useState<InvoiceType>("FIRME");
  const [receptionDate, setReceptionDate] = useState(() => new Date().toISOString().split("T")[0]);
  const [issueDate, setIssueDate] = useState(() => new Date().toISOString().split("T")[0]);
  const [manualDueDate, setManualDueDate] = useState(() => new Date().toISOString().split("T")[0]);
  const [currency, setCurrency] = useState<"VES" | "USD" | "EUR">("VES");
  const [exchangeRateStr, setExchangeRateStr] = useState("1.00");
  const [subtotalStr, setSubtotalStr] = useState("");
  const [taxAmountStr, setTaxAmountStr] = useState("");
  const [retentionIvaStr, setRetentionIvaStr] = useState("");
  const [retentionIslrStr, setRetentionIslrStr] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isDuplicateError, setIsDuplicateError] = useState(false);

  useEffect(() => {
    if (!isOpen) {
      setIsDuplicateError(false);
    }
  }, [isOpen]);

  useEffect(() => {
    if (defaultCompanyId) {
      setCompanyId(defaultCompanyId);
    } else if (!companyId && companies.length > 0) {
      setCompanyId(companies[0].id);
    }
  }, [defaultCompanyId, companies]);

  const selectedSupplier = useMemo(() => {
    return suppliers.find((s) => s.id === supplierId);
  }, [suppliers, supplierId]);

  const sapDocType: SAPDocumentType = useMemo(() => {
    if (invoiceType === "FIRME") return "MIRO";
    if (invoiceType === "CONSIGNACION") return "MRKO";
    return "FB60";
  }, [invoiceType]);

  const calculatedDueDate = useMemo(() => {
    if (invoiceType === "FIRME" && selectedSupplier && receptionDate) {
      const date = new Date(receptionDate + "T00:00:00");
      date.setDate(date.getDate() + (selectedSupplier.credit_days || 0));
      return date.toISOString().split("T")[0];
    }
    return manualDueDate;
  }, [invoiceType, selectedSupplier, receptionDate, manualDueDate]);

  const subtotal = useMemo(() => {
    return parseFloat(subtotalStr.replace(",", ".")) || 0;
  }, [subtotalStr]);

  const taxAmount = useMemo(() => {
    return parseFloat(taxAmountStr.replace(",", ".")) || 0;
  }, [taxAmountStr]);

  const retentionIva = useMemo(() => {
    return parseFloat(retentionIvaStr.replace(",", ".")) || 0;
  }, [retentionIvaStr]);

  const retentionIslr = useMemo(() => {
    return parseFloat(retentionIslrStr.replace(",", ".")) || 0;
  }, [retentionIslrStr]);

  const totalAmount = useMemo(() => {
    const net = subtotal + taxAmount - retentionIva - retentionIslr;
    return net > 0 ? net : 0;
  }, [subtotal, taxAmount, retentionIva, retentionIslr]);

  if (!isOpen) return null;

  const handleDecimalInput = (setter: (val: string) => void) => (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    if (val === "" || /^[0-9]*[.,]?[0-9]*$/.test(val)) {
      setter(val);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!companyId) {
      toast.error("Seleccione una empresa");
      return;
    }
    if (!supplierId) {
      toast.error("Seleccione un proveedor");
      return;
    }
    if (!invoiceNumber.trim()) {
      toast.error("Ingrese el número de factura");
      return;
    }
    if (subtotal <= 0) {
      toast.error("El subtotal debe ser mayor a cero");
      return;
    }

    setIsSubmitting(true);
    try {
      const payload = {
        company_id: companyId,
        supplier_id: supplierId,
        invoice_number: invoiceNumber.trim(),
        control_number: controlNumber.trim() ? controlNumber.trim() : undefined,
        invoice_type: invoiceType,
        sap_document_type: sapDocType,
        reception_date: receptionDate,
        issue_date: issueDate,
        due_date: calculatedDueDate,
        currency,
        exchange_rate: parseFloat(exchangeRateStr.replace(",", ".")) || 1.0,
        subtotal,
        tax_amount: taxAmount,
        total_amount: totalAmount,
      };

      const res = await fetchClient("/api/cxp/invoices", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.message || "Error al registrar factura");
      }

      setIsDuplicateError(false);
      toast.success("Factura registrada exitosamente");
      onSuccess();
      onClose();
    } catch (err: any) {
      if (err.status === 409) {
        setIsDuplicateError(true);
        toast.error(
          "Factura Duplicada: Ya existe un registro con este número para el proveedor seleccionado"
        );
        return;
      }
      toast.error(err.message || "Ocurrió un error al guardar la factura");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs overflow-y-auto">
      <div className="bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-3xl max-w-2xl w-full p-6 shadow-2xl space-y-5 my-8 max-h-[90vh] overflow-y-auto custom-scrollbar">
        <div className="flex items-center justify-between pb-3 border-b border-neutral-100 dark:border-neutral-800">
          <div className="flex items-center gap-2">
            <FileText className="w-5 h-5 text-locatel-medio" />
            <h3 className="text-base font-bold text-neutral-900 dark:text-neutral-100">
              Registrar Factura Manual (CXP)
            </h3>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-lg text-neutral-400 hover:text-neutral-700 dark:hover:text-neutral-200 cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
            <div>
              <label className="block text-xs font-bold text-neutral-700 dark:text-neutral-300 mb-1">
                Empresa
              </label>
              <select
                value={companyId}
                onChange={(e) => setCompanyId(e.target.value)}
                className="w-full px-3 py-2 text-xs rounded-xl bg-white dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 text-neutral-900 dark:text-neutral-100 focus:outline-none focus:ring-1 focus:ring-locatel-medio"
                required
              >
                <option value="">Seleccione Empresa</option>
                {companies.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name} ({c.rif})
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-bold text-neutral-700 dark:text-neutral-300 mb-1">
                Proveedor
              </label>
              <select
                value={supplierId}
                onChange={(e) => setSupplierId(e.target.value)}
                className="w-full px-3 py-2 text-xs rounded-xl bg-white dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 text-neutral-900 dark:text-neutral-100 focus:outline-none focus:ring-1 focus:ring-locatel-medio"
                required
              >
                <option value="">Seleccione Proveedor</option>
                {suppliers.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.business_name} ({s.rif}) - {s.credit_days} días
                  </option>
                ))}
              </select>
              {selectedSupplier && (
                <p className="text-[11px] text-locatel-medio font-semibold mt-1">
                  Crédito acordado: {selectedSupplier.credit_days} días {selectedSupplier.sap_vendor_code ? `| SAP: ${selectedSupplier.sap_vendor_code}` : ""}
                </p>
              )}
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5">
            <div>
              <label className="block text-xs font-bold text-neutral-700 dark:text-neutral-300 mb-1">
                N° de Factura
              </label>
              <input
                type="text"
                value={invoiceNumber}
                onChange={(e) => {
                  setInvoiceNumber(e.target.value);
                  if (isDuplicateError) setIsDuplicateError(false);
                }}
                placeholder="Ej. FACT-00129"
                className={`w-full px-3 py-2 text-xs rounded-xl bg-white dark:bg-neutral-800 border text-neutral-900 dark:text-neutral-100 focus:outline-none ${
                  isDuplicateError
                    ? "border-rose-500 focus:ring-rose-500/40 text-rose-600"
                    : "border-neutral-200 dark:border-neutral-700 focus:ring-1 focus:ring-locatel-medio"
                }`}
                required
              />
              {isDuplicateError && (
                <p className="text-[11px] text-rose-600 font-semibold mt-1">
                  Factura Duplicada: Ya existe un registro con este número para el proveedor seleccionado
                </p>
              )}
            </div>

            <div>
              <label className="block text-xs font-bold text-neutral-700 dark:text-neutral-300 mb-1">
                N° de Control
              </label>
              <input
                type="text"
                value={controlNumber}
                onChange={(e) => setControlNumber(e.target.value)}
                placeholder="Ej. 00-123456"
                className="w-full px-3 py-2 text-xs rounded-xl bg-white dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 text-neutral-900 dark:text-neutral-100 focus:outline-none focus:ring-1 focus:ring-locatel-medio"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-neutral-700 dark:text-neutral-300 mb-1">
                Tipología Contable
              </label>
              <select
                value={invoiceType}
                onChange={(e) => setInvoiceType(e.target.value as InvoiceType)}
                className="w-full px-3 py-2 text-xs rounded-xl bg-white dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 text-neutral-900 dark:text-neutral-100 focus:outline-none focus:ring-1 focus:ring-locatel-medio"
              >
                <option value="FIRME">FIRME (MIRO)</option>
                <option value="CONSIGNACION">CONSIGNACIÓN (MRKO)</option>
                <option value="SERVICIOS">SERVICIOS (FB60)</option>
              </select>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5 p-3 rounded-2xl bg-neutral-50 dark:bg-neutral-800/40 border border-neutral-200/80 dark:border-neutral-700">
            <div>
              <label className="block text-xs font-bold text-neutral-700 dark:text-neutral-300 mb-1">
                Fecha de Emisión
              </label>
              <input
                type="date"
                value={issueDate}
                onChange={(e) => setIssueDate(e.target.value)}
                className="w-full px-3 py-1.5 text-xs rounded-xl bg-white dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 text-neutral-900 dark:text-neutral-100 focus:outline-none focus:ring-1 focus:ring-locatel-medio"
                required
              />
            </div>

            {invoiceType === "FIRME" ? (
              <div>
                <label className="block text-xs font-bold text-neutral-700 dark:text-neutral-300 mb-1">
                  Recepción Almacén (MIGO)
                </label>
                <input
                  type="date"
                  value={receptionDate}
                  onChange={(e) => setReceptionDate(e.target.value)}
                  className="w-full px-3 py-1.5 text-xs rounded-xl bg-white dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 text-neutral-900 dark:text-neutral-100 focus:outline-none focus:ring-1 focus:ring-locatel-medio"
                  required
                />
              </div>
            ) : (
              <div>
                <label className="block text-xs font-bold text-neutral-700 dark:text-neutral-300 mb-1">
                  Fecha Convenida
                </label>
                <input
                  type="date"
                  value={manualDueDate}
                  onChange={(e) => setManualDueDate(e.target.value)}
                  className="w-full px-3 py-1.5 text-xs rounded-xl bg-white dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 text-neutral-900 dark:text-neutral-100 focus:outline-none focus:ring-1 focus:ring-locatel-medio"
                  required
                />
              </div>
            )}

            <div>
              <label className="block text-xs font-bold text-neutral-700 dark:text-neutral-300 mb-1">
                Fecha de Vencimiento
              </label>
              <div className="relative">
                <input
                  type="date"
                  value={calculatedDueDate}
                  readOnly={invoiceType === "FIRME"}
                  onChange={(e) => setManualDueDate(e.target.value)}
                  className={`w-full px-3 py-1.5 text-xs rounded-xl bg-white dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 text-neutral-900 dark:text-neutral-100 focus:outline-none font-bold ${invoiceType === "FIRME" ? "opacity-80 bg-neutral-100 dark:bg-neutral-700" : ""
                    }`}
                />
              </div>
              {invoiceType === "FIRME" && (
                <p className="text-[10px] text-neutral-400 mt-0.5">
                  Calculado: MIGO + {selectedSupplier?.credit_days || 0} días
                </p>
              )}
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
            <div>
              <label className="block text-xs font-bold text-neutral-700 dark:text-neutral-300 mb-1">
                Moneda
              </label>
              <select
                value={currency}
                onChange={(e) => {
                  const val = e.target.value as "VES" | "USD" | "EUR";
                  setCurrency(val);
                  if (val === "VES") setExchangeRateStr("1.00");
                }}
                className="w-full px-3 py-2 text-xs rounded-xl bg-white dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 text-neutral-900 dark:text-neutral-100 focus:outline-none focus:ring-1 focus:ring-locatel-medio"
              >
                <option value="VES">VES (Bolívares)</option>
                <option value="USD">USD (Dólares)</option>
                <option value="EUR">EUR (Euros)</option>
              </select>
            </div>

            {currency !== "VES" && (
              <div>
                <label className="block text-xs font-bold text-neutral-700 dark:text-neutral-300 mb-1">
                  Tasa de Cambio Emisión
                </label>
                <input
                  type="text"
                  inputMode="decimal"
                  autoComplete="off"
                  value={exchangeRateStr}
                  onChange={handleDecimalInput(setExchangeRateStr)}
                  placeholder="Ej. 36.50"
                  className="w-full px-3 py-2 text-xs font-mono font-bold rounded-xl bg-white dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 text-neutral-900 dark:text-neutral-100 focus:outline-none focus:ring-1 focus:ring-locatel-medio"
                />
              </div>
            )}
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 p-3.5 rounded-2xl bg-neutral-50 dark:bg-neutral-800/40 border border-neutral-200/80 dark:border-neutral-700">
            <div>
              <label className="block text-[11px] font-bold text-neutral-600 dark:text-neutral-400 mb-1">
                Subtotal (Base)
              </label>
              <input
                type="text"
                inputMode="decimal"
                autoComplete="off"
                value={subtotalStr}
                onChange={handleDecimalInput(setSubtotalStr)}
                placeholder="0.00"
                className="w-full px-2.5 py-1.5 text-xs font-mono font-bold rounded-lg bg-white dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 text-neutral-900 dark:text-neutral-100 focus:outline-none focus:ring-1 focus:ring-locatel-medio"
                required
              />
            </div>

            <div>
              <label className="block text-[11px] font-bold text-neutral-600 dark:text-neutral-400 mb-1">
                IVA (+16% / Cuota)
              </label>
              <input
                type="text"
                inputMode="decimal"
                autoComplete="off"
                value={taxAmountStr}
                onChange={handleDecimalInput(setTaxAmountStr)}
                placeholder="0.00"
                className="w-full px-2.5 py-1.5 text-xs font-mono font-bold rounded-lg bg-white dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 text-neutral-900 dark:text-neutral-100 focus:outline-none focus:ring-1 focus:ring-locatel-medio"
              />
            </div>

            <div>
              <label className="block text-[11px] font-bold text-neutral-600 dark:text-neutral-400 mb-1">
                Ret. IVA (-)
              </label>
              <input
                type="text"
                inputMode="decimal"
                autoComplete="off"
                value={retentionIvaStr}
                onChange={handleDecimalInput(setRetentionIvaStr)}
                placeholder="0.00"
                className="w-full px-2.5 py-1.5 text-xs font-mono font-bold rounded-lg bg-white dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 text-neutral-900 dark:text-neutral-100 focus:outline-none focus:ring-1 focus:ring-locatel-medio"
              />
            </div>

            <div>
              <label className="block text-[11px] font-bold text-neutral-600 dark:text-neutral-400 mb-1">
                Ret. ISLR (-)
              </label>
              <input
                type="text"
                inputMode="decimal"
                autoComplete="off"
                value={retentionIslrStr}
                onChange={handleDecimalInput(setRetentionIslrStr)}
                placeholder="0.00"
                className="w-full px-2.5 py-1.5 text-xs font-mono font-bold rounded-lg bg-white dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 text-neutral-900 dark:text-neutral-100 focus:outline-none focus:ring-1 focus:ring-locatel-medio"
              />
            </div>
          </div>

          <div className="flex items-center justify-between p-3.5 rounded-2xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800/60">
            <div>
              <span className="text-xs font-bold text-emerald-800 dark:text-emerald-300">
                Monto Neto a Pagar
              </span>
              <p className="text-[10px] text-emerald-600 dark:text-emerald-400">
                Subtotal + IVA - Retenciones
              </p>
            </div>
            <span className="text-base font-extrabold font-mono text-emerald-900 dark:text-emerald-200">
              {currency} {totalAmount.toLocaleString("es-VE", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </span>
          </div>

          <div className="flex items-center justify-end gap-3 pt-3 border-t border-neutral-100 dark:border-neutral-800">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-xs font-semibold text-neutral-600 dark:text-neutral-300 hover:bg-neutral-100 dark:hover:bg-neutral-800 rounded-xl transition-colors cursor-pointer"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="flex items-center gap-2 px-5 py-2 text-xs font-bold text-white bg-locatel-medio hover:bg-locatel-oscuro rounded-xl shadow-xs transition-all cursor-pointer disabled:opacity-50"
            >
              {isSubmitting ? (
                <RefreshCw className="w-4 h-4 animate-spin" />
              ) : (
                <FileText className="w-4 h-4" />
              )}
              <span>Registrar Factura</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
