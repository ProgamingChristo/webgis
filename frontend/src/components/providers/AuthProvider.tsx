"use client";

import { useEffect, useState, createContext, useContext } from "react";
import { useRouter, usePathname } from "next/navigation";
import { getUserContext, type UserContext } from "@/src/lib/auth-client";

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
  const router = useRouter();
  const pathname = usePathname();

  async function refresh() {
    const result = await getUserContext();
    setContext(result);
    return result;
  }

  useEffect(() => {
    let mounted = true;
    
    async function loadAuth() {
      const result = await getUserContext();
      if (!mounted) return;
      
      setContext(result);
      setLoading(false);

      const isPublicRoute = ["/login", "/signup"].includes(pathname);
      const isApiRoute = pathname.startsWith("/api");
      const isAdminRoute = pathname.startsWith("/admin");

      if (!result && !isPublicRoute && !isApiRoute) {
        router.replace("/login");
        return;
      }

      if (
        result &&
        isAdminRoute &&
        result.profile?.account_role !== "ADMIN"
      ) {
        router.replace("/");
        return;
      }

      if (result && isPublicRoute) {
        if (!result.profile?.onboarding_complete) {
          router.replace("/onboarding");
        } else {
          router.replace("/");
        }
        return;
      }

      if (result && pathname !== "/onboarding" && !result.profile?.onboarding_complete && !isApiRoute) {
        router.replace("/onboarding");
      }
    }

    loadAuth();

    return () => {
      mounted = false;
    };
  }, [pathname, router]);

  if (loading) {
    return (
      <div className="auth-loading">
        <div className="auth-loading__mark">
          G
        </div>

        <span>
          Menyiapkan GETRA...
        </span>
      </div>
    );
  }

  return <AuthContext.Provider value={{ context, loading, refresh }}>{children}</AuthContext.Provider>;
}
