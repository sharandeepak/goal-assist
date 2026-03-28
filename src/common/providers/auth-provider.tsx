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
import type { AuthChangeEvent, Session, User } from "@supabase/supabase-js";
import { createClient } from "@/common/lib/supabase/client";
import type { SupabaseUser, SupabaseWorkspace } from "@/common/types";

const SELECTED_WORKSPACE_KEY = "goal_assist_selected_workspace_id";
const PROFILE_CACHE_KEY = "goal_assist_auth_profile_cache_v1";

interface AuthProfileCache {
  version: 1;
  authUserId: string;
  selectedWorkspaceId: string | null;
  user: SupabaseUser;
  workspace: SupabaseWorkspace | null;
  cachedAt: number;
}

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
  const revalidatingSessionRef = useRef(false);
  const currentAuthIdRef = useRef<string | null>(null);
  const supabase = useMemo(() => createClient(), []);
  const router = useRouter();
  const pathname = usePathname();

  const getSelectedWorkspaceId = useCallback(() => {
    if (typeof window === "undefined") {
      return null;
    }
    return window.localStorage.getItem(SELECTED_WORKSPACE_KEY);
  }, []);

  const clearProfileCache = useCallback(() => {
    if (typeof window === "undefined") {
      return;
    }
    window.localStorage.removeItem(PROFILE_CACHE_KEY);
  }, []);

  const readProfileCache = useCallback(
    (authUserId: string, selectedWorkspaceId: string | null) => {
      if (typeof window === "undefined") {
        return null;
      }

      const raw = window.localStorage.getItem(PROFILE_CACHE_KEY);
      if (!raw) {
        return null;
      }

      try {
        const parsed = JSON.parse(raw) as AuthProfileCache;
        if (parsed.version !== 1) {
          return null;
        }
        if (parsed.authUserId !== authUserId) {
          return null;
        }
        if (
          selectedWorkspaceId &&
          parsed.user.workspace_id !== selectedWorkspaceId
        ) {
          return null;
        }

        return {
          user: parsed.user,
          workspace: parsed.workspace,
        };
      } catch {
        return null;
      }
    },
    []
  );

  const writeProfileCache = useCallback(
    (
      authUserId: string,
      selectedWorkspaceId: string | null,
      user: SupabaseUser,
      workspace: SupabaseWorkspace | null
    ) => {
      if (typeof window === "undefined") {
        return;
      }

      const payload: AuthProfileCache = {
        version: 1,
        authUserId,
        selectedWorkspaceId,
        user,
        workspace,
        cachedAt: Date.now(),
      };
      window.localStorage.setItem(PROFILE_CACHE_KEY, JSON.stringify(payload));
    },
    []
  );

  useEffect(() => {
    if (typeof window === "undefined") {
      return;
    }

    const raw = window.localStorage.getItem(PROFILE_CACHE_KEY);
    if (!raw) {
      return;
    }

    try {
      const parsed = JSON.parse(raw) as AuthProfileCache;
      if (parsed.version !== 1) {
        return;
      }

      setState((prev) => {
        if (prev.user || prev.workspace) {
          return prev;
        }
        return {
          ...prev,
          user: parsed.user ?? null,
          workspace: parsed.workspace ?? null,
        };
      });
    } catch {
      // Ignore malformed local cache and continue with network auth resolution.
    }
  }, []);

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
    async (authUserId: string, options?: { background?: boolean }) => {
      const background = options?.background ?? false;

      try {
        currentAuthIdRef.current = authUserId;

        const selectedWorkspaceId = getSelectedWorkspaceId();

        const {
          data: allUsers,
          error: usersError,
          status: usersStatus,
        } = await supabase
          .from("users")
          .select("*")
          .eq("auth_id", authUserId)
          .eq("status", "active");

        if (usersError) {
          if (usersStatus === 401 && !revalidatingSessionRef.current) {
            revalidatingSessionRef.current = true;
            void supabase.auth
              .getUser()
              .then(({ data: { user: refreshedUser }, error: refreshError }) => {
                if (refreshError || !refreshedUser) {
                  signingOutRef.current = false;
                  currentAuthIdRef.current = null;
                  clearProfileCache();
                  setState((prev) => ({
                    ...prev,
                    authUser: null,
                    user: null,
                    workspace: null,
                    isLoading: false,
                    error: null,
                  }));
                  return;
                }

                setState((prev) => ({ ...prev, authUser: refreshedUser, isLoading: false }));
                void fetchProfile(refreshedUser.id, { background: true });
              })
              .finally(() => {
                revalidatingSessionRef.current = false;
              });
          }

          console.error("Failed to fetch user profiles:", usersError.message);
          setState((prev) => ({
            ...prev,
            user: background ? prev.user : null,
            workspace: background ? prev.workspace : null,
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
          clearProfileCache();
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

        writeProfileCache(
          authUserId,
          selectedWorkspaceId,
          user as SupabaseUser,
          (workspace as SupabaseWorkspace) ?? null
        );
      } catch (err) {
        console.error("Unexpected error in fetchProfile:", err);
        setState((prev) => ({
          ...prev,
          user: background ? prev.user : null,
          workspace: background ? prev.workspace : null,
          isLoading: false,
          error: "An unexpected error occurred while loading your profile.",
        }));
      }
    },
    [supabase, getSelectedWorkspaceId, clearProfileCache, writeProfileCache]
  );

  const handleAuthStateChange = useCallback(
    async (event: AuthChangeEvent, session: Session | null) => {
      const authUser = session?.user ?? null;

      // While sign-out is in flight, ignore transient user-bearing events.
      if (signingOutRef.current && authUser) {
        return;
      }

      try {
        if (authUser) {
          if (event === "TOKEN_REFRESHED" && authUser.id === currentAuthIdRef.current) {
            setState((prev) => ({ ...prev, authUser }));
            return;
          }

          const selectedWorkspaceId = getSelectedWorkspaceId();
          const cachedProfile = readProfileCache(authUser.id, selectedWorkspaceId);

          if (cachedProfile) {
            currentAuthIdRef.current = authUser.id;
            setState((prev) => ({
              ...prev,
              authUser,
              user: cachedProfile.user,
              workspace: cachedProfile.workspace,
              isLoading: false,
              error: null,
            }));
            return;
          }

          setState((prev) => ({ ...prev, authUser, isLoading: true, error: null }));
          await fetchProfile(authUser.id);
        } else {
          signingOutRef.current = false;
          currentAuthIdRef.current = null;
          clearProfileCache();
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
    },
    [fetchProfile, getSelectedWorkspaceId, readProfileCache, clearProfileCache]
  );

  useEffect(() => {
    const init = async () => {
      try {
        const {
          data: { session },
          error: getSessionError,
        } = await supabase.auth.getSession();

        if (getSessionError) {
          console.error("Failed to read auth session:", getSessionError.message);
          setState((prev) => ({
            ...prev,
            authUser: null,
            isLoading: false,
            error: null,
          }));
          return;
        }

        const user = session?.user ?? null;

        if (user) {
          const selectedWorkspaceId = getSelectedWorkspaceId();
          const cachedProfile = readProfileCache(user.id, selectedWorkspaceId);

          if (cachedProfile) {
            currentAuthIdRef.current = user.id;
            setState((prev) => ({
              ...prev,
              authUser: user,
              user: cachedProfile.user,
              workspace: cachedProfile.workspace,
              isLoading: false,
              error: null,
            }));
            return;
          }

          setState((prev) => ({ ...prev, authUser: user, isLoading: true, error: null }));
          await fetchProfile(user.id);
        } else {
          clearProfileCache();
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
    } = supabase.auth.onAuthStateChange((event, session) => {
      // Avoid awaiting Supabase calls directly inside this callback.
      setTimeout(() => {
        void handleAuthStateChange(event, session);
      }, 0);
    });

    return () => subscription.unsubscribe();
  }, [supabase, fetchProfile, handleAuthStateChange, getSelectedWorkspaceId, readProfileCache, clearProfileCache]);

  const signOut = useCallback(async () => {
    signingOutRef.current = true;
    setState((prev) => ({ ...prev, isLoading: true, error: null }));
    if (typeof window !== "undefined") {
      window.localStorage.removeItem(SELECTED_WORKSPACE_KEY);
    }
    clearProfileCache();
    const { error } = await supabase.auth.signOut();
    if (error) {
      signingOutRef.current = false;
      setState((prev) => ({
        ...prev,
        isLoading: false,
        error: "Failed to sign out.",
      }));
      throw error;
    }
  }, [supabase, clearProfileCache]);

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
