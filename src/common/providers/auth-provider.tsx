"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";
import type { User } from "@supabase/supabase-js";
import { createClient } from "@/common/lib/supabase/client";
import type { SupabaseEmployee, SupabaseCompany } from "@/common/types";

interface AuthState {
  user: User | null;
  employee: SupabaseEmployee | null;
  company: SupabaseCompany | null;
  isLoading: boolean;
}

interface AuthContextValue extends AuthState {
  companyId: string | null;
  employeeId: string | null;
  userId: string | null;
  signOut: () => Promise<void>;
  refreshProfile: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [state, setState] = useState<AuthState>({
    user: null,
    employee: null,
    company: null,
    isLoading: true,
  });

  const supabase = useMemo(() => createClient(), []);

  const fetchProfile = useCallback(
    async (userId: string) => {
      const { data: employee } = await supabase
        .from("employees")
        .select("*")
        .eq("user_id", userId)
        .eq("status", "active")
        .limit(1)
        .single();

      if (!employee) {
        setState((prev) => ({
          ...prev,
          employee: null,
          company: null,
          isLoading: false,
        }));
        return;
      }

      const { data: company } = await supabase
        .from("companies")
        .select("*")
        .eq("id", employee.company_id)
        .single();

      setState((prev) => ({
        ...prev,
        employee: employee as SupabaseEmployee,
        company: company as SupabaseCompany | null,
        isLoading: false,
      }));
    },
    [supabase]
  );

  useEffect(() => {
    const init = async () => {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      setState((prev) => ({ ...prev, user }));

      if (user) {
        await fetchProfile(user.id);
      } else {
        setState((prev) => ({ ...prev, isLoading: false }));
      }
    };

    init();

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(async (_event, session) => {
      const user = session?.user ?? null;
      setState((prev) => ({ ...prev, user }));

      if (user) {
        await fetchProfile(user.id);
      } else {
        setState((prev) => ({
          ...prev,
          employee: null,
          company: null,
          isLoading: false,
        }));
      }
    });

    return () => subscription.unsubscribe();
  }, [supabase, fetchProfile]);

  const signOut = useCallback(async () => {
    await supabase.auth.signOut();
    setState({ user: null, employee: null, company: null, isLoading: false });
  }, [supabase]);

  const refreshProfile = useCallback(async () => {
    if (state.user) {
      await fetchProfile(state.user.id);
    }
  }, [state.user, fetchProfile]);

  const value = useMemo<AuthContextValue>(
    () => ({
      ...state,
      companyId: state.company?.id ?? null,
      employeeId: state.employee?.id ?? null,
      userId: state.user?.id ?? null,
      signOut,
      refreshProfile,
    }),
    [state, signOut, refreshProfile]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}

export function useRequiredAuth() {
  const auth = useAuth();
  if (!auth.userId || !auth.companyId || !auth.employeeId) {
    throw new Error(
      "useRequiredAuth requires authenticated user with company and employee"
    );
  }
  return auth as AuthContextValue & {
    userId: string;
    companyId: string;
    employeeId: string;
  };
}
