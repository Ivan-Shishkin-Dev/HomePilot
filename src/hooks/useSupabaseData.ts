import { useState, useEffect, useRef, useCallback } from "react";
import { supabase, type Listing, type UserDocument, type ProfileSuggestion, type UserAlert } from "../lib/supabase";
import { useAuth } from "../contexts/AuthContext";
import { getStaticListings } from "../data/staticListings";

// Score calculation constants
const DOCUMENT_SCORE_VALUES: Record<string, number> = {
  id: 130,
  income: 150,
  credit: 140,
  bank: 130,
  employment: 110,
  references: 80,
};
const BASE_RENTER_SCORE = 72;

export function calculateRenterScore(documents: UserDocument[]): number {
  return BASE_RENTER_SCORE + documents
    .filter(d => d.status !== "missing")
    .reduce((sum, d) => sum + (DOCUMENT_SCORE_VALUES[d.icon] || 0), 0);
}

export function calculateProfileCompletion(documents: UserDocument[]): number {
  if (documents.length === 0) return 0;
  const uploaded = documents.filter(d => d.status !== "missing").length;
  return Math.round((uploaded / documents.length) * 100);
}

// Hook to fetch listings
export function useListings() {
  const [listings, setListings] = useState<Listing[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    try {
      const data = getStaticListings();
      setListings(data);
    } catch (err) {
      setError(err as Error);
    } finally {
      setLoading(false);
    }
  }, []);

  return { listings, loading, error };
}

// Hook to fetch a single listing (from static JSON)
export function useListing(id: string | undefined) {
  const [listing, setListing] = useState<Listing | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    if (!id) {
      setLoading(false);
      return;
    }
    try {
      const all = getStaticListings();
      const found = all.find((l) => l.id === id) ?? null;
      setListing(found);
    } catch (err) {
      setError(err as Error);
    } finally {
      setLoading(false);
    }
  }, [id]);

  return { listing, loading, error };
}

// Re-export from contexts so state is shared across all screens
export { useSavedListings } from "../contexts/SavedListingsContext";
export { useAppliedListings } from "../contexts/AppliedListingsContext";

// Hook to fetch user documents
export function useUserDocuments() {
  const { user } = useAuth();
  const [documents, setDocuments] = useState<UserDocument[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  const fetchDocuments = useCallback(async () => {
    if (!user) return;
    try {
      const { data, error } = await supabase
        .from("documents")
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
  }, [user]);

  useEffect(() => {
    if (!user) {
      setLoading(false);
      return;
    }
    fetchDocuments();
  }, [user, fetchDocuments]);

  // Create default documents if none exist
  useEffect(() => {
    if (!user || loading || documents.length > 0) return;

    async function createDefaultDocuments() {
      const defaultDocs = [
        { name: "Government ID", status: "missing", icon: "id" },
        { name: "Proof of Income", status: "missing", icon: "income" },
        { name: "Bank Statements", status: "missing", icon: "bank" },
        { name: "Employment Letter", status: "missing", icon: "employment" },
        { name: "Credit Report", status: "missing", icon: "credit" },
        { name: "References", status: "missing", icon: "references" },
      ];

      const { data, error } = await supabase
        .from("documents")
        .insert(defaultDocs.map(doc => ({ ...doc, user_id: user.id })))
        .select();

      if (!error && data) {
        setDocuments(data);
      }
    }

    createDefaultDocuments();
  }, [user, loading, documents.length]);

  return { documents, setDocuments, loading, error, refetch: fetchDocuments };
}

const DOCUMENTS_BUCKET = "documents";

/** Sanitize filename for storage path (remove path segments, keep extension) */
function sanitizeFileName(name: string): string {
  const base = name.replace(/^.*[/\\]/, "").replace(/[^a-zA-Z0-9._-]/g, "_");
  return base || "document";
}

// Hook for document upload with file picker — uploads file to Supabase Storage and saves path in documents.file_url
export function useDocumentUpload() {
  const { user, refreshProfile } = useAuth();
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const pendingDocIdRef = useRef<string | null>(null);
  const onCompleteRef = useRef<(() => void) | null>(null);

  const triggerUpload = (docId: string, onComplete?: () => void) => {
    pendingDocIdRef.current = docId;
    onCompleteRef.current = onComplete || null;
    fileInputRef.current?.click();
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    const docId = pendingDocIdRef.current;
    if (!file || !docId || !user) {
      if (fileInputRef.current) fileInputRef.current.value = "";
      return;
    }

    setUploading(true);
    try {
      // Fetch current document to replace existing file in storage if any
      const { data: currentDoc } = await supabase
        .from("documents")
        .select("file_url")
        .eq("id", docId)
        .single();

      if (currentDoc?.file_url) {
        await supabase.storage.from(DOCUMENTS_BUCKET).remove([currentDoc.file_url]);
      }

      const fileName = sanitizeFileName(file.name);
      const storagePath = `${user.id}/${docId}/${Date.now()}-${fileName}`;

      const { error: uploadError } = await supabase.storage
        .from(DOCUMENTS_BUCKET)
        .upload(storagePath, file, { upsert: true });

      if (uploadError) throw uploadError;

      const { error: docError } = await supabase
        .from("documents")
        .update({
          status: "pending",
          uploaded_at: new Date().toISOString(),
          file_url: storagePath,
        })
        .eq("id", docId);

      if (docError) throw docError;

      const { data: allDocs, error: fetchError } = await supabase
        .from("documents")
        .select("*")
        .eq("user_id", user.id);

      if (fetchError) throw fetchError;

      const docs = allDocs || [];
      const newScore = calculateRenterScore(docs);
      const newCompletion = calculateProfileCompletion(docs);

      const { error: profileError } = await supabase
        .from("profiles")
        .update({
          renter_score: newScore,
          profile_completion: newCompletion,
          updated_at: new Date().toISOString(),
        })
        .eq("id", user.id);

      if (profileError) throw profileError;

      await refreshProfile();
      const refetchAfterVerify = onCompleteRef.current;
      refetchAfterVerify?.();

      const verifyDocId = docId;
      setTimeout(async () => {
        try {
          await supabase
            .from("documents")
            .update({ status: "verified", verified_at: new Date().toISOString() })
            .eq("id", verifyDocId);
          refetchAfterVerify?.();
        } catch (err) {
          console.error("Auto-verify error:", err);
        }
      }, 3000);
    } catch (err) {
      console.error("Document upload error:", err);
    } finally {
      setUploading(false);
      pendingDocIdRef.current = null;
      onCompleteRef.current = null;
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  const removeDocument = async (docId: string, onComplete?: () => void) => {
    if (!user) return;
    try {
      const { data: doc } = await supabase
        .from("documents")
        .select("file_url")
        .eq("id", docId)
        .single();

      if (doc?.file_url) {
        await supabase.storage.from(DOCUMENTS_BUCKET).remove([doc.file_url]);
      }

      const { error: docError } = await supabase
        .from("documents")
        .update({
          status: "missing",
          uploaded_at: null,
          verified_at: null,
          file_url: null,
        })
        .eq("id", docId);

      if (docError) throw docError;

      const { data: allDocs, error: fetchError } = await supabase
        .from("documents")
        .select("*")
        .eq("user_id", user.id);

      if (fetchError) throw fetchError;

      const docs = allDocs || [];
      const newScore = calculateRenterScore(docs);
      const newCompletion = calculateProfileCompletion(docs);

      await supabase
        .from("profiles")
        .update({
          renter_score: newScore,
          profile_completion: newCompletion,
          updated_at: new Date().toISOString(),
        })
        .eq("id", user.id);

      await refreshProfile();
      onComplete?.();
    } catch (err) {
      console.error("Remove document error:", err);
    }
  };

  return { triggerUpload, uploading, fileInputRef, handleFileChange, removeDocument };
}

/** Get a signed URL for a document file path (for display). Returns null if path is null or on error. */
export async function getDocumentSignedUrl(filePath: string | null): Promise<string | null> {
  if (!filePath) return null;
  const { data, error } = await supabase.storage
    .from(DOCUMENTS_BUCKET)
    .createSignedUrl(filePath, 3600);
  if (error) return null;
  return data?.signedUrl ?? null;
}

/** Hook to resolve a document's file_url to a signed URL for display (e.g. thumbnail). */
export function useDocumentFileUrl(filePath: string | null) {
  const [url, setUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(!!filePath);

  useEffect(() => {
    if (!filePath) {
      setUrl(null);
      setLoading(false);
      return;
    }
    let cancelled = false;
    setLoading(true);
    getDocumentSignedUrl(filePath).then((signed) => {
      if (!cancelled) {
        setUrl(signed);
        setLoading(false);
      }
    });
    return () => {
      cancelled = true;
    };
  }, [filePath]);

  return { url, loading };
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
        { action: "Upload last 3 months bank statements", category: "Financial", impact: 22, completed: false, auto_applied: false },
        { action: "Add employer reference letter", category: "Employment", impact: 12, completed: false, auto_applied: false },
        { action: "Complete credit authorization", category: "Credit", impact: 22, completed: false, auto_applied: false },
        { action: "Add guarantor information", category: "Financial", impact: 22, completed: false, auto_applied: false },
        { action: "Verify identity with government ID", category: "Identity", impact: 5, completed: false, auto_applied: false },
        { action: "Link LinkedIn profile", category: "Employment", impact: 5, completed: false, auto_applied: false },
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
          .from("alerts")
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
      .from("alerts")
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
