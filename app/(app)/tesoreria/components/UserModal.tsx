"use client";

import { useMemo, useState } from "react";
import {
  AlertCircle,
  Check,
  ChevronRight,
  Eye,
  EyeOff,
  Lock,
  Mail,
  Shield,
  ShieldCheck,
  User,
  UserPlus,
  X,
} from "lucide-react";
import { PermissionDetail, RoleDetail } from "../types";

export interface PermissionMeta {
  title: string;
  description: string;
  category: "Core" | "Tesorería" | "Cuentas por Pagar" | "Administración y Seguridad" | "Otros";
}

export const PERMISSION_METADATA_MAP: Record<string, PermissionMeta> = {
  "core.accounts.manage": {
    title: "Gestión de Cuentas Maestras",
    description: "Crear, parametrizar y administrar cuentas financieras troncales del sistema.",
    category: "Core",
  },
  "treasury.accounts.view": {
    title: "Consulta de Cuentas y Terminales",
    description: "Visualizar el catálogo de cuentas bancarias y terminales de tesorería.",
    category: "Tesorería",
  },
  "treasury.accounts.manage": {
    title: "Administración Bancaria",
    description: "Registrar, actualizar y configurar cuentas y terminales bancarios de empresas.",
    category: "Tesorería",
  },
  "treasury.balances.view": {
    title: "Visualización de Saldos Diarios",
    description: "Consultar saldos operativos registrados en las cuentas y cierres diarios.",
    category: "Tesorería",
  },
  "treasury.balances.record": {
    title: "Captura de Saldos Operativos",
    description: "Registrar saldos iniciales y movimientos en la matriz de cierre operativo.",
    category: "Tesorería",
  },
  "treasury.balances.edit": {
    title: "Edición de Saldos en Curso",
    description: "Modificar saldos de cuentas antes de realizar el cierre definitivo del día.",
    category: "Tesorería",
  },
  "treasury.balances.override": {
    title: "Sobreescritura de Cierres Fijados",
    description: "Facultad extraordinaria para desbloquear y modificar saldos ya cerrados.",
    category: "Tesorería",
  },
  "treasury.availability.view": {
    title: "Consulta de Disponibilidad Diaria",
    description: "Visualizar la disponibilidad consolidada y cupos por empresa.",
    category: "Tesorería",
  },
  "treasury.availability.edit": {
    title: "Distribución de Liquidez",
    description: "Asignar montos para proveedores, nómina y tributos durante el cierre.",
    category: "Tesorería",
  },
  "treasury.availability.approve": {
    title: "Aprobación y Cierre de Liquidez",
    description: "Cerrar formalmente la disponibilidad diaria y liberar cupos para CxP.",
    category: "Tesorería",
  },
  "treasury.history.view": {
    title: "Histórico y Matriz Mensual",
    description: "Acceso a la matriz histórica de saldos, variaciones y tendencias.",
    category: "Tesorería",
  },
  "reports.treasury.view": {
    title: "Reportes de Tesorería",
    description: "Exportar y consultar consolidados de disponibilidad y cierres de tesorería.",
    category: "Tesorería",
  },
  "reports.dashboard.view": {
    title: "Panel Ejecutivo y Estadísticas",
    description: "Acceso al dashboard global de métricas, indicadores y KPIs ejecutivos.",
    category: "Core",
  },
  "users.view": {
    title: "Visualización de Usuarios",
    description: "Consultar el directorio de usuarios y colaboradores del sistema.",
    category: "Administración y Seguridad",
  },
  "users.manage": {
    title: "Gestión Integral de Usuarios",
    description: "Crear, modificar, activar/desactivar usuarios y asignar roles y permisos.",
    category: "Administración y Seguridad",
  },
  "cxp.suppliers.view": {
    title: "Directorio de Proveedores",
    description: "Consultar fichas técnicas, cuentas bancarias y datos de proveedores.",
    category: "Cuentas por Pagar",
  },
  "cxp.suppliers.manage": {
    title: "Gestión de Proveedores",
    description: "Crear proveedores, modificar datos fiscales, condiciones de crédito y cuentas.",
    category: "Cuentas por Pagar",
  },
  "cxp.invoices.view": {
    title: "Bandeja de Facturas CxP",
    description: "Consultar facturas pendientes, recepcionadas y liquidadas.",
    category: "Cuentas por Pagar",
  },
  "cxp.invoices.create": {
    title: "Registro de Facturas",
    description: "Carga manual de facturas y documentos de compras (MIRO / MRKO / FB60).",
    category: "Cuentas por Pagar",
  },
  "cxp.invoices.edit": {
    title: "Modificación de Facturas",
    description: "Actualizar términos financieros y retenciones en facturas no liquidadas.",
    category: "Cuentas por Pagar",
  },
  "cxp.invoices.cancel": {
    title: "Anulación de Facturas",
    description: "Anular facturas erróneas y retirar de bandejas de procesamiento.",
    category: "Cuentas por Pagar",
  },
  "cxp.calendar.view": {
    title: "Calendario de Vencimientos CxP",
    description: "Visualizar proyección mensual y diaria de vencimientos de deuda.",
    category: "Cuentas por Pagar",
  },
  "cxp.proposals.create": {
    title: "Creación de Propuestas de Pago",
    description: "Armar propuestas de pago automáticas con IA o selección manual.",
    category: "Cuentas por Pagar",
  },
  "cxp.proposals.view": {
    title: "Consulta de Propuestas",
    description: "Acceder a la bandeja de propuestas de pago en revisión y programadas.",
    category: "Cuentas por Pagar",
  },
  "cxp.proposals.review": {
    title: "Auditoría y Aprobación de Propuestas",
    description: "Aprobar o rechazar propuestas de pago contra el cupo de Tesorería.",
    category: "Cuentas por Pagar",
  },
  "cxp.payments.schedule": {
    title: "Programación de Pagos",
    description: "Asignar facturas aprobadas en la agenda de transferencias.",
    category: "Cuentas por Pagar",
  },
  "cxp.payments.approve": {
    title: "Aprobación Financiera de Pagos",
    description: "Autorizar lotes de pago validados contra disponibilidad en bancos.",
    category: "Cuentas por Pagar",
  },
  "cxp.payments.execute": {
    title: "Liquidación y Registro Bancario",
    description: "Liquidar pagos, marcar facturas como pagadas y registrar transferencias.",
    category: "Cuentas por Pagar",
  },
  "cxp.payments.revert": {
    title: "Reversión y Desprogramación",
    description: "Desprogramar facturas de lotes y restituir el cupo a Tesorería.",
    category: "Cuentas por Pagar",
  },
  "cxp.reports.view": {
    title: "Reportes de Deuda y Antigüedad (Aging)",
    description: "Consultar reportes de cuentas por pagar, estados de cuenta y mora.",
    category: "Cuentas por Pagar",
  },
};

export function getFriendlyPermission(code: string, fallbackName?: string, fallbackDesc?: string): PermissionMeta {
  if (PERMISSION_METADATA_MAP[code]) {
    return PERMISSION_METADATA_MAP[code];
  }

  const parts = code.split(".");
  const title = fallbackName && fallbackName !== code
    ? fallbackName
    : parts
      .map((p) => p.charAt(0).toUpperCase() + p.slice(1))
      .join(" · ");

  const description = fallbackDesc && fallbackDesc !== code
    ? fallbackDesc
    : `Permiso granular para la operación técnica ${code}`;

  let category: PermissionMeta["category"] = "Otros";
  const prefix = parts[0]?.toLowerCase();
  if (prefix === "core") category = "Core";
  else if (prefix === "treasury") category = "Tesorería";
  else if (prefix === "cxp") category = "Cuentas por Pagar";
  else if (prefix === "users" || prefix === "roles") category = "Administración y Seguridad";

  return { title, description, category };
}

interface UserModalFormData {
  name: string;
  lastName: string;
  email: string;
  password?: string;
  confirmPassword?: string;
  roles: string[];
  permissions: string[];
  isActive?: boolean;
}

interface UserModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (e: React.FormEvent) => void;
  isEdit?: boolean;
  formData: UserModalFormData;
  setFormData: React.Dispatch<React.SetStateAction<any>>;
  selectableRoles: RoleDetail[];
  availablePermissions: PermissionDetail[];
  isSubmitting: boolean;
  onToggleRole: (roleName: string) => void;
  onTogglePermission: (code: string) => void;
  onToggleModulePermissions: (moduleCategory: string) => void;
}

export function UserModal({
  isOpen,
  onClose,
  onSubmit,
  isEdit = false,
  formData,
  setFormData,
  selectableRoles,
  availablePermissions,
  isSubmitting,
  onToggleRole,
  onTogglePermission,
  onToggleModulePermissions,
}: UserModalProps) {
  const [activeTab, setActiveTab] = useState<"basics" | "permissions">("basics");
  const [showPassword, setShowPassword] = useState(false);
  const [permissionSearch, setPermissionSearch] = useState("");

  const categorizedPermissions = useMemo(() => {
    const categories: Record<string, Array<PermissionDetail & { meta: PermissionMeta }>> = {
      "Core": [],
      "Tesorería": [],
      "Cuentas por Pagar": [],
      "Administración y Seguridad": [],
      "Otros": [],
    };

    availablePermissions.forEach((p) => {
      const meta = getFriendlyPermission(p.code, p.name, p.description);
      const cat = meta.category in categories ? meta.category : "Otros";
      categories[cat].push({ ...p, meta });
    });

    const entries = Object.entries(categories).filter(([_, items]) => items.length > 0);
    return entries;
  }, [availablePermissions]);

  const filteredCategorizedPermissions = useMemo(() => {
    const q = permissionSearch.trim().toLowerCase();
    if (!q) return categorizedPermissions;

    return categorizedPermissions
      .map(([cat, perms]) => {
        const filtered = perms.filter((p) => {
          return (
            p.code.toLowerCase().includes(q) ||
            p.meta.title.toLowerCase().includes(q) ||
            p.meta.description.toLowerCase().includes(q)
          );
        });
        return [cat, filtered] as [string, typeof perms];
      })
      .filter(([_, perms]) => perms.length > 0);
  }, [categorizedPermissions, permissionSearch]);

  const currentRoles = formData?.roles || [];
  const currentPerms = formData?.permissions || [];

  const passwordMismatch = Boolean(
    formData.confirmPassword &&
    formData.password &&
    formData.password !== formData.confirmPassword
  );

  if (!isOpen) return null;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="user-modal-title"
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/60 backdrop-blur-xs animate-in fade-in duration-150 overflow-hidden"
    >
      <div className="max-w-4xl w-[95vw] max-h-[90vh] flex flex-col bg-white dark:bg-neutral-950 rounded-2xl border border-neutral-200 dark:border-neutral-800 shadow-2xl overflow-hidden animate-in zoom-in-95 duration-150">
        <div className="px-6 py-4 border-b border-neutral-200 dark:border-neutral-800 flex items-center justify-between gap-4 bg-neutral-50/50 dark:bg-neutral-900/40 shrink-0">
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-10 h-10 rounded-xl bg-locatel-medio dark:bg-locatel-claro/95 text-white dark:text-text-white flex items-center justify-center shrink-0 shadow-xs">
              {isEdit ? <User className="w-5 h-5" /> : <UserPlus className="w-5 h-5" />}
            </div>
            <div className="min-w-0">
              <h2
                id="user-modal-title"
                className="text-base font-bold text-neutral-900 dark:text-neutral-100 tracking-tight"
              >
                {isEdit ? "Editar Perfil y Permisos" : "Crear Nuevo Usuario"}
              </h2>
              <p className="text-xs text-neutral-500 dark:text-neutral-400 truncate mt-0.5">
                {isEdit
                  ? `Configuración de accesos y roles para ${formData.email || "el usuario"}`
                  : "Defina credenciales corporativas, roles del sistema y accesos granulares"}
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            aria-label="Cerrar"
            className="p-1.5 rounded-lg text-neutral-400 hover:text-neutral-700 dark:hover:text-neutral-200 hover:bg-neutral-100 dark:hover:bg-neutral-800 transition-colors cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-neutral-400"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="px-6 border-b border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-950 flex items-center gap-2 shrink-0">
          <button
            type="button"
            onClick={() => setActiveTab("basics")}
            className={`py-3 px-3 text-xs font-semibold border-b-2 transition-all flex items-center gap-2 cursor-pointer ${activeTab === "basics"
              ? "border-locatel-medio text-locatel-medio dark:border-locatel-claro/95 dark:text-locatel-claro/95"
              : "border-transparent text-neutral-500 hover:text-neutral-800 dark:hover:text-neutral-300"
              }`}
          >
            <User className="w-3.5 h-3.5" />
            <span>Datos Básicos y Roles</span>
            {currentRoles.length > 0 && (
              <span className="px-1.5 py-0.2 rounded-full text-[10px] bg-neutral-100 dark:bg-neutral-800 font-mono text-neutral-700 dark:text-neutral-300">
                {currentRoles.length}
              </span>
            )}
          </button>

          <button
            type="button"
            onClick={() => setActiveTab("permissions")}
            className={`py-3 px-3 text-xs font-semibold border-b-2 transition-all flex items-center gap-2 cursor-pointer ${activeTab === "permissions"
              ? "border-locatel-medio dark:border-locatel-claro/95 text-locatel-medio dark:text-locatel-claro/95"
              : "border-transparent text-neutral-500 hover:text-neutral-800 dark:hover:text-neutral-300"
              }`}
          >
            <ShieldCheck className="w-3.5 h-3.5" />
            <span>Matriz de Permisos Puntuales</span>
            <span
              className={`px-1.5 py-0.2 rounded-full text-[10px] font-mono ${currentPerms.length > 0
                ? "bg-locatel-medio text-white dark:bg-locatel-claro/95 dark:text-text-white font-bold"
                : "bg-neutral-100 dark:bg-neutral-800 text-neutral-500"
                }`}
            >
              {currentPerms.length}
            </span>
          </button>
        </div>

        <form onSubmit={onSubmit} className="flex flex-col flex-1 min-h-0 overflow-hidden">
          <div className="p-6 overflow-y-auto flex-1 space-y-6">
            {activeTab === "basics" && (
              <div className="space-y-6 animate-in fade-in duration-150">
                <div>
                  <h3 className="text-xs font-bold uppercase tracking-wider text-neutral-500 dark:text-neutral-400 mb-3 flex items-center gap-2">
                    <User className="w-3.5 h-3.5" />
                    <span>Información Personal y Credenciales</span>
                  </h3>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label
                        htmlFor="user-modal-name"
                        className="block text-xs font-semibold text-neutral-700 dark:text-neutral-300 mb-1"
                      >
                        Nombre <span className="text-red-500">*</span>
                      </label>
                      <input
                        id="user-modal-name"
                        type="text"
                        required
                        value={formData.name}
                        onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                        placeholder="Ej. Carlos"
                        className="w-full px-3 py-2 text-xs rounded-xl border border-neutral-300 dark:border-neutral-700 bg-neutral-50/50 dark:bg-neutral-900 text-neutral-900 dark:text-neutral-100 placeholder:text-neutral-400 focus:outline-none focus:ring-2 focus:ring-neutral-400 dark:focus:ring-neutral-600 transition-colors"
                      />
                    </div>

                    <div>
                      <label
                        htmlFor="user-modal-lastname"
                        className="block text-xs font-semibold text-neutral-700 dark:text-neutral-300 mb-1"
                      >
                        Apellido <span className="text-red-500">*</span>
                      </label>
                      <input
                        id="user-modal-lastname"
                        type="text"
                        required
                        value={formData.lastName}
                        onChange={(e) => setFormData({ ...formData, lastName: e.target.value })}
                        placeholder="Ej. Mendoza"
                        className="w-full px-3 py-2 text-xs rounded-xl border border-neutral-300 dark:border-neutral-700 bg-neutral-50/50 dark:bg-neutral-900 text-neutral-900 dark:text-neutral-100 placeholder:text-neutral-400 focus:outline-none focus:ring-2 focus:ring-neutral-400 dark:focus:ring-neutral-600 transition-colors"
                      />
                    </div>

                    <div className="sm:col-span-2">
                      <label
                        htmlFor="user-modal-email"
                        className="block text-xs font-semibold text-neutral-700 dark:text-neutral-300 mb-1"
                      >
                        Correo Electrónico Corporativo <span className="text-red-500">*</span>
                      </label>
                      <div className="relative">
                        <Mail className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-neutral-400 pointer-events-none" />
                        <input
                          id="user-modal-email"
                          type="email"
                          required
                          value={formData.email}
                          onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                          placeholder="usuario@locatel.com.ve"
                          className="w-full pl-9 pr-3 py-2 text-xs rounded-xl border border-neutral-300 dark:border-neutral-700 bg-neutral-50/50 dark:bg-neutral-900 text-neutral-900 dark:text-neutral-100 placeholder:text-neutral-400 focus:outline-none focus:ring-2 focus:ring-neutral-400 dark:focus:ring-neutral-600 transition-colors font-mono"
                        />
                      </div>
                    </div>

                    <div>
                      <label
                        htmlFor="user-modal-password"
                        className="block text-xs font-semibold text-neutral-700 dark:text-neutral-300 mb-1"
                      >
                        {isEdit ? "Nueva Contraseña (Opcional)" : "Contraseña Temporal"} {!isEdit && <span className="text-red-500">*</span>}
                      </label>
                      <div className="relative">
                        <Lock className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-neutral-400 pointer-events-none" />
                        <input
                          id="user-modal-password"
                          type={showPassword ? "text" : "password"}
                          required={!isEdit}
                          minLength={8}
                          placeholder={isEdit ? "Dejar en blanco para conservar" : "Mínimo 8 caracteres"}
                          value={formData.password || ""}
                          onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                          className="w-full pl-9 pr-10 py-2 text-xs rounded-xl border border-neutral-300 dark:border-neutral-700 bg-neutral-50/50 dark:bg-neutral-900 text-neutral-900 dark:text-neutral-100 placeholder:text-neutral-400 focus:outline-none focus:ring-2 focus:ring-neutral-400 dark:focus:ring-neutral-600 transition-colors font-mono"
                        />
                        <button
                          type="button"
                          aria-label={showPassword ? "Ocultar contraseña" : "Ver contraseña"}
                          onClick={() => setShowPassword(!showPassword)}
                          className="absolute right-2.5 top-1/2 -translate-y-1/2 p-1 text-neutral-400 hover:text-neutral-700 dark:hover:text-neutral-200 cursor-pointer rounded-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-neutral-400"
                        >
                          {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                        </button>
                      </div>
                    </div>

                    <div>
                      <label
                        htmlFor="user-modal-confirmpassword"
                        className="block text-xs font-semibold text-neutral-700 dark:text-neutral-300 mb-1"
                      >
                        {isEdit ? "Confirmar Nueva Contraseña" : "Confirmar Contraseña"} {!isEdit && <span className="text-red-500">*</span>}
                      </label>
                      <div className="relative">
                        <Lock className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-neutral-400 pointer-events-none" />
                        <input
                          id="user-modal-confirmpassword"
                          type={showPassword ? "text" : "password"}
                          required={!isEdit || Boolean(formData.password)}
                          minLength={8}
                          placeholder="Repita la contraseña"
                          value={formData.confirmPassword || ""}
                          onChange={(e) => setFormData({ ...formData, confirmPassword: e.target.value })}
                          className={`w-full pl-9 pr-10 py-2 text-xs rounded-xl border bg-neutral-50/50 dark:bg-neutral-900 text-neutral-900 dark:text-neutral-100 placeholder:text-neutral-400 focus:outline-none focus:ring-2 transition-colors font-mono ${passwordMismatch
                            ? "border-red-500 focus:ring-red-400"
                            : "border-neutral-300 dark:border-neutral-700 focus:ring-neutral-400 dark:focus:ring-neutral-600"
                            }`}
                        />
                        <button
                          type="button"
                          aria-label={showPassword ? "Ocultar contraseña" : "Ver contraseña"}
                          onClick={() => setShowPassword(!showPassword)}
                          className="absolute right-2.5 top-1/2 -translate-y-1/2 p-1 text-neutral-400 hover:text-neutral-700 dark:hover:text-neutral-200 cursor-pointer rounded-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-neutral-400"
                        >
                          {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                        </button>
                      </div>
                      {passwordMismatch && (
                        <p className="text-[11px] text-red-500 mt-1 flex items-center gap-1 font-medium">
                          <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                          <span>Las contraseñas no coinciden</span>
                        </p>
                      )}
                    </div>
                  </div>
                </div>

                <div className="pt-4 border-t border-neutral-100 dark:border-neutral-900">
                  <div className="flex items-center justify-between mb-3">
                    <div>
                      <h3 className="text-xs font-bold uppercase tracking-wider text-neutral-500 dark:text-neutral-400 flex items-center gap-2">
                        <Shield className="w-3.5 h-3.5" />
                        <span>Asignación de Roles del Sistema</span>
                      </h3>
                      <p className="text-[11px] text-neutral-500 mt-0.5">
                        Los roles conceden paquetes predefinidos de autorizaciones según la función operativa.
                      </p>
                    </div>
                    <span className="text-xs font-mono font-semibold text-neutral-600 dark:text-neutral-400">
                      {currentRoles.length} seleccionado(s)
                    </span>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                    {selectableRoles.map((role) => {
                      const isChecked = currentRoles.includes(role.name);
                      return (
                        <div
                          key={role.name}
                          role="checkbox"
                          aria-checked={isChecked}
                          tabIndex={0}
                          onClick={(e) => {
                            e.preventDefault();
                            e.stopPropagation();
                            onToggleRole(role.name);
                          }}
                          onKeyDown={(e) => {
                            if (e.key === " " || e.key === "Enter") {
                              e.preventDefault();
                              e.stopPropagation();
                              onToggleRole(role.name);
                            }
                          }}
                          className={`border rounded-xl p-3 cursor-pointer flex items-start gap-3 transition-all select-none focus:outline-none focus:ring-2 focus:ring-neutral-400 dark:focus:ring-neutral-600 ${isChecked
                            ? "border-locatel-medio dark:border-locatel-claro/95 bg-neutral-900/5 dark:bg-white/5 shadow-xs"
                            : "border-neutral-200 dark:border-neutral-800 bg-neutral-50/50 hover:bg-neutral-100/50 dark:bg-neutral-900/30 dark:hover:bg-neutral-800/50"
                            }`}
                        >
                          <div
                            aria-hidden="true"
                            className={`w-4 h-4 rounded-md flex items-center justify-center border shrink-0 mt-0.5 transition-colors ${isChecked
                              ? "bg-locatel-medio border-locatel-medio text-white dark:bg-locatel-claro/95 dark:border-locatel-claro/95 dark:text-text-white"
                              : "border-locatel-medio dark:border-locatel-claro/95 bg-white dark:bg-neutral-900"
                              }`}
                          >
                            {isChecked && <Check className="w-3 h-3 stroke-3" />}
                          </div>
                          <div className="min-w-0">
                            <div className="text-xs font-bold text-neutral-900 dark:text-neutral-100 leading-snug">
                              {role.display_name}
                            </div>
                            <p className="text-[10px] text-neutral-500 dark:text-neutral-400 leading-relaxed mt-1">
                              {role.description || role.name}
                            </p>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>

                {isEdit && (
                  <div className="pt-4 border-t border-neutral-100 dark:border-neutral-900">
                    <label
                      htmlFor="user-modal-isactive"
                      className="inline-flex items-center gap-3 p-3 rounded-xl border border-neutral-200 dark:border-neutral-800 bg-neutral-50/50 dark:bg-neutral-900/30 cursor-pointer hover:bg-neutral-100/50 dark:hover:bg-neutral-800/50 transition-colors"
                    >
                      <input
                        id="user-modal-isactive"
                        type="checkbox"
                        checked={formData.isActive ?? true}
                        onChange={(e) => setFormData({ ...formData, isActive: e.target.checked })}
                        className="w-4 h-4 rounded border-neutral-300 dark:border-neutral-700 text-neutral-900 dark:text-neutral-100 focus:ring-0 cursor-pointer"
                      />
                      <div>
                        <div className="text-xs font-semibold text-neutral-900 dark:text-neutral-100">
                          Usuario Activo en el Sistema
                        </div>
                        <div className="text-[10px] text-neutral-500">
                          Si se desmarca, el usuario no podrá iniciar sesión en la plataforma.
                        </div>
                      </div>
                    </label>
                  </div>
                )}
              </div>
            )}

            {activeTab === "permissions" && (
              <div className="space-y-5 animate-in fade-in duration-150">
                <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
                  <div>
                    <h3 className="text-xs font-bold uppercase tracking-wider text-neutral-500 dark:text-neutral-400 flex items-center gap-2">
                      <ShieldCheck className="w-3.5 h-3.5" />
                      <span>Matriz de Permisos Granulares</span>
                    </h3>
                    <p className="text-[11px] text-neutral-500 mt-0.5">
                      Autorizaciones explícitas asignadas al usuario para anular o extender los roles base.
                    </p>
                  </div>

                  <div className="flex items-center gap-2">
                    <div className="relative flex-1 sm:w-64">
                      <input
                        type="text"
                        value={permissionSearch}
                        onChange={(e) => setPermissionSearch(e.target.value)}
                        placeholder="Filtrar permisos..."
                        className="w-full px-3 py-1.5 text-xs rounded-xl border border-neutral-300 dark:border-neutral-700 bg-neutral-50/50 dark:bg-neutral-900 text-neutral-900 dark:text-neutral-100 placeholder:text-neutral-400 focus:outline-none focus:ring-2 focus:ring-neutral-400"
                      />
                    </div>
                    <span className="text-xs font-mono font-semibold px-2.5 py-1 rounded-lg bg-neutral-100 dark:bg-neutral-800 text-neutral-700 dark:text-neutral-300 shrink-0">
                      {currentPerms.length} / {availablePermissions.length}
                    </span>
                  </div>
                </div>

                <div className="space-y-6">
                  {filteredCategorizedPermissions.length === 0 ? (
                    <div className="py-12 text-center text-xs text-neutral-400 border border-dashed border-neutral-200 dark:border-neutral-800 rounded-xl">
                      No se encontraron permisos coincidentes con el filtro de búsqueda.
                    </div>
                  ) : (
                    filteredCategorizedPermissions.map(([moduleCategory, perms]) => {
                      const allSelected = perms.every((p) => currentPerms.includes(p.code));

                      return (
                        <div
                          key={moduleCategory}
                          className="border border-neutral-200 dark:border-neutral-800 rounded-xl p-4 bg-white dark:bg-neutral-950 space-y-3"
                        >
                          <div className="flex items-center justify-between pb-2 border-b border-neutral-100 dark:border-neutral-900">
                            <div className="flex items-center gap-2">
                              <span className="w-1.5 h-3.5 rounded-full bg-locatel-medio dark:bg-locatel-claro/95" />
                              <h4 className="text-xs font-bold text-neutral-900 dark:text-neutral-100 tracking-tight">
                                {moduleCategory}
                              </h4>
                              <span className="text-[10px] font-mono text-neutral-400 px-1.5 py-0.2 rounded bg-neutral-100 dark:bg-neutral-900">
                                {perms.filter((p) => currentPerms.includes(p.code)).length} / {perms.length}
                              </span>
                            </div>

                            <button
                              type="button"
                              onClick={() => onToggleModulePermissions(moduleCategory)}
                              className="text-[11px] font-semibold text-neutral-600 dark:text-neutral-400 hover:text-neutral-900 dark:hover:text-white transition-colors cursor-pointer px-2 py-0.5 rounded hover:bg-neutral-100 dark:hover:bg-neutral-900"
                            >
                              {allSelected ? "Desmarcar todos" : "Seleccionar todos"}
                            </button>
                          </div>

                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                            {perms.map((p) => {
                              const isChecked = currentPerms.includes(p.code);

                              return (
                                <div
                                  key={p.code}
                                  role="checkbox"
                                  aria-checked={isChecked}
                                  tabIndex={0}
                                  onClick={(e) => {
                                    e.preventDefault();
                                    e.stopPropagation();
                                    onTogglePermission(p.code);
                                  }}
                                  onKeyDown={(e) => {
                                    if (e.key === " " || e.key === "Enter") {
                                      e.preventDefault();
                                      e.stopPropagation();
                                      onTogglePermission(p.code);
                                    }
                                  }}
                                  className={`border rounded-xl p-3 flex items-start gap-3 transition-colors cursor-pointer select-none focus:outline-none focus:ring-2 focus:ring-neutral-400 dark:focus:ring-neutral-600 ${isChecked
                                    ? "border-locatel-medio dark:border-locatel-claro/95 bg-neutral-900/5 dark:bg-white/5"
                                    : "border-neutral-100 dark:border-neutral-900 bg-transparent hover:bg-neutral-50 dark:hover:bg-neutral-900/40"
                                    }`}
                                >
                                  <div
                                    aria-hidden="true"
                                    className={`w-4 h-4 rounded-md flex items-center justify-center border shrink-0 mt-0.5 transition-colors ${isChecked
                                      ? "bg-locatel-medio border-locatel-medio text-white dark:bg-locatel-claro/95 dark:border-locatel-claro/95 dark:text-text-white"
                                      : "border-neutral-300 dark:border-neutral-700 bg-white dark:bg-neutral-900"
                                      }`}
                                  >
                                    {isChecked && <Check className="w-3 h-3 stroke-3" />}
                                  </div>

                                  <div className="min-w-0 flex-1 space-y-1">
                                    <div className="text-xs font-semibold text-neutral-900 dark:text-neutral-100 leading-snug">
                                      {p.meta.title}
                                    </div>
                                    <p className="text-[10px] text-neutral-500 dark:text-neutral-400 leading-normal">
                                      {p.meta.description}
                                    </p>
                                    <div className="pt-0.5">
                                      <code className="font-mono text-[9px] text-neutral-400 dark:text-neutral-500 bg-neutral-100 dark:bg-neutral-900 px-1 py-0.5 rounded border border-neutral-200/40 dark:border-neutral-800/60 inline-block">
                                        {p.code}
                                      </code>
                                    </div>
                                  </div>
                                </div>
                              );
                            })}
                          </div>
                        </div>
                      );
                    })
                  )}
                </div>
              </div>
            )}
          </div>

          <div className="px-6 py-4 border-t border-neutral-200 dark:border-neutral-800 bg-neutral-50/50 dark:bg-neutral-900/40 flex items-center justify-between gap-3 shrink-0">
            <div className="text-xs text-neutral-500">
              {activeTab === "basics" ? (
                <button
                  type="button"
                  onClick={() => setActiveTab("permissions")}
                  className="font-medium hover:text-neutral-900 dark:hover:text-white transition-colors cursor-pointer inline-flex items-center gap-1"
                >
                  <span>Configurar matriz de permisos</span>
                  <ChevronRight className="w-3 h-3" />
                </button>
              ) : (
                <button
                  type="button"
                  onClick={() => setActiveTab("basics")}
                  className="font-medium hover:text-neutral-900 dark:hover:text-white transition-colors cursor-pointer"
                >
                  ← Volver a información básica
                </button>
              )}
            </div>

            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={onClose}
                disabled={isSubmitting}
                className="px-4 py-2 text-xs font-semibold rounded-xl border border-neutral-300 dark:border-neutral-700 hover:bg-neutral-100 dark:hover:bg-neutral-800 text-neutral-700 dark:text-neutral-300 transition-colors cursor-pointer"
              >
                Cancelar
              </button>
              <button
                type="submit"
                disabled={isSubmitting || passwordMismatch}
                className="flex items-center gap-2 px-5 py-2 text-xs font-semibold rounded-xl bg-locatel-medio text-white hover:bg-locatel-medio/95 dark:bg-locatel-claro/95 dark:text-text-white transition-all cursor-pointer shadow-xs disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isSubmitting && <span className="w-3.5 h-3.5 rounded-full border-2 border-current border-t-transparent animate-spin" />}
                <span>{isEdit ? "Guardar Cambios" : "Crear Usuario"}</span>
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
}
