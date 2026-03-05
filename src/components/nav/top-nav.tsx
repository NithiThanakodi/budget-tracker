"use client";

import { LogoutButton } from "@/components/auth/logout-button";
import { usePathname } from "next/navigation";
import Container from "../container";
import { ThemeToggle } from "../theme-toggle";

export default function TopNav({ title }: { title: string }) {
  const pathname = usePathname();
  const showLogout = pathname !== "/login";

  return (
    <Container className="flex h-16 items-center justify-between border-b border-border">
      <h1 className="text-2xl font-medium">{title}</h1>
      <div className="flex items-center gap-2">
        {showLogout ? <LogoutButton /> : null}
        <ThemeToggle />
      </div>
    </Container>
  );
}
