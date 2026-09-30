"use client";

import { useTreasury } from "../tesoreria/context";
import { UserManagementTable } from "../tesoreria/components/UserManagementTable";

export default function UsuariosPage() {
  const { user } = useTreasury();

  return <UserManagementTable currentUser={user} />;
}
