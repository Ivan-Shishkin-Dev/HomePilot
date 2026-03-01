import { createContext, useContext, useState, useEffect, useCallback } from "react";
import { supabase } from "../lib/supabase";
import { useAuth } from "./AuthContext";

type SavedListingsContextValue = {
  savedIds: Set<string>;
  savedCount: number;
  toggleSave: (listingId: string) => Promise<void>;
  loading: boolean;
  refetch: () => Promise<void>;
};

const SavedListingsContext = createContext<SavedListingsContextValue | null>(null);

async function fetchSavedForUser(userId: string): Promise<Set<string>> {
  const { data, error } = await supabase
    .from("user_saved_listings")
    .select("listing_id")
    .eq("user_id", userId);
  if (error) throw error;
  return new Set((data || []).map((r) => r.listing_id));
}

export function SavedListingsProvider({ children }: { children: React.ReactNode }) {
  const { user } = useAuth();
  const [savedIds, setSavedIds] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);

  const fetchSaved = useCallback(async () => {
    if (!user) {
      setSavedIds(new Set());
      setLoading(false);
      return;
    }
    setLoading(true);
    try {
      const ids = await fetchSavedForUser(user.id);
      setSavedIds(ids);
    } catch (err) {
      console.error("Fetch saved listings:", err);
    } finally {
      setLoading(false);
    }
  }, [user?.id]);

  // Initial fetch and refetch when user changes
  useEffect(() => {
    if (!user) {
      setSavedIds(new Set());
      setLoading(false);
      return;
    }
    fetchSaved();
    // Delayed refetch to handle session propagation (fixes re-login after logout)
    const t = setTimeout(fetchSaved, 400);
    return () => clearTimeout(t);
  }, [user, fetchSaved]);

  // Subscribe to auth events: refetch on sign-in (provider may mount after SIGNED_IN fires)
  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === "SIGNED_IN" && session?.user) {
        fetchSavedForUser(session.user.id).then(setSavedIds).catch(console.error);
      }
      if (event === "SIGNED_OUT") {
        setSavedIds(new Set());
      }
    });
    return () => subscription.unsubscribe();
  }, []);

  const toggleSave = useCallback(
    async (listingId: string) => {
      if (!user) return;
      const isSaved = savedIds.has(listingId);
      try {
        if (isSaved) {
          await supabase
            .from("user_saved_listings")
            .delete()
            .eq("user_id", user.id)
            .eq("listing_id", listingId);
        } else {
          await supabase.from("user_saved_listings").insert({ user_id: user.id, listing_id: listingId });
        }
        setSavedIds((prev) => {
          const next = new Set(prev);
          if (isSaved) next.delete(listingId);
          else next.add(listingId);
          return next;
        });
      } catch (err) {
        console.error("Toggle save:", err);
      }
    },
    [user, savedIds]
  );

  const value: SavedListingsContextValue = {
    savedIds,
    savedCount: savedIds.size,
    toggleSave,
    loading,
    refetch: fetchSaved,
  };

  return (
    <SavedListingsContext.Provider value={value}>
      {children}
    </SavedListingsContext.Provider>
  );
}

export function useSavedListings() {
  const ctx = useContext(SavedListingsContext);
  if (!ctx) {
    throw new Error("useSavedListings must be used within SavedListingsProvider");
  }
  return ctx;
}
