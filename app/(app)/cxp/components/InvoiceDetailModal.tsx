"use client";

import { useEffect, useState, useRef, useMemo } from "react";
import {
  AlertCircle,
  AlertTriangle,
  Calendar,
  CheckCircle2,
  Clock,
  ExternalLink,
  FileCheck,
  FileText,
  Layers,
  RefreshCw,
  X,
  XCircle,
  ZoomIn,
  ZoomOut,
} from "lucide-react";
import { toast } from "sonner";
import { fetchClient, getStoredAccessToken } from "@/lib/fetchClient";
import { getCurrentRates } from "@/lib/exchangeRates";
import { Invoice, CurrentRatesResponse } from "../types";

interface InvoiceDetailModalProps {
  isOpen: boolean;
  onClose: () => void;
  invoiceId?: string | null;
  invoice?: Invoice | null;
  onOpenSupplier?: (supplierId: string) => void;
  onInvoiceUpdated?: (invoice: Invoice) => void;
}

export function InvoiceDetailModal({
  isOpen,
  onClose,
  invoiceId,
  invoice: initialInvoice,
  onOpenSupplier,
  onInvoiceUpdated,
}: InvoiceDetailModalProps) {
  const [invoice, setInvoice] = useState<Invoice | null>(initialInvoice || null);
  const [loading, setLoading] = useState(false);

  const [fileLoading, setFileLoading] = useState(false);
  const [fileBlobUrl, setFileBlobUrl] = useState<string | null>(null);
  const [fileType, setFileType] = useState<"pdf" | "image" | "unsupported" | null>(null);
  const [fileError, setFileError] = useState<string | null>(null);
  const [zoom, setZoom] = useState(100);

  const [isIndexed, setIsIndexed] = useState(false);
  const [earlyPaymentPct, setEarlyPaymentPct] = useState("0");
  const [vatRetentionPct, setVatRetentionPct] = useState("0");
  const [islrRetentionPct, setIslrRetentionPct] = useState("0");
  const [isSavingTerms, setIsSavingTerms] = useState(false);

  const [currentRates, setCurrentRates] = useState<CurrentRatesResponse | null>(null);

  const blobUrlRef = useRef<string | null>(null);

  useEffect(() => {
    if (isOpen) {
      getCurrentRates()
        .then((rates) => {
          if (rates) setCurrentRates(rates);
        })
        .catch(() => { });
    }
  }, [isOpen]);

  useEffect(() => {
    if (!isOpen) {
      if (blobUrlRef.current) {
        URL.revokeObjectURL(blobUrlRef.current);
        blobUrlRef.current = null;
      }
      setInvoice(null);
      setFileBlobUrl(null);
      setFileType(null);
      setFileError(null);
      setZoom(100);
      setIsIndexed(false);
      setEarlyPaymentPct("0");
      setVatRetentionPct("0");
      setIslrRetentionPct("0");
      setIsSavingTerms(false);
      return;
    }

    if (initialInvoice) {
      setInvoice(initialInvoice);
      loadFile(initialInvoice);
      return;
    }

    if (invoiceId) {
      fetchInvoice(invoiceId);
    }
  }, [isOpen, invoiceId, initialInvoice]);

  useEffect(() => {
    if (invoice) {
      setIsIndexed(Boolean(invoice.is_indexed));
      setEarlyPaymentPct(
        invoice.early_payment_pct !== undefined && invoice.early_payment_pct !== null
          ? String(invoice.early_payment_pct)
          : "0"
      );
      setVatRetentionPct(
        invoice.vat_retention_pct !== undefined && invoice.vat_retention_pct !== null
          ? String(invoice.vat_retention_pct)
          : "0"
      );
      setIslrRetentionPct(
        invoice.islr_retention_pct !== undefined && invoice.islr_retention_pct !== null
          ? String(invoice.islr_retention_pct)
          : "0"
      );
    }
  }, [invoice]);

  const hasTermsChanged = useMemo(() => {
    if (!invoice) return false;
    const currentPct = parseFloat(earlyPaymentPct.replace(",", ".")) || 0;
    const initialPct = invoice.early_payment_pct || 0;
    const currentVatPct = parseFloat(vatRetentionPct.replace(",", ".")) || 0;
    const initialVatPct = invoice.vat_retention_pct || 0;
    const currentIslrPct = parseFloat(islrRetentionPct.replace(",", ".")) || 0;
    const initialIslrPct = invoice.islr_retention_pct || 0;
    return (
      isIndexed !== Boolean(invoice.is_indexed) ||
      Math.abs(currentPct - initialPct) > 0.0001 ||
      Math.abs(currentVatPct - initialVatPct) > 0.0001 ||
      Math.abs(currentIslrPct - initialIslrPct) > 0.0001
    );
  }, [invoice, isIndexed, earlyPaymentPct, vatRetentionPct, islrRetentionPct]);

  const previewVatRetAmount = useMemo(() => {
    if (!invoice) return 0;
    const vatPct = parseFloat(vatRetentionPct.replace(",", ".")) || 0;
    return (invoice.tax_amount * vatPct) / 100;
  }, [invoice, vatRetentionPct]);

  const previewIslrRetAmount = useMemo(() => {
    if (!invoice) return 0;
    const islrPct = parseFloat(islrRetentionPct.replace(",", ".")) || 0;
    return (invoice.subtotal * islrPct) / 100;
  }, [invoice, islrRetentionPct]);

  const previewEarlyPaymentAmount = useMemo(() => {
    if (!invoice) return 0;
    const earlyPct = parseFloat(earlyPaymentPct.replace(",", ".")) || 0;
    const basePayable = Math.max(0, invoice.total_amount - previewVatRetAmount - previewIslrRetAmount);
    return (basePayable * earlyPct) / 100;
  }, [invoice, earlyPaymentPct, previewVatRetAmount, previewIslrRetAmount]);

  const fetchInvoice = async (id: string) => {
    setLoading(true);
    try {
      const res = await fetchClient(`/api/cxp/invoices/${id}`);
      if (!res.ok) {
        throw new Error("No se pudo obtener la información de la factura");
      }
      const data: Invoice = await res.json();
      setInvoice(data);
      loadFile(data);
    } catch (err: any) {
      toast.error(err.message || "Error al cargar la factura", {
        duration: 3000,
        closeButton: true,
      });
      onClose();
    } finally {
      setLoading(false);
    }
  };

  const loadFile = async (inv: Invoice) => {
    if (!inv.drive_file_id) {
      setFileBlobUrl(null);
      setFileType(null);
      setFileError("Esta factura no posee un archivo digital enlazado o aún no ha sido sincronizada.");
      setFileLoading(false);
      return;
    }

    setFileLoading(true);
    setFileError(null);

    try {
      const token = getStoredAccessToken();
      const endpoint = `/api/v1/invoices/${inv.id}/file${token ? `?token=${encodeURIComponent(token)}` : ""}`;
      const res = await fetchClient(endpoint);

      if (!res.ok) {
        throw new Error(`El servidor respondió con código ${res.status}`);
      }

      const contentType = res.headers.get("content-type") || "";
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);

      if (blobUrlRef.current) {
        URL.revokeObjectURL(blobUrlRef.current);
      }
      blobUrlRef.current = url;
      setFileBlobUrl(url);

      if (contentType.toLowerCase().includes("pdf") || blob.type.toLowerCase().includes("pdf")) {
        setFileType("pdf");
      } else if (
        contentType.toLowerCase().includes("image") ||
        blob.type.toLowerCase().includes("image")
      ) {
        setFileType("image");
      } else {
        setFileType("pdf");
      }
    } catch (err: any) {
      setFileError(err.message || "Error al cargar el archivo de la factura");
      setFileBlobUrl(null);
    } finally {
      setFileLoading(false);
    }
  };

  const handleOpenNewTab = () => {
    if (fileBlobUrl) {
      window.open(fileBlobUrl, "_blank");
      return;
    }
    if (invoice?.id) {
      const token = getStoredAccessToken();
      const endpoint = `/api/v1/invoices/${invoice.id}/file${token ? `?token=${encodeURIComponent(token)}` : ""}`;
      window.open(endpoint, "_blank");
    }
  };

  const handleReload = () => {
    if (invoice) {
      loadFile(invoice);
    }
  };

  const formatMoney = (val: number = 0, cur: string = "VES") => {
    return (
      new Intl.NumberFormat("es-VE", {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
      }).format(val || 0) +
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

  const calculateCreditDays = (issueDateStr?: string, dueDateStr?: string): number => {
    if (!issueDateStr || !dueDateStr) return 0;
    const issue = new Date(issueDateStr.split("T")[0]);
    const due = new Date(dueDateStr.split("T")[0]);
    const diff = due.getTime() - issue.getTime();
    const days = Math.round(diff / (1000 * 60 * 60 * 24));
    return days >= 0 ? days : 0;
  };

  const renderStatusBadge = (status: string) => {
    switch (status) {
      case "PENDIENTE":
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-md text-xs font-medium bg-locatel-oro/10 text-locatel-naranja dark:text-locatel-oro border border-locatel-oro/30">
            <Clock className="w-3 h-3" />
            Pendiente
          </span>
        );
      case "EN_PROPUESTA":
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-md text-xs font-medium bg-locatel-morado/10 text-locatel-morado dark:text-locatel-morado border border-locatel-morado/30">
            <FileText className="w-3 h-3" />
            En Propuesta
          </span>
        );
      case "PROGRAMADO":
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-md text-xs font-medium bg-locatel-guia/10 text-locatel-guia dark:text-locatel-claro border border-locatel-guia/30">
            <Calendar className="w-3 h-3" />
            Programado
          </span>
        );
      case "PAGADO":
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-md text-xs font-medium bg-locatel-medio/10 text-locatel-oscuro dark:text-locatel-claro border border-locatel-medio/30">
            <CheckCircle2 className="w-3 h-3" />
            Pagado
          </span>
        );
      case "ANULADO":
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-md text-xs font-medium bg-neutral-100 dark:bg-neutral-800 text-neutral-600 dark:text-neutral-400 border border-neutral-200 dark:border-neutral-700">
            <XCircle className="w-3 h-3" />
            Anulado
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-md text-xs font-medium bg-neutral-100 dark:bg-neutral-800 text-neutral-600 dark:text-neutral-400 border border-neutral-200 dark:border-neutral-700">
            {status}
          </span>
        );
    }
  };

  const calculatedDays = invoice
    ? calculateCreditDays(invoice.issue_date, invoice.due_date)
    : 0;

  const isPending = invoice?.status === "PENDIENTE";
  const disabledTooltip =
    "No se pueden modificar condiciones financieras en propuestas activas o facturas liquidadas.";

  const handleSaveFinancialTerms = async () => {
    if (!invoice || !isPending) return;

    setIsSavingTerms(true);
    try {
      const pct = parseFloat(earlyPaymentPct.replace(",", ".")) || 0;
      const vatPct = parseFloat(vatRetentionPct.replace(",", ".")) || 0;
      const islrPct = parseFloat(islrRetentionPct.replace(",", ".")) || 0;
      const res = await fetchClient(`/api/v1/cxp/invoices/${invoice.id}/financial-terms`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          is_indexed: isIndexed,
          early_payment_pct: pct,
          vat_retention_pct: vatPct,
          islr_retention_pct: islrPct,
        }),
      });

      if (!res.ok) {
        const err = await res.json().catch(() => null);
        throw new Error(err?.message || "Error al actualizar condiciones financieras");
      }

      const updated: Invoice = await res.json();
      setInvoice(updated);
      onInvoiceUpdated?.(updated);
      toast.success("Condiciones financieras actualizadas exitosamente", {
        duration: 3000,
        closeButton: true,
      });
    } catch (err: any) {
      toast.error(err.message || "No se pudieron actualizar las condiciones financieras", {
        duration: 3000,
        closeButton: true,
      });
    } finally {
      setIsSavingTerms(false);
    }
  };

  const currentEarlyPct = parseFloat(earlyPaymentPct.replace(",", ".")) || (invoice?.early_payment_pct || 0);

  const rateUSD = currentRates?.dolar?.Valor || 0;
  const rateEUR = currentRates?.euro?.Valor || 0;

  const activeDailyRate = useMemo(() => {
    if (!invoice) return 0;
    if (invoice.currency === "EUR") return rateEUR;
    return rateUSD;
  }, [invoice, rateUSD, rateEUR]);

  const baseNetPayableVES = invoice
    ? invoice.currency === "VES"
      ? invoice.net_amount
      : invoice.net_amount_usd * invoice.exchange_rate
    : 0;

  const earlyDiscountVES = invoice && currentEarlyPct > 0
    ? (baseNetPayableVES * currentEarlyPct) / 100
    : 0;

  const netPayableVES = Math.max(0, baseNetPayableVES - earlyDiscountVES);

  const baseNetPayableUSD = invoice
    ? invoice.currency === "USD"
      ? invoice.net_amount_usd || invoice.net_amount
      : invoice.exchange_rate > 0
        ? invoice.net_amount / invoice.exchange_rate
        : 0
    : 0;

  const earlyDiscountUSD = invoice && currentEarlyPct > 0
    ? (baseNetPayableUSD * currentEarlyPct) / 100
    : 0;

  const netPayableUSD = Math.max(0, baseNetPayableUSD - earlyDiscountUSD);

  const grossUSD = invoice
    ? invoice.total_amount_usd > 0
      ? invoice.total_amount_usd
      : invoice.exchange_rate > 0
        ? invoice.total_amount / invoice.exchange_rate
        : 0
    : 0;

  const indexedCalculations = useMemo(() => {
    if (!invoice) return null;

    const emissionRate = invoice.exchange_rate || 1;
    const isVES = invoice.currency === "VES";
    const isUSD = invoice.currency === "USD";
    const isEUR = invoice.currency === "EUR";

    if (isVES && isIndexed) {
      const todayRate = rateUSD > 0 ? rateUSD : emissionRate;
      const usdBaseTotal = invoice.total_amount_usd > 0 ? invoice.total_amount_usd : (emissionRate > 0 ? invoice.total_amount / emissionRate : 0);
      const usdBaseNet = invoice.net_amount_usd > 0 ? invoice.net_amount_usd : (emissionRate > 0 ? invoice.net_amount / emissionRate : 0);

      const todayTotalVES = usdBaseTotal * todayRate;
      const todayBaseNetVES = usdBaseNet * todayRate;
      const todayEarlyDiscountVES = currentEarlyPct > 0 ? (todayBaseNetVES * currentEarlyPct) / 100 : 0;
      const todayNetPayableVES = Math.max(0, todayBaseNetVES - todayEarlyDiscountVES);
      const variationVES = todayNetPayableVES - netPayableVES;

      return {
        type: "INDEXED_VES" as const,
        todayRate,
        emissionRate,
        rateLabel: "Tasa BCV USD del día",
        todayTotalVES,
        todayNetPayableVES,
        usdBaseNet,
        variationVES,
      };
    }

    if (!isVES) {
      const todayRate = isEUR ? (rateEUR > 0 ? rateEUR : emissionRate) : (rateUSD > 0 ? rateUSD : emissionRate);
      const currencySymbol = isEUR ? "EUR" : "USD";
      const totalForeign = invoice.total_amount_usd > 0 ? invoice.total_amount_usd : invoice.total_amount;
      const netForeign = isUSD ? netPayableUSD : (invoice.net_amount_usd > 0 ? invoice.net_amount_usd : invoice.net_amount);
      const todayTotalVES = totalForeign * todayRate;
      const todayNetPayableVES = netForeign * todayRate;
      const emissionNetPayableVES = netForeign * emissionRate;
      const variationVES = todayNetPayableVES - emissionNetPayableVES;

      return {
        type: "FOREIGN_CURRENCY" as const,
        currencySymbol,
        todayRate,
        emissionRate,
        rateLabel: `Tasa BCV ${currencySymbol} del día`,
        todayTotalVES,
        todayNetPayableVES,
        netForeign,
        variationVES,
      };
    }

    return null;
  }, [invoice, isIndexed, rateUSD, rateEUR, currentEarlyPct, netPayableVES, netPayableUSD]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-neutral-950/70 backdrop-blur-xs animate-in fade-in duration-150">
      <div className="relative bg-white dark:bg-neutral-950 border border-neutral-200 dark:border-neutral-800 rounded-2xl w-full max-w-350 h-[90vh] shadow-2xl overflow-hidden flex flex-col animate-in zoom-in-95 duration-150">
        <div className="px-6 py-3.5 border-b border-neutral-200 dark:border-neutral-800 flex items-center justify-between bg-white dark:bg-neutral-950 shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-locatel-medio/10 border border-locatel-medio/25 flex items-center justify-center text-locatel-medio shrink-0">
              <FileText className="w-4 h-4" />
            </div>
            <div>
              <div className="flex items-center gap-2.5 flex-wrap">
                <h2 className="text-sm font-semibold text-neutral-900 dark:text-neutral-100 font-mono tracking-tight tabular-nums">
                  {invoice ? `Factura ${invoice.invoice_number}` : "Cargando Factura..."}
                </h2>
                {invoice && renderStatusBadge(invoice.status)}
                {invoice?.is_indexed && (
                  <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[9px] font-black tracking-wider uppercase bg-amber-100 text-amber-800 dark:bg-amber-950/60 dark:text-amber-300 border border-amber-300 dark:border-amber-700">
                    INDEXADA
                  </span>
                )}
              </div>
              {invoice && (
                <p className="text-xs text-neutral-500 dark:text-neutral-400 mt-0.5">
                  <span className="text-neutral-700 dark:text-neutral-300 font-medium">
                    {invoice.company?.name || invoice.company?.alias || "Empresa"}
                  </span>
                  {" · "}
                  <span>
                    {invoice.supplier?.business_name || "Proveedor"} ({invoice.supplier?.rif || "S/R"})
                  </span>
                </p>
              )}
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-neutral-400 hover:text-neutral-600 dark:hover:text-neutral-200 hover:bg-neutral-100 dark:hover:bg-neutral-800/80 rounded-lg transition-colors cursor-pointer"
            title="Cerrar ventana"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 flex-1 overflow-hidden h-full">
          <div className="flex flex-col h-full bg-neutral-100 dark:bg-neutral-900/60 border-r border-neutral-200 dark:border-neutral-800 overflow-hidden">
            <div className="px-4 py-2 bg-white/80 dark:bg-neutral-900/80 backdrop-blur-md border-b border-neutral-200 dark:border-neutral-800 flex items-center justify-between text-xs shrink-0">
              <div className="flex items-center gap-2 text-neutral-600 dark:text-neutral-300">
                <FileCheck className="w-3.5 h-3.5 text-neutral-500" />
                <span className="font-medium text-xs">Documento original</span>
              </div>
              <div className="flex items-center gap-1.5">
                {fileType === "image" && (
                  <div className="flex items-center bg-white dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 rounded-md p-0.5 mr-1">
                    <button
                      onClick={() => setZoom((prev) => Math.max(prev - 25, 50))}
                      className="p-1 text-neutral-500 hover:text-neutral-900 dark:hover:text-neutral-100 rounded hover:bg-neutral-100 dark:hover:bg-neutral-700"
                      title="Reducir"
                    >
                      <ZoomOut className="w-3 h-3" />
                    </button>
                    <span className="px-1.5 text-[11px] font-mono tabular-nums">{zoom}%</span>
                    <button
                      onClick={() => setZoom((prev) => Math.min(prev + 25, 250))}
                      className="p-1 text-neutral-500 hover:text-neutral-900 dark:hover:text-neutral-100 rounded hover:bg-neutral-100 dark:hover:bg-neutral-700"
                      title="Aumentar"
                    >
                      <ZoomIn className="w-3 h-3" />
                    </button>
                  </div>
                )}
                <button
                  onClick={handleReload}
                  disabled={fileLoading}
                  className="inline-flex items-center gap-1.5 px-2.5 py-1 text-xs font-medium rounded-md border border-neutral-200 dark:border-neutral-700 bg-white dark:bg-neutral-800 text-neutral-700 dark:text-neutral-300 hover:bg-neutral-50 dark:hover:bg-neutral-700/60 transition-colors cursor-pointer disabled:opacity-50"
                  title="Recargar archivo"
                >
                  <RefreshCw className={`w-3 h-3 ${fileLoading ? "animate-spin" : ""}`} />
                  <span>Recargar</span>
                </button>
                <button
                  onClick={handleOpenNewTab}
                  disabled={!fileBlobUrl && !invoice?.id}
                  className="inline-flex items-center gap-1.5 px-2.5 py-1 text-xs font-medium rounded-md border border-neutral-200 dark:border-neutral-700 bg-white dark:bg-neutral-800 text-neutral-700 dark:text-neutral-300 hover:bg-neutral-50 dark:hover:bg-neutral-700/60 transition-colors cursor-pointer disabled:opacity-50"
                  title="Abrir en pestaña nueva"
                >
                  <ExternalLink className="w-3 h-3" />
                  <span>Abrir</span>
                </button>
              </div>
            </div>

            <div className="flex-1 w-full h-full overflow-hidden relative flex items-center justify-center p-3">
              {fileLoading ? (
                <div className="flex flex-col items-center justify-center gap-2 text-neutral-400">
                  <RefreshCw className="w-5 h-5 animate-spin text-neutral-400" />
                  <span className="text-xs font-medium">Cargando documento...</span>
                </div>
              ) : fileError ? (
                <div className="max-w-sm p-5 text-center rounded-xl bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 shadow-sm space-y-2.5">
                  <AlertTriangle className="w-5 h-5 mx-auto text-amber-500" />
                  <h4 className="text-xs font-semibold text-neutral-900 dark:text-neutral-100">
                    Documento no disponible
                  </h4>
                  <p className="text-xs text-neutral-500 dark:text-neutral-400 leading-relaxed">
                    {fileError}
                  </p>
                  <button
                    onClick={handleReload}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-neutral-100 hover:bg-neutral-200 dark:bg-neutral-800 dark:hover:bg-neutral-700 text-neutral-700 dark:text-neutral-300 text-xs font-medium rounded-lg transition-colors cursor-pointer"
                  >
                    <RefreshCw className="w-3.5 h-3.5" />
                    <span>Reintentar</span>
                  </button>
                </div>
              ) : !fileBlobUrl ? (
                <div className="text-center text-neutral-400 space-y-1.5">
                  <FileText className="w-8 h-8 mx-auto text-neutral-300 dark:text-neutral-700" />
                  <p className="text-xs">No hay archivo digital disponible para previsualizar.</p>
                </div>
              ) : fileType === "pdf" ? (
                <iframe
                  src={fileBlobUrl}
                  className="w-full h-full rounded-md shadow-sm border border-neutral-200/80 dark:border-neutral-800 bg-white"
                  title={`Factura-${invoice?.invoice_number || "Doc"}`}
                />
              ) : (
                <div className="w-full h-full overflow-auto flex items-center justify-center p-2">
                  <img
                    src={fileBlobUrl}
                    alt={`Factura-${invoice?.invoice_number || "Doc"}`}
                    style={{ transform: `scale(${zoom / 100})` }}
                    className="max-w-full max-h-full object-contain mx-auto shadow-sm rounded-md transition-transform duration-150"
                  />
                </div>
              )}
            </div>
          </div>

          <div className="flex flex-col h-full overflow-y-auto px-6 py-5 space-y-6 divide-y divide-neutral-200/70 dark:divide-neutral-800/70 text-xs">
            {loading ? (
              <div className="py-24 text-center text-neutral-400 flex flex-col items-center justify-center gap-2.5">
                <RefreshCw className="w-6 h-6 animate-spin text-neutral-400" />
                <span className="text-xs font-medium">Cargando ficha técnica y datos fiscales...</span>
              </div>
            ) : !invoice ? (
              <div className="py-20 text-center text-neutral-400">
                <AlertTriangle className="w-8 h-8 mx-auto mb-2 text-amber-500" />
                <p>No se encontraron datos fiscales para esta factura.</p>
              </div>
            ) : (
              <>
                <div>
                  <div className="flex items-center justify-between pb-4">
                    <span className="text-xs font-medium uppercase tracking-wider text-neutral-400">
                      Datos de Emisión y Proveedor
                    </span>
                    {onOpenSupplier && (
                      <button
                        type="button"
                        onClick={() => onOpenSupplier(invoice.supplier_id)}
                        className="text-xs font-medium text-neutral-600 hover:text-neutral-900 dark:text-neutral-400 dark:hover:text-neutral-200 inline-flex items-center gap-1 cursor-pointer transition-colors"
                      >
                        <span>Ficha Proveedor</span>
                        <ExternalLink className="w-3 h-3" />
                      </button>
                    )}
                  </div>

                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-x-4 gap-y-3 pb-4">
                    <div>
                      <span className="text-xs font-medium text-neutral-500 dark:text-neutral-400 block mb-0.5">
                        Empresa Compradora
                      </span>
                      <p className="text-sm font-semibold text-neutral-900 dark:text-neutral-100">
                        {invoice.company?.name || invoice.company?.alias || invoice.company_id}
                      </p>
                      {invoice.company?.code && (
                        <p className="text-[11px] text-neutral-500 font-mono tabular-nums">
                          {invoice.company.code}
                        </p>
                      )}
                    </div>

                    <div>
                      <span className="text-xs font-medium text-neutral-500 dark:text-neutral-400 block mb-0.5">
                        Proveedor Emisor
                      </span>
                      <p className="text-sm font-semibold text-neutral-900 dark:text-neutral-100 truncate" title={invoice.supplier?.business_name}>
                        {invoice.supplier?.business_name || "Proveedor"}
                      </p>
                      <p className="font-mono text-neutral-500 text-xs tabular-nums">
                        RIF: {invoice.supplier?.rif || "S/R"}
                      </p>
                    </div>

                    <div>
                      <span className="text-xs font-medium text-neutral-500 dark:text-neutral-400 block mb-0.5">
                        N° Factura
                      </span>
                      <p className="font-mono font-semibold text-neutral-900 dark:text-neutral-100 text-sm tabular-nums">
                        {invoice.invoice_number}
                      </p>
                    </div>

                    <div>
                      <span className="text-xs font-medium text-neutral-500 dark:text-neutral-400 block mb-0.5">
                        N° Control
                      </span>
                      <p className="font-mono text-xs text-neutral-800 dark:text-neutral-200 tabular-nums">
                        {invoice.control_number || "—"}
                      </p>
                    </div>

                    <div>
                      <span className="text-xs font-medium text-neutral-500 dark:text-neutral-400 block mb-0.5">
                        Orden de Compra
                      </span>
                      <p className="font-mono text-xs text-neutral-800 dark:text-neutral-200 tabular-nums">
                        {invoice.purchase_order_number || "—"}
                      </p>
                    </div>

                    <div>
                      <span className="text-xs font-medium text-neutral-500 dark:text-neutral-400 block mb-0.5">
                        Moneda y Tasa Emisión
                      </span>
                      <p className="font-mono text-xs font-medium text-neutral-900 dark:text-neutral-100 tabular-nums">
                        {invoice.currency} · Bs. {invoice.exchange_rate.toFixed(4)}
                      </p>
                      {activeDailyRate > 0 && Math.abs(activeDailyRate - invoice.exchange_rate) > 0.0001 && (
                        <p className="text-[10px] text-neutral-500 dark:text-neutral-400 font-mono tabular-nums mt-0.5">
                          Tasa Hoy: Bs. {activeDailyRate.toFixed(4)}
                        </p>
                      )}
                    </div>

                    <div>
                      <span className="text-xs font-medium text-neutral-500 dark:text-neutral-400 block mb-0.5">
                        Fecha Emisión
                      </span>
                      <p className="font-mono text-xs text-neutral-800 dark:text-neutral-200 tabular-nums">
                        {formatDate(invoice.issue_date)}
                      </p>
                    </div>

                    <div>
                      <span className="text-xs font-medium text-neutral-500 dark:text-neutral-400 block mb-0.5">
                        Fecha Vencimiento
                      </span>
                      <p className="font-mono text-xs text-neutral-800 dark:text-neutral-200 tabular-nums">
                        {formatDate(invoice.due_date)}
                      </p>
                    </div>

                    <div>
                      <span className="text-xs font-medium text-neutral-500 dark:text-neutral-400 block mb-0.5">
                        Plazo de Crédito
                      </span>
                      <p className="font-mono text-xs text-neutral-800 dark:text-neutral-200 tabular-nums">
                        {calculatedDays} días
                      </p>
                    </div>
                  </div>
                </div>

                <div className="pt-5 space-y-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-medium uppercase tracking-wider text-neutral-400">
                        Términos Financieros
                      </span>
                      {isIndexed && (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[11px] font-medium bg-neutral-100 dark:bg-neutral-800 text-neutral-700 dark:text-neutral-300 border border-neutral-200 dark:border-neutral-700">
                          <Layers className="w-3 h-3" />
                          Indexada a Divisa
                        </span>
                      )}
                    </div>
                    {isPending ? (
                      <span className="text-[11px] text-neutral-500">
                        Modo editable
                      </span>
                    ) : (
                      <span className="text-[11px] text-neutral-400">
                        Solo lectura
                      </span>
                    )}
                  </div>

                  <div className="flex items-center justify-between p-3 rounded-lg border border-neutral-200/80 dark:border-neutral-800 bg-neutral-50/50 dark:bg-neutral-900/40">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-medium text-neutral-900 dark:text-neutral-100 block">
                          Factura Indexada a Divisa
                        </span>
                        {invoice.currency !== "VES" && (
                          <span className="text-[10px] text-amber-600 dark:text-amber-400 font-medium">
                            (Solo aplica a facturas en Bolívares VES)
                          </span>
                        )}
                      </div>
                      <span className="text-[11px] text-neutral-500 dark:text-neutral-400 block">
                        {invoice.currency === "VES"
                          ? "Ajustar automáticamente al contravalor en divisas según la tasa BCV del día"
                          : "Las facturas en moneda extranjera (USD/EUR) no se indexan; se liquidan a tasa oficial del día."}
                      </span>
                    </div>
                    <button
                      type="button"
                      role="switch"
                      aria-checked={invoice.currency === "VES" && isIndexed}
                      disabled={!isPending || invoice.currency !== "VES"}
                      onClick={() => isPending && invoice.currency === "VES" && setIsIndexed(!isIndexed)}
                      className={`relative inline-flex h-5 w-9 shrink-0 cursor-pointer rounded-full border-3 border-transparent transition-colors duration-150 ease-in-out focus:outline-none ${invoice.currency === "VES" && isIndexed ? "bg-locatel-medio" : "bg-neutral-200 dark:bg-neutral-800"
                        } ${(!isPending || invoice.currency !== "VES") ? "opacity-40 cursor-not-allowed" : ""}`}
                    >
                      <span
                        aria-hidden="true"
                        className={`pointer-events-none inline-block h-4 w-4 transform rounded-full bg-white shadow-sm ring-0 transition duration-150 ease-in-out ${invoice.currency === "VES" && isIndexed ? "translate-x-4" : "translate-x-0"
                          }`}
                      />
                    </button>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    <div className="p-3 rounded-lg border border-neutral-200/80 dark:border-neutral-800 bg-neutral-50/50 dark:bg-neutral-900/40 space-y-1.5">
                      <div className="flex justify-between items-center">
                        <span className="text-xs font-medium text-neutral-700 dark:text-neutral-300">
                          % Pronto Pago
                        </span>
                        {previewEarlyPaymentAmount > 0 && (
                          <span className="text-[11px] font-mono text-neutral-500 dark:text-neutral-400 tabular-nums">
                            -{previewEarlyPaymentAmount.toFixed(2)}
                          </span>
                        )}
                      </div>
                      <div className="relative flex items-center">
                        <input
                          type="text"
                          inputMode="decimal"
                          value={earlyPaymentPct}
                          disabled={!isPending}
                          onChange={(e) => {
                            const val = e.target.value;
                            if (val === "" || /^[0-9]*[.,]?[0-9]*$/.test(val)) {
                              setEarlyPaymentPct(val);
                            }
                          }}
                          placeholder="0.00"
                          className="w-full pr-7 pl-3 py-1.5 text-xs font-mono font-medium rounded-lg border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-900 text-neutral-900 dark:text-neutral-100 focus:outline-none focus:ring-1 focus:ring-neutral-900 dark:focus:ring-neutral-100 text-right tabular-nums disabled:opacity-50"
                        />
                        <span className="absolute right-2.5 text-xs font-mono text-neutral-400 pointer-events-none">%</span>
                      </div>
                    </div>

                    <div className="p-3 rounded-lg border border-neutral-200/80 dark:border-neutral-800 bg-neutral-50/50 dark:bg-neutral-900/40 space-y-1.5">
                      <div className="flex justify-between items-center">
                        <span className="text-xs font-medium text-neutral-700 dark:text-neutral-300">
                          % Retención IVA
                        </span>
                        {previewVatRetAmount > 0 && (
                          <span className="text-[11px] font-mono text-neutral-500 dark:text-neutral-400 tabular-nums">
                            -{previewVatRetAmount.toFixed(2)}
                          </span>
                        )}
                      </div>
                      <select
                        value={vatRetentionPct}
                        disabled={!isPending}
                        onChange={(e) => setVatRetentionPct(e.target.value)}
                        className="w-full px-3 py-1.5 text-xs font-mono font-medium rounded-lg border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-900 text-neutral-900 dark:text-neutral-100 focus:outline-none focus:ring-1 focus:ring-neutral-900 dark:focus:ring-neutral-100 disabled:opacity-50"
                      >
                        <option value="0">0%</option>
                        <option value="75">75%</option>
                        <option value="100">100%</option>
                        {!["0", "75", "100"].includes(String(vatRetentionPct)) && (
                          <option value={vatRetentionPct}>{vatRetentionPct}%</option>
                        )}
                      </select>
                    </div>

                    <div className="p-3 rounded-lg border border-neutral-200/80 dark:border-neutral-800 bg-neutral-50/50 dark:bg-neutral-900/40 space-y-1.5">
                      <div className="flex justify-between items-center">
                        <span className="text-xs font-medium text-neutral-700 dark:text-neutral-300">
                          % Retención ISLR
                        </span>
                        {previewIslrRetAmount > 0 && (
                          <span className="text-[11px] font-mono text-neutral-500 dark:text-neutral-400 tabular-nums">
                            -{previewIslrRetAmount.toFixed(2)}
                          </span>
                        )}
                      </div>
                      <div className="relative flex items-center">
                        <input
                          type="text"
                          inputMode="decimal"
                          value={islrRetentionPct}
                          disabled={!isPending}
                          onChange={(e) => {
                            const val = e.target.value;
                            if (val === "" || /^[0-9]*[.,]?[0-9]*$/.test(val)) {
                              setIslrRetentionPct(val);
                            }
                          }}
                          placeholder="0.00"
                          className="w-full pr-7 pl-3 py-1.5 text-xs font-mono font-medium rounded-lg border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-900 text-neutral-900 dark:text-neutral-100 focus:outline-none focus:ring-1 focus:ring-neutral-900 dark:focus:ring-neutral-100 text-right tabular-nums disabled:opacity-50"
                        />
                        <span className="absolute right-2.5 text-xs font-mono text-neutral-400 pointer-events-none">%</span>
                      </div>
                    </div>
                  </div>

                  {!isPending ? (
                    <div className="flex items-center gap-2 p-2.5 rounded-lg bg-neutral-100 dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 text-[11px] text-neutral-600 dark:text-neutral-400">
                      <AlertCircle className="w-3.5 h-3.5 shrink-0 text-neutral-400" />
                      <span>{disabledTooltip}</span>
                    </div>
                  ) : (
                    <div className="flex justify-end pt-0.5 pb-2">
                      <button
                        type="button"
                        onClick={handleSaveFinancialTerms}
                        disabled={isSavingTerms || !hasTermsChanged}
                        className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-medium rounded-lg bg-locatel-medio text-white dark:bg-locatel-claro/95 dark:text-text-white hover:opacity-90 transition-opacity disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer shadow-xs"
                      >
                        {isSavingTerms ? (
                          <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                        ) : (
                          <CheckCircle2 className="w-3.5 h-3.5" />
                        )}
                        <span>Guardar condiciones</span>
                      </button>
                    </div>
                  )}
                </div>

                <div className="pt-5 space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-medium uppercase tracking-wider text-neutral-400">
                      Desglose Fiscal e Impuestos
                    </span>
                  </div>

                  <div className="grid grid-cols-3 gap-3">
                    <div className="p-2.5 rounded-lg border border-neutral-200/70 dark:border-neutral-800 bg-white dark:bg-neutral-900">
                      <span className="text-xs font-medium text-neutral-500 dark:text-neutral-400 block mb-0.5">Subtotal</span>
                      <span className="font-mono font-semibold text-neutral-900 dark:text-neutral-100 text-xs tabular-nums">
                        {formatMoney(invoice.subtotal, invoice.currency)}
                      </span>
                    </div>
                    <div className="p-2.5 rounded-lg border border-neutral-200/70 dark:border-neutral-800 bg-white dark:bg-neutral-900">
                      <span className="text-xs font-medium text-neutral-500 dark:text-neutral-400 block mb-0.5">Monto Exento</span>
                      <span className="font-mono font-semibold text-neutral-900 dark:text-neutral-100 text-xs tabular-nums">
                        {formatMoney(invoice.exempt_amount, invoice.currency)}
                      </span>
                    </div>
                    <div className="p-2.5 rounded-lg border border-neutral-200/70 dark:border-neutral-800 bg-white dark:bg-neutral-900">
                      <span className="text-xs font-medium text-neutral-500 dark:text-neutral-400 block mb-0.5">Descuento Comercial</span>
                      <span className="font-mono font-semibold text-neutral-900 dark:text-neutral-100 text-xs tabular-nums">
                        {formatMoney(invoice.discount_amount, invoice.currency)}
                      </span>
                    </div>
                  </div>

                  <div className="overflow-hidden rounded-lg border border-neutral-200/80 dark:border-neutral-800">
                    <table className="w-full text-xs">
                      <thead className="bg-neutral-50 dark:bg-neutral-900 border-b border-neutral-200/80 dark:border-neutral-800 text-[11px] font-medium text-neutral-500 dark:text-neutral-400">
                        <tr>
                          <th className="py-2 px-3 text-left font-medium">Alícuota IVA</th>
                          <th className="py-2 px-3 text-right font-medium">Base Imponible</th>
                          <th className="py-2 px-3 text-right font-medium">Impuesto</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-neutral-100 dark:divide-neutral-800 font-mono tabular-nums text-xs">
                        <tr>
                          <td className="py-2 px-3 font-sans text-neutral-700 dark:text-neutral-300">General (16%)</td>
                          <td className="py-2 px-3 text-right text-neutral-600 dark:text-neutral-400">
                            {formatMoney(invoice.taxable_base_16, invoice.currency)}
                          </td>
                          <td className="py-2 px-3 text-right font-medium text-neutral-900 dark:text-neutral-100">
                            {formatMoney(invoice.tax_amount_16, invoice.currency)}
                          </td>
                        </tr>
                        <tr>
                          <td className="py-2 px-3 font-sans text-neutral-700 dark:text-neutral-300">Reducida (8%)</td>
                          <td className="py-2 px-3 text-right text-neutral-600 dark:text-neutral-400">
                            {formatMoney(invoice.taxable_base_8, invoice.currency)}
                          </td>
                          <td className="py-2 px-3 text-right font-medium text-neutral-900 dark:text-neutral-100">
                            {formatMoney(invoice.tax_amount_8, invoice.currency)}
                          </td>
                        </tr>
                        <tr>
                          <td className="py-2 px-3 font-sans text-neutral-700 dark:text-neutral-300">Adicional (31%)</td>
                          <td className="py-2 px-3 text-right text-neutral-600 dark:text-neutral-400">
                            {formatMoney(invoice.taxable_base_31, invoice.currency)}
                          </td>
                          <td className="py-2 px-3 text-right font-medium text-neutral-900 dark:text-neutral-100">
                            {formatMoney(invoice.tax_amount_31, invoice.currency)}
                          </td>
                        </tr>
                      </tbody>
                    </table>
                  </div>

                  <div className="space-y-1.5 pt-1 text-xs">
                    <div className="flex justify-between items-center text-neutral-600 dark:text-neutral-400">
                      <span>Retención IVA ({invoice.vat_retention_pct}%):</span>
                      <span className="font-mono font-medium text-rose-600 dark:text-rose-400 tabular-nums">
                        - {formatMoney(invoice.vat_retention_amount, invoice.currency)}
                      </span>
                    </div>
                    <div className="flex justify-between items-center text-neutral-600 dark:text-neutral-400">
                      <span>Retención ISLR ({invoice.islr_retention_pct}%):</span>
                      <span className="font-mono font-medium text-rose-600 dark:text-rose-400 tabular-nums">
                        - {formatMoney(invoice.islr_retention_amount, invoice.currency)}
                      </span>
                    </div>
                    {currentEarlyPct > 0 && (
                      <div className="flex justify-between items-center text-neutral-600 dark:text-neutral-400">
                        <span>Descuento Pronto Pago ({currentEarlyPct}%):</span>
                        <span className="font-mono font-medium text-neutral-900 dark:text-neutral-100 tabular-nums">
                          - {formatMoney(earlyDiscountVES, invoice.currency)}
                        </span>
                      </div>
                    )}
                    {invoice.igtf_amount > 0 && (
                      <div className="flex justify-between items-center text-neutral-600 dark:text-neutral-400">
                        <span>IGTF Aplicado:</span>
                        <span className="font-mono font-medium text-neutral-900 dark:text-neutral-100 tabular-nums">
                          {formatMoney(invoice.igtf_amount, invoice.currency)}
                        </span>
                      </div>
                    )}
                  </div>
                </div>

                <div className="pt-5">
                  <div className="p-4 rounded-xl border border-neutral-200/80 dark:border-neutral-800 bg-neutral-50 dark:bg-neutral-900/60 space-y-3">
                    <div className="flex items-center justify-between pb-2 border-b border-neutral-200/60 dark:border-neutral-800">
                      <div>
                        <span className="text-xs font-medium text-neutral-500 dark:text-neutral-400 block">Total Factura</span>
                        <span className="font-mono font-semibold text-neutral-900 dark:text-neutral-100 text-sm tabular-nums">
                          {formatMoney(invoice.total_amount, invoice.currency)}
                        </span>
                      </div>
                      <div className="text-right">
                        <span className="text-xs font-medium text-neutral-500 dark:text-neutral-400 block">Equivalente Divisa</span>
                        <span className="font-mono font-medium text-neutral-600 dark:text-neutral-400 text-sm tabular-nums">
                          {formatMoney(grossUSD, "USD")}
                        </span>
                      </div>
                    </div>

                    <div>
                      <div className="flex items-baseline justify-between">
                        <div>
                          <span className="text-xs font-medium text-neutral-500 dark:text-neutral-400 block">
                            {currentEarlyPct > 0 ? "Monto Neto a Pagar (con Pronto Pago)" : "Monto Neto a Pagar"}
                          </span>
                          <p className="font-mono font-bold text-2xl tracking-tight text-locatel-oscuro dark:text-locatel-claro tabular-nums">
                            {formatMoney(netPayableVES, "VES")}
                          </p>
                        </div>
                        <div className="text-right">
                          <span className="text-xs font-medium text-neutral-500 dark:text-neutral-400 block">
                            Equivalente Neto USD
                          </span>
                          <p className="font-mono font-semibold text-lg tracking-tight text-neutral-700 dark:text-neutral-300 tabular-nums">
                            {formatMoney(netPayableUSD, "USD")}
                          </p>
                        </div>
                      </div>

                      {currentEarlyPct > 0 && (
                        <div className="mt-2 pt-2 border-t border-neutral-200/60 dark:border-neutral-800 flex justify-between items-center text-[11px] text-neutral-500 font-mono tabular-nums">
                          <span>Neto Fiscal Base: {formatMoney(baseNetPayableVES, "VES")}</span>
                          <span>Desc: -{formatMoney(earlyDiscountVES, "VES")}</span>
                        </div>
                      )}

                      {invoice.paid_amount > 0 && (
                        <div className="mt-2 pt-2 border-t border-neutral-200/60 dark:border-neutral-800 flex justify-between items-center text-xs">
                          <span className="text-neutral-500">Monto Pagado a la Fecha:</span>
                          <span className="font-mono font-semibold text-neutral-900 dark:text-neutral-100 tabular-nums">
                            {formatMoney(invoice.paid_amount, invoice.currency)}
                          </span>
                        </div>
                      )}

                      {indexedCalculations && (
                        <div className="mt-2.5 pt-2 border-t border-neutral-200/70 dark:border-neutral-800 flex items-center justify-between text-xs">
                          <span className="text-neutral-500 flex items-center gap-1.5">
                            <span>{indexedCalculations.type === "INDEXED_VES" ? "Neto indexado al día" : `Neto a tasa de hoy (${indexedCalculations.currencySymbol})`}</span>
                            <span className="text-12 text-black font-bold">
                              (Bs. {indexedCalculations.todayRate.toFixed(4)})
                            </span>
                          </span>
                          <div className="text-right">
                            <span className="font-mono font-bold text-sm text-neutral-900 dark:text-neutral-100 tabular-nums">
                              Bs. {formatMoney(indexedCalculations.todayNetPayableVES, "VES")}
                            </span>
                            {indexedCalculations.variationVES !== 0 && (
                              <span className={`block text-[10px] font-mono tabular-nums ${indexedCalculations.variationVES > 0 ? "text-amber-600 dark:text-amber-400" : "text-emerald-600 dark:text-emerald-400"}`}>
                                {indexedCalculations.variationVES > 0 ? "+" : ""}Bs. {formatMoney(indexedCalculations.variationVES, "VES")}
                              </span>
                            )}
                          </div>
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="flex justify-end pt-4 pb-1">
                    <button
                      type="button"
                      onClick={onClose}
                      className="px-4 py-2 bg-neutral-100 hover:bg-neutral-200 dark:bg-neutral-800 dark:hover:bg-neutral-700 text-neutral-800 dark:text-neutral-200 text-xs font-medium rounded-lg transition-colors cursor-pointer"
                    >
                      Cerrar
                    </button>
                  </div>
                </div>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
