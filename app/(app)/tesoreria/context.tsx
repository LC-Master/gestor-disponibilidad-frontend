"use client";

import { createContext, useContext, useEffect, useState, ReactNode } from "react";
import { Bank, BankAccount, Company, UserProfile } from "./types";
import { fetchClient, clearAuthSession } from "@/lib/fetchClient";

interface TreasuryContextType {
  user: UserProfile | null;
  companies: Company[];
  banks: Bank[];
  accounts: BankAccount[];
  loading: boolean;
  refreshing: boolean;
  handleRefresh: () => void;
  handleLogout: () => Promise<void>;
  closingPreload: { date: string; companyId: string } | null;
  setClosingPreload: (p: { date: string; companyId: string } | null) => void;
}

const TreasuryContext = createContext<TreasuryContextType | null>(null);

export function TreasuryProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<UserProfile | null>(null);
  const [closingPreload, setClosingPreload] = useState<{ date: string; companyId: string } | null>(null);
  const [companies, setCompanies] = useState<Company[]>([]);
  const [banks, setBanks] = useState<Bank[]>([]);
  const [accounts, setAccounts] = useState<BankAccount[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const loadData = async () => {
    try {
      const userRes = await fetchClient("/api/auth/me");
      if (userRes.ok) {
        const u = await userRes.json();
        setUser(u);
      }
    } catch (err) {
      console.error(err);
    }

    try {
      const companiesRes = await fetchClient("/api/v1/treasury/companies");
      if (companiesRes.ok) {
        const c = await companiesRes.json();
        setCompanies(Array.isArray(c) ? c : []);
      }
    } catch {
      setCompanies([]);
    }

    try {
      const banksRes = await fetchClient("/api/v1/treasury/banks");
      if (banksRes.ok) {
        const b = await banksRes.json();
        setBanks(Array.isArray(b) ? b : []);
      }
    } catch {
      setBanks([]);
    }

    try {
      const accountsRes = await fetchClient("/api/v1/treasury/accounts");
      if (accountsRes.ok) {
        const a = await accountsRes.json();
        setAccounts(Array.isArray(a) ? a : []);
      }
    } catch {
      setAccounts([]);
    }

    setLoading(false);
    setRefreshing(false);
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleRefresh = () => {
    setRefreshing(true);
    loadData();
  };

  const handleLogout = async () => {
    try {
      await fetchClient("/api/auth/logout", {
        method: "POST",
      });
    } catch (err) {
      console.error(err);
    } finally {
      clearAuthSession();
      window.location.href = "/login";
    }
  };

  return (
    <TreasuryContext.Provider
      value={{
        user,
        companies,
        banks,
        accounts,
        loading,
        refreshing,
        handleRefresh,
        handleLogout,
        closingPreload,
        setClosingPreload,
      }}
    >
      {children}
    </TreasuryContext.Provider>
  );
}

export function useTreasury() {
  const ctx = useContext(TreasuryContext);
  if (!ctx) {
    throw new Error("useTreasury must be used within TreasuryProvider");
  }
  return ctx;
}
