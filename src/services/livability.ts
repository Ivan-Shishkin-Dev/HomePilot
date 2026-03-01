/**
 * Livability / crime data for a listing.
 * Uses Teleport API (free, no key) first; optional CrimeoMeter (paid key) for finer-grained data.
 */

import type { Listing } from "../lib/supabase";

const NOMINATIM_URL = "https://nominatim.openstreetmap.org/search";
const NOMINATIM_REVERSE = "https://nominatim.openstreetmap.org/reverse";
const CRIMEOMETER_URL = "https://api.crimeometer.com/v2/incidents/stats";
const TELEPORT_CITIES = "https://api.teleport.org/api/cities/";
const TELEPORT_UA_SCORES = "https://api.teleport.org/api/urban_areas/slug";
const CORS_PROXIES = [
  "https://corsproxy.io/?",
  "https://api.allorigins.win/raw?url=",
];

const USER_AGENT = "HomePilot/1.0 (Rental app; livability data)";

/** Teleport does not send CORS headers; fetch via proxy. Tries multiple proxies on 5xx/failure. */
async function teleportFetch(url: string, init?: RequestInit): Promise<Response> {
  const opts = {
    ...init,
    headers: { Accept: "application/json", "User-Agent": USER_AGENT, ...init?.headers } as HeadersInit,
    signal: init?.signal ?? AbortSignal.timeout(12000),
  };
  for (const base of CORS_PROXIES) {
    try {
      const proxyUrl = base === CORS_PROXIES[1] ? base + encodeURIComponent(url) : base + encodeURIComponent(url);
      const res = await fetch(proxyUrl, opts);
      if (res.ok || res.status < 500) return res;
    } catch {
      // try next proxy
    }
  }
  return fetch(CORS_PROXIES[0] + encodeURIComponent(url), opts);
}

/** Common US city name -> Teleport urban area slug (fallback when search fails). */
const CITY_SLUG_FALLBACKS: Record<string, string> = {
  irvine: "los-angeles",
  "los angeles": "los-angeles",
  "san diego": "san-diego",
  "san francisco": "san-francisco-bay-area",
  "san jose": "san-jose",
  boston: "boston",
  "new york": "new-york",
  chicago: "chicago",
  austin: "austin",
  seattle: "seattle",
  denver: "denver",
  "las vegas": "las-vegas",
  phoenix: "phoenix",
  portland: "portland",
};

/** Static crime index (0–100) when Teleport/APIs are down; approximate by metro. */
const STATIC_CRIME_ESTIMATES: Record<string, number> = {
  "los-angeles": 38,
  "san-diego": 32,
  "san-francisco-bay-area": 45,
  "san-jose": 28,
  boston: 35,
  "new-york": 42,
  chicago: 48,
  austin: 32,
  seattle: 38,
  denver: 40,
  "las-vegas": 45,
  phoenix: 42,
  portland: 44,
};

/** Result from CrimeoMeter; we use CSI (0–100, higher = more crime) as crime_index */
export interface LivabilityResult {
  crime_index: number;
  crime_description: string;
  incidents_count: number | null;
  population_count: number | null;
  /** Top crime types for tooltip/display */
  incidents_types: { incident_type: string; incident_type_count: number }[];
  /** 'api' = Teleport/CrimeoMeter, 'estimate' = static fallback when API unavailable */
  source?: "api" | "estimate";
}

/** Geocode address or city, state to lat/lng using Nominatim (free, no key). */
export async function geocodeLocation(params: {
  address?: string;
  city?: string | null;
  state?: string;
}): Promise<{ lat: number; lon: number } | null> {
  const { address, city, state } = params;
  const query = address?.trim() || [city, state].filter(Boolean).join(", ");
  if (!query) return null;

  const url = new URL(NOMINATIM_URL);
  url.searchParams.set("q", `${query}, US`);
  url.searchParams.set("format", "json");
  url.searchParams.set("limit", "1");

  try {
    const res = await fetch(url.toString(), {
      headers: { Accept: "application/json", "User-Agent": USER_AGENT },
      signal: AbortSignal.timeout(8000),
    });
    if (!res.ok) return null;
    const data = await res.json();
    const first = Array.isArray(data) ? data[0] : null;
    if (first?.lat != null && first?.lon != null) {
      return { lat: Number(first.lat), lon: Number(first.lon) };
    }
  } catch {
    // timeout or network
  }
  return null;
}

/**
 * Fetch crime stats from CrimeoMeter for a location.
 * Requires VITE_CRIMEOMETER_API_KEY. Returns null if no key or request fails.
 */
export async function fetchCrimeStats(
  lat: number,
  lon: number
): Promise<Omit<LivabilityResult, "crime_description"> | null> {
  const apiKey = import.meta.env.VITE_CRIMEOMETER_API_KEY;
  if (!apiKey?.trim()) return null;

  const end = new Date();
  const start = new Date();
  start.setFullYear(start.getFullYear() - 1);

  const url = new URL(CRIMEOMETER_URL);
  url.searchParams.set("lat", String(lat));
  url.searchParams.set("lon", String(lon));
  url.searchParams.set("datetime_ini", start.toISOString().slice(0, 19));
  url.searchParams.set("datetime_end", end.toISOString().slice(0, 19));
  url.searchParams.set("distance", "1"); // 1 mile

  try {
    const res = await fetch(url.toString(), {
      headers: {
        "Content-Type": "application/json",
        "x-api-key": apiKey.trim(),
      },
      signal: AbortSignal.timeout(10000),
    });
    if (!res.ok) return null;
    const data = (await res.json()) as {
      csi?: number;
      incidents_count?: number;
      population_count?: number;
      incidents_types?: { incident_type: string; incident_type_count: number }[];
    };
    const csi = data.csi ?? null;
    if (csi == null) return null;

    return {
      crime_index: Math.round(Math.min(100, Math.max(0, csi))),
      incidents_count: data.incidents_count ?? null,
      population_count: data.population_count ?? null,
      incidents_types: data.incidents_types ?? [],
    };
  } catch {
    return null;
  }
}

function describeCrime(crimeIndex: number): string {
  if (crimeIndex < 25) return "Safe area";
  if (crimeIndex < 50) return "Moderate crime";
  if (crimeIndex < 75) return "Exercise caution";
  return "Higher crime area";
}

/** Reverse geocode lat/lng to city name using Nominatim. */
async function reverseGeocode(lat: number, lon: number): Promise<string | null> {
  try {
    const url = `${NOMINATIM_REVERSE}?lat=${lat}&lon=${lon}&format=json`;
    const res = await fetch(url, {
      headers: { Accept: "application/json", "User-Agent": USER_AGENT },
      signal: AbortSignal.timeout(6000),
    });
    if (!res.ok) return null;
    const data = (await res.json()) as { address?: { city?: string; town?: string; village?: string; county?: string } };
    const a = data.address ?? {};
    const city = a.city ?? a.town ?? a.village ?? a.county ?? null;
    return city ? String(city).trim() : null;
  } catch {
    return null;
  }
}

/** Normalize city: "Irvine, CA" -> ["Irvine", "Irvine, CA"] for Teleport search. */
function normalizeCityForTeleport(city: string | null): string[] {
  const s = (city ?? "").trim();
  if (!s) return [];
  const parts = s.split(",").map((p) => p.trim()).filter(Boolean);
  const first = parts[0] ?? "";
  if (!first) return [];
  return first === s ? [first] : [first, s];
}

async function tryTeleportForCity(city: string): Promise<{ crime_index: number } | null> {
  try {
    const searchRes = await teleportFetch(`${TELEPORT_CITIES}?search=${encodeURIComponent(city)}`);
    if (!searchRes.ok) return null;

    const searchData = (await searchRes.json()) as {
      _embedded?: { "city:search-results"?: Array<{ _links?: { "city:item"?: { href?: string } } }> };
    };
    const results = searchData._embedded?.["city:search-results"];
    if (!Array.isArray(results) || results.length === 0) return null;

    for (const item of results.slice(0, 3)) {
      const href = item?._links?.["city:item"]?.href;
      if (!href) continue;
      const cityRes = await teleportFetch(href, { signal: AbortSignal.timeout(8000) });
      if (!cityRes.ok) continue;
      const cityData = (await cityRes.json()) as {
        _links?: { "ua:urban_area"?: { href?: string } };
      };
      const uaHref = cityData._links?.["ua:urban_area"]?.href;
      if (!uaHref) continue;

      const scoresHref = uaHref.endsWith("/") ? `${uaHref}scores/` : `${uaHref}/scores/`;
      const scoresRes = await teleportFetch(scoresHref, { signal: AbortSignal.timeout(8000) });
      if (!scoresRes.ok) continue;
      const scoresData = (await scoresRes.json()) as {
        categories?: Array<{ name: string; score_out_of_10: number }>;
      };
      const safety = (scoresData.categories ?? []).find(
        (c) => c.name?.toLowerCase() === "safety" || (c.name?.toLowerCase().includes("safety") && !c.name?.toLowerCase().includes("net"))
      );
      const scoreOutOf10 = safety?.score_out_of_10;
      if (scoreOutOf10 == null) continue;

      const crime_index = Math.round(100 - Math.min(10, Math.max(0, scoreOutOf10)) * 10);
      return { crime_index: Math.min(100, Math.max(0, crime_index)) };
    }
  } catch {
    // ignore
  }
  return null;
}

/**
 * Fetch safety score from Teleport by urban area slug (no search step).
 */
async function fetchTeleportSafetyBySlug(slug: string): Promise<{ crime_index: number } | null> {
  try {
    const url = `${TELEPORT_UA_SCORES}/${encodeURIComponent(slug)}/scores/`;
    const res = await teleportFetch(url, { signal: AbortSignal.timeout(8000) });
    if (!res.ok) return null;
    const data = (await res.json()) as {
      categories?: Array<{ name: string; score_out_of_10: number }>;
    };
    const safety = (data.categories ?? []).find(
      (c) => c.name?.toLowerCase() === "safety" || (c.name?.toLowerCase().includes("safety") && !c.name?.toLowerCase().includes("net"))
    );
    const scoreOutOf10 = safety?.score_out_of_10;
    if (scoreOutOf10 == null) return null;
    const crime_index = Math.round(100 - Math.min(10, Math.max(0, scoreOutOf10)) * 10);
    return { crime_index: Math.min(100, Math.max(0, crime_index)) };
  } catch {
    return null;
  }
}

/**
 * Teleport API — free, no API key. Tries city search, then slug fallback for known cities.
 * Docs: https://developers.teleport.org/
 */
async function fetchTeleportSafety(cityName: string | null): Promise<{ crime_index: number } | null> {
  const variants = normalizeCityForTeleport(cityName);
  for (const city of variants) {
    if (!city) continue;
    const result = await tryTeleportForCity(city);
    if (result) return result;
  }
  const slugKey = (cityName ?? "").trim().toLowerCase().replace(/\s+/g, " ");
  const slug = slugKey ? CITY_SLUG_FALLBACKS[slugKey] ?? CITY_SLUG_FALLBACKS[variants[0]?.toLowerCase().replace(/\s+/g, " ") ?? ""] : undefined;
  if (slug) {
    const bySlug = await fetchTeleportSafetyBySlug(slug);
    if (bySlug) return bySlug;
  }
  return null;
}

/**
 * Fetch livability (crime) data for a listing.
 * 1) Tries Teleport (free) by listing city, then by city from geocode if needed.
 * 2) If CrimeoMeter key is set, tries CrimeoMeter by lat/lng for finer-grained data.
 */
export async function fetchLivability(listing: Listing): Promise<LivabilityResult | null> {
  const city = listing.city ?? null;

  // 1a. Teleport by listing city (and normalized variants e.g. "Irvine" from "Irvine, CA")
  let teleport = await fetchTeleportSafety(city);
  if (teleport) {
    return {
      crime_index: teleport.crime_index,
      crime_description: describeCrime(teleport.crime_index),
      incidents_count: null,
      population_count: null,
      incidents_types: [],
      source: "api",
    };
  }

  // 1b. Geocode listing location, reverse to get city name, try Teleport again
  let lat: number | null = listing.latitude ?? null;
  let lon: number | null = listing.longitude ?? null;
  if (lat == null || lon == null) {
    const geo = await geocodeLocation({
      address: listing.address,
      city: listing.city,
      state: "CA",
    });
    if (geo) {
      lat = geo.lat;
      lon = geo.lon;
    }
  }
  if (lat != null && lon != null) {
    const reverseCity = await reverseGeocode(lat, lon);
    if (reverseCity) teleport = await fetchTeleportSafety(reverseCity);
    if (teleport) {
      return {
        crime_index: teleport.crime_index,
        crime_description: describeCrime(teleport.crime_index),
        incidents_count: null,
        population_count: null,
        incidents_types: [],
        source: "api",
      };
    }
  }

  // 2. CrimeoMeter when API key is set
  if (lat != null && lon != null) {
    const crime = await fetchCrimeStats(lat, lon);
    if (crime) {
      return {
        ...crime,
        crime_description: describeCrime(crime.crime_index),
        source: "api",
      };
    }
  }

  // 3. Static estimate when APIs are down (e.g. Teleport 530)
  const slugKey = (city ?? "").trim().toLowerCase().replace(/\s+/g, " ");
  const slug = slugKey ? CITY_SLUG_FALLBACKS[slugKey] ?? CITY_SLUG_FALLBACKS[normalizeCityForTeleport(city)[0]?.toLowerCase().replace(/\s+/g, " ") ?? ""] : undefined;
  const estimatedIndex = slug ? STATIC_CRIME_ESTIMATES[slug] : null;
  if (estimatedIndex != null) {
    return {
      crime_index: estimatedIndex,
      crime_description: describeCrime(estimatedIndex),
      incidents_count: null,
      population_count: null,
      incidents_types: [],
      source: "estimate",
    };
  }

  return null;
}
