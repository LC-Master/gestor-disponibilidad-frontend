"use client";

import { useEffect, useMemo, useState, useRef } from "react";
import {
  FileCheck,
  FileText,
  Layers,
  RefreshCw,
  Sparkles,
  UploadCloud,
  X,
  ZoomIn,
  ZoomOut,
} from "lucide-react";
import { toast } from "sonner";
import { fetchClient } from "@/lib/fetchClient";
import { Company } from "@/app/(app)/tesoreria/types";
import { Supplier } from "../types";
import { getSpecificRate } from "@/lib/exchangeRates";
import { z } from "zod";

const invoiceSchema = z
  .object({
    company_id: z.string().min(1, "Seleccione una empresa"),
    supplier_id: z.string().min(1, "Seleccione un proveedor"),
    invoice_number: z.string().trim().min(1, "Ingrese el número de factura").max(50, "El número de factura es demasiado largo"),
    control_number: z.string().trim().max(50, "El número de control es demasiado largo").optional(),
    purchase_order_number: z.string().trim().max(50, "La orden de compra es demasiado larga").optional(),
    issue_date: z.string().min(1, "Ingrese la fecha de emisión"),
    reception_date: z.string().min(1, "Ingrese la fecha de recepción"),
    due_date: z.string().min(1, "Ingrese la fecha de vencimiento"),
    currency: z.enum(["VES", "USD", "EUR"]),
    exchange_rate: z.number().positive("La tasa de cambio debe ser mayor a cero"),
    subtotal: z.number().positive("El subtotal debe ser mayor a cero"),
    discount_amount: z.number().min(0, "El descuento no puede ser negativo"),
    exempt_amount: z.number().min(0, "El monto exento no puede ser negativo"),
    vat_retention_pct: z.number().min(0).max(100, "Retención IVA inválida"),
    islr_retention_pct: z.number().min(0).max(100, "Retención ISLR debe estar entre 0 y 100"),
    early_payment_pct: z.number().min(0).max(100, "Pronto pago debe estar entre 0 y 100"),
    total_amount: z.number().positive("El total de la factura debe ser mayor a cero"),
  })
  .refine((d) => d.due_date >= d.issue_date, {
    path: ["due_date"],
    message: "El vencimiento no puede ser anterior a la emisión",
  })
  .refine((d) => d.discount_amount <= d.subtotal, {
    path: ["discount_amount"],
    message: "El descuento no puede exceder el subtotal",
  });

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
  const [purchaseOrderNumber, setPurchaseOrderNumber] = useState("");
  const [receptionDate, setReceptionDate] = useState(() => new Date().toISOString().split("T")[0]);
  const [issueDate, setIssueDate] = useState(() => new Date().toISOString().split("T")[0]);
  const [manualDueDate, setManualDueDate] = useState(() => new Date().toISOString().split("T")[0]);
  const [currency, setCurrency] = useState<"VES" | "USD" | "EUR">("VES");
  const [exchangeRateStr, setExchangeRateStr] = useState("1.00");
  const [rateValidDate, setRateValidDate] = useState<string | null>(null);
  const [isFetchingRate, setIsFetchingRate] = useState(false);

  const [subtotalStr, setSubtotalStr] = useState("");
  const [discountStr, setDiscountStr] = useState("");
  const [exemptAmountStr, setExemptAmountStr] = useState("");
  const [taxableBase16Str, setTaxableBase16Str] = useState("");
  const [taxableBase8Str, setTaxableBase8Str] = useState("");
  const [taxableBase31Str, setTaxableBase31Str] = useState("");
  const [igtfAmountStr, setIgtfAmountStr] = useState("");
  const [vatRetentionPctStr, setVatRetentionPctStr] = useState("0");
  const [islrRetentionPctStr, setIslrRetentionPctStr] = useState("0");
  const [isIndexed, setIsIndexed] = useState(false);
  const [earlyPaymentPctStr, setEarlyPaymentPctStr] = useState("");
  const [driveFileId, setDriveFileId] = useState<string | null>(null);
  const [attachedFile, setAttachedFile] = useState<File | null>(null);
  // Tracks whether the file analysis succeeded and returned a drive file ID
  const [analysisSucceeded, setAnalysisSucceeded] = useState(false);

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isDuplicateError, setIsDuplicateError] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const [analyzedFileName, setAnalyzedFileName] = useState<string | null>(null);
  const [previewBlobUrl, setPreviewBlobUrl] = useState<string | null>(null);
  const [previewFileType, setPreviewFileType] = useState<"pdf" | "image" | null>(null);
  const [zoom, setZoom] = useState(100);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const previewUrlRef = useRef<string | null>(null);

  const resetForm = () => {
    if (previewUrlRef.current) {
      URL.revokeObjectURL(previewUrlRef.current);
      previewUrlRef.current = null;
    }
    setCompanyId(defaultCompanyId || (companies[0]?.id ?? ""));
    setSupplierId("");
    setInvoiceNumber("");
    setControlNumber("");
    setPurchaseOrderNumber("");
    const today = new Date().toISOString().split("T")[0];
    setReceptionDate(today);
    setIssueDate(today);
    setManualDueDate(today);
    setCurrency("VES");
    setExchangeRateStr("1.00");
    setRateValidDate(null);
    setSubtotalStr("");
    setDiscountStr("");
    setExemptAmountStr("");
    setTaxableBase16Str("");
    setTaxableBase8Str("");
    setTaxableBase31Str("");
    setIgtfAmountStr("");
    setVatRetentionPctStr("0");
    setIslrRetentionPctStr("0");
    setIsIndexed(false);
    setEarlyPaymentPctStr("");
    setDriveFileId(null);
    setAttachedFile(null);
    setIsDuplicateError(false);
    setSubmitted(false);
    setIsAnalyzing(false);
    setIsDragging(false);
    setAnalyzedFileName(null);
    setPreviewBlobUrl(null);
    setPreviewFileType(null);
    setZoom(100);
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  useEffect(() => {
    if (!isOpen) {
      resetForm();
    }
  }, [isOpen]);

  const handleFileAnalysis = async (file: File) => {
    const validExtensions = [".pdf", ".jpg", ".jpeg", ".png"];
    const fileName = file.name.toLowerCase();
    const isValid = validExtensions.some((ext) => fileName.endsWith(ext));

    if (!isValid) {
      toast.error("Formato no válido. Se admiten únicamente PDF, JPG y PNG.", {
        duration: 3000,
        closeButton: true,
      });
      return;
    }

    if (previewUrlRef.current) {
      URL.revokeObjectURL(previewUrlRef.current);
    }
    const objectUrl = URL.createObjectURL(file);
    previewUrlRef.current = objectUrl;
    setPreviewBlobUrl(objectUrl);
    setPreviewFileType(fileName.endsWith(".pdf") ? "pdf" : "image");

    setIsAnalyzing(true);
    setAnalyzedFileName(file.name);
    setAttachedFile(file);
    setDriveFileId(null);

    try {
      const formData = new FormData();
      formData.append("file", file);

      const res = await fetchClient("/api/v1/cxp/invoices/analyze", {
        method: "POST",
        body: formData,
      });

      if (!res.ok) {
        let extractedMsg = "";
        try {
          const rawText = await res.text();
          try {
            const json = JSON.parse(rawText);
            extractedMsg = json.error || json.message || json.detail || "";
          } catch {
            extractedMsg = rawText;
          }
        } catch {
          extractedMsg = "";
        }

        if (res.status === 422) {
          throw new Error(extractedMsg || "El documento adjunto no parece ser una factura válida o no contiene datos fiscales legibles.");
        }

        if (res.status === 429 || extractedMsg.includes("limite de peticiones")) {
          throw new Error("Límite de cuota de Google Gemini excedido. Espere un momento antes de reintentar.");
        }

        if (res.status === 503 || extractedMsg.includes("no disponible")) {
          throw new Error("El servidor de Google Gemini está saturado o fuera de servicio temporalmente.");
        }

        if (res.status === 504 || res.status === 408 || extractedMsg.includes("timeout")) {
          throw new Error("El servidor de Google tardó demasiado en responder y se agotó el tiempo de espera.");
        }

        if (res.status === 413) {
          throw new Error("La imagen es demasiado pesada para ser analizada por Google.");
        }

        if (res.status === 400) {
          throw new Error(extractedMsg || "El archivo enviado no es una imagen válida o está dañado.");
        }

        if (extractedMsg) {
          throw new Error(extractedMsg);
        }

        throw new Error(`Error ${res.status}: Fallo en el servidor al analizar la factura`);
      }

      const data = await res.json();

      if (data.drive_file_id) {
        setDriveFileId(data.drive_file_id);
        setAnalysisSucceeded(true);
      } else {
        setAnalysisSucceeded(false);
      }

      const cleanRif = (r?: string) => (r ? r.toUpperCase().replace(/[^A-Z0-9]/g, "") : "");

      const compId = data.company_id;
      const compRif = cleanRif(data.company_rif || data.rif_empresa_compradora);
      if (compId && companies.some((c) => c.id === compId)) {
        setCompanyId(compId);
      } else if (compRif) {
        const match = companies.find((c) => {
          const cRif = cleanRif(c.rif);
          return cRif === compRif || cRif.includes(compRif) || compRif.includes(cRif);
        });
        if (match) {
          setCompanyId(match.id);
        }
      }

      const supId = data.supplier_id;
      const supRif = cleanRif(data.supplier_rif || data.rif_proveedor);
      if (supId && suppliers.some((s) => s.id === supId)) {
        setSupplierId(supId);
      } else if (supRif) {
        const match = suppliers.find((s) => {
          const sRif = cleanRif(s.rif);
          return sRif === supRif || sRif.includes(supRif) || supRif.includes(sRif);
        });
        if (match) {
          setSupplierId(match.id);
        }
      }

      const invNum = data.invoice_number || data.numero_factura || "";
      if (invNum) setInvoiceNumber(String(invNum).trim());

      const ctrlNum = data.control_number || data.numero_control || "";
      if (ctrlNum) setControlNumber(String(ctrlNum).trim());

      const poNum = data.purchase_order_number || data.orden_compra || "";
      if (poNum) setPurchaseOrderNumber(String(poNum).trim());

      const issDate = data.issue_date || data.fecha_emision || "";
      if (issDate) {
        const cleanIssue = String(issDate).split("T")[0].trim();
        setIssueDate(cleanIssue);
        setReceptionDate(cleanIssue);
      }

      const dueD = data.due_date || data.fecha_vencimiento || "";
      if (dueD) {
        setManualDueDate(String(dueD).split("T")[0].trim());
      } else if (issDate) {
        setManualDueDate(String(issDate).split("T")[0].trim());
      }

      const curr = String(data.currency || data.moneda || "").toUpperCase().trim();
      if (curr === "VES" || curr === "USD" || curr === "EUR") {
        setCurrency(curr as "VES" | "USD" | "EUR");
      }

      const rate = data.exchange_rate || data.tasa_impresa || data.printed_rate || 0;
      if (rate > 0) {
        setExchangeRateStr(String(rate));
      }

      const isIdx = typeof data.is_indexed === "boolean"
        ? data.is_indexed
        : typeof data.es_indexada === "boolean"
          ? data.es_indexada
          : false;
      setIsIndexed(curr === "VES" ? isIdx : false);

      const subVal = data.subtotal || 0;
      if (subVal > 0) setSubtotalStr(String(subVal));

      const discVal = data.discount_amount || data.monto_descuento || 0;
      if (discVal > 0) setDiscountStr(String(discVal));

      const exVal = data.exempt_amount || data.monto_exento || 0;
      if (exVal > 0) setExemptAmountStr(String(exVal));

      let b16Val = data.taxable_base_16 || 0;
      const b8Val = data.taxable_base_8 || 0;
      const b31Val = data.taxable_base_31 || 0;

      if (b16Val === 0 && b8Val === 0 && b31Val === 0 && subVal > 0) {
        b16Val = subVal - exVal - discVal;
      }

      if (b16Val > 0) setTaxableBase16Str(String(b16Val));
      if (b8Val > 0) setTaxableBase8Str(String(b8Val));
      if (b31Val > 0) setTaxableBase31Str(String(b31Val));

      const vatRet = data.vat_retention_pct ?? data.porcentaje_retencion_iva;
      if (vatRet !== undefined && vatRet !== null && Number(vatRet) > 0) {
        setVatRetentionPctStr(String(vatRet));
      }

      const islrRet = data.islr_retention_pct ?? data.porcentaje_retencion_islr;
      if (islrRet !== undefined && islrRet !== null && Number(islrRet) > 0) {
        setIslrRetentionPctStr(String(islrRet));
      }

      toast.success("Factura analizada con Gemini AI. Verifique los importes fiscales.", {
        duration: 3000,
        closeButton: true,
      });
    } catch (err: any) {
      if (previewUrlRef.current) {
        URL.revokeObjectURL(previewUrlRef.current);
        previewUrlRef.current = null;
      }
      setPreviewBlobUrl(null);
      setPreviewFileType(null);
      setAttachedFile(null);
      setAnalyzedFileName(null);
      toast.error(err?.message || "Error al procesar la factura con Gemini AI", {
        duration: 3000,
        closeButton: true,
      });
    } finally {
      setIsAnalyzing(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
    }
  };

  useEffect(() => {
    if (defaultCompanyId) {
      setCompanyId(defaultCompanyId);
    } else if (!companyId && companies.length > 0) {
      setCompanyId(companies[0].id);
    }
  }, [defaultCompanyId, companies, companyId]);

  const selectedSupplier = useMemo(() => {
    return suppliers.find((s) => s.id === supplierId);
  }, [suppliers, supplierId]);

  const supplierType = selectedSupplier?.supplier_type || "FIRME";

  const fetchRate = async (cur: "VES" | "USD" | "EUR", date: string) => {
    if (cur === "VES") {
      setRateValidDate(null);
      return;
    }
    const bcvCurrency = cur === "USD" ? "Dolar" : "Euro";
    setIsFetchingRate(true);
    try {
      const res = await getSpecificRate(bcvCurrency, date);
      if (res && res.Valor > 0) {
        setExchangeRateStr(String(res.Valor));
        setRateValidDate(res.FechaValida || res.Fecha);
      }
    } catch {
      toast.error("No se pudo obtener la tasa BCV automática para esa fecha", {
        duration: 3000,
        closeButton: true,
      });
    } finally {
      setIsFetchingRate(false);
    }
  };

  useEffect(() => {
    if (isOpen) {
      fetchRate(currency, issueDate);
    }
  }, [currency, issueDate, isOpen]);

  const calculatedDueDate = useMemo(() => {
    if (supplierType === "FIRME" && selectedSupplier && receptionDate) {
      const date = new Date(receptionDate + "T00:00:00");
      date.setDate(date.getDate() + (selectedSupplier.credit_days || 0));
      return date.toISOString().split("T")[0];
    }
    return manualDueDate;
  }, [supplierType, selectedSupplier, receptionDate, manualDueDate]);

  const handleSubtotalChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    if (val === "" || /^[0-9]*[.,]?[0-9]*$/.test(val)) {
      setSubtotalStr(val);
      const subVal = parseFloat(val.replace(",", ".")) || 0;
      const exVal = parseFloat(exemptAmountStr.replace(",", ".")) || 0;
      const discVal = parseFloat(discountStr.replace(",", ".")) || 0;
      const b8Val = parseFloat(taxableBase8Str.replace(",", ".")) || 0;
      const b31Val = parseFloat(taxableBase31Str.replace(",", ".")) || 0;

      if (b8Val === 0 && b31Val === 0) {
        const autoBase16 = Math.max(0, subVal - exVal - discVal);
        setTaxableBase16Str(autoBase16 > 0 ? (Number.isInteger(autoBase16) ? String(autoBase16) : autoBase16.toFixed(2)) : "");
      }
    }
  };

  const handleExemptChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    if (val === "" || /^[0-9]*[.,]?[0-9]*$/.test(val)) {
      setExemptAmountStr(val);
      const exVal = parseFloat(val.replace(",", ".")) || 0;
      const subVal = parseFloat(subtotalStr.replace(",", ".")) || 0;
      const discVal = parseFloat(discountStr.replace(",", ".")) || 0;
      const b8Val = parseFloat(taxableBase8Str.replace(",", ".")) || 0;
      const b31Val = parseFloat(taxableBase31Str.replace(",", ".")) || 0;

      if (subVal > 0 && b8Val === 0 && b31Val === 0) {
        const autoBase16 = Math.max(0, subVal - exVal - discVal);
        setTaxableBase16Str(autoBase16 > 0 ? (Number.isInteger(autoBase16) ? String(autoBase16) : autoBase16.toFixed(2)) : "");
      }
    }
  };

  const handleDiscountChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    if (val === "" || /^[0-9]*[.,]?[0-9]*$/.test(val)) {
      setDiscountStr(val);
      const discVal = parseFloat(val.replace(",", ".")) || 0;
      const subVal = parseFloat(subtotalStr.replace(",", ".")) || 0;
      const exVal = parseFloat(exemptAmountStr.replace(",", ".")) || 0;
      const b8Val = parseFloat(taxableBase8Str.replace(",", ".")) || 0;
      const b31Val = parseFloat(taxableBase31Str.replace(",", ".")) || 0;

      if (subVal > 0 && b8Val === 0 && b31Val === 0) {
        const autoBase16 = Math.max(0, subVal - exVal - discVal);
        setTaxableBase16Str(autoBase16 > 0 ? (Number.isInteger(autoBase16) ? String(autoBase16) : autoBase16.toFixed(2)) : "");
      }
    }
  };

  const parseNum = (v: string) => parseFloat(v.replace(",", ".")) || 0;

  const subtotal = parseNum(subtotalStr);
  const discountAmount = parseNum(discountStr);
  const exemptAmount = parseNum(exemptAmountStr);
  const taxableBase16 = parseNum(taxableBase16Str);
  const taxableBase8 = parseNum(taxableBase8Str);
  const taxableBase31 = parseNum(taxableBase31Str);
  const igtfAmount = parseNum(igtfAmountStr);
  const vatRetentionPct = parseNum(vatRetentionPctStr);
  const islrRetentionPct = parseNum(islrRetentionPctStr);
  const exchangeRate = parseNum(exchangeRateStr) || 1.0;
  const earlyPaymentPct = parseNum(earlyPaymentPctStr);

  const taxAmount16 = taxableBase16 * 0.16;
  const taxAmount8 = taxableBase8 * 0.08;
  const taxAmount31 = taxableBase31 * 0.31;
  const totalTaxAmount = taxAmount16 + taxAmount8 + taxAmount31;

  const effectiveSubtotal = useMemo(() => {
    if (subtotal > 0) return subtotal;
    return taxableBase16 + taxableBase8 + taxableBase31 + exemptAmount;
  }, [subtotal, taxableBase16, taxableBase8, taxableBase31, exemptAmount]);

  const totalAmount = useMemo(() => {
    const val = effectiveSubtotal + totalTaxAmount - discountAmount + igtfAmount;
    return val > 0 ? val : 0;
  }, [effectiveSubtotal, totalTaxAmount, discountAmount, igtfAmount]);

  const vatRetentionAmount = (totalTaxAmount * vatRetentionPct) / 100;
  const islrRetentionAmount = (effectiveSubtotal * islrRetentionPct) / 100;

  const previewEarlyPaymentAmount = useMemo(() => {
    const basePayable = Math.max(0, totalAmount - vatRetentionAmount - islrRetentionAmount);
    return (basePayable * earlyPaymentPct) / 100;
  }, [totalAmount, vatRetentionAmount, islrRetentionAmount, earlyPaymentPct]);

  const retencionesTotal = vatRetentionAmount + islrRetentionAmount + previewEarlyPaymentAmount;

  const netAmount = useMemo(() => {
    const val = totalAmount - vatRetentionAmount - islrRetentionAmount - previewEarlyPaymentAmount;
    return val > 0 ? val : 0;
  }, [totalAmount, vatRetentionAmount, islrRetentionAmount, previewEarlyPaymentAmount]);

  const equivalentVES = currency === "VES" ? netAmount : netAmount * exchangeRate;
  const equivalentUSD = currency === "USD" ? netAmount : exchangeRate > 0 ? (currency === "VES" ? netAmount / exchangeRate : netAmount) : 0;

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

  const validate = (): Record<string, string> => {
    const result = invoiceSchema.safeParse({
      company_id: companyId,
      supplier_id: supplierId,
      invoice_number: invoiceNumber,
      control_number: controlNumber,
      purchase_order_number: purchaseOrderNumber,
      issue_date: issueDate,
      reception_date: receptionDate,
      due_date: calculatedDueDate,
      currency,
      exchange_rate: exchangeRate,
      subtotal: effectiveSubtotal,
      discount_amount: discountAmount,
      exempt_amount: exemptAmount,
      vat_retention_pct: vatRetentionPct,
      islr_retention_pct: islrRetentionPct,
      early_payment_pct: earlyPaymentPct,
      total_amount: totalAmount,
    });
    const map: Record<string, string> = {};
    if (!result.success) {
      for (const issue of result.error.issues) {
        const key = String(issue.path[0] ?? "form");
        if (!map[key]) map[key] = issue.message;
      }
    }
    return map;
  };

  const errors = submitted ? validate() : {};

  const fieldError = (name: string) =>
    errors[name] ? <p className="mt-1 text-[11px] font-medium text-rose-600 dark:text-rose-400">{errors[name]}</p> : null;

  if (!isOpen) return null;

  const handleDecimalInput = (setter: (val: string) => void) => (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    if (val === "" || /^[0-9]*[.,]?[0-9]*$/.test(val)) {
      setter(val);
    }
  };

  const handleClearFile = () => {
    if (previewUrlRef.current) {
      URL.revokeObjectURL(previewUrlRef.current);
      previewUrlRef.current = null;
    }
    setPreviewBlobUrl(null);
    setPreviewFileType(null);
    setAnalyzedFileName(null);
    setDriveFileId(null);
    setAttachedFile(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    setSubmitted(true);
    const found = validate();
    if (Object.keys(found).length > 0) {
      return;
    }

    setIsSubmitting(true);
    try {
      let finalDriveFileId = driveFileId;
      if (attachedFile && !finalDriveFileId && analysisSucceeded) {
        const fd = new FormData();
        fd.append("file", attachedFile);
        const upRes = await fetchClient("/api/v1/cxp/invoices/attachment", {
          method: "POST",
          body: fd,
        });
        if (!upRes.ok) {
          const upErr = await upRes.json().catch(() => null);
          throw new Error(upErr?.message || "No se pudo subir el archivo adjunto a Google Drive");
        }
        const upData = await upRes.json();
        finalDriveFileId = upData.drive_file_id || null;
        if (finalDriveFileId) setDriveFileId(finalDriveFileId);
      }

      const payload = {
        company_id: companyId,
        supplier_id: supplierId,
        invoice_number: invoiceNumber.trim(),
        control_number: controlNumber.trim() ? controlNumber.trim() : undefined,
        purchase_order_number: purchaseOrderNumber.trim() ? purchaseOrderNumber.trim() : undefined,
        reception_date: receptionDate,
        issue_date: issueDate,
        due_date: calculatedDueDate,
        currency,
        exchange_rate: exchangeRate,
        printed_rate: exchangeRate,
        subtotal: effectiveSubtotal,
        discount_amount: discountAmount,
        exempt_amount: exemptAmount,
        taxable_base_16: taxableBase16,
        tax_amount_16: taxAmount16,
        taxable_base_8: taxableBase8,
        tax_amount_8: taxAmount8,
        taxable_base_31: taxableBase31,
        tax_amount_31: taxAmount31,
        tax_amount: totalTaxAmount,
        igtf_amount: igtfAmount,
        vat_retention_pct: vatRetentionPct,
        vat_retention_amount: vatRetentionAmount,
        islr_retention_pct: islrRetentionPct,
        islr_retention_amount: islrRetentionAmount,
        total_amount: totalAmount,
        net_amount: netAmount,
        is_indexed: currency === "VES" ? isIndexed : false,
        early_payment_pct: earlyPaymentPct,
        drive_file_id: finalDriveFileId || undefined,
      };

      const res = await fetchClient("/api/v1/cxp/invoices", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        const err = await res.json().catch(() => null);
        throw new Error(err?.message || "No se pudo registrar la factura. Intente nuevamente.");
      }

      setIsDuplicateError(false);
      toast.success("Factura registrada exitosamente", {
        duration: 3000,
        closeButton: true,
      });
      resetForm();
      onSuccess();
      onClose();
    } catch (err: any) {
      if (err.status === 409) {
        setIsDuplicateError(true);
        toast.error("Factura duplicada: ya existe este número para el proveedor", {
          duration: 3000,
          closeButton: true,
        });
        return;
      }
      toast.error(err.message || "Error al registrar la factura", {
        duration: 3000,
        closeButton: true,
      });
    } finally {

      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-neutral-950/70 backdrop-blur-xs animate-in fade-in duration-150">
      <div className="relative bg-white dark:bg-neutral-950 border border-neutral-200 dark:border-neutral-800 rounded-2xl max-w-350 w-[95vw] h-[90vh] shadow-2xl overflow-hidden flex flex-col animate-in zoom-in-95 duration-150">
        <div className="px-6 py-4 border-b border-neutral-200 dark:border-neutral-800 flex items-center justify-between bg-neutral-50/70 dark:bg-neutral-900/70 backdrop-blur-sm shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-locatel-medio/15 border border-locatel-medio/30 flex items-center justify-center text-locatel-medio shrink-0 shadow-xs">
              <FileCheck className="w-5 h-5 text-locatel-medio" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-sm font-semibold text-neutral-900 dark:text-neutral-100 font-mono tracking-tight">
                  Registrar Factura de Proveedor
                </h2>
              </div>
              <p className="text-xs text-neutral-500 dark:text-neutral-400 mt-0.5">
                Carga manual o extracción asistida con inteligencia artificial
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-neutral-400 hover:text-neutral-700 dark:hover:text-neutral-200 hover:bg-neutral-200/60 dark:hover:bg-neutral-800/80 rounded-lg transition-colors cursor-pointer"
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
                <span className="font-medium text-xs">
                  {analyzedFileName || "Extracción asistida de factura"}
                </span>
              </div>
              <div className="flex items-center gap-1.5">
                {previewFileType === "image" && (
                  <div className="flex items-center bg-white dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 rounded-md p-0.5 mr-1">
                    <button
                      type="button"
                      onClick={() => setZoom((prev) => Math.max(prev - 25, 50))}
                      className="p-1 text-neutral-500 hover:text-neutral-900 dark:hover:text-neutral-100 rounded hover:bg-neutral-100 dark:hover:bg-neutral-700"
                      title="Reducir"
                    >
                      <ZoomOut className="w-3 h-3" />
                    </button>
                    <span className="px-1.5 text-[11px] font-mono tabular-nums">{zoom}%</span>
                    <button
                      type="button"
                      onClick={() => setZoom((prev) => Math.min(prev + 25, 250))}
                      className="p-1 text-neutral-500 hover:text-neutral-900 dark:hover:text-neutral-100 rounded hover:bg-neutral-100 dark:hover:bg-neutral-700"
                      title="Aumentar"
                    >
                      <ZoomIn className="w-3 h-3" />
                    </button>
                  </div>
                )}
                {analyzedFileName && (
                  <button
                    type="button"
                    onClick={handleClearFile}
                    className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-medium rounded-md border border-neutral-200 dark:border-neutral-700 bg-white dark:bg-neutral-800 text-neutral-700 dark:text-neutral-300 hover:bg-neutral-50 dark:hover:bg-neutral-700/60 transition-colors cursor-pointer"
                  >
                    <X className="w-3 h-3" />
                    <span>Quitar</span>
                  </button>
                )}
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  disabled={isAnalyzing}
                  className="inline-flex items-center gap-1.5 px-2.5 py-1 text-xs font-medium rounded-md border border-neutral-200 dark:border-neutral-700 bg-white dark:bg-neutral-800 text-neutral-700 dark:text-neutral-300 hover:bg-neutral-50 dark:hover:bg-neutral-700/60 transition-colors cursor-pointer disabled:opacity-50"
                >
                  <UploadCloud className="w-3.5 h-3.5" />
                  <span>{analyzedFileName ? "Cambiar archivo" : "Examinar"}</span>
                </button>
              </div>
            </div>

            <div className="flex-1 w-full h-full overflow-hidden relative flex items-center justify-center p-4">
              <input
                ref={fileInputRef}
                type="file"
                accept=".pdf,.png,.jpg,.jpeg"
                className="hidden"
                onChange={(e) => {
                  if (e.target.files && e.target.files[0]) {
                    handleFileAnalysis(e.target.files[0]);
                  }
                }}
              />

              {isAnalyzing ? (
                <div className="flex flex-col items-center justify-center gap-2.5 text-neutral-400">
                  <RefreshCw className="w-6 h-6 animate-spin text-neutral-400" />
                  <span className="text-xs font-medium text-neutral-700 dark:text-neutral-300">
                    Analizando factura con Gemini AI...
                  </span>
                  <span className="text-[11px] text-neutral-400">
                    Extrayendo datos fiscales, bases imponibles y alícuotas
                  </span>
                </div>
              ) : previewBlobUrl ? (
                previewFileType === "pdf" ? (
                  <iframe
                    src={previewBlobUrl}
                    className="w-full h-full rounded-md shadow-sm border border-neutral-200/80 dark:border-neutral-800 bg-white"
                    title={analyzedFileName || "Documento"}
                  />
                ) : (
                  <div className="w-full h-full overflow-auto flex items-center justify-center p-2">
                    <img
                      src={previewBlobUrl}
                      alt={analyzedFileName || "Documento"}
                      style={{ transform: `scale(${zoom / 100})` }}
                      className="max-w-full max-h-full object-contain mx-auto shadow-sm rounded-md transition-transform duration-150"
                    />
                  </div>
                )
              ) : (
                <div
                  onDragOver={(e) => {
                    e.preventDefault();
                    setIsDragging(true);
                  }}
                  onDragLeave={(e) => {
                    e.preventDefault();
                    setIsDragging(false);
                  }}
                  onDrop={(e) => {
                    e.preventDefault();
                    setIsDragging(false);
                    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
                      handleFileAnalysis(e.dataTransfer.files[0]);
                    }
                  }}
                  onClick={() => fileInputRef.current?.click()}
                  className={`w-full max-w-md p-8 rounded-xl border border-dashed text-center transition-colors cursor-pointer flex flex-col items-center justify-center gap-3 ${isDragging
                    ? "border-neutral-900 bg-neutral-200/60 dark:border-neutral-100 dark:bg-neutral-800/60"
                    : "border-neutral-300 dark:border-neutral-700 hover:border-neutral-400 dark:hover:border-neutral-600 bg-white dark:bg-neutral-900/40"
                    }`}
                >
                  <div className="p-3 rounded-full bg-neutral-100 dark:bg-neutral-800 text-neutral-600 dark:text-neutral-300">
                    <UploadCloud className="w-6 h-6" />
                  </div>
                  <div>
                    <span className="text-xs font-semibold text-neutral-900 dark:text-neutral-100 block">
                      Arrastra la factura aquí o haz clic para seleccionarla
                    </span>
                    <span className="text-[11px] text-neutral-500 dark:text-neutral-400 block mt-1">
                      Admite PDF, JPG y PNG de hasta 10 MB
                    </span>
                  </div>
                  <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-[11px] font-medium bg-neutral-100 dark:bg-neutral-800 text-neutral-700 dark:text-neutral-300 border border-neutral-200 dark:border-neutral-700">
                    <Sparkles className="w-3 h-3 text-neutral-500" />
                    <span>Extracción asistida con Gemini AI</span>
                  </div>
                </div>
              )}
            </div>
          </div>

          <form
            onSubmit={handleSubmit}
            noValidate
            className="flex flex-col h-full overflow-y-auto px-6 py-5 space-y-6 divide-y divide-neutral-200/80 dark:divide-neutral-800/80 text-xs bg-white dark:bg-neutral-950"
          >
            <div>
              <div className="flex items-center justify-between pb-3">
                <div className="flex items-center gap-2">
                  <span className="w-1.5 h-3.5 rounded-full bg-locatel-medio inline-block"></span>
                  <span className="text-xs font-semibold uppercase tracking-wider text-neutral-700 dark:text-neutral-300">
                    Datos de Emisión y Proveedor
                  </span>
                </div>
                {selectedSupplier && (
                  <span className="text-[11px] font-mono px-2 py-0.5 rounded-md bg-locatel-medio/10 text-locatel-oscuro dark:text-locatel-claro font-medium border border-locatel-medio/20">
                    {supplierType} · {selectedSupplier.credit_days}d crédito
                  </span>
                )}
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                <div className={errors.company_id ? "[&_select]:border-rose-500!" : ""}>
                  <label className="text-xs font-medium text-neutral-700 dark:text-neutral-300 block mb-1">
                    Empresa Compradora
                  </label>
                  <select
                    value={companyId}
                    onChange={(e) => setCompanyId(e.target.value)}
                    className="w-full px-3 py-2 text-xs rounded-lg bg-neutral-50/50 dark:bg-neutral-900 border border-neutral-300 dark:border-neutral-700 text-neutral-900 dark:text-neutral-100 focus:outline-none focus:ring-2 focus:ring-locatel-medio/80 dark:focus:ring-locatel-claro/80 focus:border-locatel-medio transition-all shadow-2xs"
                    required
                  >
                    <option value="">Seleccione Empresa</option>
                    {companies.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.name} ({c.rif})
                      </option>
                    ))}
                  </select>
                  {fieldError("company_id")}
                </div>

                <div className={errors.supplier_id ? "[&_select]:border-rose-500!" : ""}>
                  <label className="text-xs font-medium text-neutral-700 dark:text-neutral-300 block mb-1">
                    Proveedor Emisor
                  </label>
                  <select
                    value={supplierId}
                    onChange={(e) => setSupplierId(e.target.value)}
                    className="w-full px-3 py-2 text-xs rounded-lg bg-neutral-50/50 dark:bg-neutral-900 border border-neutral-300 dark:border-neutral-700 text-neutral-900 dark:text-neutral-100 focus:outline-none focus:ring-2 focus:ring-locatel-medio/80 dark:focus:ring-locatel-claro/80 focus:border-locatel-medio transition-all shadow-2xs"
                    required
                  >
                    <option value="">Seleccione Proveedor</option>
                    {suppliers.map((s) => (
                      <option key={s.id} value={s.id}>
                        {s.business_name} ({s.rif}) - [{s.supplier_type || "FIRME"}]
                      </option>
                    ))}
                  </select>
                  {fieldError("supplier_id")}
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5 pt-3">
                <div className={errors.invoice_number ? "[&_input]:border-rose-500!" : ""}>
                  <label className="text-xs font-medium text-neutral-700 dark:text-neutral-300 block mb-1">
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
                    className={`w-full px-3 py-1.5 text-xs font-mono font-medium rounded-lg bg-neutral-50/50 dark:bg-neutral-900 border text-neutral-900 dark:text-neutral-100 focus:outline-none tabular-nums shadow-2xs transition-all ${isDuplicateError
                      ? "border-rose-500 focus:ring-2 focus:ring-rose-500 text-rose-600 focus:border-rose-500"
                      : "border-neutral-300 dark:border-neutral-700 focus:ring-2 focus:ring-locatel-medio/80 dark:focus:ring-locatel-claro/80 focus:border-locatel-medio"
                      }`}
                    required
                  />
                  {fieldError("invoice_number")}
                </div>

                <div className={errors.control_number ? "[&_input]:border-rose-500!" : ""}>
                  <label className="text-xs font-medium text-neutral-700 dark:text-neutral-300 block mb-1">
                    N° de Control
                  </label>
                  <input
                    type="text"
                    value={controlNumber}
                    onChange={(e) => setControlNumber(e.target.value)}
                    placeholder="Ej. 00-123456"
                    className="w-full px-3 py-1.5 text-xs font-mono font-medium rounded-lg bg-neutral-50/50 dark:bg-neutral-900 border border-neutral-300 dark:border-neutral-700 text-neutral-900 dark:text-neutral-100 focus:outline-none focus:ring-2 focus:ring-locatel-medio/80 dark:focus:ring-locatel-claro/80 focus:border-locatel-medio tabular-nums shadow-2xs transition-all"
                  />
                  {fieldError("control_number")}
                </div>

                <div className={errors.purchase_order_number ? "[&_input]:border-rose-500!" : ""}>
                  <label className="text-xs font-medium text-neutral-700 dark:text-neutral-300 block mb-1">
                    Orden de Compra (OC)
                  </label>
                  <input
                    type="text"
                    value={purchaseOrderNumber}
                    onChange={(e) => setPurchaseOrderNumber(e.target.value)}
                    placeholder="Ej. 4500012345"
                    className="w-full px-3 py-1.5 text-xs font-mono font-medium rounded-lg bg-neutral-50/50 dark:bg-neutral-900 border border-neutral-300 dark:border-neutral-700 text-neutral-900 dark:text-neutral-100 focus:outline-none focus:ring-2 focus:ring-locatel-medio/80 dark:focus:ring-locatel-claro/80 focus:border-locatel-medio tabular-nums shadow-2xs transition-all"
                  />
                  {fieldError("purchase_order_number")}
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5 pt-3">
                <div>
                  <label className="text-xs font-medium text-neutral-700 dark:text-neutral-300 block mb-1">
                    Moneda Oficial
                  </label>
                  <select
                    value={currency}
                    onChange={(e) => setCurrency(e.target.value as "VES" | "USD" | "EUR")}
                    className="w-full px-3 py-1.5 text-xs font-medium rounded-lg bg-neutral-50/50 dark:bg-neutral-900 border border-neutral-300 dark:border-neutral-700 text-neutral-900 dark:text-neutral-100 focus:outline-none focus:ring-2 focus:ring-locatel-medio/80 dark:focus:ring-locatel-claro/80 focus:border-locatel-medio shadow-2xs transition-all"
                  >
                    <option value="VES">VES (Bolívares)</option>
                    <option value="USD">USD (Dólares)</option>
                    <option value="EUR">EUR (Euros)</option>
                  </select>
                </div>

                <div className={errors.exchange_rate ? "[&_input]:border-rose-500!" : ""}>
                  <div className="flex items-center justify-between mb-1">
                    <label className="text-xs font-medium text-neutral-700 dark:text-neutral-300">
                      Tasa de Cambio BCV
                    </label>
                    {rateValidDate && (
                      <span className="text-[11px] text-locatel-oscuro dark:text-locatel-claro font-mono tabular-nums font-medium">
                        Válida: {new Date(rateValidDate).toLocaleDateString("es-VE", { timeZone: "UTC" })}
                      </span>
                    )}
                  </div>
                  <div className="relative flex items-center">
                    <input
                      type="text"
                      inputMode="decimal"
                      value={exchangeRateStr}
                      onChange={handleDecimalInput(setExchangeRateStr)}
                      placeholder="1.00"
                      disabled={currency === "VES"}
                      className="w-full pr-8 pl-3 py-1.5 text-xs font-mono font-medium rounded-lg bg-neutral-50/50 dark:bg-neutral-900 border border-neutral-300 dark:border-neutral-700 text-neutral-900 dark:text-neutral-100 focus:outline-none focus:ring-2 focus:ring-locatel-medio/80 dark:focus:ring-locatel-claro/80 focus:border-locatel-medio tabular-nums disabled:opacity-50 shadow-2xs transition-all"
                    />
                    {currency !== "VES" && (
                      <button
                        type="button"
                        onClick={() => fetchRate(currency, issueDate)}
                        disabled={isFetchingRate}
                        title="Actualizar tasa desde BCV"
                        className="absolute right-2 p-1 text-locatel-medio hover:text-locatel-oscuro dark:hover:text-locatel-claro transition-colors cursor-pointer"
                      >
                        <RefreshCw className={`w-3.5 h-3.5 ${isFetchingRate ? "animate-spin" : ""}`} />
                      </button>
                    )}
                  </div>
                  {fieldError("exchange_rate")}
                </div>
              </div>

              <div className="grid grid-cols-1 pb-4 sm:grid-cols-3 gap-3.5 pt-3">
                <div className={errors.issue_date ? "[&_input]:border-rose-500!" : ""}>
                  <label className="text-xs font-medium text-neutral-700 dark:text-neutral-300 block mb-1">
                    Fecha Emisión
                  </label>
                  <input
                    type="date"
                    value={issueDate}
                    onChange={(e) => setIssueDate(e.target.value)}
                    className="w-full px-3 py-1.5 text-xs font-mono font-medium rounded-lg bg-neutral-50/50 dark:bg-neutral-900 border border-neutral-300 dark:border-neutral-700 text-neutral-900 dark:text-neutral-100 focus:outline-none focus:ring-2 focus:ring-locatel-medio/80 dark:focus:ring-locatel-claro/80 focus:border-locatel-medio tabular-nums shadow-2xs transition-all"
                    required
                  />
                  {fieldError("issue_date")}
                </div>

                <div className={errors.reception_date ? "[&_input]:border-rose-500!" : ""}>
                  <label className="text-xs font-medium text-neutral-700 dark:text-neutral-300 block mb-1">
                    {supplierType === "FIRME" ? "Recepción Almacén" : "Fecha Convenida"}
                  </label>
                  <input
                    type="date"
                    value={supplierType === "FIRME" ? receptionDate : manualDueDate}
                    onChange={(e) => {
                      if (supplierType === "FIRME") {
                        setReceptionDate(e.target.value);
                      } else {
                        setManualDueDate(e.target.value);
                      }
                    }}
                    className="w-full px-3 py-1.5 text-xs font-mono font-medium rounded-lg bg-neutral-50/50 dark:bg-neutral-900 border border-neutral-300 dark:border-neutral-700 text-neutral-900 dark:text-neutral-100 focus:outline-none focus:ring-2 focus:ring-locatel-medio/80 dark:focus:ring-locatel-claro/80 focus:border-locatel-medio tabular-nums shadow-2xs transition-all"
                    required
                  />
                  {fieldError("reception_date")}
                </div>

                <div className={errors.due_date ? "[&_input]:border-rose-500!" : ""}>
                  <label className="text-xs font-medium text-neutral-700 dark:text-neutral-300 block mb-1">
                    Fecha Vencimiento
                  </label>
                  <input
                    type="date"
                    value={calculatedDueDate}
                    readOnly={supplierType === "FIRME"}
                    onChange={(e) => setManualDueDate(e.target.value)}
                    className={`w-full px-3 py-1.5 text-xs font-mono font-medium rounded-lg bg-neutral-50/50 dark:bg-neutral-900 border border-neutral-300 dark:border-neutral-700 text-neutral-900 dark:text-neutral-100 focus:outline-none focus:ring-2 focus:ring-locatel-medio/80 dark:focus:ring-locatel-claro/80 focus:border-locatel-medio tabular-nums shadow-2xs transition-all ${supplierType === "FIRME" ? "opacity-75 bg-neutral-100/70 dark:bg-neutral-900/40" : ""
                      }`}
                  />
                  {fieldError("due_date")}
                </div>
              </div>
            </div>

            <div className="pt-5 p-2 space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="w-1.5 h-3.5 rounded-full bg-locatel-medio inline-block"></span>
                  <span className="text-xs font-semibold uppercase tracking-wider text-neutral-700 dark:text-neutral-300">
                    Términos Financieros
                  </span>
                </div>
                {isIndexed && (
                  <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-700">
                    <Layers className="w-3.5 h-3.5 text-locatel-medio" />
                    Indexada a Divisa
                  </span>
                )}
              </div>

              <div className="flex items-center justify-between p-3.5 rounded-xl border border-neutral-200 dark:border-neutral-800 bg-neutral-50/70 dark:bg-neutral-900/40">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-semibold text-neutral-900 dark:text-neutral-100 block">
                      Factura Indexada a Divisa
                    </span>
                    {currency !== "VES" && (
                      <span className="text-[10px] text-amber-600 dark:text-amber-400 font-medium">
                        (Solo aplica a facturas en Bolívares VES)
                      </span>
                    )}
                  </div>
                  <span className="text-[11px] text-neutral-600 dark:text-neutral-400 block mt-0.5">
                    {currency === "VES"
                      ? "Ajustar automáticamente al contravalor en divisas según la tasa BCV del día"
                      : "Las facturas en moneda extranjera (USD/EUR) no se indexan; se liquidan a tasa oficial del día."}
                  </span>
                </div>
                <button
                  type="button"
                  role="switch"
                  aria-checked={currency === "VES" && isIndexed}
                  disabled={currency !== "VES"}
                  onClick={() => currency === "VES" && setIsIndexed(!isIndexed)}
                  className={`relative inline-flex h-5 w-9 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-150 ease-in-out focus:outline-none focus:ring-2 focus:ring-locatel-medio/80 ${currency === "VES" && isIndexed ? "bg-locatel-medio" : "bg-neutral-300 dark:bg-neutral-700"
                    } ${currency !== "VES" ? "opacity-40 cursor-not-allowed" : ""}`}
                >
                  <span
                    aria-hidden="true"
                    className={`pointer-events-none inline-block h-4 w-4 transform rounded-full bg-white shadow-sm ring-0 transition duration-150 ease-in-out ${currency === "VES" && isIndexed ? "translate-x-4" : "translate-x-0"
                      }`}
                  />
                </button>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                <div className={`p-3 rounded-xl border border-neutral-200 dark:border-neutral-800 bg-neutral-50/70 dark:bg-neutral-900/40 space-y-1.5 shadow-2xs ${errors.early_payment_pct ? "[&_input]:border-rose-500!" : ""}`}>
                  <div className="flex justify-between items-center">
                    <span className="text-xs font-medium text-neutral-700 dark:text-neutral-300">
                      % Pronto Pago
                    </span>
                    {previewEarlyPaymentAmount > 0 && (
                      <span className="text-[11px] font-mono font-medium text-emerald-600 dark:text-emerald-400 tabular-nums">
                        -{previewEarlyPaymentAmount.toFixed(2)}
                      </span>
                    )}
                  </div>
                  <div className="relative flex items-center">
                    <input
                      type="text"
                      inputMode="decimal"
                      value={earlyPaymentPctStr}
                      onChange={handleDecimalInput(setEarlyPaymentPctStr)}
                      placeholder="0.00"
                      className="w-full pr-7 pl-3 py-1.5 text-xs font-mono font-medium rounded-lg border border-neutral-300 dark:border-neutral-700 bg-white dark:bg-neutral-900 text-neutral-900 dark:text-neutral-100 focus:outline-none focus:ring-2 focus:ring-locatel-medio/80 dark:focus:ring-locatel-claro/80 focus:border-locatel-medio text-right tabular-nums shadow-2xs transition-all"
                    />
                    <span className="absolute right-2.5 text-xs font-mono text-neutral-400 pointer-events-none">%</span>
                  </div>
                  {fieldError("early_payment_pct")}
                </div>

                <div className={`p-3 rounded-xl border border-neutral-200 dark:border-neutral-800 bg-neutral-50/70 dark:bg-neutral-900/40 space-y-1.5 shadow-2xs ${errors.vat_retention_pct ? "[&_select]:border-rose-500!" : ""}`}>
                  <div className="flex justify-between items-center">
                    <span className="text-xs font-medium text-neutral-700 dark:text-neutral-300">
                      % Retención IVA
                    </span>
                    {vatRetentionAmount > 0 && (
                      <span className="text-[11px] font-mono font-medium text-rose-600 dark:text-rose-400 tabular-nums">
                        -{vatRetentionAmount.toFixed(2)}
                      </span>
                    )}
                  </div>
                  <select
                    value={vatRetentionPctStr}
                    onChange={(e) => setVatRetentionPctStr(e.target.value)}
                    className="w-full px-3 py-1.5 text-xs font-mono font-medium rounded-lg border border-neutral-300 dark:border-neutral-700 bg-white dark:bg-neutral-900 text-neutral-900 dark:text-neutral-100 focus:outline-none focus:ring-2 focus:ring-locatel-medio/80 dark:focus:ring-locatel-claro/80 focus:border-locatel-medio shadow-2xs transition-all"
                  >
                    <option value="0">0%</option>
                    <option value="75">75%</option>
                    <option value="100">100%</option>
                  </select>
                  {fieldError("vat_retention_pct")}
                </div>

                <div className={`p-3 rounded-xl border border-neutral-200 dark:border-neutral-800 bg-neutral-50/70 dark:bg-neutral-900/40 space-y-1.5 shadow-2xs ${errors.islr_retention_pct ? "[&_input]:border-rose-500!" : ""}`}>
                  <div className="flex justify-between items-center">
                    <span className="text-xs font-medium text-neutral-700 dark:text-neutral-300">
                      % Retención ISLR
                    </span>
                    {islrRetentionAmount > 0 && (
                      <span className="text-[11px] font-mono font-medium text-rose-600 dark:text-rose-400 tabular-nums">
                        -{islrRetentionAmount.toFixed(2)}
                      </span>
                    )}
                  </div>
                  <div className="relative flex items-center">
                    <input
                      type="text"
                      inputMode="decimal"
                      value={islrRetentionPctStr}
                      onChange={handleDecimalInput(setIslrRetentionPctStr)}
                      placeholder="0.00"
                      className="w-full pr-7 pl-3 py-1.5 text-xs font-mono font-medium rounded-lg border border-neutral-300 dark:border-neutral-700 bg-white dark:bg-neutral-900 text-neutral-900 dark:text-neutral-100 focus:outline-none focus:ring-2 focus:ring-locatel-medio/80 dark:focus:ring-locatel-claro/80 focus:border-locatel-medio text-right tabular-nums shadow-2xs transition-all"
                    />
                    <span className="absolute right-2.5 text-xs font-mono text-neutral-400 pointer-events-none">%</span>
                  </div>
                  {fieldError("islr_retention_pct")}
                </div>

                {/* <div className="p-3 rounded-lg border border-neutral-200/80 dark:border-neutral-800 bg-neutral-50/50 dark:bg-neutral-900/40 space-y-1.5">
                  <span className="text-xs font-medium text-neutral-700 dark:text-neutral-300 block">
                    Monto IGTF
                  </span>
                  <div className="relative flex items-center">
                    <input
                      type="text"
                      inputMode="decimal"
                      value={igtfAmountStr}
                      onChange={handleDecimalInput(setIgtfAmountStr)}
                      placeholder="0.00"
                      className="w-full px-3 py-1.5 text-xs font-mono font-medium rounded-lg border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-900 text-neutral-900 dark:text-neutral-100 focus:outline-none focus:ring-1 focus:ring-neutral-900 dark:focus:ring-neutral-100 text-right tabular-nums"
                    />
                  </div>
                </div> */}
              </div>
            </div>

            <div className="pt-5 pb-4 space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="w-1.5 h-3.5 rounded-full bg-locatel-medio inline-block"></span>
                  <span className="text-xs font-semibold uppercase tracking-wider text-neutral-700 dark:text-neutral-300">
                    Desglose Tributario y Bases
                  </span>
                </div>
              </div>

              <div className="p-3.5 rounded-xl border border-neutral-200 dark:border-neutral-800 bg-neutral-50/70 dark:bg-neutral-900/50 flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-2xs">
                <div>
                  <label className="text-xs font-bold text-neutral-900 dark:text-neutral-100 block">
                    Subtotal (Total Productos / Servicios)
                  </label>
                  <span className="text-[11px] text-neutral-500 dark:text-neutral-400 block mt-0.5">
                    Monto base antes de impuestos y descuentos de la factura física
                  </span>
                </div>
                <div className={`w-full sm:w-56 ${errors.subtotal || errors.total_amount ? "[&_input]:border-rose-500!" : ""}`}>
                  <input
                    type="text"
                    inputMode="decimal"
                    value={subtotalStr}
                    onChange={handleSubtotalChange}
                    placeholder="0.00"
                    className="w-full px-3 py-2 text-sm font-mono font-bold rounded-lg border border-locatel-medio/40 dark:border-locatel-medio/30 bg-white dark:bg-neutral-900 text-neutral-900 dark:text-neutral-100 text-right tabular-nums focus:outline-none focus:ring-2 focus:ring-locatel-medio dark:focus:ring-locatel-claro focus:border-locatel-medio shadow-xs transition-all"
                  />
                  {fieldError(errors.subtotal ? "subtotal" : "total_amount")}
                </div>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
                <div className="p-3 rounded-xl border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-900 shadow-2xs hover:border-locatel-medio/40 transition-colors">
                  <label className="text-xs font-semibold text-neutral-700 dark:text-neutral-300 block mb-1">
                    Base 16% (G)
                  </label>
                  <input
                    type="text"
                    inputMode="decimal"
                    value={taxableBase16Str}
                    onChange={handleDecimalInput(setTaxableBase16Str)}
                    placeholder="0.00"
                    className="w-full px-2.5 py-1.5 text-xs font-mono font-medium rounded-lg border border-neutral-300 dark:border-neutral-700 bg-neutral-50/50 dark:bg-neutral-800/40 text-neutral-900 dark:text-neutral-100 text-right tabular-nums focus:outline-none focus:ring-2 focus:ring-locatel-medio/80 dark:focus:ring-locatel-claro/80 focus:border-locatel-medio transition-all"
                  />
                  <span className="text-[11px] text-locatel-oscuro dark:text-locatel-claro font-mono font-medium mt-1 block tabular-nums">
                    IVA: {taxAmount16.toFixed(2)}
                  </span>
                </div>

                <div className="p-3 rounded-xl border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-900 shadow-2xs hover:border-locatel-medio/40 transition-colors">
                  <label className="text-xs font-semibold text-neutral-700 dark:text-neutral-300 block mb-1">
                    Base 8% (R)
                  </label>
                  <input
                    type="text"
                    inputMode="decimal"
                    value={taxableBase8Str}
                    onChange={handleDecimalInput(setTaxableBase8Str)}
                    placeholder="0.00"
                    className="w-full px-2.5 py-1.5 text-xs font-mono font-medium rounded-lg border border-neutral-300 dark:border-neutral-700 bg-neutral-50/50 dark:bg-neutral-800/40 text-neutral-900 dark:text-neutral-100 text-right tabular-nums focus:outline-none focus:ring-2 focus:ring-locatel-medio/80 dark:focus:ring-locatel-claro/80 focus:border-locatel-medio transition-all"
                  />
                  <span className="text-[11px] text-locatel-oscuro dark:text-locatel-claro font-mono font-medium mt-1 block tabular-nums">
                    IVA: {taxAmount8.toFixed(2)}
                  </span>
                </div>

                <div className="p-3 rounded-xl border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-900 shadow-2xs hover:border-locatel-medio/40 transition-colors">
                  <label className="text-xs font-semibold text-neutral-700 dark:text-neutral-300 block mb-1">
                    Base 31% (A)
                  </label>
                  <input
                    type="text"
                    inputMode="decimal"
                    value={taxableBase31Str}
                    onChange={handleDecimalInput(setTaxableBase31Str)}
                    placeholder="0.00"
                    className="w-full px-2.5 py-1.5 text-xs font-mono font-medium rounded-lg border border-neutral-300 dark:border-neutral-700 bg-neutral-50/50 dark:bg-neutral-800/40 text-neutral-900 dark:text-neutral-100 text-right tabular-nums focus:outline-none focus:ring-2 focus:ring-locatel-medio/80 dark:focus:ring-locatel-claro/80 focus:border-locatel-medio transition-all"
                  />
                  <span className="text-[11px] text-locatel-oscuro dark:text-locatel-claro font-mono font-medium mt-1 block tabular-nums">
                    IVA: {taxAmount31.toFixed(2)}
                  </span>
                </div>

                <div className={`p-3 rounded-xl border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-900 shadow-2xs hover:border-locatel-medio/40 transition-colors ${errors.exempt_amount ? "[&_input]:border-rose-500!" : ""}`}>
                  <label className="text-xs font-semibold text-neutral-700 dark:text-neutral-300 block mb-1">
                    Monto Exento
                  </label>
                  <input
                    type="text"
                    inputMode="decimal"
                    value={exemptAmountStr}
                    onChange={handleExemptChange}
                    placeholder="0.00"
                    className="w-full px-2.5 py-1.5 text-xs font-mono font-medium rounded-lg border border-neutral-300 dark:border-neutral-700 bg-neutral-50/50 dark:bg-neutral-800/40 text-neutral-900 dark:text-neutral-100 text-right tabular-nums focus:outline-none focus:ring-2 focus:ring-locatel-medio/80 dark:focus:ring-locatel-claro/80 focus:border-locatel-medio transition-all"
                  />
                  {fieldError("exempt_amount")}
                </div>

                <div className={`p-3 rounded-xl border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-900 shadow-2xs hover:border-locatel-medio/40 transition-colors ${errors.discount_amount ? "[&_input]:border-rose-500!" : ""}`}>
                  <label className="text-xs font-semibold text-neutral-700 dark:text-neutral-300 block mb-1">
                    Descuento Com.
                  </label>
                  <input
                    type="text"
                    inputMode="decimal"
                    value={discountStr}
                    onChange={handleDiscountChange}
                    placeholder="0.00"
                    className="w-full px-2.5 py-1.5 text-xs font-mono font-medium rounded-lg border border-neutral-300 dark:border-neutral-700 bg-neutral-50/50 dark:bg-neutral-800/40 text-neutral-900 dark:text-neutral-100 text-right tabular-nums focus:outline-none focus:ring-2 focus:ring-locatel-medio/80 dark:focus:ring-locatel-claro/80 focus:border-locatel-medio transition-all"
                  />
                  {fieldError("discount_amount")}
                </div>
              </div>

              <div className="space-y-1.5 pt-1 text-xs">
                <div className="flex justify-between items-center text-neutral-600 dark:text-neutral-400">
                  <span>Subtotal Productos:</span>
                  <span className="font-mono font-medium text-neutral-900 dark:text-neutral-100 tabular-nums">
                    {formatMoney(effectiveSubtotal, currency)}
                  </span>
                </div>
                {discountAmount > 0 && (
                  <div className="flex justify-between items-center text-neutral-600 dark:text-neutral-400">
                    <span>Descuento Comercial:</span>
                    <span className="font-mono font-medium text-neutral-900 dark:text-neutral-100 tabular-nums">
                      - {formatMoney(discountAmount, currency)}
                    </span>
                  </div>
                )}
                <div className="flex justify-between items-center text-neutral-600 dark:text-neutral-400">
                  <span>Total IVA (16% + 8% + 31%):</span>
                  <span className="font-mono font-medium text-neutral-900 dark:text-neutral-100 tabular-nums">
                    + {formatMoney(totalTaxAmount, currency)}
                  </span>
                </div>
                {igtfAmount > 0 && (
                  <div className="flex justify-between items-center text-neutral-600 dark:text-neutral-400">
                    <span>Monto IGTF:</span>
                    <span className="font-mono font-medium text-neutral-900 dark:text-neutral-100 tabular-nums">
                      + {formatMoney(igtfAmount, currency)}
                    </span>
                  </div>
                )}
                <div className="flex justify-between items-center text-neutral-600 dark:text-neutral-400 font-semibold border-t border-neutral-200/50 dark:border-neutral-800/50 pt-1">
                  <span>Total Factura:</span>
                  <span className="font-mono font-semibold text-neutral-900 dark:text-neutral-100 tabular-nums">
                    {formatMoney(totalAmount, currency)}
                  </span>
                </div>
                <div className="flex justify-between items-center text-neutral-600 dark:text-neutral-400">
                  <span>Retenciones / Deducciones ({vatRetentionPct > 0 ? `IVA ${vatRetentionPct}%` : ""}{islrRetentionPct > 0 ? ` · ISLR ${islrRetentionPct}%` : ""}{earlyPaymentPct > 0 ? ` · P.Pago ${earlyPaymentPct}%` : ""}):</span>
                  <span className="font-mono font-medium text-rose-600 dark:text-rose-400 tabular-nums">
                    - {formatMoney(retencionesTotal, currency)}
                  </span>
                </div>
              </div>
            </div>

            <div className="pt-5">
              <div className="p-5 rounded-2xl border border-neutral-200 dark:border-neutral-800 bg-neutral-50/70 dark:bg-neutral-900/60 shadow-md space-y-4">
                <div className="flex items-center justify-between pb-3 border-b border-neutral-200/80 dark:border-neutral-800">
                  <div>
                    <span className="text-xs font-semibold text-neutral-600 dark:text-neutral-400 block">Total Factura</span>
                    <span className="font-mono font-bold text-neutral-900 dark:text-neutral-100 text-base tabular-nums">
                      {formatMoney(totalAmount, currency)}
                    </span>
                  </div>
                  <div className="text-right">
                    <span className="text-xs font-semibold text-neutral-600 dark:text-neutral-400 block">Tasa BCV Aplicada</span>
                    <span className="font-mono font-bold text-locatel-oscuro dark:text-locatel-claro text-base tabular-nums">
                      Bs. {exchangeRate.toFixed(4)}
                    </span>
                  </div>
                </div>

                <div>
                  <div className="flex items-baseline justify-between">
                    <div>
                      <span className="text-xs font-bold uppercase tracking-wider text-locatel-oscuro dark:text-locatel-claro block">
                        Monto Neto a Pagar
                      </span>
                      <p className="font-mono font-extrabold text-3xl tracking-tight text-locatel-medio dark:text-locatel-claro tabular-nums drop-shadow-xs">
                        {formatMoney(netAmount, currency)}
                      </p>
                    </div>
                    <div className="text-right">
                      <span className="text-xs font-semibold text-neutral-600 dark:text-neutral-400 block">
                        Contravalor Estimado
                      </span>
                      <p className="font-mono font-bold text-xl tracking-tight text-neutral-800 dark:text-neutral-200 tabular-nums">
                        {currency === "USD"
                          ? formatMoney(equivalentVES, "VES")
                          : formatMoney(equivalentUSD, "USD")}
                      </p>
                    </div>
                  </div>

                  {earlyPaymentPct > 0 && (
                    <div className="mt-3 pt-2.5 border-t border-emerald-200/60 dark:border-emerald-800/40 flex justify-between items-center text-xs font-mono font-semibold text-emerald-700 dark:text-emerald-300 tabular-nums">
                      <span>Neto con Pronto Pago: {formatMoney(Math.max(0, netAmount - previewEarlyPaymentAmount), currency)}</span>
                      <span className="px-2 py-0.5 rounded bg-emerald-100 dark:bg-emerald-900/60 border border-emerald-300 dark:border-emerald-700">Desc ({earlyPaymentPct}%): -{formatMoney(previewEarlyPaymentAmount, currency)}</span>
                    </div>
                  )}
                </div>
              </div>

              <div className="flex items-center justify-end gap-3 pt-5 pb-1">
                <button
                  type="button"
                  onClick={onClose}
                  className="px-4 py-2 bg-neutral-100 hover:bg-neutral-200 dark:bg-neutral-800 dark:hover:bg-neutral-700 text-neutral-800 dark:text-neutral-200 text-xs font-medium rounded-lg transition-colors cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="inline-flex items-center gap-2 px-5 py-2.5 text-xs font-semibold rounded-lg bg-locatel-medio text-white hover:bg-locatel-oscuro dark:bg-locatel-medio dark:hover:bg-locatel-oscuro shadow-sm hover:shadow transition-all disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
                >
                  {isSubmitting ? (
                    <RefreshCw className="w-4 h-4 animate-spin" />
                  ) : (
                    <FileText className="w-4 h-4" />
                  )}
                  <span>Registrar Factura</span>
                </button>
              </div>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
