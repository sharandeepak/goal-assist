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
import { usePathname, useRouter } from "next/navigation";
import type { User } from "@supabase/supabase-js";
import { createClient } from "@/common/lib/supabase/client";
import type { SupabaseUser, SupabaseWorkspace } from "@/common/types";

const SELECTED_WORKSPACE_KEY = "goal_assist_selected_workspace_id";

interface AuthState {
  authUser: User | null;
  user: SupabaseUser | null;
  workspace: SupabaseWorkspace | null;
  isLoading: boolean;
  error: string | null;
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
    error: null,
  });

  const signingOutRef = useRef(false);
  const currentAuthIdRef = useRef<string | null>(null);
  const supabase = useMemo(() => createClient(), []);
  const router = useRouter();
  const pathname = usePathname();

  // Redirect to onboarding if authenticated but no user record
  useEffect(() => {
    if (
      !state.isLoading &&
      state.authUser &&
      !state.user &&
      !pathname.startsWith("/onboarding") &&
      !pathname.startsWith("/auth")
    ) {
      router.replace("/onboarding");
    }
  }, [state.isLoading, state.authUser, state.user, pathname, router]);

  const fetchProfile = useCallback(
    async (authUserId: string) => {
      try {
        currentAuthIdRef.current = authUserId;

        const selectedWorkspaceId =
          typeof window !== "undefined"
            ? window.localStorage.getItem(SELECTED_WORKSPACE_KEY)
            : null;

        const { data: allUsers, error: usersError } = await supabase
          .from("users")
          .select("*")
          .eq("auth_id", authUserId)
          .eq("status", "active");

        if (usersError) {
          console.error("Failed to fetch user profiles:", usersError.message);
          setState((prev) => ({
            ...prev,
            user: null,
            workspace: null,
            isLoading: false,
            error: "Failed to load profile.",
          }));
          return;
        }

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
            error: null,
          }));
          return;
        }

        // Fetch workspace in parallel with setting user state
        const { data: workspace, error: workspaceError } = await supabase
          .from("workspaces")
          .select("*")
          .eq("id", user.workspace_id)
          .maybeSingle();

        if (workspaceError) {
          console.error("Failed to fetch workspace:", workspaceError.message);
        }

        setState((prev) => ({
          ...prev,
          user: user as SupabaseUser,
          workspace: (workspace as SupabaseWorkspace) ?? null,
          isLoading: false,
          error: workspaceError ? "Failed to load workspace." : null,
        }));
      } catch (err) {
        console.error("Unexpected error in fetchProfile:", err);
        setState((prev) => ({
          ...prev,
          user: null,
          workspace: null,
          isLoading: false,
          error: "An unexpected error occurred while loading your profile.",
        }));
      }
    },
    [supabase]
  );

  useEffect(() => {
    const init = async () => {
      try {
        const {
          data: { user },
          error: getUserError,
        } = await supabase.auth.getUser();

        if (getUserError) {
          console.error("Failed to get auth user:", getUserError.message);
          setState((prev) => ({
            ...prev,
            authUser: null,
            isLoading: false,
            error: null,
          }));
          return;
        }

        if (user) {
          setState((prev) => ({ ...prev, authUser: user, isLoading: true, error: null }));
          await fetchProfile(user.id);
        } else {
          setState((prev) => ({ ...prev, authUser: null, isLoading: false, error: null }));
        }
      } catch (err) {
        console.error("Unexpected error during auth init:", err);
        setState((prev) => ({
          ...prev,
          authUser: null,
          user: null,
          workspace: null,
          isLoading: false,
          error: "Failed to initialize authentication.",
        }));
      }
    };

    init();

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (signingOutRef.current) return;

      const authUser = session?.user ?? null;

      try {
        if (authUser) {
          if (event === "TOKEN_REFRESHED" && authUser.id === currentAuthIdRef.current) {
            setState((prev) => ({ ...prev, authUser }));
            return;
          }
          setState((prev) => ({ ...prev, authUser, isLoading: true, error: null }));
          await fetchProfile(authUser.id);
        } else {
          currentAuthIdRef.current = null;
          setState((prev) => ({
            ...prev,
            authUser: null,
            user: null,
            workspace: null,
            isLoading: false,
            error: null,
          }));
        }
      } catch (err) {
        console.error("Error in onAuthStateChange:", err);
        setState((prev) => ({
          ...prev,
          isLoading: false,
          error: "Failed to refresh session.",
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
