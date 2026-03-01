/** Priority for match scoring — separate from search filters */
export type PriorityType = "cost" | "sqft" | "beds" | "baths" | "";

export const PRIORITY_LABELS: Record<Exclude<PriorityType, "">, string> = {
  cost: "Cost (max rent)",
  sqft: "Sq. ft. (min)",
  beds: "Beds (min)",
  baths: "Baths (min)",
};

/** Listing shape used for scoring (minimal fields) */
export interface ListingForMatch {
  id: string;
  price: number;
  sqft: number;
  beds: number;
  baths: number;
}

/**
 * Compute match % (0–100) for one listing based on priority and target value.
 * - cost: target = max budget; 100 if at or under, then decay above
 * - sqft: target = min sqft; 100 if listing.sqft >= target, else proportional
 * - beds/baths: target = min; 100 if listing >= target, else proportional
 */
export function computeMatchPercent(
  listing: ListingForMatch,
  priority: Exclude<PriorityType, "">,
  priorityValue: number
): number {
  if (priorityValue <= 0) return 85; // no target = default

  switch (priority) {
    case "cost": {
      if (listing.price <= priorityValue) {
        const ratio = listing.price / priorityValue;
        return Math.round(60 + ratio * 40); // 60–100, prefer closer to budget
      }
      const over = (listing.price - priorityValue) / priorityValue;
      return Math.max(0, Math.round(100 - over * 80));
    }
    case "sqft": {
      if (listing.sqft <= 0) return 50;
      if (listing.sqft >= priorityValue) return 100;
      return Math.round((listing.sqft / priorityValue) * 100);
    }
    case "beds": {
      const want = priorityValue;
      if (listing.beds >= want) return 100;
      if (want <= 0) return 100;
      return Math.round((listing.beds / want) * 100);
    }
    case "baths": {
      const want = priorityValue;
      if (listing.baths >= want) return 100;
      if (want <= 0) return 100;
      return Math.round((listing.baths / want) * 100);
    }
    default:
      return 85;
  }
}

/** Multiple priorities: each key present with value > 0 is used. Match = average of each. */
export interface PriorityValues {
  cost?: number;
  sqft?: number;
  beds?: number;
  baths?: number;
}

export function computeMatchPercentMulti(
  listing: ListingForMatch,
  priorities: PriorityValues
): number {
  const entries = (
    (["cost", "sqft", "beds", "baths"] as const).filter(
      (k) => priorities[k] != null && priorities[k]! > 0
    ) as (Exclude<PriorityType, "">)[]
  ).map((priority) => ({
    priority,
    value: priorities[priority]!,
  }));
  if (entries.length === 0) return 85;
  let sum = 0;
  for (const { priority, value } of entries) {
    sum += computeMatchPercent(listing, priority, value);
  }
  return Math.round(sum / entries.length);
}

export const LAST_TOP_MATCH_KEY = "homepilot_last_top_match";
export const ATLAS_INTRO_SEEN_KEY = "homepilot_atlas_intro_seen";

/** Match % thresholds: green ≥75%, yellow 50–75%, red <50% */
export const MATCH_GREEN_MIN = 75;
export const MATCH_YELLOW_MIN = 50;
const TOP_MATCHES_QUEUE_MIN_PERCENT = 75;
const TOP_MATCHES_QUEUE_MAX_SIZE = 15;
const LAST_TOP_MATCHES_DATA_KEY = "homepilot_top_matches_data";

export interface LastTopMatchSnapshot {
  id: string;
  matchPercent: number;
  title: string;
  price: number;
  address: string;
  city: string;
  image: string;
  timeLeft: string;
}

interface TopMatchesData {
  queue: LastTopMatchSnapshot[];
  searchParams: string;
}

function getTopMatchesData(): TopMatchesData | null {
  try {
    const raw = localStorage.getItem(LAST_TOP_MATCHES_DATA_KEY);
    if (!raw) return null;
    return JSON.parse(raw) as TopMatchesData;
  } catch {
    return null;
  }
}

/** Queue of high matches (≥75%) for next-in-line on dashboard. */
export function getTopMatchesQueue(): LastTopMatchSnapshot[] {
  const data = getTopMatchesData();
  return data?.queue ?? [];
}

/** Query string for latest search (e.g. "location=Irvine&priority=cost&priorityValue=2000"). */
export function getLastSearchParams(): string | null {
  const data = getTopMatchesData();
  return data?.searchParams ?? null;
}

/** Save queue (only ≥75%, max 15) and last search params. */
export function setTopMatchesQueue(snapshots: LastTopMatchSnapshot[], searchParams: string): void {
  try {
    const queue = snapshots
      .filter((s) => s.matchPercent >= TOP_MATCHES_QUEUE_MIN_PERCENT)
      .slice(0, TOP_MATCHES_QUEUE_MAX_SIZE);
    localStorage.setItem(
      LAST_TOP_MATCHES_DATA_KEY,
      JSON.stringify({ queue, searchParams } as TopMatchesData)
    );
    // Keep legacy key in sync for any code still using it
    if (queue.length > 0) {
      localStorage.setItem(LAST_TOP_MATCH_KEY, JSON.stringify(queue[0]));
    }
  } catch {}
}

/** Remove first item from queue (call when user dismisses current match). */
export function removeFirstFromQueue(): void {
  const data = getTopMatchesData();
  if (!data?.queue?.length) return;
  const nextQueue = data.queue.slice(1);
  try {
    localStorage.setItem(
      LAST_TOP_MATCHES_DATA_KEY,
      JSON.stringify({ queue: nextQueue, searchParams: data.searchParams } as TopMatchesData)
    );
    if (nextQueue.length > 0) {
      localStorage.setItem(LAST_TOP_MATCH_KEY, JSON.stringify(nextQueue[0]));
    } else {
      localStorage.removeItem(LAST_TOP_MATCH_KEY);
    }
  } catch {}
}

/** First item in queue, or null. Kept for backward compatibility. */
export function getLastTopMatch(): LastTopMatchSnapshot | null {
  const queue = getTopMatchesQueue();
  return queue.length > 0 ? queue[0] : null;
}

/** @deprecated Use setTopMatchesQueue. Writes a single snapshot as a one-item queue. */
export function setLastTopMatch(snapshot: LastTopMatchSnapshot): void {
  setTopMatchesQueue([snapshot], getLastSearchParams() ?? "");
}
