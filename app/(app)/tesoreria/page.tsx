"use client";

import { useTreasury } from "./context";
import { AccountsTable } from "./components/AccountsTable";
import { DailyClosingMatrix } from "./components/DailyClosingMatrix";
import { DailyClosingHistoryTable } from "./components/DailyClosingHistoryTable";
import { MonthlyHistoryMatrix } from "./components/MonthlyHistoryMatrix";
import { UserManagementTable } from "./components/UserManagementTable";

export default function TesoreriaPage() {
  const {
    activeTab,
    setActiveTab,
    user,
    companies,
    banks,
    accounts,
    loading,
    handleRefresh,
    closingPreload,
    setClosingPreload,
  } = useTreasury();

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-24 text-neutral-400">
        <div className="w-8 h-8 rounded-full border-2 border-locatel-medio border-t-transparent animate-spin mb-3" />
        <span className="text-xs font-semibold">Cargando módulos de tesorería...</span>
      </div>
    );
  }

  return (
    <div>
      {activeTab === "accounts" && (
        <AccountsTable
          accounts={accounts}
          companies={companies}
          banks={banks}
          onAccountCreated={handleRefresh}
          onCompanyCreated={handleRefresh}
          onBankCreated={handleRefresh}
        />
      )}

      {activeTab === "closing" && (
        <DailyClosingMatrix
          companies={companies}
          accounts={accounts}
          user={user}
          initialDate={closingPreload?.date}
          initialCompanyId={closingPreload?.companyId}
          onSaved={handleRefresh}
        />
      )}

      {activeTab === "closing_history" && (
        <DailyClosingHistoryTable
          companies={companies}
          onSelectClosing={(date, companyId) => {
            setClosingPreload({ date, companyId });
            setActiveTab("closing");
          }}
        />
      )}

      {activeTab === "history" && (
        <MonthlyHistoryMatrix
          companies={companies}
          accounts={accounts}
        />
      )}

      {activeTab === "users" && (
        <UserManagementTable currentUser={user} />
      )}
    </div>
  );
}
