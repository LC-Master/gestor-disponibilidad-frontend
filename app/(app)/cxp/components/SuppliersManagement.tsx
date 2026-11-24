"use client";

import { useEffect, useState } from "react";
import {
  Building2,
  ChevronLeft,
  ChevronRight,
  Edit2,
  Eye,
  FileText,
  Plus,
  Power,
  RefreshCw,
  Search,
  X,
} from "lucide-react";
import { toast } from "sonner";
import { fetchClient, sanitizeErrorMessage } from "@/lib/fetchClient";
import { ActionMenuPortal } from "@/components/ui/ActionMenuPortal";
import { Company } from "@/app/(app)/tesoreria/types";
import { Supplier, CreateSupplierPayload, UpdateSupplierPayload } from "../types";
import { SupplierStatementView } from "./SupplierStatementView";
import { SupplierDetailModal } from "./SupplierDetailModal";

interface UserProfile {
  id: string;
  name: string;
  last_name: string;
  email: string;
  is_active: boolean;
  roles?: string[];
  permissions?: string[];
}

interface SuppliersManagementProps {
  user?: UserProfile | null;
  companies?: Company[];
  onViewStatement?: (supplierId: string) => void;
}

export function SuppliersManagement({
  user,
  companies = [],
  onViewStatement,
}: SuppliersManagementProps) {
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<"all" | "active" | "inactive">("all");
  const [page, setPage] = useState<number>(1);
  const [pageSize, setPageSize] = useState<number>(25);
  const [totalRecords, setTotalRecords] = useState<number>(0);
  const [totalPages, setTotalPages] = useState<number>(1);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingSupplier, setEditingSupplier] = useState<Supplier | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [togglingId, setTogglingId] = useState<string | null>(null);
  const [selectedSupplierStatementId, setSelectedSupplierStatementId] = useState<string | null>(null);
  const [selectedDetailSupplierId, setSelectedDetailSupplierId] = useState<string | null>(null);
  const [activeActionMenuId, setActiveActionMenuId] = useState<string | null>(null);

  const [modalRif, setModalRif] = useState("");
  const [modalBusinessName, setModalBusinessName] = useState("");
  const [modalSapVendorCode, setModalSapVendorCode] = useState("");
  const [modalSupplierType, setModalSupplierType] = useState<"FIRME" | "CONSIGNACION">("FIRME");
  const [modalCreditDays, setModalCreditDays] = useState("0");

  const canManageSuppliers = Boolean(
    (user?.roles || []).some((r) => {
      const u = r.toUpperCase().trim();
      return u === "ADMIN" || u === "ADMINISTRADOR" || u === "COORD_CXP";
    }) ||
    (user?.permissions || []).some(
      (p) => p.toLowerCase().trim() === "cxp.suppliers.manage"
    )
  );

  const fetchSuppliers = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      params.append("page", String(page));
      params.append("page_size", String(pageSize));
      if (search.trim()) params.append("search", search.trim());
      if (statusFilter !== "all") params.append("status", statusFilter);

      const res = await fetchClient(`/api/cxp/suppliers?${params.toString()}`);
      if (!res.ok) {
        throw new Error("Error al obtener la lista de proveedores");
      }
      const resData = await res.json();
      if (Array.isArray(resData)) {
        setSuppliers(resData);
        setTotalRecords(resData.length);
        setTotalPages(Math.max(1, Math.ceil(resData.length / pageSize)));
      } else {
        const items = Array.isArray(resData?.data) ? resData.data : [];
        setSuppliers(items);
        setTotalRecords(resData?.meta?.total_records ?? items.length);
        setTotalPages(Math.max(1, resData?.meta?.total_pages ?? 1));
      }
    } catch (err: any) {
      toast.error(sanitizeErrorMessage(err, "Error al cargar proveedores"));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const timer = setTimeout(() => {
      fetchSuppliers();
    }, 250);
    return () => clearTimeout(timer);
  }, [search, statusFilter, page, pageSize]);

  const paginatedSuppliers = suppliers;

  const openCreateModal = () => {
    setEditingSupplier(null);
    setModalRif("");
    setModalBusinessName("");
    setModalSapVendorCode("");
    setModalSupplierType("FIRME");
    setModalCreditDays("0");
    setIsModalOpen(true);
  };

  const openEditModal = (supplier: Supplier) => {
    setEditingSupplier(supplier);
    setModalRif(supplier.rif);
    setModalBusinessName(supplier.business_name);
    setModalSapVendorCode(supplier.sap_vendor_code || "");
    setModalSupplierType(supplier.supplier_type || "FIRME");
    setModalCreditDays(String(supplier.credit_days));
    setIsModalOpen(true);
  };

  const closeModal = () => {
    setIsModalOpen(false);
    setEditingSupplier(null);
  };

  const handleCreditDaysChange = (val: string) => {
    if (/^[0-9]*$/.test(val)) {
      setModalCreditDays(val);
    }
  };

  const handleSubmitModal = async (e: React.SubmitEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!modalBusinessName.trim()) {
      toast.error("La razón social es obligatoria");
      return;
    }
    if (!editingSupplier && !modalRif.trim()) {
      toast.error("El RIF es obligatorio");
      return;
    }

    const creditDays = parseInt(modalCreditDays, 10) || 0;
    setIsSubmitting(true);

    try {
      if (editingSupplier) {
        const payload: UpdateSupplierPayload = {
          business_name: modalBusinessName.trim(),
          sap_vendor_code: modalSapVendorCode.trim() ? modalSapVendorCode.trim() : undefined,
          supplier_type: modalSupplierType,
          credit_days: creditDays,
        };

        const res = await fetchClient(`/api/cxp/suppliers/${editingSupplier.id}`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });

        if (!res.ok) {
          const errData = await res.json().catch(() => ({}));
          throw new Error(errData.message || "Error al actualizar proveedor");
        }

        toast.success("Proveedor actualizado exitosamente");
      } else {
        const payload: CreateSupplierPayload = {
          rif: modalRif.trim().toUpperCase(),
          business_name: modalBusinessName.trim(),
          sap_vendor_code: modalSapVendorCode.trim() ? modalSapVendorCode.trim() : undefined,
          supplier_type: modalSupplierType,
          credit_days: creditDays,
        };

        const res = await fetchClient("/api/cxp/suppliers", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });

        if (!res.ok) {
          const errData = await res.json().catch(() => ({}));
          throw new Error(errData.message || "Error al crear proveedor");
        }

        toast.success("Proveedor registrado exitosamente");
      }

      closeModal();
      fetchSuppliers();
    } catch (err: any) {
      toast.error(sanitizeErrorMessage(err, "Ocurrió un error al procesar el proveedor"));
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleToggleStatus = async (supplier: Supplier) => {
    if (!canManageSuppliers) return;
    setTogglingId(supplier.id);
    try {
      const res = await fetchClient(`/api/cxp/suppliers/${supplier.id}/toggle-status`, {
        method: "PATCH",
      });
      if (!res.ok) {
        const errData = await res.json().catch(() => ({}));
        throw new Error(errData.message || "Error al cambiar estado del proveedor");
      }
      const data = await res.json();
      setSuppliers((prev) =>
        prev.map((s) => (s.id === supplier.id ? { ...s, is_active: data.is_active } : s))
      );
      toast.success(
        `Proveedor ${supplier.business_name} ${data.is_active ? "activado" : "desactivado"}`
      );
    } catch (err: any) {
      toast.error(sanitizeErrorMessage(err, "Error al actualizar estado"));
    } finally {
      setTogglingId(null);
    }
  };

  if (selectedSupplierStatementId) {
    return (
      <SupplierStatementView
        supplierId={selectedSupplierStatementId}
        onBack={() => setSelectedSupplierStatementId(null)}
        companies={companies}
      />
    );
  }

  return (
    <div className="space-y-5">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white dark:bg-neutral-900 p-4 rounded-2xl border border-neutral-200 dark:border-neutral-800 shadow-xs">
        <div className="flex flex-wrap items-center gap-3 flex-1">
          <div className="relative flex-1 min-w-55 max-w-md">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-neutral-400" />
            <input
              type="text"
              value={search}
              onChange={(e) => {
                setSearch(e.target.value);
                setPage(1);
              }}
              placeholder="Buscar por RIF, Razón Social o Código SAP..."
              className="w-full pl-9 pr-4 py-2 bg-neutral-50 dark:bg-neutral-800/80 border border-neutral-200 dark:border-neutral-700/80 rounded-xl text-xs text-neutral-900 dark:text-neutral-100 placeholder:text-neutral-400 focus:outline-none focus:ring-2 focus:ring-locatel-medio/40 focus:border-locatel-medio"
            />
          </div>

          <div className="flex items-center gap-2">
            <select
              value={statusFilter}
              onChange={(e) => {
                setStatusFilter(e.target.value as any);
                setPage(1);
              }}
              className="px-3 py-2 bg-neutral-50 dark:bg-neutral-800/80 border border-neutral-200 dark:border-neutral-700/80 rounded-xl text-xs text-neutral-700 dark:text-neutral-300 focus:outline-none focus:ring-2 focus:ring-locatel-medio/40 focus:border-locatel-medio cursor-pointer"
            >
              <option value="all">Todos los Estados</option>
              <option value="active">Activos</option>
              <option value="inactive">Inactivos</option>
            </select>

            <button
              onClick={() => fetchSuppliers()}
              disabled={loading}
              className="p-2 text-neutral-500 hover:text-neutral-900 dark:hover:text-neutral-200 bg-neutral-100 hover:bg-neutral-200 dark:bg-neutral-800 dark:hover:bg-neutral-700 rounded-xl transition-colors cursor-pointer"
              title="Refrescar lista"
            >
              <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin text-locatel-medio" : ""}`} />
            </button>
          </div>
        </div>

        {canManageSuppliers && (
          <button
            onClick={openCreateModal}
            className="flex items-center justify-center gap-2 px-4 py-2 bg-locatel-medio hover:bg-locatel-oscuro text-white text-xs font-semibold rounded-xl shadow-xs transition-colors cursor-pointer shrink-0"
          >
            <Plus className="w-4 h-4" />
            <span>Nuevo Proveedor</span>
          </button>
        )}
      </div>

      <div className="bg-white dark:bg-neutral-900 rounded-2xl border border-neutral-200 dark:border-neutral-800 shadow-xs flex flex-col min-h-[calc(100vh-14rem)]">
        <div className="overflow-x-auto flex-1">
          <table className="w-full text-left text-xs text-neutral-600 dark:text-neutral-400 min-w-230">
            <thead className="bg-neutral-50 dark:bg-neutral-800/60 text-neutral-700 dark:text-neutral-300 font-bold uppercase tracking-wider text-[11px] border-b border-neutral-200 dark:border-neutral-800">
              <tr>
                <th className="py-3 px-4">RIF</th>
                <th className="py-3 px-4">Razón Social</th>
                <th className="py-3 px-4">Tipo</th>
                <th className="py-3 px-4">Código SAP</th>
                <th className="py-3 px-4 text-center">Días de Crédito</th>
                <th className="py-3 px-4 text-center">Estado</th>
                <th className="py-3 px-3 w-12 text-center uppercase tracking-wider">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-neutral-100 dark:divide-neutral-800/60">
              {loading && suppliers.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-12 text-center text-neutral-400">
                    <div className="flex flex-col items-center justify-center gap-2">
                      <RefreshCw className="w-6 h-6 animate-spin text-locatel-medio" />
                      <span>Cargando catálogo de proveedores...</span>
                    </div>
                  </td>
                </tr>
              ) : suppliers.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-12 text-center text-neutral-400">
                    <div className="flex flex-col items-center justify-center gap-2">
                      <Building2 className="w-8 h-8 text-neutral-300 dark:text-neutral-600" />
                      <span>No se encontraron proveedores que coincidan con la búsqueda</span>
                    </div>
                  </td>
                </tr>
              ) : (
                paginatedSuppliers.map((s) => (
                  <tr
                    key={s.id}
                    className="hover:bg-neutral-50/70 dark:hover:bg-neutral-800/30 transition-colors"
                  >
                    <td className="py-3.5 px-4 font-mono font-bold text-neutral-900 dark:text-neutral-100 whitespace-nowrap">
                      {s.rif}
                    </td>
                    <td className="py-3.5 px-4 font-medium text-neutral-900 dark:text-neutral-200 max-w-xs truncate">
                      {s.business_name}
                    </td>
                    <td className="py-3.5 px-4 whitespace-nowrap">
                      <span className={`px-2 py-0.5 rounded text-[10px] font-bold tracking-wider uppercase ${s.supplier_type === "CONSIGNACION"
                        ? "bg-purple-100 text-purple-800 dark:bg-purple-950/60 dark:text-purple-300 border border-purple-200 dark:border-purple-800/60"
                        : "bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800/60"
                        }`}>
                        {s.supplier_type || "FIRME"}
                      </span>
                    </td>
                    <td className="py-3.5 px-4 font-mono text-neutral-600 dark:text-neutral-400 whitespace-nowrap">
                      {s.sap_vendor_code ? (
                        <span className="px-2 py-0.5 rounded bg-neutral-100 dark:bg-neutral-800 text-[11px] font-semibold">
                          {s.sap_vendor_code}
                        </span>
                      ) : (
                        <span className="text-neutral-400 dark:text-neutral-600">-</span>
                      )}
                    </td>
                    <td className="py-3.5 px-4 text-center font-semibold text-neutral-800 dark:text-neutral-200 whitespace-nowrap">
                      <span className="inline-flex items-center px-2 py-0.5 rounded-full bg-neutral-100 dark:bg-neutral-800 text-neutral-700 dark:text-neutral-300 text-[11px]">
                        {s.credit_days} {s.credit_days === 1 ? "día" : "días"}
                      </span>
                    </td>
                    <td className="py-3.5 px-4 text-center whitespace-nowrap">
                      {s.is_active ? (
                        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-semibold bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800/60">
                          <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                          Activo
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-semibold bg-neutral-100 dark:bg-neutral-800 text-neutral-500 dark:text-neutral-400 border border-neutral-200 dark:border-neutral-700">
                          <span className="w-1.5 h-1.5 rounded-full bg-neutral-400" />
                          Inactivo
                        </span>
                      )}
                    </td>
                    <td className="py-3 px-3 text-center whitespace-nowrap">
                      <ActionMenuPortal
                        isOpen={activeActionMenuId === s.id}
                        onToggle={() => setActiveActionMenuId(activeActionMenuId === s.id ? null : s.id)}
                        onClose={() => setActiveActionMenuId(null)}
                      >
                        <button
                          onClick={() => {
                            setActiveActionMenuId(null);
                            setSelectedDetailSupplierId(s.id);
                          }}
                          className="w-full flex items-center gap-2 px-3 py-2 text-neutral-700 dark:text-neutral-200 hover:bg-neutral-100 dark:hover:bg-neutral-800 transition-colors cursor-pointer"
                        >
                          <Eye className="w-3.5 h-3.5 text-locatel-medio" />
                          <span>Ver Detalle</span>
                        </button>

                        <button
                          onClick={() => {
                            setActiveActionMenuId(null);
                            if (onViewStatement) {
                              onViewStatement(s.id);
                            } else {
                              setSelectedSupplierStatementId(s.id);
                            }
                          }}
                          className="w-full flex items-center gap-2 px-3 py-2 text-neutral-700 dark:text-neutral-200 hover:bg-neutral-100 dark:hover:bg-neutral-800 transition-colors cursor-pointer"
                        >
                          <FileText className="w-3.5 h-3.5 text-purple-600" />
                          <span>Estado de Cuenta</span>
                        </button>

                        {canManageSuppliers && (
                          <>
                            <button
                              onClick={() => {
                                setActiveActionMenuId(null);
                                openEditModal(s);
                              }}
                              className="w-full flex items-center gap-2 px-3 py-2 text-neutral-700 dark:text-neutral-200 hover:bg-neutral-100 dark:hover:bg-neutral-800 transition-colors cursor-pointer"
                            >
                              <Edit2 className="w-3.5 h-3.5 text-neutral-500" />
                              <span>Editar</span>
                            </button>

                            <button
                              onClick={() => {
                                setActiveActionMenuId(null);
                                handleToggleStatus(s);
                              }}
                              disabled={togglingId === s.id}
                              className={`w-full flex items-center gap-2 px-3 py-2 transition-colors cursor-pointer ${s.is_active
                                ? "text-red-600 hover:bg-red-50 dark:hover:bg-red-950/30"
                                : "text-emerald-600 hover:bg-emerald-50 dark:hover:bg-emerald-950/30"
                                }`}
                            >
                              <Power className="w-3.5 h-3.5" />
                              <span>{s.is_active ? "Desactivar" : "Activar"}</span>
                            </button>
                          </>
                        )}
                      </ActionMenuPortal>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
        <div className="px-4 py-3 border-t border-neutral-200 dark:border-neutral-800 bg-neutral-50/50 dark:bg-neutral-900/30 flex flex-wrap items-center justify-between gap-3 text-xs">
          <div className="flex items-center gap-3 text-neutral-500 dark:text-neutral-400">
            <span>
              Total: <strong className="text-neutral-800 dark:text-neutral-200 font-mono">{totalRecords.toLocaleString("es-VE")}</strong> registros
            </span>
            <select
              value={pageSize}
              onChange={(e) => {
                setPageSize(Number(e.target.value));
                setPage(1);
              }}
              className="px-2 py-1 rounded-md border border-neutral-200 dark:border-neutral-700 bg-white dark:bg-neutral-900 text-xs text-neutral-700 dark:text-neutral-300 focus:outline-none cursor-pointer"
            >
              <option value={25}>25 / pág</option>
              <option value={50}>50 / pág</option>
              <option value={100}>100 / pág</option>
            </select>
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={page <= 1 || loading}
              className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg border border-neutral-200 dark:border-neutral-700 bg-white dark:bg-neutral-900 hover:bg-neutral-100 dark:hover:bg-neutral-800 text-neutral-700 dark:text-neutral-300 font-medium disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer transition-colors"
            >
              <ChevronLeft className="w-3.5 h-3.5" />
              <span>Anterior</span>
            </button>
            <span className="font-mono text-neutral-600 dark:text-neutral-300 px-2">
              Página <strong>{page}</strong> de <strong>{totalPages}</strong>
            </span>
            <button
              type="button"
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              disabled={page >= totalPages || loading}
              className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg border border-neutral-200 dark:border-neutral-700 bg-white dark:bg-neutral-900 hover:bg-neutral-100 dark:hover:bg-neutral-800 text-neutral-700 dark:text-neutral-300 font-medium disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer transition-colors"
            >
              <span>Siguiente</span>
              <ChevronRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      </div>

      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs animate-in fade-in duration-200">
          <div className="bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-2xl w-full max-w-md shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200">
            <div className="px-5 py-4 border-b border-neutral-100 dark:border-neutral-800 flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="p-2 rounded-xl bg-locatel-medio/10 text-locatel-medio">
                  <Building2 className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-neutral-900 dark:text-neutral-100">
                    {editingSupplier ? "Editar Proveedor" : "Registrar Proveedor"}
                  </h3>
                  <p className="text-[11px] text-neutral-400">
                    {editingSupplier
                      ? "Modifica los datos comerciales pactados con el acreedor"
                      : "Ingresa la información básica y condiciones de crédito"}
                  </p>
                </div>
              </div>
              <button
                onClick={closeModal}
                className="p-1.5 text-neutral-400 hover:text-neutral-600 dark:hover:text-neutral-200 rounded-lg hover:bg-neutral-100 dark:hover:bg-neutral-800 transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSubmitModal} className="p-5 space-y-4">
              <div>
                <label className="block text-xs font-semibold text-neutral-700 dark:text-neutral-300 mb-1.5">
                  RIF (Registro de Información Fiscal) *
                </label>
                <input
                  type="text"
                  disabled={Boolean(editingSupplier)}
                  value={modalRif}
                  onChange={(e) => setModalRif(e.target.value.toUpperCase())}
                  placeholder="Ej. J-12345678-9"
                  className={`w-full px-3 py-2 bg-neutral-50 dark:bg-neutral-800 border rounded-xl text-xs font-mono focus:outline-none focus:ring-2 focus:ring-locatel-medio/40 focus:border-locatel-medio uppercase ${editingSupplier
                    ? "opacity-60 cursor-not-allowed border-neutral-200 dark:border-neutral-700 text-neutral-500"
                    : "border-neutral-200 dark:border-neutral-700 text-neutral-900 dark:text-neutral-100"
                    }`}
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-neutral-700 dark:text-neutral-300 mb-1.5">
                  Razón Social *
                </label>
                <input
                  type="text"
                  value={modalBusinessName}
                  onChange={(e) => setModalBusinessName(e.target.value)}
                  placeholder="Ej. Droguería Nena C.A."
                  className="w-full px-3 py-2 bg-neutral-50 dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 rounded-xl text-xs text-neutral-900 dark:text-neutral-100 focus:outline-none focus:ring-2 focus:ring-locatel-medio/40 focus:border-locatel-medio"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-neutral-700 dark:text-neutral-300 mb-1.5">
                  Tipo de Proveedor *
                </label>
                <select
                  value={modalSupplierType}
                  onChange={(e) => setModalSupplierType(e.target.value as "FIRME" | "CONSIGNACION")}
                  className="w-full px-3 py-2 bg-neutral-50 dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 rounded-xl text-xs font-semibold text-neutral-900 dark:text-neutral-100 focus:outline-none focus:ring-2 focus:ring-locatel-medio/40 focus:border-locatel-medio cursor-pointer"
                  required
                >
                  <option value="FIRME">FIRME (Vencimiento según crédito MIGO)</option>
                  <option value="CONSIGNACION">CONSIGNACIÓN (Pago según liquidación de ventas)</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-neutral-700 dark:text-neutral-300 mb-1.5">
                  Código SAP Acreedor (Opcional)
                </label>
                <input
                  type="text"
                  value={modalSapVendorCode}
                  onChange={(e) => setModalSapVendorCode(e.target.value)}
                  placeholder="Ej. 1000425"
                  className="w-full px-3 py-2 bg-neutral-50 dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 rounded-xl text-xs font-mono text-neutral-900 dark:text-neutral-100 focus:outline-none focus:ring-2 focus:ring-locatel-medio/40 focus:border-locatel-medio"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-neutral-700 dark:text-neutral-300 mb-1.5">
                  Días de Crédito Pactados *
                </label>
                <div className="relative">
                  <input
                    type="text"
                    inputMode="numeric"
                    autoComplete="off"
                    value={modalCreditDays}
                    onChange={(e) => handleCreditDaysChange(e.target.value)}
                    placeholder="0"
                    className="w-full pl-3 pr-14 py-2 bg-neutral-50 dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 rounded-xl text-xs font-semibold text-neutral-900 dark:text-neutral-100 focus:outline-none focus:ring-2 focus:ring-locatel-medio/40 focus:border-locatel-medio"
                    required
                  />
                  <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-neutral-400 font-medium pointer-events-none">
                    días
                  </span>
                </div>
                <p className="text-[10px] text-neutral-400 dark:text-neutral-500 mt-1">
                  Se utilizará para calcular automáticamente el vencimiento a partir de la recepción MIGO.
                </p>
              </div>

              <div className="pt-3 border-t border-neutral-100 dark:border-neutral-800 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={closeModal}
                  disabled={isSubmitting}
                  className="px-4 py-2 text-xs font-semibold text-neutral-600 dark:text-neutral-400 hover:bg-neutral-100 dark:hover:bg-neutral-800 rounded-xl transition-colors cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="flex items-center gap-2 px-4 py-2 bg-locatel-medio hover:bg-locatel-oscuro text-white text-xs font-semibold rounded-xl shadow-xs transition-colors cursor-pointer disabled:opacity-50"
                >
                  {isSubmitting && <RefreshCw className="w-3.5 h-3.5 animate-spin" />}
                  <span>{editingSupplier ? "Guardar Cambios" : "Crear Proveedor"}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      <SupplierDetailModal
        isOpen={Boolean(selectedDetailSupplierId)}
        onClose={() => setSelectedDetailSupplierId(null)}
        supplierId={selectedDetailSupplierId}
        companies={companies}
        canEdit={canManageSuppliers}
      />
    </div>
  );
}
