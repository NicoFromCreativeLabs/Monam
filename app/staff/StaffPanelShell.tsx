"use client";

import { Suspense } from "react";
import { StaffRoleProvider } from "@/components/panel/StaffRoleContext";
import { PanelNavProvider } from "@/components/panel/PanelNavContext";
import { CurrentAppUserProvider, type CurrentAppUser } from "@/components/panel/CurrentAppUserContext";
import { StaffSidebarShell } from "@/components/panel/StaffShell";

export function StaffPanelShell({
  children,
  currentUser,
}: {
  children: React.ReactNode;
  currentUser: CurrentAppUser;
}) {
  return (
    <Suspense>
      <CurrentAppUserProvider value={currentUser}>
        <StaffRoleProvider>
          <PanelNavProvider>
            <StaffSidebarShell>{children}</StaffSidebarShell>
          </PanelNavProvider>
        </StaffRoleProvider>
      </CurrentAppUserProvider>
    </Suspense>
  );
}
