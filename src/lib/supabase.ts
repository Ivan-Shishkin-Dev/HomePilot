import { createClient } from "@supabase/supabase-js";

// Support both VITE_ prefixed (for Vite) and non-prefixed (from Vercel integration) env vars
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || import.meta.env.SUPABASE_URL || import.meta.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || import.meta.env.SUPABASE_ANON_KEY || import.meta.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error(
    "Supabase env vars missing. Add to .env:\n  VITE_SUPABASE_URL=https://YOUR_PROJECT.supabase.co\n  VITE_SUPABASE_ANON_KEY=your_anon_key\n(In Vite, only VITE_* vars are exposed to the client.)"
  );
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

// Database types - matching actual Supabase schema
export interface Profile {
  id: string;
  first_name: string | null;
  last_name: string | null;
  email: string | null;
  avatar_url: string | null;
  phone: string | null;
  renter_score: number;
  profile_completion: number;
  auto_apply_enabled: boolean;
  preferred_beds: number | null;
  preferred_baths: number | null;
  min_budget: number | null;
  max_budget: number | null;
  preferred_cities: string[] | null;
  amenities: string[] | null;
  move_in_date: string | null;
  created_at: string;
  updated_at: string;
}

export interface UserDocument {
  id: string;
  user_id: string;
  name: string;
  status: "verified" | "pending" | "missing";
  icon: string;
  file_url: string | null;
  uploaded_at: string | null;
  verified_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface Listing {
  id: string;
  title: string;
  address: string;
  city: string | null;
  price: number;
  beds: number;
  baths: number;
  sqft: number;
  image: string;
  crime_index: number;
  rent_trend: string | null;
  neighborhood_risk: string | null;
  scam_score: number;
  demand: string | null;
  competition_score: number;
  features: string[] | null;
  ai_suggestion: string | null;
  time_left: string | null;
  created_at: string;
  updated_at: string;
}

export interface ProfileSuggestion {
  id: string;
  user_id: string;
  action: string;
  category: string;
  impact: number;
  completed: boolean;
  auto_applied: boolean;
  completed_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface UserAlert {
  id: string;
  user_id: string;
  listing_id: string | null;
  title: string;
  type: string | null;
  description: string | null;
  urgency: string | null;
  ai_reasons: string[] | null;
  is_read: boolean;
  is_dismissed: boolean;
  expires_at: string | null;
  created_at: string;
  listing?: Listing;
}
