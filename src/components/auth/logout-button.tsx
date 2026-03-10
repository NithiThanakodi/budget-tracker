"use client";

import { LogOut } from "lucide-react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { supabase } from "../../../utils/supabase";

export function LogoutButton() {
  const router = useRouter();

  const onLogout = async () => {
    await supabase.auth.signOut();
    router.push("/login");
    router.refresh();
  };

  return (
    <Button variant="outline" size="lg" onClick={onLogout}>
      <LogOut className="mr-1 h-4 w-4" />
      Logout
    </Button>
  );
}
