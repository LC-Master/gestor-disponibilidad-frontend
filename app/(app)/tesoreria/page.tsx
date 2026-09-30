"use client";

import { useTreasury } from "./context";
import { AccountsTable } from "./components/AccountsTable";

export default function TesoreriaPage() {
  const {
    companies,
    banks,
    accounts,
    loading,
    handleRefresh,
  } = useTreasury();

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-24 text-neutral-400">
        <div className="w-8 h-8 rounded-full border-2 border-locatel-medio border-t-transparent animate-spin mb-3" />
        <span className="text-xs font-semibold">Cargando cuentas bancarias...</span>
      </div>
    );
  }

  return (
    <AccountsTable
      accounts={accounts}
      companies={companies}
      banks={banks}
      onAccountCreated={handleRefresh}
      onCompanyCreated={handleRefresh}
      onBankCreated={handleRefresh}
    />
  );
}
