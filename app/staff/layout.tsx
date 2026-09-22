"use client";

import { Suspense } from "react";
import { StaffRoleProvider } from "@/components/panel/StaffRoleContext";
import { PanelNavProvider } from "@/components/panel/PanelNavContext";
import { StaffSidebarShell } from "@/components/panel/StaffShell";

export default function StaffLayout({ children }: LayoutProps<"/staff">) {
  return (
    <Suspense>
      <StaffRoleProvider>
        <PanelNavProvider>
          <StaffSidebarShell>{children}</StaffSidebarShell>
        </PanelNavProvider>
      </StaffRoleProvider>
    </Suspense>
  );
}
