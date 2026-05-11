import { useEffect, useState, useCallback } from "react";

const KEY = "ahs_favorite_tools_v1";

const read = (): string[] => {
  if (typeof window === "undefined") return [];
  try { return JSON.parse(localStorage.getItem(KEY) || "[]"); } catch { return []; }
};

export const useFavorites = () => {
  const [favorites, setFavorites] = useState<string[]>(read);

  useEffect(() => {
    const onStorage = (e: StorageEvent) => { if (e.key === KEY) setFavorites(read()); };
    window.addEventListener("storage", onStorage);
    return () => window.removeEventListener("storage", onStorage);
  }, []);

  const toggle = useCallback((toolId: string) => {
    setFavorites((prev) => {
      const next = prev.includes(toolId) ? prev.filter((id) => id !== toolId) : [...prev, toolId];
      localStorage.setItem(KEY, JSON.stringify(next));
      return next;
    });
  }, []);

  const isFavorite = useCallback((toolId: string) => favorites.includes(toolId), [favorites]);

  return { favorites, toggle, isFavorite };
};
