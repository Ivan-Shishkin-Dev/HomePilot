import { createClient } from "@supabase/supabase-js";

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error("Missing Supabase environment variables");
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

// Database types
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
  search_city: string | null;
  search_max_rent: number | null;
  search_min_bedrooms: number | null;
  search_move_in_date: string | null;
  preferred_amenities: string[] | null;
  created_at: string;
  updated_at: string;
}

export interface UserDocument {
  id: string;
  user_id: string;
  name: string;
  type: string;
  status: "verified" | "pending" | "missing";
  icon: string;
  uploaded_at: string | null;
  created_at: string;
}

export interface Listing {
  id: string;
  title: string;
  address: string;
  price: number;
  bedrooms: number;
  bathrooms: number;
  sqft: number;
  image_url: string;
  match_score: number;
  livability_score: number;
  competition_level: number;
  amenities: string[];
  ai_reasons: string[];
  is_featured: boolean;
  available_date: string | null;
  created_at: string;
}

export interface ProfileSuggestion {
  id: string;
  user_id: string;
  title: string;
  description: string;
  impact: "high" | "medium" | "low";
  icon: string;
  is_completed: boolean;
  created_at: string;
}

export interface UserAlert {
  id: string;
  user_id: string;
  listing_id: string | null;
  title: string;
  message: string;
  urgency: "high" | "medium" | "low";
  is_read: boolean;
  created_at: string;
  listing?: Listing;
}
