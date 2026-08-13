export interface PlaceSearchResult {
  id: string;
  name: string;
  label: string;
  lat: number;
  lng: number;
  category: string;
  subtitle: string;
}

const NOMINATIM_HEADERS = {
  Accept: "application/json",
  "User-Agent": "RoomRentalManagementSystem/1.0",
};

/** Nepal bounding box — keeps results relevant when searching POIs by name. */
const NEPAL_BBOX = "80.05,26.35,88.2,30.45";

const FILLER_WORDS = new Set([
  "in",
  "at",
  "near",
  "around",
  "by",
  "the",
  "a",
  "an",
  "of",
  "and",
  "on",
  "from",
  "to",
]);

/** Local place-name variants commonly used in Nepal but mapped differently in OSM. */
const LOCATION_SYNONYMS: Record<string, string[]> = {
  chowk: ["chowk", "marg", "tole"],
  tole: ["tole", "marg", "galli"],
  galli: ["galli", "marg"],
  bazar: ["bazar", "bazaar", "market"],
  bazaar: ["bazaar", "bazar", "market"],
};

/** Tokens that usually end a POI name (park, shop, cooperative, etc.). */
const POI_TAIL_WORDS = new Set([
  "park",
  "garden",
  "playground",
  "hospital",
  "clinic",
  "school",
  "college",
  "academy",
  "university",
  "mandir",
  "temple",
  "gumba",
  "mosque",
  "church",
  "sahakari",
  "bank",
  "mart",
  "store",
  "shop",
  "mall",
  "hotel",
  "hostel",
  "restaurant",
  "cafe",
  "office",
  "stadium",
  "ground",
  "gate",
]);

/** Area/landmark markers — often the last part of "business in area" queries without "in". */
const LANDMARK_MARKERS = new Set([
  "chowk",
  "marg",
  "tole",
  "galli",
  "bazar",
  "bazaar",
  "road",
  "street",
  "lane",
  "ward",
  "basti",
  "height",
  "heighten",
  "durbar",
  "square",
]);

/** Spelling / phrasing tweaks common in local searches. */
const PHRASE_REWRITES: [RegExp, string][] = [
  [/\bchildrens\b/gi, "children's"],
  [/\bchildren\b(?=\s+park\b)/gi, "children's"],
  [/\bco[- ]?operative\b/gi, "sahakari"],
  [/\bco[- ]?op\b/gi, "sahakari"],
];

const OSM_CATEGORY: Record<string, string> = {
  hospital: "Hospital",
  clinic: "Clinic",
  doctors: "Clinic",
  pharmacy: "Pharmacy",
  school: "School",
  kindergarten: "School",
  university: "University",
  college: "College",
  library: "Library",
  restaurant: "Restaurant",
  cafe: "Cafe",
  fast_food: "Restaurant",
  bank: "Bank",
  atm: "ATM",
  supermarket: "Supermarket",
  mall: "Mall",
  marketplace: "Market",
  hotel: "Hotel",
  hostel: "Hostel",
  office: "Office",
  company: "Business",
  shop: "Shop",
  bus_station: "Bus Stop",
  station: "Station",
  place_of_worship: "Place of Worship",
  police: "Police",
  fire_station: "Fire Station",
  government: "Government",
};

function categoryFromOsm(key?: string, value?: string, type?: string): string {
  if (value && OSM_CATEGORY[value]) return OSM_CATEGORY[value];
  if (key === "amenity" && value) return value.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
  if (key === "shop" && value) return "Shop";
  if (key === "tourism" && value) return value.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
  if (type === "house" || type === "street") return "Address";
  if (type === "locality" || type === "district") return "Area";
  return "Place";
}

function buildSubtitle(parts: (string | undefined)[]): string {
  return parts.filter(Boolean).join(", ");
}

function dedupeResults(results: PlaceSearchResult[]): PlaceSearchResult[] {
  const seen = new Map<string, PlaceSearchResult>();
  for (const r of results) {
    const key = `${r.name.toLowerCase()}|${r.lat.toFixed(3)}|${r.lng.toFixed(3)}`;
    if (!seen.has(key)) seen.set(key, r);
  }
  return [...seen.values()];
}

function tokenize(query: string): string[] {
  return query
    .toLowerCase()
    .replace(/[,;.'"]/g, " ")
    .split(/\s+/)
    .filter((w) => w.length > 0);
}

function stripFillerWords(query: string): string {
  return tokenize(query)
    .filter((w) => !FILLER_WORDS.has(w))
    .join(" ");
}

function dedupeWords(query: string): string {
  const seen = new Set<string>();
  const out: string[] = [];
  for (const w of tokenize(query)) {
    if (!seen.has(w)) {
      seen.add(w);
      out.push(w);
    }
  }
  return out.join(" ");
}

function normalizePhrasing(query: string): string {
  let out = query;
  for (const [pattern, replacement] of PHRASE_REWRITES) {
    out = out.replace(pattern, replacement);
  }
  return out;
}

function splitBusinessAndLocation(raw: string): { business: string; location: string } | null {
  const match = raw.match(/^(.+?)\s+\b(?:in|at|near|around)\b\s+(.+)$/i);
  if (!match) return null;
  return {
    business: stripFillerWords(match[1]),
    location: stripFillerWords(match[2]),
  };
}

/** e.g. "kapurdhara childrens park" → area + POI */
function splitAreaAndPoi(raw: string): { area: string; poi: string } | null {
  const words = tokenize(normalizePhrasing(raw));
  if (words.length < 2) return null;

  const last = words[words.length - 1];
  if (!POI_TAIL_WORDS.has(last)) return null;

  let poiWordCount = 1;
  if (last === "park" && words.length >= 2) {
    poiWordCount = 2;
  } else if (
    (last === "mart" || last === "market") &&
    words.length >= 2 &&
    ["super", "mega", "department"].includes(words[words.length - 2])
  ) {
    poiWordCount = 2;
  }

  const poiStart = words.length - poiWordCount;
  if (poiStart <= 0) return null;

  const area = words.slice(0, poiStart).join(" ");
  const poi = words.slice(poiStart).join(" ");
  if (area.length < 2 || poi.length < 2) return null;

  return { area, poi };
}

/** e.g. "karmath sahakari rayamajhi chowk" → business + landmark area (no "in") */
function splitByLandmark(raw: string): { business: string; location: string } | null {
  const words = tokenize(raw);
  if (words.length < 3) return null;

  for (let i = words.length - 1; i >= 1; i--) {
    if (!LANDMARK_MARKERS.has(words[i])) continue;
    const location = words.slice(i - 1).join(" ");
    const business = words.slice(0, i - 1).join(" ");
    if (business.length >= 2 && location.length >= 2) {
      return { business, location };
    }
  }

  return null;
}

function expandLocation(location: string): string[] {
  const variants = new Set<string>([location]);
  const words = tokenize(location);

  for (const [term, replacements] of Object.entries(LOCATION_SYNONYMS)) {
    if (!words.includes(term)) continue;
    for (const rep of replacements) {
      if (rep === term) continue;
      variants.add(words.map((w) => (w === term ? rep : w)).join(" "));
    }
  }

  if (!words.includes("kathmandu") && !words.includes("nepal") && !words.includes("lalitpur")) {
    variants.add(`${location} kathmandu`);
    variants.add(`${location} nepal`);
  }

  return [...variants].filter((v) => v.length >= 2);
}

function cooperativeVariants(query: string): string[] {
  const variants: string[] = [];
  if (!/\bsahakari\b/i.test(query)) return variants;

  const withoutLeading = query.replace(/^\s*sahakari\s+/i, "").trim();
  if (withoutLeading) variants.push(withoutLeading);

  const match = query.match(/sahakari\s+(\w[\w-]*)/i);
  if (match?.[1] && match[1].toLowerCase() !== "sahakari") {
    variants.push(`${match[1]} sahakari`);
  }

  return variants;
}

/** POI-specific rewrites — parks, schools, etc. */
function poiVariants(poi: string): string[] {
  const variants = new Set<string>([poi]);
  const words = tokenize(poi);

  if (words.includes("park")) {
    const base = words.filter((w) => w !== "park" && w !== "children's" && w !== "children").join(" ");
    if (base) {
      variants.add(`${base} park`);
      variants.add(`${base} children's park`);
      variants.add(`children's park ${base}`);
      variants.add(`${base} playground`);
    }
    variants.add(poi.replace(/\bchildren'?s?\b/gi, "children's"));
    variants.add(poi.replace(/\bchildren'?s?\b/gi, "children"));
  }

  if (words.includes("sahakari")) {
    for (const v of cooperativeVariants(poi)) variants.add(v);
  }

  return [...variants].filter((v) => v.length >= 2);
}

function withNepalContext(parts: string[]): string[] {
  const joined = parts.filter(Boolean).join(" ");
  const out = new Set<string>([joined]);
  const words = tokenize(joined);

  if (!words.includes("kathmandu") && !words.includes("nepal") && !words.includes("lalitpur")) {
    out.add(`${joined} kathmandu`);
    out.add(`${joined} nepal`);
  }

  return [...out];
}

function addSplitVariants(
  add: (q: string) => void,
  business: string,
  location: string
): void {
  add(`${business} ${location}`);
  add(location);

  for (const loc of expandLocation(location)) {
    for (const locCtx of withNepalContext([loc])) {
      add(locCtx);
      add(`${business} ${locCtx}`);
      for (const biz of [...poiVariants(business), ...cooperativeVariants(business)]) {
        add(`${biz} ${locCtx}`);
      }
    }
  }

  for (const biz of [...poiVariants(business), ...cooperativeVariants(business)]) {
    add(biz);
    for (const locCtx of withNepalContext([location])) {
      add(`${biz} ${locCtx}`);
    }
  }
}

function addAreaPoiVariants(
  add: (q: string) => void,
  area: string,
  poi: string
): void {
  for (const p of poiVariants(poi)) {
    add(`${area} ${p}`);
    add(`${p} ${area}`);
    for (const loc of expandLocation(area)) {
      for (const locCtx of withNepalContext([loc])) {
        add(`${locCtx} ${p}`);
        add(`${p} ${locCtx}`);
      }
    }
    for (const ctx of withNepalContext([area])) {
      add(`${ctx} ${p}`);
      add(`${p} ${ctx}`);
    }
  }
  for (const loc of expandLocation(area)) {
    for (const locCtx of withNepalContext([loc])) add(locCtx);
  }
}

/** Build ordered search variants — most specific first, broader fallbacks later. */
function buildSearchVariants(raw: string): string[] {
  const trimmed = normalizePhrasing(raw.trim());
  if (!trimmed) return [];

  const ordered: string[] = [];
  const add = (q: string) => {
    const clean = dedupeWords(stripFillerWords(normalizePhrasing(q)));
    if (clean.length >= 2 && !ordered.includes(clean)) ordered.push(clean);
  };

  add(trimmed);

  const explicitSplit = splitBusinessAndLocation(trimmed);
  if (explicitSplit) {
    addSplitVariants(add, explicitSplit.business, explicitSplit.location);
  }

  const landmarkSplit = splitByLandmark(trimmed);
  if (landmarkSplit) {
    addSplitVariants(add, landmarkSplit.business, landmarkSplit.location);
  }

  const areaPoi = splitAreaAndPoi(trimmed);
  if (areaPoi) {
    addAreaPoiVariants(add, areaPoi.area, areaPoi.poi);
  }

  // Single-string fallbacks: expand locality synonyms and POI rewrites
  const cleaned = dedupeWords(stripFillerWords(trimmed));
  for (const loc of expandLocation(cleaned)) {
    for (const locCtx of withNepalContext([loc])) add(locCtx);
  }
  for (const poi of poiVariants(cleaned)) add(poi);
  for (const biz of cooperativeVariants(cleaned)) add(biz);

  // Sliding windows — helps when users omit "in" between a short area and longer POI name
  const words = tokenize(cleaned);
  if (words.length >= 3) {
    for (let i = 1; i < words.length; i++) {
      const left = words.slice(0, i).join(" ");
      const right = words.slice(i).join(" ");
      add(`${left} ${right}`);
      add(`${right} ${left}`);
      for (const ctx of withNepalContext([left])) {
        add(`${ctx} ${right}`);
        add(`${right} ${ctx}`);
      }
    }
  }

  return ordered.slice(0, 14);
}

function queryTerms(query: string): string[] {
  return tokenize(stripFillerWords(query)).filter((w) => w.length > 1);
}

function scoreResult(result: PlaceSearchResult, terms: string[]): number {
  const haystack = `${result.name} ${result.label} ${result.subtitle}`.toLowerCase();
  let score = 0;
  let matched = 0;
  for (const term of terms) {
    if (term.length <= 1) continue;
    if (haystack.includes(term)) {
      score += Math.min(term.length, 12);
      matched++;
    } else if (term.endsWith("s") && haystack.includes(term.slice(0, -1))) {
      score += Math.min(term.length - 1, 10);
      matched++;
    }
  }
  if (matched >= 2) score += matched * 3;
  if (/\bnepal\b/i.test(haystack)) score += 2;
  if (/\bkathmandu\b|\blalitpur\b|\bbagmati\b/i.test(haystack)) score += 1;
  return score;
}

function rankResults(results: PlaceSearchResult[], originalQuery: string): PlaceSearchResult[] {
  const terms = queryTerms(originalQuery);
  return [...results].sort((a, b) => scoreResult(b, terms) - scoreResult(a, terms));
}

interface PhotonFeature {
  geometry: { coordinates: [number, number] };
  properties: {
    osm_id?: number;
    name?: string;
    street?: string;
    housenumber?: string;
    city?: string;
    state?: string;
    country?: string;
    postcode?: string;
    osm_key?: string;
    osm_value?: string;
    type?: string;
  };
}

async function searchPhoton(
  query: string,
  options?: { near?: [number, number]; useBbox?: boolean }
): Promise<PlaceSearchResult[]> {
  const params = new URLSearchParams({
    q: query,
    limit: "10",
    lang: "en",
  });
  if (options?.useBbox !== false) {
    params.set("bbox", NEPAL_BBOX);
  }
  if (options?.near) {
    params.set("lat", String(options.near[0]));
    params.set("lon", String(options.near[1]));
  }

  const res = await fetch(`https://photon.komoot.io/api/?${params}`);
  if (!res.ok) return [];

  const data = (await res.json()) as { features: PhotonFeature[] };
  return (data.features ?? []).map((f, i) => {
    const p = f.properties;
    const [lng, lat] = f.geometry.coordinates;
    const name = p.name || p.street || "Unnamed place";
    const subtitle = buildSubtitle([
      p.housenumber && p.street ? `${p.housenumber} ${p.street}` : p.street,
      p.city,
      p.state,
      p.country,
    ]);
    const category = categoryFromOsm(p.osm_key, p.osm_value, p.type);
    return {
      id: `photon-${p.osm_id ?? i}-${lat.toFixed(4)}`,
      name,
      label: subtitle ? `${name} — ${subtitle}` : name,
      lat,
      lng,
      category,
      subtitle: subtitle || category,
    };
  });
}

interface NominatimResult {
  place_id: number;
  lat: string;
  lon: string;
  display_name: string;
  name?: string;
  type?: string;
  class?: string;
  addresstype?: string;
}

async function searchNominatim(
  query: string,
  options?: { countryOnly?: boolean }
): Promise<PlaceSearchResult[]> {
  const params = new URLSearchParams({
    q: query,
    format: "json",
    limit: "8",
    addressdetails: "1",
  });
  if (options?.countryOnly !== false) {
    params.set("countrycodes", "np");
  }

  const res = await fetch(`https://nominatim.openstreetmap.org/search?${params}`, {
    headers: NOMINATIM_HEADERS,
  });
  if (!res.ok) return [];

  const data = (await res.json()) as NominatimResult[];
  return data.map((r) => {
    const name = r.name || r.display_name.split(",")[0];
    const parts = r.display_name.split(",").slice(1, 4).map((s) => s.trim());
    const category = categoryFromOsm(r.class, r.type, r.addresstype);
    return {
      id: `nominatim-${r.place_id}`,
      name,
      label: r.display_name,
      lat: parseFloat(r.lat),
      lng: parseFloat(r.lon),
      category,
      subtitle: parts.join(", ") || category,
    };
  });
}

async function searchVariants(
  variants: string[],
  searchFn: (q: string) => Promise<PlaceSearchResult[]>,
  maxVariants: number
): Promise<PlaceSearchResult[]> {
  const batches = await Promise.all(variants.slice(0, maxVariants).map(searchFn));
  return dedupeResults(batches.flat());
}

const NOMINATIM_DELAY_MS = 1100;

async function delay(ms: number): Promise<void> {
  await new Promise((resolve) => setTimeout(resolve, ms));
}

/** Search places by name — hospitals, schools, businesses, addresses, etc. */
export async function searchPlaces(
  query: string,
  options?: { near?: [number, number]; includeNominatim?: boolean }
): Promise<PlaceSearchResult[]> {
  const trimmed = query.trim();
  if (trimmed.length < 2) return [];

  const variants = buildSearchVariants(trimmed);
  const maxPhotonVariants = options?.includeNominatim === false ? 5 : 8;

  let results = await searchVariants(
    variants,
    (q) => searchPhoton(q, { near: options?.near, useBbox: true }),
    maxPhotonVariants
  );

  if (results.length === 0) {
    results = await searchVariants(
      variants,
      (q) => searchPhoton(q, { near: options?.near, useBbox: false }),
      maxPhotonVariants
    );
  }

  if (options?.includeNominatim !== false) {
    const nominatimVariants = variants.slice(0, 3);
    for (let i = 0; i < nominatimVariants.length; i++) {
      if (i > 0) await delay(NOMINATIM_DELAY_MS);
      const nom = await searchNominatim(nominatimVariants[i], { countryOnly: true });
      results = dedupeResults([...results, ...nom]);
      if (results.length >= 8) break;
    }

    if (results.length === 0) {
      for (let i = 0; i < Math.min(2, variants.length); i++) {
        if (i > 0) await delay(NOMINATIM_DELAY_MS);
        const nom = await searchNominatim(variants[i], { countryOnly: false });
        results = dedupeResults([...results, ...nom]);
        if (results.length > 0) break;
      }
    }
  }

  return rankResults(results, trimmed).slice(0, 12);
}

export async function reverseGeocode(lat: number, lng: number): Promise<string | null> {
  const params = new URLSearchParams({
    lat: String(lat),
    lon: String(lng),
    format: "json",
  });
  const res = await fetch(`https://nominatim.openstreetmap.org/reverse?${params}`, {
    headers: NOMINATIM_HEADERS,
  });
  if (!res.ok) return null;
  const data = (await res.json()) as { display_name?: string };
  return data.display_name ?? null;
}
