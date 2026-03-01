import type { Profile, UserDocument } from "./supabase";

const GROQ_API_URL = "https://api.groq.com/openai/v1/chat/completions";
const MODEL = "llama-3.1-8b-instant";

interface ChatMessage {
  role: "system" | "user" | "assistant";
  content: string;
}

async function callGroq(messages: ChatMessage[], maxRetries = 2): Promise<string> {
  const apiKey = import.meta.env.VITE_GROQ_API_KEY;
  if (!apiKey) throw new Error("VITE_GROQ_API_KEY is not configured.");

  const delays = [1500, 3000];

  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    const res = await fetch(GROQ_API_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: MODEL,
        messages,
        temperature: 0.7,
        max_tokens: 2048,
      }),
    });

    if (res.status === 429 && attempt < maxRetries) {
      await new Promise((r) => setTimeout(r, delays[attempt]));
      continue;
    }

    if (!res.ok) {
      const body = await res.text().catch(() => "");
      throw new Error(`Groq API error (${res.status}): ${body}`);
    }

    const data = await res.json();
    return data.choices?.[0]?.message?.content ?? "";
  }

  throw new Error("Groq API rate limited after retries.");
}

function formatDate(): string {
  return new Date().toLocaleDateString("en-US", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });
}

function buildProfileContext(profile: Profile | null, documents: UserDocument[]): string {
  const lines: string[] = [];
  if (profile) {
    if (profile.first_name || profile.last_name)
      lines.push(`Full Name: ${profile.first_name ?? ""} ${profile.last_name ?? ""}`.trim());
    if (profile.email) lines.push(`Email: ${profile.email}`);
    if (profile.renter_score) lines.push(`Renter Score: ${profile.renter_score} out of 900`);
    if (profile.profile_completion) lines.push(`Profile Completion: ${profile.profile_completion}%`);
    if (profile.preferred_cities?.length)
      lines.push(`Preferred cities: ${profile.preferred_cities.join(", ")}`);
    if (profile.min_budget || profile.max_budget)
      lines.push(`Monthly budget range: $${profile.min_budget ?? "?"} - $${profile.max_budget ?? "?"}`);
    if (profile.preferred_beds) lines.push(`Looking for: ${profile.preferred_beds} bedroom(s)`);
    if (profile.preferred_baths) lines.push(`Bathrooms needed: ${profile.preferred_baths}`);
    if (profile.move_in_date) lines.push(`Desired move-in date: ${profile.move_in_date}`);
    if (profile.amenities?.length) lines.push(`Desired amenities: ${profile.amenities.join(", ")}`);
  }

  const verified = documents.filter((d) => d.status === "verified").map((d) => d.name);
  const pending = documents.filter((d) => d.status === "pending").map((d) => d.name);
  if (verified.length) lines.push(`Verified documents on file: ${verified.join(", ")}`);
  if (pending.length) lines.push(`Documents pending verification: ${pending.join(", ")}`);

  return lines.length ? lines.join("\n") : "No profile data available.";
}

/** Extract all [Bracketed Placeholders] from letter text */
export function extractPlaceholders(letter: string): string[] {
  const matches = letter.match(/\[([^\]]+)\]/g);
  if (!matches) return [];
  return [...new Set(matches)];
}

export async function generateCoverLetter(
  profile: Profile | null,
  documents: UserDocument[],
  landlordName?: string,
  propertyAddress?: string
): Promise<string> {
  const ctx = buildProfileContext(profile, documents);
  const today = formatDate();

  const system = `You are an expert rental application assistant. Write a professional, warm cover letter for a rental application.

RULES:
- The letter date MUST be: ${today}
- Keep it concise (250-350 words). Use proper letter formatting: date, greeting, body paragraphs, and closing.
- Use ALL the applicant data provided below to make the letter specific and compelling. Reference their renter score, verified documents, budget, preferred move-in date, etc. where relevant.
- Do NOT use bracket placeholders for information already provided in the applicant data. Only use brackets for truly missing personal details.
- If the landlord name is not provided, use [Landlord/Property Manager Name].
- If the property address is not provided, use [Property Address].

BRACKET PLACEHOLDER FORMAT:
When information is missing, use descriptive bracket placeholders that explain WHAT the value is and HOW it will be used in the letter. Be specific so the user understands why this information matters.

Good examples:
- [Your Phone Number — so the landlord can contact you directly]
- [Your Current Address — used as the return address on the letter]
- [Your Employer Name — to demonstrate stable employment]
- [Your Annual Salary — to show you can comfortably afford rent]
- [Number of Years Renting — to highlight your rental experience]
- [Your Move-In Date — to confirm availability for the landlord]
- [Your Occupation/Job Title — to present your professional background]

Bad examples (too vague):
- [Your Phone]
- [Address]
- [Number]
- [Info]

Always use the format: [Label — reason it's needed]. This helps the user understand exactly what to fill in and why.`;

  const user = `Write a rental cover letter using this applicant info:\n\n${ctx}${
    landlordName ? `\n\nLandlord/Property Manager: ${landlordName}` : ""
  }${propertyAddress ? `\nProperty Address: ${propertyAddress}` : ""}`;

  return callGroq([
    { role: "system", content: system },
    { role: "user", content: user },
  ]);
}

/** Context for listing-specific livability data used in tailored cover letters */
export interface LivabilityContext {
  crime_index: number;
  crime_description: string;
  rent_trend: string;
  rent_trend_description: string;
  competition_score: number;
  competition_label: string;
}

export async function generateTailoredCoverLetter(
  profile: Profile | null,
  documents: UserDocument[],
  propertyAddress: string,
  livabilityContext: LivabilityContext,
  atlasSuggestion: string,
  landlordName?: string
): Promise<string> {
  const ctx = buildProfileContext(profile, documents);
  const today = formatDate();

  const livabilityBlock = `
LIVABILITY DATA FOR THIS LISTING (use specific details in the letter to show you've researched the property):
- Property Address: ${propertyAddress}
- Crime Index: ${livabilityContext.crime_index}/100 — ${livabilityContext.crime_description}
- Rent Trend: ${livabilityContext.rent_trend} — ${livabilityContext.rent_trend_description}
- Competition: ${livabilityContext.competition_score}/100 — ${livabilityContext.competition_label}

ATLAS' AI INSIGHT (synthesize into your letter naturally):
${atlasSuggestion}
`;

  const system = `You are an expert rental application assistant. Write a professional, warm cover letter tailored to a SPECIFIC rental listing. The applicant has researched this property and you have livability data — USE IT.

RULES:
- The letter date MUST be: ${today}
- Keep it concise (250-350 words). Use proper letter formatting: date, greeting, body paragraphs, and closing.
- Use the EXACT property address: ${propertyAddress}. Reference it in the greeting or early in the letter.
- WEAVE IN SPECIFIC LIVABILITY DETAILS to praise the listing/landlord naturally. For example: "I appreciate the ${livabilityContext.crime_description.toLowerCase()} in this area and the ${livabilityContext.rent_trend.toLowerCase()} rent trend", "the ${livabilityContext.competition_label.toLowerCase()} aligns well with my timeline", etc. Make it clear you're writing about THIS property, not a generic one.
- Use ALL the applicant data provided below. Reference their renter score, verified documents, budget, etc.
- Incorporate themes from Atlas' insight where relevant — it summarizes why this listing is a good fit.
- Do NOT use bracket placeholders for the property address (it's provided). Use [Landlord/Property Manager Name] only if not provided.
- For other missing personal details, use descriptive bracket placeholders: [Label — reason it's needed].
- Be warm but professional. Show genuine interest in the specific property based on the data.`;

  const user = `Write a rental cover letter using this applicant info:\n\n${ctx}\n\n${livabilityBlock}${
    landlordName ? `\n\nLandlord/Property Manager: ${landlordName}` : ""
  }`;

  return callGroq([
    { role: "system", content: system },
    { role: "user", content: user },
  ]);
}

export interface ImprovementResult {
  improvedLetter: string;
  changes: string[];
}

export interface ListingDetails {
  landlordName?: string;
  propertyAddress?: string;
}

export async function improveCoverLetter(
  existingLetter: string,
  profile: Profile | null,
  documents: UserDocument[],
  listingDetails?: ListingDetails
): Promise<ImprovementResult> {
  const ctx = buildProfileContext(profile, documents);
  const today = formatDate();
  const hasLandlord = listingDetails?.landlordName?.trim();
  const hasAddress = listingDetails?.propertyAddress?.trim();

  const system = `You are an expert rental application assistant. Improve the provided cover letter to make it more professional, compelling, and tailored for rental applications.

RULES:
- Update the letter date to: ${today}
- PRESERVE the original letter's structure. Do NOT move the sender's name, email, or contact info to the top unless they were already at the top. Keep the same general layout (e.g. date, greeting, body, closing, signature block).
- Incorporate any applicant data provided below that isn't already in the letter. Weave it into the existing flow; do not add a new "header" block at the top with name/email.
- Do NOT use titles like Mr., Mrs., or Ms. in the greeting or anywhere; use the person's or company name only.
- If the user provides a landlord/property manager name or property address below, use them directly in the letter (in the greeting or where appropriate). Do NOT use placeholders for those.
- For personal/sensitive info the applicant must fill in themselves (phone, current address, employer, salary), keep or add descriptive bracket placeholders using the format: [Label — reason it's needed]. E.g. [Your Phone Number — so the landlord can contact you directly], [Your Annual Salary — to demonstrate you can afford the rent].
- Return your response as JSON with exactly this structure: { "improvedLetter": "the full improved letter text", "changes": ["change 1 description", "change 2 description", ...] }. Do NOT wrap the JSON in markdown code blocks.
- For "changes", list 3-5 short descriptions of what you did. Be specific and user-friendly, e.g.: "Made the tone more formal and professional", "Checked and corrected grammar, spelling, and punctuation", "Strengthened the opening to make a stronger first impression", "Tightened wording and removed redundancy", "Tailored phrases for a rental application". Use this style so the user sees clear, concrete improvements.`;

  let user = `Improve this rental cover letter:\n\n---\n${existingLetter}\n---\n\nApplicant context:\n${ctx}`;
  if (hasLandlord || hasAddress) {
    user += `\n\nUse these in the letter (do not use placeholders for these):`;
    if (hasLandlord) user += `\nLandlord/Property Manager name: ${listingDetails!.landlordName!.trim()}`;
    if (hasAddress) user += `\nProperty address: ${listingDetails!.propertyAddress!.trim()}`;
  }

  const raw = await callGroq([
    { role: "system", content: system },
    { role: "user", content: user },
  ]);

  /** Strip any JSON/artifact so the letter is plain text only. */
  function cleanLetter(s: string): string {
    let out = s.trim();
    out = out.replace(/\\n/g, "\n").replace(/\\"/g, '"');
    out = out.replace(/^\s*\{\s*"improvedLetter"\s*:\s*"\s*/i, "");
    out = out.replace(/"\s*,\s*"changes"\s*:[\s\S]*$/i, "");
    out = out.replace(/"\s*"changes"\s*:[\s\S]*$/i, "");
    out = out.replace(/"\s*\}\s*[\s\S]*$/i, "");
    out = out.replace(/"changes"\s*:[\s\S]*$/i, "");
    const tail = out.slice(-80);
    if (/"changes"\s*:|\s*"\s*\}\s*$/.test(tail)) {
      const ki = out.toLowerCase().lastIndexOf('"changes":');
      if (ki !== -1) {
        const before = out.slice(0, ki);
        const quoteBefore = before.lastIndexOf('"');
        if (quoteBefore !== -1) out = out.slice(0, quoteBefore);
      }
    }
    out = out.replace(/"\s*\}\s*$/i, "").replace(/"\s*$/i, "");
    return out.trim();
  }

  try {
    const cleaned = raw.replace(/```json\s*/g, "").replace(/```\s*/g, "").trim();
    const parsed = JSON.parse(cleaned);
    const letter = parsed.improvedLetter ?? raw;
    const letterStr = typeof letter === "string" ? letter : String(letter);
    return {
      improvedLetter: cleanLetter(letterStr),
      changes: Array.isArray(parsed.changes) ? parsed.changes : [],
    };
  } catch {
    return {
      improvedLetter: cleanLetter(raw),
      changes: ["General improvements applied"],
    };
  }
}

/** Generate 3 suggestion options for a given placeholder label */
export async function suggestPlaceholderOptions(
  placeholderLabel: string,
  letterContext: string
): Promise<string[]> {
  const system = `You suggest realistic fill-in values for a rental cover letter placeholder. The placeholder includes a description of what the value is for — use that context to generate highly relevant suggestions.

RULES:
- Return ONLY a JSON array of exactly 3 short, realistic suggestions. No explanation, no markdown, just the JSON array.
- Each suggestion should be a concrete, ready-to-use value (not a template or instruction).
- If the placeholder is about a number (years, amount, count), suggest realistic specific numbers with brief context. E.g. for years renting: ["3 years", "5 years", "7 years"].
- If the placeholder is about a name or title, suggest common realistic examples. E.g. for job title: ["Software Engineer", "Marketing Manager", "Registered Nurse"].
- If the placeholder is about a date, suggest realistic upcoming dates.
- Match the tone and specificity to how it will appear in the letter.

Example output: ["Option A", "Option B", "Option C"]`;

  const user = `The placeholder is: ${placeholderLabel}\n\nSurrounding letter context (first 500 chars):\n${letterContext.slice(0, 500)}`;

  const raw = await callGroq([
    { role: "system", content: system },
    { role: "user", content: user },
  ]);

  try {
    const cleaned = raw.replace(/```json\s*/g, "").replace(/```\s*/g, "").trim();
    const parsed = JSON.parse(cleaned);
    if (Array.isArray(parsed) && parsed.length >= 3) return parsed.slice(0, 3);
  } catch {
    // fallback
  }
  return [`Example ${placeholderLabel}`, `Sample ${placeholderLabel}`, `My ${placeholderLabel}`];
}

/** Input for generating a per-listing AI suggestion (competition, crime, rent trend, profile completion). */
export interface ListingSuggestionInput {
  competition_score: number;
  crime_index: number;
  rent_trend: string | null;
  match_percent: number;
  crime_description?: string | null;
  rent_trend_description?: string | null;
  address?: string | null;
}

/**
 * Generate one short AI suggestion for the listing detail card using competition, crime, rent trend,
 * and optional profile completion (application nudge when completion is low and competition high).
 * Returns null if Groq is not configured or the request fails.
 */
export async function generateListingSuggestion(
  listing: ListingSuggestionInput,
  profile: Profile | null
): Promise<string | null> {
  const apiKey = import.meta.env.VITE_GROQ_API_KEY;
  if (!apiKey) return null;

  const competition = listing.competition_score;
  const competitionLabel =
    competition >= 70 ? "High" : competition >= 40 ? "Medium" : "Low";
  const crimeDesc = listing.crime_description ?? `Crime index ${listing.crime_index}/100`;
  const rentTrend = listing.rent_trend?.trim() || "Stable";
  const rentTrendDesc = listing.rent_trend_description ?? (rentTrend !== "Stable" ? "See trend" : "Prices stable or moderate");
  const profileCompletion = profile?.profile_completion ?? 0;
  const matchPercent = listing.match_percent;
  const budget =
    profile?.min_budget != null || profile?.max_budget != null
      ? `$${profile.min_budget ?? "?"}-${profile.max_budget ?? "?"}/mo`
      : null;
  const beds = profile?.preferred_beds != null ? `${profile.preferred_beds} bed(s)` : null;
  const baths = profile?.preferred_baths != null ? `${profile.preferred_baths} bath(s)` : null;
  const priorities = [budget, beds, baths].filter(Boolean).join("; ") || "Not specified";

  const system = `You are Atlas, a rental assistant. Give the renter 2-3 short, punchy suggestions about this listing. Be warm and direct.

Your response MUST explicitly mention these data points so the user sees we're using their real data:
1) Profile completion (from Optimize tab): ${profileCompletion}%
2) Crime index (from Livability Analysis): ${listing.crime_index}/100
3) Rent trend (from Livability Analysis): "${rentTrend}"
4) Competition (from Livability Analysis): ${competition}/100 (${competitionLabel})
5) Priority match (how well listing fits their budget/beds/baths): ${matchPercent}%
6) Their priorities: ${priorities}

Use ONLY these exact numbers. Do NOT invent or substitute. Weave 3-4 of them into your suggestions naturally so the user knows we processed their data. Example: "With your ${profileCompletion}% profile and ${matchPercent}% priority match, this listing's crime index (${listing.crime_index}/100) and ${competitionLabel} competition make it worth considering." Style: safe pick, highest priority, worth applying, etc. Max 65 words.`;

  const user = `Write 2-3 suggestion lines. Use these exact values:
- profile_completion: ${profileCompletion}% (Optimize tab)
- crime_index: ${listing.crime_index}/100 (Livability Analysis)
- rent_trend: "${rentTrend}" (Livability Analysis)
- competition: ${competition}/100 ${competitionLabel} (Livability Analysis)
- priority_match: ${matchPercent}% (based on their budget/beds/baths)
- priorities: ${priorities}

Mention at least 3-4 of these in your response to prove we're processing their data.`;

  try {
    const raw = await callGroq(
      [
        { role: "system", content: system },
        { role: "user", content: user },
      ],
      2
    );
    const line = raw.trim().replace(/^["']|["']$/g, "").slice(0, 520);
    return line || null;
  } catch {
    return null;
  }
}

/** Input for pre-apply tips (shown when user clicks View on Zillow). */
export interface PreApplyTipsInput {
  source: "zillow" | "apartments" | string;
  competition_score: number;
  crime_index: number;
  rent_trend: string | null;
  match_percent: number;
  profile_completion: number;
  crime_description?: string | null;
  rent_trend_description?: string | null;
  uncompleted_suggestions: { action: string; impact: number }[];
}

/**
 * Generate 3-5 short pre-apply tips using listing data (competition, crime, rent trend, match %),
 * profile completion, uncompleted Optimize suggestions, and Zillow/scam tips.
 */
export async function generatePreApplyTips(input: PreApplyTipsInput): Promise<string[] | null> {
  const apiKey = import.meta.env.VITE_GROQ_API_KEY;
  if (!apiKey) return null;

  const sourceLabel = input.source === "apartments" ? "Apartments.com" : "Zillow";
  const uncompleted = input.uncompleted_suggestions
    .slice(0, 2)
    .map((s) => `${s.action} (impact +${s.impact}%)`)
    .join("; ");
  const competitionLabel =
    input.competition_score >= 70 ? "High" : input.competition_score >= 40 ? "Medium" : "Low";

  const system = `You are Atlas, a rental assistant. The user is about to apply on ${sourceLabel}. Give 3-5 varied, practical bullets (one line each).

CRITICAL: Use ONLY the exact numbers and facts provided below. Do NOT invent data. Reference the actual competition (X/100), crime index (X/100), rent trend, match %. E.g. "With ${input.competition_score}/100 competition, apply soon" — use the real number.
Profile/optimize suggestions: ONLY if explicitly provided. Use the EXACT action text. Do NOT invent (no profile picture, no generic "complete your profile" unless in the list).

Tailor tips to THIS listing's data:
- Competition ${input.competition_score}/100 (${competitionLabel}) → e.g. "Competition is ${competitionLabel} (${input.competition_score}/100) — apply soon if interested."
- Crime index ${input.crime_index}/100 → safety/verification tips if relevant
- Rent trend "${input.rent_trend || "Stable"}" → e.g. mention if rising (lock in) or stable
- Match ${input.match_percent}% → brief note if strong match
- Platform: ${sourceLabel} — docs to have ready, fees, flow

Also include: verify listing/landlord, never wire before viewing, pay stubs/ID. Each bullet max 22 words. No preamble. Return ONLY the bullet list, one per line.`;

  const user = `FACTS — use these exact values only:
- competition_score: ${input.competition_score}/100 (${competitionLabel})
- crime_index: ${input.crime_index}/100 (${input.crime_description ?? "see value"})
- rent_trend: "${input.rent_trend || "Stable"}" (${input.rent_trend_description ?? "—"})
- match_percent: ${input.match_percent}%
- profile_completion: ${input.profile_completion}%
- platform: ${sourceLabel}
- uncompleted_suggestions: ${uncompleted || "None — do not mention profile tips"}

Output 3-5 bullets that reference these numbers. E.g. "With ${input.competition_score}% competition, apply soon." or "Crime index ${input.crime_index}/100 — verify the area before committing."`;

  try {
    const raw = await callGroq(
      [
        { role: "system", content: system },
        { role: "user", content: user },
      ],
      2
    );
    const lines = raw
      .trim()
      .split("\n")
      .map((s) => s.replace(/^[-*•]\s*/, "").trim())
      .filter(Boolean)
      .slice(0, 5);
    return lines.length >= 3 ? lines : null;
  } catch {
    return null;
  }
}
