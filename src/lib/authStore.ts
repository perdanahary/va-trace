import { useCallback, useEffect, useSyncExternalStore } from "react";
import type { AppUser } from "@/lib/userStore";
import { useUserStore } from "@/lib/userStore";

const STORAGE_KEY = "va-trace-current-user";

function getCurrentUserId(): string | null {
  if (typeof window === "undefined") return null;
  try {
    return window.localStorage.getItem(STORAGE_KEY);
  } catch {
    return null;
  }
}

function setCurrentUserId(id: string | null) {
  if (typeof window === "undefined") return;
  try {
    if (id) {
      window.localStorage.setItem(STORAGE_KEY, id);
    } else {
      window.localStorage.removeItem(STORAGE_KEY);
    }
    window.dispatchEvent(new CustomEvent("va-trace-current-user:change"));
  } catch {
    // ignore
  }
}

function subscribeToCurrentUser(callback: () => void) {
  window.addEventListener("storage", callback);
  window.addEventListener("va-trace-current-user:change", callback);
  return () => {
    window.removeEventListener("storage", callback);
    window.removeEventListener("va-trace-current-user:change", callback);
  };
}

function readStoredUserId(): string | null {
  return getCurrentUserId();
}

export function useCurrentUser() {
  const { users } = useUserStore();
  const userId = useSyncExternalStore(subscribeToCurrentUser, readStoredUserId, () => null);

  const currentUser = userId ? (users.find((u) => u.id === userId) ?? null) : null;

  const setCurrentUser = useCallback((user: AppUser | null) => {
    setCurrentUserId(user?.id ?? null);
  }, []);

  const clearCurrentUser = useCallback(() => {
    setCurrentUserId(null);
  }, []);

  return { currentUser, setCurrentUser, clearCurrentUser };
}

export function resolveUserForRole(users: AppUser[], role: string): AppUser | null {
  return users.find((u) => u.role === role && u.status === "Active") ?? null;
}
