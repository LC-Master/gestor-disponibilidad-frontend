"use client";

import { ReactNode, useState } from "react";
import { usePathname } from "next/navigation";
import { Menu, RotateCw } from "lucide-react";
import { TreasuryProvider, useTreasury } from "./tesoreria/context";
import { AppSidebar } from "@/components/layout/AppSidebar";
import { ThemeToggle } from "@/components/ThemeToggle";

function AppLayoutShell({ children }: { children: ReactNode }) {
  const {
    user,
    accounts,
    companies,
    banks,
    refreshing,
    handleRefresh,
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
      return "Tesorería - Histórico de Cierres";
    }
    if (pathname.startsWith("/tesoreria/matriz")) {
      return "Tesorería - Matriz Histórica Mensual";
    }
    if (pathname.startsWith("/tesoreria")) {
      return "Tesorería - Gestión de Cuentas Bancarias";
    }
    if (pathname.startsWith("/usuarios")) {
      return "Administración - Control de Usuarios";
    }
    return "Gestor de Facturación";
  };

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

          <div className="flex items-center gap-2">
            <ThemeToggle className="flex items-center gap-2 px-3 py-1.5 rounded-xl border border-neutral-200 dark:border-neutral-700 bg-white dark:bg-neutral-800 hover:bg-neutral-100 dark:hover:bg-neutral-700 text-neutral-600 dark:text-neutral-300 transition-colors cursor-pointer shadow-xs text-xs font-semibold" />
            <button
              onClick={handleRefresh}
              disabled={refreshing}
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-xl border border-neutral-200 dark:border-neutral-700 bg-white dark:bg-neutral-800 hover:bg-neutral-50 dark:hover:bg-neutral-700 text-neutral-700 dark:text-neutral-200 transition-all cursor-pointer shadow-xs disabled:opacity-50"
              title="Actualizar datos"
            >
              <RotateCw
                className={`w-3.5 h-3.5 ${refreshing ? "animate-spin" : ""}`}
              />
              <span className="hidden sm:inline">Actualizar</span>
            </button>
          </div>
        </header>

        <main className="flex-1 p-4 sm:p-5 lg:p-6">
          {children}
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
