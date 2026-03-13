"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import type { User } from "@supabase/supabase-js";
import { createClient } from "@/common/lib/supabase/client";
import type { SupabaseUser, SupabaseWorkspace } from "@/common/types";

const SELECTED_WORKSPACE_KEY = "goal_assist_selected_workspace_id";

interface AuthState {
  authUser: User | null;
  user: SupabaseUser | null;
  workspace: SupabaseWorkspace | null;
  isLoading: boolean;
}

interface AuthContextValue extends AuthState {
  workspaceId: string | null;
  userId: string | null;
  signOut: () => Promise<void>;
  refreshProfile: () => Promise<void>;
  switchWorkspace: (workspaceId: string) => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [state, setState] = useState<AuthState>({
    authUser: null,
    user: null,
    workspace: null,
    isLoading: true,
  });

  const signingOutRef = useRef(false);
  const currentAuthIdRef = useRef<string | null>(null);
  const supabase = useMemo(() => createClient(), []);

  const fetchProfile = useCallback(
    async (authUserId: string) => {
      currentAuthIdRef.current = authUserId;

      const selectedWorkspaceId =
        typeof window !== "undefined"
          ? window.localStorage.getItem(SELECTED_WORKSPACE_KEY)
          : null;

      const { data: allUsers } = await supabase
        .from("users")
        .select("*")
        .eq("auth_id", authUserId)
        .eq("status", "active");

      const users = (allUsers ?? []) as SupabaseUser[];
      const user = selectedWorkspaceId
        ? (users.find((u) => u.workspace_id === selectedWorkspaceId) ?? users[0])
        : users[0];

      if (!user) {
        setState((prev) => ({
          ...prev,
          user: null,
          workspace: null,
          isLoading: false,
        }));
        return;
      }

      const { data: workspace } = await supabase
        .from("workspaces")
        .select("*")
        .eq("id", user.workspace_id)
        .single();

      setState((prev) => ({
        ...prev,
        user: user as SupabaseUser,
        workspace: workspace as SupabaseWorkspace | null,
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

      if (user) {
        setState((prev) => ({ ...prev, authUser: user, isLoading: true }));
        await fetchProfile(user.id);
      } else {
        setState((prev) => ({ ...prev, authUser: null, isLoading: false }));
      }
    };

    init();

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (signingOutRef.current) return;

      const authUser = session?.user ?? null;

      if (authUser) {
        // Skip redundant refetch on token refresh if identity hasn't changed
        if (event === "TOKEN_REFRESHED" && authUser.id === currentAuthIdRef.current) {
          setState((prev) => ({ ...prev, authUser }));
          return;
        }
        setState((prev) => ({ ...prev, authUser, isLoading: true }));
        await fetchProfile(authUser.id);
      } else {
        currentAuthIdRef.current = null;
        setState((prev) => ({
          ...prev,
          authUser: null,
          user: null,
          workspace: null,
          isLoading: false,
        }));
      }
    });

    return () => subscription.unsubscribe();
  }, [supabase, fetchProfile]);

  const signOut = useCallback(async () => {
    signingOutRef.current = true;
    setState((prev) => ({ ...prev, isLoading: true }));
    if (typeof window !== "undefined") {
      window.localStorage.removeItem(SELECTED_WORKSPACE_KEY);
    }
    await supabase.auth.signOut();
  }, [supabase]);

  const refreshProfile = useCallback(async () => {
    if (state.authUser) {
      await fetchProfile(state.authUser.id);
    }
  }, [state.authUser, fetchProfile]);

  const switchWorkspace = useCallback(
    async (newWorkspaceId: string) => {
      if (typeof window !== "undefined") {
        window.localStorage.setItem(SELECTED_WORKSPACE_KEY, newWorkspaceId);
      }
      if (state.authUser) {
        await fetchProfile(state.authUser.id);
      }
    },
    [state.authUser, fetchProfile]
  );

  const value = useMemo<AuthContextValue>(
    () => ({
      ...state,
      workspaceId: state.workspace?.id ?? null,
      userId: state.user?.id ?? null,
      signOut,
      refreshProfile,
      switchWorkspace,
    }),
    [state, signOut, refreshProfile, switchWorkspace]
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
  if (auth.isLoading || !auth.userId || !auth.workspaceId) {
    return {
      ...auth,
      userId: auth.userId ?? "",
      workspaceId: auth.workspaceId ?? "",
      isLoading: true as const,
    } as AuthContextValue & {
      userId: string;
      workspaceId: string;
    };
  }
  return auth as AuthContextValue & {
    userId: string;
    workspaceId: string;
  };
}
