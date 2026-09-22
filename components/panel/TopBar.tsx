"use client";

import { usePathname } from "next/navigation";
import { LocationSwitcher } from "./LocationSwitcher";
import { UserMenu } from "./UserMenu";
import { usePanelNav } from "./PanelNavContext";

export function TopBar({
  title,
  userName,
  userRole,
  allowBothLocations = false,
  extra,
}: {
  title: string;
  userName: string;
  userRole: string;
  allowBothLocations?: boolean;
  extra?: React.ReactNode;
}) {
  const { toggle } = usePanelNav();
  const pathname = usePathname();
  const profileHref = `/${pathname.split("/")[1]}/profile`;

  return (
    <header className="flex items-center justify-between gap-3 border-b border-ciruela/10 bg-hueso px-4 py-4 min-[860px]:px-8 min-[860px]:py-5">
      <div className="flex min-w-0 items-center gap-3">
        <button
          onClick={toggle}
          aria-label="Abrir menú"
          className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-ciruela/20 text-ciruela lg:hidden"
        >
          ☰
        </button>
        <h1 className="truncate font-display text-lg text-ciruela min-[860px]:text-xl">{title}</h1>
      </div>
      <div className="flex items-center gap-2 min-[860px]:gap-4">
        {extra}
        <div className="hidden min-[700px]:block">
          <LocationSwitcher multiple={allowBothLocations} />
        </div>
        <UserMenu userName={userName} userRole={userRole} profileHref={profileHref} />
      </div>
    </header>
  );
}
