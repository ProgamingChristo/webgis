"use client";

import { useEffect, useState, createContext, useContext } from "react";
import { useRouter, usePathname } from "next/navigation";
import { getUserContext, type UserContext } from "@/src/lib/auth-client";

interface AuthContextValue {
  context: UserContext | null;
  loading: boolean;
}

const AuthContext = createContext<AuthContextValue>({
  context: null,
  loading: true,
});

export const useAuth = () => useContext(AuthContext);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [context, setContext] = useState<UserContext | null>(null);
  const [loading, setLoading] = useState(true);
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    let mounted = true;
    
    async function loadAuth() {
      const result = await getUserContext();
      if (!mounted) return;
      
      setContext(result);
      setLoading(false);

      const isPublicRoute = ["/login", "/signup"].includes(pathname);
      const isApiRoute = pathname.startsWith("/api");

      if (!result && !isPublicRoute && !isApiRoute) {
        router.replace("/login");
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
    return <div style={{ height: "100vh", display: "flex", alignItems: "center", justifyContent: "center" }}>Loading...</div>;
  }

  return <AuthContext.Provider value={{ context, loading }}>{children}</AuthContext.Provider>;
}
