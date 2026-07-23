import { normalizeLevel } from "@/lib/normalize-risk";
import type { Scraper, RawAdvisory } from "./types";

const LEVEL_MAP: Record<number, string> = {
  1: "Exercise normal safety precautions",
  2: "Exercise a high degree of caution",
  3: "Reconsider your need to travel",
  4: "Do not travel",
};


interface SmartravellerAdvisory {
  iso2: string;
  level: number;
  levelLabel: string;
  lastUpdated: string;
  summary: string;
  url: string;
}


async function fetchStaticSupplements(): Promise<RawAdvisory[]> {
  try {
    const url = "https://raw.githubusercontent.com/MvdB-123/vibe/main/travel-advice/data/australia-advisories.json";
    const res = await fetch(url, { signal: AbortSignal.timeout(10_000) });
    if (!res.ok) return [];
    const data: Array<{ iso2: string; level: number; summary?: string; url?: string; updatedAt?: string }> = await res.json();
    return data.flatMap((entry) => {
      const rawLevel = LEVEL_MAP[entry.level];
      if (!rawLevel) return [];
      return [{
        destIso2: entry.iso2,
        rawLevel,
        normalizedLevel: normalizeLevel("australia", rawLevel),
        summary: entry.summary ?? rawLevel,
        risks: [],
        officialUpdatedAt: entry.updatedAt ? new Date(entry.updatedAt) : null,
        sourceUrl: entry.url ?? "https://www.smartraveller.gov.au/destinations",
      }];
    });
  } catch {
    return [];
  }
}

export const australiaScraper: Scraper = async () => {
  const scrapedAt = new Date();

  // Strategy 1: Smartraveller JSON API
  try {
    const res = await fetch("https://www.smartraveller.gov.au/api/advisories", {
      signal: AbortSignal.timeout(30_000),
    });
    if (res.ok) {
      const data: SmartravellerAdvisory[] = await res.json();
      if (Array.isArray(data) && data.length > 10) {
        const advisories: RawAdvisory[] = [];
        for (const dest of data) {
          const iso2 = (dest.iso2 ?? "").toUpperCase();
          if (!iso2) continue;
          const rawLevel = LEVEL_MAP[dest.level];
          if (!rawLevel) continue;
          advisories.push({
            destIso2: iso2,
            rawLevel,
            normalizedLevel: normalizeLevel("australia", rawLevel),
            summary: (dest.summary ?? "").replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim().slice(0, 1500),
            risks: [],
            officialUpdatedAt: dest.lastUpdated ? new Date(dest.lastUpdated) : null,
            sourceUrl: dest.url ? `https://www.smartraveller.gov.au${dest.url}` : "https://www.smartraveller.gov.au/destinations",
          });
        }
        if (advisories.length > 0) {
          // Merge static supplement entries (overrides) for countries with compound zone data
          const staticAdvisories = await fetchStaticSupplements();
          for (const s of staticAdvisories) {
            const idx = advisories.findIndex((a) => a.destIso2 === s.destIso2);
            if (idx >= 0) {
              advisories[idx] = s; // supplement overrides API entry
            } else {
              advisories.push(s);
            }
          }
          return { sourceId: "australia", advisories, scrapedAt };
        }
      }
    }
  } catch { /* fall through to static fallback */ }

  // Strategy 2: Use static fallback data from repo (populated manually or via local script)
  const fallbackAdvisories = await fetchStaticSupplements();
  if (fallbackAdvisories.length > 0) {
    return { sourceId: "australia", advisories: fallbackAdvisories, scrapedAt, error: "Using static fallback data" };
  }

  return { sourceId: "australia", advisories: [], scrapedAt, error: "Smartraveller API unavailable and no static fallback" };
};
