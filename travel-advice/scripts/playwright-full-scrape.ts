#!/usr/bin/env npx tsx
/**
 * Full Playwright + Mistral scraper for Germany, Sweden and Denmark.
 *
 * For each source, visits every country's official advisory page with a real
 * Chromium browser (handles JS-rendered pages and bypasses IP blocks), extracts
 * the page text and calls Mistral AI to determine:
 *   - Advisory level (from a fixed vocabulary per source)
 *   - Summary in the source language
 *   - Last-updated date
 *
 * Results are written directly to the database via Prisma — no Vercel hop needed.
 * Denmark: pages that don't exist are silently skipped (no advisory shown).
 *
 * Usage (from travel-advice/):
 *   npx tsx scripts/playwright-full-scrape.ts [source...]
 *   npx tsx scripts/playwright-full-scrape.ts              # all three
 *   npx tsx scripts/playwright-full-scrape.ts sweden germany
 *
 * Requires: MISTRAL_API_KEY, DATABASE_URL in environment.
 * Playwright + Chromium must be installed before running.
 */

import * as path from "path";
import { normalizeLevel } from "../src/lib/normalize-risk";

const MISTRAL_API_KEY = process.env.MISTRAL_API_KEY;
const DATABASE_URL = process.env.DATABASE_URL;
if (!MISTRAL_API_KEY) { console.error("MISTRAL_API_KEY not set"); process.exit(1); }
if (!DATABASE_URL) { console.error("DATABASE_URL not set"); process.exit(1); }

const CONCURRENCY = 4;

// ─── Source definitions ────────────────────────────────────────────────────────

interface SourceDef {
  id: string;
  language: string;
  levels: string[];
  getCountries: () => Promise<Array<{ iso2: string; url: string }>>;
  isPageMissing?: (text: string) => boolean;
}

// Germany: fetch country list + URLs from the opendata API
const GERMANY_KNOWN_URLS: Record<string, string> = {
  AE: "https://www.auswaertiges-amt.de/de/reiseundsicherheit/vereinigtearabischeemiratesicherheit-202332",
  IL: "https://www.auswaertiges-amt.de/de/reiseundsicherheit/israelsicherheit-203814",
  RU: "https://www.auswaertiges-amt.de/de/reiseundsicherheit/russischefoedsicherheit-201536",
  UA: "https://www.auswaertiges-amt.de/de/reiseundsicherheit/ukrainesicherheit-201946",
  CN: "https://www.auswaertiges-amt.de/de/reiseundsicherheit/chinasicherheit-200466",
  IR: "https://www.auswaertiges-amt.de/de/reiseundsicherheit/iransicherheit-202396",
  IQ: "https://www.auswaertiges-amt.de/de/reiseundsicherheit/iraksicherheit-202738",
  SY: "https://www.auswaertiges-amt.de/de/reiseundsicherheit/syriensicherheit-204278",
  AF: "https://www.auswaertiges-amt.de/de/reiseundsicherheit/afghanistansicherheit-204692",
  TH: "https://www.auswaertiges-amt.de/de/service/laender/thailand-node/thailandsicherheit-201558",
  TR: "https://www.auswaertiges-amt.de/de/service/laender/tuerkei-node/tuerkeisicherheit-201962",
  ID: "https://www.auswaertiges-amt.de/de/service/laender/indonesien-node/indonesiensicherheit-212396",
  EG: "https://www.auswaertiges-amt.de/de/service/laender/aegypten-node/aegyptensicherheit-212622",
  SA: "https://www.auswaertiges-amt.de/de/service/laender/saudi-arabien-node/saudiarabiensicherheit-204690",
  PK: "https://www.auswaertiges-amt.de/de/service/laender/pakistan-node/pakistansicherheit-204974",
  MM: "https://www.auswaertiges-amt.de/de/service/laender/myanmar-node/myanmarsicherheit-206974",
  LY: "https://www.auswaertiges-amt.de/de/service/laender/libyen-node/libyensicherheit-202126",
  SD: "https://www.auswaertiges-amt.de/de/service/laender/sudan-node/sudansicherheit-205902",
  SS: "https://www.auswaertiges-amt.de/de/service/laender/suedsudan-node/suedsudansicherheit-217166",
  SO: "https://www.auswaertiges-amt.de/de/service/laender/somalia-node/somaliasicherheit-204916",
  YE: "https://www.auswaertiges-amt.de/de/service/laender/jemen-node/jemensicherheit-202836",
  ML: "https://www.auswaertiges-amt.de/de/service/laender/mali-node/malisicherheit-205842",
  NE: "https://www.auswaertiges-amt.de/de/service/laender/niger-node/nigersicherheit-218692",
  NG: "https://www.auswaertiges-amt.de/de/service/laender/nigeria-node/nigeriasicherheit-205774",
  CD: "https://www.auswaertiges-amt.de/de/service/laender/kongo-demokratische-republik-node/kongodrsicherheit-201300",
  CF: "https://www.auswaertiges-amt.de/de/service/laender/zentralafrikanischerepublik-node/zentralafrikanischerepubliksicherheit-218674",
  LB: "https://www.auswaertiges-amt.de/de/service/laender/libanon-node/libanonsicherheit-204498",
  QA: "https://www.auswaertiges-amt.de/de/service/laender/katar-node/katarsicherheit-202280",
  MX: "https://www.auswaertiges-amt.de/de/service/laender/mexiko-node/mexikosicherheit-200938",
  CO: "https://www.auswaertiges-amt.de/de/service/laender/kolumbien-node/kolumbiensicherheit-201108",
  VE: "https://www.auswaertiges-amt.de/de/service/laender/venezuela-node/venezuelasicherheit-201218",
};

async function getGermanyCountries(): Promise<Array<{ iso2: string; url: string }>> {
  try {
    const res = await fetch("https://www.auswaertiges-amt.de/opendata/travelwarning", {
      headers: { Accept: "application/json" },
      signal: AbortSignal.timeout(30_000),
    });
    if (!res.ok) throw new Error(`API ${res.status}`);
    const json = await res.json() as { response: Record<string, { countryCode?: string; reportUrl?: string; countryName?: string }> };
    const entries = Object.values(json.response ?? {}).filter(
      (v): v is NonNullable<typeof v> => typeof v === "object" && v !== null && "countryCode" in v
    );

    return entries
      .map((c) => {
        const iso2 = (c.countryCode ?? "").toUpperCase();
        if (!iso2 || iso2.length !== 2) return null;
        const url = GERMANY_KNOWN_URLS[iso2] ?? c.reportUrl ?? null;
        if (!url) return null;
        return { iso2, url };
      })
      .filter((x): x is { iso2: string; url: string } => x !== null);
  } catch (err) {
    console.error("Failed to fetch Germany country list:", err);
    return Object.entries(GERMANY_KNOWN_URLS).map(([iso2, url]) => ({ iso2, url }));
  }
}

// Sweden: build URLs from slug map
const SWEDEN_SLUGS: Record<string, string> = {
  "AF": "afghanistan", "AL": "albanien", "DZ": "algeriet", "AO": "angola",
  "AR": "argentina", "AM": "armenien", "AU": "australien", "AZ": "azerbajdzjan",
  "BH": "bahrain", "BD": "bangladesh", "BE": "belgien", "BZ": "belize",
  "BJ": "benin", "BT": "bhutan", "BO": "bolivia", "BA": "bosnien-hercegovina",
  "BW": "botswana", "BR": "brasilien", "BN": "brunei", "BG": "bulgarien",
  "BF": "burkina-faso", "BI": "burundi", "KH": "kambodja", "CM": "kamerun",
  "CA": "kanada", "CV": "kap-verde", "CL": "chile", "CN": "kina",
  "CO": "colombia", "CG": "kongo-brazzaville", "CD": "kongo-kinshasa",
  "CR": "costa-rica", "CI": "elfenbenskusten", "HR": "kroatien", "CU": "kuba",
  "CY": "cypern", "CZ": "tjeckien", "DJ": "djibouti", "DM": "dominica",
  "DO": "dominikanska-republiken", "EC": "ecuador", "EG": "egypten",
  "SV": "el-salvador", "ER": "eritrea", "EE": "estland", "ET": "etiopien",
  "FJ": "fiji", "FI": "finland", "FR": "frankrike", "GA": "gabon",
  "GE": "georgien", "GH": "ghana", "GR": "grekland", "GT": "guatemala",
  "GN": "guinea", "GW": "guinea-bissau", "GY": "guyana", "HT": "haiti",
  "HN": "honduras", "HU": "ungern", "IN": "indien", "ID": "indonesien",
  "IQ": "irak", "IR": "iran", "IE": "irland", "IL": "israel",
  "IT": "italien", "JM": "jamaica", "JP": "japan", "JO": "jordanien",
  "KZ": "kazakstan", "KE": "kenya", "KG": "kirgizistan", "KW": "kuwait",
  "LA": "laos", "LV": "lettland", "LB": "libanon", "LR": "liberia",
  "LY": "libyen", "LT": "litauen", "LU": "luxemburg", "MG": "madagaskar",
  "MW": "malawi", "MY": "malaysia", "MV": "maldiverna", "ML": "mali",
  "MT": "malta", "MA": "marocko", "MR": "mauretanien", "MU": "mauritius",
  "MX": "mexiko", "MD": "moldavien", "MN": "mongoliet", "ME": "montenegro",
  "MZ": "moçambique", "MM": "myanmar", "NA": "namibia", "NP": "nepal",
  "NZ": "nya-zeeland", "NI": "nicaragua", "NE": "niger", "NG": "nigeria",
  "KP": "nordkorea", "MK": "nordmakedonien", "NO": "norge", "OM": "oman",
  "PK": "pakistan", "PA": "panama", "PG": "papua-nya-guinea", "PY": "paraguay",
  "PE": "peru", "PH": "filippinerna", "PL": "polen", "PT": "portugal",
  "QA": "qatar", "RO": "rumänien", "RU": "ryssland", "RW": "rwanda",
  "SA": "saudiarabien", "SN": "senegal", "RS": "serbien", "SL": "sierra-leone",
  "SG": "singapore", "SK": "slovakien", "SI": "slovenien", "SO": "somalia",
  "ZA": "sydafrika", "KR": "sydkorea", "SS": "sydsudan", "ES": "spanien",
  "LK": "sri-lanka", "SD": "sudan", "SR": "surinam", "CH": "schweiz",
  "SY": "syrien", "TJ": "tadzjikistan", "TW": "taiwan", "TZ": "tanzania",
  "TH": "thailand", "TG": "togo", "TO": "tonga", "TT": "trinidad-och-tobago",
  "TN": "tunisien", "TM": "turkmenistan", "TR": "turkiet", "UG": "uganda",
  "UA": "ukraina", "AE": "förenade-arabemiraten", "US": "usa", "UY": "uruguay",
  "UZ": "uzbekistan", "VU": "vanuatu", "VE": "venezuela", "VN": "vietnam",
  "YE": "jemen", "ZM": "zambia", "ZW": "zimbabwe",
};

function getSwedenCountries(): Array<{ iso2: string; url: string }> {
  return Object.entries(SWEDEN_SLUGS).map(([iso2, slug]) => ({
    iso2,
    url: `https://www.swedenabroad.se/sv/om-utlandet-f%C3%B6r-svenska-medborgare/${encodeURIComponent(slug)}/reseinformation/ambassadens-reseinformation/`,
  }));
}

// Australia: build URLs from slug map
const AUSTRALIA_SLUGS: Record<string, string> = {
  AF:"asia/afghanistan",AL:"europe/albania",DZ:"africa/algeria",AO:"africa/angola",
  AR:"americas/argentina",AM:"europe/armenia",AT:"europe/austria",AZ:"europe/azerbaijan",
  BH:"middle-east/bahrain",BD:"asia/bangladesh",BB:"americas/barbados",BY:"europe/belarus",
  BE:"europe/belgium",BZ:"americas/belize",BJ:"africa/benin",BT:"asia/bhutan",
  BO:"americas/bolivia",BA:"europe/bosnia-and-herzegovina",BW:"africa/botswana",BR:"americas/brazil",
  BN:"asia/brunei",BG:"europe/bulgaria",BF:"africa/burkina-faso",BI:"africa/burundi",
  CV:"africa/cabo-verde",KH:"asia/cambodia",CM:"africa/cameroon",CA:"americas/canada",
  CF:"africa/central-african-republic",TD:"africa/chad",CL:"americas/chile",CN:"asia/china",
  CO:"americas/colombia",KM:"africa/comoros",CD:"africa/democratic-republic-of-the-congo",
  CG:"africa/republic-of-the-congo",CR:"americas/costa-rica",CI:"africa/cote-divoire",
  HR:"europe/croatia",CU:"americas/cuba",CY:"europe/cyprus",CZ:"europe/czech-republic",
  DK:"europe/denmark",DJ:"africa/djibouti",DM:"americas/dominica",DO:"americas/dominican-republic",
  EC:"americas/ecuador",EG:"middle-east/egypt",SV:"americas/el-salvador",GQ:"africa/equatorial-guinea",
  ER:"africa/eritrea",EE:"europe/estonia",SZ:"africa/eswatini",ET:"africa/ethiopia",
  FJ:"pacific/fiji",FI:"europe/finland",FR:"europe/france",GA:"africa/gabon",
  GM:"africa/gambia",GE:"europe/georgia",DE:"europe/germany",GH:"africa/ghana",
  GR:"europe/greece",GD:"americas/grenada",GT:"americas/guatemala",GN:"africa/guinea",
  GW:"africa/guinea-bissau",GY:"americas/guyana",HT:"americas/haiti",HN:"americas/honduras",
  HU:"europe/hungary",IS:"europe/iceland",IN:"asia/india",ID:"asia/indonesia",
  IR:"middle-east/iran",IQ:"middle-east/iraq",IE:"europe/ireland",IL:"middle-east/israel",
  IT:"europe/italy",JM:"americas/jamaica",JP:"asia/japan",JO:"middle-east/jordan",
  KZ:"asia/kazakhstan",KE:"africa/kenya",KI:"pacific/kiribati",KP:"asia/north-korea",
  KR:"asia/south-korea",XK:"europe/kosovo",KW:"middle-east/kuwait",KG:"asia/kyrgyzstan",
  LA:"asia/laos",LV:"europe/latvia",LB:"middle-east/lebanon",LS:"africa/lesotho",
  LR:"africa/liberia",LY:"middle-east/libya",LI:"europe/liechtenstein",LT:"europe/lithuania",
  LU:"europe/luxembourg",MG:"africa/madagascar",MW:"africa/malawi",MY:"asia/malaysia",
  MV:"asia/maldives",ML:"africa/mali",MT:"europe/malta",MH:"pacific/marshall-islands",
  MR:"africa/mauritania",MU:"africa/mauritius",MX:"americas/mexico",FM:"pacific/micronesia",
  MD:"europe/moldova",MC:"europe/monaco",MN:"asia/mongolia",ME:"europe/montenegro",
  MA:"africa/morocco",MZ:"africa/mozambique",MM:"asia/myanmar",NA:"africa/namibia",
  NR:"pacific/nauru",NP:"asia/nepal",NL:"europe/netherlands",NZ:"pacific/new-zealand",
  NI:"americas/nicaragua",NE:"africa/niger",NG:"africa/nigeria",MK:"europe/north-macedonia",
  NO:"europe/norway",OM:"middle-east/oman",PK:"asia/pakistan",PW:"pacific/palau",
  PS:"middle-east/palestinian-territories",PA:"americas/panama",PG:"pacific/papua-new-guinea",
  PY:"americas/paraguay",PE:"americas/peru",PH:"asia/philippines",PL:"europe/poland",
  PT:"europe/portugal",QA:"middle-east/qatar",RO:"europe/romania",RU:"europe/russia",
  RW:"africa/rwanda",KN:"americas/saint-kitts-and-nevis",LC:"americas/saint-lucia",
  VC:"americas/saint-vincent-and-the-grenadines",WS:"pacific/samoa",ST:"africa/sao-tome-and-principe",
  SA:"middle-east/saudi-arabia",SN:"africa/senegal",RS:"europe/serbia",SC:"africa/seychelles",
  SL:"africa/sierra-leone",SG:"asia/singapore",SK:"europe/slovakia",SI:"europe/slovenia",
  SB:"pacific/solomon-islands",SO:"africa/somalia",ZA:"africa/south-africa",SS:"africa/south-sudan",
  ES:"europe/spain",LK:"asia/sri-lanka",SD:"africa/sudan",SR:"americas/suriname",
  SE:"europe/sweden",CH:"europe/switzerland",SY:"middle-east/syria",TW:"asia/taiwan",
  TJ:"asia/tajikistan",TZ:"africa/tanzania",TH:"asia/thailand",TL:"asia/timor-leste",
  TG:"africa/togo",TO:"pacific/tonga",TT:"americas/trinidad-and-tobago",TN:"africa/tunisia",
  TR:"middle-east/turkiye",TM:"asia/turkmenistan",TV:"pacific/tuvalu",UG:"africa/uganda",
  UA:"europe/ukraine",AE:"middle-east/united-arab-emirates",GB:"europe/united-kingdom",
  US:"americas/united-states-of-america",UY:"americas/uruguay",UZ:"asia/uzbekistan",
  VU:"pacific/vanuatu",VE:"americas/venezuela",VN:"asia/vietnam",YE:"middle-east/yemen",
  ZM:"africa/zambia",ZW:"africa/zimbabwe",
};

const AUSTRALIA_NO_ADVISORY_PATTERNS = [
  /page not found/i,
  /404/,
  /we couldn't find/i,
  /no travel advice/i,
];

function getAustraliaCountries(): Array<{ iso2: string; url: string }> {
  return Object.entries(AUSTRALIA_SLUGS).map(([iso2, slug]) => ({
    iso2,
    url: `https://www.smartraveller.gov.au/destinations/${slug}`,
  }));
}

// Denmark: build URLs from slug map; pages that don't exist are silently skipped
const DENMARK_SLUGS: Record<string, string> = {
  "AF": "afghanistan", "AL": "albanien", "DZ": "algeriet", "AO": "angola",
  "AR": "argentina", "AM": "armenien", "AU": "australien", "AZ": "azerbajdsjan",
  "BH": "bahrain", "BD": "bangladesh", "BE": "belgien", "BZ": "belize",
  "BJ": "benin", "BT": "bhutan", "BO": "bolivia", "BA": "bosnien-hercegovina",
  "BW": "botswana", "BR": "brasilien", "BN": "brunei", "BG": "bulgarien",
  "BF": "burkina-faso", "BI": "burundi", "KH": "cambodja", "CM": "cameroun",
  "CA": "canada", "CV": "cape-verde", "CL": "chile", "CN": "kina",
  "CO": "colombia", "CG": "congo-brazzaville", "CD": "congo-kinshasa",
  "CR": "costa-rica", "CI": "cote-divoire", "HR": "kroatien", "CU": "cuba",
  "CY": "cypern", "CZ": "tjekkiet", "DJ": "djibouti",
  "DO": "den-dominikanske-republik", "EC": "ecuador", "EG": "egypten",
  "SV": "el-salvador", "ER": "eritrea", "EE": "estland", "ET": "etiopien",
  "FJ": "fiji", "FI": "finland", "FR": "frankrig", "GA": "gabon",
  "GE": "georgien", "GH": "ghana", "GR": "graekenland", "GT": "guatemala",
  "GN": "guinea", "GW": "guinea-bissau", "GY": "guyana", "HT": "haiti",
  "HN": "honduras", "HU": "ungarn", "IN": "indien", "ID": "indonesien",
  "IQ": "irak", "IR": "iran", "IE": "irland", "IL": "israel",
  "IT": "italien", "JM": "jamaica", "JP": "japan", "JO": "jordan",
  "KZ": "kasakhstan", "KE": "kenya", "KG": "kirgisistan", "KW": "kuwait",
  "LA": "laos", "LV": "letland", "LB": "libanon", "LR": "liberia",
  "LY": "libyen", "LT": "litauen", "LU": "luxembourg", "MG": "madagascar",
  "MW": "malawi", "MY": "malaysia", "MV": "maldiverne", "ML": "mali",
  "MT": "malta", "MA": "marokko", "MR": "mauritanien", "MU": "mauritius",
  "MX": "mexico", "MD": "moldova", "MN": "mongoliet", "ME": "montenegro",
  "MZ": "mozambique", "MM": "myanmar", "NA": "namibia", "NP": "nepal",
  "NZ": "new-zealand", "NI": "nicaragua", "NE": "niger", "NG": "nigeria",
  "KP": "nordkorea", "MK": "nordmakedonien", "NO": "norge", "OM": "oman",
  "PK": "pakistan", "PA": "panama", "PG": "papua-new-guinea", "PY": "paraguay",
  "PE": "peru", "PH": "filippinerne", "PL": "polen", "PT": "portugal",
  "QA": "qatar", "RO": "roemien", "RU": "rusland", "RW": "rwanda",
  "SA": "saudi-arabien", "SN": "senegal", "RS": "serbien", "SL": "sierra-leone",
  "SG": "singapore", "SK": "slovakiet", "SI": "slovenien", "SO": "somalia",
  "ZA": "sydafrika", "KR": "sydkorea", "SS": "sydsudan", "ES": "spanien",
  "LK": "sri-lanka", "SD": "sudan", "SR": "surinam", "CH": "schweiz",
  "SY": "syrien", "TJ": "tadsjikistan", "TW": "taiwan", "TZ": "tanzania",
  "TH": "thailand", "TG": "togo", "TT": "trinidad-og-tobago",
  "TN": "tunesien", "TM": "turkmenistan", "TR": "tyrkiet", "UG": "uganda",
  "UA": "ukraine", "AE": "forenede-arabiske-emirater", "US": "usa",
  "UY": "uruguay", "UZ": "usbekistan", "VE": "venezuela", "VN": "vietnam",
  "YE": "yemen", "ZM": "zambia", "ZW": "zimbabwe",
};

const DENMARK_NO_ADVISORY_PATTERNS = [
  /vi har ingen rejsevejledning/i,
  /ingen rejsevejledning for/i,
  /der er ikke udarbejdet.*rejsevejledning/i,
  /siden blev ikke fundet/i,
  /404/,
];

function getDenmarkCountries(): Array<{ iso2: string; url: string }> {
  return Object.entries(DENMARK_SLUGS).map(([iso2, slug]) => ({
    iso2,
    url: `https://um.dk/rejse-og-ophold/rejse-til-udlandet/rejsevejledninger/${slug}`,
  }));
}

// ─── Source configs ────────────────────────────────────────────────────────────

const SOURCES: Record<string, SourceDef> = {
  australia: {
    id: "australia",
    language: "English",
    levels: ["Do not travel", "Reconsider your need to travel", "Exercise a high degree of caution", "Exercise normal safety precautions"],
    getCountries: async () => getAustraliaCountries(),
    isPageMissing: (text: string) =>
      text.length < 300 || AUSTRALIA_NO_ADVISORY_PATTERNS.some((p) => p.test(text)),
  },
  germany: {
    id: "germany",
    language: "German",
    levels: ["Reisewarnung", "Teilreisewarnung", "Von nicht notwendigen Reisen abraten", "Erhöhte Vorsicht", "Keine besonderen Sicherheitshinweise"],
    getCountries: getGermanyCountries,
  },
  sweden: {
    id: "sweden",
    language: "Swedish",
    levels: ["Avrådan från alla resor", "Avrådan från icke nödvändiga resor", "Var extra uppmärksam", "Inga särskilda restriktioner", "Borttagen avrådan"],
    getCountries: async () => getSwedenCountries(),
  },
  denmark: {
    id: "denmark",
    language: "Danish",
    levels: ["Rejse frårådes", "Fråråd ikke-nødvendige rejser", "Vær ekstra opmærksom", "Vær forsigtig", "Vær opmærksom", "Ingen særlige advarsler"],
    getCountries: async () => getDenmarkCountries(),
    isPageMissing: (text: string) =>
      text.length < 400 || DENMARK_NO_ADVISORY_PATTERNS.some((p) => p.test(text)),
  },
};

// ─── Mistral extraction ────────────────────────────────────────────────────────

interface Extracted {
  level: string;
  summary: string;
  updatedAt: string | null;
}

async function extractWithMistral(
  pageText: string,
  def: SourceDef,
  iso2: string,
): Promise<Extracted | null> {
  const prompt = `You are analyzing a government travel advisory page written in ${def.language} for country code ${iso2}.

Extract exactly three things:

1. LEVEL – Choose EXACTLY one option from this list (copy verbatim):
${def.levels.map((l) => `  - "${l}"`).join("\n")}
   Rule: choose the BASE level for the whole country. If specific regions have higher warnings, still choose the general country level (not the exception).

2. SUMMARY – 2–4 sentences in ${def.language} describing:
   - General advisory level and main reason (war, terrorism, crime, etc.)
   - Specific regions/areas with HIGHER warnings and why
   No intro or closing. Factual only.

3. UPDATED – Last update date in YYYY-MM-DD format, or null if not found.

Respond with JSON only: {"level": "...", "summary": "...", "updatedAt": "YYYY-MM-DD or null"}

Page text (first 5000 chars):
${pageText.slice(0, 5000)}`;

  try {
    const res = await fetch("https://api.mistral.ai/v1/chat/completions", {
      method: "POST",
      headers: { Authorization: `Bearer ${MISTRAL_API_KEY}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        model: "mistral-small-latest",
        messages: [{ role: "user", content: prompt }],
        temperature: 0.1,
        response_format: { type: "json_object" },
      }),
      signal: AbortSignal.timeout(30_000),
    });
    if (!res.ok) { console.error(`  Mistral ${res.status}`); return null; }
    const data = await res.json() as { choices: Array<{ message: { content: string } }> };
    const parsed = JSON.parse(data.choices[0]?.message?.content ?? "{}") as Partial<Extracted>;
    if (!parsed.level || !def.levels.includes(parsed.level)) {
      console.error(`  Bad level: "${parsed.level}"`);
      return null;
    }
    return {
      level: parsed.level,
      summary: parsed.summary ?? "",
      updatedAt: parsed.updatedAt && parsed.updatedAt !== "null" ? parsed.updatedAt : null,
    };
  } catch (err) {
    console.error(`  Mistral error: ${err}`);
    return null;
  }
}

// ─── DB write ──────────────────────────────────────────────────────────────────

async function writeToDb(
  prisma: import("@prisma/client").PrismaClient,
  sourceId: string,
  iso2: string,
  rawLevel: string,
  summary: string,
  sourceUrl: string,
  officialUpdatedAt: Date | null,
  scrapedAt: Date,
) {
  const normalizedLevel = normalizeLevel(sourceId, rawLevel);
  const data = {
    rawLevel,
    normalizedLevel,
    summary,
    risks: "[]",
    officialUpdatedAt,
    scrapedAt,
    sourceUrl,
    isStale: false,
  };

  const existing = await prisma.advisory.findUnique({
    where: { sourceId_destIso2: { sourceId, destIso2: iso2 } },
  });

  if (existing) {
    await prisma.advisory.update({ where: { id: existing.id }, data });
  } else {
    const country = await prisma.country.findUnique({ where: { isoAlpha2: iso2 } });
    if (country) {
      await prisma.advisory.create({ data: { sourceId, destIso2: iso2, ...data } });
    }
  }
}

// ─── Main ──────────────────────────────────────────────────────────────────────

async function processSource(
  def: SourceDef,
  prisma: import("@prisma/client").PrismaClient,
  browser: import("playwright").Browser,
  scrapedAt: Date,
) {
  console.log(`\n=== ${def.id.toUpperCase()} ===`);
  const countries = await def.getCountries();
  console.log(`  ${countries.length} country URLs to process`);

  let ok = 0, skipped = 0, failed = 0;

  for (let i = 0; i < countries.length; i += CONCURRENCY) {
    const batch = countries.slice(i, i + CONCURRENCY);
    await Promise.allSettled(
      batch.map(async ({ iso2, url }) => {
        const page = await browser.newPage();
        try {
          await page.goto(url, { waitUntil: "domcontentloaded", timeout: 25_000 });
          await page.waitForTimeout(2000);
          const text = await page.evaluate(() => document.body?.innerText ?? "");
          await page.close();

          if (!text || text.length < 200) { skipped++; return; }

          if (def.isPageMissing?.(text)) { skipped++; return; }

          const extracted = await extractWithMistral(text, def, iso2);
          if (!extracted) { failed++; return; }

          await writeToDb(
            prisma, def.id, iso2,
            extracted.level, extracted.summary, url,
            extracted.updatedAt ? new Date(extracted.updatedAt) : null,
            scrapedAt,
          );

          console.log(`  ${iso2}: ${extracted.level}`);
          ok++;
        } catch (err) {
          await page.close().catch(() => {});
          console.error(`  ${iso2} failed: ${String(err).slice(0, 80)}`);
          failed++;
        }
      })
    );
    if (i + CONCURRENCY < countries.length) {
      await new Promise((r) => setTimeout(r, 800));
    }
  }

  console.log(`  Done: ${ok} written, ${skipped} skipped, ${failed} failed`);
}

async function main() {
  const args = process.argv.slice(2).map((a) => a.toLowerCase());
  const toRun = args.length > 0 ? args.filter((a) => SOURCES[a]) : Object.keys(SOURCES);

  if (toRun.length === 0) {
    console.error("No valid sources. Valid:", Object.keys(SOURCES).join(", "));
    process.exit(1);
  }

  let chromium: import("playwright").BrowserType;
  try {
    ({ chromium } = await import("playwright"));
  } catch {
    console.error("Playwright not installed. Run: npm install --no-save playwright && npx playwright install chromium --with-deps");
    process.exit(1);
  }

  const { PrismaClient } = await import("@prisma/client");
  const url = process.env.DATABASE_URL ?? "file:./dev.db";
  let prisma: InstanceType<typeof PrismaClient>;
  if (url.startsWith("postgres")) {
    const { Pool } = await import("pg");
    const { PrismaPg } = await import("@prisma/adapter-pg");
    const pool = new Pool({ connectionString: url });
    prisma = new PrismaClient({ adapter: new PrismaPg(pool) } as never);
  } else {
    const { PrismaBetterSqlite3 } = await import("@prisma/adapter-better-sqlite3");
    prisma = new PrismaClient({ adapter: new PrismaBetterSqlite3({ url }) } as never);
  }
  const browser = await chromium.launch({ headless: true, args: ["--disable-features=HTTP2"] });
  const scrapedAt = new Date();

  console.log(`Starting Playwright full scrape: ${toRun.join(", ")}`);
  console.log(`Concurrency: ${CONCURRENCY} pages\n`);

  try {
    for (const sourceId of toRun) {
      await processSource(SOURCES[sourceId], prisma, browser, scrapedAt);
    }
  } finally {
    await browser.close();
    await prisma.$disconnect();
  }

  console.log("\nAll done.");
}

main().catch((err) => { console.error("Fatal:", err); process.exit(1); });
