import { useMemo } from "react";

import { useCurrentUser } from "@/lib/authStore";
import type { UserRole } from "@/lib/types/v2/foundation";
import type { Actor } from "@/lib/v2/workflows";

const ROLE_MAP: Record<string, UserRole> = {
  admin: "ADMIN",
  operator: "OPERATOR",
  analyst: "ANALYST",
  client: "CLIENT",
  vendor: "VENDOR",
};

/**
 * Resolves the acting user for V2 commands from the auth store, falling back
 * to a role-scoped demo actor when no user is selected (role switcher demo).
 */
export function useActor(roleHint: string, sourceScreen?: string): Actor {
  const { currentUser } = useCurrentUser();

  return useMemo(() => {
    const role = ROLE_MAP[currentUser?.role?.toLowerCase() ?? roleHint] ?? "ADMIN";
    return {
      userId: currentUser?.id ?? `demo-${roleHint}`,
      role,
      sourceScreen,
    };
  }, [currentUser, roleHint, sourceScreen]);
}
