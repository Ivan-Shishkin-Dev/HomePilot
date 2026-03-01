import {
  createContext,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from "react";
import type { User, Session } from "@supabase/supabase-js";
import { supabase, type Profile } from "../lib/supabase";

interface AuthContextType {
  user: User | null;
  session: Session | null;
  profile: Profile | null;
  loading: boolean;
  signUp: (
    email: string,
    password: string,
    firstName: string,
    lastName: string
  ) => Promise<{ error: Error | null }>;
  signIn: (
    email: string,
    password: string
  ) => Promise<{ error: Error | null }>;
  signInWithGoogle: () => Promise<{ error: Error | null }>;
  signOut: () => Promise<void>;
  refreshProfile: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchProfile = async (userId: string) => {
    const { data, error } = await supabase
      .from("profiles")
      .select("*")
      .eq("id", userId)
      .single();

    if (error) {
      console.error("Error fetching profile:", error);
      return null;
    }
    return data as Profile;
  };

  /** Sync profile first_name, last_name, avatar_url from Google (or other OAuth) user_metadata when missing. */
  const syncProfileFromProvider = async (
    user: User,
    profile: Profile | null
  ): Promise<Profile | null> => {
    if (!profile) return null;
    const provider = user.app_metadata?.provider as string | undefined;
    if (provider !== "google") return profile;
    const meta = user.user_metadata || {};
    const fullName = (meta.full_name ?? meta.name) ?? "";
    const picture = meta.avatar_url ?? meta.picture;
    const needsName =
      (!profile.first_name && !profile.last_name && fullName.trim()) || false;
    const needsAvatar = !profile.avatar_url && !!picture;
    if (!needsName && !needsAvatar) return profile;
    const updates: Partial<Profile> = {};
    if (needsName && fullName.trim()) {
      const parts = fullName.trim().split(/\s+/);
      updates.first_name = parts[0] ?? null;
      updates.last_name =
        parts.length > 1 ? parts.slice(1).join(" ") : null;
    }
    if (needsAvatar && picture) updates.avatar_url = picture;
    if (Object.keys(updates).length === 0) return profile;
    const { data, error } = await supabase
      .from("profiles")
      .update(updates)
      .eq("id", user.id)
      .select()
      .single();
    if (error) return profile;
    return data as Profile;
  };

  const refreshProfile = async () => {
    if (user) {
      const profileData = await fetchProfile(user.id);
      setProfile(profileData);
    }
  };

  useEffect(() => {
    // Get initial session - clear loading as soon as we have session; fetch profile in background
    supabase.auth
      .getSession()
      .then(({ data: { session } }) => {
        setSession(session);
        setUser(session?.user ?? null);
        setLoading(false);
        if (session?.user) {
          fetchProfile(session.user.id).then(async (p) => {
            const synced = await syncProfileFromProvider(session!.user, p);
            setProfile(synced);
          });
        }
      })
      .catch((err) => {
        console.error("Auth getSession error:", err);
        setLoading(false);
      });

    // Listen for auth changes - set session/user and clear loading immediately so UI doesn't hang; fetch profile in background
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event, session) => {
      setSession(session);
      setUser(session?.user ?? null);
      setProfile(null);
      setLoading(false);

      if (session?.user) {
        fetchProfile(session.user.id).then(async (p) => {
          const synced = await syncProfileFromProvider(session!.user, p);
          setProfile(synced);
        });
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  const signUp = async (
    email: string,
    password: string,
    firstName: string,
    lastName: string
  ) => {
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: {
          first_name: firstName,
          last_name: lastName,
        },
        emailRedirectTo: `${window.location.origin}/home`,
      },
    });
    if (!error && data.session && data.user) {
      setSession(data.session);
      setUser(data.user);
    }
    return { error: error as Error | null };
  };

  const signIn = async (email: string, password: string) => {
    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });
    return { error: error as Error | null };
  };

  const signInWithGoogle = async () => {
    const { error } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: {
        redirectTo: `${window.location.origin}/home`,
        queryParams: {
          prompt: "select_account", // always show Google account picker so user can switch accounts
        },
      },
    });
    return { error: error as Error | null };
  };

  const signOut = async () => {
    await supabase.auth.signOut();
    setUser(null);
    setSession(null);
    setProfile(null);
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        session,
        profile,
        loading,
        signUp,
        signIn,
        signInWithGoogle,
        signOut,
        refreshProfile,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}
