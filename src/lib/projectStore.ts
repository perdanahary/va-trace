import { useEffect, useMemo, useSyncExternalStore } from "react";

import { mockOrders } from "@/lib/mockData";

const STORAGE_KEY = "va-trace-projects";
const STORE_EVENT = "va-trace-projects:change";

let cachedProjects: string[] = [];
let cachedStorageValue: string | null = null;

function normalizeProjectName(name: string) {
  return name.trim().replace(/\s+/g, " ");
}

function dedupeProjects(projects: string[]) {
  const seen = new Set<string>();
  const nextProjects: string[] = [];

  for (const project of projects) {
    const normalized = normalizeProjectName(project);

    if (!normalized) {
      continue;
    }

    const key = normalized.toLowerCase();
    if (seen.has(key)) {
      continue;
    }

    seen.add(key);
    nextProjects.push(normalized);
  }

  return nextProjects;
}

function getSeedProjects() {
  return dedupeProjects(mockOrders.map((order) => order.campaign));
}

function readStoredProjects(): string[] {
  if (typeof window === "undefined") {
    return getSeedProjects();
  }

  try {
    const stored = window.localStorage.getItem(STORAGE_KEY);
    const seeds = getSeedProjects();

    if (!stored) {
      cachedProjects = seeds;
      cachedStorageValue = null;
      return seeds;
    }

    if (stored === cachedStorageValue) {
      return cachedProjects;
    }

    const parsed = JSON.parse(stored) as unknown;
    const storedProjects = Array.isArray(parsed) ? parsed.filter((value): value is string => typeof value === "string") : [];
    const mergedProjects = dedupeProjects([...storedProjects, ...seeds]);

    cachedProjects = mergedProjects;
    cachedStorageValue = stored;
    return mergedProjects;
  } catch {
    return getSeedProjects();
  }
}

function writeStoredProjects(nextProjects: string[]) {
  if (typeof window === "undefined") {
    return;
  }

  const serialized = JSON.stringify(dedupeProjects(nextProjects));
  cachedProjects = JSON.parse(serialized) as string[];
  cachedStorageValue = serialized;
  window.localStorage.setItem(STORAGE_KEY, serialized);
  window.dispatchEvent(new Event(STORE_EVENT));
}

function subscribe(listener: () => void) {
  if (typeof window === "undefined") {
    return () => undefined;
  }

  const handleStorage = (event: StorageEvent) => {
    if (event.key === STORAGE_KEY) {
      listener();
    }
  };

  const handleStoreEvent = () => listener();

  window.addEventListener("storage", handleStorage);
  window.addEventListener(STORE_EVENT, handleStoreEvent);

  return () => {
    window.removeEventListener("storage", handleStorage);
    window.removeEventListener(STORE_EVENT, handleStoreEvent);
  };
}

export function getProjectSnapshot() {
  return readStoredProjects();
}

export function useProjectStore() {
  const projects = useSyncExternalStore(subscribe, readStoredProjects, getSeedProjects);

  useEffect(() => {
    if (typeof window === "undefined") {
      return;
    }

    const mergedProjects = dedupeProjects(projects);
    const serialized = JSON.stringify(mergedProjects);
    if (serialized === cachedStorageValue) {
      return;
    }

    cachedProjects = mergedProjects;
    cachedStorageValue = serialized;
    window.localStorage.setItem(STORAGE_KEY, serialized);
  }, [projects]);

  const addProject = (projectName: string) => {
    const normalizedProject = normalizeProjectName(projectName);
    if (!normalizedProject) {
      return;
    }

    const currentProjects = readStoredProjects();
    writeStoredProjects([normalizedProject, ...currentProjects.filter((project) => project.toLowerCase() !== normalizedProject.toLowerCase())]);
  };

  return useMemo(
    () => ({
      projects,
      addProject,
    }),
    [projects],
  );
}
