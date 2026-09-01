"use client";

import {
  createContext,
  useContext,
  useEffect,
  useState,
  useCallback,
  useMemo,
} from "react";

const AppContext = createContext(null);

export function useApp() {
  return useContext(AppContext);
}

export function Providers({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [toast, setToast] = useState(null);

  const showToast = useCallback((msg, type = "info") => {
    setToast({ msg, type, key: Date.now() });
  }, []);

  // auto-clear toast
  useEffect(() => {
    if (!toast) return;
    const t = setTimeout(() => setToast(null), 3200);
    return () => clearTimeout(t);
  }, [toast]);

  const refreshUser = useCallback(async () => {
    try {
      const res = await fetch("/api/auth/me");
      const data = await res.json();
      setUser(data.user);
      return data;
    } catch (e) {
      return null;
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    refreshUser();
  }, [refreshUser]);

  // IMPORTANT: api must be a STABLE function (useCallback with no deps).
  // Before it was recreated on every render, and every consumer effect that
  // listed it as a dependency re-fired endlessly — an infinite request loop
  // that made the whole site stutter and state update "randomly".
  const api = useCallback(async (url, opts = {}) => {
    const res = await fetch(url, {
      headers: { "Content-Type": "application/json", ...(opts.headers || {}) },
      ...opts,
      body: opts.body ? JSON.stringify(opts.body) : undefined,
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      if (
        typeof window !== "undefined" &&
        window.location.pathname.startsWith("/game")
      ) {
        if (
          data.error &&
          (data.error.includes("banned") ||
            data.error.includes("Not authenticated"))
        ) {
          window.location.href = "/login";
        }
      }
      return { ...data, ok: false, _status: res.status };
    }
    return data;
  }, []);

  // Memoize the context value so consumers only re-render when something
  // they actually use changes (a toast popup no longer re-renders the app).
  const value = useMemo(
    () => ({ user, setUser, loading, refreshUser, api, toast, showToast }),
    [user, loading, refreshUser, api, toast, showToast]
  );

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
}
