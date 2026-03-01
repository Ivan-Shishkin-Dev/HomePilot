import { createContext, useContext, useState, useEffect, useCallback, useRef } from "react";
import { supabase } from "../lib/supabase";
import { useAuth } from "./AuthContext";
import { motion, AnimatePresence } from "motion/react";

type PendingApply = { id: string; title: string } | null;

type AppliedListingsContextValue = {
  appliedIds: Set<string>;
  appliedCount: number;
  addApplied: (listingId: string) => Promise<void>;
  removeApplied: (listingId: string) => Promise<void>;
  trackExternalLinkClick: (listing: { id: string; title: string; url: string }) => void;
  loading: boolean;
  refetch: () => Promise<void>;
};

const AppliedListingsContext = createContext<AppliedListingsContextValue | null>(null);

async function fetchAppliedForUser(userId: string): Promise<Set<string>> {
  const { data, error } = await supabase
    .from("user_applied_listings")
    .select("listing_id")
    .eq("user_id", userId);
  if (error) throw error;
  return new Set((data || []).map((r) => r.listing_id));
}

export function AppliedListingsProvider({ children }: { children: React.ReactNode }) {
  const { user } = useAuth();
  const [appliedIds, setAppliedIds] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);
  const [pendingApply, setPendingApply] = useState<PendingApply>(null);
  const [showDidApplyModal, setShowDidApplyModal] = useState(false);
  const pendingApplyRef = useRef<PendingApply>(null);
  const wasHiddenRef = useRef(false);

  // Keep ref in sync so visibility handler always sees latest
  useEffect(() => {
    pendingApplyRef.current = pendingApply;
  }, [pendingApply]);

  const fetchApplied = useCallback(async () => {
    if (!user) {
      setAppliedIds(new Set());
      setLoading(false);
      return;
    }
    setLoading(true);
    try {
      const ids = await fetchAppliedForUser(user.id);
      setAppliedIds(ids);
    } catch (err) {
      console.error("Fetch applied listings:", err);
    } finally {
      setLoading(false);
    }
  }, [user?.id]);

  useEffect(() => {
    if (!user) {
      setAppliedIds(new Set());
      setLoading(false);
      return;
    }
    fetchApplied();
    const t = setTimeout(fetchApplied, 400);
    return () => clearTimeout(t);
  }, [user, fetchApplied]);

  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === "SIGNED_IN" && session?.user) {
        fetchAppliedForUser(session.user.id).then(setAppliedIds).catch(console.error);
      }
      if (event === "SIGNED_OUT") {
        setAppliedIds(new Set());
      }
    });
    return () => subscription.unsubscribe();
  }, []);

  const addApplied = useCallback(
    async (listingId: string) => {
      if (!user) return;
      try {
        await supabase.from("user_applied_listings").insert({ user_id: user.id, listing_id: listingId });
        setAppliedIds((prev) => new Set([...prev, listingId]));
      } catch (err) {
        console.error("Add applied:", err);
      }
    },
    [user]
  );

  const removeApplied = useCallback(
    async (listingId: string) => {
      if (!user) return;
      try {
        await supabase
          .from("user_applied_listings")
          .delete()
          .eq("user_id", user.id)
          .eq("listing_id", listingId);
        setAppliedIds((prev) => {
          const next = new Set(prev);
          next.delete(listingId);
          return next;
        });
      } catch (err) {
        console.error("Remove applied:", err);
      }
    },
    [user]
  );

  const trackExternalLinkClick = useCallback((listing: { id: string; title: string; url: string }) => {
    if (user) {
      setPendingApply({ id: listing.id, title: listing.title });
    }
    window.open(listing.url, "_blank", "noopener,noreferrer");
  }, [user]);

  // When user returns to tab after clicking external link, show "Did you apply?" modal
  // Uses both visibilitychange (tab switch) and focus (window focus) for broader browser support
  useEffect(() => {
    const tryShowModal = () => {
      if (pendingApplyRef.current && document.visibilityState === "visible") {
        setPendingApply(pendingApplyRef.current);
        setShowDidApplyModal(true);
      }
    };

    const handleVisibilityChange = () => {
      if (document.visibilityState === "hidden") {
        wasHiddenRef.current = true;
      }
      if (document.visibilityState === "visible" && wasHiddenRef.current && pendingApplyRef.current) {
        wasHiddenRef.current = false;
        tryShowModal();
      }
    };

    const handleWindowFocus = () => {
      if (wasHiddenRef.current && pendingApplyRef.current) {
        wasHiddenRef.current = false;
        tryShowModal();
      }
    };

    const handleBlur = () => {
      wasHiddenRef.current = true;
    };

    document.addEventListener("visibilitychange", handleVisibilityChange);
    window.addEventListener("focus", handleWindowFocus);
    window.addEventListener("blur", handleBlur);
    return () => {
      document.removeEventListener("visibilitychange", handleVisibilityChange);
      window.removeEventListener("focus", handleWindowFocus);
      window.removeEventListener("blur", handleBlur);
    };
  }, []);

  const handleDidApplyYes = useCallback(async () => {
    if (pendingApply) {
      await addApplied(pendingApply.id);
    }
    setPendingApply(null);
    setShowDidApplyModal(false);
  }, [pendingApply, addApplied]);

  const handleDidApplyNo = useCallback(() => {
    setPendingApply(null);
    setShowDidApplyModal(false);
  }, []);

  const value: AppliedListingsContextValue = {
    appliedIds,
    appliedCount: appliedIds.size,
    addApplied,
    removeApplied,
    trackExternalLinkClick,
    loading,
    refetch: fetchApplied,
  };

  return (
    <AppliedListingsContext.Provider value={value}>
      {children}
      <AnimatePresence>
        {showDidApplyModal && pendingApply && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4"
            onClick={handleDidApplyNo}
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 10 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95 }}
              onClick={(e) => e.stopPropagation()}
              className="w-full max-w-sm rounded-2xl bg-card border border-border p-6 shadow-xl"
            >
              <p className="text-foreground text-[16px] mb-6" style={{ fontWeight: 600 }}>
                Did you apply to {pendingApply.title}?
              </p>
              <div className="flex gap-3">
                <button
                  onClick={handleDidApplyYes}
                  className="flex-1 bg-[#10B981] text-white py-2.5 rounded-xl text-[14px] hover:bg-[#059669] transition-colors"
                  style={{ fontWeight: 600 }}
                >
                  Yes
                </button>
                <button
                  onClick={handleDidApplyNo}
                  className="flex-1 bg-muted text-muted-foreground py-2.5 rounded-xl text-[14px] hover:bg-accent transition-colors"
                  style={{ fontWeight: 500 }}
                >
                  No
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </AppliedListingsContext.Provider>
  );
}

export function useAppliedListings() {
  const ctx = useContext(AppliedListingsContext);
  if (!ctx) {
    throw new Error("useAppliedListings must be used within AppliedListingsProvider");
  }
  return ctx;
}
