import data from "./listings.zillow.newport.json";
import type { Listing } from "../lib/supabase";

export type StaticListing = (typeof data.listings)[number];

function staticListingToAppListing(s: StaticListing): Listing {
  const image = s.images?.[0]?.url ?? "https://images.unsplash.com/photo-1560448204-e02f11c3d0e2?w=800";
  const competitionScore = s.demo_flags?.high_competition ? 75 : 45;
  return {
    id: s.id,
    title: s.title,
    address: s.address_display,
    city: s.city,
    price: s.price_monthly,
    beds: s.beds,
    baths: s.baths,
    sqft: s.sqft ?? 0,
    image,
    crime_index: 25,
    rent_trend: "+2%",
    neighborhood_risk: "Low",
    scam_score: 3,
    demand: competitionScore > 70 ? "High" : competitionScore > 40 ? "Medium" : "Low",
    competition_score: competitionScore,
    competition_level: competitionScore,
    features: s.amenities ?? [],
    ai_suggestion: "Complete your profile for better matching",
    ai_reasons: ["Complete your profile for better matching"],
    time_left: s.posted_at ? `Posted ${s.posted_at}` : "Posted recently",
    created_at: data.generated_at,
    updated_at: data.generated_at,
    listing_url: s.listing_url,
    apply_url: s.apply_url,
    pet_policy: s.pet_policy,
    source: s.source,
    student_friendly:
      s.audience_tags?.includes("student") === true || s.demo_flags?.student_friendly === true,
  };
}

/** Load all static listings and return as app Listing[] (no network). */
export function getStaticListings(): Listing[] {
  return data.listings.map(staticListingToAppListing);
}
