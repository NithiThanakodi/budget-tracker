"use client";

import { usePathname } from "next/navigation";
import { SideNav } from "@/components/nav";

export function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const hideShell = pathname === "/login";

  if (hideShell) {
    return <>{children}</>;
  }

  return (
    <div className="flex min-h-[100dvh]">
      <SideNav />
      <div className="flex-grow overflow-auto">{children}</div>
    </div>
  );
}
