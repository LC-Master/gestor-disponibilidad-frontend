"use client";

import { ReactNode, useMemo, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Menu, ShieldAlert } from "lucide-react";
import { TreasuryProvider, useTreasury } from "./tesoreria/context";
import { AppSidebar } from "@/components/layout/AppSidebar";
import { BcvRateBadge } from "@/components/layout/BcvRateBadge";

function AppLayoutShell({ children }: { children: ReactNode }) {
  const {
    user,
    accounts,
    companies,
    banks,
    loading,
    handleLogout,
  } = useTreasury();

  const pathname = usePathname();

  const [isCollapsed, setIsCollapsed] = useState(false);
  const [isMobileOpen, setIsMobileOpen] = useState(false);

  const getHeaderTitle = () => {
    if (pathname.startsWith("/cxp/facturas")) {
      return "Cuentas por Pagar - Facturas y Documentos";
    }
    if (pathname.startsWith("/cxp/propuestas")) {
      return "Cuentas por Pagar - Propuestas de Pago";
    }
    if (pathname.startsWith("/cxp/calendario")) {
      return "Cuentas por Pagar - Calendario de Vencimientos";
    }
    if (pathname.startsWith("/cxp/proveedores")) {
      return "Cuentas por Pagar - Maestro de Proveedores";
    }
    if (pathname.startsWith("/tesoreria/cierre")) {
      return "Tesorería - Cierre Operativo Diario";
    }
    if (pathname.startsWith("/tesoreria/historico")) {
      return "Tesorería - Histórico de Cierres Diarios y Posición de Disponibilidad";
    }
    if (pathname.startsWith("/tesoreria/matriz")) {
      return "Tesorería - Matriz Histórica Mensual";
    }
    if (pathname.startsWith("/tesoreria")) {
      return "Tesorería - Gestión de Cuentas Bancarias";
    }
    if (pathname.startsWith("/usuarios")) {
      return "Administración - Gestión de Usuarios";
    }
    if (pathname.startsWith("/perfil")) {
      return "Mi Perfil y Configuración";
    }
    if (pathname.startsWith("/cxp/historico")) {
      return "Histórico de Pagos y Liquidaciones";
    }
    if (pathname.startsWith("/cxp/programadas")) {
      return "Cuentas por Pagar - Facturas Programadas por Pagar";
    }
    return "Gestor de Disponibilidad";
  };

  const roles = useMemo(() => (user?.roles || []).map((r) => r.toUpperCase().trim()), [user]);
  const perms = useMemo(() => (user?.permissions || []).map((p) => p.toLowerCase().trim()), [user]);

  const isAuthorized = useMemo(() => {
    if (loading || !user) return true;

    const isAdmin = roles.includes("ADMIN") || roles.includes("ADMINISTRADOR");

    if (isAdmin) return true;

    const hasPerm = (code: string) => perms.includes(code.toLowerCase().trim());

    if (pathname.startsWith("/perfil")) {
      return true;
    }

    if (pathname.startsWith("/usuarios")) {
      return (
        hasPerm("users.view") ||
        hasPerm("users.manage") ||
        roles.includes("COORD_TESORERIA") ||
        roles.includes("COORD_CXP")
      );
    }

    if (pathname.startsWith("/tesoreria/cierre")) {
      return (
        hasPerm("treasury.balances.record") ||
        hasPerm("treasury.balances.edit") ||
        hasPerm("treasury.availability.approve") ||
        roles.includes("COORD_TESORERIA") ||
        roles.includes("ANALISTA_TESORERIA")
      );
    }

    if (pathname.startsWith("/tesoreria/historico")) {
      return (
        hasPerm("treasury.availability.view") ||
        hasPerm("treasury.history.view") ||
        roles.includes("COORD_TESORERIA") ||
        roles.includes("ANALISTA_TESORERIA")
      );
    }

    if (pathname.startsWith("/tesoreria/matriz")) {
      return (
        hasPerm("treasury.history.view") ||
        roles.includes("COORD_TESORERIA") ||
        roles.includes("ANALISTA_TESORERIA")
      );
    }

    if (pathname.startsWith("/tesoreria")) {
      return (
        hasPerm("treasury.accounts.view") ||
        hasPerm("treasury.accounts.manage") ||
        roles.includes("COORD_TESORERIA") ||
        roles.includes("ANALISTA_TESORERIA")
      );
    }

    if (pathname.startsWith("/cxp/facturas")) {
      return (
        hasPerm("cxp.invoices.view") ||
        roles.includes("COORD_CXP") ||
        roles.includes("ANALISTA_CXP")
      );
    }

    if (pathname.startsWith("/cxp/propuestas")) {
      return (
        hasPerm("cxp.proposals.view") ||
        hasPerm("cxp.proposals.create") ||
        roles.includes("COORD_CXP") ||
        roles.includes("ANALISTA_CXP")
      );
    }

    if (pathname.startsWith("/cxp/programadas")) {
      return (
        hasPerm("cxp.payments.schedule") ||
        hasPerm("cxp.payments.approve") ||
        hasPerm("cxp.payments.execute") ||
        roles.includes("COORD_CXP")
      );
    }

    if (pathname.startsWith("/cxp/historico")) {
      return (
        hasPerm("cxp.reports.view") ||
        hasPerm("cxp.payments.view") ||
        roles.includes("COORD_CXP") ||
        roles.includes("ANALISTA_CXP")
      );
    }

    if (pathname.startsWith("/cxp/calendario")) {
      return (
        hasPerm("cxp.calendar.view") ||
        roles.includes("COORD_CXP") ||
        roles.includes("ANALISTA_CXP")
      );
    }

    if (pathname.startsWith("/cxp/proveedores")) {
      return (
        hasPerm("cxp.suppliers.view") ||
        hasPerm("cxp.suppliers.manage") ||
        roles.includes("COORD_CXP")
      );
    }

    if (pathname === "/cxp") {
      return (
        roles.includes("COORD_CXP") ||
        roles.includes("ANALISTA_CXP") ||
        perms.some((p) => p.startsWith("cxp."))
      );
    }

    return true;
  }, [user, loading, pathname]);

  const todayStr = new Intl.DateTimeFormat("es-VE", {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
  }).format(new Date());

  return (
    <div className="min-h-screen flex bg-neutral-50 dark:bg-neutral-950 text-neutral-900 dark:text-neutral-100 font-sans">
      <AppSidebar
        user={user}
        accounts={accounts}
        companies={companies}
        banks={banks}
        onLogout={handleLogout}
        isCollapsed={isCollapsed}
        onToggleCollapse={() => setIsCollapsed(!isCollapsed)}
        isMobileOpen={isMobileOpen}
        onCloseMobile={() => setIsMobileOpen(false)}
      />

      <div className="flex-1 flex flex-col min-w-0 overflow-y-auto">
        <header className="sticky top-0 z-20 h-16 border-b border-neutral-200/80 dark:border-neutral-800 bg-white/95 dark:bg-neutral-900/95 backdrop-blur-md px-4 sm:px-6 lg:px-8 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <button
              onClick={() => setIsMobileOpen(true)}
              className="md:hidden p-2 rounded-xl text-neutral-500 hover:text-neutral-900 dark:hover:text-white hover:bg-neutral-100 dark:hover:bg-neutral-800 cursor-pointer"
            >
              <Menu className="w-5 h-5" />
            </button>

            <div>
              <h1 className="text-base sm:text-lg font-bold text-neutral-900 dark:text-neutral-100 leading-tight">
                {getHeaderTitle()}
              </h1>
              <p className="text-xs text-neutral-400 capitalize hidden sm:block">
                {todayStr}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <BcvRateBadge />
          </div>
        </header>

        <main className="flex-1 p-4 sm:p-5 lg:p-6">
          {!isAuthorized ? (
            <div className="min-h-[60vh] flex flex-col items-center justify-center text-center p-6 bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-2xl shadow-xs">
              <div className="w-12 h-12 rounded-2xl bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20 flex items-center justify-center mb-4">
                <ShieldAlert className="w-6 h-6" />
              </div>
              <h2 className="text-base font-bold text-neutral-900 dark:text-neutral-100">
                Acceso Restringido
              </h2>
              <p className="text-xs text-neutral-500 max-w-md mt-1 mb-6">
                No dispone de los permisos necesarios para realizar esta acción o visualizar este módulo.
              </p>
              <div className="flex items-center gap-3">
                {(roles.includes("COORD_CXP") || roles.includes("ANALISTA_CXP") || perms.some((p) => p.startsWith("cxp."))) && (
                  <Link
                    href="/cxp/facturas"
                    className="px-4 py-2 text-xs font-semibold rounded-xl bg-locatel-medio text-white hover:bg-locatel-oscuro transition-colors cursor-pointer"
                  >
                    Ir a Cuentas por Pagar
                  </Link>
                )}
                <Link
                  href="/perfil"
                  className="px-4 py-2 text-xs font-semibold rounded-xl bg-neutral-900 text-white hover:bg-neutral-800 dark:bg-white dark:text-neutral-900 dark:hover:bg-neutral-100 transition-colors cursor-pointer"
                >
                  Volver a Mi Perfil
                </Link>
              </div>
            </div>
          ) : (
            children
          )}
        </main>
      </div>
    </div>
  );
}

export default function AppLayout({ children }: { children: ReactNode }) {
  return (
    <TreasuryProvider>
      <AppLayoutShell>{children}</AppLayoutShell>
    </TreasuryProvider>
  );
}
