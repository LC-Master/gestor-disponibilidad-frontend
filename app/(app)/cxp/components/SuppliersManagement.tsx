"use client";

import { useEffect, useState } from "react";
import {
  Building2,
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
import { fetchClient } from "@/lib/fetchClient";
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
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingSupplier, setEditingSupplier] = useState<Supplier | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [togglingId, setTogglingId] = useState<string | null>(null);
  const [selectedSupplierStatementId, setSelectedSupplierStatementId] = useState<string | null>(null);
  const [selectedDetailSupplierId, setSelectedDetailSupplierId] = useState<string | null>(null);

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
      if (search.trim()) params.append("search", search.trim());
      if (statusFilter !== "all") params.append("status", statusFilter);

      const res = await fetchClient(`/api/cxp/suppliers?${params.toString()}`);
      if (!res.ok) {
        throw new Error("Error al obtener la lista de proveedores");
      }
      const data = await res.json();
      setSuppliers(Array.isArray(data) ? data : []);
    } catch (err: any) {
      toast.error(err.message || "Error al cargar proveedores");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const timer = setTimeout(() => {
      fetchSuppliers();
    }, 250);
    return () => clearTimeout(timer);
  }, [search, statusFilter]);

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

  const handleSubmitModal = async (e: React.FormEvent) => {
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
      toast.error(err.message || "Ocurrió un error");
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
      toast.error(err.message || "Error al actualizar estado");
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
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Buscar por RIF, Razón Social o Código SAP..."
              className="w-full pl-9 pr-4 py-2 bg-neutral-50 dark:bg-neutral-800/80 border border-neutral-200 dark:border-neutral-700/80 rounded-xl text-xs text-neutral-900 dark:text-neutral-100 placeholder:text-neutral-400 focus:outline-none focus:ring-2 focus:ring-locatel-medio/40 focus:border-locatel-medio"
            />
          </div>

          <div className="flex items-center gap-2">
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value as any)}
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

      <div className="bg-white dark:bg-neutral-900 rounded-2xl border border-neutral-200 dark:border-neutral-800 shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs text-neutral-600 dark:text-neutral-400">
            <thead className="bg-neutral-50 dark:bg-neutral-800/60 text-neutral-700 dark:text-neutral-300 font-bold uppercase tracking-wider text-[11px] border-b border-neutral-200 dark:border-neutral-800">
              <tr>
                <th className="py-3 px-4">RIF</th>
                <th className="py-3 px-4">Razón Social</th>
                <th className="py-3 px-4">Tipo</th>
                <th className="py-3 px-4">Código SAP</th>
                <th className="py-3 px-4 text-center">Días de Crédito</th>
                <th className="py-3 px-4 text-center">Estado</th>
                <th className="py-3 px-4 text-right">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-neutral-100 dark:divide-neutral-800/60">
              {loading && suppliers.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-12 text-center text-neutral-400">
                    <div className="flex flex-col items-center justify-center gap-2">
                      <RefreshCw className="w-6 h-6 animate-spin text-locatel-medio" />
                      <span>Cargando catálogo de proveedores...</span>
                    </div>
                  </td>
                </tr>
              ) : suppliers.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-12 text-center text-neutral-400">
                    <div className="flex flex-col items-center justify-center gap-2">
                      <Building2 className="w-8 h-8 text-neutral-300 dark:text-neutral-600" />
                      <span>No se encontraron proveedores que coincidan con la búsqueda</span>
                    </div>
                  </td>
                </tr>
              ) : (
                suppliers.map((s) => (
                  <tr
                    key={s.id}
                    className="hover:bg-neutral-50/70 dark:hover:bg-neutral-800/30 transition-colors"
                  >
                    <td className="py-3.5 px-4 font-mono font-bold text-neutral-900 dark:text-neutral-100">
                      {s.rif}
                    </td>
                    <td className="py-3.5 px-4 font-medium text-neutral-900 dark:text-neutral-200 max-w-xs truncate">
                      {s.business_name}
                    </td>
                    <td className="py-3.5 px-4">
                      <span className={`px-2 py-0.5 rounded text-[10px] font-bold tracking-wider uppercase ${
                        s.supplier_type === "CONSIGNACION"
                          ? "bg-purple-100 text-purple-800 dark:bg-purple-950/60 dark:text-purple-300 border border-purple-200 dark:border-purple-800/60"
                          : "bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800/60"
                      }`}>
                        {s.supplier_type || "FIRME"}
                      </span>
                    </td>
                    <td className="py-3.5 px-4 font-mono text-neutral-600 dark:text-neutral-400">
                      {s.sap_vendor_code ? (
                        <span className="px-2 py-0.5 rounded bg-neutral-100 dark:bg-neutral-800 text-[11px] font-semibold">
                          {s.sap_vendor_code}
                        </span>
                      ) : (
                        <span className="text-neutral-400 dark:text-neutral-600">-</span>
                      )}
                    </td>
                    <td className="py-3.5 px-4 text-center font-semibold text-neutral-800 dark:text-neutral-200">
                      <span className="inline-flex items-center px-2 py-0.5 rounded-full bg-neutral-100 dark:bg-neutral-800 text-neutral-700 dark:text-neutral-300 text-[11px]">
                        {s.credit_days} {s.credit_days === 1 ? "día" : "días"}
                      </span>
                    </td>
                    <td className="py-3.5 px-4 text-center">
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
                    <td className="py-3.5 px-4 text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        <button
                          onClick={() => setSelectedDetailSupplierId(s.id)}
                          className="p-1.5 rounded-lg text-locatel-medio hover:text-locatel-medio/80 hover:bg-locatel-medio/10 dark:hover:bg-emerald-950/40 transition-colors cursor-pointer"
                          title="Ver Detalle del Proveedor"
                        >
                          <Eye className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => {
                            if (onViewStatement) {
                              onViewStatement(s.id);
                            } else {
                              setSelectedSupplierStatementId(s.id);
                            }
                          }}
                          className="p-1.5 rounded-lg text-purple-600 hover:text-purple-800 hover:bg-purple-50 dark:hover:bg-purple-950/40 transition-colors cursor-pointer"
                          title="Ver Estado de Cuenta"
                        >
                          <FileText className="w-4 h-4" />
                        </button>

                        {canManageSuppliers && (
                          <>
                            <button
                              onClick={() => openEditModal(s)}
                              className="p-1.5 rounded-lg text-neutral-500 hover:text-neutral-900 dark:hover:text-neutral-100 hover:bg-neutral-100 dark:hover:bg-neutral-800 transition-colors cursor-pointer"
                              title="Editar proveedor"
                            >
                              <Edit2 className="w-4 h-4" />
                            </button>
                            <button
                              onClick={() => handleToggleStatus(s)}
                              disabled={togglingId === s.id}
                              className={`p-1.5 rounded-lg transition-colors cursor-pointer ${s.is_active
                                ? "text-red-500 hover:text-red-700 hover:bg-red-50 dark:hover:bg-red-950/40"
                                : "text-emerald-600 hover:text-emerald-800 hover:bg-emerald-50 dark:hover:bg-emerald-950/40"
                                }`}
                              title={s.is_active ? "Desactivar proveedor" : "Activar proveedor"}
                            >
                              <Power
                                className={`w-4 h-4 ${togglingId === s.id ? "animate-spin text-neutral-400" : ""
                                  }`}
                              />
                            </button>
                          </>
                        )}
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
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
