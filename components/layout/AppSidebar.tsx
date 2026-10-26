"use client";

import { useMemo } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Building2,
  Calendar,
  CalendarCheck2,
  CheckCircle2,
  FileCheck2,
  FileText,
  History,
  Layers,
  LogOut,
  PanelLeftClose,
  PanelLeftOpen,
  Users,
  Wallet,
  X,
  User,
} from "lucide-react";
import { Bank, BankAccount, Company } from "@/app/(app)/tesoreria/types";
import { ThemeToggle } from "@/components/ThemeToggle";

interface UserProfile {
  id: string;
  name: string;
  last_name: string;
  email: string;
  is_active: boolean;
  roles?: string[];
  permissions?: string[];
}

export interface AppSidebarProps {
  user: UserProfile | null;
  accounts?: BankAccount[];
  companies?: Company[];
  banks?: Bank[];
  onLogout: () => void;
  isCollapsed: boolean;
  onToggleCollapse: () => void;
  isMobileOpen: boolean;
  onCloseMobile: () => void;
}

interface NavItem {
  href: string;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  badge?: string;
}

export function AppSidebar({
  user,
  accounts = [],
  onLogout,
  isCollapsed,
  onToggleCollapse,
  isMobileOpen,
  onCloseMobile,
}: AppSidebarProps) {
  const pathname = usePathname();

  const isItemActive = (href: string) => {
    if (href === "/tesoreria") {
      return pathname === "/tesoreria";
    }
    return pathname === href || pathname.startsWith(href + "/");
  };

  const roles = useMemo(() => (user?.roles || []).map((r) => r.toUpperCase().trim()), [user]);
  const perms = useMemo(() => (user?.permissions || []).map((p) => p.toLowerCase().trim()), [user]);
  const isAdmin = useMemo(() => roles.includes("ADMIN") || roles.includes("ADMINISTRADOR"), [roles]);

  const hasPerm = (code: string) => isAdmin || perms.includes(code.toLowerCase().trim());

  const canViewTreasuryAccounts =
    hasPerm("treasury.accounts.view") ||
    hasPerm("treasury.accounts.manage") ||
    roles.includes("COORD_TESORERIA") ||
    roles.includes("ANALISTA_TESORERIA");

  const canViewTreasuryClosing =
    hasPerm("treasury.balances.record") ||
    hasPerm("treasury.balances.edit") ||
    hasPerm("treasury.availability.approve") ||
    roles.includes("COORD_TESORERIA") ||
    roles.includes("ANALISTA_TESORERIA");

  const canViewTreasuryHistory =
    hasPerm("treasury.availability.view") ||
    hasPerm("treasury.history.view") ||
    roles.includes("COORD_TESORERIA") ||
    roles.includes("ANALISTA_TESORERIA");

  const canViewTreasuryMatrix =
    hasPerm("treasury.history.view") ||
    roles.includes("COORD_TESORERIA") ||
    roles.includes("ANALISTA_TESORERIA");

  const canViewInvoices =
    hasPerm("cxp.invoices.view") ||
    roles.includes("COORD_CXP") ||
    roles.includes("ANALISTA_CXP");

  const canViewProposals =
    hasPerm("cxp.proposals.view") ||
    hasPerm("cxp.proposals.create") ||
    roles.includes("COORD_CXP") ||
    roles.includes("ANALISTA_CXP");

  const canViewScheduled =
    hasPerm("cxp.payments.schedule") ||
    hasPerm("cxp.payments.approve") ||
    hasPerm("cxp.payments.execute") ||
    roles.includes("COORD_CXP");

  const canViewPaymentsHistory =
    hasPerm("cxp.reports.view") ||
    hasPerm("cxp.payments.view") ||
    roles.includes("COORD_CXP") ||
    roles.includes("ANALISTA_CXP");

  const canViewCalendar =
    hasPerm("cxp.calendar.view") ||
    roles.includes("COORD_CXP") ||
    roles.includes("ANALISTA_CXP");

  const canViewSuppliers =
    hasPerm("cxp.suppliers.view") ||
    hasPerm("cxp.suppliers.manage") ||
    roles.includes("COORD_CXP");

  const isAnalystOnly =
    (roles.includes("ANALISTA_TESORERIA") || roles.includes("ANALISTA_CXP")) &&
    !roles.includes("COORD_TESORERIA") &&
    !roles.includes("COORD_CXP") &&
    !isAdmin;

  const canManageUsers =
    !isAnalystOnly &&
    (isAdmin ||
      roles.includes("COORD_TESORERIA") ||
      roles.includes("COORD_CXP") ||
      hasPerm("users.view") ||
      hasPerm("users.manage"));

  const treasuryItems: NavItem[] = [
    ...(canViewTreasuryAccounts
      ? [
        {
          href: "/tesoreria",
          label: "Gestión de Cuentas",
          icon: Wallet,
          badge: accounts.length > 0 ? accounts.length.toString() : undefined,
        },
      ]
      : []),
    ...(canViewTreasuryClosing
      ? [
        {
          href: "/tesoreria/cierre",
          label: "Cierre Operativo",
          icon: CalendarCheck2,
        },
      ]
      : []),
    ...(canViewTreasuryHistory
      ? [
        {
          href: "/tesoreria/historico",
          label: "Histórico de Cierres",
          icon: FileCheck2,
        },
      ]
      : []),
    ...(canViewTreasuryMatrix
      ? [
        {
          href: "/tesoreria/matriz",
          label: "Historial Mensual",
          icon: History,
        },
      ]
      : []),
  ];

  const cxpItems: NavItem[] = [
    ...(canViewInvoices
      ? [
        {
          href: "/cxp/facturas",
          label: "Facturas Pendientes",
          icon: FileText,
        },
      ]
      : []),
    ...(canViewProposals
      ? [
        {
          href: "/cxp/propuestas",
          label: "Propuestas de Pago",
          icon: Layers,
        },
      ]
      : []),
    ...(canViewScheduled
      ? [
        {
          href: "/cxp/programadas",
          label: "Por Pagar (Programadas)",
          icon: CheckCircle2,
        },
      ]
      : []),
    ...(canViewPaymentsHistory
      ? [
        {
          href: "/cxp/historico",
          label: "Histórico de Pagos",
          icon: History,
        },
      ]
      : []),
    ...(canViewCalendar
      ? [
        {
          href: "/cxp/calendario",
          label: "Calendario de Pagos",
          icon: Calendar,
        },
      ]
      : []),
    ...(canViewSuppliers
      ? [
        {
          href: "/cxp/proveedores",
          label: "Maestro de Proveedores",
          icon: Building2,
        },
      ]
      : []),
  ];

  const adminItems: NavItem[] = canManageUsers
    ? [
      {
        href: "/usuarios",
        label: "Gestión de Usuarios",
        icon: Users,
      },
    ]
    : [];

  const userInitials = user?.name
    ? `${user.name.charAt(0)}${user.last_name?.charAt(0) || ""}`.toUpperCase()
    : "";

  const renderNavGroup = (title: string, items: NavItem[], collapsed: boolean) => {
    if (items.length === 0) return null;

    return (
      <div>
        {!collapsed ? (
          <p className="text-[10px] font-semibold text-neutral-400 dark:text-neutral-500 tracking-wider px-3 mb-2 uppercase">
            {title}
          </p>
        ) : (
          <div className="my-2 mx-auto w-8 border-t border-neutral-200 dark:border-neutral-700/50" />
        )}

        <nav className="space-y-1">
          {items.map((item) => {
            const Icon = item.icon;
            const isActive = isItemActive(item.href);

            return (
              <Link
                key={item.href}
                href={item.href}
                onClick={onCloseMobile}
                title={item.label}
                className={
                  collapsed
                    ? `flex items-center justify-center w-10 h-10 mx-auto rounded-lg transition-colors cursor-pointer ${isActive
                      ? "bg-locatel-medio/15 text-locatel-medio font-semibold dark:bg-emerald-950/50 dark:text-emerald-400"
                      : "text-neutral-600 dark:text-neutral-400 hover:bg-neutral-100 dark:hover:bg-neutral-800/60 hover:text-neutral-900 dark:hover:text-neutral-200"
                    }`
                    : `flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium w-full transition-colors cursor-pointer ${isActive
                      ? "bg-locatel-medio/15 text-locatel-medio font-semibold dark:bg-emerald-950/50 dark:text-emerald-400"
                      : "text-neutral-600 dark:text-neutral-400 hover:bg-neutral-100 dark:hover:bg-neutral-800/60 hover:text-neutral-900 dark:hover:text-neutral-200"
                    }`
                }
              >
                <Icon className="w-5 h-5 shrink-0" />

                {!collapsed && (
                  <span className="flex-1 truncate text-xs font-semibold">
                    {item.label}
                  </span>
                )}

                {!collapsed && item.badge && (
                  <span
                    className={`px-1.5 py-0.5 rounded-full text-[10px] font-bold ${isActive
                      ? "bg-locatel-medio text-white"
                      : "bg-neutral-100 dark:bg-neutral-800 text-neutral-500 dark:text-neutral-400"
                      }`}
                  >
                    {item.badge}
                  </span>
                )}
              </Link>
            );
          })}
        </nav>
      </div>
    );
  };

  const renderSidebarContent = (collapsed: boolean) => (
    <div className="transition-all duration-200 ease-in-out flex flex-col justify-between shrink-0 h-full w-full bg-white dark:bg-neutral-900 border-r border-neutral-200 dark:border-neutral-800 overflow-x-hidden select-none">
      {!collapsed ? (
        <div className="h-16 px-4 flex items-center justify-between border-b border-neutral-100 dark:border-neutral-800 shrink-0">
          <div className="flex items-center gap-2.5 min-w-0">
            <img
              src="/Logo.webp"
              alt="Locatel"
              className="h-9 w-auto object-contain shrink-0"
            />
            <div className="flex flex-col min-w-0">
              <span className="text-xs font-extrabold tracking-tight text-neutral-900 dark:text-neutral-100 truncate">
                Gestor de Disponibilidad
              </span>

            </div>
          </div>

          <div className="flex items-center gap-1">
            <button
              type="button"
              onClick={onCloseMobile}
              className="md:hidden p-1.5 rounded-lg text-neutral-400 hover:text-neutral-700 dark:hover:text-neutral-200 cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>

            <button
              type="button"
              onClick={onToggleCollapse}
              className="hidden md:flex p-1.5 rounded-lg text-neutral-400 hover:text-neutral-700 dark:hover:text-neutral-200 hover:bg-neutral-100 dark:hover:bg-neutral-800 transition-colors cursor-pointer"
              title="Colapsar menú"
            >
              <PanelLeftClose className="w-4.5 h-4.5" />
            </button>
          </div>
        </div>
      ) : (
        <div className="py-3 px-2 flex flex-col items-center justify-center gap-2 border-b border-neutral-100 dark:border-neutral-800 shrink-0">
          <div className="flex justify-center items-center py-1">
            <img
              src="/Logo-res.webp"
              alt="Locatel"
              className="h-8 w-auto object-contain"
            />
          </div>
          <button
            type="button"
            onClick={onToggleCollapse}
            className="p-1.5 rounded-lg text-neutral-400 hover:text-neutral-700 dark:hover:text-neutral-200 hover:bg-neutral-100 dark:hover:bg-neutral-800 transition-colors cursor-pointer"
            title="Expandir menú"
          >
            <PanelLeftOpen className="w-4.5 h-4.5" />
          </button>
        </div>
      )}

      <div className="flex-1 py-3 px-2 space-y-4 overflow-y-auto overflow-x-hidden">
        {renderNavGroup("Tesorería", treasuryItems, collapsed)}
        {renderNavGroup("Cuentas por Pagar", cxpItems, collapsed)}
        {renderNavGroup("Sistema", adminItems, collapsed)}
      </div>

      {!collapsed ? (
        <div className="p-3 border-t border-neutral-100 dark:border-neutral-800 bg-white dark:bg-neutral-900 mt-auto shrink-0 space-y-2">
          {user && (
            <Link
              href="/perfil"
              className={`flex items-center gap-3 p-2 rounded-xl transition-all cursor-pointer ${pathname === "/perfil"
                ? "bg-locatel-medio/15 text-locatel-medio font-semibold dark:bg-emerald-950/50 dark:text-emerald-400"
                : "text-neutral-700 dark:text-neutral-300 hover:bg-neutral-100 dark:hover:bg-neutral-800/60"
                }`}
              title="Mi Perfil"
            >
              <div className="relative shrink-0">
                <div className="w-9 h-9 rounded-full bg-locatel-medio/15 text-locatel-medio font-bold text-xs flex items-center justify-center">
                  {userInitials || <User className="w-4.5 h-4.5" />}
                </div>
                <span className="absolute bottom-0 right-0 w-2.5 h-2.5 rounded-full bg-emerald-500 ring-2 ring-white dark:ring-neutral-900" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-xs font-semibold text-neutral-900 dark:text-neutral-100 truncate">
                  {user.name} {user.last_name}
                </p>
                <p className="text-[11px] text-neutral-400 dark:text-neutral-500 truncate">
                  {user.email}
                </p>
              </div>
            </Link>
          )}

          <div className="pt-1 flex flex-col gap-1">
            <ThemeToggle
              showLabel
              className="w-full flex items-center gap-3 px-3 py-2 rounded-lg text-xs font-semibold text-neutral-600 dark:text-neutral-300 hover:bg-neutral-100 dark:hover:bg-neutral-800/60 transition-colors cursor-pointer"
            />
            <button
              type="button"
              onClick={onLogout}
              className="w-full flex items-center gap-3 px-3 py-2 rounded-lg text-xs font-semibold text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/40 transition-colors cursor-pointer"
              title="Cerrar Sesión"
            >
              <LogOut className="w-4.5 h-4.5 shrink-0" />
              <span>Cerrar Sesión</span>
            </button>
          </div>
        </div>
      ) : (
        <div className="p-2 border-t border-neutral-100 dark:border-neutral-800 bg-white dark:bg-neutral-900 mt-auto shrink-0 flex flex-col items-center gap-2">
          {user && (
            <Link
              href="/perfil"
              className={`w-10 h-10 mx-auto flex items-center justify-center rounded-lg transition-colors cursor-pointer relative ${pathname === "/perfil"
                ? "bg-locatel-medio/15 text-locatel-medio dark:bg-emerald-950/50 dark:text-emerald-400 ring-1 ring-locatel-medio/30"
                : "hover:bg-neutral-100 dark:hover:bg-neutral-800/60 text-neutral-600 dark:text-neutral-400"
                }`}
              title="Mi Perfil"
            >
              <div className="w-8 h-8 rounded-full bg-locatel-medio/15 text-locatel-medio font-bold text-xs flex items-center justify-center">
                {userInitials || <User className="w-4 h-4" />}
              </div>
              <span className="absolute bottom-1 right-1 w-2 h-2 rounded-full bg-emerald-500 ring-1.5 ring-white dark:ring-neutral-900" />
            </Link>
          )}

          <ThemeToggle
            className="w-10 h-10 mx-auto flex items-center justify-center rounded-lg text-neutral-600 dark:text-neutral-300 hover:bg-neutral-100 dark:hover:bg-neutral-800/60 transition-colors cursor-pointer"
          />

          <button
            type="button"
            onClick={onLogout}
            className="w-10 h-10 mx-auto flex items-center justify-center rounded-lg text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/40 transition-colors cursor-pointer"
            title="Cerrar Sesión"
          >
            <LogOut className="w-4.5 h-4.5 shrink-0" />
          </button>
        </div>
      )}
    </div>
  );

  return (
    <>
      <aside
        className={`hidden md:flex sticky top-0 h-screen z-30 transition-all duration-200 ease-in-out shrink-0 overflow-x-hidden ${isCollapsed ? "w-16" : "w-64"
          }`}
      >
        {renderSidebarContent(isCollapsed)}
      </aside>

      {isMobileOpen && (
        <div className="fixed inset-0 z-50 md:hidden flex">
          <div
            onClick={onCloseMobile}
            className="fixed inset-0 bg-neutral-950/60 backdrop-blur-xs transition-opacity"
          />
          <div className="relative w-64 max-w-[80vw] h-full shadow-2xl z-10 animate-in slide-in-from-left duration-200">
            {renderSidebarContent(false)}
          </div>
        </div>
      )}
    </>
  );
}
