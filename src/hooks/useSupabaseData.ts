import { useState, useEffect } from "react";
import { supabase, type Listing, type UserDocument, type ProfileSuggestion, type UserAlert } from "../lib/supabase";
import { useAuth } from "../contexts/AuthContext";

// Hook to fetch listings
export function useListings() {
  const [listings, setListings] = useState<Listing[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    async function fetchListings() {
      try {
        const { data, error } = await supabase
          .from("listings")
          .select("*")
          .order("match_score", { ascending: false });

        if (error) throw error;
        setListings(data || []);
      } catch (err) {
        setError(err as Error);
      } finally {
        setLoading(false);
      }
    }

    fetchListings();
  }, []);

  return { listings, loading, error };
}

// Hook to fetch a single listing
export function useListing(id: string | undefined) {
  const [listing, setListing] = useState<Listing | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    if (!id) {
      setLoading(false);
      return;
    }

    async function fetchListing() {
      try {
        const { data, error } = await supabase
          .from("listings")
          .select("*")
          .eq("id", id)
          .single();

        if (error) throw error;
        setListing(data);
      } catch (err) {
        setError(err as Error);
      } finally {
        setLoading(false);
      }
    }

    fetchListing();
  }, [id]);

  return { listing, loading, error };
}

// Hook to fetch user documents
export function useUserDocuments() {
  const { user } = useAuth();
  const [documents, setDocuments] = useState<UserDocument[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    if (!user) {
      setLoading(false);
      return;
    }

    async function fetchDocuments() {
      try {
        const { data, error } = await supabase
          .from("user_documents")
          .select("*")
          .eq("user_id", user.id)
          .order("created_at", { ascending: true });

        if (error) throw error;
        setDocuments(data || []);
      } catch (err) {
        setError(err as Error);
      } finally {
        setLoading(false);
      }
    }

    fetchDocuments();
  }, [user]);

  // Create default documents if none exist
  useEffect(() => {
    if (!user || loading || documents.length > 0) return;

    async function createDefaultDocuments() {
      const defaultDocs = [
        { name: "Government ID", type: "identity", status: "missing", icon: "id" },
        { name: "Proof of Income", type: "income", status: "missing", icon: "income" },
        { name: "Bank Statements", type: "financial", status: "missing", icon: "bank" },
        { name: "Employment Letter", type: "employment", status: "missing", icon: "employment" },
        { name: "Credit Report", type: "credit", status: "missing", icon: "credit" },
        { name: "References", type: "references", status: "missing", icon: "references" },
      ];

      const { data, error } = await supabase
        .from("user_documents")
        .insert(defaultDocs.map(doc => ({ ...doc, user_id: user.id })))
        .select();

      if (!error && data) {
        setDocuments(data);
      }
    }

    createDefaultDocuments();
  }, [user, loading, documents.length]);

  return { documents, loading, error };
}

// Hook to fetch profile suggestions
export function useProfileSuggestions() {
  const { user } = useAuth();
  const [suggestions, setSuggestions] = useState<ProfileSuggestion[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    if (!user) {
      setLoading(false);
      return;
    }

    async function fetchSuggestions() {
      try {
        const { data, error } = await supabase
          .from("profile_suggestions")
          .select("*")
          .eq("user_id", user.id)
          .order("impact", { ascending: false });

        if (error) throw error;
        setSuggestions(data || []);
      } catch (err) {
        setError(err as Error);
      } finally {
        setLoading(false);
      }
    }

    fetchSuggestions();
  }, [user]);

  // Create default suggestions if none exist
  useEffect(() => {
    if (!user || loading || suggestions.length > 0) return;

    async function createDefaultSuggestions() {
      const defaultSuggestions = [
        { title: "Upload last 3 months bank statements", description: "Financial documentation improves acceptance rate", impact: "high", icon: "bank", is_completed: false },
        { title: "Add employer reference letter", description: "Employment verification is highly valued", impact: "medium", icon: "briefcase", is_completed: false },
        { title: "Complete credit authorization", description: "Allow credit check for faster approval", impact: "high", icon: "credit-card", is_completed: false },
        { title: "Add guarantor information", description: "A guarantor can significantly boost acceptance", impact: "high", icon: "users", is_completed: false },
        { title: "Verify student enrollment status", description: "Student verification for student housing", impact: "low", icon: "graduation-cap", is_completed: false },
        { title: "Link LinkedIn profile", description: "Professional profile adds credibility", impact: "low", icon: "linkedin", is_completed: false },
      ];

      const { data, error } = await supabase
        .from("profile_suggestions")
        .insert(defaultSuggestions.map(s => ({ ...s, user_id: user.id })))
        .select();

      if (!error && data) {
        setSuggestions(data);
      }
    }

    createDefaultSuggestions();
  }, [user, loading, suggestions.length]);

  return { suggestions, loading, error };
}

// Hook to fetch user alerts
export function useUserAlerts() {
  const { user } = useAuth();
  const [alerts, setAlerts] = useState<UserAlert[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    if (!user) {
      setLoading(false);
      return;
    }

    async function fetchAlerts() {
      try {
        const { data, error } = await supabase
          .from("user_alerts")
          .select(`
            *,
            listing:listings(*)
          `)
          .eq("user_id", user.id)
          .order("created_at", { ascending: false });

        if (error) throw error;
        setAlerts(data || []);
      } catch (err) {
        setError(err as Error);
      } finally {
        setLoading(false);
      }
    }

    fetchAlerts();
  }, [user]);

  const markAsRead = async (alertId: string) => {
    const { error } = await supabase
      .from("user_alerts")
      .update({ is_read: true })
      .eq("id", alertId);

    if (!error) {
      setAlerts(alerts.map(a => a.id === alertId ? { ...a, is_read: true } : a));
    }
  };

  return { alerts, loading, error, markAsRead };
}

// Hook to update profile
export function useUpdateProfile() {
  const { user, refreshProfile } = useAuth();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  const updateProfile = async (updates: Record<string, unknown>) => {
    if (!user) return { error: new Error("Not authenticated") };

    setLoading(true);
    setError(null);

    try {
      const { error } = await supabase
        .from("profiles")
        .update({ ...updates, updated_at: new Date().toISOString() })
        .eq("id", user.id);

      if (error) throw error;
      await refreshProfile();
      return { error: null };
    } catch (err) {
      setError(err as Error);
      return { error: err as Error };
    } finally {
      setLoading(false);
    }
  };

  return { updateProfile, loading, error };
}
