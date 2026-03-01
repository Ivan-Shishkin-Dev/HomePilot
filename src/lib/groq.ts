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

export interface ImprovementResult {
  improvedLetter: string;
  changes: string[];
}

export async function improveCoverLetter(
  existingLetter: string,
  profile: Profile | null,
  documents: UserDocument[]
): Promise<ImprovementResult> {
  const ctx = buildProfileContext(profile, documents);
  const today = formatDate();

  const system = `You are an expert rental application assistant. Improve the provided cover letter to make it more professional, compelling, and tailored for rental applications.

RULES:
- Update the letter date to: ${today}
- Incorporate any applicant data provided below that isn't already in the letter.
- For personal/sensitive info the applicant must fill in themselves (phone, current address, employer, salary), keep or add descriptive bracket placeholders using the format: [Label — reason it's needed]. E.g. [Your Phone Number — so the landlord can contact you directly], [Your Annual Salary — to demonstrate you can afford the rent].
- Return your response as JSON with exactly this structure: { "improvedLetter": "the full improved letter text", "changes": ["change 1 description", "change 2 description", ...] }. List 3-5 specific changes you made. Do NOT wrap the JSON in markdown code blocks.`;

  const user = `Improve this rental cover letter:\n\n---\n${existingLetter}\n---\n\nApplicant context:\n${ctx}`;

  const raw = await callGroq([
    { role: "system", content: system },
    { role: "user", content: user },
  ]);

  try {
    const cleaned = raw.replace(/```json\s*/g, "").replace(/```\s*/g, "").trim();
    const parsed = JSON.parse(cleaned);
    return {
      improvedLetter: parsed.improvedLetter || raw,
      changes: Array.isArray(parsed.changes) ? parsed.changes : [],
    };
  } catch {
    return { improvedLetter: raw, changes: ["General improvements applied"] };
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
