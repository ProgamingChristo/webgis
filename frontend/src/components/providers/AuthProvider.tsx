"use client";

import { useEffect, useState, createContext, useContext } from "react";
import { useRouter, usePathname } from "next/navigation";

import { GetraAppSkeleton } from "@/src/components/getra-ui";
import { getUserContext, type UserContext } from "@/src/lib/auth-client";
import { loginPath, postLoginPath } from "@/src/lib/auth-return-path";

interface AuthContextValue {
  context: UserContext | null;
  loading: boolean;
  refresh: () => Promise<UserContext | null>;
}

const AuthContext = createContext<AuthContextValue>({
  context: null,
  loading: true,
  refresh: async () => null,
});

export const useAuth = () => useContext(AuthContext);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [context, setContext] = useState<UserContext | null>(null);
  const [loading, setLoading] = useState(true);
  const [authError, setAuthError] = useState<string | null>(null);
  const router = useRouter();
  const pathname = usePathname();

  async function refresh() {
    setLoading(true);
    setAuthError(null);
    try {
      const result = await getUserContext();
      setContext(result);
      setLoading(false);
      return result;
    } catch (err) {
      setAuthError(err instanceof Error ? err.message : "Gagal memuat sesi pengguna.");
      setLoading(false);
      return null;
    }
  }

  useEffect(() => {
    let mounted = true;
    
    async function loadAuth() {
      if (pathname === "/") {
        setContext(null);
        setLoading(false);
        return;
      }

      setLoading(true);
      setAuthError(null);
      try {
        const result = await getUserContext();
        if (!mounted) return;
        
        setContext(result);
        setLoading(false);

        const isAuthEntryRoute = ["/login", "/signup"].includes(pathname);
        const isPublicRoute =
          pathname === "/" ||
          isAuthEntryRoute ||
          pathname === "/cctv" ||
          pathname.startsWith("/cctv/") ||
          pathname.startsWith("/international");
        const isApiRoute = pathname.startsWith("/api");
        const isAdminRoute = pathname.startsWith("/admin");

        if (!result && !isPublicRoute && !isApiRoute) {
          router.replace(loginPath(window.location.pathname + window.location.search + window.location.hash));
          return;
        }

        if (
          result &&
          isAdminRoute &&
          result.profile?.account_role !== "ADMIN"
        ) {
          router.replace("/app");
          return;
        }

        if (result && isAuthEntryRoute) {
          router.replace(postLoginPath(window.location.search, Boolean(result.profile?.onboarding_complete)));
          return;
        }

        if (result && pathname !== "/onboarding" && !result.profile?.onboarding_complete && !isApiRoute && !isPublicRoute) {
          router.replace("/onboarding");
        }
      } catch (err) {
        if (!mounted) return;
        setAuthError(err instanceof Error ? err.message : "Gagal memuat sesi pengguna.");
        setLoading(false);
      }
    }

    loadAuth();

    return () => {
      mounted = false;
    };
  }, [pathname, router]);

  if (loading || authError) {
    return (
      <GetraAppSkeleton
        status={authError ? "ERROR" : "BOOTSTRAPPING"}
        errorMessage={authError ?? undefined}
        onRetry={authError ? () => void refresh() : undefined}
      />
    );
  }

  return <AuthContext.Provider value={{ context, loading, refresh }}>{children}</AuthContext.Provider>;
}
